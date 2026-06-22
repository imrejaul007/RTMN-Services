import { z } from 'zod';
export const CustomerSchema = z.object({ id: z.string().uuid(), email: z.string().email(), name: z.string(), phone: z.string().optional(), company: z.string().optional(), lifecycleStage: z.enum(['lead', 'prospect', 'customer', 'champion', 'churned']), score: z.number().min(0).max(100).default(50), tags: z.array(z.string()).default([]), createdAt: z.date().default(() => new Date()) });
export type Customer = z.infer<typeof CustomerSchema>;
export const InteractionSchema = z.object({ id: z.string().uuid(), customerId: z.string().uuid(), type: z.enum(['email', 'call', 'meeting', 'support', 'purchase']), content: z.string(), sentiment: z.enum(['positive', 'neutral', 'negative']).optional(), createdAt: z.date().default(() => new Date()) });
export type Interaction = z.infer<typeof InteractionSchema>;
export function validateCustomer(data: unknown): Customer { return CustomerSchema.parse(data); }
export function validateInteraction(data: unknown): Interaction { return InteractionSchema.parse(data); }
