/**
 * HOJAI RAG Service - Zod Validators
 */

import { z } from 'zod';

export const documentCreateSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  namespace: z.string().max(100).optional(),
});

export const documentBatchSchema = z.object({
  documents: z.array(
    z.object({
      title: z.string().min(1).max(500),
      content: z.string().min(1),
      metadata: z.record(z.unknown()).optional(),
    })
  ).min(1).max(100),
  namespace: z.string().max(100).optional(),
});

export const searchRequestSchema = z.object({
  query: z.string().min(1).max(10000),
  limit: z.number().int().min(1).max(100).optional().default(10),
  namespace: z.string().max(100).optional(),
  min_score: z.number().min(0).max(1).optional(),
});

export const generateRequestSchema = z.object({
  query: z.string().min(1).max(10000),
  context: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    score: z.number(),
    metadata: z.record(z.unknown()).optional(),
  })).optional(),
  model: z.string().max(100).optional(),
  max_tokens: z.number().int().min(1).max(4096).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;
export type DocumentBatchInput = z.infer<typeof documentBatchSchema>;
export type SearchRequestInput = z.infer<typeof searchRequestSchema>;
export type GenerateRequestInput = z.infer<typeof generateRequestSchema>;
