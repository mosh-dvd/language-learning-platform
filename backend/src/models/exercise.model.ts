import { z } from 'zod';

// Exercise type enum
export type ExerciseType = 'image_text' | 'matching_pairs' | 'fill_in_blank' | 'listening_comprehension';

// Metadata schemas for different exercise types
export const MatchingPairsMetadataSchema = z.object({
  pairs: z.array(z.object({
    imageId: z.string().uuid(),
    textId: z.string().uuid(),
  })).min(2),
});

export const FillInBlankMetadataSchema = z.object({
  sentence: z.string().min(1),
  blankIndex: z.number().int().nonnegative(),
  correctAnswer: z.string().min(1),
  distractors: z.array(z.string().min(1)).min(2),
});

export const ListeningComprehensionMetadataSchema = z.object({
  audioTextId: z.string().uuid(),
  imageOptions: z.array(z.string().uuid()).min(2),
  correctImageIndex: z.number().int().nonnegative(),
});

export const ImageTextMetadataSchema = z.object({});

// Union type for all metadata
export const ExerciseMetadataSchema = z.union([
  MatchingPairsMetadataSchema,
  FillInBlankMetadataSchema,
  ListeningComprehensionMetadataSchema,
  ImageTextMetadataSchema,
]);

// Exercise TypeScript interface
export interface Exercise {
  id: string;
  lessonId: string;
  imageId: string;
  exerciseType: ExerciseType;
  orderIndex: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Zod validation schemas
export const ExerciseSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  imageId: z.string().uuid(),
  exerciseType: z.enum(['image_text', 'matching_pairs', 'fill_in_blank', 'listening_comprehension']),
  orderIndex: z.number().int().nonnegative(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
});

// Schema for creating a new exercise
export const CreateExerciseSchema = z.object({
  lessonId: z.string().uuid(),
  imageId: z.string().uuid(),
  exerciseType: z.enum(['image_text', 'matching_pairs', 'fill_in_blank', 'listening_comprehension']),
  orderIndex: z.number().int().nonnegative(),
  metadata: z.record(z.any()).optional(),
});

// Schema for updating an exercise
export const UpdateExerciseSchema = z.object({
  imageId: z.string().uuid().optional(),
  exerciseType: z.enum(['image_text', 'matching_pairs', 'fill_in_blank', 'listening_comprehension']).optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
});

// Schema for reordering exercises
export const ReorderExercisesSchema = z.object({
  exerciseIds: z.array(z.string().uuid()).min(1),
});

// Type exports
export type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof UpdateExerciseSchema>;
export type ReorderExercisesInput = z.infer<typeof ReorderExercisesSchema>;
export type MatchingPairsMetadata = z.infer<typeof MatchingPairsMetadataSchema>;
export type FillInBlankMetadata = z.infer<typeof FillInBlankMetadataSchema>;
export type ListeningComprehensionMetadata = z.infer<typeof ListeningComprehensionMetadataSchema>;
export type ImageTextMetadata = z.infer<typeof ImageTextMetadataSchema>;
