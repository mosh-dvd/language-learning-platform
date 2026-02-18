import { z } from 'zod';

// User TypeScript interface
export interface User {
  id: string;
  email: string;
  passwordHash?: string; // Optional for OAuth users
  name?: string;
  avatarUrl?: string;
  nativeLanguage: string;
  oauthProvider?: 'google' | 'facebook';
  oauthId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Zod validation schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  passwordHash: z.string().min(1).optional(),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  nativeLanguage: z.string().length(2).or(z.string().regex(/^[a-z]{2}-[A-Z]{2}$/)), // e.g., "en" or "en-US"
  oauthProvider: z.enum(['google', 'facebook']).optional(),
  oauthId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a new user with email/password
export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  nativeLanguage: z.string().length(2).or(z.string().regex(/^[a-z]{2}-[A-Z]{2}$/)),
});

// Schema for creating a user via OAuth
export const CreateOAuthUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  nativeLanguage: z.string().length(2).or(z.string().regex(/^[a-z]{2}-[A-Z]{2}$/)),
  oauthProvider: z.enum(['google', 'facebook']),
  oauthId: z.string(),
});

// Schema for updating a user profile
export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  nativeLanguage: z.string().length(2).or(z.string().regex(/^[a-z]{2}-[A-Z]{2}$/)).optional(),
});

// Schema for login
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Type exports
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type CreateOAuthUserInput = z.infer<typeof CreateOAuthUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
