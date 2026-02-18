import { Pool } from 'pg';
import { WeakWordRepository } from '../repositories/weakWord.repository.js';
import { PronunciationScoreRepository } from '../repositories/pronunciationScore.repository.js';
import { WeakWord } from '../models/weakWord.model.js';
import { Exercise } from '../models/exercise.model.js';
import { cacheService } from './cache.service.js';

export interface ReviewSchedule {
  wordId: string;
  nextReview: Date;
  interval: number;
  easeFactor: number;
}

export interface WeakWordInfo {
  wordId: string;
  imageTextId: string;
  text: string;
  languageCode: string;
  successRate: number;
  lastAttempt: Date;
  reviewCount: number;
}

export class SRSService {
  private weakWordRepo: WeakWordRepository;
  private pronunciationScoreRepo: PronunciationScoreRepository;

  // SM-2 algorithm constants
  private readonly WEAK_WORD_THRESHOLD = 70; // Success rate below 70% marks as weak
  private readonly GRADUATION_THRESHOLD = 3; // Number of successful reviews to graduate
  private readonly GRADUATION_SUCCESS_RATE = 85; // Success rate needed for graduation
  private readonly MIN_EASE_FACTOR = 1.3;
  private readonly MAX_EASE_FACTOR = 3.0;

  constructor(private pool: Pool) {
    this.weakWordRepo = new WeakWordRepository(pool);
    this.pronunciationScoreRepo = new PronunciationScoreRepository(pool);
  }

  /**
   * Track success rate for a word/phrase based on pronunciation scores
   * Requirements: 12.1
   */
  async trackSuccessRate(userId: string, imageTextId: string, score: number): Promise<number> {
    // Get recent scores for this image text
    const recentScores = await this.pronunciationScoreRepo.getRecentScoresForImageText(
      userId,
      imageTextId,
      10
    );

    // Calculate success rate (scores >= 70 are considered successful)
    const successfulAttempts = recentScores.filter((s) => s.score >= 70).length;
    const totalAttempts = recentScores.length;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;

    // Check if this word should be tracked as weak
    if (successRate < this.WEAK_WORD_THRESHOLD || this.hasRepeatedErrors(recentScores)) {
      await this.identifyWeakWord(userId, imageTextId, successRate, totalAttempts);
    }

    return successRate;
  }

  /**
   * Identify weak words based on success rate or repeated errors
   * Requirements: 12.2, 12.3
   */
  async identifyWeakWord(
    userId: string,
    imageTextId: string,
    successRate: number,
    attemptCount: number
  ): Promise<WeakWord> {
    // Check if weak word already exists
    const existingWeakWord = await this.weakWordRepo.findByUserAndImageText(userId, imageTextId);

    if (existingWeakWord) {
      // Update existing weak word
      return await this.weakWordRepo.update(existingWeakWord.id, {
        successRate,
        attemptCount,
        lastAttempt: new Date(),
      });
    } else {
      // Create new weak word
      return await this.weakWordRepo.create({
        userId,
        imageTextId,
        successRate,
        attemptCount,
        reviewInterval: 1,
        easeFactor: 2.5,
      });
    }
  }

  /**
   * Check for repeated errors (3 or more consecutive failures)
   */
  private hasRepeatedErrors(scores: Array<{ score: number }>): boolean {
    if (scores.length < 3) return false;

    // Check last 3 scores
    const lastThree = scores.slice(0, 3);
    return lastThree.every((s) => s.score < 70);
  }

  /**
   * Generate daily review combining new content and weak words
   * Requirements: 12.4
   */
  async generateDailyReview(userId: string, newExercises: Exercise[]): Promise<Exercise[]> {
    // Check cache first
    const cachedReview = await cacheService.getDailyReview(userId);
    if (cachedReview) {
      return cachedReview;
    }

    // Get weak words due for review
    const weakWords = await this.weakWordRepo.findDueForReview(userId);

    // Get exercises for weak words
    const weakWordExercises = await this.getExercisesForWeakWords(weakWords);

    // Combine new content with weak word reviews
    // Ratio: 70% new content, 30% reviews (or all reviews if not enough new content)
    const totalSlots = Math.max(10, newExercises.length);
    const reviewSlots = Math.min(Math.ceil(totalSlots * 0.3), weakWordExercises.length);
    const newSlots = totalSlots - reviewSlots;

    const selectedNew = newExercises.slice(0, newSlots);
    const selectedReviews = weakWordExercises.slice(0, reviewSlots);

    // Interleave new and review exercises
    const dailyReview = this.interleaveExercises(selectedNew, selectedReviews);
    
    // Cache the daily review
    await cacheService.setDailyReview(userId, dailyReview);
    
    return dailyReview;
  }

  /**
   * Get exercises for weak words
   */
  private async getExercisesForWeakWords(weakWords: WeakWord[]): Promise<Exercise[]> {
    if (weakWords.length === 0) return [];

    const imageTextIds = weakWords.map((w) => w.imageTextId);
    const placeholders = imageTextIds.map((_, i) => `$${i + 1}`).join(',');

    const query = `
      SELECT e.id, e.lesson_id as "lessonId", e.image_id as "imageId",
             e.exercise_type as "exerciseType", e.order_index as "orderIndex",
             e.metadata, e.created_at as "createdAt"
      FROM exercises e
      JOIN image_texts it ON e.image_id = it.image_id
      WHERE it.id IN (${placeholders})
      GROUP BY e.id
    `;

    const result = await this.pool.query(query, imageTextIds);
    return result.rows;
  }

  /**
   * Interleave new and review exercises
   */
  private interleaveExercises(newExercises: Exercise[], reviewExercises: Exercise[]): Exercise[] {
    const result: Exercise[] = [];
    const maxLength = Math.max(newExercises.length, reviewExercises.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < newExercises.length) {
        result.push(newExercises[i]);
      }
      if (i < reviewExercises.length) {
        result.push(reviewExercises[i]);
      }
    }

    return result;
  }

  /**
   * Schedule next review using SM-2 algorithm
   * Requirements: 12.5
   */
  async scheduleReview(
    userId: string,
    imageTextId: string,
    performance: number
  ): Promise<ReviewSchedule> {
    const weakWord = await this.weakWordRepo.findByUserAndImageText(userId, imageTextId);

    if (!weakWord) {
      throw new Error('Weak word not found');
    }

    // SM-2 algorithm
    // performance: 0-5 scale (0 = complete failure, 5 = perfect recall)
    // We convert from 0-100 score to 0-5 scale
    const quality = Math.floor((performance / 100) * 5);

    let newEaseFactor = weakWord.easeFactor;
    let newInterval = weakWord.reviewInterval;

    if (quality >= 3) {
      // Successful recall
      if (weakWord.reviewInterval === 1) {
        newInterval = 1;
      } else if (weakWord.reviewInterval === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(weakWord.reviewInterval * weakWord.easeFactor);
      }

      // Update ease factor
      newEaseFactor = weakWord.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    } else {
      // Failed recall - reset interval
      newInterval = 1;
      newEaseFactor = weakWord.easeFactor - 0.2;
    }

    // Clamp ease factor
    newEaseFactor = Math.max(this.MIN_EASE_FACTOR, Math.min(this.MAX_EASE_FACTOR, newEaseFactor));

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    // Update weak word
    await this.weakWordRepo.update(weakWord.id, {
      reviewInterval: newInterval,
      easeFactor: newEaseFactor,
      lastAttempt: new Date(),
      nextReview,
    });

    const schedule = {
      wordId: weakWord.id,
      nextReview,
      interval: newInterval,
      easeFactor: newEaseFactor,
    };
    
    // Cache the SRS result
    await cacheService.setSRSResult(userId, imageTextId, schedule);
    
    // Invalidate daily review cache since schedule changed
    await cacheService.invalidateDailyReview(userId);

    return schedule;
  }

  /**
   * Graduate word from weak words queue after successful reviews
   * Requirements: 12.6
   */
  async graduateWord(userId: string, imageTextId: string): Promise<boolean> {
    const weakWord = await this.weakWordRepo.findByUserAndImageText(userId, imageTextId);

    if (!weakWord) {
      return false;
    }

    // Check if word meets graduation criteria
    const recentScores = await this.pronunciationScoreRepo.getRecentScoresForImageText(
      userId,
      imageTextId,
      this.GRADUATION_THRESHOLD
    );

    // Must have at least GRADUATION_THRESHOLD successful attempts
    if (recentScores.length < this.GRADUATION_THRESHOLD) {
      return false;
    }

    // All recent attempts must be successful (>= 70)
    const allSuccessful = recentScores.every((s) => s.score >= 70);
    if (!allSuccessful) {
      return false;
    }

    // Calculate average of recent scores
    const avgScore = recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
    if (avgScore < this.GRADUATION_SUCCESS_RATE) {
      return false;
    }

    // Graduate the word (remove from weak words)
    await this.weakWordRepo.delete(weakWord.id);
    return true;
  }

  /**
   * Get all weak words for a user
   */
  async getWeakWords(userId: string): Promise<WeakWordInfo[]> {
    const weakWords = await this.weakWordRepo.findByUser(userId);

    // Fetch text and language info for each weak word
    const weakWordInfos: WeakWordInfo[] = [];

    for (const weakWord of weakWords) {
      const query = `
        SELECT it.text, it.language_code as "languageCode"
        FROM image_texts it
        WHERE it.id = $1
      `;
      const result = await this.pool.query(query, [weakWord.imageTextId]);

      if (result.rows[0]) {
        weakWordInfos.push({
          wordId: weakWord.id,
          imageTextId: weakWord.imageTextId,
          text: result.rows[0].text,
          languageCode: result.rows[0].languageCode,
          successRate: weakWord.successRate,
          lastAttempt: weakWord.lastAttempt,
          reviewCount: weakWord.attemptCount,
        });
      }
    }

    return weakWordInfos;
  }

  /**
   * Get words due for review today
   */
  async getReviewDue(userId: string): Promise<WeakWord[]> {
    return await this.weakWordRepo.findDueForReview(userId);
  }
}
