import { Pool } from 'pg';
import { UserAchievement, CreateUserAchievementInput } from '../models/userAchievement.model.js';

export class UserAchievementRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateUserAchievementInput): Promise<UserAchievement> {
    const query = `
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES ($1, $2)
      RETURNING id, user_id as "userId", achievement_id as "achievementId", earned_at as "earnedAt"
    `;
    const values = [data.userId, data.achievementId];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findByUserId(userId: string): Promise<UserAchievement[]> {
    const query = `
      SELECT ua.id, ua.user_id as "userId", ua.achievement_id as "achievementId",
             ua.earned_at as "earnedAt",
             a.id as "achievement.id", a.name as "achievement.name",
             a.description as "achievement.description", a.icon_url as "achievement.iconUrl",
             a.criteria as "achievement.criteria", a.created_at as "achievement.createdAt"
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.earned_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      achievementId: row.achievementId,
      earnedAt: row.earnedAt,
      achievement: {
        id: row['achievement.id'],
        name: row['achievement.name'],
        description: row['achievement.description'],
        iconUrl: row['achievement.iconUrl'],
        criteria:
          typeof row['achievement.criteria'] === 'string'
            ? JSON.parse(row['achievement.criteria'])
            : row['achievement.criteria'],
        createdAt: row['achievement.createdAt'],
      },
    }));
  }

  async hasAchievement(userId: string, achievementId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM user_achievements
        WHERE user_id = $1 AND achievement_id = $2
      ) as exists
    `;
    const result = await this.pool.query(query, [userId, achievementId]);
    return result.rows[0].exists;
  }

  async findByUserIdAndAchievementId(
    userId: string,
    achievementId: string
  ): Promise<UserAchievement | null> {
    const query = `
      SELECT id, user_id as "userId", achievement_id as "achievementId", earned_at as "earnedAt"
      FROM user_achievements
      WHERE user_id = $1 AND achievement_id = $2
    `;
    const result = await this.pool.query(query, [userId, achievementId]);
    return result.rows[0] || null;
  }
}
