import { Pool } from 'pg';
import { PronunciationScore, CreatePronunciationScoreInput } from '../models/pronunciationScore.model.js';

export class PronunciationScoreRepository {
  constructor(private pool: Pool) {}

  async create(scoreData: CreatePronunciationScoreInput): Promise<PronunciationScore> {
    const query = `
      INSERT INTO pronunciation_scores (user_id, exercise_id, score, recognized_text)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id as "userId", exercise_id as "exerciseId",
                score, recognized_text as "recognizedText", created_at as "createdAt"
    `;
    const values = [scoreData.userId, scoreData.exerciseId, scoreData.score, scoreData.recognizedText];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findByUserAndExercise(userId: string, exerciseId: string): Promise<PronunciationScore[]> {
    const query = `
      SELECT id, user_id as "userId", exercise_id as "exerciseId",
             score, recognized_text as "recognizedText", created_at as "createdAt"
      FROM pronunciation_scores
      WHERE user_id = $1 AND exercise_id = $2
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId, exerciseId]);
    return result.rows;
  }

  async findByUser(userId: string): Promise<PronunciationScore[]> {
    const query = `
      SELECT id, user_id as "userId", exercise_id as "exerciseId",
             score, recognized_text as "recognizedText", created_at as "createdAt"
      FROM pronunciation_scores
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getAverageScoreForExercise(userId: string, exerciseId: string): Promise<number> {
    const query = `
      SELECT AVG(score) as average
      FROM pronunciation_scores
      WHERE user_id = $1 AND exercise_id = $2
    `;
    const result = await this.pool.query(query, [userId, exerciseId]);
    return result.rows[0]?.average || 0;
  }

  async getRecentScoresForImageText(userId: string, imageTextId: string, limit: number = 10): Promise<PronunciationScore[]> {
    const query = `
      SELECT ps.id, ps.user_id as "userId", ps.exercise_id as "exerciseId",
             ps.score, ps.recognized_text as "recognizedText", ps.created_at as "createdAt"
      FROM pronunciation_scores ps
      JOIN exercises e ON ps.exercise_id = e.id
      JOIN image_texts it ON e.image_id = it.image_id
      WHERE ps.user_id = $1 AND it.id = $2
      ORDER BY ps.created_at DESC
      LIMIT $3
    `;
    const result = await this.pool.query(query, [userId, imageTextId, limit]);
    return result.rows;
  }
}
