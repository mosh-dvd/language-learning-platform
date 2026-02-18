import { z } from 'zod';
import { Exercise } from './exercise.model.js';

// Lesson TypeScript interface
export interface Lesson {
  id: string;
  title: string;
  targetLanguage: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  exercises?: Exercise[];
}

// Zod validation schemas
export const LessonSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  targetLanguage: z.string().length(2).or(z.string().regex(/^[a-z]{2}-[A-Z]{2}$/)),
  published: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid(),
});

// Schema for creating a new lesson
export const CreateLessonSchema = z.object({
  title: z.string().min(1),
  targetLanguage: z.string().length(2).or(z.string().regex(/^[a-z]{2}-[A-Z]{2}$/)),
  createdBy: z.string().uuid(),
});

// Schema for updating a lesson
export const UpdateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  targetLanguage: z.string().length(2).or(z.string().regex(/^[a-z]{2}-[A-Z]{2}$/)).optional(),
  published: z.boolean().optional(),
});

// Type exports
export type CreateLessonInput = z.infer<typeof CreateLessonSchema>;
export type UpdateLessonInput = z.infer<typeof UpdateLessonSchema>;
