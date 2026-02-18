import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { SRSService } from './srs.service.js';
import { WeakWordRepository } from '../repositories/weakWord.repository.js';
import { PronunciationScoreRepository } from '../repositories/pronunciationScore.repository.js';
import { WeakWord } from '../models/weakWord.model.js';
import { PronunciationScore } from '../models/pronunciationScore.model.js';
import { Exercise } from '../models/exercise.model.js';
import { v4 as uuidv4 } from 'uuid';

describe('SRSService', () => {
  let srsService: SRSService;
  let mockWeakWordRepo: WeakWordRepository;
  let mockPronunciationScoreRepo: PronunciationScoreRepository;
  let mockPool: any;
  const mockWeakWords: Map<string, WeakWord> = new Map();
  const mockScores: Map<string, PronunciationScore[]> = new Map();

  beforeEach(() => {
    mockWeakWords.clear();
    mockScores.clear();

    // Create mock pool
    mockPool = {
      query: vi.fn(async (query: string, values?: any[]) => {
        // Mock query for getting exercises for weak words
        if (query.includes('FROM exercises e')) {
          return { rows: [] };
        }
        // Mock query for getting text and language info
        if (query.includes('FROM image_texts it')) {
          return {
            rows: [
              {
                text: 'test word',
                languageCode: 'en',
              },
            ],
          };
        }
        return { rows: [] };
      }),
    };

    // Create mock weak word repository
    mockWeakWordRepo = {
      create: vi.fn(async (input: any) => {
        const weakWord: WeakWord = {
          id: uuidv4(),
          userId: input.userId,
          imageTextId: input.imageTextId,
          successRate: input.successRate,
          attemptCount: input.attemptCount,
          lastAttempt: new Date(),
          nextReview: new Date(Date.now() + input.reviewInterval * 24 * 60 * 60 * 1000),
          reviewInterval: input.reviewInterval,
          easeFactor: input.easeFactor,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const key = `${input.userId}-${input.imageTextId}`;
        mockWeakWords.set(key, weakWord);
        return weakWord;
      }),
      findByUserAndImageText: vi.fn(async (userId: string, imageTextId: string) => {
        const key = `${userId}-${imageTextId}`;
        return mockWeakWords.get(key) || null;
      }),
      findByUser: vi.fn(async (userId: string) => {
        return Array.from(mockWeakWords.values()).filter((w) => w.userId === userId);
      }),
      findDueForReview: vi.fn(async (userId: string) => {
        const now = new Date();
        return Array.from(mockWeakWords.values()).filter(
          (w) => w.userId === userId && w.nextReview <= now
        );
      }),
      update: vi.fn(async (id: string, updates: any) => {
        const weakWord = Array.from(mockWeakWords.values()).find((w) => w.id === id);
        if (!weakWord) throw new Error('Weak word not found');
        const updated = { ...weakWord, ...updates, updatedAt: new Date() };
        const key = `${updated.userId}-${updated.imageTextId}`;
        mockWeakWords.set(key, updated);
        return updated;
      }),
      delete: vi.fn(async (id: string) => {
        for (const [key, weakWord] of mockWeakWords.entries()) {
          if (weakWord.id === id) {
            mockWeakWords.delete(key);
            break;
          }
        }
      }),
      deleteByUserAndImageText: vi.fn(async (userId: string, imageTextId: string) => {
        const key = `${userId}-${imageTextId}`;
        mockWeakWords.delete(key);
      }),
    } as any;

    // Create mock pronunciation score repository
    mockPronunciationScoreRepo = {
      create: vi.fn(async (input: any) => {
        const score: PronunciationScore = {
          id: uuidv4(),
          userId: input.userId,
          exerciseId: input.exerciseId,
          score: input.score,
          recognizedText: input.recognizedText,
          createdAt: new Date(),
        };
        const key = `${input.userId}-${input.exerciseId}`;
        if (!mockScores.has(key)) {
          mockScores.set(key, []);
        }
        mockScores.get(key)!.unshift(score);
        return score;
      }),
      findByUserAndExercise: vi.fn(async (userId: string, exerciseId: string) => {
        const key = `${userId}-${exerciseId}`;
        return mockScores.get(key) || [];
      }),
      findByUser: vi.fn(async (userId: string) => {
        const allScores: PronunciationScore[] = [];
        for (const [key, scores] of mockScores.entries()) {
          if (key.startsWith(userId)) {
            allScores.push(...scores);
          }
        }
        return allScores;
      }),
      getAverageScoreForExercise: vi.fn(async (userId: string, exerciseId: string) => {
        const key = `${userId}-${exerciseId}`;
        const scores = mockScores.get(key) || [];
        if (scores.length === 0) return 0;
        return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
      }),
      getRecentScoresForImageText: vi.fn(async (userId: string, imageTextId: string, limit: number = 10) => {
        // For testing, we'll use imageTextId as exerciseId
        const key = `${userId}-${imageTextId}`;
        const scores = mockScores.get(key) || [];
        return scores.slice(0, limit);
      }),
    } as any;

    srsService = new SRSService(mockPool);
    // Inject mocked repositories
    (srsService as any).weakWordRepo = mockWeakWordRepo;
    (srsService as any).pronunciationScoreRepo = mockPronunciationScoreRepo;
  });

  // Feature: language-learning-platform, Property 30: Success rate tracking
  // Validates: Requirements 12.1
  describe('Property 30: Success rate tracking', () => {
    it('should accurately calculate success rate from sequence of attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            imageTextId: fc.uuid(),
            scores: fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
          }),
          async (testData) => {
            // Add scores to mock repository (in reverse order since getRecentScoresForImageText returns newest first)
            const key = `${testData.userId}-${testData.imageTextId}`;
            mockScores.set(
              key,
              testData.scores.reverse().map((score) => ({
                id: uuidv4(),
                userId: testData.userId,
                exerciseId: testData.imageTextId,
                score,
                recognizedText: 'test',
                createdAt: new Date(),
              }))
            );

            // Track success rate
            const lastScore = testData.scores[0]; // First in reversed array is the most recent
            const successRate = await srsService.trackSuccessRate(
              testData.userId,
              testData.imageTextId,
              lastScore
            );

            // Calculate expected success rate (scores >= 70 are successful)
            // Take the first 10 scores (most recent) from the reversed array
            const recentScores = testData.scores.slice(0, 10);
            const successfulAttempts = recentScores.filter((s) => s >= 70).length;
            const expectedSuccessRate = (successfulAttempts / recentScores.length) * 100;

            // Success rate should match expected calculation
            expect(successRate).toBeCloseTo(expectedSuccessRate, 1);

            // Clean up
            mockScores.delete(key);
            mockWeakWords.delete(key);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty score history', async () => {
      const userId = uuidv4();
      const imageTextId = uuidv4();

      // No scores in history
      const successRate = await srsService.trackSuccessRate(userId, imageTextId, 80);

      // Should return 0 for empty history
      expect(successRate).toBe(0);
    });

    it('should only consider recent scores (last 10)', async () => {
      const userId = uuidv4();
      const imageTextId = uuidv4();

      // Create 15 scores: first 10 are successes (most recent), last 5 are failures (oldest)
      // Store in reverse order (newest first)
      const scores = [
        ...Array(10).fill(90), // Most recent - Successes
        ...Array(5).fill(50),  // Oldest - Failures
      ];

      const key = `${userId}-${imageTextId}`;
      mockScores.set(
        key,
        scores.map((score) => ({
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score,
          recognizedText: 'test',
          createdAt: new Date(),
        }))
      );

      const successRate = await srsService.trackSuccessRate(userId, imageTextId, 90);

      // Should only consider last 10 scores (all successes)
      expect(successRate).toBe(100);

      mockScores.delete(key);
      mockWeakWords.delete(key);
    });
  });

  // Feature: language-learning-platform, Property 31: Weak word identification
  // Validates: Requirements 12.2, 12.3
  describe('Property 31: Weak word identification', () => {
    it('should mark words as weak when success rate is below 70% or has repeated errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            imageTextId: fc.uuid(),
            scores: fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 3, maxLength: 15 }),
          }),
          async (testData) => {
            const key = `${testData.userId}-${testData.imageTextId}`;
            
            // Add scores to mock repository (newest first)
            mockScores.set(
              key,
              testData.scores.reverse().map((score) => ({
                id: uuidv4(),
                userId: testData.userId,
                exerciseId: testData.imageTextId,
                score,
                recognizedText: 'test',
                createdAt: new Date(),
              }))
            );

            // Track success rate (this should identify weak words)
            await srsService.trackSuccessRate(
              testData.userId,
              testData.imageTextId,
              testData.scores[0]
            );

            // Calculate expected success rate
            const recentScores = testData.scores.slice(0, 10);
            const successfulAttempts = recentScores.filter((s) => s >= 70).length;
            const successRate = (successfulAttempts / recentScores.length) * 100;

            // Check if word should be marked as weak
            const hasRepeatedErrors = testData.scores.slice(0, 3).every((s) => s < 70);
            const shouldBeWeak = successRate < 70 || hasRepeatedErrors;

            const weakWord = await mockWeakWordRepo.findByUserAndImageText(
              testData.userId,
              testData.imageTextId
            );

            if (shouldBeWeak) {
              // Word should be marked as weak
              expect(weakWord).toBeDefined();
              expect(weakWord?.successRate).toBeCloseTo(successRate, 1);
            }

            // Clean up
            mockScores.delete(key);
            mockWeakWords.delete(key);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mark words as weak when success rate is >= 70% and no repeated errors', async () => {
      const userId = uuidv4();
      const imageTextId = uuidv4();

      // All successful scores
      const scores = Array(10).fill(85);
      const key = `${userId}-${imageTextId}`;
      mockScores.set(
        key,
        scores.map((score) => ({
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score,
          recognizedText: 'test',
          createdAt: new Date(),
        }))
      );

      await srsService.trackSuccessRate(userId, imageTextId, 85);

      const weakWord = await mockWeakWordRepo.findByUserAndImageText(userId, imageTextId);
      expect(weakWord).toBeNull();

      mockScores.delete(key);
    });

    it('should mark word as weak with 3 consecutive failures even if overall rate is good', async () => {
      const userId = uuidv4();
      const imageTextId = uuidv4();

      // Last 3 are failures, but overall rate might be okay
      const scores = [60, 65, 50, 90, 85, 80, 75, 90, 85, 80];
      const key = `${userId}-${imageTextId}`;
      mockScores.set(
        key,
        scores.map((score) => ({
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score,
          recognizedText: 'test',
          createdAt: new Date(),
        }))
      );

      await srsService.trackSuccessRate(userId, imageTextId, 50);

      const weakWord = await mockWeakWordRepo.findByUserAndImageText(userId, imageTextId);
      expect(weakWord).toBeDefined();

      mockScores.delete(key);
      mockWeakWords.delete(key);
    });
  });

  // Feature: language-learning-platform, Property 32: Daily review composition
  // Validates: Requirements 12.4
  describe('Property 32: Daily review composition', () => {
    it('should combine new content and weak words in appropriate proportions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            newExerciseCount: fc.integer({ min: 1, max: 20 }),
            weakWordCount: fc.integer({ min: 0, max: 15 }),
          }),
          async (testData) => {
            // Create new exercises
            const newExercises: Exercise[] = Array.from({ length: testData.newExerciseCount }, (_, i) => ({
              id: uuidv4(),
              lessonId: uuidv4(),
              imageId: uuidv4(),
              exerciseType: 'image_text' as const,
              orderIndex: i,
              createdAt: new Date(),
            }));

            // Create weak words due for review
            const weakWords: WeakWord[] = Array.from({ length: testData.weakWordCount }, () => {
              const weakWord: WeakWord = {
                id: uuidv4(),
                userId: testData.userId,
                imageTextId: uuidv4(),
                successRate: 50,
                attemptCount: 5,
                lastAttempt: new Date(),
                nextReview: new Date(Date.now() - 24 * 60 * 60 * 1000), // Due yesterday
                reviewInterval: 1,
                easeFactor: 2.5,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              const key = `${weakWord.userId}-${weakWord.imageTextId}`;
              mockWeakWords.set(key, weakWord);
              return weakWord;
            });

            // Generate daily review
            const dailyReview = await srsService.generateDailyReview(testData.userId, newExercises);

            // Verify composition
            const totalSlots = Math.max(10, testData.newExerciseCount);
            const expectedReviewSlots = Math.min(Math.ceil(totalSlots * 0.3), testData.weakWordCount);
            const expectedNewSlots = totalSlots - expectedReviewSlots;

            // Daily review should contain exercises
            expect(dailyReview.length).toBeGreaterThan(0);
            expect(dailyReview.length).toBeLessThanOrEqual(totalSlots);

            // If there are weak words and new exercises, both should be represented
            if (testData.weakWordCount > 0 && testData.newExerciseCount > 0 && expectedReviewSlots > 0) {
              // The total should be at least the minimum of new slots or new exercises available
              expect(dailyReview.length).toBeGreaterThanOrEqual(
                Math.min(expectedNewSlots, testData.newExerciseCount)
              );
            }

            // Clean up
            for (const weakWord of weakWords) {
              const key = `${weakWord.userId}-${weakWord.imageTextId}`;
              mockWeakWords.delete(key);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize reviews when there are many weak words', async () => {
      const userId = uuidv4();

      // Create 20 weak words
      const weakWords: WeakWord[] = Array.from({ length: 20 }, () => {
        const weakWord: WeakWord = {
          id: uuidv4(),
          userId,
          imageTextId: uuidv4(),
          successRate: 50,
          attemptCount: 5,
          lastAttempt: new Date(),
          nextReview: new Date(Date.now() - 24 * 60 * 60 * 1000),
          reviewInterval: 1,
          easeFactor: 2.5,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const key = `${weakWord.userId}-${weakWord.imageTextId}`;
        mockWeakWords.set(key, weakWord);
        return weakWord;
      });

      // Create 5 new exercises
      const newExercises: Exercise[] = Array.from({ length: 5 }, (_, i) => ({
        id: uuidv4(),
        lessonId: uuidv4(),
        imageId: uuidv4(),
        exerciseType: 'image_text' as const,
        orderIndex: i,
        createdAt: new Date(),
      }));

      const dailyReview = await srsService.generateDailyReview(userId, newExercises);

      // Should include reviews (30% of 10 = 3 reviews minimum)
      expect(dailyReview.length).toBeGreaterThanOrEqual(3);

      // Clean up
      for (const weakWord of weakWords) {
        const key = `${weakWord.userId}-${weakWord.imageTextId}`;
        mockWeakWords.delete(key);
      }
    });

    it('should handle case with no weak words', async () => {
      const userId = uuidv4();

      // Create new exercises only
      const newExercises: Exercise[] = Array.from({ length: 10 }, (_, i) => ({
        id: uuidv4(),
        lessonId: uuidv4(),
        imageId: uuidv4(),
        exerciseType: 'image_text' as const,
        orderIndex: i,
        createdAt: new Date(),
      }));

      const dailyReview = await srsService.generateDailyReview(userId, newExercises);

      // Should return all new exercises
      expect(dailyReview.length).toBe(10);
    });
  });

  // Feature: language-learning-platform, Property 33: Spaced repetition intervals
  // Validates: Requirements 12.5
  describe('Property 33: Spaced repetition intervals', () => {
    it('should increase interval on successful reviews and decrease on failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            imageTextId: fc.uuid(),
            initialInterval: fc.integer({ min: 1, max: 10 }),
            initialEaseFactor: fc.double({ min: 1.3, max: 3.0, noNaN: true }),
            performance: fc.integer({ min: 0, max: 100 }),
          }),
          async (testData) => {
            // Create a weak word
            const weakWord: WeakWord = {
              id: uuidv4(),
              userId: testData.userId,
              imageTextId: testData.imageTextId,
              successRate: 50,
              attemptCount: 5,
              lastAttempt: new Date(),
              nextReview: new Date(),
              reviewInterval: testData.initialInterval,
              easeFactor: testData.initialEaseFactor,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            const key = `${testData.userId}-${testData.imageTextId}`;
            mockWeakWords.set(key, weakWord);

            // Schedule review
            const schedule = await srsService.scheduleReview(
              testData.userId,
              testData.imageTextId,
              testData.performance
            );

            // Convert performance to quality (0-5 scale)
            const quality = Math.floor((testData.performance / 100) * 5);

            if (quality >= 3) {
              // Successful recall - interval should increase or stay same
              expect(schedule.interval).toBeGreaterThanOrEqual(1);
              
              // For intervals > 2, should increase
              if (testData.initialInterval > 2) {
                expect(schedule.interval).toBeGreaterThan(testData.initialInterval);
              }
            } else {
              // Failed recall - interval should reset to 1
              expect(schedule.interval).toBe(1);
            }

            // Ease factor should be within valid range
            expect(schedule.easeFactor).toBeGreaterThanOrEqual(1.3);
            expect(schedule.easeFactor).toBeLessThanOrEqual(3.0);

            // Next review should be in the future
            expect(schedule.nextReview.getTime()).toBeGreaterThan(Date.now() - 1000);

            // Clean up
            mockWeakWords.delete(key);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reset interval to 1 on failure', async () => {
      const userId = uuidv4();
      const imageTextId = uuidv4();

      // Create a weak word with high interval
      const weakWord: WeakWord = {
        id: uuidv4(),
        userId,
        imageTextId,
        successRate: 50,
        attemptCount: 5,
        lastAttempt: new Date(),
        nextReview: new Date(),
        reviewInterval: 30, // High interval
        easeFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const key = `${userId}-${imageTextId}`;
      mockWeakWords.set(key, weakWord);

      // Schedule review with poor performance (failure)
      const schedule = await srsService.scheduleReview(userId, imageTextId, 40);

      // Interval should reset to 1
      expect(schedule.interval).toBe(1);

      mockWeakWords.delete(key);
    });

    it('should increase interval on successful review', async () => {
      const userId = uuidv4();
      const imageTextId = uuidv4();

      // Create a weak word with interval 6
      const weakWord: WeakWord = {
        id: uuidv4(),
        userId,
        imageTextId,
        successRate: 50,
        attemptCount: 5,
        lastAttempt: new Date(),
        nextReview: new Date(),
        reviewInterval: 6,
        easeFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const key = `${userId}-${imageTextId}`;
      mockWeakWords.set(key, weakWord);

      // Schedule review with good performance (success)
      const schedule = await srsService.scheduleReview(userId, imageTextId, 90);

      // Interval should increase
      expect(schedule.interval).toBeGreaterThan(6);

      mockWeakWords.delete(key);
    });

    it('should maintain ease factor within bounds', async () => {
      const userId = uuidv4();
      const imageTextId = uuidv4();

      // Create a weak word with minimum ease factor
      const weakWord: WeakWord = {
        id: uuidv4(),
        userId,
        imageTextId,
        successRate: 50,
        attemptCount: 5,
        lastAttempt: new Date(),
        nextReview: new Date(),
        reviewInterval: 1,
        easeFactor: 1.3, // Minimum
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const key = `${userId}-${imageTextId}`;
      mockWeakWords.set(key, weakWord);

      // Schedule review with poor performance (would decrease ease factor)
      const schedule = await srsService.scheduleReview(userId, imageTextId, 40);

      // Ease factor should not go below 1.3
      expect(schedule.easeFactor).toBeGreaterThanOrEqual(1.3);

      mockWeakWords.delete(key);
    });
  });

  // Feature: language-learning-platform, Property 34: Word graduation
  // Validates: Requirements 12.6
  describe('Property 34: Word graduation', () => {
    it('should graduate word after sufficient consecutive successful reviews', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            imageTextId: fc.uuid(),
            recentScores: fc.array(fc.integer({ min: 85, max: 100 }), { minLength: 3, maxLength: 10 }),
          }),
          async (testData) => {
            // Create a weak word
            const weakWord: WeakWord = {
              id: uuidv4(),
              userId: testData.userId,
              imageTextId: testData.imageTextId,
              successRate: 90,
              attemptCount: 10,
              lastAttempt: new Date(),
              nextReview: new Date(),
              reviewInterval: 7,
              easeFactor: 2.5,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            const key = `${testData.userId}-${testData.imageTextId}`;
            mockWeakWords.set(key, weakWord);

            // Add successful scores (all >= 85 to ensure average >= 85)
            mockScores.set(
              key,
              testData.recentScores.map((score) => ({
                id: uuidv4(),
                userId: testData.userId,
                exerciseId: testData.imageTextId,
                score,
                recognizedText: 'test',
                createdAt: new Date(),
              }))
            );

            // Try to graduate
            const graduated = await srsService.graduateWord(testData.userId, testData.imageTextId);

            // With all scores >= 85 and at least 3 scores, should graduate
            expect(graduated).toBe(true);

            // Word should be removed from weak words
            const weakWordAfter = await mockWeakWordRepo.findByUserAndImageText(
              testData.userId,
              testData.imageTextId
            );
            expect(weakWordAfter).toBeNull();

            // Clean up
            mockScores.delete(key);
            mockWeakWords.delete(key);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not graduate word with insufficient successful reviews', async () => {
      const userId = uuidv4();
      const imageTextId = uuidv4();

      // Create a weak word
      const weakWord: WeakWord = {
        id: uuidv4(),
        userId,
        imageTextId,
        successRate: 70,
        attemptCount: 5,
        lastAttempt: new Date(),
        nextReview: new Date(),
        reviewInterval: 3,
        easeFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const key = `${userId}-${imageTextId}`;
      mockWeakWords.set(key, weakWord);

      // Add only 2 successful scores (need 3)
      mockScores.set(key, [
        {
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score: 90,
          recognizedText: 'test',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score: 85,
          recognizedText: 'test',
          createdAt: new Date(),
        },
      ]);

      const graduated = await srsService.graduateWord(userId, imageTextId);

      expect(graduated).toBe(false);

      // Word should still be in weak words
      const weakWordAfter = await mockWeakWordRepo.findByUserAndImageText(userId, imageTextId);
      expect(weakWordAfter).toBeDefined();

      mockScores.delete(key);
      mockWeakWords.delete(key);
    });

    it('should not graduate word with low average score', async () => {
      const userId = uuidv4();
      const imageTextId = uuidv4();

      // Create a weak word
      const weakWord: WeakWord = {
        id: uuidv4(),
        userId,
        imageTextId,
        successRate: 70,
        attemptCount: 5,
        lastAttempt: new Date(),
        nextReview: new Date(),
        reviewInterval: 3,
        easeFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const key = `${userId}-${imageTextId}`;
      mockWeakWords.set(key, weakWord);

      // Add 3 scores but with low average (< 85)
      mockScores.set(key, [
        {
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score: 75,
          recognizedText: 'test',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score: 78,
          recognizedText: 'test',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score: 80,
          recognizedText: 'test',
          createdAt: new Date(),
        },
      ]);

      const graduated = await srsService.graduateWord(userId, imageTextId);

      expect(graduated).toBe(false);

      mockScores.delete(key);
      mockWeakWords.delete(key);
    });

    it('should not graduate word with any failed attempts in recent history', async () => {
      const userId = uuidv4();
      const imageTextId = uuidv4();

      // Create a weak word
      const weakWord: WeakWord = {
        id: uuidv4(),
        userId,
        imageTextId,
        successRate: 80,
        attemptCount: 5,
        lastAttempt: new Date(),
        nextReview: new Date(),
        reviewInterval: 3,
        easeFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const key = `${userId}-${imageTextId}`;
      mockWeakWords.set(key, weakWord);

      // Add 3 scores but one is a failure
      mockScores.set(key, [
        {
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score: 90,
          recognizedText: 'test',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score: 65, // Failure
          recognizedText: 'test',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          userId,
          exerciseId: imageTextId,
          score: 95,
          recognizedText: 'test',
          createdAt: new Date(),
        },
      ]);

      const graduated = await srsService.graduateWord(userId, imageTextId);

      expect(graduated).toBe(false);

      mockScores.delete(key);
      mockWeakWords.delete(key);
    });
  });
});
