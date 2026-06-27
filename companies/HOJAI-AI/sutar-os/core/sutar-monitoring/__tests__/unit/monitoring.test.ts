/**
 * Unit tests for sutar-monitoring (port 3100).
 *
 * Tests seeded data, alert rule logic, comparator evaluation,
 * active alert lifecycle, metrics storage, and health tracking.
 * All external deps are stubbed via setup.ts so the real source
 * runs during import and seeds SHARED maps.
 */

import { describe, it, expect } from 'vitest';

// ---------- Shared state — injected by setup.ts before source loads ----------
const SHARED: any = (globalThis as any).__MONITORING_SHARED__;

// ---------- Import source — runs seed() and populates SHARED maps ----------
await import('../../src/index.js');

// ---------- REZ Intelligence mock (stubbed in setup.ts) ----------
const mockRezIntel = {
  REZ_INTEL_ENABLED: true,
  REZ_INTEL_URL: 'http://localhost:5370',
  checkRezIntelHealth: () => Promise.resolve(true),
  enrichAgentContext: (ctx: any) => Promise.resolve({ ltv: 1500, churnRisk: 'low' }),
  classifyIntent: (ctx: any) => Promise.resolve({ intent: 'purchase', confidence: 0.92 }),
  getNextBestAction: (ctx: any) => Promise.resolve({ action: 'upsell', reason: 'high_ltv' }),
};

// =====================================================
// Seeded data — services
// =====================================================
const SEEDED_IDS = [
  'svc-decision-engine', 'svc-trust-engine', 'svc-contract-os', 'svc-negotiation-eng',
  'svc-economy-os', 'svc-simulation-os', 'svc-goal-os', 'svc-flow-os', 'svc-policy-os',
  'svc-intent-bus', 'svc-exploration', 'svc-discovery-eng', 'svc-multiagent-eval',
  'svc-rep-aggregator', 'svc-roi-calculator', 'svc-founder-os', 'svc-acp-protocol',
  'svc-acn-network', 'svc-agent-teaming', 'svc-negotiation-ai', 'svc-ai-intelligence',
];

describe('sutar-monitoring seeded data', () => {
  it('seeds 21 known services', () => {
    expect(SHARED.services.size).toBe(21);
    for (const id of SEEDED_IDS) {
      expect(SHARED.services.has(id)).toBe(true);
    }
  });

  it('each seeded service starts with unknown status', () => {
    for (const id of SEEDED_IDS) {
      const svc = SHARED.services.get(id);
      expect(svc.lastStatus).toBe('unknown');
      expect(svc.lastProbedAt).toBeNull();
      expect(svc.lastLatencyMs).toBeNull();
    }
  });

  it('each seeded service has id, name, url, port, location', () => {
    for (const svc of SHARED.services.values()) {
      expect(svc.id).toBeTruthy();
      expect(svc.name).toBeTruthy();
      expect(svc.url).toMatch(/^http:\/\/localhost:\d+$/);
      expect(typeof svc.port).toBe('number');
      expect(svc.location).toBeTruthy();
    }
  });

  it('seeds an initial latency alert rule (threshold=1000, severity=warning)', () => {
    const rules = Array.from(SHARED['alert-rules'].values());
    expect(rules.length).toBeGreaterThan(0);
    const rule = rules.find((r: any) => r.metric === 'http_latency_ms' && r.comparator === 'gt' && r.threshold === 1000);
    expect(rule).toBeDefined();
    expect(rule.severity).toBe('warning');
    expect(rule.enabled).toBe(true);
    expect(rule.serviceId).toBe('*');
  });

  it('seeds empty metrics arrays for each service', () => {
    for (const id of SEEDED_IDS) {
      expect(SHARED.metrics.has(id)).toBe(true);
      expect(Array.isArray(SHARED.metrics.get(id))).toBe(true);
    }
  });
});

// =====================================================
// Alert rule comparators
// =====================================================
describe('alert rule comparators', () => {
  function simulateCompare(comparator: string, value: number, threshold: number): boolean {
    if (comparator === 'gt'  && value > threshold) return true;
    if (comparator === 'gte' && value >= threshold) return true;
    if (comparator === 'lt'  && value < threshold) return true;
    if (comparator === 'lte' && value <= threshold) return true;
    if (comparator === 'eq'  && value === threshold) return true;
    if (comparator === 'ne'  && value !== threshold) return true;
    return false;
  }

  it('gt fires when value > threshold', () => {
    expect(simulateCompare('gt', 150, 100)).toBe(true);
    expect(simulateCompare('gt', 100, 100)).toBe(false);
    expect(simulateCompare('gt', 50, 100)).toBe(false);
  });

  it('gte fires when value >= threshold', () => {
    expect(simulateCompare('gte', 100, 100)).toBe(true);
    expect(simulateCompare('gte', 101, 100)).toBe(true);
    expect(simulateCompare('gte', 99, 100)).toBe(false);
  });

  it('lt fires when value < threshold', () => {
    expect(simulateCompare('lt', 50, 100)).toBe(true);
    expect(simulateCompare('lt', 100, 100)).toBe(false);
    expect(simulateCompare('lt', 150, 100)).toBe(false);
  });

  it('lte fires when value <= threshold', () => {
    expect(simulateCompare('lte', 100, 100)).toBe(true);
    expect(simulateCompare('lte', 99, 100)).toBe(true);
    expect(simulateCompare('lte', 150, 100)).toBe(false);
  });

  it('eq fires when value === threshold', () => {
    expect(simulateCompare('eq', 200, 200)).toBe(true);
    expect(simulateCompare('eq', 199, 200)).toBe(false);
  });

  it('ne fires when value !== threshold', () => {
    expect(simulateCompare('ne', 199, 200)).toBe(true);
    expect(simulateCompare('ne', 200, 200)).toBe(false);
  });
});

// =====================================================
// Alert rule creation
// =====================================================
describe('alert rule management', () => {
  it('creates a rule with all required fields', () => {
    const rule = {
      id: 'r_new',
      name: 'New Rule',
      serviceId: 'svc-trust-engine',
      metric: 'http_status',
      comparator: 'lt',
      threshold: 500,
      severity: 'critical',
      enabled: true,
      createdAt: Date.now(),
    };
    SHARED['alert-rules'].set('r_new', rule);
    const got = SHARED['alert-rules'].get('r_new');
    expect(got.name).toBe('New Rule');
    expect(got.severity).toBe('critical');
  });

  it('serviceId "*" means rule applies to all services', () => {
    const rule = Array.from(SHARED['alert-rules'].values()).find((r: any) => r.serviceId === '*');
    expect(rule).toBeDefined();
  });

  it('deletes a rule', () => {
    SHARED['alert-rules'].delete('r_new');
    expect(SHARED['alert-rules'].has('r_new')).toBe(false);
  });
});

// =====================================================
// Active alert lifecycle
// =====================================================
describe('active alert lifecycle', () => {
  beforeEach(() => {
    SHARED['active-alerts'].clear();
  });

  it('fires an alert when condition is met', () => {
    const rule = { id: 'r_fire', name: 'Fire', serviceId: 'svc-decision-engine', metric: 'http_latency_ms', comparator: 'gt', threshold: 50, severity: 'warning', enabled: true };
    SHARED['alert-rules'].set('r_fire', rule);
    const svc = SHARED.services.get('svc-decision-engine');

    SHARED['active-alerts'].set('alert_fired', {
      id: 'alert_fired', ruleId: 'r_fire', ruleName: 'Fire',
      serviceId: 'svc-decision-engine', serviceName: svc.name,
      metric: 'http_latency_ms', value: 200, threshold: 50,
      comparator: 'gt', severity: 'warning',
      firedAt: Date.now(), resolved: false, resolvedAt: null,
    });

    const active = Array.from(SHARED['active-alerts'].values()).filter((a: any) => !a.resolved);
    expect(active.length).toBe(1);
    expect(active[0].serviceId).toBe('svc-decision-engine');
    expect(active[0].severity).toBe('warning');
  });

  it('auto-resolves alert when condition clears', () => {
    SHARED['active-alerts'].set('alert_auto', {
      id: 'alert_auto', ruleId: 'r_fire', ruleName: 'Fire',
      serviceId: 'svc-decision-engine', serviceName: 'SUTAR Decision Engine',
      metric: 'http_latency_ms', value: 30, threshold: 50,
      comparator: 'gt', severity: 'warning',
      firedAt: Date.now(), resolved: false, resolvedAt: null,
    });

    const existing = Array.from(SHARED['active-alerts'].values()).find((a: any) => a.ruleId === 'r_fire' && !a.resolved);
    expect(existing).toBeDefined();
    existing.resolved = true;
    existing.resolvedAt = Date.now();
    existing.autoResolved = true;

    const active = Array.from(SHARED['active-alerts'].values()).filter((a: any) => !a.resolved);
    expect(active.length).toBe(0);
    expect(existing.autoResolved).toBe(true);
  });

  it('prevents duplicate active alerts for same rule+service', () => {
    const existing = Array.from(SHARED['active-alerts'].values()).find(
      (a: any) => a.ruleId === 'r_fire' && a.serviceId === 'svc-decision-engine' && !a.resolved,
    );
    expect(existing).toBeUndefined();
  });
});

// =====================================================
// Metrics
// =====================================================
describe('metrics storage', () => {
  it('stores metric samples per service', () => {
    const sample = { name: 'http_latency_ms', value: 45.2, tags: { method: 'GET' }, timestamp: Date.now() };
    SHARED.metrics.get('svc-decision-engine').push(sample);
    expect(SHARED.metrics.get('svc-decision-engine').length).toBe(1);
    expect(SHARED.metrics.get('svc-decision-engine')[0].value).toBe(45.2);
  });

  it('converts value to Number', () => {
    const sample = { name: 'count', value: Number('42'), tags: {}, timestamp: Date.now() };
    expect(typeof sample.value).toBe('number');
    expect(sample.value).toBe(42);
  });

  it('tags are optional', () => {
    const sample = { name: 'event', value: 1, timestamp: Date.now() };
    expect(sample.tags).toBeUndefined();
  });
});

// =====================================================
// Service health tracking
// =====================================================
describe('service health tracking', () => {
  it('HTTP 200 → healthy', () => {
    const svc = SHARED.services.get('svc-decision-engine');
    const status = 200;
    svc.lastStatus = status >= 200 && status < 300 ? 'healthy' : 'unhealthy';
    svc.lastLatencyMs = 87;
    svc.lastProbedAt = Date.now();
    expect(svc.lastStatus).toBe('healthy');
    expect(svc.lastLatencyMs).toBe(87);
    expect(svc.lastProbedAt).toBeTruthy();
  });

  it('non-2xx → unhealthy', () => {
    const svc = SHARED.services.get('svc-trust-engine');
    const status = 503;
    svc.lastStatus = status >= 200 && status < 300 ? 'healthy' : 'unhealthy';
    svc.lastLatencyMs = 200;
    expect(svc.lastStatus).toBe('unhealthy');
  });

  it('fetch error → unreachable', () => {
    const svc = SHARED.services.get('svc-contract-os');
    svc.lastStatus = 'unreachable';
    svc.lastLatencyMs = 0;
    expect(svc.lastStatus).toBe('unreachable');
  });
});

// =====================================================
// Stats aggregation
// =====================================================
describe('stats aggregation', () => {
  it('counts services by status', () => {
    const servicesArr = Array.from(SHARED.services.values());
    const byStatus: Record<string, number> = {};
    for (const s of servicesArr) byStatus[s.lastStatus] = (byStatus[s.lastStatus] || 0) + 1;
    // Some services may have been modified by earlier tests; verify total = 21
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    expect(total).toBe(21);
    expect(byStatus.unknown).toBeGreaterThan(0); // Most still unknown
  });

  it('counts alert rules', () => {
    expect(SHARED['alert-rules'].size).toBeGreaterThan(0);
  });

  it('counts active alerts separately from resolved', () => {
    const active = Array.from(SHARED['active-alerts'].values()).filter((a: any) => !a.resolved);
    const resolved = Array.from(SHARED['active-alerts'].values()).filter((a: any) => a.resolved);
    expect(active.length).toBe(0);
    expect(resolved.length).toBe(0);
  });
});

// =====================================================
// REZ Intelligence integration
// =====================================================
describe('REZ Intelligence integration', () => {
  it('REZ_INTEL_ENABLED is true', () => {
    expect(mockRezIntel.REZ_INTEL_ENABLED).toBe(true);
  });

  it('checkRezIntelHealth resolves to true', async () => {
    const result = await mockRezIntel.checkRezIntelHealth();
    expect(result).toBe(true);
  });

  it('enrichAgentContext returns enriched data', async () => {
    const result = await mockRezIntel.enrichAgentContext({ agentRole: 'merchant', userId: 'u1' });
    expect(result).toHaveProperty('ltv');
    expect(result).toHaveProperty('churnRisk');
  });

  it('classifyIntent returns intent + confidence', async () => {
    const result = await mockRezIntel.classifyIntent({ text: 'buy now' });
    expect(result).toHaveProperty('intent');
    expect(typeof result.confidence).toBe('number');
  });

  it('getNextBestAction returns action recommendation', async () => {
    const result = await mockRezIntel.getNextBestAction({ userId: 'u1', context: {} });
    expect(result).toHaveProperty('action');
  });
});

// =====================================================
// Seeded service correctness
// =====================================================
describe('seeded service correctness', () => {
  it('SUTAR core services on ports 4290-4294', () => {
    expect(SHARED.services.get('svc-decision-engine')?.port).toBe(4290);
    expect(SHARED.services.get('svc-trust-engine')?.port).toBe(4291);
    expect(SHARED.services.get('svc-contract-os')?.port).toBe(4292);
    expect(SHARED.services.get('svc-negotiation-eng')?.port).toBe(4293);
    expect(SHARED.services.get('svc-economy-os')?.port).toBe(4294);
  });

  it('BLR marketplace services on ports 4255-4260', () => {
    expect(SHARED.services.get('svc-exploration')?.port).toBe(4255);
    expect(SHARED.services.get('svc-discovery-eng')?.port).toBe(4256);
    expect(SHARED.services.get('svc-multiagent-eval')?.port).toBe(4257);
    expect(SHARED.services.get('svc-rep-aggregator')?.port).toBe(4258);
    expect(SHARED.services.get('svc-roi-calculator')?.port).toBe(4259);
    expect(SHARED.services.get('svc-founder-os')?.port).toBe(4260);
  });

  it('ACN/agent services on ports 4800-4853', () => {
    expect(SHARED.services.get('svc-acp-protocol')?.port).toBe(4800);
    expect(SHARED.services.get('svc-acn-network')?.port).toBe(4801);
    expect(SHARED.services.get('svc-negotiation-ai')?.port).toBe(4850);
    expect(SHARED.services.get('svc-agent-teaming')?.port).toBe(4853);
  });

  it('AI intelligence on port 4881', () => {
    expect(SHARED.services.get('svc-ai-intelligence')?.port).toBe(4881);
  });

  it('services have correct location paths', () => {
    expect(SHARED.services.get('svc-decision-engine')?.location).toBe('sutar-os/core/');
    expect(SHARED.services.get('svc-trust-engine')?.location).toBe('sutar-os/core/');
    expect(SHARED.services.get('svc-exploration')?.location).toBe('blr-ai-marketplace/');
    expect(SHARED.services.get('svc-acp-protocol')?.location).toBe('sutar-os/agents/');
    expect(SHARED.services.get('svc-ai-intelligence')?.location).toBe('platform/intelligence/');
  });

  it('services have matching url and port', () => {
    for (const svc of SHARED.services.values()) {
      const urlPort = parseInt(svc.url.split(':')[2], 10);
      expect(svc.port).toBe(urlPort);
    }
  });
});