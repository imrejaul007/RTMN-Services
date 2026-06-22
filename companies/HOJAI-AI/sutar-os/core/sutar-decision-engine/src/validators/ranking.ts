/**
 * SUTAR Decision Engine - Zod Validators for Multi-Option Ranking
 *
 * Used by POST /api/v1/rank (Phase B.2).
 */

import { z } from 'zod';

/**
 * A single option to be ranked. At least one of cost/time/risk/trust
 * should be provided across the whole options array, otherwise there
 * is nothing to rank by.
 */
export const RankableOptionSchema = z.object({
  id: z.string().min(1, 'option id is required').max(100),
  name: z.string().min(1, 'option name is required').max(200),
  cost: z.number().finite().nonnegative().optional(),
  time: z.number().finite().nonnegative().optional(),
  risk: z.number().finite().min(0).max(100).optional(),
  trust: z.number().finite().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Optional weights for the four ranking dimensions.
 * If provided, they will be normalized to sum=1 across the
 * dimensions that actually have data.
 */
export const RankingWeightsSchema = z.object({
  cost: z.number().min(0).max(1).optional(),
  time: z.number().min(0).max(1).optional(),
  risk: z.number().min(0).max(1).optional(),
  trust: z.number().min(0).max(1).optional(),
}).optional();

/**
 * Full request body for POST /api/v1/rank.
 * At least 2 options required (ranking 1 option is meaningless).
 */
export const RankRequestSchema = z.object({
  options: z.array(RankableOptionSchema).min(2, 'at least 2 options required'),
  weights: RankingWeightsSchema,
});

// Type exports
export type RankableOptionInput = z.infer<typeof RankableOptionSchema>;
export type RankRequestInput = z.infer<typeof RankRequestSchema>;
