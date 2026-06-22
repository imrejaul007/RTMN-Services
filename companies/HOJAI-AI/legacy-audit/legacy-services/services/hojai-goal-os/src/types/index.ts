import { z } from 'zod';
export const GoalStatusSchema = z.enum(['active', 'completed', 'paused', 'cancelled']);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;
export const GoalSchema = z.object({ id: z.string().uuid(), title: z.string().min(1), description: z.string().optional(), status: GoalStatusSchema.default('active'), progress: z.number().min(0).max(100).default(0), dueDate: z.date().optional(), ownerId: z.string().optional(), teamId: z.string().optional(), createdAt: z.date().default(() => new Date()), updatedAt: z.date().default(() => new Date()) });
export type Goal = z.infer<typeof GoalSchema>;
export const OKRSchema = z.object({ id: z.string().uuid(), objective: z.string().min(1), keyResults: z.array(z.object({ id: z.string(), metric: z.string(), target: z.number(), current: z.number().default(0), unit: z.string().optional() })), goalId: z.string().uuid().optional(), createdAt: z.date().default(() => new Date()) });
export type OKR = z.infer<typeof OKRSchema>;
export function validateGoal(data: unknown): Goal { return GoalSchema.parse(data); }
export function validateOKR(data: unknown): OKR { return OKRSchema.parse(data); }
