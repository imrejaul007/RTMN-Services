/**
 * Feature Store Validators using Zod
 */

import { z } from 'zod';

/**
 * Validate feature value type
 */
const featureValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
]);

/**
 * Single feature input schema
 */
const featureInputSchema = z.object({
  name: z.string().min(1).max(256),
  value: featureValueSchema,
});

/**
 * Store features request schema
 */
export const storeFeaturesSchema = z.object({
  features: z.array(featureInputSchema).min(1).max(100),
});

/**
 * Batch get request schema
 */
export const batchGetSchema = z.object({
  entity_ids: z.array(z.string().min(1)).min(1).max(100),
  feature_names: z.array(z.string().min(1)).optional(),
});

/**
 * Entity ID parameter schema
 */
export const entityIdSchema = z.string().min(1).max(256);

/**
 * Feature name parameter schema
 */
export const featureNameSchema = z.string().min(1).max(256);

/**
 * Infer types from schemas
 */
export type StoreFeaturesInput = z.infer<typeof storeFeaturesSchema>;
export type BatchGetInput = z.infer<typeof batchGetSchema>;
