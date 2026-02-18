import { Pool } from 'pg';
import { Achievement, CreateAchievementInput } from '../models/achievement.model.js';

export class AchievementRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateAchievementInput): Promise<Achievement> {
    const query = `
      INSERT INTO achievements (name, description, icon_url, criteria)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, icon_url as "iconUrl", criteria, created_at as "createdAt"
    `;
    const values = [data.name, data.description || null, data.iconUrl || null, JSON.stringify(data.criteria)];
    const result = await this.pool.query(query, values);
    const row = result.rows[0];
    return {
      ...row,
      criteria: typeof row.criteria === 'string' ? JSON.parse(row.criteria) : row.criteria,
    };
  }

  async findById(id: string): Promise<Achievement | null> {
    const query = `
      SELECT id, name, description, icon_url as "iconUrl", criteria, created_at as "createdAt"
      FROM achievements
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      ...row,
      criteria: typeof row.criteria === 'string' ? JSON.parse(row.criteria) : row.criteria,
    };
  }

  async findAll(): Promise<Achievement[]> {
    const query = `
      SELECT id, name, description, icon_url as "iconUrl", criteria, created_at as "createdAt"
      FROM achievements
      ORDER BY created_at ASC
    `;
    const result = await this.pool.query(query);
    return result.rows.map((row) => ({
      ...row,
      criteria: typeof row.criteria === 'string' ? JSON.parse(row.criteria) : row.criteria,
    }));
  }
}
