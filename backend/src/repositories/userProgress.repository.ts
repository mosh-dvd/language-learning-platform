import { Pool } from 'pg';
import { UserProgress, CreateUserProgressInput, UpdateUserProgressInput } from '../models/userProgress.model.js';

export class UserProgressRepository {
  constructor(private pool: Pool) {}

  async create(input: CreateUserProgressInput): Promise<UserProgress> {
    const result = await this.pool.query(
      `INSERT INTO user_progress (user_id, exercise_id, completed, last_accessed)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, user_id as "userId", exercise_id as "exerciseId",
                 completed, completed_at as "completedAt", last_accessed as "lastAccessed"`,
      [input.userId, input.exerciseId, input.completed || false]
    );
    return result.rows[0];
  }

  async findByUserAndExercise(userId: string, exerciseId: string): Promise<UserProgress | null> {
    const result = await this.pool.query(
      `SELECT id, user_id as "userId", exercise_id as "exerciseId",
              completed, completed_at as "completedAt", last_accessed as "lastAccessed"
       FROM user_progress
       WHERE user_id = $1 AND exercise_id = $2`,
      [userId, exerciseId]
    );
    return result.rows[0] || null;
  }

  async findByUser(userId: string): Promise<UserProgress[]> {
    const result = await this.pool.query(
      `SELECT id, user_id as "userId", exercise_id as "exerciseId",
              completed, completed_at as "completedAt", last_accessed as "lastAccessed"
       FROM user_progress
       WHERE user_id = $1
       ORDER BY last_accessed DESC`,
      [userId]
    );
    return result.rows;
  }

  async findByUserAndLesson(userId: string, lessonId: string): Promise<UserProgress[]> {
    const result = await this.pool.query(
      `SELECT up.id, up.user_id as "userId", up.exercise_id as "exerciseId",
              up.completed, up.completed_at as "completedAt", up.last_accessed as "lastAccessed"
       FROM user_progress up
       JOIN exercises e ON up.exercise_id = e.id
       WHERE up.user_id = $1 AND e.lesson_id = $2
       ORDER BY e.order_index ASC`,
      [userId, lessonId]
    );
    return result.rows;
  }

  async update(userId: string, exerciseId: string, input: UpdateUserProgressInput): Promise<UserProgress | null> {
    const fields: string[] = ['last_accessed = CURRENT_TIMESTAMP'];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.completed !== undefined) {
      fields.push(`completed = $${paramIndex++}`);
      values.push(input.completed);
      
      // If marking as completed, set completed_at
      if (input.completed) {
        fields.push(`completed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (input.completedAt !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(input.completedAt);
    }

    values.push(userId, exerciseId);

    const result = await this.pool.query(
      `UPDATE user_progress
       SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex++} AND exercise_id = $${paramIndex}
       RETURNING id, user_id as "userId", exercise_id as "exerciseId",
                 completed, completed_at as "completedAt", last_accessed as "lastAccessed"`,
      values
    );
    return result.rows[0] || null;
  }

  async upsert(input: CreateUserProgressInput & UpdateUserProgressInput): Promise<UserProgress> {
    const existing = await this.findByUserAndExercise(input.userId, input.exerciseId);
    
    if (existing) {
      const updated = await this.update(input.userId, input.exerciseId, {
        completed: input.completed,
        completedAt: input.completedAt,
      });
      return updated!;
    }
    
    return this.create(input);
  }

  async delete(userId: string, exerciseId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
      [userId, exerciseId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getCompletedCount(userId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM user_progress WHERE user_id = $1 AND completed = true',
      [userId]
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  async getLessonProgress(userId: string, lessonId: string): Promise<{ total: number; completed: number }> {
    const result = await this.pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN up.completed = true THEN 1 END) as completed
       FROM exercises e
       LEFT JOIN user_progress up ON e.id = up.exercise_id AND up.user_id = $1
       WHERE e.lesson_id = $2`,
      [userId, lessonId]
    );
    return {
      total: parseInt(result.rows[0]?.total || '0', 10),
      completed: parseInt(result.rows[0]?.completed || '0', 10),
    };
  }

  async getLastAccessedExercise(userId: string, lessonId: string): Promise<{ exerciseId: string; orderIndex: number } | null> {
    const result = await this.pool.query(
      `SELECT up.exercise_id as "exerciseId", e.order_index as "orderIndex"
       FROM user_progress up
       JOIN exercises e ON up.exercise_id = e.id
       WHERE up.user_id = $1 AND e.lesson_id = $2
       ORDER BY up.last_accessed DESC
       LIMIT 1`,
      [userId, lessonId]
    );
    return result.rows[0] || null;
  }
}
