import { describe, it, expect } from 'vitest';

// Mock PersistentMap for testing
class MockPersistentMap {
  private store = new Map();
  size = 0;
  set(key: string, value: any) { this.store.set(key, value); this.size = this.store.size; }
  get(key: string) { return this.store.get(key); }
  has(key: string) { return this.store.has(key); }
  delete(key: string) { const r = this.store.delete(key); this.size = this.store.size; return r; }
  values() { return this.store.values(); }
  entries() { return this.store.entries(); }
}

// Service status logic
function checkServiceHealth(service: { lastStatus: string; lastLatencyMs: number | null }): string {
  if (service.lastStatus === 'unknown') return 'unknown';
  if (service.lastLatencyMs === null) return 'unknown';
  if (service.lastStatus === 'error') return 'unhealthy';
  if (service.lastLatencyMs > 5000) return 'degraded';
  return 'healthy';
}

// Alert rule evaluation
function evaluateAlert(rule: { metric: string; comparator: string; threshold: number }, metrics: { value: number }[]): boolean {
  const latest = metrics[metrics.length - 1];
  if (!latest) return false;
  const value = latest.value;
  switch (rule.comparator) {
    case '>': return value > rule.threshold;
    case '>=': return value >= rule.threshold;
    case '<': return value < rule.threshold;
    case '<=': return value <= rule.threshold;
    case '==': return value === rule.threshold;
    default: return false;
  }
}

// Metrics aggregation
function calculateAverage(metrics: { value: number }[]): number {
  if (metrics.length === 0) return 0;
  const sum = metrics.reduce((s, m) => s + m.value, 0);
  return sum / metrics.length;
}

describe('sutar-monitoring — Health Checks', () => {
  it('unknown status returns unknown', () => {
    expect(checkServiceHealth({ lastStatus: 'unknown', lastLatencyMs: null })).toBe('unknown');
  });

  it('error status returns unhealthy', () => {
    expect(checkServiceHealth({ lastStatus: 'error', lastLatencyMs: 100 })).toBe('unhealthy');
  });

  it('high latency returns degraded', () => {
    expect(checkServiceHealth({ lastStatus: 'ok', lastLatencyMs: 6000 })).toBe('degraded');
  });

  it('normal latency returns healthy', () => {
    expect(checkServiceHealth({ lastStatus: 'ok', lastLatencyMs: 100 })).toBe('healthy');
  });
});

describe('sutar-monitoring — Alert Rules', () => {
  it('evaluates > comparator', () => {
    const rule = { metric: 'latency', comparator: '>', threshold: 100 };
    expect(evaluateAlert(rule, [{ value: 150 }])).toBe(true);
    expect(evaluateAlert(rule, [{ value: 50 }])).toBe(false);
  });

  it('evaluates >= comparator', () => {
    const rule = { metric: 'latency', comparator: '>=', threshold: 100 };
    expect(evaluateAlert(rule, [{ value: 100 }])).toBe(true);
    expect(evaluateAlert(rule, [{ value: 99 }])).toBe(false);
  });

  it('evaluates < comparator', () => {
    const rule = { metric: 'latency', comparator: '<', threshold: 100 };
    expect(evaluateAlert(rule, [{ value: 50 }])).toBe(true);
    expect(evaluateAlert(rule, [{ value: 150 }])).toBe(false);
  });

  it('evaluates <= comparator', () => {
    const rule = { metric: 'latency', comparator: '<=', threshold: 100 };
    expect(evaluateAlert(rule, [{ value: 100 }])).toBe(true);
    expect(evaluateAlert(rule, [{ value: 101 }])).toBe(false);
  });

  it('evaluates == comparator', () => {
    const rule = { metric: 'error_rate', comparator: '==', threshold: 0 };
    expect(evaluateAlert(rule, [{ value: 0 }])).toBe(true);
    expect(evaluateAlert(rule, [{ value: 1 }])).toBe(false);
  });

  it('returns false for empty metrics', () => {
    const rule = { metric: 'latency', comparator: '>', threshold: 100 };
    expect(evaluateAlert(rule, [])).toBe(false);
  });
});

describe('sutar-monitoring — Metrics', () => {
  it('calculates average correctly', () => {
    expect(calculateAverage([{ value: 10 }, { value: 20 }, { value: 30 }])).toBe(20);
  });

  it('handles single metric', () => {
    expect(calculateAverage([{ value: 42 }])).toBe(42);
  });

  it('handles empty metrics', () => {
    expect(calculateAverage([])).toBe(0);
  });

  it('calculates average with decimals', () => {
    expect(calculateAverage([{ value: 0.1 }, { value: 0.2 }, { value: 0.3 }])).toBeCloseTo(0.2);
  });
});

describe('sutar-monitoring — Service Status Tracking', () => {
  const mockServices = new MockPersistentMap();

  it('stores and retrieves services', () => {
    mockServices.set('svc-1', { id: 'svc-1', name: 'Test Service', lastStatus: 'ok' });
    expect(mockServices.get('svc-1').name).toBe('Test Service');
  });

  it('tracks service count', () => {
    mockServices.set('svc-2', { id: 'svc-2', name: 'Service 2', lastStatus: 'ok' });
    expect(mockServices.size).toBe(2);
  });

  it('deletes services', () => {
    mockServices.delete('svc-1');
    expect(mockServices.has('svc-1')).toBe(false);
  });

  it('counts by status', () => {
    const services = [
      { lastStatus: 'ok' },
      { lastStatus: 'ok' },
      { lastStatus: 'error' },
    ];
    const byStatus = services.reduce((acc, s) => {
      acc[s.lastStatus] = (acc[s.lastStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    expect(byStatus['ok']).toBe(2);
    expect(byStatus['error']).toBe(1);
  });
});
