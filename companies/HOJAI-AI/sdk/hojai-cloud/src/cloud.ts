/**
 * HOJAI Cloud client — 3 sub-clients.
 *
 *   deployments  — push, list, get, tear down a deployed project
 *   route        — wildcard subdomain proxy (.hojai.app → tenant port)
 *   health       — service health/readiness
 *
 * @example
 * ```ts
 * import { Cloud } from '@hojai/cloud';
 *
 * const c = new Cloud({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. Deploy a project
 * const dep = await c.deployments.deploy({
 *   name: 'maya-store', type: 'marketplace',
 *   runtime: 'node-express', manifest: {}
 * });
 * console.log(dep.url); // prints the deployment URL
 *
 * // 2. List active deployments
 * const all = await c.deployments.list();
 *
 * // 3. Tear down
 * await c.deployments.teardown(dep.deploymentId);
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Deployment, DeploymentStatus, DeployRequest, DeployResult, HealthInfo } from './types.js';

// ─── Deployments ────────────────────────────────────────────

export interface ListOptions {
  status?: DeploymentStatus;
  projectId?: string;
  limit?: number;
}

export class DeploymentsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4380` }; }

  /** Push a project for deployment. Returns the assigned subdomain + URL. */
  async deploy(input: DeployRequest): Promise<DeployResult> {
    return request<DeployResult>(this.config, 'POST', '/api/v1/deploy', input);
  }

  /** List deployments, with optional filters. */
  async list(input: ListOptions = {}): Promise<Deployment[]> {
    return request<Deployment[]>(this.config, 'GET', `/api/v1/deployments${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  /** Get one deployment by id. */
  async get(id: string): Promise<Deployment> {
    return request<Deployment>(this.config, 'GET', `/api/v1/deployments/${encodeURIComponent(id)}`);
  }

  /** Tear down a deployment (stops the process, frees the port). */
  async teardown(id: string): Promise<{ tornDown: boolean; id: string }> {
    return request<{ tornDown: boolean; id: string }>(this.config, 'DELETE', `/api/v1/deployments/${encodeURIComponent(id)}`);
  }

  /** One-call: deploy + poll until status='live' (or 'failed'). */
  async deployAndWait(input: DeployRequest, opts: { pollMs?: number; timeoutMs?: number } = {}): Promise<Deployment> {
    const { pollMs = 2000, timeoutMs = 120_000 } = opts;
    const initial = await this.deploy(input);
    const start = Date.now();
    let last: Deployment = {
      id: initial.deploymentId, projectId: initial.projectId, projectName: input.name,
      subdomain: initial.subdomain, status: initial.status, url: initial.url,
      runtime: input.runtime, port: initial.port, manifest: input.manifest,
      createdAt: initial.createdAt, updatedAt: initial.createdAt
    };
    while (last.status !== 'live' && last.status !== 'failed' && last.status !== 'torn-down') {
      if (Date.now() - start > timeoutMs) throw new Error(`Deploy ${last.id} timed out after ${timeoutMs}ms (status=${last.status})`);
      await new Promise(r => setTimeout(r, pollMs));
      last = await this.get(last.id);
    }
    return last;
  }
}

// ─── Route (wildcard subdomain proxy) ─────────────────────────

export class RouteClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4380` }; }

  /** Proxy a request through the wildcard router to a tenant. */
  async proxy(subdomain: string, pathAndQuery: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    const method = init.method || 'GET';
    const url = `/api/v1/route/${encodeURIComponent(subdomain)}/${pathAndQuery.replace(/^\//, '')}`;
    // We need to use a custom path-and-body so we don't have request() try to parse JSON
    return request(this.config, method, url, init.body, { headers: init.headers });
  }
}

// ─── Health ────────────────────────────────────────────────

export class HealthClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4380` }; }

  async get(): Promise<HealthInfo> {
    return request<HealthInfo>(this.config, 'GET', '/api/v1/health');
  }

  async ready(): Promise<{ status: 'ready' }> {
    return request(this.config, 'GET', '/api/v1/ready');
  }
}

// ─── Facade ────────────────────────────────────────────────

export class Cloud {
  public readonly deployments: DeploymentsClient;
  public readonly route: RouteClient;
  public readonly health: HealthClient;
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.deployments = new DeploymentsClient(config);
    this.route = new RouteClient(config);
    this.health = new HealthClient(config);
    this.config = config;
  }
}

export default Cloud;
