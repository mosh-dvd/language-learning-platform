import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { ProgressService } from './progress.service.js';
import { UserProgressRepository } from '../repositories/userProgress.repository.js';
import { PronunciationScoreRepository } from '../repositories/pronunciationScore.repository.js';
import { ExerciseRepository } from '../repositories/exercise.repository.js';
import { UserProgress } from '../models/userProgress.model.js';
import { PronunciationScore } from '../models/pronunciationScore.model.js';
import { Exercise } from '../models/exercise.model.js';
import { v4 as uuidv4 } from 'uuid';

describe('ProgressService', () => {
  let progressService: ProgressService;
  let mockUserProgressRepository: UserProgressRepository;
  let mockPronunciationScoreRepository: PronunciationScoreRepository;
  let mockExerciseRepository: ExerciseRepository;
  const mockProgress: Map<string, UserProgress> = new Map();
  const mockScores: Map<string, PronunciationScore> = new Map();
  const mockExercises: Map<string, Exercise> = new Map();

  beforeEach(() => {
    mockProgress.clear();
    mockScores.clear();
    mockExercises.clear();

    // Create mock repositories
    mockUserProgressRepository = {
      create: vi.fn(async (input: any) => {
        const progress: UserProgress = {
          id: uuidv4(),
          userId: input.userId,
          exerciseId: input.exerciseId,
          completed: input.completed || false,
          completedAt: input.completed ? new Date() : undefined,
          lastAccessed: new Date(),
        };
        const key = `${input.userId}-${input.exerciseId}`;
        mockProgress.set(key, progress);
        return progress;
      }),
      findByUserAndExercise: vi.fn(async (userId: string, exerciseId: string) => {
        const key = `${userId}-${exerciseId}`;
        return mockProgress.get(key) || null;
      }),
      findByUser: vi.fn(async (userId: string) => {
        return Array.from(mockProgress.values())
          .filter(p => p.userId === userId)
          .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
      }),
      findByUserAndLesson: vi.fn(async (userId: string, lessonId: string) => {
        return Array.from(mockProgress.values())
          .filter(p => {
            const exercise = mockExercises.get(p.exerciseId);
            return p.userId === userId && exercise?.lessonId === lessonId;
          });
      }),
      update: vi.fn(async (userId: string, exerciseId: string, input: any) => {
        const key = `${userId}-${exerciseId}`;
        const progress = mockProgress.get(key);
        if (progress) {
          if (input.completed !== undefined) {
            progress.completed = input.completed;
            if (input.completed) {
              progress.completedAt = new Date();
            }
          }
          progress.lastAccessed = new Date();
          mockProgress.set(key, progress);
          return progress;
        }
        return null;
      }),
      upsert: vi.fn(async (input: any) => {
        const key = `${input.userId}-${input.exerciseId}`;
        const existing = mockProgress.get(key);
        
        if (existing) {
          if (input.completed !== undefined) {
            existing.completed = input.completed;
            if (input.completed) {
              existing.completedAt = new Date();
            }
          }
          existing.lastAccessed = new Date();
          mockProgress.set(key, existing);
          return existing;
        }
        
        const progress: UserProgress = {
          id: uuidv4(),
          userId: input.userId,
          exerciseId: input.exerciseId,
          completed: input.completed || false,
          completedAt: input.completed ? new Date() : undefined,
          lastAccessed: new Date(),
        };
        mockProgress.set(key, progress);
        return progress;
      }),
      delete: vi.fn(async (userId: string, exerciseId: string) => {
        const key = `${userId}-${exerciseId}`;
        const exists = mockProgress.has(key);
        mockProgress.delete(key);
        return exists;
      }),
      getCompletedCount: vi.fn(async (userId: string) => {
        return Array.from(mockProgress.values())
          .filter(p => p.userId === userId && p.completed).length;
      }),
      getLessonProgress: vi.fn(async (userId: string, lessonId: string) => {
        const exercises = Array.from(mockExercises.values())
          .filter(e => e.lessonId === lessonId);
        const total = exercises.length;
        const completed = exercises.filter(e => {
          const key = `${userId}-${e.id}`;
          const progress = mockProgress.get(key);
          return progress?.completed;
        }).length;
        return { total, completed };
      }),
      getLastAccessedExercise: vi.fn(async (userId: string, lessonId: string) => {
        const progressList = Array.from(mockProgress.values())
          .filter(p => {
            const exercise = mockExercises.get(p.exerciseId);
            return p.userId === userId && exercise?.lessonId === lessonId;
          })
          .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
        
        if (progressList.length === 0) {
          return null;
        }
        
        const lastProgress = progressList[0];
        const exercise = mockExercises.get(lastProgress.exerciseId);
        return exercise ? { exerciseId: exercise.id, orderIndex: exercise.orderIndex } : null;
      }),
    } as any;

    mockPronunciationScoreRepository = {
      create: vi.fn(async (input: any) => {
        const score: PronunciationScore = {
          id: uuidv4(),
          userId: input.userId,
          exerciseId: input.exerciseId,
          score: input.score,
          recognizedText: input.recognizedText,
          createdAt: new Date(),
        };
        mockScores.set(score.id, score);
        return score;
      }),
      findByUserAndExercise: vi.fn(async (userId: string, exerciseId: string) => {
        return Array.from(mockScores.values())
          .filter(s => s.userId === userId && s.exerciseId === exerciseId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }),
      findByUser: vi.fn(async (userId: string) => {
        return Array.from(mockScores.values())
          .filter(s => s.userId === userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }),
    } as any;

    mockExerciseRepository = {
      findById: vi.fn(async (id: string) => {
        return mockExercises.get(id) || null;
      }),
      findByLessonId: vi.fn(async (lessonId: string) => {
        return Array.from(mockExercises.values())
          .filter(e => e.lessonId === lessonId)
          .sort((a, b) => a.orderIndex - b.orderIndex);
      }),
    } as any;

    progressService = new ProgressService();
    (progressService as any).userProgressRepository = mockUserProgressRepository;
    (progressService as any).pronunciationScoreRepository = mockPronunciationScoreRepository;
    (progressService as any).exerciseRepository = mockExerciseRepository;
  });

  // Helper to create a mock exercise
  const createMockExercise = (lessonId: string, orderIndex: number = 0): Exercise => {
    const exercise: Exercise = {
      id: uuidv4(),
      lessonId,
      imageId: uuidv4(),
      exerciseType: 'image_text',
      orderIndex,
      metadata: {},
      createdAt: new Date(),
    };
    mockExercises.set(exercise.id, exercise);
    return exercise;
  };

  describe('Unit Tests', () => {
    it('should record exercise completion', async () => {
      const userId = uuidv4();
      const exercise = createMockExercise(uuidv4());

      const progress = await progressService.recordExerciseCompletion(userId, exercise.id);

      expect(progress).toBeDefined();
      expect(progress.userId).toBe(userId);
      expect(progress.exerciseId).toBe(exercise.id);
      expect(progress.completed).toBe(true);
      expect(progress.completedAt).toBeDefined();
    });

    it('should record pronunciation score', async () => {
      const userId = uuidv4();
      const exercise = createMockExercise(uuidv4());
      const score = 85;
      const recognizedText = 'hello world';

      const pronunciationScore = await progressService.recordPronunciationScore(
        userId,
        exercise.id,
        score,
        recognizedText
      );

      expect(pronunciationScore).toBeDefined();
      expect(pronunciationScore.userId).toBe(userId);
      expect(pronunciationScore.exerciseId).toBe(exercise.id);
      expect(pronunciationScore.score).toBe(score);
      expect(pronunciationScore.recognizedText).toBe(recognizedText);
    });

    it('should reject invalid pronunciation scores', async () => {
      const userId = uuidv4();
      const exercise = createMockExercise(uuidv4());

      await expect(
        progressService.recordPronunciationScore(userId, exercise.id, 150, 'test')
      ).rejects.toThrow('Score must be between 0 and 100');

      await expect(
        progressService.recordPronunciationScore(userId, exercise.id, -10, 'test')
      ).rejects.toThrow('Score must be between 0 and 100');
    });

    it('should get user progress summary', async () => {
      const userId = uuidv4();
      const lessonId = uuidv4();
      const exercise1 = createMockExercise(lessonId, 0);
      const exercise2 = createMockExercise(lessonId, 1);

      await progressService.recordExerciseCompletion(userId, exercise1.id);
      await progressService.recordExerciseCompletion(userId, exercise2.id);

      const summary = await progressService.getUserProgress(userId);

      expect(summary.totalExercisesCompleted).toBe(2);
      expect(summary.progressByLesson.length).toBeGreaterThan(0);
    });

    it('should sync progress from multiple devices', async () => {
      const userId = uuidv4();
      const exercise1 = createMockExercise(uuidv4());
      const exercise2 = createMockExercise(uuidv4());

      const progressUpdates = [
        { exerciseId: exercise1.id, completed: true },
        { exerciseId: exercise2.id, completed: false },
      ];

      const synced = await progressService.syncProgress(userId, progressUpdates);

      expect(synced.length).toBe(2);
      expect(synced[0].completed).toBe(true);
      expect(synced[1].completed).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: language-learning-platform, Property 17: Progress persistence
    // Validates: Requirements 5.5, 9.1
    it('should persist completed exercise status and be retrievable after session restart', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, lessonId) => {
            // Create an exercise
            const exercise = createMockExercise(lessonId);

            // Record completion
            const progress = await progressService.recordExerciseCompletion(userId, exercise.id);

            // Verify immediate persistence
            expect(progress.completed).toBe(true);
            expect(progress.completedAt).toBeDefined();

            // Simulate session restart by retrieving the progress
            const retrieved = await progressService.getExerciseProgress(userId, exercise.id);

            // Verify the completion status is still there
            expect(retrieved).toBeDefined();
            expect(retrieved!.completed).toBe(true);
            expect(retrieved!.completedAt).toBeDefined();
            expect(retrieved!.userId).toBe(userId);
            expect(retrieved!.exerciseId).toBe(exercise.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Additional property: Progress persistence for pronunciation scores
    it('should persist pronunciation scores immediately and be retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (userId, lessonId, score, recognizedText) => {
            // Create an exercise
            const exercise = createMockExercise(lessonId);

            // Record pronunciation score
            const pronunciationScore = await progressService.recordPronunciationScore(
              userId,
              exercise.id,
              score,
              recognizedText
            );

            // Verify immediate persistence
            expect(pronunciationScore.score).toBe(score);
            expect(pronunciationScore.recognizedText).toBe(recognizedText);

            // Retrieve the scores
            const retrieved = await progressService.getPronunciationScores(userId, exercise.id);

            // Verify the score is persisted
            expect(retrieved.length).toBeGreaterThan(0);
            const lastScore = retrieved[0];
            expect(lastScore.score).toBe(score);
            expect(lastScore.recognizedText).toBe(recognizedText);
            expect(lastScore.userId).toBe(userId);
            expect(lastScore.exerciseId).toBe(exercise.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: language-learning-platform, Property 22: Progress synchronization
    // Validates: Requirements 9.4
    it('should synchronize progress across multiple devices', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.array(
            fc.record({
              completed: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (userId, lessonId, progressData) => {
            // Create exercises for the lesson
            const exercises = progressData.map((_, index) => 
              createMockExercise(lessonId, index)
            );

            // Simulate progress on device A
            const progressUpdatesA = exercises.map((exercise, index) => ({
              exerciseId: exercise.id,
              completed: progressData[index].completed,
            }));

            // Sync progress from device A
            const syncedA = await progressService.syncProgress(userId, progressUpdatesA);

            // Verify all progress was synced
            expect(syncedA.length).toBe(exercises.length);

            // Simulate retrieving progress on device B
            const progressOnB = await progressService.getUserProgress(userId);

            // Verify the same progress is available on device B
            expect(progressOnB.totalExercisesCompleted).toBe(
              progressData.filter(p => p.completed).length
            );

            // Verify each exercise's progress is synchronized
            for (let i = 0; i < exercises.length; i++) {
              const exerciseProgress = await progressService.getExerciseProgress(
                userId,
                exercises[i].id
              );
              expect(exerciseProgress).toBeDefined();
              expect(exerciseProgress!.completed).toBe(progressData[i].completed);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Progress Restoration', () => {
    it('should return the last accessed exercise index for a lesson', async () => {
      const userId = uuidv4();
      const lessonId = uuidv4();
      const exercises = [
        createMockExercise(lessonId, 0),
        createMockExercise(lessonId, 1),
        createMockExercise(lessonId, 2),
      ];

      // Add exercises to mock
      exercises.forEach(ex => mockExercises.set(ex.id, ex));

      // Record progress on exercises 0 and 1
      await progressService.recordExerciseCompletion(userId, exercises[0].id);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await progressService.recordExerciseCompletion(userId, exercises[1].id);

      // Get last accessed exercise
      const lastIndex = await progressService.getLastAccessedExercise(userId, lessonId);

      // Should return index 1 (the last accessed)
      expect(lastIndex).toBe(1);
    });

    it('should return null when no progress exists for a lesson', async () => {
      const userId = uuidv4();
      const lessonId = uuidv4();

      const lastIndex = await progressService.getLastAccessedExercise(userId, lessonId);

      expect(lastIndex).toBeNull();
    });

    it('should return the most recent exercise even if earlier ones were accessed later', async () => {
      const userId = uuidv4();
      const lessonId = uuidv4();
      const exercises = [
        createMockExercise(lessonId, 0),
        createMockExercise(lessonId, 1),
        createMockExercise(lessonId, 2),
      ];

      exercises.forEach(ex => mockExercises.set(ex.id, ex));

      // Access in order: 0, 1, 2, then back to 0
      await progressService.recordExerciseCompletion(userId, exercises[0].id);
      await new Promise(resolve => setTimeout(resolve, 10));
      await progressService.recordExerciseCompletion(userId, exercises[1].id);
      await new Promise(resolve => setTimeout(resolve, 10));
      await progressService.recordExerciseCompletion(userId, exercises[2].id);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Access exercise 0 again (most recent)
      await progressService.recordExerciseCompletion(userId, exercises[0].id);

      const lastIndex = await progressService.getLastAccessedExercise(userId, lessonId);

      // Should return 0 (most recently accessed)
      expect(lastIndex).toBe(0);
    });
  });
});
