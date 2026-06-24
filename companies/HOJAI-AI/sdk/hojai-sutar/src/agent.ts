/**
 * SUTAR Agent Client
 *
 * Wraps the SUTAR agent runtime: merchant-agents, agent-analytics,
 * agent-contracts, agent-learning, agent-marketplace, agent-orchestration,
 * agent-teaming, agent-twin.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type AgentType =
  | 'merchant'
  | 'analytics'
  | 'contracts'
  | 'learning'
  | 'marketplace'
  | 'orchestration'
  | 'teaming'
  | 'twin';

export type AgentStatus = 'online' | 'offline' | 'busy' | 'training';

export interface Agent {
  id: string;
  agentId: string;
  type: AgentType;
  businessId: string;
  businessName: string;
  industry: string;
  status: AgentStatus;
  capabilities: string[];
  createdAt: string;
  stats?: {
    totalTasks: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface CreateAgentRequest {
  type: AgentType;
  businessId: string;
  businessName: string;
  industry: string;
  capabilities?: string[];
  config?: Record<string, unknown>;
}

export interface AgentTask {
  taskId: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export class AgentClient {
  constructor(private config: HojaiConfig) {}

  async create(input: CreateAgentRequest): Promise<Agent> {
    return request<Agent>(this.config, 'POST', '/api/v1/agents', input);
  }

  async get(id: string): Promise<Agent> {
    return request<Agent>(this.config, 'GET', `/api/v1/agents/${encodeURIComponent(id)}`);
  }

  async list(type: AgentType, options: { status?: AgentStatus; limit?: number } = {}): Promise<Agent[]> {
    return request<Agent[]>(this.config, 'GET', `/api/v1/agents?type=${type}&status=${options.status || ''}&limit=${options.limit || 50}`);
  }

  async updateStatus(id: string, status: AgentStatus): Promise<Agent> {
    return request<Agent>(this.config, 'PATCH', `/api/v1/agents/${encodeURIComponent(id)}/status`, { status });
  }

  async runTask(agentId: string, task: { type: string; input: Record<string, unknown> }): Promise<AgentTask> {
    return request<AgentTask>(this.config, 'POST', `/api/v1/agents/${encodeURIComponent(agentId)}/tasks`, task);
  }

  async getTask(agentId: string, taskId: string): Promise<AgentTask> {
    return request<AgentTask>(this.config, 'GET', `/api/v1/agents/${encodeURIComponent(agentId)}/tasks/${encodeURIComponent(taskId)}`);
  }

  async learn(agentId: string, event: { input: Record<string, unknown>; output: Record<string, unknown>; success: boolean }): Promise<{ learned: boolean }> {
    return request<{ learned: boolean }>(this.config, 'POST', `/api/v1/agents/${encodeURIComponent(agentId)}/learn`, event);
  }

  async getStats(agentId: string): Promise<Agent['stats']> {
    return request<Agent['stats']>(this.config, 'GET', `/api/v1/agents/${encodeURIComponent(agentId)}/stats`);
  }
}
