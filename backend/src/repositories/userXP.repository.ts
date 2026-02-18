import { Pool } from 'pg';
import { UserXP, CreateUserXPInput } from '../models/userXP.model.js';

export class UserXPRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateUserXPInput): Promise<UserXP> {
    const query = `
      INSERT INTO user_xp (user_id, amount, reason)
      VALUES ($1, $2, $3)
      RETURNING id, user_id as "userId", amount, reason, created_at as "createdAt"
    `;
    const values = [data.userId, data.amount, data.reason || null];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getTotalXP(userId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM user_xp
      WHERE user_id = $1
    `;
    const result = await this.pool.query(query, [userId]);
    return parseInt(result.rows[0].total, 10);
  }

  async getXPHistory(userId: string, limit: number = 50): Promise<UserXP[]> {
    const query = `
      SELECT id, user_id as "userId", amount, reason, created_at as "createdAt"
      FROM user_xp
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [userId, limit]);
    return result.rows;
  }

  async getDailyXP(userId: string, date: Date): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM user_xp
      WHERE user_id = $1
        AND DATE(created_at) = DATE($2)
    `;
    const result = await this.pool.query(query, [userId, date]);
    return parseInt(result.rows[0].total, 10);
  }
}
