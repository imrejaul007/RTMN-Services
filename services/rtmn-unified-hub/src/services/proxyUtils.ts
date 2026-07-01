/**
 * Proxy utilities — pure helpers for building target URLs from inbound requests.
 *
 * Extracted from proxy.ts so they can be unit-tested without spinning up axios.
 */

import type { ServiceEntry } from './serviceRegistry.js';

/**
 * Build the downstream URL the Hub will request.
 *
 * Whether to strip the matched prefix depends on how the downstream service
 * registers its routes:
 *
 *   - stripPrefix: true (default)  → forward the remainder after the prefix.
 *     e.g. GET /api/services/foo → forward /foo to service.
 *     Use when the downstream service mounts routes WITHOUT the /api/<prefix>.
 *
 *   - stripPrefix: false            → forward the FULL original path unchanged.
 *     e.g. GET /api/templates     → forward /api/templates to service.
 *     Use when the downstream service mounts routes WITH the /api/<prefix> baked in.
 *     (Nexha Phase 0-5 services all use this pattern.)
 *
 * @param service The matched service entry from the registry.
 * @param originalUrl The full original URL from `req.originalUrl` (path + query).
 */
export function buildProxyTargetUrl(service: ServiceEntry, originalUrl: string): string {
  const pathAndQuery = originalUrl.split('?');
  const path = pathAndQuery[0] || '/';
  const queryString = pathAndQuery.length > 1 ? `?${pathAndQuery.slice(1).join('?')}` : '';

  // Default: strip the prefix. Phase 0-5 Nexha services use stripPrefix: false.
  const strip = service.stripPrefix !== false;

  const downstreamPath = strip ? path.replace(new RegExp(`^${service.prefix}`), '') || '/' : path;
  return `${service.url}${downstreamPath}${queryString}`;
}
