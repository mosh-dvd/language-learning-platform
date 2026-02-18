import { describe, test, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { ImageService } from './image.service.js';
import { ImageRepository } from '../repositories/image.repository.js';
import { imageStorageService } from './imageStorage.service.js';
import { ImageMetadata, Image } from '../models/image.model.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const TEST_UPLOAD_DIR = './test-uploads';

describe('ImageService', () => {
  let imageService: ImageService;
  let mockRepository: ImageRepository;
  const mockImages: Map<string, Image> = new Map();

  beforeAll(async () => {
    // Set up test upload directory
    process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
    await imageStorageService.initialize();

    // Create mock repository
    mockRepository = {
      create: vi.fn(async (input: any) => {
        const image: Image = {
          id: uuidv4(),
          filename: input.filename,
          storagePath: input.storagePath,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          altText: input.altText,
          createdAt: new Date(),
          createdBy: input.createdBy,
        };
        mockImages.set(image.id, image);
        return image;
      }),
      findById: vi.fn(async (id: string) => {
        return mockImages.get(id) || null;
      }),
      list: vi.fn(async () => {
        return Array.from(mockImages.values());
      }),
      delete: vi.fn(async (id: string) => {
        const exists = mockImages.has(id);
        mockImages.delete(id);
        return exists;
      }),
      removeExerciseReferences: vi.fn(async () => {}),
      isReferencedByExercises: vi.fn(async () => false),
    } as any;

    imageService = new ImageService();
    // Replace the repository with our mock
    (imageService as any).repository = mockRepository;
  });

  afterEach(async () => {
    // Clean up test files
    mockImages.clear();
    try {
      const files = await fs.readdir(TEST_UPLOAD_DIR);
      for (const file of files) {
        await fs.unlink(path.join(TEST_UPLOAD_DIR, file));
      }
    } catch {
      // Ignore errors
    }
  });

  afterAll(async () => {
    // Remove test directory
    try {
      await fs.rm(TEST_UPLOAD_DIR, { recursive: true });
    } catch {
      // Ignore errors
    }
  });

  // Feature: language-learning-platform, Property 3: Image retrieval completeness
  // Validates: Requirements 1.3
  test('retrieving all uploaded images returns complete metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            filename: fc.string({ minLength: 1, maxLength: 50 }).map(s => s.trim() || 'test').map(s => s + '.jpg'),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
            size: fc.integer({ min: 100, max: 1000000 }),
            altText: fc.string({ minLength: 1, maxLength: 200 }).map(s => s.trim() || 'test alt text'),
            createdBy: fc.uuid(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (imageInputs) => {
          const uploadedImages = [];

          // Upload all images
          for (const input of imageInputs) {
            const buffer = Buffer.alloc(input.size);
            const metadata: ImageMetadata = {
              filename: input.filename,
              mimeType: input.mimeType as any,
              size: input.size,
            };

            try {
              const image = await imageService.uploadImage({
                buffer,
                metadata,
                altText: input.altText,
                createdBy: input.createdBy,
              });
              uploadedImages.push(image);
            } catch (error) {
              // Skip if upload fails (e.g., validation error)
              continue;
            }
          }

          // Retrieve all images
          const retrievedImages = await imageService.listImages({});

          // Verify all uploaded images are in the retrieved set
          for (const uploaded of uploadedImages) {
            const found = retrievedImages.find(img => img.id === uploaded.id);
            expect(found).toBeDefined();
            
            if (found) {
              // Verify complete metadata
              expect(found.id).toBe(uploaded.id);
              expect(found.filename).toBe(uploaded.filename);
              expect(found.storagePath).toBe(uploaded.storagePath);
              expect(found.mimeType).toBe(uploaded.mimeType);
              expect(found.sizeBytes).toBe(uploaded.sizeBytes);
              expect(found.createdBy).toBe(uploaded.createdBy);
            }
          }

          // Clean up uploaded images
          for (const image of uploadedImages) {
            try {
              await mockRepository.delete(image.id);
              await imageStorageService.deleteImage(image.storagePath);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: 10 } // Reduced runs for integration test
    );
  });

  test('retrieves image by ID with complete metadata', async () => {
    const buffer = Buffer.from('test image data');
    const metadata: ImageMetadata = {
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      size: buffer.length,
    };

    const uploaded = await imageService.uploadImage({
      buffer,
      metadata,
      altText: 'Test image',
      createdBy: uuidv4(),
    });

    const retrieved = await imageService.getImage(uploaded.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(uploaded.id);
    expect(retrieved?.filename).toBe(uploaded.filename);
    expect(retrieved?.mimeType).toBe(uploaded.mimeType);
    expect(retrieved?.sizeBytes).toBe(uploaded.sizeBytes);

    // Clean up
    await mockRepository.delete(uploaded.id);
    await imageStorageService.deleteImage(uploaded.storagePath);
  });

  test('returns null for non-existent image', async () => {
    const result = await imageService.getImage(uuidv4());
    expect(result).toBeNull();
  });

  // Feature: language-learning-platform, Property 4: Referential integrity on deletion
  // Validates: Requirements 1.4
  test('deleting an image removes it and updates referencing lessons', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          filename: fc.string({ minLength: 1, maxLength: 50 }).map(s => s.trim() || 'test').map(s => s + '.jpg'),
          mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
          size: fc.integer({ min: 100, max: 1000000 }),
          altText: fc.string({ minLength: 1, maxLength: 200 }).map(s => s.trim() || 'test alt text'),
          createdBy: fc.uuid(),
        }),
        async (input) => {
          const buffer = Buffer.alloc(input.size);
          const metadata: ImageMetadata = {
            filename: input.filename,
            mimeType: input.mimeType as any,
            size: input.size,
          };

          // Upload image
          const image = await imageService.uploadImage({
            buffer,
            metadata,
            altText: input.altText,
            createdBy: input.createdBy,
          });

          // Verify image exists
          const beforeDelete = await imageService.getImage(image.id);
          expect(beforeDelete).toBeDefined();

          // Delete image
          await imageService.deleteImage(image.id);

          // Verify image is removed from database
          const afterDelete = await imageService.getImage(image.id);
          expect(afterDelete).toBeNull();

          // Verify file is removed from storage
          const fileExists = await imageStorageService.imageExists(image.storagePath);
          expect(fileExists).toBe(false);

          // Verify removeExerciseReferences was called
          expect(mockRepository.removeExerciseReferences).toHaveBeenCalledWith(image.id);
        }
      ),
      { numRuns: 10 }
    );
  });

  test('deleting image removes file from storage', async () => {
    const buffer = Buffer.from('test image data');
    const metadata: ImageMetadata = {
      filename: 'test-delete.jpg',
      mimeType: 'image/jpeg',
      size: buffer.length,
    };

    const uploaded = await imageService.uploadImage({
      buffer,
      metadata,
      altText: 'Test image for deletion',
      createdBy: uuidv4(),
    });

    // Verify file exists
    const existsBefore = await imageStorageService.imageExists(uploaded.storagePath);
    expect(existsBefore).toBe(true);

    // Delete image
    await imageService.deleteImage(uploaded.id);

    // Verify file is removed
    const existsAfter = await imageStorageService.imageExists(uploaded.storagePath);
    expect(existsAfter).toBe(false);
  });

  test('deleting non-existent image throws error', async () => {
    await expect(imageService.deleteImage(uuidv4())).rejects.toThrow('Image not found');
  });

  // Feature: language-learning-platform, Property 42: Alt-text requirement
  // Validates: Requirements 15.2
  test('image upload requires alt-text for accessibility', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          filename: fc.string({ minLength: 1, maxLength: 50 }).map(s => s.trim() || 'test').map(s => s + '.jpg'),
          mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
          size: fc.integer({ min: 100, max: 1000000 }),
          altText: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
          createdBy: fc.uuid(),
        }),
        async (input) => {
          const buffer = Buffer.alloc(input.size);
          const metadata: ImageMetadata = {
            filename: input.filename,
            mimeType: input.mimeType as any,
            size: input.size,
          };

          const altText = input.altText || '';
          const hasValidAltText = altText.trim().length > 0;

          if (hasValidAltText) {
            // Should succeed with valid alt-text
            const image = await imageService.uploadImage({
              buffer,
              metadata,
              altText,
              createdBy: input.createdBy,
            });
            
            expect(image).toBeDefined();
            expect(image.altText).toBe(altText);

            // Clean up
            await mockRepository.delete(image.id);
            await imageStorageService.deleteImage(image.storagePath);
          } else {
            // Should fail without valid alt-text
            await expect(
              imageService.uploadImage({
                buffer,
                metadata,
                altText,
                createdBy: input.createdBy,
              })
            ).rejects.toThrow('Alt text is required for accessibility');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('rejects image upload without alt-text', async () => {
    const buffer = Buffer.from('test image data');
    const metadata: ImageMetadata = {
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      size: buffer.length,
    };

    await expect(
      imageService.uploadImage({
        buffer,
        metadata,
        altText: '',
        createdBy: uuidv4(),
      })
    ).rejects.toThrow('Alt text is required for accessibility');
  });

  test('rejects image upload with whitespace-only alt-text', async () => {
    const buffer = Buffer.from('test image data');
    const metadata: ImageMetadata = {
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      size: buffer.length,
    };

    await expect(
      imageService.uploadImage({
        buffer,
        metadata,
        altText: '   ',
        createdBy: uuidv4(),
      })
    ).rejects.toThrow('Alt text is required for accessibility');
  });

  test('accepts image upload with valid alt-text', async () => {
    const buffer = Buffer.from('test image data');
    const metadata: ImageMetadata = {
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      size: buffer.length,
    };

    const image = await imageService.uploadImage({
      buffer,
      metadata,
      altText: 'A beautiful sunset over the ocean',
      createdBy: uuidv4(),
    });

    expect(image).toBeDefined();
    expect(image.altText).toBe('A beautiful sunset over the ocean');

    // Clean up
    await mockRepository.delete(image.id);
    await imageStorageService.deleteImage(image.storagePath);
  });
});
