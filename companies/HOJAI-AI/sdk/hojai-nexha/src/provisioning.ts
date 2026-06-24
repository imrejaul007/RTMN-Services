/**
 * Nexha Provisioning Engine Client
 *
 * Wraps nexha-provisioning-engine: declarative provisioning plans
 * with state transitions, apply/destroy lifecycles.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type PlanStatus = 'pending' | 'planned' | 'applying' | 'applied' | 'failed' | 'destroyed';

export interface PlanResource {
  id: string;
  type: string;
  provider: string;
  config: Record<string, unknown>;
  status: 'pending' | 'provisioning' | 'ready' | 'failed';
  outputs?: Record<string, unknown>;
}

export interface Plan {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: PlanStatus;
  resources: PlanResource[];
  outputs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
  destroyedAt?: string;
}

export interface PlanInput {
  name: string;
  description?: string;
  resources: Array<{ id: string; type: string; provider: string; config: Record<string, unknown> }>;
  metadata?: Record<string, unknown>;
}

export interface PlanTransition {
  fromStatus: PlanStatus;
  toStatus: PlanStatus;
  occurredAt: string;
  reason?: string;
  actor?: string;
}

export interface PlanEvent {
  id: string;
  planId: string;
  type: string;
  resourceId?: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export class ProvisioningClient {
  constructor(private config: HojaiConfig) {}

  async createPlan(input: PlanInput): Promise<Plan> {
    return request<Plan>(this.config, 'POST', '/api/plans', input);
  }

  async listPlans(input: { status?: PlanStatus; tenantId?: string } = {}): Promise<Plan[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Plan[]>(this.config, 'GET', `/api/plans?${params.toString()}`);
  }

  async getPlan(planId: string): Promise<Plan> {
    return request<Plan>(this.config, 'GET', `/api/plans/${encodeURIComponent(planId)}`);
  }

  async getPlanJson(planId: string): Promise<Record<string, unknown>> {
    return request(this.config, 'GET', `/api/plans/${encodeURIComponent(planId)}/plan.json`);
  }

  async getPlanYaml(planId: string): Promise<string> {
    return request(this.config, 'GET', `/api/plans/${encodeURIComponent(planId)}/plan.yaml`);
  }

  async transition(planId: string, input: { toStatus: PlanStatus; reason?: string }): Promise<Plan> {
    return request<Plan>(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/transition`, input);
  }

  async apply(planId: string): Promise<Plan> {
    return request<Plan>(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/apply`);
  }

  async failResource(planId: string, input: { resourceId: string; error: string }): Promise<Plan> {
    return request<Plan>(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/fail-resource`, input);
  }

  async recordOutputs(planId: string, input: { resourceId: string; outputs: Record<string, unknown> }): Promise<Plan> {
    return request<Plan>(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/outputs`, input);
  }

  async cancel(planId: string): Promise<Plan> {
    return request<Plan>(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/cancel`);
  }

  async destroy(planId: string): Promise<Plan> {
    return request<Plan>(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/destroy`);
  }

  async markDestroyed(planId: string): Promise<Plan> {
    return request<Plan>(this.config, 'POST', `/api/plans/${encodeURIComponent(planId)}/mark-destroyed`);
  }

  async listEvents(planId: string): Promise<PlanEvent[]> {
    return request<PlanEvent[]>(this.config, 'GET', `/api/plans/${encodeURIComponent(planId)}/events`);
  }

  async stats(): Promise<{ totalPlans: number; byStatus: Record<PlanStatus, number> }> {
    return request(this.config, 'GET', '/api/stats');
  }
}