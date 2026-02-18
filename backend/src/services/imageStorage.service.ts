import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ImageMetadata } from '../models/image.model.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface StorageResult {
  id: string;
  storagePath: string;
}

export class ImageStorageService {
  /**
   * Initialize the storage service by ensuring upload directory exists
   */
  async initialize(): Promise<void> {
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
  }

  /**
   * Validate image format and size
   */
  validateImage(metadata: ImageMetadata): ValidationResult {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(metadata.mimeType)) {
      return {
        valid: false,
        error: `Invalid file format. Allowed formats: ${ALLOWED_MIME_TYPES.join(', ')}`,
      };
    }

    // Validate file size
    if (metadata.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`,
      };
    }

    return { valid: true };
  }

  /**
   * Store an image file and return storage information
   */
  async storeImage(buffer: Buffer, metadata: ImageMetadata): Promise<StorageResult> {
    // Validate before storing
    const validation = this.validateImage(metadata);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate unique identifier
    const id = uuidv4();
    
    // Get file extension from MIME type
    const extension = this.getExtensionFromMimeType(metadata.mimeType);
    
    // Create storage path
    const filename = `${id}${extension}`;
    const storagePath = path.join(UPLOAD_DIR, filename);

    // Write file to disk
    await fs.writeFile(storagePath, buffer);

    return {
      id,
      storagePath: filename, // Store relative path
    };
  }

  /**
   * Retrieve an image file
   */
  async getImage(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(UPLOAD_DIR, storagePath);
    return await fs.readFile(fullPath);
  }

  /**
   * Delete an image file
   */
  async deleteImage(storagePath: string): Promise<void> {
    const fullPath = path.join(UPLOAD_DIR, storagePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Check if an image file exists
   */
  async imageExists(storagePath: string): Promise<boolean> {
    const fullPath = path.join(UPLOAD_DIR, storagePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    return extensions[mimeType] || '';
  }
}

// Export singleton instance
export const imageStorageService = new ImageStorageService();
