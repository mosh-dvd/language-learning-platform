import { z } from 'zod';

export const CachedAudioSchema = z.object({
  id: z.string().uuid(),
  imageTextId: z.string().uuid().nullable(),
  languageCode: z.string().min(2).max(10),
  textHash: z.string().length(64),
  audioUrl: z.string().url(),
  provider: z.enum(['web_speech_api', 'google_cloud', 'aws_polly', 'azure_speech']),
  createdAt: z.date(),
  lastAccessed: z.date(),
  accessCount: z.number().int().min(0),
});

export const CreateCachedAudioSchema = z.object({
  imageTextId: z.string().uuid().nullable().optional(),
  languageCode: z.string().min(2).max(10),
  textHash: z.string().length(64),
  audioUrl: z.string().url(),
  provider: z.enum(['web_speech_api', 'google_cloud', 'aws_polly', 'azure_speech']),
});

export type CachedAudio = z.infer<typeof CachedAudioSchema>;
export type CreateCachedAudio = z.infer<typeof CreateCachedAudioSchema>;
