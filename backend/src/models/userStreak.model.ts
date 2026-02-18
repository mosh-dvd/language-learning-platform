import { z } from 'zod';

export const UserStreakSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  lastActivityDate: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserStreak = z.infer<typeof UserStreakSchema>;

export interface CreateUserStreakInput {
  userId: string;
}

export interface UpdateUserStreakInput {
  currentStreak?: number;
  longestStreak?: number;
  lastActivityDate?: Date;
}
