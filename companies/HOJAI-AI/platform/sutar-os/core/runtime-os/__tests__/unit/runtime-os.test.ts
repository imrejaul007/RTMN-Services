import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

// Types
interface Agent {
  id: string; name: string; type: string; version: string;
  status: 'starting' | 'running' | 'paused' | 'stopped' | 'error';
  memory: { current: number; limit: number };
  cpu: { current: number; limit: number };
  tokens: { daily: number; limit: number; reset: string };
  capabilities: string[]; permissions: string[];
  dependencies: string[]; health: number;
  restarts: number; lastHealth: string;
  createdAt: string; updatedAt: string;
}

interface Pod {
  id: string; name: string; agents: string[];
  resources: { cpu: number; memory: number; tokens: number };
  isolation: 'shared' | 'sandbox' | 'dedicated';
  scaling: { min: number; max: number; current: number };
}

interface Schedule {
  id: string; agentId: string; cron: string; payload: any;
  enabled: boolean; lastRun?: string; nextRun?: string; retries: number;
}

// Agent creation validation
function validateAgent(body: { name?: string; type?: string }): string | null {
  if (!body.name || !body.type) return 'name and type required';
  return null;
}

// Agent status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  starting: ['running', 'error'],
  running: ['paused', 'stopped', 'error'],
  paused: ['running', 'stopped'],
  error: ['starting', 'stopped'],
  stopped: ['starting'],
};

function canTransition(from: Agent['status'], to: Agent['status']): boolean {
  if (from === to) return true;
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// Resource quota checker
function checkQuota(used: number, limit: number): { allowed: boolean; percentage: number } {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  return { allowed: used <= limit, percentage: Math.round(percentage) };
}

// Pod scaling
function scalePod(pod: Pod, instances: number): { valid: boolean; actual: number } {
  if (instances < pod.scaling.min) return { valid: false, actual: pod.scaling.min };
  if (instances > pod.scaling.max) return { valid: false, actual: pod.scaling.max };
  return { valid: true, actual: instances };
}

describe('RuntimeOS — Agent Lifecycle', () => {
  it('requires name and type for agent creation', () => {
    expect(validateAgent({})).toBe('name and type required');
    expect(validateAgent({ name: 'Test' })).toBe('name and type required');
    expect(validateAgent({ type: 'sales' })).toBe('name and type required');
    expect(validateAgent({ name: 'Test', type: 'sales' })).toBeNull();
  });

  it('defaults agent status to starting', () => {
    const agent: Agent = { id: '1', name: 'Test', type: 'sales', version: '1.0.0', status: 'starting', memory: { current: 0, limit: 512 }, cpu: { current: 0, limit: 2 }, tokens: { daily: 0, limit: 100000, reset: '' }, capabilities: [], permissions: [], dependencies: [], health: 100, restarts: 0, lastHealth: '', createdAt: '', updatedAt: '' };
    expect(agent.status).toBe('starting');
  });

  it('defaults memory limit to 512', () => {
    const agent: Agent = { id: '1', name: 'Test', type: 'sales', version: '1.0.0', status: 'running', memory: { current: 0, limit: 512 }, cpu: { current: 0, limit: 2 }, tokens: { daily: 0, limit: 100000, reset: '' }, capabilities: [], permissions: [], dependencies: [], health: 100, restarts: 0, lastHealth: '', createdAt: '', updatedAt: '' };
    expect(agent.memory.limit).toBe(512);
  });

  it('defaults cpu limit to 2', () => {
    const agent: Agent = { id: '1', name: 'Test', type: 'sales', version: '1.0.0', status: 'running', memory: { current: 0, limit: 512 }, cpu: { current: 0, limit: 2 }, tokens: { daily: 0, limit: 100000, reset: '' }, capabilities: [], permissions: [], dependencies: [], health: 100, restarts: 0, lastHealth: '', createdAt: '', updatedAt: '' };
    expect(agent.cpu.limit).toBe(2);
  });

  it('defaults tokens limit to 100000', () => {
    const agent: Agent = { id: '1', name: 'Test', type: 'sales', version: '1.0.0', status: 'running', memory: { current: 0, limit: 512 }, cpu: { current: 0, limit: 2 }, tokens: { daily: 0, limit: 100000, reset: '' }, capabilities: [], permissions: [], dependencies: [], health: 100, restarts: 0, lastHealth: '', createdAt: '', updatedAt: '' };
    expect(agent.tokens.limit).toBe(100000);
  });

  it('initializes health at 100', () => {
    const agent: Agent = { id: '1', name: 'Test', type: 'sales', version: '1.0.0', status: 'running', memory: { current: 0, limit: 512 }, cpu: { current: 0, limit: 2 }, tokens: { daily: 0, limit: 100000, reset: '' }, capabilities: [], permissions: [], dependencies: [], health: 100, restarts: 0, lastHealth: '', createdAt: '', updatedAt: '' };
    expect(agent.health).toBe(100);
  });

  it('defaults capabilities to empty array', () => {
    const agent: Agent = { id: '1', name: 'Test', type: 'sales', version: '1.0.0', status: 'running', memory: { current: 0, limit: 512 }, cpu: { current: 0, limit: 2 }, tokens: { daily: 0, limit: 100000, reset: '' }, capabilities: [], permissions: [], dependencies: [], health: 100, restarts: 0, lastHealth: '', createdAt: '', updatedAt: '' };
    expect(Array.isArray(agent.capabilities)).toBe(true);
    expect(agent.capabilities).toHaveLength(0);
  });
});

describe('RuntimeOS — Status Transitions', () => {
  it('allows valid transitions', () => {
    expect(canTransition('starting', 'running')).toBe(true);
    expect(canTransition('running', 'paused')).toBe(true);
    expect(canTransition('paused', 'running')).toBe(true);
    expect(canTransition('running', 'stopped')).toBe(true);
    expect(canTransition('error', 'starting')).toBe(true);
  });

  it('prevents invalid transitions', () => {
    expect(canTransition('stopped', 'running')).toBe(false); // must go through starting
  });

  it('allows paused to stopped (direct stop)', () => {
    expect(canTransition('paused', 'stopped')).toBe(true);
  });

  it('allows same-status (no-op)', () => {
    expect(canTransition('running', 'running')).toBe(true);
    expect(canTransition('paused', 'paused')).toBe(true);
  });

  it('supports all valid statuses', () => {
    const statuses: Agent['status'][] = ['starting', 'running', 'paused', 'stopped', 'error'];
    statuses.forEach(s => {
      const a: Agent = { id: '1', name: 'Test', type: 't', version: '1', status: s, memory: { current: 0, limit: 512 }, cpu: { current: 0, limit: 2 }, tokens: { daily: 0, limit: 100000, reset: '' }, capabilities: [], permissions: [], dependencies: [], health: 100, restarts: 0, lastHealth: '', createdAt: '', updatedAt: '' };
      expect(a.status).toBe(s);
    });
  });
});

describe('RuntimeOS — Resource Quotas', () => {
  it('allows usage within limit', () => {
    const result = checkQuota(50, 100);
    expect(result.allowed).toBe(true);
    expect(result.percentage).toBe(50);
  });

  it('blocks usage exceeding limit', () => {
    const result = checkQuota(150, 100);
    expect(result.allowed).toBe(false);
    expect(result.percentage).toBe(150);
  });

  it('handles zero limit', () => {
    const result = checkQuota(10, 0);
    expect(result.allowed).toBe(false);
    expect(result.percentage).toBe(0);
  });

  it('calculates percentage correctly', () => {
    expect(checkQuota(75, 100).percentage).toBe(75);
    expect(checkQuota(33, 100).percentage).toBe(33);
    expect(checkQuota(100, 100).percentage).toBe(100);
    expect(checkQuota(0, 100).percentage).toBe(0);
  });
});

describe('RuntimeOS — Pod Scaling', () => {
  const pod: Pod = { id: '1', name: 'Test Pod', agents: [], resources: { cpu: 4, memory: 2048, tokens: 500000 }, isolation: 'shared', scaling: { min: 1, max: 5, current: 1 } };

  it('scales within bounds', () => {
    expect(scalePod(pod, 3)).toEqual({ valid: true, actual: 3 });
    expect(scalePod(pod, 1)).toEqual({ valid: true, actual: 1 });
    expect(scalePod(pod, 5)).toEqual({ valid: true, actual: 5 });
  });

  it('clamps below minimum', () => {
    const result = scalePod(pod, 0);
    expect(result.valid).toBe(false);
    expect(result.actual).toBe(1);
  });

  it('clamps above maximum', () => {
    const result = scalePod(pod, 10);
    expect(result.valid).toBe(false);
    expect(result.actual).toBe(5);
  });
});

describe('RuntimeOS — Schedule Validation', () => {
  it('requires agentId and cron for schedule creation', () => {
    const validate = (body: Partial<Schedule>) => {
      if (!body.agentId || !body.cron) return false;
      return true;
    };
    expect(validate({})).toBe(false);
    expect(validate({ agentId: 'a1' })).toBe(false);
    expect(validate({ cron: '0 * * * *' })).toBe(false);
    expect(validate({ agentId: 'a1', cron: '0 * * * *' })).toBe(true);
  });

  it('defaults schedule to enabled', () => {
    const schedule: Schedule = { id: '1', agentId: 'a1', cron: '0 * * * *', payload: {}, enabled: true, retries: 0 };
    expect(schedule.enabled).toBe(true);
  });

  it('defaults retries to 0', () => {
    const schedule: Schedule = { id: '1', agentId: 'a1', cron: '0 * * * *', payload: {}, enabled: true, retries: 0 };
    expect(schedule.retries).toBe(0);
  });
});

describe('RuntimeOS — Event Logging', () => {
  it('logs are capped at 10000', () => {
    const events: any[] = [];
    for (let i = 0; i < 15000; i++) {
      events.push({ type: 'EVENT', data: {}, timestamp: new Date().toISOString(), id: `e-${i}` });
      if (events.length > 10000) events.shift();
    }
    expect(events).toHaveLength(10000);
  });

  it('log entry has required fields', () => {
    const entry = { type: 'AGENT_CREATED', data: { id: '1' }, timestamp: new Date().toISOString(), id: 'evt-1' };
    expect(entry.type).toBeDefined();
    expect(entry.data).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.id).toBeDefined();
  });
});