/**
 * SUTAR Contracts Client
 *
 * Smart contracts for AI agent agreements. SUTAR contracts are autonomous
 * agreements that execute when conditions are met.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type ContractStatus = 'draft' | 'pending' | 'active' | 'fulfilled' | 'breached' | 'terminated';

export interface Party {
  agentId: string;
  role: 'buyer' | 'seller' | 'arbiter' | 'observer';
  corpId: string;
}

export interface Condition {
  id: string;
  type: 'time' | 'delivery' | 'payment' | 'quality' | 'custom';
  expression: string; // e.g., "now > 2026-07-01" or "delivery.status == 'completed'"
}

export interface Action {
  id: string;
  type: 'transfer' | 'notify' | 'execute' | 'terminate';
  params: Record<string, unknown>;
}

export interface Contract {
  id: string;
  title: string;
  description?: string;
  parties: Party[];
  terms: { conditions: Condition[]; actions: Action[] };
  status: ContractStatus;
  createdAt: string;
  effectiveAt?: string;
  expiresAt?: string;
  executedActions?: { actionId: string; executedAt: string; result: string }[];
  history: { event: string; timestamp: string; actor: string }[];
}

export interface CreateContractRequest {
  title: string;
  description?: string;
  parties: Party[];
  terms: { conditions: Condition[]; actions: Action[] };
  effectiveAt?: string;
  expiresAt?: string;
}

export class ContractClient {
  constructor(private config: HojaiConfig) {}

  async create(input: CreateContractRequest): Promise<Contract> {
    return request<Contract>(this.config, 'POST', '/api/v1/contracts', input);
  }

  async get(id: string): Promise<Contract> {
    return request<Contract>(this.config, 'GET', `/api/v1/contracts/${encodeURIComponent(id)}`);
  }

  async list(input: { status?: ContractStatus; party?: string; limit?: number }): Promise<Contract[]> {
    return request<Contract[]>(this.config, 'POST', '/api/v1/contracts/list', input);
  }

  async execute(id: string, actionId: string, context: Record<string, unknown>): Promise<Contract> {
    return request<Contract>(this.config, 'POST', `/api/v1/contracts/${encodeURIComponent(id)}/execute`, { actionId, context });
  }

  async evaluate(id: string, context: Record<string, unknown>): Promise<{ satisfied: boolean; pendingActions: string[] }> {
    return request<{ satisfied: boolean; pendingActions: string[] }>(this.config, 'POST', `/api/v1/contracts/${encodeURIComponent(id)}/evaluate`, context);
  }

  async terminate(id: string, reason: string): Promise<Contract> {
    return request<Contract>(this.config, 'POST', `/api/v1/contracts/${encodeURIComponent(id)}/terminate`, { reason });
  }
}
