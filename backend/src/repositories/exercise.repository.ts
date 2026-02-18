import { Pool } from 'pg';
import { Exercise, CreateExerciseInput, UpdateExerciseInput } from '../models/exercise.model.js';

export class ExerciseRepository {
  constructor(private pool: Pool) {}

  async create(input: CreateExerciseInput): Promise<Exercise> {
    const result = await this.pool.query(
      `INSERT INTO exercises (lesson_id, image_id, exercise_type, order_index, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, lesson_id as "lessonId", image_id as "imageId", 
                 exercise_type as "exerciseType", order_index as "orderIndex", 
                 metadata, created_at as "createdAt"`,
      [input.lessonId, input.imageId, input.exerciseType, input.orderIndex, JSON.stringify(input.metadata || {})]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Exercise | null> {
    const result = await this.pool.query(
      `SELECT id, lesson_id as "lessonId", image_id as "imageId",
              exercise_type as "exerciseType", order_index as "orderIndex",
              metadata, created_at as "createdAt"
       FROM exercises
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByLessonId(lessonId: string): Promise<Exercise[]> {
    const result = await this.pool.query(
      `SELECT id, lesson_id as "lessonId", image_id as "imageId",
              exercise_type as "exerciseType", order_index as "orderIndex",
              metadata, created_at as "createdAt"
       FROM exercises
       WHERE lesson_id = $1
       ORDER BY order_index ASC`,
      [lessonId]
    );
    return result.rows;
  }

  async update(id: string, input: UpdateExerciseInput): Promise<Exercise | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.imageId !== undefined) {
      fields.push(`image_id = $${paramIndex++}`);
      values.push(input.imageId);
    }
    if (input.exerciseType !== undefined) {
      fields.push(`exercise_type = $${paramIndex++}`);
      values.push(input.exerciseType);
    }
    if (input.orderIndex !== undefined) {
      fields.push(`order_index = $${paramIndex++}`);
      values.push(input.orderIndex);
    }
    if (input.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await this.pool.query(
      `UPDATE exercises
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, lesson_id as "lessonId", image_id as "imageId",
                 exercise_type as "exerciseType", order_index as "orderIndex",
                 metadata, created_at as "createdAt"`,
      values
    );
    return result.rows[0] || null;
  }

  async updateOrderIndex(id: string, orderIndex: number): Promise<Exercise | null> {
    const result = await this.pool.query(
      `UPDATE exercises
       SET order_index = $1
       WHERE id = $2
       RETURNING id, lesson_id as "lessonId", image_id as "imageId",
                 exercise_type as "exerciseType", order_index as "orderIndex",
                 metadata, created_at as "createdAt"`,
      [orderIndex, id]
    );
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM exercises WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteByLessonId(lessonId: string): Promise<number> {
    const result = await this.pool.query(
      'DELETE FROM exercises WHERE lesson_id = $1',
      [lessonId]
    );
    return result.rowCount || 0;
  }
}
