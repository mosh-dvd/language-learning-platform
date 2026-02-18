import { Pool } from 'pg';
import { UserStreak, CreateUserStreakInput, UpdateUserStreakInput } from '../models/userStreak.model.js';

export class UserStreakRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateUserStreakInput): Promise<UserStreak> {
    const query = `
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
      VALUES ($1, 0, 0, CURRENT_DATE)
      RETURNING id, user_id as "userId", current_streak as "currentStreak",
                longest_streak as "longestStreak", last_activity_date as "lastActivityDate",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const result = await this.pool.query(query, [data.userId]);
    return result.rows[0];
  }

  async findByUserId(userId: string): Promise<UserStreak | null> {
    const query = `
      SELECT id, user_id as "userId", current_streak as "currentStreak",
             longest_streak as "longestStreak", last_activity_date as "lastActivityDate",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM user_streaks
      WHERE user_id = $1
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  async update(userId: string, updates: UpdateUserStreakInput): Promise<UserStreak> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.currentStreak !== undefined) {
      setClauses.push(`current_streak = $${paramCount++}`);
      values.push(updates.currentStreak);
    }
    if (updates.longestStreak !== undefined) {
      setClauses.push(`longest_streak = $${paramCount++}`);
      values.push(updates.longestStreak);
    }
    if (updates.lastActivityDate !== undefined) {
      setClauses.push(`last_activity_date = $${paramCount++}`);
      values.push(updates.lastActivityDate);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE user_streaks
      SET ${setClauses.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING id, user_id as "userId", current_streak as "currentStreak",
                longest_streak as "longestStreak", last_activity_date as "lastActivityDate",
                created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async upsert(userId: string, updates: UpdateUserStreakInput): Promise<UserStreak> {
    const query = `
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_activity_date = EXCLUDED.last_activity_date,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id as "userId", current_streak as "currentStreak",
                longest_streak as "longestStreak", last_activity_date as "lastActivityDate",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [
      userId,
      updates.currentStreak ?? 0,
      updates.longestStreak ?? 0,
      updates.lastActivityDate ?? new Date(),
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
}
