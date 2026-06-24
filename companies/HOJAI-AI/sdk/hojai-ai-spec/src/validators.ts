/**
 * Validators — Zod-based, with a friendly error format.
 */

import { z } from 'zod';
import { ManifestSchema, CapabilitySchema, type Manifest, type Capability } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string; code: string }>;
}

function formatZodError(error: z.ZodError): ValidationResult['errors'] {
  return error.issues.map(i => ({
    path: i.path.join('.') || '(root)',
    message: i.message,
    code: i.code
  }));
}

export function validateManifestData(data: unknown): ValidationResult {
  const result = ManifestSchema.safeParse(data);
  if (result.success) return { valid: true, errors: [] };
  return { valid: false, errors: formatZodError(result.error) };
}

export function validateCapabilityData(data: unknown): ValidationResult {
  const result = CapabilitySchema.safeParse(data);
  if (result.success) return { valid: true, errors: [] };
  return { valid: false, errors: formatZodError(result.error) };
}
