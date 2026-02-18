import { 
  Lesson, 
  CreateLessonInput, 
  UpdateLessonInput,
  CreateLessonSchema,
  UpdateLessonSchema
} from '../models/lesson.model.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { ExerciseRepository } from '../repositories/exercise.repository.js';
import { cacheService } from './cache.service.js';
import pool from '../db/pool.js';

export class LessonService {
  private lessonRepository: LessonRepository;
  private exerciseRepository: ExerciseRepository;

  constructor() {
    this.lessonRepository = new LessonRepository(pool);
    this.exerciseRepository = new ExerciseRepository(pool);
  }

  async createLesson(input: CreateLessonInput): Promise<Lesson> {
    // Validate input
    const validated = CreateLessonSchema.parse(input);
    
    // Create lesson
    const lesson = await this.lessonRepository.create(validated);
    return lesson;
  }

  async getLesson(id: string): Promise<Lesson | null> {
    // Check cache first
    const cachedLesson = await cacheService.getLesson(id);
    if (cachedLesson) {
      return cachedLesson;
    }

    const lesson = await this.lessonRepository.findById(id);
    if (!lesson) {
      return null;
    }

    // Load exercises for the lesson
    const exercises = await this.exerciseRepository.findByLessonId(id);
    lesson.exercises = exercises;

    // Cache the lesson
    await cacheService.setLesson(id, lesson);

    return lesson;
  }

  async getLessonsByLanguage(languageCode: string): Promise<Lesson[]> {
    // Only return published lessons
    const lessons = await this.lessonRepository.findByLanguage(languageCode);
    
    // Load exercises for each lesson
    for (const lesson of lessons) {
      const exercises = await this.exerciseRepository.findByLessonId(lesson.id);
      lesson.exercises = exercises;
    }

    return lessons;
  }

  async getAllLessons(): Promise<Lesson[]> {
    const lessons = await this.lessonRepository.findAll();
    
    // Load exercises for each lesson
    for (const lesson of lessons) {
      const exercises = await this.exerciseRepository.findByLessonId(lesson.id);
      lesson.exercises = exercises;
    }

    return lessons;
  }

  async updateLesson(id: string, input: UpdateLessonInput): Promise<Lesson | null> {
    // Validate input
    const validated = UpdateLessonSchema.parse(input);
    
    // Update lesson
    const lesson = await this.lessonRepository.update(id, validated);
    if (!lesson) {
      return null;
    }

    // Load exercises
    const exercises = await this.exerciseRepository.findByLessonId(id);
    lesson.exercises = exercises;

    // Invalidate cache
    await cacheService.invalidateLesson(id);
    if (input.targetLanguage) {
      await cacheService.invalidateLessonsByLanguage(input.targetLanguage);
    }

    return lesson;
  }

  async publishLesson(id: string): Promise<Lesson | null> {
    return this.updateLesson(id, { published: true });
  }

  async unpublishLesson(id: string): Promise<Lesson | null> {
    return this.updateLesson(id, { published: false });
  }

  async deleteLesson(id: string): Promise<boolean> {
    // Get lesson before deleting to invalidate language cache
    const lesson = await this.lessonRepository.findById(id);
    
    // Delete all exercises first (cascade should handle this, but being explicit)
    await this.exerciseRepository.deleteByLessonId(id);
    
    // Delete lesson
    const deleted = await this.lessonRepository.delete(id);
    
    if (deleted) {
      // Invalidate cache
      await cacheService.invalidateLesson(id);
      if (lesson) {
        await cacheService.invalidateLessonsByLanguage(lesson.targetLanguage);
      }
    }
    
    return deleted;
  }
}

// Export singleton instance
export const lessonService = new LessonService();
