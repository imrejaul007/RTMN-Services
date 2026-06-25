/**
 * FlowOS Module
 *
 * Wraps the flow-orchestrator (port 4244) via Hub /api/foundation/flow-orchestrator/* routes.
 * Plans = workflows. Executions = runs. Templates = reusable plan blueprints.
 */

import type { HojaiConfig } from './config.js';
import { request, type AuthState, type HojaiClientConfig } from './utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FlowStepType =
  | 'skill' | 'agent' | 'http' | 'delay' | 'condition'
  | 'parallel' | 'fan-out' | 'fan-in' | 'loop' | 'merge'
  | 'transform' | 'log' | 'notification' | 'approval';

export interface FlowStep {
  id?: string;
  name: string;
  type: FlowStepType;
  config?: Record<string, unknown>;
  then?: FlowStep[];
  else?: FlowStep[];
  branches?: { name?: string; steps: FlowStep[] }[];
  to?: FlowStep[];
  until?: FlowStep[];
  maxIterations?: number;
}

export interface FlowPlan {
  id: string;
  name: string;
  description?: string;
  steps: FlowStep[];
  version: number;
  createdAt: string;
  updatedAt?: string;
}

export interface FlowExecution {
  executionId?: string;
  id?: string;
  planId: string | null;
  planName: string;
  twinId?: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  steps?: Record<string, unknown>;
}

export interface CreateFlowRequest {
  name: string;
  description?: string;
  steps: FlowStep[];
}

export interface RunFlowRequest {
  inputs?: Record<string, unknown>;
  twinId?: string;
}

// ---------------------------------------------------------------------------
// Flow client
// ---------------------------------------------------------------------------

export class FlowClient {
  private readonly cfg: HojaiClientConfig;
  constructor(config: HojaiConfig, authState: AuthState) {
    this.cfg = { ...config, authState };
  }

  async create(input: CreateFlowRequest): Promise<FlowPlan> {
    return request<FlowPlan>(this.cfg, 'POST', '/api/foundation/flow-orchestrator/plans', {
      name: input.name,
      description: input.description,
      steps: input.steps.map((s, i) => ({ id: s.id ?? `step-${i}`, ...s }))
    });
  }

  async get(id: string): Promise<FlowPlan> {
    return request<FlowPlan>(this.cfg, 'GET', `/api/foundation/flow-orchestrator/plans/${encodeURIComponent(id)}`);
  }

  async list(): Promise<FlowPlan[]> {
    const res = await request<{ plans: FlowPlan[] }>(this.cfg, 'GET', '/api/foundation/flow-orchestrator/plans');
    return res.plans ?? [];
  }

  async run(id: string, input?: RunFlowRequest): Promise<{ executionId: string; status: string }> {
    return request(this.cfg, 'POST', '/api/foundation/flow-orchestrator/executions', {
      planId: id, context: input?.inputs, twinId: input?.twinId
    });
  }

  async runSync(id: string, input?: RunFlowRequest): Promise<FlowExecution> {
    return request<FlowExecution>(this.cfg, 'POST', '/api/foundation/flow-orchestrator/executions/sync', {
      planId: id, context: input?.inputs, twinId: input?.twinId
    });
  }

  async getRun(executionId: string): Promise<FlowExecution> {
    return request<FlowExecution>(this.cfg, 'GET', `/api/foundation/flow-orchestrator/executions/${encodeURIComponent(executionId)}`);
  }

  async listRuns(): Promise<FlowExecution[]> {
    const res = await request<{ executions: FlowExecution[] }>(this.cfg, 'GET', '/api/foundation/flow-orchestrator/executions');
    return res.executions ?? [];
  }

  async feedback(executionId: string, outcome: 'success' | 'partial' | 'failure', notes?: string): Promise<void> {
    return request<void>(this.cfg, 'POST', `/api/foundation/flow-orchestrator/executions/${encodeURIComponent(executionId)}/feedback`, { outcome, notes });
  }
}
