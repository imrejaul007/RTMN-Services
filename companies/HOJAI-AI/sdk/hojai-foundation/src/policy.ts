/**
 * PolicyOS Module
 *
 * Wraps PolicyOS (port 4254) via Hub /api/foundation/policy-os/* routes.
 * Categories: access_control, data_privacy, financial, operational,
 *   security, compliance, workflow, customer_experience, hr, marketing, product
 */

import type { HojaiConfig } from './config.js';
import { request, type AuthState, type HojaiClientConfig } from './utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PolicyCategory =
  | 'access_control' | 'data_privacy' | 'financial'
  | 'operational' | 'security' | 'compliance' | 'workflow'
  | 'customer_experience' | 'hr' | 'marketing' | 'product';

export type PolicyStatus = 'draft' | 'review' | 'published' | 'archived' | 'retired';

export type RuleEffect = 'allow' | 'deny' | 'warn' | 'audit';

export interface PolicyRuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'exists' | 'regex';
  value?: unknown;
}

export interface PolicyRule {
  id?: string;
  effect: RuleEffect;
  conditions?: PolicyRuleCondition[];
  conditionLogic?: 'AND' | 'OR';
  action?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  category: PolicyCategory;
  version: number;
  priority?: number;
  status: PolicyStatus;
  conditions?: Record<string, unknown>;
  rules: PolicyRule[];
  actions?: { onAllow?: Record<string, unknown>; onDeny?: Record<string, unknown> };
  exceptions?: PolicyRule[];
  approvals?: { strategy?: 'single' | 'any' | 'majority' | 'allOf'; requiredApprovers?: string[] };
  composition?: { mode?: string; policyIds?: string[] };
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  tags?: string[];
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyRequest {
  name: string;
  category: PolicyCategory;
  description?: string;
  rules?: PolicyRule[];
  conditions?: Record<string, unknown>;
  actions?: { onAllow?: Record<string, unknown>; onDeny?: Record<string, unknown> };
  exceptions?: PolicyRule[];
  effectiveFrom?: string;
  effectiveUntil?: string;
  tags?: string[];
  owner?: string;
}

export interface EvaluateRequest {
  action: string;
  context: Record<string, unknown>;
  corpId?: string;
  policyId?: string;
}

export interface EvaluateResult {
  allowed: boolean;
  reasons: string[];
  suggestions?: string[];
  policyUsed?: string;
  evaluatedAt: string;
}

// ---------------------------------------------------------------------------
// PolicyOS client
// ---------------------------------------------------------------------------

export class PolicyClient {
  private readonly cfg: HojaiClientConfig;
  constructor(config: HojaiConfig, authState: AuthState) {
    this.cfg = { ...config, authState };
  }

  async create(input: CreatePolicyRequest): Promise<Policy> {
    return request<Policy>(this.cfg, 'POST', '/api/foundation/policy-os/policies', {
      name: input.name,
      category: input.category,
      description: input.description ?? '',
      rules: input.rules ?? [],
      conditions: input.conditions ?? {},
      actions: input.actions ?? { onAllow: {}, onDeny: {} },
      exceptions: input.exceptions ?? [],
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveUntil: input.effectiveUntil ?? null,
      tags: input.tags ?? [],
      owner: input.owner ?? 'u-admin'
    });
  }

  async get(id: string): Promise<Policy> {
    return request<Policy>(this.cfg, 'GET', `/api/foundation/policy-os/policies/${encodeURIComponent(id)}`);
  }

  async list(params?: { category?: PolicyCategory; status?: PolicyStatus; owner?: string }): Promise<Policy[]> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.owner) query.set('owner', params.owner);
    const qs = query.toString();
    const res = await request<{ count: number; policies: Policy[] }>(this.cfg, 'GET', `/api/foundation/policy-os/policies${qs ? `?${qs}` : ''}`);
    return res.policies ?? [];
  }

  async evaluate(input: EvaluateRequest): Promise<EvaluateResult> {
    const body: Record<string, unknown> = { context: input.context };
    if (input.policyId) body.policyId = input.policyId;
    if (input.corpId) (body.context as Record<string, unknown>).corpId = input.corpId;
    (body.context as Record<string, unknown>).action = input.action;
    return request<EvaluateResult>(this.cfg, 'POST', '/api/foundation/policy-os/policies/evaluate', body);
  }

  async evaluateBatch(inputs: EvaluateRequest[]): Promise<EvaluateResult[]> {
    const body = inputs.map(i => {
      const ctx: Record<string, unknown> = { ...i.context, action: i.action };
      if (i.corpId) ctx.corpId = i.corpId;
      return { context: ctx, policyId: i.policyId };
    });
    return request<EvaluateResult[]>(this.cfg, 'POST', '/api/foundation/policy-os/policies/evaluate-batch', body);
  }
}
