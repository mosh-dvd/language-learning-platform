import { Pool } from 'pg';
import { PasswordResetToken, CreatePasswordResetTokenInput } from '../models/passwordResetToken.model.js';
import pool from '../db/pool.js';

export class PasswordResetTokenRepository {
  constructor(private pool: Pool) {}

  async create(tokenData: CreatePasswordResetTokenInput): Promise<PasswordResetToken> {
    const query = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id as "userId", token, expires_at as "expiresAt",
                used, created_at as "createdAt"
    `;
    const values = [tokenData.userId, tokenData.token, tokenData.expiresAt];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const query = `
      SELECT id, user_id as "userId", token, expires_at as "expiresAt",
             used, created_at as "createdAt"
      FROM password_reset_tokens
      WHERE token = $1
    `;
    const result = await this.pool.query(query, [token]);
    return result.rows[0] || null;
  }

  async markAsUsed(id: string): Promise<void> {
    const query = `
      UPDATE password_reset_tokens
      SET used = true
      WHERE id = $1
    `;
    await this.pool.query(query, [id]);
  }

  async deleteExpired(): Promise<void> {
    const query = `
      DELETE FROM password_reset_tokens
      WHERE expires_at < CURRENT_TIMESTAMP
    `;
    await this.pool.query(query);
  }
}

// Export singleton instance
export const passwordResetTokenRepository = new PasswordResetTokenRepository(pool);
