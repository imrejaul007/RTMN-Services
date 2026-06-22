/**
 * Hojai Model Registry Validators (Zod Schemas)
 */

import { z } from 'zod';

// Model name pattern: lowercase, alphanumeric with hyphens/underscores
const modelNamePattern = /^[a-z0-9][a-z0-9_-]*$/;

// Version pattern: semver-like (e.g., 1.0.0, 1.0.0-beta.1)
const versionPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

// Register model request schema
export const registerModelSchema = z.object({
  name: z
    .string()
    .min(1, 'Model name is required')
    .max(128, 'Model name too long (max 128 chars)')
    .regex(modelNamePattern, 'Model name must be lowercase alphanumeric with hyphens/underscores'),
  version: z
    .string()
    .min(1, 'Version is required')
    .max(64, 'Version too long (max 64 chars)')
    .regex(versionPattern, 'Version must be semver-like (e.g., 1.0.0)'),
  description: z.string().max(1024, 'Description too long (max 1024 chars)').optional(),
  metrics: z.record(z.number()).optional(),
  stage: z.enum(['dev', 'staging', 'production']).default('dev'),
  metadata: z.record(z.unknown()).optional(),
});

// Update stage request schema
export const updateStageSchema = z.object({
  stage: z.enum(['dev', 'staging', 'production'], {
    errorMap: () => ({ message: 'Stage must be one of: dev, staging, production' }),
  }),
});

// Model name param schema
export const modelNameParamSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(128)
    .regex(modelNamePattern, 'Invalid model name format'),
});

// Version param schema
export const versionParamSchema = z.object({
  name: z.string().min(1).max(128).regex(modelNamePattern),
  version: z.string().min(1).max(64).regex(versionPattern),
});

// Type exports for use in routes
export type RegisterModelInput = z.infer<typeof registerModelSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type ModelNameParam = z.infer<typeof modelNameParamSchema>;
export type VersionParam = z.infer<typeof versionParamSchema>;
