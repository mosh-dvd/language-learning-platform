import { Pool } from 'pg';
import { WeakWord, CreateWeakWordInput, UpdateWeakWordInput } from '../models/weakWord.model.js';

export class WeakWordRepository {
  constructor(private pool: Pool) {}

  async create(weakWordData: CreateWeakWordInput): Promise<WeakWord> {
    const query = `
      INSERT INTO weak_words (user_id, image_text_id, success_rate, attempt_count, 
                              last_attempt, next_review, review_interval, ease_factor)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_DATE + $5, $5, $6)
      RETURNING id, user_id as "userId", image_text_id as "imageTextId",
                success_rate as "successRate", attempt_count as "attemptCount",
                last_attempt as "lastAttempt", next_review as "nextReview",
                review_interval as "reviewInterval", ease_factor as "easeFactor",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [
      weakWordData.userId,
      weakWordData.imageTextId,
      weakWordData.successRate,
      weakWordData.attemptCount,
      weakWordData.reviewInterval,
      weakWordData.easeFactor,
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findByUserAndImageText(userId: string, imageTextId: string): Promise<WeakWord | null> {
    const query = `
      SELECT id, user_id as "userId", image_text_id as "imageTextId",
             success_rate as "successRate", attempt_count as "attemptCount",
             last_attempt as "lastAttempt", next_review as "nextReview",
             review_interval as "reviewInterval", ease_factor as "easeFactor",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM weak_words
      WHERE user_id = $1 AND image_text_id = $2
    `;
    const result = await this.pool.query(query, [userId, imageTextId]);
    return result.rows[0] || null;
  }

  async findByUser(userId: string): Promise<WeakWord[]> {
    const query = `
      SELECT id, user_id as "userId", image_text_id as "imageTextId",
             success_rate as "successRate", attempt_count as "attemptCount",
             last_attempt as "lastAttempt", next_review as "nextReview",
             review_interval as "reviewInterval", ease_factor as "easeFactor",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM weak_words
      WHERE user_id = $1
      ORDER BY next_review ASC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async findDueForReview(userId: string): Promise<WeakWord[]> {
    const query = `
      SELECT id, user_id as "userId", image_text_id as "imageTextId",
             success_rate as "successRate", attempt_count as "attemptCount",
             last_attempt as "lastAttempt", next_review as "nextReview",
             review_interval as "reviewInterval", ease_factor as "easeFactor",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM weak_words
      WHERE user_id = $1 AND next_review <= CURRENT_DATE
      ORDER BY next_review ASC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async update(id: string, updates: UpdateWeakWordInput): Promise<WeakWord> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.successRate !== undefined) {
      setClauses.push(`success_rate = $${paramCount++}`);
      values.push(updates.successRate);
    }
    if (updates.attemptCount !== undefined) {
      setClauses.push(`attempt_count = $${paramCount++}`);
      values.push(updates.attemptCount);
    }
    if (updates.lastAttempt !== undefined) {
      setClauses.push(`last_attempt = $${paramCount++}`);
      values.push(updates.lastAttempt);
    }
    if (updates.nextReview !== undefined) {
      setClauses.push(`next_review = $${paramCount++}`);
      values.push(updates.nextReview);
    }
    if (updates.reviewInterval !== undefined) {
      setClauses.push(`review_interval = $${paramCount++}`);
      values.push(updates.reviewInterval);
    }
    if (updates.easeFactor !== undefined) {
      setClauses.push(`ease_factor = $${paramCount++}`);
      values.push(updates.easeFactor);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE weak_words
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, user_id as "userId", image_text_id as "imageTextId",
                success_rate as "successRate", attempt_count as "attemptCount",
                last_attempt as "lastAttempt", next_review as "nextReview",
                review_interval as "reviewInterval", ease_factor as "easeFactor",
                created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    const query = `DELETE FROM weak_words WHERE id = $1`;
    await this.pool.query(query, [id]);
  }

  async deleteByUserAndImageText(userId: string, imageTextId: string): Promise<void> {
    const query = `DELETE FROM weak_words WHERE user_id = $1 AND image_text_id = $2`;
    await this.pool.query(query, [userId, imageTextId]);
  }
}
