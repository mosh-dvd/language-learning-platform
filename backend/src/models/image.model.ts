import { z } from 'zod';

// Image TypeScript interface
export interface Image {
  id: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string;
  createdAt: Date;
  createdBy: string;
}

// Zod validation schemas
export const ImageSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1),
  storagePath: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().positive().max(10485760), // 10MB max
  altText: z.string().optional(),
  createdAt: z.date(),
  createdBy: z.string().uuid(),
});

// Schema for creating a new image
export const CreateImageSchema = z.object({
  filename: z.string().min(1),
  storagePath: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().positive().max(10485760),
  altText: z.string().min(1, 'Alt text is required for accessibility'),
  createdBy: z.string().uuid(),
});

// Schema for image metadata
export const ImageMetadataSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().int().positive().max(10485760),
});

// Type exports
export type CreateImageInput = z.infer<typeof CreateImageSchema>;
export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;
