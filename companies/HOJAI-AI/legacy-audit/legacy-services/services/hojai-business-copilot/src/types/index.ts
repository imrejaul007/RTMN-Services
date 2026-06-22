// Query types
export interface CopilotQuery {
  query: string;
  interfaces?: ('memory' | 'twin' | 'intelligence' | 'agent' | 'workflow' | 'execution' | 'simulation')[];
  context?: {
    userId?: string;
    entityId?: string;
    entityType?: string;
    tenantId?: string;
  };
}

export interface CopilotResponse {
  intent: string;
  usedInterfaces: string[];
  results: Record<string, unknown>;
  synthesizedResponse: string;
  confidence: number;
  timestamp: string;
}

// Memory types
export interface MemoryContext {
  tier: 'l1' | 'l2' | 'l3' | 'l4' | 'l5';
  type: 'fact' | 'preference' | 'context' | 'skill' | 'relationship';
  content: string;
  importance: number;
}

export interface MemoryEntry {
  id: string;
  userId: string;
  tenantId: string;
  context: MemoryContext;
  createdAt: string;
  updatedAt: string;
}

// Twin types
export interface TwinSummary {
  type: 'employee' | 'customer' | 'company' | 'merchant';
  id: string;
  summary: string;
  predictions: Record<string, unknown>;
  insights: string[];
}

export interface TwinProfile {
  twinType: TwinSummary['type'];
  twinId: string;
  summary: string;
  predictions: Record<string, unknown>;
  insights: string[];
  metadata: Record<string, unknown>;
}

// Intelligence types
export interface GraphEntity {
  entityType: string;
  entityId: string;
  properties: Record<string, unknown>;
  relationships: Array<{ type: string; target: string; properties: Record<string, unknown> }>;
}

export interface IntelligenceInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'recommendation' | 'prediction';
  confidence: number;
  description: string;
  relatedEntities: string[];
  createdAt: string;
}

// Agent types
export interface AgentExecution {
  agentId: string;
  agentName: string;
  task: string;
  result: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
}

export interface AgentTask {
  id: string;
  agentId: string;
  task: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  status: AgentExecution['status'];
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// Workflow types
export interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  lastRun: string;
  successRate: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    id: string;
    name: string;
    action: string;
    parameters: Record<string, unknown>;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Execution types
export interface TaskSummary {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  dueDate?: string;
  projectId?: string;
}

export interface ExecutionContext {
  userId: string;
  tenantId: string;
  entityId?: string;
  entityType?: string;
  parameters: Record<string, unknown>;
}

// Simulation types
export interface SimulationResult {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: {
    outcome: string;
    confidence: number;
    distribution: Record<string, number>;
    insights: string[];
  };
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  scope: 'company' | 'team' | 'product' | 'customer';
  createdAt: string;
}

// What-If Scenario
export interface WhatIfScenario {
  name: string;
  parameters: Record<string, number>;
  scope: 'company' | 'team' | 'product' | 'customer';
}

// Unified Copilot Interface types
export interface InterfaceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  lastChecked: string;
  responseTime?: number;
  errorCount?: number;
}

export interface OrchestrationResult {
  queryId: string;
  interfaces: InterfaceHealth[];
  results: Record<string, unknown>;
  synthesis: string;
  confidence: number;
  executionTime: number;
}

// API Response
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string | any };
  meta: { timestamp: string; requestId: string };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta: { timestamp: string; requestId: string };
}

export function createResponse<T>(data: T, options?: { tenantId?: string }): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  };
}

export function createErrorResponse(code: string, message: string | { error: any }): APIResponse<null> {
  return {
    success: false,
    error: { code, message },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number }
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    },
  };
}

// Validation schemas using Zod
export const CopilotQuerySchema = {
  query: () => ({ type: 'string' as const, minLength: 1 }),
  interfaces: () => ({
    type: ['memory', 'twin', 'intelligence', 'agent', 'workflow', 'execution', 'simulation'] as const,
  }),
  context: () => ({
    userId: { type: 'string' as const, optional: true },
    entityId: { type: 'string' as const, optional: true },
    entityType: { type: 'string' as const, optional: true },
    tenantId: { type: 'string' as const, optional: true },
  }),
};
