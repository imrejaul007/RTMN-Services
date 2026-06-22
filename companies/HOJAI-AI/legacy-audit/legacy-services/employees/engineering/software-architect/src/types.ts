/**
 * HOJAI Engineering Agent - Type Definitions
 * Version: 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// API Types
// ============================================================================

export interface ChatRequest {
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  meta: {
    requestId: string;
    timestamp: string;
    agent: string;
    responseTimeMs?: number;
  };
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId: string;
    timestamp: string;
    agent: string;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  context: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ChatRequestType = z.infer<typeof ChatRequestSchema>;
