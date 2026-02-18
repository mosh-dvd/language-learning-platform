import { z } from 'zod';

export const AchievementSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  criteria: z.record(z.any()),
  createdAt: z.date(),
});

export type Achievement = z.infer<typeof AchievementSchema>;

export interface CreateAchievementInput {
  name: string;
  description?: string;
  iconUrl?: string;
  criteria: Record<string, any>;
}
