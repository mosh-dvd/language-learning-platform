import { Pool } from 'pg';
import { Lesson, CreateLessonInput, UpdateLessonInput } from '../models/lesson.model.js';

export class LessonRepository {
  constructor(private pool: Pool) {}

  async create(input: CreateLessonInput): Promise<Lesson> {
    const result = await this.pool.query(
      `INSERT INTO lessons (title, target_language, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, title, target_language as "targetLanguage", published, 
                 created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"`,
      [input.title, input.targetLanguage, input.createdBy]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Lesson | null> {
    const result = await this.pool.query(
      `SELECT id, title, target_language as "targetLanguage", published,
              created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"
       FROM lessons
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByLanguage(languageCode: string): Promise<Lesson[]> {
    const result = await this.pool.query(
      `SELECT id, title, target_language as "targetLanguage", published,
              created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"
       FROM lessons
       WHERE target_language = $1 AND published = true
       ORDER BY created_at DESC`,
      [languageCode]
    );
    return result.rows;
  }

  async findAll(): Promise<Lesson[]> {
    const result = await this.pool.query(
      `SELECT id, title, target_language as "targetLanguage", published,
              created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"
       FROM lessons
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async update(id: string, input: UpdateLessonInput): Promise<Lesson | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    if (input.targetLanguage !== undefined) {
      fields.push(`target_language = $${paramIndex++}`);
      values.push(input.targetLanguage);
    }
    if (input.published !== undefined) {
      fields.push(`published = $${paramIndex++}`);
      values.push(input.published);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.pool.query(
      `UPDATE lessons
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, title, target_language as "targetLanguage", published,
                 created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"`,
      values
    );
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM lessons WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}
