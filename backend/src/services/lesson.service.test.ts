import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { LessonService } from './lesson.service.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { ExerciseRepository } from '../repositories/exercise.repository.js';
import { Lesson, CreateLessonInput } from '../models/lesson.model.js';
import { Exercise } from '../models/exercise.model.js';
import { v4 as uuidv4 } from 'uuid';

describe('LessonService', () => {
  let lessonService: LessonService;
  let mockLessonRepository: LessonRepository;
  let mockExerciseRepository: ExerciseRepository;
  const mockLessons: Map<string, Lesson> = new Map();
  const mockExercises: Map<string, Exercise> = new Map();

  beforeEach(() => {
    mockLessons.clear();
    mockExercises.clear();

    // Create mock repositories
    mockLessonRepository = {
      create: vi.fn(async (input: CreateLessonInput) => {
        const lesson: Lesson = {
          id: uuidv4(),
          title: input.title,
          targetLanguage: input.targetLanguage,
          published: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: input.createdBy,
        };
        mockLessons.set(lesson.id, lesson);
        return lesson;
      }),
      findById: vi.fn(async (id: string) => {
        return mockLessons.get(id) || null;
      }),
      findByLanguage: vi.fn(async (languageCode: string) => {
        return Array.from(mockLessons.values())
          .filter(l => l.targetLanguage === languageCode && l.published);
      }),
      findAll: vi.fn(async () => {
        return Array.from(mockLessons.values());
      }),
      update: vi.fn(async (id: string, input: any) => {
        const lesson = mockLessons.get(id);
        if (lesson) {
          Object.assign(lesson, input);
          lesson.updatedAt = new Date();
          mockLessons.set(id, lesson);
          return lesson;
        }
        return null;
      }),
      delete: vi.fn(async (id: string) => {
        const exists = mockLessons.has(id);
        mockLessons.delete(id);
        return exists;
      }),
    } as any;

    mockExerciseRepository = {
      findByLessonId: vi.fn(async (lessonId: string) => {
        return Array.from(mockExercises.values())
          .filter(e => e.lessonId === lessonId)
          .sort((a, b) => a.orderIndex - b.orderIndex);
      }),
      deleteByLessonId: vi.fn(async (lessonId: string) => {
        let count = 0;
        for (const [id, exercise] of mockExercises.entries()) {
          if (exercise.lessonId === lessonId) {
            mockExercises.delete(id);
            count++;
          }
        }
        return count;
      }),
    } as any;

    lessonService = new LessonService({} as any);
    (lessonService as any).lessonRepository = mockLessonRepository;
    (lessonService as any).exerciseRepository = mockExerciseRepository;
  });

  // Feature: language-learning-platform, Property 21: Lesson visibility by language
  // Validates: Requirements 7.5
  describe('Property 21: Lesson visibility by language', () => {
    it('should show published lessons only to users learning that language', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1, maxLength: 50 }).map(s => s.trim() || 'Test Lesson'),
              targetLanguage: fc.constantFrom('en', 'es', 'fr', 'de', 'ja', 'zh'),
              published: fc.boolean(),
              createdBy: fc.uuid(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.constantFrom('en', 'es', 'fr', 'de', 'ja', 'zh'),
          async (lessonInputs, userLanguage) => {
            // Create lessons
            const createdLessons = [];
            for (const input of lessonInputs) {
              const lesson = await lessonService.createLesson(input);
              
              // Update published status
              if (input.published) {
                await lessonService.publishLesson(lesson.id);
              }
              
              createdLessons.push({ ...lesson, published: input.published });
            }

            // Get lessons for user's target language
            const visibleLessons = await lessonService.getLessonsByLanguage(userLanguage);

            // Verify only published lessons for the target language are visible
            const expectedLessons = createdLessons.filter(
              l => l.targetLanguage === userLanguage && l.published
            );

            expect(visibleLessons).toHaveLength(expectedLessons.length);

            for (const visible of visibleLessons) {
              expect(visible.targetLanguage).toBe(userLanguage);
              expect(visible.published).toBe(true);
            }

            // Verify unpublished lessons are not visible
            const unpublishedForLanguage = createdLessons.filter(
              l => l.targetLanguage === userLanguage && !l.published
            );
            for (const unpublished of unpublishedForLanguage) {
              const found = visibleLessons.find(v => v.id === unpublished.id);
              expect(found).toBeUndefined();
            }

            // Verify lessons for other languages are not visible
            const otherLanguageLessons = createdLessons.filter(
              l => l.targetLanguage !== userLanguage
            );
            for (const other of otherLanguageLessons) {
              const found = visibleLessons.find(v => v.id === other.id);
              expect(found).toBeUndefined();
            }

            // Cleanup
            for (const lesson of createdLessons) {
              mockLessons.delete(lesson.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
