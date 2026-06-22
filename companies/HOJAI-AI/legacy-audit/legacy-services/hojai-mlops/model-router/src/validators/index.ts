/**
 * Hojai Model Router Validators (Zod Schemas)
 */

import { z } from 'zod';

// Task type enum
export const taskTypeSchema = z.enum(['chat', 'embed', 'classify', 'complete']);

// Route options schema
export const routeOptionsSchema = z.object({
  maxTokens: z.number().int().min(1).max(128000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// Route request schema
export const routeRequestSchema = z.object({
  task: taskTypeSchema,
  input: z.string().min(1, 'Input is required').max(100000, 'Input too long (max 100k chars)'),
  options: routeOptionsSchema.optional(),
});

// Fallback request schema
export const fallbackRequestSchema = z.object({
  originalRequest: routeRequestSchema,
  failedProvider: z.enum(['openai', 'anthropic', 'google', 'meta']),
  error: z.string().min(1),
  attempt: z.number().int().min(1).max(5).optional(),
});

// Route request type
export type RouteRequestInput = z.infer<typeof routeRequestSchema>;
export type FallbackRequestInput = z.infer<typeof fallbackRequestSchema>;
export type RouteOptionsInput = z.infer<typeof routeOptionsSchema>;
