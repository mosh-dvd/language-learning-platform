import { z } from 'zod';

// PasswordResetToken TypeScript interface
export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

// Zod validation schemas
export const PasswordResetTokenSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
  used: z.boolean(),
  createdAt: z.date(),
});

// Schema for creating a password reset token
export const CreatePasswordResetTokenSchema = z.object({
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
});

// Type exports
export type CreatePasswordResetTokenInput = z.infer<typeof CreatePasswordResetTokenSchema>;
