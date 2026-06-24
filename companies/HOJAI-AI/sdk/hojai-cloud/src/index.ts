/**
 * @hojai/cloud SDK — HOJAI Cloud (port 4380).
 *
 * The deploy target for `npx hojai deploy --mode=remote`. Receives a
 * HOJAI Foundry project, provisions it on a per-tenant port, and
 * exposes it via the wildcard `*.hojai.app`.
 *
 * 3 sub-clients, ~10 methods:
 *   deployments  — push, list, get, teardown, deployAndWait
 *   route        — wildcard subdomain proxy
 *   health       — service health/readiness
 *
 * @example
 * ```ts
 * import { Cloud } from '@hojai/cloud';
 *
 * const c = new Cloud({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. Deploy a project (one-call with auto-wait)
 * const dep = await c.deployments.deployAndWait({
 *   name: 'maya-store', type: 'marketplace',
 *   runtime: 'node-express', manifest: {}
 * });
 * console.log(dep.url); // prints the https URL on hojai.app
 *
 * // 2. List active deployments
 * const all = await c.deployments.list({ status: 'live' });
 *
 * // 3. Tear down
 * await c.deployments.teardown(dep.id);
 * ```
 */

export { Cloud } from './cloud.js';
export type { ListOptions } from './cloud.js';
export type {
  Deployment, DeploymentStatus, DeployRequest, DeployResult, HealthInfo
} from './types.js';
export { CLOUD_PORT } from './types.js';
