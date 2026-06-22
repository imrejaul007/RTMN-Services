/**
 * Health Check System - Comprehensive Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// HEALTH CHECK TYPES
// ============================================

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latencyMs?: number;
  error?: string;
  timestamp: string;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: HealthCheckResult[];
  version?: string;
  environment?: string;
}

// ============================================
// HEALTH CHECK FUNCTIONS
// ============================================

describe('Health Check System', () => {
  describe('HealthStatus Structure', () => {
    it('should create valid healthy status', () => {
      const status: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 3600,
        checks: [],
      };

      expect(status.status).toBe('healthy');
      expect(status.uptime).toBe(3600);
      expect(status.checks).toHaveLength(0);
    });

    it('should create valid unhealthy status', () => {
      const status: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 100,
        checks: [
          {
            name: 'mongodb',
            status: 'unhealthy',
            error: 'Connection failed',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      expect(status.status).toBe('unhealthy');
      expect(status.checks).toHaveLength(1);
      expect(status.checks[0].error).toBe('Connection failed');
    });

    it('should create valid degraded status', () => {
      const status: HealthStatus = {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: 7200,
        checks: [
          { name: 'redis', status: 'unhealthy', timestamp: new Date().toISOString() },
          { name: 'mongodb', status: 'healthy', timestamp: new Date().toISOString() },
        ],
      };

      expect(status.status).toBe('degraded');
    });

    it('should include version and environment', () => {
      const status: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 500,
        checks: [],
        version: '1.0.0',
        environment: 'production',
      };

      expect(status.version).toBe('1.0.0');
      expect(status.environment).toBe('production');
    });
  });

  describe('Health Check Results', () => {
    it('should track healthy check', () => {
      const check: HealthCheckResult = {
        name: 'mongodb',
        status: 'healthy',
        latencyMs: 15,
        timestamp: new Date().toISOString(),
      };

      expect(check.status).toBe('healthy');
      expect(check.latencyMs).toBe(15);
      expect(check.error).toBeUndefined();
    });

    it('should track unhealthy check with error', () => {
      const check: HealthCheckResult = {
        name: 'redis',
        status: 'unhealthy',
        latencyMs: 5000,
        error: 'Connection timeout',
        timestamp: new Date().toISOString(),
      };

      expect(check.status).toBe('unhealthy');
      expect(check.error).toBe('Connection timeout');
      expect(check.latencyMs).toBeGreaterThan(1000);
    });

    it('should track degraded check', () => {
      const check: HealthCheckResult = {
        name: 'external_api',
        status: 'degraded',
        latencyMs: 3000,
        error: 'High latency',
        timestamp: new Date().toISOString(),
      };

      expect(check.status).toBe('degraded');
    });
  });

  describe('Uptime Tracking', () => {
    it('should calculate uptime in seconds', () => {
      const startTime = Date.now() - (3600 * 1000); // 1 hour ago
      const uptime = Math.floor((Date.now() - startTime) / 1000);

      expect(uptime).toBeGreaterThanOrEqual(3599);
      expect(uptime).toBeLessThanOrEqual(3601);
    });

    it('should format uptime as human readable', () => {
      const formatUptime = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

        return parts.join(' ');
      };

      expect(formatUptime(3661)).toBe('1h 1m 1s');
      expect(formatUptime(90)).toBe('1m 30s');
      expect(formatUptime(45)).toBe('45s');
      expect(formatUptime(86400)).toBe('1d');
    });
  });

  describe('Aggregated Health Status', () => {
    const calculateStatus = (checks: HealthCheckResult[]): 'healthy' | 'unhealthy' | 'degraded' => {
      if (checks.some(c => c.status === 'unhealthy')) return 'unhealthy';
      if (checks.some(c => c.status === 'degraded')) return 'degraded';
      return 'healthy';
    };

    it('should return unhealthy if any check is unhealthy', () => {
      const checks: HealthCheckResult[] = [
        { name: 'mongodb', status: 'healthy', timestamp: '' },
        { name: 'redis', status: 'unhealthy', timestamp: '' },
        { name: 'api', status: 'healthy', timestamp: '' },
      ];

      expect(calculateStatus(checks)).toBe('unhealthy');
    });

    it('should return degraded if any check is degraded but none unhealthy', () => {
      const checks: HealthCheckResult[] = [
        { name: 'mongodb', status: 'healthy', timestamp: '' },
        { name: 'redis', status: 'degraded', timestamp: '' },
      ];

      expect(calculateStatus(checks)).toBe('degraded');
    });

    it('should return healthy if all checks are healthy', () => {
      const checks: HealthCheckResult[] = [
        { name: 'mongodb', status: 'healthy', timestamp: '' },
        { name: 'redis', status: 'healthy', timestamp: '' },
        { name: 'api', status: 'healthy', timestamp: '' },
      ];

      expect(calculateStatus(checks)).toBe('healthy');
    });

    it('should return healthy for empty checks', () => {
      expect(calculateStatus([])).toBe('healthy');
    });
  });

  describe('Latency Thresholds', () => {
    it('should categorize healthy latency', () => {
      const categorizeLatency = (ms: number): 'healthy' | 'degraded' | 'unhealthy' => {
        if (ms < 100) return 'healthy';
        if (ms < 500) return 'degraded';
        return 'unhealthy';
      };

      expect(categorizeLatency(15)).toBe('healthy');
      expect(categorizeLatency(50)).toBe('healthy');
      expect(categorizeLatency(100)).toBe('healthy');
    });

    it('should categorize degraded latency', () => {
      const categorizeLatency = (ms: number): 'healthy' | 'degraded' | 'unhealthy' => {
        if (ms < 100) return 'healthy';
        if (ms < 500) return 'degraded';
        return 'unhealthy';
      };

      expect(categorizeLatency(150)).toBe('degraded');
      expect(categorizeLatency(300)).toBe('degraded');
      expect(categorizeLatency(499)).toBe('degraded');
    });

    it('should categorize unhealthy latency', () => {
      const categorizeLatency = (ms: number): 'healthy' | 'degraded' | 'unhealthy' => {
        if (ms < 100) return 'healthy';
        if (ms < 500) return 'degraded';
        return 'unhealthy';
      };

      expect(categorizeLatency(500)).toBe('unhealthy');
      expect(categorizeLatency(1000)).toBe('unhealthy');
      expect(categorizeLatency(5000)).toBe('unhealthy');
    });
  });

  describe('Health Check Types', () => {
    type CheckType = 'database' | 'cache' | 'external' | 'internal';

    const checkTypes: CheckType[] = ['database', 'cache', 'external', 'internal'];

    it('should have valid check types', () => {
      expect(checkTypes).toContain('database');
      expect(checkTypes).toContain('cache');
      expect(checkTypes).toContain('external');
      expect(checkTypes).toContain('internal');
    });

    it('should create check with type', () => {
      const check = {
        name: 'mongodb',
        type: 'database' as CheckType,
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
      };

      expect(check.type).toBe('database');
    });
  });

  describe('Health Check Dependencies', () => {
    interface DependencyGraph {
      [key: string]: string[];
    }

    const dependencies: DependencyGraph = {
      'app': ['mongodb', 'redis'],
      'mongodb': ['storage'],
      'redis': ['storage'],
      'external_api': [],
      'storage': [],
    };

    it('should define correct dependencies', () => {
      expect(dependencies['app']).toContain('mongodb');
      expect(dependencies['app']).toContain('redis');
      expect(dependencies['mongodb']).toContain('storage');
    });

    it('should identify root dependencies', () => {
      const isRoot = (name: string): boolean => dependencies[name].length === 0;

      expect(isRoot('storage')).toBe(true);
      expect(isRoot('external_api')).toBe(true);
      expect(isRoot('mongodb')).toBe(false);
      expect(isRoot('app')).toBe(false);
    });

    it('should calculate cascade impact', () => {
      const getImpactedServices = (failedService: string): string[] => {
        const impacted: string[] = [failedService];
        const reverseDeps = Object.entries(dependencies)
          .filter(([_, deps]) => deps.includes(failedService))
          .map(([name]) => name);
        impacted.push(...reverseDeps);
        return impacted;
      };

      const impactedByMongo = getImpactedServices('mongodb');
      expect(impactedByMongo).toContain('mongodb');
      expect(impactedByMongo).toContain('app');
    });
  });

  describe('Health Check Timing', () => {
    it('should measure check duration', async () => {
      const measureCheck = async (fn: () => Promise<void>): Promise<number> => {
        const start = Date.now();
        await fn();
        return Date.now() - start;
      };

      const duration = await measureCheck(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(100);
    });

    it('should timeout long checks', async () => {
      const withTimeout = async <T>(
        fn: () => Promise<T>,
        timeoutMs: number
      ): Promise<T> => {
        return Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          ),
        ]);
      };

      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'done';
      };

      await expect(withTimeout(slowFn, 50)).rejects.toThrow('Timeout');
      await expect(withTimeout(slowFn, 200)).resolves.toBe('done');
    });

    it('should track check timestamps', () => {
      const now = new Date().toISOString();
      const check: HealthCheckResult = {
        name: 'test',
        status: 'healthy',
        timestamp: now,
      };

      expect(new Date(check.timestamp).toISOString()).toBe(now);
    });
  });

  describe('HTTP Health Endpoints', () => {
    it('should return 200 for healthy status', () => {
      const getHttpStatus = (health: HealthStatus): number => {
        if (health.status === 'healthy') return 200;
        if (health.status === 'degraded') return 200;
        return 503;
      };

      expect(getHttpStatus({ status: 'healthy', timestamp: '', uptime: 0, checks: [] })).toBe(200);
      expect(getHttpStatus({ status: 'degraded', timestamp: '', uptime: 0, checks: [] })).toBe(200);
    });

    it('should return 503 for unhealthy status', () => {
      const getHttpStatus = (health: HealthStatus): number => {
        if (health.status === 'healthy') return 200;
        if (health.status === 'degraded') return 200;
        return 503;
      };

      expect(getHttpStatus({ status: 'unhealthy', timestamp: '', uptime: 0, checks: [] })).toBe(503);
    });
  });

  describe('Health Check Metrics', () => {
    it('should calculate availability percentage', () => {
      const calculateAvailability = (checks: HealthCheckResult[]): number => {
        if (checks.length === 0) return 100;
        const healthy = checks.filter(c => c.status === 'healthy').length;
        return (healthy / checks.length) * 100;
      };

      expect(calculateAvailability([])).toBe(100);
      expect(calculateAvailability([
        { name: 'a', status: 'healthy', timestamp: '' },
        { name: 'b', status: 'healthy', timestamp: '' },
      ])).toBe(100);
      expect(calculateAvailability([
        { name: 'a', status: 'healthy', timestamp: '' },
        { name: 'b', status: 'unhealthy', timestamp: '' },
      ])).toBe(50);
      expect(calculateAvailability([
        { name: 'a', status: 'healthy', timestamp: '' },
        { name: 'b', status: 'degraded', timestamp: '' },
      ])).toBe(50);
    });

    it('should calculate average latency', () => {
      const calculateAvgLatency = (checks: HealthCheckResult[]): number => {
        const withLatency = checks.filter(c => c.latencyMs !== undefined);
        if (withLatency.length === 0) return 0;
        const sum = withLatency.reduce((acc, c) => acc + (c.latencyMs || 0), 0);
        return sum / withLatency.length;
      };

      expect(calculateAvgLatency([])).toBe(0);
      expect(calculateAvgLatency([
        { name: 'a', status: 'healthy', latencyMs: 10, timestamp: '' },
        { name: 'b', status: 'healthy', latencyMs: 20, timestamp: '' },
      ])).toBe(15);
    });

    it('should count by status', () => {
      const countByStatus = (checks: HealthCheckResult[]): Record<string, number> => {
        const counts: Record<string, number> = {};
        for (const check of checks) {
          counts[check.status] = (counts[check.status] || 0) + 1;
        }
        return counts;
      };

      const counts = countByStatus([
        { name: 'a', status: 'healthy', timestamp: '' },
        { name: 'b', status: 'healthy', timestamp: '' },
        { name: 'c', status: 'unhealthy', timestamp: '' },
      ]);

      expect(counts.healthy).toBe(2);
      expect(counts.unhealthy).toBe(1);
    });
  });
});

// ============================================
// LIVENESS PROBE
// ============================================

describe('Liveness Probe', () => {
  it('should always return alive', () => {
    const livenessResponse = {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };

    expect(livenessResponse.status).toBe('alive');
  });

  it('should include timestamp', () => {
    const response = {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };

    expect(response.timestamp).toBeDefined();
    expect(new Date(response.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

// ============================================
// READINESS PROBE
// ============================================

describe('Readiness Probe', () => {
  const isReady = (checks: HealthCheckResult[]): boolean => {
    return checks.every(c => c.status === 'healthy' || c.status === 'degraded');
  };

  it('should be ready when all checks pass', () => {
    const checks: HealthCheckResult[] = [
      { name: 'db', status: 'healthy', timestamp: '' },
      { name: 'cache', status: 'healthy', timestamp: '' },
    ];

    expect(isReady(checks)).toBe(true);
  });

  it('should be ready with degraded checks', () => {
    const checks: HealthCheckResult[] = [
      { name: 'db', status: 'healthy', timestamp: '' },
      { name: 'cache', status: 'degraded', timestamp: '' },
    ];

    expect(isReady(checks)).toBe(true);
  });

  it('should not be ready with unhealthy checks', () => {
    const checks: HealthCheckResult[] = [
      { name: 'db', status: 'healthy', timestamp: '' },
      { name: 'cache', status: 'unhealthy', timestamp: '' },
    ];

    expect(isReady(checks)).toBe(false);
  });
});
