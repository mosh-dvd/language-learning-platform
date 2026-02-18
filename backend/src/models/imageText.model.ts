import { z } from 'zod';

// ImageText TypeScript interface
export interface ImageText {
  id: string;
  imageId: string;
  languageCode: string;
  text: string;
  version: number;
  createdAt: Date;
}

// Zod validation schemas
export const ImageTextSchema = z.object({
  id: z.string().uuid(),
  imageId: z.string().uuid(),
  languageCode: z.string().length(2).or(z.string().regex(/^[a-z]{2}-[A-Z]{2}$/)),
  text: z.string().min(1).refine(
    (val) => {
      // Validate that text is not empty and contains valid Unicode characters
      const trimmed = val.trim();
      return trimmed.length > 0;
    },
    { message: 'Text must not be empty or contain only whitespace' }
  ),
  version: z.number().int().positive(),
  createdAt: z.date(),
});

// Schema for creating a new image text
export const CreateImageTextSchema = z.object({
  imageId: z.string().uuid(),
  languageCode: z.string().length(2).or(z.string().regex(/^[a-z]{2}-[A-Z]{2}$/)),
  text: z.string().min(1).refine(
    (val) => {
      const trimmed = val.trim();
      return trimmed.length > 0;
    },
    { message: 'Text must not be empty or contain only whitespace' }
  ),
});

// Schema for updating image text
export const UpdateImageTextSchema = z.object({
  text: z.string().min(1).refine(
    (val) => {
      const trimmed = val.trim();
      return trimmed.length > 0;
    },
    { message: 'Text must not be empty or contain only whitespace' }
  ),
});

// Type exports
export type CreateImageTextInput = z.infer<typeof CreateImageTextSchema>;
export type UpdateImageTextInput = z.infer<typeof UpdateImageTextSchema>;
