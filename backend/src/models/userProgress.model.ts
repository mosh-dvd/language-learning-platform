import { z } from 'zod';

// UserProgress TypeScript interface
export interface UserProgress {
  id: string;
  userId: string;
  exerciseId: string;
  completed: boolean;
  completedAt?: Date;
  lastAccessed: Date;
}

// Zod validation schemas
export const UserProgressSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  completed: z.boolean(),
  completedAt: z.date().optional(),
  lastAccessed: z.date(),
});

// Schema for creating/updating user progress
export const CreateUserProgressSchema = z.object({
  userId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  completed: z.boolean().default(false),
});

// Schema for updating user progress
export const UpdateUserProgressSchema = z.object({
  completed: z.boolean().optional(),
  completedAt: z.date().optional(),
});

// Type exports
export type CreateUserProgressInput = z.infer<typeof CreateUserProgressSchema>;
export type UpdateUserProgressInput = z.infer<typeof UpdateUserProgressSchema>;
