import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { ExerciseService } from './exercise.service.js';
import { ExerciseRepository } from '../repositories/exercise.repository.js';
import { ImageRepository } from '../repositories/image.repository.js';
import { ImageTextRepository } from '../repositories/imageText.repository.js';
import { Exercise, CreateExerciseInput } from '../models/exercise.model.js';
import { Image } from '../models/image.model.js';
import { ImageText } from '../models/imageText.model.js';
import { v4 as uuidv4 } from 'uuid';

describe('ExerciseService', () => {
  let exerciseService: ExerciseService;
  let mockExerciseRepository: ExerciseRepository;
  let mockImageRepository: ImageRepository;
  let mockImageTextRepository: ImageTextRepository;
  const mockExercises: Map<string, Exercise> = new Map();
  const mockImages: Map<string, Image> = new Map();
  const mockImageTexts: Map<string, ImageText> = new Map();

  beforeEach(() => {
    mockExercises.clear();
    mockImages.clear();
    mockImageTexts.clear();

    // Create mock repositories
    mockExerciseRepository = {
      create: vi.fn(async (input: CreateExerciseInput) => {
        const exercise: Exercise = {
          id: uuidv4(),
          lessonId: input.lessonId,
          imageId: input.imageId,
          exerciseType: input.exerciseType,
          orderIndex: input.orderIndex,
          metadata: input.metadata,
          createdAt: new Date(),
        };
        mockExercises.set(exercise.id, exercise);
        return exercise;
      }),
      findById: vi.fn(async (id: string) => {
        return mockExercises.get(id) || null;
      }),
      findByLessonId: vi.fn(async (lessonId: string) => {
        return Array.from(mockExercises.values())
          .filter(e => e.lessonId === lessonId)
          .sort((a, b) => a.orderIndex - b.orderIndex);
      }),
      updateOrderIndex: vi.fn(async (id: string, orderIndex: number) => {
        const exercise = mockExercises.get(id);
        if (exercise) {
          exercise.orderIndex = orderIndex;
          mockExercises.set(id, exercise);
          return exercise;
        }
        return null;
      }),
      update: vi.fn(async (id: string, input: any) => {
        const exercise = mockExercises.get(id);
        if (exercise) {
          Object.assign(exercise, input);
          mockExercises.set(id, exercise);
          return exercise;
        }
        return null;
      }),
      delete: vi.fn(async (id: string) => {
        const exists = mockExercises.has(id);
        mockExercises.delete(id);
        return exists;
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

    mockImageRepository = {
      findById: vi.fn(async (id: string) => {
        return mockImages.get(id) || null;
      }),
    } as any;

    mockImageTextRepository = {
      findById: vi.fn(async (id: string) => {
        return mockImageTexts.get(id) || null;
      }),
      findByImageId: vi.fn(async (imageId: string) => {
        return Array.from(mockImageTexts.values()).filter(t => t.imageId === imageId);
      }),
    } as any;

    exerciseService = new ExerciseService({} as any);
    (exerciseService as any).exerciseRepository = mockExerciseRepository;
    (exerciseService as any).imageRepository = mockImageRepository;
    (exerciseService as any).imageTextRepository = mockImageTextRepository;
  });

  // Feature: language-learning-platform, Property 19: Exercise ordering
  // Validates: Requirements 7.2, 7.3
  describe('Property 19: Exercise ordering', () => {
    it('should maintain specified order when adding exercises and update correctly when reordering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 10 }),
          async (orderIndices) => {
            const lessonId = uuidv4();

            // Create mock images and texts for exercises
            const exercises: CreateExerciseInput[] = [];
            for (let i = 0; i < orderIndices.length; i++) {
              const imageId = uuidv4();
              const textId = uuidv4();

              // Add mock image
              const image: Image = {
                id: imageId,
                filename: `test-${i}.jpg`,
                storagePath: `/path/to/${imageId}.jpg`,
                mimeType: 'image/jpeg',
                sizeBytes: 1000,
                altText: `Test image ${i}`,
                createdAt: new Date(),
                createdBy: uuidv4(),
              };
              mockImages.set(imageId, image);

              // Add mock text
              const text: ImageText = {
                id: textId,
                imageId: imageId,
                languageCode: 'es',
                text: `Test text ${i}`,
                version: 1,
                createdAt: new Date(),
              };
              mockImageTexts.set(textId, text);

              exercises.push({
                lessonId: lessonId,
                imageId: imageId,
                exerciseType: 'image_text',
                orderIndex: orderIndices[i],
                metadata: {},
              });
            }

            // Create exercises with specified order indices
            const createdExercises = [];
            for (const exercise of exercises) {
              const created = await exerciseService.createExercise(exercise);
              createdExercises.push(created);
            }

            // Verify exercises are ordered correctly
            const retrievedExercises = await exerciseService.getExercisesByLesson(lessonId);
            expect(retrievedExercises).toHaveLength(orderIndices.length);

            // Check that exercises are sorted by orderIndex
            for (let i = 0; i < retrievedExercises.length - 1; i++) {
              expect(retrievedExercises[i].orderIndex).toBeLessThanOrEqual(
                retrievedExercises[i + 1].orderIndex
              );
            }

            // Test reordering
            const exerciseIds = createdExercises.map(e => e.id);
            const shuffledIds = [...exerciseIds].reverse(); // Simple reorder

            const reorderedExercises = await exerciseService.reorderExercises(lessonId, {
              exerciseIds: shuffledIds,
            });

            // Verify new order
            expect(reorderedExercises).toHaveLength(shuffledIds.length);
            for (let i = 0; i < shuffledIds.length; i++) {
              expect(reorderedExercises[i].id).toBe(shuffledIds[i]);
              expect(reorderedExercises[i].orderIndex).toBe(i);
            }

            // Cleanup
            for (const exercise of createdExercises) {
              mockExercises.delete(exercise.id);
            }
            for (const exercise of exercises) {
              mockImages.delete(exercise.imageId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: language-learning-platform, Property 20: Exercise validation
  // Validates: Requirements 7.4
  describe('Property 20: Exercise validation', () => {
    it('should reject exercises without image and text, and accept exercises with both', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hasImage: fc.boolean(),
            hasText: fc.boolean(),
            lessonId: fc.uuid(),
            orderIndex: fc.integer({ min: 0, max: 100 }),
          }),
          async ({ hasImage, hasText, lessonId, orderIndex }) => {
            const imageId = uuidv4();
            const textId = uuidv4();

            // Setup mock image if needed
            if (hasImage) {
              const image: Image = {
                id: imageId,
                filename: 'test.jpg',
                storagePath: `/path/to/${imageId}.jpg`,
                mimeType: 'image/jpeg',
                sizeBytes: 1000,
                altText: 'Test image',
                createdAt: new Date(),
                createdBy: uuidv4(),
              };
              mockImages.set(imageId, image);
            }

            // Setup mock text if needed
            if (hasText) {
              const text: ImageText = {
                id: textId,
                imageId: imageId,
                languageCode: 'es',
                text: 'Test text',
                version: 1,
                createdAt: new Date(),
              };
              mockImageTexts.set(textId, text);
            }

            const exerciseInput: CreateExerciseInput = {
              lessonId: lessonId,
              imageId: imageId,
              exerciseType: 'image_text',
              orderIndex: orderIndex,
              metadata: {},
            };

            if (hasImage && hasText) {
              // Should succeed with both image and text
              const exercise = await exerciseService.createExercise(exerciseInput);
              expect(exercise).toBeDefined();
              expect(exercise.imageId).toBe(imageId);
              
              // Cleanup
              mockExercises.delete(exercise.id);
            } else if (!hasImage) {
              // Should fail without image
              await expect(exerciseService.createExercise(exerciseInput)).rejects.toThrow(
                `Image ${imageId} not found`
              );
            } else {
              // Should fail without text (hasImage but !hasText)
              await expect(exerciseService.createExercise(exerciseInput)).rejects.toThrow(
                `Image ${imageId} has no associated text`
              );
            }

            // Cleanup
            mockImages.delete(imageId);
            mockImageTexts.delete(textId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: language-learning-platform, Property 40: Exercise type support
  // Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5
  describe('Property 40: Exercise type support', () => {
    it('should allow creation and validation of all supported exercise types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('image_text', 'matching_pairs', 'fill_in_blank', 'listening_comprehension'),
          fc.uuid(),
          async (exerciseType, lessonId) => {
            const imageId = uuidv4();
            const textId = uuidv4();

            // Setup mock image
            const image: Image = {
              id: imageId,
              filename: 'test.jpg',
              storagePath: `/path/to/${imageId}.jpg`,
              mimeType: 'image/jpeg',
              sizeBytes: 1000,
              altText: 'Test image',
              createdAt: new Date(),
              createdBy: uuidv4(),
            };
            mockImages.set(imageId, image);

            // Setup mock text
            const text: ImageText = {
              id: textId,
              imageId: imageId,
              languageCode: 'es',
              text: 'Test text',
              version: 1,
              createdAt: new Date(),
            };
            mockImageTexts.set(textId, text);

            // Create appropriate metadata for each exercise type
            let metadata: Record<string, any> = {};
            
            switch (exerciseType) {
              case 'image_text':
                metadata = {};
                break;
                
              case 'matching_pairs':
                // Create additional images and texts for pairs
                const pairIds = [];
                for (let i = 0; i < 2; i++) {
                  const pairImageId = uuidv4();
                  const pairTextId = uuidv4();
                  
                  mockImages.set(pairImageId, {
                    id: pairImageId,
                    filename: `pair-${i}.jpg`,
                    storagePath: `/path/to/${pairImageId}.jpg`,
                    mimeType: 'image/jpeg',
                    sizeBytes: 1000,
                    altText: `Pair image ${i}`,
                    createdAt: new Date(),
                    createdBy: uuidv4(),
                  });
                  
                  mockImageTexts.set(pairTextId, {
                    id: pairTextId,
                    imageId: pairImageId,
                    languageCode: 'es',
                    text: `Pair text ${i}`,
                    version: 1,
                    createdAt: new Date(),
                  });
                  
                  pairIds.push({ imageId: pairImageId, textId: pairTextId });
                }
                
                metadata = {
                  pairs: pairIds,
                };
                break;
                
              case 'fill_in_blank':
                metadata = {
                  sentence: 'The cat is on the mat',
                  blankIndex: 2,
                  correctAnswer: 'on',
                  distractors: ['in', 'at', 'by'],
                };
                break;
                
              case 'listening_comprehension':
                // Create additional images for options
                const optionIds = [];
                for (let i = 0; i < 3; i++) {
                  const optionImageId = uuidv4();
                  
                  mockImages.set(optionImageId, {
                    id: optionImageId,
                    filename: `option-${i}.jpg`,
                    storagePath: `/path/to/${optionImageId}.jpg`,
                    mimeType: 'image/jpeg',
                    sizeBytes: 1000,
                    altText: `Option image ${i}`,
                    createdAt: new Date(),
                    createdBy: uuidv4(),
                  });
                  
                  optionIds.push(optionImageId);
                }
                
                metadata = {
                  audioTextId: textId,
                  imageOptions: optionIds,
                  correctImageIndex: 1,
                };
                break;
            }

            const exerciseInput: CreateExerciseInput = {
              lessonId: lessonId,
              imageId: imageId,
              exerciseType: exerciseType as any,
              orderIndex: 0,
              metadata: metadata,
            };

            // Should succeed for all supported exercise types
            const exercise = await exerciseService.createExercise(exerciseInput);
            expect(exercise).toBeDefined();
            expect(exercise.exerciseType).toBe(exerciseType);
            expect(exercise.metadata).toEqual(metadata);

            // Cleanup
            mockExercises.delete(exercise.id);
            mockImages.delete(imageId);
            mockImageTexts.delete(textId);
            
            // Cleanup additional resources based on type
            if (exerciseType === 'matching_pairs' && metadata.pairs) {
              for (const pair of metadata.pairs) {
                mockImages.delete(pair.imageId);
                mockImageTexts.delete(pair.textId);
              }
            } else if (exerciseType === 'listening_comprehension' && metadata.imageOptions) {
              for (const optionId of metadata.imageOptions) {
                mockImages.delete(optionId);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: language-learning-platform, Property 41: Exercise content validation
  // Validates: Requirements 14.6
  describe('Property 41: Exercise content validation', () => {
    it('should validate that all required content elements for exercise type are present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('image_text', 'matching_pairs', 'fill_in_blank', 'listening_comprehension'),
          fc.boolean(), // whether to include valid metadata
          fc.uuid(),
          async (exerciseType, hasValidMetadata, lessonId) => {
            const imageId = uuidv4();
            const textId = uuidv4();

            // Setup mock image
            const image: Image = {
              id: imageId,
              filename: 'test.jpg',
              storagePath: `/path/to/${imageId}.jpg`,
              mimeType: 'image/jpeg',
              sizeBytes: 1000,
              altText: 'Test image',
              createdAt: new Date(),
              createdBy: uuidv4(),
            };
            mockImages.set(imageId, image);

            // Setup mock text
            const text: ImageText = {
              id: textId,
              imageId: imageId,
              languageCode: 'es',
              text: 'Test text',
              version: 1,
              createdAt: new Date(),
            };
            mockImageTexts.set(textId, text);

            let metadata: Record<string, any> | undefined;
            let shouldSucceed = false;

            // Create metadata based on exercise type and validity flag
            switch (exerciseType) {
              case 'image_text':
                // Image text doesn't require metadata
                metadata = {};
                shouldSucceed = true;
                break;

              case 'matching_pairs':
                if (hasValidMetadata) {
                  // Create valid pairs
                  const pairIds = [];
                  for (let i = 0; i < 2; i++) {
                    const pairImageId = uuidv4();
                    const pairTextId = uuidv4();
                    
                    mockImages.set(pairImageId, {
                      id: pairImageId,
                      filename: `pair-${i}.jpg`,
                      storagePath: `/path/to/${pairImageId}.jpg`,
                      mimeType: 'image/jpeg',
                      sizeBytes: 1000,
                      altText: `Pair image ${i}`,
                      createdAt: new Date(),
                      createdBy: uuidv4(),
                    });
                    
                    mockImageTexts.set(pairTextId, {
                      id: pairTextId,
                      imageId: pairImageId,
                      languageCode: 'es',
                      text: `Pair text ${i}`,
                      version: 1,
                      createdAt: new Date(),
                    });
                    
                    pairIds.push({ imageId: pairImageId, textId: pairTextId });
                  }
                  
                  metadata = { pairs: pairIds };
                  shouldSucceed = true;
                } else {
                  // Missing metadata or invalid pairs
                  metadata = undefined;
                  shouldSucceed = false;
                }
                break;

              case 'fill_in_blank':
                if (hasValidMetadata) {
                  metadata = {
                    sentence: 'The cat is on the mat',
                    blankIndex: 2,
                    correctAnswer: 'on',
                    distractors: ['in', 'at', 'by'],
                  };
                  shouldSucceed = true;
                } else {
                  // Missing metadata
                  metadata = undefined;
                  shouldSucceed = false;
                }
                break;

              case 'listening_comprehension':
                if (hasValidMetadata) {
                  // Create valid image options
                  const optionIds = [];
                  for (let i = 0; i < 3; i++) {
                    const optionImageId = uuidv4();
                    
                    mockImages.set(optionImageId, {
                      id: optionImageId,
                      filename: `option-${i}.jpg`,
                      storagePath: `/path/to/${optionImageId}.jpg`,
                      mimeType: 'image/jpeg',
                      sizeBytes: 1000,
                      altText: `Option image ${i}`,
                      createdAt: new Date(),
                      createdBy: uuidv4(),
                    });
                    
                    optionIds.push(optionImageId);
                  }
                  
                  metadata = {
                    audioTextId: textId,
                    imageOptions: optionIds,
                    correctImageIndex: 1,
                  };
                  shouldSucceed = true;
                } else {
                  // Missing metadata
                  metadata = undefined;
                  shouldSucceed = false;
                }
                break;
            }

            const exerciseInput: CreateExerciseInput = {
              lessonId: lessonId,
              imageId: imageId,
              exerciseType: exerciseType as any,
              orderIndex: 0,
              metadata: metadata,
            };

            if (shouldSucceed) {
              // Should succeed with valid content
              const exercise = await exerciseService.createExercise(exerciseInput);
              expect(exercise).toBeDefined();
              expect(exercise.exerciseType).toBe(exerciseType);

              // Cleanup
              mockExercises.delete(exercise.id);
            } else {
              // Should fail without required content
              await expect(exerciseService.createExercise(exerciseInput)).rejects.toThrow();
            }

            // Cleanup
            mockImages.delete(imageId);
            mockImageTexts.delete(textId);
            
            // Cleanup additional resources
            if (metadata) {
              if (exerciseType === 'matching_pairs' && metadata.pairs) {
                for (const pair of metadata.pairs) {
                  mockImages.delete(pair.imageId);
                  mockImageTexts.delete(pair.textId);
                }
              } else if (exerciseType === 'listening_comprehension' && metadata.imageOptions) {
                for (const optionId of metadata.imageOptions) {
                  mockImages.delete(optionId);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
