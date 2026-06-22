/**
 * SUTAR Flow OS - Type Definitions
 * Workflow orchestration, execution, and AI-powered optimization
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export enum FlowStepType {
  ACTION = 'action',
  CONDITION = 'condition',
  WAIT = 'wait',
  NOTIFY = 'notify',
  TRANSFORM = 'transform'
}

export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT = 'event',
  WEBHOOK = 'webhook',
  CRON = 'cron'
}

export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

// ============================================================================
// FLOW DEFINITION TYPES
// ============================================================================

export interface FlowStepConfig {
  action?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  condition?: string;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value?: unknown;
  duration?: number;
  template?: string;
  recipients?: string[];
  channel?: 'email' | 'sms' | 'push' | 'webhook';
  transform?: Record<string, unknown>;
  retryCount?: number;
  retryDelay?: number;
}

export interface FlowStep {
  id: string;
  name: string;
  type: FlowStepType;
  config: FlowStepConfig;
  nextSteps: string[];
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoff: 'linear' | 'exponential';
  };
}

export interface FlowTrigger {
  type: TriggerType;
  config: {
    cron?: string;
    schedule?: string;
    eventType?: string;
    webhookPath?: string;
    conditions?: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
  };
}

export interface FlowDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  version: number;
  steps: FlowStep[];
  triggers: FlowTrigger[];
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    defaultValue?: unknown;
  }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// FLOW RUN TYPES
// ============================================================================

export interface FlowRun {
  id: string;
  tenantId: string;
  flowId: string;
  status: RunStatus;
  currentStepId?: string;
  context: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  triggeredBy: string;
  triggeredById?: string;
  createdAt: Date;
}

export interface FlowStepExecution {
  id: string;
  tenantId: string;
  runId: string;
  flowId: string;
  stepId: string;
  stepName: string;
  status: StepStatus;
  input: unknown;
  output?: unknown;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}

// ============================================================================
// FLOW TRIGGER TYPES
// ============================================================================

export interface FlowTriggerRecord {
  id: string;
  tenantId: string;
  flowId: string;
  type: TriggerType;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  lastTriggeredAt?: Date;
  createdAt: Date;
}

// ============================================================================
// FLOW ANALYTICS TYPES
// ============================================================================

export interface StepAnalytics {
  stepId: string;
  avgDuration: number;
  failureRate: number;
  avgRetries: number;
  totalExecutions: number;
}

export interface FlowAnalytics {
  id: string;
  tenantId: string;
  flowId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  avgDuration: number;
  successRate: number;
  stepAnalytics: StepAnalytics[];
  recordedAt: Date;
}

// ============================================================================
// BOTTLENECK TYPES
// ============================================================================

export interface FlowBottleneck {
  id: string;
  tenantId: string;
  flowId: string;
  stepId: string;
  description: string;
  avgWaitTime: number;
  failureRate: number;
  suggestion: string;
  createdAt: Date;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const FlowStepConfigSchema = z.object({
  action: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  condition: z.string().optional(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']).optional(),
  value: z.any().optional(),
  duration: z.number().optional(),
  template: z.string().optional(),
  recipients: z.array(z.string()).optional(),
  channel: z.enum(['email', 'sms', 'push', 'webhook']).optional(),
  transform: z.record(z.any()).optional(),
  retryCount: z.number().optional(),
  retryDelay: z.number().optional()
});

export const FlowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(FlowStepType),
  config: FlowStepConfigSchema,
  nextSteps: z.array(z.string()).default([]),
  timeout: z.number().optional(),
  retryPolicy: z.object({
    maxRetries: z.number(),
    retryDelay: z.number(),
    backoff: z.enum(['linear', 'exponential'])
  }).optional()
});

export const FlowTriggerSchema = z.object({
  type: z.nativeEnum(TriggerType),
  config: z.object({
    cron: z.string().optional(),
    schedule: z.string().optional(),
    eventType: z.string().optional(),
    webhookPath: z.string().optional(),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.any()
    })).optional()
  })
});

export const CreateFlowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  steps: z.array(FlowStepSchema).min(1),
  triggers: z.array(FlowTriggerSchema).default([]),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    defaultValue: z.any().optional()
  })).default([])
});

export const UpdateFlowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  steps: z.array(FlowStepSchema).min(1).optional(),
  triggers: z.array(FlowTriggerSchema).optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    defaultValue: z.any().optional()
  })).optional()
});

export const RunFlowSchema = z.object({
  context: z.record(z.any()).optional(),
  triggeredBy: z.string().default('manual'),
  triggeredById: z.string().optional()
});

export const CreateTriggerSchema = z.object({
  flowId: z.string(),
  type: z.nativeEnum(TriggerType),
  name: z.string().min(1).max(255),
  config: z.record(z.any()),
  isActive: z.boolean().default(true)
});

export const UpdateTriggerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  config: z.record(z.any()).optional(),
  isActive: z.boolean().optional()
});

export const AISuggestSchema = z.object({
  flowId: z.string().optional(),
  description: z.string().optional(),
  currentSteps: z.array(z.any()).optional(),
  goals: z.array(z.string()).optional()
});

export const AIOptimizeSchema = z.object({
  flowId: z.string(),
  options: z.object({
    reduceSteps: z.boolean().default(true),
    parallelize: z.boolean().default(true),
    addErrorHandling: z.boolean().default(true),
    optimizeOrder: z.boolean().default(true),
    suggestCaching: z.boolean().default(false)
  }).optional()
});

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta: {
    timestamp: string;
    requestId: string;
    tenantId?: string;
    latencyMs?: number;
  };
}

export function createResponse<T>(data: T, options?: { tenantId?: string }): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      tenantId: options?.tenantId
    }
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIResponse<null> {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  };
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  totalFlows: number;
  activeFlows: number;
  totalRuns: number;
  runningRuns: number;
  completedRuns: number;
  failedRuns: number;
  avgSuccessRate: number;
  avgExecutionTime: number;
  topFlows: Array<{
    flowId: string;
    name: string;
    runCount: number;
    successRate: number;
  }>;
  recentRuns: Array<{
    id: string;
    flowId: string;
    flowName: string;
    status: RunStatus;
    startedAt: Date;
  }>;
}

export interface WorkflowAnalytics {
  totalFlows: number;
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  flowsByStatus: Record<string, number>;
  runsByDay: Array<{
    date: string;
    total: number;
    completed: number;
    failed: number;
  }>;
  topBottlenecks: FlowBottleneck[];
  optimizationSuggestions: Array<{
    flowId: string;
    type: string;
    description: string;
    potentialSavings: string;
  }>;
}

// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type CreateFlowInput = z.infer<typeof CreateFlowSchema>;
export type UpdateFlowInput = z.infer<typeof UpdateFlowSchema>;
export type RunFlowInput = z.infer<typeof RunFlowSchema>;
export type CreateTriggerInput = z.infer<typeof CreateTriggerSchema>;
export type UpdateTriggerInput = z.infer<typeof UpdateTriggerSchema>;
export type AISuggestInput = z.infer<typeof AISuggestSchema>;
export type AIOptimizeInput = z.infer<typeof AIOptimizeSchema>;
