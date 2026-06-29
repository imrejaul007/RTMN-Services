/**
 * Health check utilities
 */

import { checkServiceHealth } from './http.js';

export interface ServiceHealth {
  name: string;
  url: string;
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Check health of multiple services in parallel
 */
export async function checkServicesHealth(
  services: Array<{ name: string; url: string }>
): Promise<ServiceHealth[]> {
  const checks = await Promise.all(
    services.map(async (s) => {
      const start = Date.now();
      const healthy = await checkServiceHealth(s.url);
      return {
        name: s.name,
        url: s.url,
        healthy,
        latencyMs: Date.now() - start,
      };
    })
  );
  return checks;
}

export function summarizeHealth(checks: ServiceHealth[]): {
  total: number;
  healthy: number;
  unhealthy: number;
  allHealthy: boolean;
  details: ServiceHealth[];
} {
  const healthy = checks.filter(c => c.healthy).length;
  return {
    total: checks.length,
    healthy,
    unhealthy: checks.length - healthy,
    allHealthy: healthy === checks.length,
    details: checks,
  };
}