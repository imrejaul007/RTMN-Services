/**
 * HOJAI LLM Providers - Request Validation Schemas
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Zod validation schemas for API requests
 */

import { z } from 'zod';

// ============================================================================
// Message Schemas
// ============================================================================

/**
 * Message role enum
 */
export const MessageRoleSchema = z.enum(['system', 'user', 'assistant', 'function']);

/**
 * Function call schema
 */
export const FunctionCallSchema = z.object({
  name: z.string().min(1),
  arguments: z.string(),
});

/**
 * Message schema
 */
export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  name: z.string().optional(),
  functionCall: FunctionCallSchema.optional(),
});

// ============================================================================
// Chat Schemas
// ============================================================================

/**
 * Chat request schema
 */
export const ChatRequestSchema = z.object({
  provider: z.enum(['openai', 'anthropic']).optional(),
  messages: z.array(MessageSchema).min(1, 'At least one message is required'),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().max(200000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  functions: z.array(z.object({
    name: z.string().min(1),
    description: z.string(),
    parameters: z.object({
      type: z.literal('object'),
      properties: z.record(z.any()),
      required: z.array(z.string()).optional(),
    }),
  })).optional(),
  functionCall: z.string().optional(),
  taskType: z.enum([
    'chat',
    'analysis',
    'classification',
    'embedding',
    'reasoning',
    'creative',
    'code',
    'summarization',
    'extraction',
    'general',
  ]).optional(),
});

/**
 * Type inference from schema
 */
export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;

// ============================================================================
// Embed Schemas
// ============================================================================

/**
 * Embed request schema (single text)
 */
export const EmbedSingleRequestSchema = z.object({
  provider: z.enum(['openai', 'anthropic']).optional(),
  text: z.string().min(1, 'Text is required').max(100000),
  model: z.string().optional(),
});

/**
 * Embed request schema (batch)
 */
export const EmbedBatchRequestSchema = z.object({
  provider: z.enum(['openai', 'anthropic']).optional(),
  text: z.array(z.string().min(1).max(100000)).min(1, 'At least one text is required'),
  model: z.string().optional(),
});

/**
 * Unified embed request schema
 */
export const EmbedRequestSchema = z.union([EmbedSingleRequestSchema, EmbedBatchRequestSchema]);

/**
 * Type inference from schema
 */
export type EmbedRequestInput = z.infer<typeof EmbedRequestSchema>;

// ============================================================================
// Classify Schemas
// ============================================================================

/**
 * Classify request schema
 */
export const ClassifyRequestSchema = z.object({
  provider: z.enum(['openai', 'anthropic']).optional(),
  text: z.string().min(1, 'Text is required'),
  labels: z.array(z.string().min(1)).min(2, 'At least 2 labels are required'),
  temperature: z.number().min(0).max(2).optional(),
  model: z.string().optional(),
  instruction: z.string().max(1000).optional(),
});

/**
 * Type inference from schema
 */
export type ClassifyRequestInput = z.infer<typeof ClassifyRequestSchema>;

// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Validate request body against a schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Format Zod error into a user-friendly message
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join('; ');
}
