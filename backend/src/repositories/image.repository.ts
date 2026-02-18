import { Pool } from 'pg';
import { Image, CreateImageInput } from '../models/image.model.js';
import { pool } from '../db/pool.js';

export interface ImageFilters {
  createdBy?: string;
  limit?: number;
  offset?: number;
}

export class ImageRepository {
  constructor(private db: Pool = pool) {}

  /**
   * Create a new image record in the database
   */
  async create(input: CreateImageInput & { altText: string }): Promise<Image> {
    const query = `
      INSERT INTO images (filename, storage_path, mime_type, size_bytes, alt_text, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, filename, storage_path as "storagePath", mime_type as "mimeType", 
                size_bytes as "sizeBytes", created_at as "createdAt", created_by as "createdBy"
    `;

    const values = [
      input.filename,
      input.storagePath,
      input.mimeType,
      input.sizeBytes,
      input.altText,
      input.createdBy,
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find an image by ID
   */
  async findById(id: string): Promise<Image | null> {
    const query = `
      SELECT id, filename, storage_path as "storagePath", mime_type as "mimeType",
             size_bytes as "sizeBytes", created_at as "createdAt", created_by as "createdBy"
      FROM images
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * List images with optional filters
   */
  async list(filters: ImageFilters = {}): Promise<Image[]> {
    let query = `
      SELECT id, filename, storage_path as "storagePath", mime_type as "mimeType",
             size_bytes as "sizeBytes", created_at as "createdAt", created_by as "createdBy"
      FROM images
    `;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.createdBy) {
      conditions.push(`created_by = $${paramCount}`);
      values.push(filters.createdBy);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Delete an image by ID
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM images WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Check if an image is referenced by any exercises
   */
  async isReferencedByExercises(imageId: string): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM exercises WHERE image_id = $1';
    const result = await this.db.query(query, [imageId]);
    return parseInt(result.rows[0].count, 10) > 0;
  }

  /**
   * Remove image references from exercises (set to NULL)
   */
  async removeExerciseReferences(imageId: string): Promise<void> {
    const query = 'UPDATE exercises SET image_id = NULL WHERE image_id = $1';
    await this.db.query(query, [imageId]);
  }
}

// Export singleton instance
export const imageRepository = new ImageRepository();
