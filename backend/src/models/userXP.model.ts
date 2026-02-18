import { z } from 'zod';

export const UserXPSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().optional(),
  createdAt: z.date(),
});

export type UserXP = z.infer<typeof UserXPSchema>;

export interface CreateUserXPInput {
  userId: string;
  amount: number;
  reason?: string;
}
