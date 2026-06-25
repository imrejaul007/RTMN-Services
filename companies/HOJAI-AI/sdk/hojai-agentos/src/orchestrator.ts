/**
 * AgentOS SDK — Agent Orchestrator client (port 4812).
 */

import type { AgentOSConfig, OrchestrationPlan, OrchestrationStep } from './types.js';
import { AgentOSClient } from './client.js';
import { AgentOSError } from './errors.js';

const DEFAULT_ORCHESTRATOR_PORT = 4812;

export interface PlanStepInput {
  id?: string;
  name?: string;
  agentId?: string;
  toolId?: string;
  skillId?: string;
  inputs?: Record<string, unknown>;
  dependsOn?: string[];
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface CreatePlanOptions {
  name: string;
  description?: string;
  steps: PlanStepInput[];
}

export class AgentOrchestratorClient {
  private readonly http: AgentOSClient;
  private readonly port: number;

  constructor(config: AgentOSConfig = {}) {
    this.http = new AgentOSClient(config);
    this.port = config.orchestratorPort ?? DEFAULT_ORCHESTRATOR_PORT;
  }

  private url(path: string) { return this.http.url(this.port, path); }

  async listPlans(): Promise<OrchestrationPlan[]> {
    const res = await this.http.get<{ count: number; plans: OrchestrationPlan[] }>(this.url('/api/workflows'));
    return res.plans ?? [];
  }

  async getPlan(planId: string): Promise<OrchestrationPlan> {
    try {
      return await this.http.get<OrchestrationPlan>(this.url(`/api/workflows/${encodeURIComponent(planId)}`));
    } catch (err) {
      const ae = err as { statusCode?: number };
      if (ae?.statusCode === 404) throw new AgentOSError(`Workflow not found: ${planId}`, 'PLAN_NOT_FOUND', 404);
      throw err;
    }
  }

  async createPlan(options: CreatePlanOptions): Promise<OrchestrationPlan> {
    return this.http.post<OrchestrationPlan>(this.url('/api/workflows'), options);
  }

  async deletePlan(planId: string): Promise<void> {
    await this.http.del<{ deleted: boolean }>(this.url(`/api/workflows/${encodeURIComponent(planId)}`));
  }

  async startPlan(planId: string, trigger?: Record<string, unknown>): Promise<OrchestrationPlan> {
    return this.http.post<OrchestrationPlan>(
      this.url(`/api/workflows/${encodeURIComponent(planId)}/run`),
      trigger ?? {}
    );
  }

  async pausePlan(planId: string): Promise<OrchestrationPlan> {
    return this.http.post<OrchestrationPlan>(this.url(`/api/workflows/${encodeURIComponent(planId)}/pause`));
  }

  async resumePlan(planId: string): Promise<OrchestrationPlan> {
    return this.http.post<OrchestrationPlan>(this.url(`/api/workflows/${encodeURIComponent(planId)}/resume`));
  }

  async cancelPlan(planId: string): Promise<OrchestrationPlan> {
    return this.http.post<OrchestrationPlan>(this.url(`/api/workflows/${encodeURIComponent(planId)}/cancel`));
  }

  async getSteps(planId: string): Promise<OrchestrationStep[]> {
    const res = await this.http.get<{ workflowId: string; steps: OrchestrationStep[] }>(
      this.url(`/api/workflows/${encodeURIComponent(planId)}/steps`)
    );
    return res.steps ?? [];
  }

  async isHealthy(): Promise<boolean> { return this.http.ping(this.port); }

  // ─── Workflow builders ─────────────────────────────────────────────────

  sequential(name: string, steps: PlanStepInput[]): CreatePlanOptions {
    const named = steps.map((s, i) => ({
      ...s,
      id: s.id ?? `step_${i}`,
      dependsOn: i === 0 ? [] : [steps[i - 1].id ?? `step_${i - 1}`],
    }));
    return {
      name,
      description: `Sequential: ${named.map((s) => s.name || s.id).join(' → ')}`,
      steps: named,
    };
  }

  parallel(name: string, steps: PlanStepInput[]): CreatePlanOptions {
    const named = steps.map((s, i) => ({
      ...s,
      id: s.id ?? `step_${i}`,
      dependsOn: [],
    }));
    return { name, description: `Parallel: ${named.length} steps concurrent`, steps: named };
  }

  fanOut(name: string, triggerStep: PlanStepInput, workerSteps: PlanStepInput[]): CreatePlanOptions {
    const triggerId = triggerStep.id ?? 'step_trigger';
    const workers = workerSteps.map((s, i) => ({
      ...s,
      id: s.id ?? `step_worker_${i}`,
      dependsOn: [triggerId],
    }));
    return {
      name,
      description: `Fan-out: trigger → ${workers.length} parallel workers`,
      steps: [{ ...triggerStep, id: triggerId, dependsOn: [] }, ...workers],
    };
  }

  pipeline(name: string, steps: PlanStepInput[]): CreatePlanOptions {
    return this.sequential(name, steps);
  }

  fanIn(name: string, workerSteps: PlanStepInput[], aggregatorStep: PlanStepInput): CreatePlanOptions {
    const workers = workerSteps.map((s, i) => ({ ...s, id: s.id ?? `step_worker_${i}`, dependsOn: [] }));
    const workerIds = workers.map((w) => w.id!);
    return {
      name,
      description: `Fan-in: ${workers.length} workers → aggregator`,
      steps: [...workers, { ...aggregatorStep, id: aggregatorStep.id ?? 'step_aggregator', dependsOn: workerIds }],
    };
  }
}
