import { z } from 'zod';

// WeakWord TypeScript interface
export interface WeakWord {
  id: string;
  userId: string;
  imageTextId: string;
  successRate: number;
  attemptCount: number;
  lastAttempt: Date;
  nextReview: Date;
  reviewInterval: number;
  easeFactor: number;
  createdAt: Date;
  updatedAt: Date;
}

// Zod validation schemas
export const WeakWordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  imageTextId: z.string().uuid(),
  successRate: z.number().min(0).max(100),
  attemptCount: z.number().int().min(0),
  lastAttempt: z.date(),
  nextReview: z.date(),
  reviewInterval: z.number().int().min(1),
  easeFactor: z.number().min(1.3).max(3.0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new weak word
export const CreateWeakWordSchema = z.object({
  userId: z.string().uuid(),
  imageTextId: z.string().uuid(),
  successRate: z.number().min(0).max(100).default(0),
  attemptCount: z.number().int().min(0).default(0),
  reviewInterval: z.number().int().min(1).default(1),
  easeFactor: z.number().min(1.3).max(3.0).default(2.5),
});

// Schema for updating a weak word
export const UpdateWeakWordSchema = z.object({
  successRate: z.number().min(0).max(100).optional(),
  attemptCount: z.number().int().min(0).optional(),
  lastAttempt: z.date().optional(),
  nextReview: z.date().optional(),
  reviewInterval: z.number().int().min(1).optional(),
  easeFactor: z.number().min(1.3).max(3.0).optional(),
});

// Type exports
export type CreateWeakWordInput = z.infer<typeof CreateWeakWordSchema>;
export type UpdateWeakWordInput = z.infer<typeof UpdateWeakWordSchema>;
