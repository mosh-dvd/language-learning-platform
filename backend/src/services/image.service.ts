import { Image, ImageMetadata } from '../models/image.model.js';
import { imageStorageService } from './imageStorage.service.js';
import { imageRepository, ImageFilters } from '../repositories/image.repository.js';

export interface UploadImageInput {
  buffer: Buffer;
  metadata: ImageMetadata;
  altText: string;
  createdBy: string;
}

export class ImageService {
  private repository: typeof imageRepository;

  constructor(repository: typeof imageRepository = imageRepository) {
    this.repository = repository;
  }

  /**
   * Upload and store a new image
   */
  async uploadImage(input: UploadImageInput): Promise<Image> {
    // Validate alt-text is provided
    if (!input.altText || input.altText.trim().length === 0) {
      throw new Error('Alt text is required for accessibility');
    }

    // Store the file
    const storageResult = await imageStorageService.storeImage(
      input.buffer,
      input.metadata
    );

    // Create database record
    const image = await this.repository.create({
      filename: input.metadata.filename,
      storagePath: storageResult.storagePath,
      mimeType: input.metadata.mimeType,
      sizeBytes: input.metadata.size,
      altText: input.altText,
      createdBy: input.createdBy,
    });

    return image;
  }

  /**
   * Get an image by ID
   */
  async getImage(id: string): Promise<Image | null> {
    return await this.repository.findById(id);
  }

  /**
   * Get image file data
   */
  async getImageFile(id: string): Promise<{ buffer: Buffer; image: Image }> {
    const image = await this.repository.findById(id);
    if (!image) {
      throw new Error('Image not found');
    }

    const buffer = await imageStorageService.getImage(image.storagePath);
    return { buffer, image };
  }

  /**
   * List images with optional filters
   */
  async listImages(filters: ImageFilters = {}): Promise<Image[]> {
    return await this.repository.list(filters);
  }

  /**
   * Delete an image
   * This will remove the file and update all associated lessons
   */
  async deleteImage(id: string): Promise<void> {
    const image = await this.repository.findById(id);
    if (!image) {
      throw new Error('Image not found');
    }

    // Remove references from exercises (referential integrity)
    await this.repository.removeExerciseReferences(id);

    // Delete from database
    await this.repository.delete(id);

    // Delete file from storage
    await imageStorageService.deleteImage(image.storagePath);
  }

  /**
   * Validate image format
   */
  validateImageFormat(metadata: ImageMetadata): { valid: boolean; error?: string } {
    return imageStorageService.validateImage(metadata);
  }
}

// Export singleton instance
export const imageService = new ImageService();
