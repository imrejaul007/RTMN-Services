/**
 * Health Checker — Periodically check all services
 */

import axios from 'axios';
import { SERVICE_REGISTRY, ServiceEntry } from './serviceRegistry.js';

interface ServiceHealth {
  name: string;
  url: string;
  category: string;
  prefix: string;
  healthy: boolean;
  latencyMs?: number;
  lastCheck: string;
  error?: string;
}

const healthCache: Map<string, ServiceHealth> = new Map();
let intervalHandle: NodeJS.Timeout | null = null;

export async function checkServiceHealth(service: ServiceEntry): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const response = await axios.get(`${service.url}${service.healthPath}`, {
      timeout: 3000,
      validateStatus: () => true,
    });
    return {
      name: service.name,
      url: service.url,
      category: service.category,
      prefix: service.prefix,
      healthy: response.status === 200,
      latencyMs: Date.now() - start,
      lastCheck: new Date().toISOString(),
    };
  } catch (e: any) {
    return {
      name: service.name,
      url: service.url,
      category: service.category,
      prefix: service.prefix,
      healthy: false,
      latencyMs: Date.now() - start,
      lastCheck: new Date().toISOString(),
      error: e.message,
    };
  }
}

export async function checkAllServices(): Promise<ServiceHealth[]> {
  const checks = await Promise.all(
    SERVICE_REGISTRY.map(s => checkServiceHealth(s))
  );
  checks.forEach(c => healthCache.set(c.name, c));
  return checks;
}

export function getCachedHealth(): ServiceHealth[] {
  return Array.from(healthCache.values());
}

export function startHealthChecks(intervalMs: number = 30000) {
  if (intervalHandle) return;
  // Initial check
  checkAllServices().catch(console.error);
  intervalHandle = setInterval(() => {
    checkAllServices().catch(console.error);
  }, intervalMs);
}

export function stopHealthChecks() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export function summarizeHealth(checks: ServiceHealth[]) {
  return {
    total: checks.length,
    healthy: checks.filter(c => c.healthy).length,
    unhealthy: checks.filter(c => !c.healthy).length,
    byCategory: {
      genie: checks.filter(c => c.category === 'genie' && c.healthy).length,
      rtmn: checks.filter(c => c.category === 'rtmn' && c.healthy).length,
      integration: checks.filter(c => c.category === 'integration' && c.healthy).length,
    },
    allHealthy: checks.every(c => c.healthy),
  };
}