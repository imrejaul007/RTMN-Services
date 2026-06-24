/**
 * PolicyOS Module
 *
 * Compliance, governance, and policy enforcement. Policies are written
 * in a YAML DSL and evaluated on actions (data access, transactions, etc.)
 */

import type { HojaiConfig } from './config.js';
import { request, buildUrl } from './utils.js';

export type PolicyAction = 'allow' | 'deny' | 'require_approval' | 'log';

export interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  conditions: Record<string, unknown>;
  action: PolicyAction;
  approvers?: string[];
  priority?: number;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  rules: PolicyRule[];
  scope: { ownerCorpId: string; scope: 'global' | 'department' | 'team' | 'agent' };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyRequest {
  name: string;
  description?: string;
  rules: PolicyRule[];
  scope: Policy['scope'];
}

export interface EvaluateRequest {
  action: string;
  context: Record<string, unknown>;
  corpId: string;
}

export interface EvaluateResult {
  decision: PolicyAction;
  matchedRule?: string;
  requiresApproval?: string[];
  reason?: string;
}

export class PolicyClient {
  constructor(private config: HojaiConfig) {}

  /**
   * Create a policy
   */
  async create(input: CreatePolicyRequest): Promise<Policy> {
    return request<Policy>(this.config, 'POST', '/api/v1/policies', input);
  }

  /**
   * Get a policy by id
   */
  async get(id: string): Promise<Policy> {
    return request<Policy>(this.config, 'GET', `/api/v1/policies/${encodeURIComponent(id)}`);
  }

  /**
   * List policies
   */
  async list(corpId: string, options: { enabled?: boolean; limit?: number } = {}): Promise<Policy[]> {
    return request<Policy[]>(this.config, 'GET', buildUrl(this.config.baseUrl, '/api/v1/policies', { corpId, ...options }));
  }

  /**
   * Evaluate an action against all policies for a CorpID
   */
  async evaluate(input: EvaluateRequest): Promise<EvaluateResult> {
    return request<EvaluateResult>(this.config, 'POST', '/api/v1/policies/evaluate', input);
  }
}
