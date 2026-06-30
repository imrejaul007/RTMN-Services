/**
 * Proxy utilities — pure helpers for building target URLs from inbound requests.
 *
 * Extracted from proxy.ts so they can be unit-tested without spinning up axios.
 */

import type { ServiceEntry } from './serviceRegistry.js';

/**
 * Build the downstream URL the Hub will request.
 *
 * **The Hub forwards the FULL original path (including `/api/<prefix>`)** rather than
 * stripping the prefix. Why: downstream services register routes like
 * `app.get('/api/templates', ...)` with the `/api/<prefix>` baked in. If the Hub
 * stripped the prefix, downstream would receive e.g. `GET /` and 404 — even though
 * the service was correctly registered.
 *
 * @param service The matched service entry from the registry.
 * @param originalUrl The full original URL from `req.originalUrl` (path + query).
 */
export function buildProxyTargetUrl(service: ServiceEntry, originalUrl: string): string {
  const pathAndQuery = originalUrl.split('?');
  const path = pathAndQuery[0] || '/';
  const queryString = pathAndQuery.length > 1 ? `?${pathAndQuery.slice(1).join('?')}` : '';
  return `${service.url}${path}${queryString}`;
}
