import { UserProgressRepository } from '../repositories/userProgress.repository.js';
import { PronunciationScoreRepository } from '../repositories/pronunciationScore.repository.js';
import { ExerciseRepository } from '../repositories/exercise.repository.js';
import { UserProgress } from '../models/userProgress.model.js';
import { PronunciationScore } from '../models/pronunciationScore.model.js';
import pool from '../db/pool.js';

export interface LessonProgressSummary {
  lessonId: string;
  total: number;
  completed: number;
  percentComplete: number;
}

export interface UserProgressSummary {
  totalExercisesCompleted: number;
  progressByLesson: LessonProgressSummary[];
  recentActivity: UserProgress[];
}

export class ProgressService {
  private userProgressRepository: UserProgressRepository;
  private pronunciationScoreRepository: PronunciationScoreRepository;
  private exerciseRepository: ExerciseRepository;

  constructor() {
    this.userProgressRepository = new UserProgressRepository(pool);
    this.pronunciationScoreRepository = new PronunciationScoreRepository(pool);
    this.exerciseRepository = new ExerciseRepository(pool);
  }

  /**
   * Record exercise completion
   */
  async recordExerciseCompletion(userId: string, exerciseId: string): Promise<UserProgress> {
    // Verify exercise exists
    const exercise = await this.exerciseRepository.findById(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Create or update progress
    const progress = await this.userProgressRepository.upsert({
      userId,
      exerciseId,
      completed: true,
    });

    return progress;
  }

  /**
   * Record pronunciation score
   */
  async recordPronunciationScore(
    userId: string,
    exerciseId: string,
    score: number,
    recognizedText: string
  ): Promise<PronunciationScore> {
    // Verify exercise exists
    const exercise = await this.exerciseRepository.findById(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Validate score
    if (score < 0 || score > 100) {
      throw new Error('Score must be between 0 and 100');
    }

    // Create pronunciation score
    const pronunciationScore = await this.pronunciationScoreRepository.create({
      userId,
      exerciseId,
      score,
      recognizedText,
    });

    // Update progress to mark as accessed
    await this.userProgressRepository.upsert({
      userId,
      exerciseId,
      completed: false, // Don't mark as completed just for pronunciation attempt
    });

    return pronunciationScore;
  }

  /**
   * Get user's overall progress
   */
  async getUserProgress(userId: string): Promise<UserProgressSummary> {
    const allProgress = await this.userProgressRepository.findByUser(userId);
    const totalCompleted = await this.userProgressRepository.getCompletedCount(userId);

    // Get unique lesson IDs from progress
    const lessonIds = new Set<string>();
    for (const progress of allProgress) {
      const exercise = await this.exerciseRepository.findById(progress.exerciseId);
      if (exercise) {
        lessonIds.add(exercise.lessonId);
      }
    }

    // Get progress for each lesson
    const progressByLesson: LessonProgressSummary[] = [];
    for (const lessonId of lessonIds) {
      const lessonProgress = await this.userProgressRepository.getLessonProgress(userId, lessonId);
      progressByLesson.push({
        lessonId,
        total: lessonProgress.total,
        completed: lessonProgress.completed,
        percentComplete: lessonProgress.total > 0 
          ? Math.round((lessonProgress.completed / lessonProgress.total) * 100)
          : 0,
      });
    }

    return {
      totalExercisesCompleted: totalCompleted,
      progressByLesson,
      recentActivity: allProgress.slice(0, 10), // Last 10 activities
    };
  }

  /**
   * Get progress for a specific lesson
   */
  async getLessonProgress(userId: string, lessonId: string): Promise<LessonProgressSummary> {
    const lessonProgress = await this.userProgressRepository.getLessonProgress(userId, lessonId);
    
    return {
      lessonId,
      total: lessonProgress.total,
      completed: lessonProgress.completed,
      percentComplete: lessonProgress.total > 0 
        ? Math.round((lessonProgress.completed / lessonProgress.total) * 100)
        : 0,
    };
  }

  /**
   * Get progress for a specific exercise
   */
  async getExerciseProgress(userId: string, exerciseId: string): Promise<UserProgress | null> {
    return this.userProgressRepository.findByUserAndExercise(userId, exerciseId);
  }

  /**
   * Synchronize progress (for multi-device support)
   * This method accepts a batch of progress updates and applies them
   */
  async syncProgress(userId: string, progressUpdates: Array<{
    exerciseId: string;
    completed: boolean;
    completedAt?: Date;
  }>): Promise<UserProgress[]> {
    const results: UserProgress[] = [];

    for (const update of progressUpdates) {
      // Verify exercise exists
      const exercise = await this.exerciseRepository.findById(update.exerciseId);
      if (!exercise) {
        continue; // Skip invalid exercises
      }

      // Get existing progress
      const existing = await this.userProgressRepository.findByUserAndExercise(
        userId,
        update.exerciseId
      );

      // Only update if the new data is more recent or more complete
      if (!existing || update.completed) {
        const synced = await this.userProgressRepository.upsert({
          userId,
          exerciseId: update.exerciseId,
          completed: update.completed,
          completedAt: update.completedAt,
        });
        results.push(synced);
      } else {
        results.push(existing);
      }
    }

    return results;
  }

  /**
   * Get pronunciation scores for an exercise
   */
  async getPronunciationScores(userId: string, exerciseId: string): Promise<PronunciationScore[]> {
    return this.pronunciationScoreRepository.findByUserAndExercise(userId, exerciseId);
  }

  /**
   * Get all pronunciation scores for a user
   */
  async getAllPronunciationScores(userId: string): Promise<PronunciationScore[]> {
    return this.pronunciationScoreRepository.findByUser(userId);
  }

  /**
   * Get the last accessed exercise in a lesson for progress restoration
   * Returns the exercise index to resume from, or null if no progress exists
   */
  async getLastAccessedExercise(userId: string, lessonId: string): Promise<number | null> {
    const lastAccessed = await this.userProgressRepository.getLastAccessedExercise(userId, lessonId);
    return lastAccessed ? lastAccessed.orderIndex : null;
  }
}

// Export singleton instance
export const progressService = new ProgressService();
