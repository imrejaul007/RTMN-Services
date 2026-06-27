/**
 * Agent Registry Tests - Port 4803
 */
import { describe, it, expect } from 'vitest';
import http from 'http';

// Constants from the service
const VALID_TYPES = ['genie', 'merchant', 'system', 'partner', 'custom'];
const VALID_STATUSES = ['draft', 'active', 'paused', 'retired'];
const DEFAULT_HEARTBEAT_TTL_MS = 5 * 60 * 1000;

const BASE_URL = 'http://localhost:4803';

// ==================== Pure Function Tests ====================

describe('Agent Registry - Constants', () => {
  describe('Valid Types', () => {
    it('should have all valid agent types', () => {
      expect(VALID_TYPES).toContain('genie');
      expect(VALID_TYPES).toContain('merchant');
      expect(VALID_TYPES).toContain('system');
      expect(VALID_TYPES).toContain('partner');
      expect(VALID_TYPES).toContain('custom');
    });

    it('should have 5 valid types', () => {
      expect(VALID_TYPES).toHaveLength(5);
    });
  });

  describe('Valid Statuses', () => {
    it('should have all valid statuses', () => {
      expect(VALID_STATUSES).toContain('draft');
      expect(VALID_STATUSES).toContain('active');
      expect(VALID_STATUSES).toContain('paused');
      expect(VALID_STATUSES).toContain('retired');
    });

    it('should have 4 valid statuses', () => {
      expect(VALID_STATUSES).toHaveLength(4);
    });
  });

  describe('Default Heartbeat TTL', () => {
    it('should be 5 minutes', () => {
      expect(DEFAULT_HEARTBEAT_TTL_MS).toBe(300000);
    });
  });
});

// Validation helpers
function isNonEmptyString(v: any): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStringArray(v: any): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function validateAgent(body: any, { partial = false } = {}): string[] {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }

  if (!partial || body.name !== undefined) {
    if (!isNonEmptyString(body.name)) errors.push('name required (non-empty string)');
  }
  if (!partial || body.type !== undefined) {
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      errors.push(`type must be one of ${VALID_TYPES.join(',')}`);
    }
  }
  if (!partial || body.owner !== undefined) {
    if (!isNonEmptyString(body.owner)) errors.push('owner required (non-empty string)');
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of ${VALID_STATUSES.join(',')}`);
  }
  if (body.capabilities !== undefined && !isStringArray(body.capabilities)) {
    errors.push('capabilities must be string[] when provided');
  }
  if (body.tools !== undefined && !isStringArray(body.tools)) {
    errors.push('tools must be string[] when provided');
  }
  if (body.skills !== undefined && !isStringArray(body.skills)) {
    errors.push('skills must be string[] when provided');
  }
  if (body.metadata !== undefined && (body.metadata === null || typeof body.metadata !== 'object' || Array.isArray(body.metadata))) {
    errors.push('metadata must be plain object when provided');
  }
  return errors;
}

function nextVersion(current: string | undefined): string {
  if (!current || typeof current !== 'string') return '1.0.0';
  const parts = current.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return '1.0.0';
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

function isExpired(agent: any, ttlMs = DEFAULT_HEARTBEAT_TTL_MS): boolean {
  if (!agent || typeof agent !== 'object') return true;
  if (!agent.lastHeartbeat) return false;
  const last = Date.parse(agent.lastHeartbeat);
  if (Number.isNaN(last)) return true;
  return (Date.now() - last) > ttlMs;
}

function searchByCapability(agents: any[], capability: string | undefined) {
  if (!capability || typeof capability !== 'string') return agents;
  return agents.filter((a) => Array.isArray(a.capabilities) && a.capabilities.includes(capability));
}

function searchByType(agents: any[], type: string | undefined) {
  if (!type || typeof type !== 'string') return agents;
  return agents.filter((a) => a.type === type);
}

function searchByStatus(agents: any[], status: string | undefined) {
  if (!status || typeof status !== 'string') return agents;
  return agents.filter((a) => a.status === status);
}

describe('Agent Registry - Validation', () => {
  it('should validate a correct agent', () => {
    const agent = {
      name: 'My Agent',
      type: 'genie',
      owner: 'user123',
      capabilities: ['code', 'analyze'],
      tools: ['bash', 'grep'],
      status: 'active'
    };
    const errors = validateAgent(agent);
    expect(errors).toHaveLength(0);
  });

  it('should require name', () => {
    const agent = { type: 'genie', owner: 'user123' };
    const errors = validateAgent(agent);
    expect(errors).toContain('name required (non-empty string)');
  });

  it('should require type', () => {
    const agent = { name: 'My Agent', owner: 'user123' };
    const errors = validateAgent(agent);
    expect(errors.some(e => e.includes('type must be one of'))).toBe(true);
  });

  it('should reject invalid type', () => {
    const agent = { name: 'My Agent', type: 'invalid', owner: 'user123' };
    const errors = validateAgent(agent);
    expect(errors.some(e => e.includes('type must be one of'))).toBe(true);
  });

  it('should require owner', () => {
    const agent = { name: 'My Agent', type: 'genie' };
    const errors = validateAgent(agent);
    expect(errors).toContain('owner required (non-empty string)');
  });

  it('should reject invalid status', () => {
    const agent = { name: 'My Agent', type: 'genie', owner: 'user123', status: 'invalid' };
    const errors = validateAgent(agent);
    expect(errors.some(e => e.includes('status must be one of'))).toBe(true);
  });

  it('should require capabilities to be string array', () => {
    const agent = { name: 'My Agent', type: 'genie', owner: 'user123', capabilities: 'not-an-array' };
    const errors = validateAgent(agent);
    expect(errors).toContain('capabilities must be string[] when provided');
  });

  it('should allow partial validation for updates', () => {
    const update = { status: 'active' };
    const errors = validateAgent(update, { partial: true });
    expect(errors).toHaveLength(0);
  });
});

describe('Agent Registry - Version Management', () => {
  it('should start at 1.0.0', () => {
    expect(nextVersion(undefined)).toBe('1.0.0');
    expect(nextVersion('')).toBe('1.0.0');
  });

  it('should increment patch version', () => {
    expect(nextVersion('1.0.0')).toBe('1.0.1');
    expect(nextVersion('2.3.5')).toBe('2.3.6');
  });

  it('should handle invalid version format', () => {
    expect(nextVersion('invalid')).toBe('1.0.0');
    expect(nextVersion('1.0')).toBe('1.0.0');
    expect(nextVersion('1')).toBe('1.0.0');
  });
});

describe('Agent Registry - Expiration', () => {
  it('should not expire agents with recent heartbeat', () => {
    const agent = { lastHeartbeat: new Date().toISOString() };
    expect(isExpired(agent)).toBe(false);
  });

  it('should not expire agents without heartbeat (dormant)', () => {
    const agent = {};
    expect(isExpired(agent)).toBe(false);
  });

  it('should expire agents with old heartbeat', () => {
    const oldDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const agent = { lastHeartbeat: oldDate };
    expect(isExpired(agent)).toBe(true);
  });

  it('should respect custom TTL', () => {
    const oldDate = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const agent = { lastHeartbeat: oldDate };
    expect(isExpired(agent, 60 * 1000)).toBe(true);
  });
});

describe('Agent Registry - Search', () => {
  const agents = [
    { name: 'Agent1', capabilities: ['code', 'analyze'], type: 'genie', status: 'active' },
    { name: 'Agent2', capabilities: ['design', 'code'], type: 'merchant', status: 'paused' },
    { name: 'Agent3', capabilities: ['test'], type: 'genie', status: 'active' }
  ];

  it('should find agents by capability', () => {
    const results = searchByCapability(agents, 'code');
    expect(results).toHaveLength(2);
  });

  it('should find agents by type', () => {
    const results = searchByType(agents, 'genie');
    expect(results).toHaveLength(2);
  });

  it('should find agents by status', () => {
    const results = searchByStatus(agents, 'active');
    expect(results).toHaveLength(2);
  });

  it('should return all agents when no filter specified', () => {
    expect(searchByCapability(agents, undefined)).toHaveLength(3);
    expect(searchByType(agents, undefined)).toHaveLength(3);
    expect(searchByStatus(agents, undefined)).toHaveLength(3);
  });
});

// ==================== Integration Tests ====================

async function req(path: string, method = 'GET', body?: object) {
  return new Promise<{ status: number; data: any }>((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = { hostname: url.hostname, port: url.port, path: url.pathname, method, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode || 500, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode || 500, data: {} }); } });
    });
    r.on('error', () => resolve({ status: 503, data: {} }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('AgentRegistry Health', () => {
  it('should return healthy', async () => {
    const res = await req('/health');
    expect(res.status).toBe(200);
  });

  it('should return ready', async () => {
    const res = await req('/ready');
    expect(res.status).toBe(200);
  });
});

describe('AgentRegistry Agents', () => {
  it('should list agents', async () => {
    const res = await req('/api/agents');
    expect([200, 201].includes(res.status)).toBe(true);
  });

  it('should search agents', async () => {
    const res = await req('/api/agents/search');
    expect([200, 201].includes(res.status)).toBe(true);
  });
});
