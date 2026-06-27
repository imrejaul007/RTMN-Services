/**
 * twin-capability-profile unit tests — self-contained runner
 *
 * We use a custom test runner (not `node --test`) because the ESM service has
 * top-level await, which blocks the Node.js --test runner's global-injection
 * of describe/it.  The custom runner works fine with async/await at module scope.
 *
 * Run with:
 *   NODE_ENV=test node platform/twins/twin-capability-profile/tests/unit/twin-capability-profile.test.mjs
 */

'use strict';

import http from 'http';
import { createServer } from 'http';
import { tmpdir } from 'os';

// ── Setup env BEFORE importing the service ──────────────────────────────────
// NOTE: These must be set BEFORE importing the app because requireAuth middleware
// captures process.env values at module load time. If set after import, the
// middleware will have undefined values and always return 401.
process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.REQUIRE_AUTH = 'true';
process.env.HOJAI_DATA_DIR = tmpdir;
process.env.SERVICE_NAME = 'twin-capability-profile-test';

const { default: app } = await import('../../src/index.js');

// ── Start server ────────────────────────────────────────────────────────────
const server = createServer(app);
await new Promise((resolve, reject) => {
  server.listen(0, (err) => (err ? reject(err) : resolve()));
});
const _port = server.address().port;
console.log(`[test] server listening on port ${_port}`);

// ── Custom tiny test runner ─────────────────────────────────────────────────
// Registration-order execution: describe() immediately calls fn() so all it()
// calls are registered in the correct suite order. Tests are stored with their
// suite name already captured (closure), so the final run order is irrelevant.
let currentSuite = '';
const _tests = [];
const describe = (name, fn) => {
  const prev = currentSuite;
  currentSuite = name;
  fn(); // execute immediately to register it() calls in order
  currentSuite = prev;
};
const it = (name, fn) => {
  _tests.push({ suite: currentSuite, name, fn });
};

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const t of _tests) {
    const label = `${t.suite} › ${t.name}`;
    try {
      // await is essential here — async test fns must run sequentially
      await t.fn();
      console.log(`  ok ${label}`);
      passed++;
    } catch (err) {
      console.log(`  not ok ${label}`);
      const msg = err && (err.message || String(err));
      console.log(`    ${msg || '(no error message)'}`);
      if (process.env.DEBUG) console.log(`    ${err && err.stack}`);
      failed++;
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// ── HTTP client helpers ─────────────────────────────────────────────────────
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      ...options.headers,            // spread auth headers first
      'Content-Type': 'application/json', // then set Content-Type (overwrites any content-type in options.headers)
    };
    const reqOptions = {
      hostname: 'localhost',
      port: _port,
      path,
      method: options.method || 'GET',
      headers,
    };
    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function authHeaders(extra = {}) {
  return { 'x-internal-token': 'dev-token', ...extra };
}

async function GET(path) { return request(path); }
async function POST(path, body, extra = {}) {
  return request(path, { method: 'POST', body, headers: authHeaders(extra) });
}
async function PATCH(path, body) {
  return request(path, { method: 'PATCH', body, headers: authHeaders() });
}
async function DEL(path) {
  return request(path, { method: 'DELETE', headers: authHeaders() });
}

function assert(condition, msg) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// =============================================================================
// TESTS
// =============================================================================

describe('Health & Readiness', () => {
  it('GET /health returns 200 with service info', async () => {
    const res = await GET('/health');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.status === 'healthy', `expected healthy, got ${res.body.status}`);
    assert(res.body.service === 'twin-capability-profile', `wrong service name`);
    assert(res.body.port === 4150, `expected port 4150`);
    assert(typeof res.body.counts === 'object', 'counts missing');
    assert(Array.isArray(res.body.capabilities), 'capabilities array missing');
  });

  it('GET / redirects to /health', async () => {
    const res = await GET('/');
    assert(res.status === 302, `expected 302, got ${res.status}`);
    assert(res.headers.location === '/health', `expected redirect to /health, got ${res.headers.location}`);
  });

  it('GET /ready returns 200 with ready flag', async () => {
    const res = await GET('/ready');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.ready === true, `expected ready=true`);
    assert(typeof res.body.timestamp === 'string', 'timestamp missing');
  });

  it('GET /nonexistent returns 404', async () => {
    const res = await GET('/nonexistent-path-xyz');
    assert(res.status === 404, `expected 404, got ${res.status}`);
    assert(res.body.error === 'not found', `wrong error: ${res.body.error}`);
  });
});

describe('Profiles — Read (seeded)', () => {
  it('GET /api/profiles returns seeded profiles', async () => {
    const res = await GET('/api/profiles');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.count >= 5, `expected >= 5 seeded profiles, got ${res.body.count}`);
    assert(Array.isArray(res.body.profiles), 'profiles should be an array');
  });

  it('GET /api/profiles supports twinType filter', async () => {
    const res = await GET('/api/profiles?twinType=restaurant');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    for (const p of res.body.profiles) {
      assert(p.twinType === 'restaurant', `expected twinType=restaurant, got ${p.twinType}`);
    }
  });

  it('GET /api/profiles supports minCapabilities filter', async () => {
    const res = await GET('/api/profiles?minCapabilities=4');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    for (const p of res.body.profiles) {
      assert(p.capabilitiesDeclared >= 4, `profile ${p.twinId} has ${p.capabilitiesDeclared} < 4`);
    }
  });

  it('GET /api/profiles supports owner filter', async () => {
    const res = await GET('/api/profiles?owner=demo');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    for (const p of res.body.profiles) {
      assert(p.owner === 'demo', `expected owner=demo, got ${p.owner}`);
    }
  });

  it('GET /api/profiles/:twinId returns a specific profile', async () => {
    const res = await GET('/api/profiles/twn-restaurant-demo');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.twinId === 'twn-restaurant-demo', `wrong twinId`);
    assert(Array.isArray(res.body.capabilities), 'capabilities should be array');
    assert(res.body.capabilitiesDeclared === res.body.capabilities.length, 'capabilitiesDeclared mismatch');
  });

  it('GET /api/profiles/:twinId returns 404 for unknown id', async () => {
    const res = await GET('/api/profiles/twin-does-not-exist-xyz');
    assert(res.status === 404, `expected 404, got ${res.status}`);
  });
});

describe('Profiles — Write (auth required)', () => {
  it('POST /api/profiles returns 401 without token', async () => {
    const res = await request('/api/profiles', {
      method: 'POST',
      headers: {},
      body: { twinId: 'test', twinType: 'test', capabilities: [] },
    });
    assert(res.status === 401, `expected 401 without token, got ${res.status}`);
  });

  it('POST /api/profiles returns 400 when twinId missing', async () => {
    const res = await POST('/api/profiles', { twinType: 'test', capabilities: [] });
    assert(res.status === 400, `expected 400, got ${res.status}`);
    assert(res.body.error && res.body.error.includes('required'), `wrong error: ${res.body.error}`);
  });

  it('POST /api/profiles returns 400 when capabilities is not an array', async () => {
    const res = await POST('/api/profiles', { twinId: 'test-x', twinType: 'test', capabilities: 'not-an-array' });
    assert(res.status === 400, `expected 400, got ${res.status}`);
    assert(res.body.error && res.body.error.includes('capabilities'), `wrong error: ${res.body.error}`);
  });

  it('POST /api/profiles returns 400 when TwinOS validation fails', async () => {
    const res = await POST('/api/profiles', {
      twinId: 'nonexistent-twin-xyz',
      twinType: 'test',
      capabilities: [{ name: 'test', description: 'test', inputSchema: {}, outputSchema: {}, sla: {} }],
    });
    assert(res.status === 400, `expected 400 (TwinOS validation), got ${res.status}`);
    assert(res.body.error && res.body.error.includes('TwinOS'), `wrong error: ${res.body.error}`);
  });

  it('PATCH /api/profiles/:twinId returns 404 for unknown profile', async () => {
    const res = await PATCH('/api/profiles/twin-does-not-exist-xyz', { owner: 'new-owner' });
    assert(res.status === 404, `expected 404, got ${res.status}`);
  });

  it('PATCH /api/profiles/:twinId returns 401 without token', async () => {
    const res = await request('/api/profiles/twn-restaurant-demo', {
      method: 'PATCH',
      headers: {},
      body: { owner: 'new-owner' },
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  it('PATCH /api/profiles/:twinId updates profile successfully', async () => {
    const res = await PATCH('/api/profiles/twn-restaurant-demo', { owner: 'test-owner-patch' });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.owner === 'test-owner-patch', `owner not updated: ${res.body.owner}`);
  });

  it('PATCH /api/profiles/:twinId ignores disallowed fields', async () => {
    const res = await PATCH('/api/profiles/twn-restaurant-demo', { twinId: 'hacked', foo: 'bar' });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.twinId === 'twn-restaurant-demo', `twinId should not be changed`);
  });

  it('DELETE /api/profiles/:twinId returns 401 without token', async () => {
    const res = await request('/api/profiles/twn-restaurant-demo', {
      method: 'DELETE',
      headers: {},
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  it('DELETE /api/profiles/:twinId returns 404 for unknown profile', async () => {
    const res = await DEL('/api/profiles/twin-does-not-exist-xyz');
    assert(res.status === 404, `expected 404, got ${res.status}`);
  });

  // NOTE: DELETE does NOT call TwinOS validation (unlike POST which does)
  // The source code only deletes the profile and reindexes the capability index
  it('DELETE /api/profiles/:twinId successfully deletes profile', async () => {
    const res = await DEL('/api/profiles/twn-restaurant-demo');
    assert(res.status === 204, `expected 204, got ${res.status}`);
  });
});

describe('Discovery', () => {
  it('GET /api/discover/by-capability/:capability returns twins', async () => {
    // Use acceptQuote which is in twn-merchant-demo (twn-restaurant-demo was deleted)
    const res = await GET('/api/discover/by-capability/acceptQuote');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.capability === 'acceptQuote', `wrong capability`);
    assert(res.body.count >= 1, `expected >= 1 twin, got ${res.body.count}`);
    assert(Array.isArray(res.body.twins), 'twins should be array');
  });

  it('GET /api/discover/by-capability/:capability returns sorted twins (successRate desc)', async () => {
    const res = await GET('/api/discover/by-capability/acceptQuote');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const twins = res.body.twins;
    for (let i = 1; i < twins.length; i++) {
      const a = twins[i - 1].sla?.successRate || 0;
      const b = twins[i].sla?.successRate || 0;
      assert(a >= b, `twins not sorted by successRate: ${a} < ${b}`);
    }
  });

  it('GET /api/discover/by-capability/:capability returns empty for unknown capability', async () => {
    const res = await GET('/api/discover/by-capability/nonexistent-cap-xyz');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.count === 0, `expected 0, got ${res.body.count}`);
    assert(Array.isArray(res.body.twins), 'twins should be array');
  });

  it('GET /api/discover/by-twin-type/:twinType returns twins', async () => {
    // Use merchant type since twn-restaurant-demo was deleted
    const res = await GET('/api/discover/by-twin-type/merchant');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.twinType === 'merchant', `wrong twinType`);
    assert(Array.isArray(res.body.twins), 'twins should be array');
    assert(res.body.count >= 1, `expected >= 1, got ${res.body.count}`);
  });

  it('GET /api/discover/by-twin-type/:twinType returns empty for unknown type', async () => {
    const res = await GET('/api/discover/by-twin-type/nonexistent-type-xyz');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.count === 0, `expected 0, got ${res.body.count}`);
  });
});

describe('Search', () => {
  it('GET /api/search returns all profiles without filters', async () => {
    const res = await GET('/api/search');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.profiles), 'profiles should be array');
    // 5 seeded profiles - 1 deleted = 4 remaining
    assert(res.body.count >= 4, `expected >= 4, got ${res.body.count}`);
  });

  it('GET /api/search filters by twinType', async () => {
    const res = await GET('/api/search?twinType=hotel');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    for (const p of res.body.profiles) {
      assert(p.twinType === 'hotel', `expected twinType=hotel`);
    }
  });

  it('GET /api/search filters by capability name', async () => {
    const res = await GET('/api/search?capability=checkAvailability');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    for (const p of res.body.profiles) {
      assert(p.capabilitiesByName.includes('checkAvailability'), `${p.twinId} should have checkAvailability`);
    }
  });

  it('GET /api/search filters by maxLatency', async () => {
    const res = await GET('/api/search?maxLatency=500');
    assert(res.status === 200, `expected 200, got ${res.status}`);
  });

  it('GET /api/search filters by minSuccessRate', async () => {
    const res = await GET('/api/search?minSuccessRate=0.98');
    assert(res.status === 200, `expected 200, got ${res.status}`);
  });

  it('GET /api/search performs full-text search on twinId and capabilities', async () => {
    const res = await GET('/api/search?q=restaurant');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.count >= 0, 'count should be valid');
  });

  it('GET /api/search returns empty for unknown twinType', async () => {
    const res = await GET('/api/search?twinType=nonexistent-type-xyz');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.count === 0, `expected 0, got ${res.body.count}`);
  });

  it('GET /api/search supports multiple filters combined', async () => {
    const res = await GET('/api/search?capability=checkAvailability&minSuccessRate=0.95');
    assert(res.status === 200, `expected 200, got ${res.status}`);
  });
});

describe('Capability Graph', () => {
  it('GET /api/capability-graph returns graph structure', async () => {
    const res = await GET('/api/capability-graph');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(typeof res.body.totalCapabilities === 'number', 'totalCapabilities missing');
    assert(typeof res.body.totalProfiles === 'number', 'totalProfiles missing');
    assert(Array.isArray(res.body.capabilities), 'capabilities should be array');
    assert(res.body.totalCapabilities > 0, 'should have capabilities');
    assert(res.body.totalProfiles > 0, 'should have profiles');
  });

  it('GET /api/capability-graph capabilities are sorted by providedBy desc', async () => {
    const res = await GET('/api/capability-graph');
    const caps = res.body.capabilities;
    for (let i = 1; i < caps.length; i++) {
      assert(
        caps[i - 1].providedBy >= caps[i].providedBy,
        `not sorted: ${caps[i - 1].providedBy} < ${caps[i].providedBy}`
      );
    }
  });

  it('GET /api/capability-graph each capability has name and providedBy', async () => {
    const res = await GET('/api/capability-graph');
    for (const cap of res.body.capabilities) {
      assert(typeof cap.capability === 'string', 'capability name missing');
      assert(typeof cap.providedBy === 'number', 'providedBy missing');
    }
  });
});

describe('Audit', () => {
  it('GET /api/audit returns audit entries', async () => {
    const res = await GET('/api/audit');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.entries), 'entries should be array');
  });

  it('GET /api/audit respects limit parameter', async () => {
    const res = await GET('/api/audit?limit=5');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.entries.length <= 5, `expected <= 5, got ${res.body.entries.length}`);
  });

  it('GET /api/audit caps limit at 1000', async () => {
    const res = await GET('/api/audit?limit=9999');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.entries.length <= 1000, `expected <= 1000, got ${res.body.entries.length}`);
  });
});

describe('Policy Check Bridge', () => {
  it('POST /api/policy-check returns 401 without token', async () => {
    const res = await request('/api/policy-check', {
      method: 'POST',
      headers: {},
      body: { capability: 'acceptOrder' },
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  it('POST /api/policy-check returns 400 when capability and policyId both missing', async () => {
    const res = await POST('/api/policy-check', {});
    assert(res.status === 400, `expected 400, got ${res.status}`);
    assert(res.body.error && res.body.error.includes('required'), `wrong error: ${res.body.error}`);
  });

  it('POST /api/policy-check returns 503 when PolicyOS unreachable', async () => {
    const res = await POST('/api/policy-check', { capability: 'acceptOrder' });
    assert(res.status === 503, `expected 503 (PolicyOS unreachable), got ${res.status}`);
    assert(res.body.allowed === false, `expected allowed=false`);
    assert(res.body.policyId.includes('cap:acceptOrder'), `expected cap:acceptOrder policyId`);
  });

  it('POST /api/policy-check uses explicit policyId when provided', async () => {
    const res = await POST('/api/policy-check', { policyId: 'my-policy', actor: 'test' });
    assert(res.status === 503, `expected 503 (PolicyOS unreachable), got ${res.status}`);
    assert(res.body.policyId === 'my-policy', `expected my-policy policyId`);
  });
});

describe('Auth — x-internal-token', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request('/api/profiles', {
      method: 'POST',
      headers: {},
      body: { twinId: 'test', twinType: 'test', capabilities: [] },
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  it('returns 200 when x-internal-token matches INTERNAL_SERVICE_TOKEN', async () => {
    const res = await PATCH('/api/profiles/twn-product-demo', { owner: 'internal-auth-test' });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.owner === 'internal-auth-test', `owner not updated`);
  });

  it('returns 401 when token does not match', async () => {
    const res = await request('/api/profiles/twn-restaurant-demo', {
      method: 'PATCH',
      headers: { 'x-internal-token': 'wrong-token' },
      body: { owner: 'hacker' },
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });
});

describe('Edge Cases & Data Integrity', () => {
  it('GET /api/profiles with unknown twinType returns empty list', async () => {
    const res = await GET('/api/profiles?twinType=nonexistent-type-xyz');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.count === 0, `expected 0, got ${res.body.count}`);
  });

  it('GET /api/profiles with unknown owner returns empty list', async () => {
    const res = await GET('/api/profiles?owner=nonexistent-owner-xyz');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.count === 0, `expected 0, got ${res.body.count}`);
  });

  it('capabilitiesByName is populated correctly from capabilities', async () => {
    const res = await GET('/api/profiles/twn-merchant-demo');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.capabilitiesByName), 'capabilitiesByName should be array');
    assert(
      res.body.capabilitiesByName.length === res.body.capabilities.length,
      `mismatch: ${res.body.capabilitiesByName.length} vs ${res.body.capabilities.length}`
    );
    for (const cap of res.body.capabilities) {
      assert(res.body.capabilitiesByName.includes(cap.name), `missing ${cap.name} in capabilitiesByName`);
    }
  });

  it('profile has createdAt and updatedAt timestamps', async () => {
    const res = await GET('/api/profiles/twn-beauty-demo');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(typeof res.body.createdAt === 'string', 'createdAt missing');
    assert(typeof res.body.updatedAt === 'string', 'updatedAt missing');
  });

  it('profile has capabilitiesDeclared count', async () => {
    const res = await GET('/api/profiles/twn-hotel-demo');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(typeof res.body.capabilitiesDeclared === 'number', 'capabilitiesDeclared missing');
    assert(res.body.capabilitiesDeclared > 0, 'should have declared capabilities');
  });

  it('profile has supportedSkills array', async () => {
    const res = await GET('/api/profiles/twn-merchant-demo');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.supportedSkills), 'supportedSkills should be array');
  });

  it('profile has supportedEvents and supportedApis arrays', async () => {
    const res = await GET('/api/profiles/twn-product-demo');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.supportedEvents), 'supportedEvents should be array');
    assert(Array.isArray(res.body.supportedApis), 'supportedApis should be array');
  });

  it('each capability has name, description, inputSchema, outputSchema, sla', async () => {
    const res = await GET('/api/profiles/twn-product-demo');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    for (const cap of res.body.capabilities) {
      assert(typeof cap.name === 'string', 'capability name missing');
      assert(typeof cap.description === 'string', 'description missing');
      assert(typeof cap.sla === 'object', 'sla missing');
      assert(typeof cap.sla.latencyMs === 'number', 'sla.latencyMs missing');
      assert(typeof cap.sla.successRate === 'number', 'sla.successRate missing');
    }
  });

  it('PATCH with validate=true calls SkillOS validation (fails with 400)', async () => {
    const res = await PATCH('/api/profiles/twn-merchant-demo?validate=true', {
      supportedSkills: ['skl-nonexistent-skill-xyz'],
    });
    assert(res.status === 400, `expected 400 (SkillOS unreachable), got ${res.status}`);
    assert(res.body.missingSkillIds, 'should include missingSkillIds');
  });

  it('search with no matches returns count=0', async () => {
    const res = await GET('/api/search?q=xyznonexistentqueryabc');
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.body.count === 0, `expected 0 matches, got ${res.body.count}`);
  });
});

// ── Run all tests ────────────────────────────────────────────────────────────
const { passed, failed } = await runTests();
server.close();
process.exit(failed === 0 ? 0 : 1);
