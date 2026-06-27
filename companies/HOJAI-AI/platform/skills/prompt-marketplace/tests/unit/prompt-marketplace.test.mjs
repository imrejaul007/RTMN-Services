/**
 * Prompt Marketplace - Comprehensive Unit Tests
 *
 * Tests all major routes: health, ready, 404, prompt CRUD, search/filtering,
 * purchase/install (reviews), versions, and auth.
 */

import http from 'node:http';
import { createServer } from 'node:http';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';

// Set env BEFORE importing the module
process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.REQUIRE_AUTH = 'true';
process.env.JWT_SECRET = 'test-secret-for-jwt-signing';
process.env.SERVICE_NAME = 'prompt-marketplace';

// Import the app
const app = (await import('../../src/index.js')).default;

let server;
let baseUrl;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: server.address().port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const authHeaders = { 'X-Internal-Token': 'dev-token' };

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

before(() => {
  return new Promise((resolve) => {
    server = createServer(app);
    server.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(() => {
  return new Promise((resolve) => server.close(resolve));
});

// =============================================================================
// HEALTH & READY
// =============================================================================

describe('Health & Ready endpoints', () => {
  it('GET /health returns healthy status', async () => {
    const res = await makeRequest('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'prompt-marketplace');
    assert.strictEqual(res.body.version, '1.0.0');
    assert.ok(res.body.counts);
    assert.ok(Array.isArray(res.body.capabilities));
    assert.ok(res.body.counts.prompts >= 4); // seeded data
  });

  it('GET / redirects to /health', async () => {
    const res = await makeRequest('GET', '/');
    // Express 5 uses 302 by default for redirects (Express 4 used 301)
    assert.ok(res.status === 301 || res.status === 302);
  });

  it('GET /ready returns readiness status', async () => {
    const res = await makeRequest('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
    assert.ok(res.body.timestamp);
  });
});

// =============================================================================
// 404 HANDLING
// =============================================================================

describe('404 Not Found handling', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await makeRequest('GET', '/nonexistent');
    assert.strictEqual(res.status, 404);
    assert.ok(res.body.error);
  });

  it('returns 404 for unknown API routes', async () => {
    const res = await makeRequest('GET', '/api/unknown');
    assert.strictEqual(res.status, 404);
  });
});

// =============================================================================
// PROMPTS CRUD (auth required)
// =============================================================================

describe('Prompts CRUD', () => {
  let createdPromptId;

  it('POST /api/prompts - creates a new prompt (auth required)', async () => {
    const newPrompt = {
      title: 'Test Prompt',
      model: 'gpt-4',
      body: 'You are a {{role}} assistant.',
      vars: ['role'],
      tags: ['test'],
      publisher: 'TestSuite',
      description: 'A test prompt',
      price: 10,
    };
    const res = await makeRequest('POST', '/api/prompts', newPrompt, authHeaders);
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.title, 'Test Prompt');
    assert.strictEqual(res.body.model, 'gpt-4');
    assert.strictEqual(res.body.price, 10);
    assert.strictEqual(res.body.currentVersion, 1);
    assert.strictEqual(res.body.status, 'published');
    createdPromptId = res.body.id;
  });

  it('POST /api/prompts - returns 401 without auth', async () => {
    const newPrompt = { title: 'Unauthorized', model: 'gpt-4', body: 'test' };
    const res = await makeRequest('POST', '/api/prompts', newPrompt);
    assert.strictEqual(res.status, 401);
  });

  it('POST /api/prompts - returns 400 for missing required fields', async () => {
    const res = await makeRequest('POST', '/api/prompts', { title: 'Only title' }, authHeaders);
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('required'));
  });

  it('GET /api/prompts - lists all prompts', async () => {
    const res = await makeRequest('GET', '/api/prompts');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.prompts));
    assert.ok(res.body.count >= 4); // seeded data + created prompt
  });

  it('GET /api/prompts/:id - retrieves a prompt by ID', async () => {
    const res = await makeRequest('GET', `/api/prompts/${createdPromptId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, createdPromptId);
    assert.strictEqual(res.body.title, 'Test Prompt');
  });

  it('GET /api/prompts/:id - returns 404 for unknown ID', async () => {
    const res = await makeRequest('GET', '/api/prompts/nonexistent-id');
    assert.strictEqual(res.status, 404);
  });

  it('PATCH /api/prompts/:id - updates a prompt (auth required)', async () => {
    const res = await makeRequest(
      'PATCH',
      `/api/prompts/${createdPromptId}`,
      { title: 'Updated Title', price: 15 },
      authHeaders
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.title, 'Updated Title');
    assert.strictEqual(res.body.price, 15);
    assert.ok(res.body.updatedAt);
  });

  it('PATCH /api/prompts/:id - returns 404 for unknown ID', async () => {
    const res = await makeRequest('PATCH', '/api/prompts/unknown-id', { title: 'X' }, authHeaders);
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/prompts/:id - deletes a prompt (auth required)', async () => {
    // Create a prompt to delete
    const createRes = await makeRequest(
      'POST',
      '/api/prompts',
      { title: 'ToDelete', model: 'gpt-4', body: 'delete me' },
      authHeaders
    );
    const deleteId = createRes.body.id;

    const res = await makeRequest('DELETE', `/api/prompts/${deleteId}`, null, authHeaders);
    assert.strictEqual(res.status, 204);

    // Verify deleted
    const getRes = await makeRequest('GET', `/api/prompts/${deleteId}`);
    assert.strictEqual(getRes.status, 404);
  });

  it('DELETE /api/prompts/:id - returns 404 for unknown ID', async () => {
    const res = await makeRequest('DELETE', '/api/prompts/unknown-id', null, authHeaders);
    assert.strictEqual(res.status, 404);
  });
});

// =============================================================================
// SEARCH & FILTERING
// =============================================================================

describe('Search & Filtering', () => {
  it('GET /api/prompts - filters by tag', async () => {
    const res = await makeRequest('GET', '/api/prompts?tag=restaurant');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.prompts));
    res.body.prompts.forEach((p) => assert.ok(p.tags.includes('restaurant')));
  });

  it('GET /api/prompts - filters by model', async () => {
    const res = await makeRequest('GET', '/api/prompts?model=gpt-4');
    assert.strictEqual(res.status, 200);
    res.body.prompts.forEach((p) => assert.strictEqual(p.model, 'gpt-4'));
  });

  it('GET /api/prompts - filters by publisher', async () => {
    const res = await makeRequest('GET', '/api/prompts?publisher=HOJAI');
    assert.strictEqual(res.status, 200);
    res.body.prompts.forEach((p) => assert.strictEqual(p.publisher, 'HOJAI'));
  });

  it('GET /api/prompts - filters by minRating', async () => {
    const res = await makeRequest('GET', '/api/prompts?minRating=4');
    assert.strictEqual(res.status, 200);
    res.body.prompts.forEach((p) => assert.ok(p.rating >= 4));
  });

  it('GET /api/prompts - filters by featured', async () => {
    const res = await makeRequest('GET', '/api/prompts?featured=true');
    assert.strictEqual(res.status, 200);
    res.body.prompts.forEach((p) => assert.strictEqual(p.featured, true));
  });

  it('GET /api/prompts - searches by query (q)', async () => {
    const res = await makeRequest('GET', '/api/prompts?q=restaurant');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.prompts.length > 0);
    res.body.prompts.forEach((p) => {
      const match = p.title.toLowerCase().includes('restaurant') ||
                    p.description.toLowerCase().includes('restaurant');
      assert.ok(match);
    });
  });

  it('GET /api/prompts - sorts by rating', async () => {
    const res = await makeRequest('GET', '/api/prompts?sort=rating');
    assert.strictEqual(res.status, 200);
    for (let i = 1; i < res.body.prompts.length; i++) {
      assert.ok(res.body.prompts[i - 1].rating >= res.body.prompts[i].rating);
    }
  });

  it('GET /api/prompts - sorts by sales', async () => {
    const res = await makeRequest('GET', '/api/prompts?sort=sales');
    assert.strictEqual(res.status, 200);
    for (let i = 1; i < res.body.prompts.length; i++) {
      assert.ok(res.body.prompts[i - 1].sales >= res.body.prompts[i].sales);
    }
  });
});

// =============================================================================
// FEATURED & TRENDING
// =============================================================================

describe('Featured & Trending', () => {
  it('GET /api/prompts/featured - returns featured prompts', async () => {
    const res = await makeRequest('GET', '/api/prompts/featured');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.prompts));
    res.body.prompts.forEach((p) => assert.strictEqual(p.featured, true));
  });

  it('GET /api/prompts/trending - returns top 10 by sales', async () => {
    const res = await makeRequest('GET', '/api/prompts/trending');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.prompts));
    assert.ok(res.body.prompts.length <= 10);
    for (let i = 1; i < res.body.prompts.length; i++) {
      assert.ok(res.body.prompts[i - 1].sales >= res.body.prompts[i].sales);
    }
  });
});

// =============================================================================
// VERSIONS
// =============================================================================

describe('Prompt Versions', () => {
  let promptId;

  beforeEach(async () => {
    // Create a prompt for version tests
    const res = await makeRequest(
      'POST',
      '/api/prompts',
      { title: 'VersionTest', model: 'gpt-4', body: 'Hello {{x}}!', vars: ['x'] },
      authHeaders
    );
    promptId = res.body.id;
  });

  it('POST /api/prompts/:id/versions - creates new version (auth required)', async () => {
    const res = await makeRequest(
      'POST',
      `/api/prompts/${promptId}/versions`,
      { body: 'v2 body', vars: ['x', 'y'], changelog: 'added y' },
      authHeaders
    );
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.versionId);
    assert.strictEqual(res.body.version, 2);
  });

  it('POST /api/prompts/:id/versions - returns 400 without body', async () => {
    const res = await makeRequest('POST', `/api/prompts/${promptId}/versions`, {}, authHeaders);
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/prompts/:id/versions - lists all versions', async () => {
    const res = await makeRequest('GET', `/api/prompts/${promptId}/versions`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.versions));
    assert.ok(res.body.count >= 1);
  });

  it('GET /api/prompts/:id/versions/:version - retrieves specific version', async () => {
    const res = await makeRequest('GET', `/api/prompts/${promptId}/versions/1`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.version, 1);
    assert.strictEqual(res.body.body, 'Hello {{x}}!');
  });

  it('GET /api/prompts/:id/versions/:version - returns 404 for unknown version', async () => {
    const res = await makeRequest('GET', `/api/prompts/${promptId}/versions/999`);
    assert.strictEqual(res.status, 404);
  });

  it('POST /api/prompts/:id/versions/:version/render - renders with vars (auth required)', async () => {
    const res = await makeRequest(
      'POST',
      `/api/prompts/${promptId}/versions/1/render`,
      { x: 'hello' },
      authHeaders
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.body, 'Hello hello!');
    assert.ok(res.body.missingVars);
  });

  it('POST /api/prompts/:id/versions/:version/render - handles missing vars', async () => {
    const res = await makeRequest(
      'POST',
      `/api/prompts/${promptId}/versions/1/render`,
      {},
      authHeaders
    );
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.body.includes('{{x}}')); // var not replaced
    assert.ok(res.body.missingVars.includes('x'));
  });
});

// =============================================================================
// REVIEWS (purchase/install simulation)
// =============================================================================

describe('Reviews (purchase/install simulation)', () => {
  let promptId;

  beforeEach(async () => {
    const res = await makeRequest(
      'POST',
      '/api/prompts',
      { title: 'ReviewTest', model: 'gpt-4', body: 'test' },
      authHeaders
    );
    promptId = res.body.id;
  });

  it('POST /api/prompts/:id/reviews - creates review (auth required)', async () => {
    const res = await makeRequest(
      'POST',
      `/api/prompts/${promptId}/reviews`,
      { rating: 5, comment: 'Great prompt!', reviewer: 'test-user' },
      authHeaders
    );
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.rating, 5);
  });

  it('POST /api/prompts/:id/reviews - returns 400 for invalid rating', async () => {
    const res = await makeRequest(
      'POST',
      `/api/prompts/${promptId}/reviews`,
      { rating: 6 },
      authHeaders
    );
    assert.strictEqual(res.status, 400);
  });

  it('POST /api/prompts/:id/reviews - returns 400 for rating < 1', async () => {
    const res = await makeRequest(
      'POST',
      `/api/prompts/${promptId}/reviews`,
      { rating: 0 },
      authHeaders
    );
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/prompts/:id/reviews - lists reviews', async () => {
    await makeRequest(
      'POST',
      `/api/prompts/${promptId}/reviews`,
      { rating: 4, comment: 'Good' },
      authHeaders
    );
    const res = await makeRequest('GET', `/api/prompts/${promptId}/reviews`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.reviews));
    assert.ok(res.body.count >= 1);
  });

  it('POST /api/prompts/:id/reviews - updates prompt rating', async () => {
    await makeRequest('POST', `/api/prompts/${promptId}/reviews`, { rating: 5 }, authHeaders);
    await makeRequest('POST', `/api/prompts/${promptId}/reviews`, { rating: 3 }, authHeaders);

    const res = await makeRequest('GET', `/api/prompts/${promptId}`);
    // Average of 5 and 3 is 4 (use approxEqual for floats)
    assert.ok(Math.abs(res.body.rating - 4) < 0.01, `Expected rating ~4, got ${res.body.rating}`);
    assert.strictEqual(res.body.reviewCount, 2);
  });
});

// =============================================================================
// AUDIT LOG
// =============================================================================

describe('Audit Log', () => {
  it('GET /api/audit - returns audit entries', async () => {
    const res = await makeRequest('GET', '/api/audit');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.entries));
    // Should have entries from prompt creation
    assert.ok(res.body.entries.length > 0);
  });

  it('GET /api/audit - respects limit parameter', async () => {
    const res = await makeRequest('GET', '/api/audit?limit=1');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.entries.length <= 1);
  });

  it('GET /api/audit - caps limit at 1000', async () => {
    const res = await makeRequest('GET', '/api/audit?limit=9999');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.entries.length <= 1000);
  });
});

// =============================================================================
// AUTH
// =============================================================================

describe('Authentication', () => {
  it('protected routes return 401 without auth', async () => {
    const routes = [
      { method: 'POST', path: '/api/prompts', body: { title: 'X', model: 'y', body: 'z' } },
      { method: 'PATCH', path: '/api/prompts/test-id', body: { title: 'X' } },
      { method: 'DELETE', path: '/api/prompts/test-id' },
      { method: 'POST', path: '/api/prompts/test-id/versions', body: { body: 'x' } },
      { method: 'POST', path: '/api/prompts/test-id/versions/1/render', body: {} },
      { method: 'POST', path: '/api/prompts/test-id/reviews', body: { rating: 5 } },
    ];

    for (const route of routes) {
      const res = await makeRequest(route.method, route.path, route.body || null);
      assert.strictEqual(res.status, 401, `Expected 401 for ${route.method} ${route.path}`);
    }
  });

  it('protected routes succeed with valid internal token', async () => {
    // Create a prompt first to get a valid ID
    const createRes = await makeRequest(
      'POST',
      '/api/prompts',
      { title: 'AuthTest', model: 'gpt-4', body: 'test' },
      authHeaders
    );
    const promptId = createRes.body.id;

    // Now test that the token works for other endpoints
    const res = await makeRequest(
      'PATCH',
      `/api/prompts/${promptId}`,
      { title: 'AuthUpdated' },
      authHeaders
    );
    assert.strictEqual(res.status, 200);
  });

  it('returns 401 for invalid internal token', async () => {
    const res = await makeRequest(
      'POST',
      '/api/prompts',
      { title: 'X', model: 'y', body: 'z' },
      { 'X-Internal-Token': 'wrong-token' }
    );
    assert.strictEqual(res.status, 401);
  });
});
