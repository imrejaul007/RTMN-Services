/**
 * @hojai/cloud — types.
 *
 * HOJAI Cloud is the deploy target for `npx hojai deploy --mode=remote`.
 * Receives a HOJAI Foundry project, provisions it on a per-tenant port,
 * and exposes it via the wildcard `*.hojai.app`.
 */

export const CLOUD_PORT = 4380;

export type DeploymentStatus = 'pending' | 'building' | 'starting' | 'live' | 'failed' | 'torn-down';

export interface Deployment {
  id: string;
  projectId: string;
  projectName: string;
  /** Subdomain on hojai.app (e.g. 'maya-store' → maya-store.hojai.app) */
  subdomain: string;
  status: DeploymentStatus;
  /** Public URL once live (e.g. 'https://maya-store.hojai.app') */
  url: string;
  /** Runtime: 'node-express' | 'nextjs' | etc. */
  runtime: string;
  /** The local port the tenant process is bound to */
  port?: number;
  /** The host-side process id, if running */
  pid?: number;
  /** Full project manifest (the .hojai/manifest.json) */
  manifest: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** Last error if status === 'failed' */
  error?: string;
}

export interface DeployRequest {
  name: string;
  type: string;
  manifest: Record<string, unknown>;
  runtime: 'node-express' | 'nextjs' | 'remix' | 'sveltekit';
  /** Optional: custom subdomain (defaults derived from name) */
  subdomain?: string;
  /** Optional: zip/file body (in v1.1 just metadata) */
  files?: Record<string, string>;
}

export interface DeployResult {
  projectId: string;
  deploymentId: string;
  subdomain: string;
  url: string;
  status: DeploymentStatus;
  port: number;
  createdAt: string;
}

export interface HealthInfo {
  status: 'ok' | 'degraded';
  deployments: number;
  live: number;
  failed: number;
  uptimeSec: number;
  version: string;
}
