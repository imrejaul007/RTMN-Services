/**
 * @hojai/agentos — TypeScript SDK for HOJAI Agent Operating System.
 *
 * Quick start:
 * ```ts
 * import { AgentOS, AgentRegistryClient, AgentExecutionClient } from '@hojai/agentos';
 *
 * const agentos = new AgentOS();
 *
 * // Create an agent
 * const agent = await agentos.registry.create({
 *   name: 'Genie Research',
 *   type: 'genie',
 *   owner: 'acme-corp',
 *   capabilities: ['web-search', 'pdf-parse', 'synthesis'],
 * });
 *
 * // Deploy it
 * await agentos.registry.deploy(agent);
 *
 * // Execute a task
 * const result = await agentos.execution.execute({
 *   agentId: agent.id,
 *   task: 'Research the latest AI trends in healthcare',
 * });
 *
 * // Poll until done
 * const done = await agentos.execution.waitForCompletion(result.executionId);
 * console.log(done.result);
 * ```
 */

// ─── Sub-clients (exported separately for tree-shaking) ────────────────────
export { AgentOSClient } from './client.js';
export { AgentRegistryClient } from './registry.js';
export { AgentOrchestratorClient } from './orchestrator.js';
export type { CreatePlanOptions, PlanStepInput } from './orchestrator.js';
export { AgentExecutionClient } from './execution.js';

// ─── Types & errors ────────────────────────────────────────────────────────
export type * from './types.js';
export * from './errors.js';

// ─── Unified AgentOS class ─────────────────────────────────────────────────

import { AgentRegistryClient } from './registry.js';
import { AgentOrchestratorClient } from './orchestrator.js';
import { AgentExecutionClient } from './execution.js';
import type { AgentOSConfig } from './types.js';

export class AgentOS {
  readonly registry: AgentRegistryClient;
  readonly orchestrator: AgentOrchestratorClient;
  readonly execution: AgentExecutionClient;

  constructor(config?: AgentOSConfig) {
    this.registry = new AgentRegistryClient(config);
    this.orchestrator = new AgentOrchestratorClient(config);
    this.execution = new AgentExecutionClient(config);
  }

  /** Full health check across all AgentOS services. */
  async healthCheck() {
    return {
      registry: await this.registry.isHealthy(),
      orchestrator: await this.orchestrator.isHealthy(),
      execution: await this.execution.isHealthy(),
    };
  }

  /**
   * Register an AI Employee from the AI Employee Registry with AgentOS.
   * Called during the install flow (registry → AgentOS sync).
   */
  async registerFromEmployee(emp: {
    id: string;
    slug: string;
    name: string;
    category: string;
    capabilities: string[];
    tags: string[];
    serviceUrl: string | null;
    port: number | null;
    version: string;
    pricing: { model: string; [k: string]: unknown };
    status: string;
    visionAgent: boolean;
    visionRole: string | null;
    notes?: string;
  }) {
    const agentType = emp.visionAgent ? 'genie' : 'custom';
    const capabilities = [
      ...(emp.capabilities || []),
      ...(emp.tags || []),
      emp.visionRole ? `vision:${emp.visionRole}` : null,
    ].filter(Boolean) as string[];

    return this.registry.create({
      name: emp.name,
      type: agentType,
      owner: emp.slug,
      capabilities,
      metadata: {
        registryId: emp.id,
        registrySlug: emp.slug,
        category: emp.category,
        serviceUrl: emp.serviceUrl,
        port: emp.port,
        pricing: emp.pricing,
        visionAgent: emp.visionAgent,
        visionRole: emp.visionRole,
        notes: emp.notes,
      },
      version: emp.version,
    });
  }
}
