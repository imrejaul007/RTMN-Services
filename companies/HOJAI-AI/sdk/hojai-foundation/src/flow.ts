/**
 * FlowOS Module
 *
 * Workflow orchestration for AI agents. Workflows chain skills, agents,
 * and external API calls into multi-step processes.
 */

import type { HojaiConfig } from './config.js';
import { request, buildUrl } from './utils.js';

export type FlowStepType = 'skill' | 'agent' | 'api' | 'condition' | 'parallel' | 'loop' | 'wait' | 'human';

export interface FlowStep {
  id: string;
  type: FlowStepType;
  name: string;
  config: Record<string, unknown>;
  next?: string | string[];
  onError?: 'continue' | 'fail' | 'retry' | 'goto';
  retryCount?: number;
  timeout?: number;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  trigger: 'manual' | 'event' | 'schedule' | 'webhook';
  steps: FlowStep[];
  variables?: Record<string, unknown>;
  ownerCorpId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlowRequest {
  name: string;
  description?: string;
  trigger: Flow['trigger'];
  steps: FlowStep[];
  variables?: Record<string, unknown>;
}

export interface RunFlowRequest {
  inputs?: Record<string, unknown>;
  async?: boolean;
}

export interface RunFlowResult {
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  outputs?: Record<string, unknown>;
  error?: { stepId: string; message: string };
  startedAt: string;
  completedAt?: string;
}

export class FlowClient {
  constructor(private config: HojaiConfig) {}

  /**
   * Create a flow
   */
  async create(input: CreateFlowRequest): Promise<Flow> {
    return request<Flow>(this.config, 'POST', '/api/v1/flows', input);
  }

  /**
   * Get a flow by id
   */
  async get(id: string): Promise<Flow> {
    return request<Flow>(this.config, 'GET', `/api/v1/flows/${encodeURIComponent(id)}`);
  }

  /**
   * List flows (by owner)
   */
  async list(ownerCorpId: string, options: { limit?: number; offset?: number } = {}): Promise<Flow[]> {
    return request<Flow[]>(this.config, 'GET', buildUrl(this.config.baseUrl, '/api/v1/flows', { ownerCorpId, ...options }));
  }

  /**
   * Run a flow
   */
  async run(id: string, input: RunFlowRequest = {}): Promise<RunFlowResult> {
    return request<RunFlowResult>(this.config, 'POST', `/api/v1/flows/${encodeURIComponent(id)}/run`, input);
  }

  /**
   * Get flow run status
   */
  async getRun(runId: string): Promise<RunFlowResult> {
    return request<RunFlowResult>(this.config, 'GET', `/api/v1/flows/runs/${encodeURIComponent(runId)}`);
  }
}
