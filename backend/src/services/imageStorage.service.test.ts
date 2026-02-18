import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { ImageStorageService } from './imageStorage.service.js';
import { ImageMetadata } from '../models/image.model.js';

describe('ImageStorageService', () => {
  const service = new ImageStorageService();

  // Feature: language-learning-platform, Property 1: Image format validation
  // Validates: Requirements 1.1, 1.5
  test('image format validation accepts valid formats and rejects invalid ones', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Valid MIME types
          fc.constant('image/jpeg'),
          fc.constant('image/png'),
          fc.constant('image/webp'),
          // Invalid MIME types
          fc.constant('image/gif'),
          fc.constant('image/bmp'),
          fc.constant('image/svg+xml'),
          fc.constant('application/pdf'),
          fc.constant('text/plain'),
          fc.string()
        ),
        fc.integer({ min: 1, max: 20_000_000 }), // size in bytes
        fc.string({ minLength: 1, maxLength: 255 }), // filename
        (mimeType, size, filename) => {
          const metadata: ImageMetadata = {
            filename,
            mimeType: mimeType as any,
            size,
          };

          const result = service.validateImage(metadata);

          const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
          const maxSize = 10485760; // 10MB

          const shouldBeValid =
            validMimeTypes.includes(mimeType) && size <= maxSize;

          if (shouldBeValid) {
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          } else {
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('validates JPEG format correctly', () => {
    const result = service.validateImage({
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });
    expect(result.valid).toBe(true);
  });

  test('validates PNG format correctly', () => {
    const result = service.validateImage({
      filename: 'test.png',
      mimeType: 'image/png',
      size: 1024,
    });
    expect(result.valid).toBe(true);
  });

  test('validates WebP format correctly', () => {
    const result = service.validateImage({
      filename: 'test.webp',
      mimeType: 'image/webp',
      size: 1024,
    });
    expect(result.valid).toBe(true);
  });

  test('rejects invalid format', () => {
    const result = service.validateImage({
      filename: 'test.gif',
      mimeType: 'image/gif' as any,
      size: 1024,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file format');
  });

  test('rejects file exceeding size limit', () => {
    const result = service.validateImage({
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 11_000_000, // > 10MB
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum');
  });
});
