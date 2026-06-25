/**
 * Tests for the HOJAI Foundation SDK v2
 *
 * Uses Node's built-in test runner. Run with:
 *   node --test dist/__tests__/index.test.js   (after npm run build)
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Mock fetch helper
// ---------------------------------------------------------------------------

type FetchHandler = (url: string, options: Record<string, unknown>) => MockResponse | Promise<MockResponse>;

interface MockResponse {
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
}

function withMockFetch(handler: FetchHandler, fn: () => void) {
  const original = globalThis.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = async (url: any, options: any) => {
    const urlStr = typeof url === 'string' ? url : String(url);
    const r: MockResponse = await handler(urlStr, options) as MockResponse;
    r.headers = r.headers || { get: () => 'application/json' };
    // Ensure both json and text are always present on the mock Response
    if (!('json' in r)) (r as any).json = async () => ({});
    if (!('text' in r)) (r as any).text = async () => '';
    return r as unknown as Response;
  };
  try { fn(); } finally { globalThis.fetch = original; }
}

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

const MOCK_TOKENS = {
  accessToken: 'eyJ.test.access',
  refreshToken: 'eyJ.test.refresh'
};

function mockLoginResponse() {
  return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => MOCK_TOKENS };
}

function mockUser(id = 'u-1', name = 'Alice') {
  return { id, name, email: `${name.toLowerCase()}@test.com`, role: 'user', status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
}

function mockMemory(id = 'mem-1') {
  return { id, type: 'fact', content: { value: true }, visibility: 'private', metadata: {}, tags: [], importance: 5, confidence: 1.0, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
}

function mockTwin(id = 'twin-1') {
  return { id, name: 'Test Twin', type: 'customer', metadata: {}, tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' };
}

function mockTrustScore(entityId = 'e-1') {
  return { entityId, trustScore: 0.92, level: 'gold', factors: {}, riskFlags: [], lastUpdated: '2026-01-01' };
}

function mockPlan(id = 'plan-1') {
  return { id, name: 'Test Plan', description: '', steps: [], version: 1, createdAt: '2026-01-01' };
}

function mockPolicy(id = 'pol-1') {
  return { id, name: 'Test Policy', category: 'access_control', rules: [], version: 1, status: 'draft', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
}

// ---------------------------------------------------------------------------
// Dynamic imports (ESM)
// ---------------------------------------------------------------------------

let Hojai: any;

beforeEach(async () => {
  // Clear module cache so we get a fresh Hojai class each test
  const cacheKey = `/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/sdk/hojai-foundation/dist/index.js`;
  for (const key of Object.keys(globalThis)) {
    if (key.startsWith('__hojai_test_')) delete (globalThis as any)[key];
  }

  // Import the built SDK
  const mod = await import('../index.js');
  Hojai = mod.Hojai;
});

// ---------------------------------------------------------------------------
// Auth tests
// ---------------------------------------------------------------------------

test('Hojai.login() calls POST /api/identity/auth/login and stores tokens', async () => {
  let captured: { url: string; body: { email: string; password: string } } | null = null;

  withMockFetch(async (url, options) => {
    captured = { url: String(url), body: JSON.parse(String(options.body || '{}')) };
    return mockLoginResponse();
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    await hojai.login('alice@test.com', 'secret123');

    assert.equal(captured?.url, 'http://localhost:9999/api/identity/auth/login');
    assert.equal(captured?.body.email, 'alice@test.com');
    assert.equal(captured?.body.password, 'secret123');
    assert.equal(hojai.isAuthenticated, true);
  });
});

test('Hojai.logout() clears tokens', async () => {
  withMockFetch(async () => mockLoginResponse(), async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake-token';
    hojai['_authState'].refreshToken = 'fake-refresh';
    assert.equal(hojai.isAuthenticated, true);

    await hojai.logout();
    assert.equal(hojai.isAuthenticated, false);
  });
});

test('Hojai.login() called twice replaces tokens', async () => {
  let callCount = 0;
  withMockFetch(async () => {
    callCount++;
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ accessToken: `token-${callCount}`, refreshToken: `refresh-${callCount}` }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    await hojai.login('alice@test.com', 'pw1');
    await hojai.login('alice@test.com', 'pw2');
    assert.equal(hojai['_authState'].accessToken, 'token-2');
  });
});

// ---------------------------------------------------------------------------
// CorpID tests
// ---------------------------------------------------------------------------

test('hojai.corpId.create() sends POST to /api/identity/auth/register with correct body', async () => {
  let captured: { url: string; body: Record<string, unknown> } | null = null;

  withMockFetch(async (url, options) => {
    captured = { url: String(url), body: JSON.parse(String(options.body || '{}')) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' }, json: async () => mockUser() };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    const result = await hojai.corpId.create({
      type: 'user',
      metadata: { name: 'Bob', email: 'bob@test.com' }
    });

    assert.equal(captured?.url, 'http://localhost:9999/api/identity/auth/register');
    assert.equal(captured?.body.email, 'bob@test.com');
    assert.equal(captured?.body.name, 'Bob');
    assert.equal(captured?.body.role, 'user');
    assert.equal(result.id, 'u-1');
  });
});

test('hojai.corpId.me() sends GET to /api/identity/profile with token', async () => {
  let capturedHeaders: Record<string, string> = {};

  withMockFetch(async (url, options) => {
    capturedHeaders = (options.headers as Record<string, string>) || {};
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => mockUser('me-1', 'CurrentUser') };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'my-secret-token';
    const result = await hojai.corpId.me();

    assert.equal(capturedHeaders['Authorization'], 'Bearer my-secret-token');
    assert.equal(result.name, 'CurrentUser');
  });
});

test('hojai.corpId.get(id) sends GET to /api/identity/users/:id', async () => {
  let capturedUrl = '';

  withMockFetch(async (url) => {
    capturedUrl = String(url);
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => mockUser('u-42') };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    const result = await hojai.corpId.get('u-42');

    assert.ok(capturedUrl.includes('/api/identity/users/u-42'));
    assert.equal(result.id, 'u-42');
  });
});

// ---------------------------------------------------------------------------
// Memory tests
// ---------------------------------------------------------------------------

test('hojai.memory.write() sends POST to /api/memory/memories with scope → metadata transform', async () => {
  let captured: { url: string; body: Record<string, unknown> } | null = null;

  withMockFetch(async (url, options) => {
    captured = { url: String(url), body: JSON.parse(String(options.body || '{}')) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' }, json: async () => mockMemory() };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    await hojai.memory.write({
      type: 'preference',
      scope: { ownerId: 'corp-1', ownerType: 'company' },
      content: { theme: 'dark' },
      confidence: 0.95,
      ttlSeconds: 86400
    });

    assert.equal(captured?.url, 'http://localhost:9999/api/memory/memories');
    assert.equal(captured?.body.type, 'preference');
    assert.deepEqual(captured?.body.metadata, { ownerId: 'corp-1', ownerType: 'company', confidence: 0.95, importance: 5, ttl: 86400, tags: [] });
  });
});

test('hojai.memory.search() sends POST to /api/memory/memories/search', async () => {
  let capturedUrl = '';

  withMockFetch(async (url) => {
    capturedUrl = String(url);
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ data: [mockMemory('m-1'), mockMemory('m-2')] }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    const results = await hojai.memory.search({ query: 'hello', type: 'fact' });

    assert.ok(capturedUrl.includes('/api/memory/memories/search'));
    assert.equal(results.length, 2);
  });
});

test('hojai.memory.delete() sends DELETE to /api/memory/memories/:id', async () => {
  let captured: { url: string; method: string } | null = null;

  withMockFetch(async (url, options) => {
    captured = { url: String(url), method: String(options.method || 'GET') };
    return { ok: true, status: 204, headers: { get: () => '' }, json: async () => ({}) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    await hojai.memory.delete('mem-99');

    assert.equal(captured?.method, 'DELETE');
    assert.ok(captured?.url.includes('/api/memory/memories/mem-99'));
  });
});

// ---------------------------------------------------------------------------
// Twin tests
// ---------------------------------------------------------------------------

test('hojai.twin.create() sends POST to /api/twins with {type, name, attributes}', async () => {
  let captured: { url: string; body: Record<string, unknown> } | null = null;

  withMockFetch(async (url, options) => {
    captured = { url: String(url), body: JSON.parse(String(options.body || '{}')) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' }, json: async () => ({ twin: mockTwin() }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    await hojai.twin.create({
      type: 'customer',
      name: 'Alice Twin',
      attributes: { email: 'alice@test.com' }
    });

    assert.equal(captured?.url, 'http://localhost:9999/api/twins');
    assert.equal(captured?.body.type, 'customer');
    assert.equal(captured?.body.name, 'Alice Twin');
    assert.deepEqual(captured?.body.metadata, { email: 'alice@test.com' });
    assert.ok((captured?.body.id as string).startsWith('twin-'));
  });
});

test('hojai.twin.get() unwraps {success:true, twin} envelope', async () => {
  let capturedUrl = '';

  withMockFetch(async (url) => {
    capturedUrl = String(url);
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ success: true, twin: mockTwin('twin-abc') }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    const result = await hojai.twin.get('twin-abc');

    assert.equal(result.id, 'twin-abc');
    assert.equal(result.name, 'Test Twin');
  });
});

// ---------------------------------------------------------------------------
// Trust tests
// ---------------------------------------------------------------------------

test('hojai.trust.getScore() sends GET to /api/foundation/sada-os/trust/:entityId', async () => {
  let capturedUrl = '';

  withMockFetch(async (url) => {
    capturedUrl = String(url);
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => mockTrustScore('ent-42') };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    const result = await hojai.trust.getScore('ent-42');

    assert.ok(capturedUrl.includes('/api/foundation/sada-os/trust/ent-42'));
    assert.equal(result.trustScore, 0.92);
  });
});

test('hojai.trust.verify() sends POST to /api/foundation/sada-os/verification', async () => {
  let capturedUrl = '';

  withMockFetch(async (url) => {
    capturedUrl = String(url);
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ verificationId: 'v-1', entityId: 'ent-1', status: 'approved', verificationType: 'kyc' }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    const result = await hojai.trust.verify({ entityId: 'ent-1', verificationType: 'kyc', evidence: { document: 'passport' } });

    assert.ok(capturedUrl.includes('/api/foundation/sada-os/verification'));
    assert.equal(result.status, 'approved');
  });
});

// ---------------------------------------------------------------------------
// Flow tests
// ---------------------------------------------------------------------------

test('hojai.flow.create() sends POST to /api/foundation/flow-orchestrator/plans', async () => {
  let captured: { url: string; body: Record<string, unknown> } | null = null;

  withMockFetch(async (url, options) => {
    captured = { url: String(url), body: JSON.parse(String(options.body || '{}')) };
    return { ok: true, status: 201, headers: { get: () => 'application/json' }, json: async () => mockPlan() };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    await hojai.flow.create({
      name: 'Onboard Flow',
      steps: [{ name: 'greet', type: 'log' as const }]
    });

    assert.equal(captured?.url, 'http://localhost:9999/api/foundation/flow-orchestrator/plans');
    assert.equal(captured?.body.name, 'Onboard Flow');
    assert.ok(Array.isArray(captured?.body.steps));
  });
});

test('hojai.flow.list() returns plans[] from { plans: [] } wrapper', async () => {
  withMockFetch(async () => {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ plans: [mockPlan('p-1'), mockPlan('p-2')] }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    const plans = await hojai.flow.list();

    assert.equal(plans.length, 2);
    assert.equal(plans[0].id, 'p-1');
  });
});

test('hojai.flow.run() sends POST to /api/foundation/flow-orchestrator/executions', async () => {
  let capturedUrl = '';

  withMockFetch(async (url) => {
    capturedUrl = String(url);
    return { ok: true, status: 202, headers: { get: () => 'application/json' }, json: async () => ({ executionId: 'exec-1', status: 'running' }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    const result = await hojai.flow.run('plan-1', { inputs: { userId: 'u-1' } });

    assert.ok(capturedUrl.includes('/api/foundation/flow-orchestrator/executions'));
    assert.equal(result.executionId, 'exec-1');
  });
});

// ---------------------------------------------------------------------------
// Policy tests
// ---------------------------------------------------------------------------

test('hojai.policy.evaluate() sends POST to /api/foundation/policy-os/policies/evaluate with action in context', async () => {
  let captured: { url: string; body: Record<string, unknown> } | null = null;

  withMockFetch(async (url, options) => {
    captured = { url: String(url), body: JSON.parse(String(options.body || '{}')) };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ allowed: true, reasons: ['rule-1 matched'], evaluatedAt: new Date().toISOString() }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    const result = await hojai.policy.evaluate({
      action: 'send_email',
      context: { recipient: 'bob@test.com' },
      corpId: 'corp-1'
    });

    assert.ok(captured?.url.includes('/api/foundation/policy-os/policies/evaluate'));
    assert.equal((captured?.body.context as any)?.action, 'send_email');
    assert.equal((captured?.body.context as any)?.corpId, 'corp-1');
    assert.equal(result.allowed, true);
  });
});

test('hojai.policy.list() returns policies[] from { count, policies } wrapper', async () => {
  withMockFetch(async () => {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ count: 2, policies: [mockPolicy('pol-1'), mockPolicy('pol-2')] }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    const policies = await hojai.policy.list({ category: 'access_control' });

    assert.equal(policies.length, 2);
    assert.equal(policies[0].id, 'pol-1');
  });
});

// ---------------------------------------------------------------------------
// Error handling tests
// ---------------------------------------------------------------------------

test('401 response throws HojaiAuthError', async () => {
  let caught: Error | null = null;

  withMockFetch(async () => {
    return { ok: false, status: 401, headers: { get: () => 'application/json' }, json: async () => ({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'bad-token';
    try {
      await hojai.corpId.me();
    } catch (e) {
      caught = e as Error;
    }

    assert.ok(caught !== null);
    assert.equal(caught!.name, 'HojaiAuthError');
    assert.ok(caught!.message.includes('401'));
  });
});

test('{ success: false, error } envelope throws HojaiApiError with code and status', async () => {
  let caught: Error | null = null;

  withMockFetch(async () => {
    return { ok: false, status: 409, headers: { get: () => 'application/json' }, json: async () => ({ success: false, error: { code: 'TWIN_EXISTS', message: 'Twin already exists' } }) };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999' });
    hojai['_authState'].accessToken = 'fake';
    try {
      await hojai.twin.create({ type: 'customer', name: 'Existing' });
    } catch (e) {
      caught = e as Error;
    }

    assert.ok(caught !== null);
    assert.equal(caught!.name, 'HojaiApiError');
    assert.equal((caught as any).code, 'TWIN_EXISTS');
    assert.equal((caught as any).statusCode, 409);
  });
});

test('500 response retries then throws HojaiApiError', async () => {
  let attemptCount = 0;
  let caught: Error | null = null;

  withMockFetch(async () => {
    attemptCount++;
    return { ok: false, status: 500, headers: { get: () => 'text/plain' }, json: async () => 'Internal Server Error', text: async () => 'Internal Server Error' };
  }, async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999', maxRetries: 2 });
    hojai['_authState'].accessToken = 'fake';
    try {
      await hojai.corpId.get('test-id');
    } catch (e) {
      caught = e as Error;
    }

    // 1 initial attempt + 2 retries = 3 total
    assert.equal(attemptCount, 3);
    assert.ok(caught !== null);
    assert.ok(caught!.message.includes('500'));
  });
});

// ---------------------------------------------------------------------------
// Config defaults tests
// ---------------------------------------------------------------------------

test('baseUrl defaults to http://localhost:4399', async () => {
  withMockFetch(async (url) => {
    assert.ok(String(url).startsWith('http://localhost:4399'));
    return mockLoginResponse();
  }, async () => {
    const hojai = new Hojai();
    assert.equal(hojai.config.baseUrl, 'http://localhost:4399');
  });
});

test('custom logger is called on request', async () => {
  const logs: Array<{ level: string; msg: string }> = [];

  withMockFetch(async () => mockLoginResponse(), async () => {
    const hojai = new Hojai({ baseUrl: 'http://localhost:9999', logger: (level: string, msg: string) => logs.push({ level, msg }) });
    hojai['_authState'].accessToken = 'fake';
    await hojai.corpId.me();

    assert.ok(logs.some(l => l.level === 'debug' && l.msg.includes('GET')));
  });
});
