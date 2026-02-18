import { z } from 'zod';

// PronunciationScore TypeScript interface
export interface PronunciationScore {
  id: string;
  userId: string;
  exerciseId: string;
  score: number;
  recognizedText: string;
  createdAt: Date;
}

// Zod validation schemas
export const PronunciationScoreSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  score: z.number().min(0).max(100),
  recognizedText: z.string(),
  createdAt: z.date(),
});

// Schema for creating a new pronunciation score
export const CreatePronunciationScoreSchema = z.object({
  userId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  score: z.number().min(0).max(100),
  recognizedText: z.string(),
});

// Type exports
export type CreatePronunciationScoreInput = z.infer<typeof CreatePronunciationScoreSchema>;
