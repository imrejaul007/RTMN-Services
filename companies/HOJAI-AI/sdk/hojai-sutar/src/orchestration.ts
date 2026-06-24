/**
 * SUTAR Orchestration Client
 *
 * Multi-agent workflow orchestration. Coordinates multiple SUTAR agents
 * to complete complex multi-step tasks.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type OrchestrationPattern = 'sequential' | 'parallel' | 'race' | 'fallback' | 'map_reduce';

export interface OrchestrationStep {
  id: string;
  agentRole: string;
  input: Record<string, unknown>;
  dependsOn?: string[];
  timeout?: number;
  retries?: number;
}

export interface OrchestrationRequest {
  pattern: OrchestrationPattern;
  steps: OrchestrationStep[];
  initialInput: Record<string, unknown>;
  timeout?: number;
}

export interface OrchestrationResult {
  orchestrationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  results: Record<string, { output: Record<string, unknown>; error?: string; durationMs: number }>;
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
}

export class OrchestrationClient {
  constructor(private config: HojaiConfig) {}

  async run(input: OrchestrationRequest): Promise<OrchestrationResult> {
    return request<OrchestrationResult>(this.config, 'POST', '/api/v1/orchestrations', input);
  }

  async get(id: string): Promise<OrchestrationResult> {
    return request<OrchestrationResult>(this.config, 'GET', `/api/v1/orchestrations/${encodeURIComponent(id)}`);
  }

  async list(options: { status?: string; limit?: number } = {}): Promise<OrchestrationResult[]> {
    return request<OrchestrationResult[]>(this.config, 'GET', `/api/v1/orchestrations?status=${options.status || ''}&limit=${options.limit || 50}`);
  }

  async cancel(id: string): Promise<{ cancelled: boolean }> {
    return request<{ cancelled: boolean }>(this.config, 'POST', `/api/v1/orchestrations/${encodeURIComponent(id)}/cancel`);
  }
}
