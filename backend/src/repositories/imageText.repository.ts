import { Pool } from 'pg';
import { ImageText, CreateImageTextInput } from '../models/imageText.model.js';
import { pool } from '../db/pool.js';

export interface ImageTextFilters {
  imageId?: string;
  languageCode?: string;
  limit?: number;
  offset?: number;
}

export class ImageTextRepository {
  constructor(private db: Pool = pool) {}

  /**
   * Create a new image text record
   * Automatically increments version for existing image+language combinations
   */
  async create(input: CreateImageTextInput): Promise<ImageText> {
    // Get the next version number for this image+language combination
    const versionQuery = `
      SELECT COALESCE(MAX(version), 0) + 1 as next_version
      FROM image_texts
      WHERE image_id = $1 AND language_code = $2
    `;
    const versionResult = await this.db.query(versionQuery, [
      input.imageId,
      input.languageCode,
    ]);
    const nextVersion = versionResult.rows[0].next_version;

    const query = `
      INSERT INTO image_texts (image_id, language_code, text, version)
      VALUES ($1, $2, $3, $4)
      RETURNING id, image_id as "imageId", language_code as "languageCode", 
                text, version, created_at as "createdAt"
    `;

    const values = [input.imageId, input.languageCode, input.text, nextVersion];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find the latest version of text for an image in a specific language
   */
  async findLatestByImageAndLanguage(
    imageId: string,
    languageCode: string
  ): Promise<ImageText | null> {
    const query = `
      SELECT id, image_id as "imageId", language_code as "languageCode",
             text, version, created_at as "createdAt"
      FROM image_texts
      WHERE image_id = $1 AND language_code = $2
      ORDER BY version DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [imageId, languageCode]);
    return result.rows[0] || null;
  }

  /**
   * Find a specific version of text for an image in a specific language
   */
  async findByImageLanguageAndVersion(
    imageId: string,
    languageCode: string,
    version: number
  ): Promise<ImageText | null> {
    const query = `
      SELECT id, image_id as "imageId", language_code as "languageCode",
             text, version, created_at as "createdAt"
      FROM image_texts
      WHERE image_id = $1 AND language_code = $2 AND version = $3
    `;

    const result = await this.db.query(query, [imageId, languageCode, version]);
    return result.rows[0] || null;
  }

  /**
   * Get all versions of text for an image in a specific language
   */
  async findVersionHistory(
    imageId: string,
    languageCode: string
  ): Promise<ImageText[]> {
    const query = `
      SELECT id, image_id as "imageId", language_code as "languageCode",
             text, version, created_at as "createdAt"
      FROM image_texts
      WHERE image_id = $1 AND language_code = $2
      ORDER BY version ASC
    `;

    const result = await this.db.query(query, [imageId, languageCode]);
    return result.rows;
  }

  /**
   * Get all languages available for an image
   */
  async findLanguagesByImage(imageId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT language_code
      FROM image_texts
      WHERE image_id = $1
      ORDER BY language_code
    `;

    const result = await this.db.query(query, [imageId]);
    return result.rows.map((row) => row.language_code);
  }

  /**
   * List image texts with optional filters
   */
  async list(filters: ImageTextFilters = {}): Promise<ImageText[]> {
    let query = `
      SELECT id, image_id as "imageId", language_code as "languageCode",
             text, version, created_at as "createdAt"
      FROM image_texts
    `;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.imageId) {
      conditions.push(`image_id = $${paramCount}`);
      values.push(filters.imageId);
      paramCount++;
    }

    if (filters.languageCode) {
      conditions.push(`language_code = $${paramCount}`);
      values.push(filters.languageCode);
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
   * Delete all text entries for an image (cascades automatically via FK)
   */
  async deleteByImageId(imageId: string): Promise<number> {
    const query = 'DELETE FROM image_texts WHERE image_id = $1';
    const result = await this.db.query(query, [imageId]);
    return result.rowCount || 0;
  }
}

// Export singleton instance
export const imageTextRepository = new ImageTextRepository();
