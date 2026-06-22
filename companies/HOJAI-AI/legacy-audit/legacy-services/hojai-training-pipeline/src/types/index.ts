/**
 * HOJAI Training Pipeline - Type Definitions
 * Learn from: Chat conversations, User actions, Corrections, Feedback loops
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export enum LearningSource {
  CHAT = 'chat',
  SIGNAL = 'signal',
  EVENT = 'event',
  CONVERSION = 'conversion',
  CORRECTION = 'correction',
  FEEDBACK = 'feedback'
}

export enum LearningType {
  RESPONSE_PATTERN = 'response_pattern',
  INTENT = 'intent',
  CONTEXT = 'context',
  PREFERENCE = 'preference',
  INTEREST = 'interest',
  NEED = 'need',
  SUCCESS = 'success',
  FAILURE = 'failure',
  TOPIC = 'topic',
  QUALITY = 'quality'
}

export enum LearningStage {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  MODEL = 'model'
}

export enum LearningStatus {
  CAPTURED = 'captured',
  PROCESSING = 'processing',
  LEARNED = 'learned',
  DEPLOYED = 'deployed',
  ARCHIVED = 'archived'
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const ChatMessageSchema = z.object({
  messageId: z.string().min(1),
  conversationId: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
});

export const SignalEventSchema = z.object({
  signalId: z.string().min(1),
  type: z.enum(['click', 'view', 'search', 'action', 'conversion', 'error']),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime()
});

export const CorrectionSchema = z.object({
  correctionId: z.string().min(1),
  originalContent: z.string().min(1),
  correctedContent: z.string().min(1),
  reason: z.string().optional(),
  userId: z.string().optional(),
  timestamp: z.string().datetime(),
  context: z.record(z.unknown()).optional()
});

export const FeedbackSchema = z.object({
  feedbackId: z.string().min(1),
  type: z.enum(['positive', 'negative', 'rating', 'correction']),
  score: z.number().min(1).max(5).optional(),
  content: z.string().optional(),
  userId: z.string().optional(),
  itemType: z.string().optional(),
  itemId: z.string().optional(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
});

// Learning payload schema
export const LearningPayloadSchema = z.object({
  source: z.nativeEnum(LearningSource),
  sourceId: z.string().min(1),
  type: z.nativeEnum(LearningType),
  content: z.record(z.unknown()),
  confidence: z.number().min(0).max(1).default(0.5),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.string().datetime().optional()
});

// Query schemas
export const QueryLearningSchema = z.object({
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  type: z.nativeEnum(LearningType).optional(),
  source: z.nativeEnum(LearningSource).optional(),
  stage: z.nativeEnum(LearningStage).optional(),
  status: z.nativeEnum(LearningStatus).optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0)
});

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface SignalEvent {
  signalId: string;
  type: 'click' | 'view' | 'search' | 'action' | 'conversion' | 'error';
  tenantId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

export interface Correction {
  correctionId: string;
  originalContent: string;
  correctedContent: string;
  reason?: string;
  tenantId?: string;
  userId?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface Feedback {
  feedbackId: string;
  type: 'positive' | 'negative' | 'rating' | 'correction';
  score?: number;
  content?: string;
  tenantId?: string;
  userId?: string;
  itemType?: string;
  itemId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface LearningPayload {
  source: LearningSource;
  sourceId: string;
  type: LearningType;
  content: Record<string, unknown>;
  confidence: number;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
}

export interface LearnedPattern {
  id: string;
  tenantId?: string;
  userId?: string;
  source: LearningSource;
  type: LearningType;
  stage: LearningStage;
  status: LearningStatus;
  content: Record<string, unknown>;
  confidence: number;
  frequency: number;
  lastUpdated: string;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface QueryLearning {
  tenantId?: string;
  userId?: string;
  type?: LearningType;
  source?: LearningSource;
  stage?: LearningStage;
  status?: LearningStatus;
  limit?: number;
  offset?: number;
}

export interface TrainingBatch {
  batchId: string;
  patterns: LearnedPattern[];
  startTime: string;
  endTime: string;
  statistics: BatchStatistics;
}

export interface BatchStatistics {
  totalPatterns: number;
  byType: Partial<Record<LearningType, number>>;
  bySource: Partial<Record<LearningSource, number>>;
  highConfidenceCount: number;
  archivedCount: number;
}

export interface LearningInsights {
  totalPatterns: number;
  byType: Record<LearningType, number>;
  bySource: Record<LearningSource, number>;
  topPatterns: LearnedPattern[];
  recentLearning: LearnedPattern[];
  accuracy: number;
  improvementRate: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface LearningResponse {
  patternId: string;
  status: LearningStatus;
  message: string;
}

export interface BatchResponse {
  batchId: string;
  patternsProcessed: number;
  status: 'completed' | 'failed' | 'partial';
  errors?: string[];
}

// ============================================================================
// CONTEXT TYPES (for integration with HOJAI Core)
// ============================================================================

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
  permissions?: string[];
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta: ResponseMeta;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  tenantId?: string;
  latencyMs?: number;
}
