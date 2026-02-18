import { z } from 'zod';
import { AchievementSchema } from './achievement.model.js';

export const UserAchievementSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  achievementId: z.string().uuid(),
  achievement: AchievementSchema.optional(),
  earnedAt: z.date(),
});

export type UserAchievement = z.infer<typeof UserAchievementSchema>;

export interface CreateUserAchievementInput {
  userId: string;
  achievementId: string;
}
