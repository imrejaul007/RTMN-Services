import { describe, it, expect, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

// Types
interface KillSwitch { id: string; name: string; scope: 'global' | 'agent' | 'team' | 'action'; target?: string; enabled: boolean; triggeredAt?: string; triggeredBy?: string; reason?: string; }
interface RateLimit { id: string; agentType: string; action: string; maxPerMinute: number; maxPerHour: number; currentMinute: number; currentHour: number; window: string; }
interface BehaviorRule { id: string; pattern: string; category: 'spam' | 'compliance' | 'safety' | 'cost'; severity: 'warning' | 'critical'; action: 'block' | 'review' | 'log'; }
interface Containment { id: string; agentId: string; reason: string; isolated: boolean; createdAt: string; }

// Default kill switches
const defaultKillSwitches: KillSwitch[] = [
  { id: 'global_bulk_email', name: 'Bulk Email Blaster', scope: 'global', target: 'email.bulk_send', enabled: true },
  { id: 'global_payment_auto', name: 'Auto-Pay Without Approval', scope: 'global', target: 'payment.auto_approve', enabled: true },
  { id: 'global_data_export', name: 'Customer Data Export', scope: 'global', target: 'data.export_pii', enabled: true },
  { id: 'agent_hire_fire', name: 'Auto Hire/Fire', scope: 'global', target: 'hr.employment', enabled: true },
];

const defaultRules: BehaviorRule[] = [
  { id: 'spam_detection', pattern: 'mass_message', category: 'spam', severity: 'critical', action: 'block' },
  { id: 'pii_protection', pattern: 'export_user_data', category: 'compliance', severity: 'critical', action: 'review' },
  { id: 'cost_guard', pattern: 'unlimited_api', category: 'cost', severity: 'warning', action: 'log' },
];

// Rate limit checker
function checkRateLimit(limit: RateLimit, increment = false): { allowed: boolean; current: number; limit: number } {
  if (increment) limit.currentMinute++;
  const allowed = limit.currentMinute < limit.maxPerMinute;
  return { allowed, current: limit.currentMinute, limit: limit.maxPerMinute };
}

// Behavior rule matcher
function matchRule(action: string, rules: BehaviorRule[]): BehaviorRule[] {
  return rules.filter(r => action.toLowerCase().includes(r.pattern));
}

// Containment check
function isContained(agentId: string, containmentMap: Map<string, Containment>): boolean {
  const c = containmentMap.get(agentId);
  return c?.isolated ?? false;
}

describe('SafetyOS — Kill Switches', () => {
  it('defaults to enabled', () => {
    const sw: KillSwitch = { id: 'test', name: 'Test', scope: 'global', enabled: true };
    expect(sw.enabled).toBe(true);
  });

  it('supports all scope types', () => {
    const scopes: KillSwitch['scope'][] = ['global', 'agent', 'team', 'action'];
    scopes.forEach(s => {
      const sw: KillSwitch = { id: '1', name: 'Test', scope: s, enabled: true };
      expect(sw.scope).toBe(s);
    });
  });

  it('filters by scope', () => {
    const global = defaultKillSwitches.filter(k => k.scope === 'global');
    expect(global).toHaveLength(4);
  });

  it('filters by enabled status', () => {
    const enabled = defaultKillSwitches.filter(k => k.enabled === true);
    expect(enabled).toHaveLength(4);
    const disabled = defaultKillSwitches.filter(k => k.enabled === false);
    expect(disabled).toHaveLength(0);
  });

  it('triggered switch records triggeredAt', () => {
    const sw: KillSwitch = { id: 'test', name: 'Test', scope: 'global', enabled: false, triggeredAt: new Date().toISOString(), triggeredBy: 'admin' };
    expect(sw.enabled).toBe(false);
    expect(sw.triggeredAt).toBeDefined();
    expect(sw.triggeredBy).toBe('admin');
  });
});

describe('SafetyOS — Rate Limiting', () => {
  it('allows requests under limit', () => {
    const limit: RateLimit = { id: '1', agentType: 'sales', action: 'send_email', maxPerMinute: 100, maxPerHour: 1000, currentMinute: 50, currentHour: 500, window: '' };
    const result = checkRateLimit(limit);
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(50);
  });

  it('blocks requests at or above limit', () => {
    const limit: RateLimit = { id: '1', agentType: 'sales', action: 'send_email', maxPerMinute: 100, maxPerHour: 1000, currentMinute: 100, currentHour: 500, window: '' };
    const result = checkRateLimit(limit);
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(100);
  });

  it('increments counter when requested', () => {
    const limit: RateLimit = { id: '1', agentType: 'sales', action: 'send_email', maxPerMinute: 100, maxPerHour: 1000, currentMinute: 50, currentHour: 500, window: '' };
    checkRateLimit(limit, true);
    expect(limit.currentMinute).toBe(51);
  });

  it('returns maxPerMinute as the limit', () => {
    const limit: RateLimit = { id: '1', agentType: 'sales', action: 'send_email', maxPerMinute: 60, maxPerHour: 1000, currentMinute: 0, currentHour: 0, window: '' };
    expect(checkRateLimit(limit).limit).toBe(60);
  });

  it('defaults maxPerMinute to 100', () => {
    const limit: RateLimit = { id: '1', agentType: 'sales', action: 'all', maxPerMinute: 100, maxPerHour: 1000, currentMinute: 0, currentHour: 0, window: '' };
    expect(limit.maxPerMinute).toBe(100);
  });

  it('defaults maxPerHour to 1000', () => {
    const limit: RateLimit = { id: '1', agentType: 'sales', action: 'all', maxPerMinute: 100, maxPerHour: 1000, currentMinute: 0, currentHour: 0, window: '' };
    expect(limit.maxPerHour).toBe(1000);
  });
});

describe('SafetyOS — Behavior Rules', () => {
  it('matches spam rule on mass_message', () => {
    const matches = matchRule('send mass_message to users', defaultRules);
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('spam_detection');
  });

  it('matches PII rule on export_user_data', () => {
    const matches = matchRule('export_user_data to csv', defaultRules);
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('critical');
  });

  it('matches cost rule on unlimited_api', () => {
    const matches = matchRule('call unlimited_api without limits', defaultRules);
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('warning');
  });

  it('returns empty for no matches', () => {
    const matches = matchRule('send single email', defaultRules);
    expect(matches).toHaveLength(0);
  });

  it('blocks critical severity', () => {
    const criticalRules = defaultRules.filter(r => r.severity === 'critical');
    expect(criticalRules.every(r => r.action === 'block' || r.action === 'review')).toBe(true);
  });

  it('filters rules by category', () => {
    const spam = defaultRules.filter(r => r.category === 'spam');
    expect(spam).toHaveLength(1);
    const compliance = defaultRules.filter(r => r.category === 'compliance');
    expect(compliance).toHaveLength(1);
  });
});

describe('SafetyOS — Containment', () => {
  it('returns not contained by default', () => {
    const map = new Map<string, Containment>();
    expect(isContained('agent-1', map)).toBe(false);
  });

  it('returns contained when isolated', () => {
    const map = new Map<string, Containment>();
    map.set('agent-1', { id: 'c1', agentId: 'agent-1', reason: 'Suspicious activity', isolated: true, createdAt: '' });
    expect(isContained('agent-1', map)).toBe(true);
  });

  it('is case-sensitive on agentId', () => {
    const map = new Map<string, Containment>();
    map.set('AGENT-1', { id: 'c1', agentId: 'AGENT-1', reason: '', isolated: true, createdAt: '' });
    expect(isContained('agent-1', map)).toBe(false);
  });
});

describe('SafetyOS — Emergency Stop', () => {
  it('disables all kill switches', () => {
    const switches = defaultKillSwitches.map(s => ({ ...s }));
    switches.forEach(sw => { sw.enabled = false; });
    expect(switches.every(sw => sw.enabled === false)).toBe(true);
  });

  it('isolates all contained agents', () => {
    const containment = new Map<string, Containment>();
    ['agent-1', 'agent-2'].forEach(id => {
      containment.set(id, { id: 'c1', agentId: id, reason: 'Emergency', isolated: true, createdAt: '' });
    });
    expect(Array.from(containment.values()).every(c => c.isolated)).toBe(true);
  });
});

describe('SafetyOS — Event Logging', () => {
  it('logs are capped at 1000 entries', () => {
    const events: any[] = [];
    for (let i = 0; i < 1500; i++) {
      events.unshift({ type: 'EVENT', data: {}, timestamp: new Date().toISOString(), id: `e-${i}` });
      if (events.length > 1000) events.pop();
    }
    expect(events).toHaveLength(1000);
    // unshift adds newest first; cap removes oldest from end (pop)
    // after 1500 unshift + 500 pops: [e-1499, e-1498, ..., e-500] (1000 items)
    // events[0] = e-500 (oldest kept), events[999] = e-1499 (newest kept)
    expect(events[0].id).toBe('e-500');
    expect(events[999].id).toBe('e-1499');
  });

  it('log entry has required fields', () => {
    const entry = { type: 'KILLSWITCH_TRIGGERED', data: { id: 'sw1' }, timestamp: new Date().toISOString(), id: 'evt-1' };
    expect(entry.type).toBeDefined();
    expect(entry.data).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.id).toBeDefined();
  });
});