/**
 * Workflow Marketplace Client (port 4938) — workflow discovery + deployment.
 *
 * Pre-built multi-step workflows that compose multiple skills together.
 * Browse, deploy, and execute workflows.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  industry?: string;
  category?: string;
  /** Ordered steps */
  steps: Array<{ id: string; name: string; skillId?: string; config?: Record<string, unknown> }>;
  /** Trigger that runs the workflow */
  trigger?: 'manual' | 'schedule' | 'event' | 'webhook';
  publisher: string;
  rating: number;
  installs: number;
  featured: boolean;
  createdAt: string;
}

export interface Deployment {
  id: string;
  workflowId: string;
  status: 'pending' | 'active' | 'paused' | 'failed';
  deployedAt: string;
  /** Last run stats */
  lastRunAt?: string;
  runCount: number;
}

export class WorkflowMarketplaceClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4938` }; }

  async list(input: { industry?: string; category?: string; limit?: number } = {}): Promise<Workflow[]> {
    return request<Workflow[]>(this.config, 'GET', `/api/workflows${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async get(id: string): Promise<Workflow> {
    return request<Workflow>(this.config, 'GET', `/api/workflows/${encodeURIComponent(id)}`);
  }
  async search(input: { q: string; industry?: string; limit?: number }): Promise<Workflow[]> {
    return request<Workflow[]>(this.config, 'GET', `/api/search${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async listFeatured(): Promise<Workflow[]> {
    return request<Workflow[]>(this.config, 'GET', '/api/workflows/featured/list');
  }
  async listIndustries(): Promise<string[]> {
    return request<string[]>(this.config, 'GET', '/api/industries');
  }
  async listCategories(): Promise<string[]> {
    return request<string[]>(this.config, 'GET', '/api/categories');
  }
  /** Deploy a workflow (install + activate). */
  async deploy(workflowId: string, input: { config?: Record<string, unknown>; name?: string } = {}): Promise<Deployment> {
    return request<Deployment>(this.config, 'POST', `/api/workflows/${encodeURIComponent(workflowId)}/deploy`, input);
  }
  /** List my deployments. */
  async listDeployments(input: { status?: Deployment['status']; limit?: number } = {}): Promise<Deployment[]> {
    return request<Deployment[]>(this.config, 'GET', `/api/deployments${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  /** Pause / resume / undeploy a deployment. */
  async pause(deploymentId: string): Promise<Deployment> {
    return request<Deployment>(this.config, 'POST', `/api/deployments/${encodeURIComponent(deploymentId)}/pause`);
  }
  async resume(deploymentId: string): Promise<Deployment> {
    return request<Deployment>(this.config, 'POST', `/api/deployments/${encodeURIComponent(deploymentId)}/resume`);
  }
  async undeploy(deploymentId: string): Promise<{ removed: boolean; id: string }> {
    return request<{ removed: boolean; id: string }>(this.config, 'DELETE', `/api/deployments/${encodeURIComponent(deploymentId)}`);
  }
}
