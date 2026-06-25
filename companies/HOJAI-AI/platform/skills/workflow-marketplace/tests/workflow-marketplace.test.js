'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { tmpdir } = require('os');
const path = require('path');
const fs = require('fs');

const INTERNAL_TOKEN = 'workflow-marketplace-internal-token';

function makeTmpDir() {
  const d = path.join(tmpdir(), 'wfm-test-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function httpReq(port, method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = { method, hostname: '127.0.0.1', port, path: urlPath,
      headers: { 'Content-Type': 'application/json', ...headers } };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

let server, port;

before(async () => {
  process.env.DATA_DIR = makeTmpDir();
  process.env.INTERNAL_TOKEN = INTERNAL_TOKEN;
  process.env.PORT = '0';
  // Clear module cache
  delete require.cache[require.resolve('../src/index.js')];
  const { app } = require('../src/index.js');
  server = app.listen(0, '127.0.0.1', () => {
    port = server.address().port;
  });
  await new Promise(res => server.on('listening', res));
});

after(() => {
  server.close();
  delete process.env.DATA_DIR;
  delete process.env.INTERNAL_TOKEN;
  delete process.env.PORT;
});

// ---------------------------------------------------------------------------
// Health & readiness
// ---------------------------------------------------------------------------

test('GET /health returns healthy', async () => {
  const res = await httpReq(port, 'GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
  assert.equal(res.body.service, 'Workflow Marketplace');
  assert.ok(res.body.stats);
  assert.ok(res.body.stats.workflows >= 18); // 18 sample workflows
});

test('GET /ready returns ready', async () => {
  const res = await httpReq(port, 'GET', '/ready');
  assert.equal(res.status, 200);
  assert.equal(res.body.ready, true);
});

// ---------------------------------------------------------------------------
// Workflows — list, filter, search
// ---------------------------------------------------------------------------

test('GET /api/workflows returns paginated list', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.workflows));
  assert.ok(res.body.workflows.length >= 18);
  assert.ok(res.body.total >= 18);
  assert.ok(res.body.page);
  assert.ok(res.body.limit);
});

test('GET /api/workflows filters by category', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows?category=sales');
  assert.equal(res.status, 200);
  assert.ok(res.body.workflows.every(w => w.category === 'sales'));
});

test('GET /api/workflows filters by featured', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows?featured=true');
  assert.equal(res.status, 200);
  assert.ok(res.body.workflows.every(w => w.featured === true));
});

test('GET /api/workflows filters by difficulty', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows?difficulty=beginner');
  assert.equal(res.status, 200);
  assert.ok(res.body.workflows.every(w => w.difficulty === 'beginner'));
});

test('GET /api/workflows filters by price range', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows?minPrice=20&maxPrice=40');
  assert.equal(res.status, 200);
  assert.ok(res.body.workflows.every(w => w.price >= 20 && w.price <= 40));
});

test('GET /api/workflows searches by keyword', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows?search=lead');
  assert.equal(res.status, 200);
  assert.ok(res.body.workflows.length > 0);
});

test('GET /api/workflows sorts by popular', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows?sort=popular');
  assert.equal(res.status, 200);
  const wfs = res.body.workflows;
  for (let i = 1; i < wfs.length; i++) {
    assert.ok(wfs[i - 1].stats.installs >= wfs[i].stats.installs);
  }
});

test('GET /api/workflows sorts by rating', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows?sort=rating');
  assert.equal(res.status, 200);
  const wfs = res.body.workflows;
  for (let i = 1; i < wfs.length; i++) {
    assert.ok(wfs[i - 1].stats.rating >= wfs[i].stats.rating);
  }
});

test('GET /api/workflows sorts by newest', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows?sort=newest');
  assert.equal(res.status, 200);
});

test('GET /api/workflows pagination', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows?page=1&limit=5');
  assert.equal(res.status, 200);
  assert.equal(res.body.workflows.length, 5);
  assert.equal(res.body.page, 1);
  assert.equal(res.body.limit, 5);
});

// ---------------------------------------------------------------------------
// Single workflow
// ---------------------------------------------------------------------------

test('GET /api/workflows/:id returns workflow with reviews', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows/wf-lead-nurture');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.workflow.id, 'wf-lead-nurture');
  assert.ok(Array.isArray(res.body.reviews));
});

test('GET /api/workflows/:id 404 for unknown', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows/wf-does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

test('GET /api/categories returns categories', async () => {
  const res = await httpReq(port, 'GET', '/api/categories');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.categories));
  assert.ok(res.body.categories.length >= 8);
  const cats = res.body.categories.map(c => c.id);
  assert.ok(cats.includes('sales'));
  assert.ok(cats.includes('hr'));
  assert.ok(cats.includes('marketing'));
});

test('GET /api/workflows/featured/list returns featured', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows/featured/list');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.workflows.every(w => w.featured === true));
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

test('GET /api/search returns results', async () => {
  const res = await httpReq(port, 'GET', '/api/search?q=invoice');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.count >= 1);
  assert.ok(res.body.results.length >= 1);
});

test('GET /api/search requires query', async () => {
  const res = await httpReq(port, 'GET', '/api/search');
  assert.equal(res.status, 400);
});

// ---------------------------------------------------------------------------
// Industries
// ---------------------------------------------------------------------------

test('GET /api/industries returns list', async () => {
  const res = await httpReq(port, 'GET', '/api/industries');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.industries));
  assert.ok(res.body.industries.length > 0);
  assert.ok(res.body.industries.includes('SaaS'));
});

// ---------------------------------------------------------------------------
// Deployments — auth required
// ---------------------------------------------------------------------------

test('POST /api/workflows/:id/deploy requires auth', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows/wf-lead-nurture/deploy', { organizationId: 'org-1' });
  assert.equal(res.status, 401);
});

test('POST /api/workflows/:id/deploy creates deployment', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows/wf-lead-nurture/deploy',
    { organizationId: 'org-test-1', config: { schedule: 'daily' } },
    { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.deployment);
  assert.equal(res.body.deployment.workflowId, 'wf-lead-nurture');
  assert.equal(res.body.deployment.organizationId, 'org-test-1');
  assert.equal(res.body.deployment.status, 'active');
});

test('POST /api/workflows/:id/deploy requires organizationId', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows/wf-lead-nurture/deploy', {},
    { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 400);
});

test('POST /api/workflows/:id/deploy 404 for unknown workflow', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows/wf-no-exist/deploy',
    { organizationId: 'org-1' }, { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 404);
});

test('GET /api/deployments requires organizationId', async () => {
  const res = await httpReq(port, 'GET', '/api/deployments');
  assert.equal(res.status, 400);
});

test('GET /api/deployments lists org deployments', async () => {
  const res = await httpReq(port, 'GET', '/api/deployments?organizationId=org-test-1');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.deployments.length >= 1);
});

test('GET /api/deployments/:id returns deployment', async () => {
  const list = await httpReq(port, 'GET', '/api/deployments?organizationId=org-test-1');
  const depId = list.body.deployments[0].id;
  const res = await httpReq(port, 'GET', `/api/deployments/${depId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.deployment.id, depId);
});

test('GET /api/deployments/:id 404 for unknown', async () => {
  const res = await httpReq(port, 'GET', '/api/deployments/deploy-no-exist');
  assert.equal(res.status, 404);
});

test('PATCH /api/deployments/:id requires auth', async () => {
  const list = await httpReq(port, 'GET', '/api/deployments?organizationId=org-test-1');
  const depId = list.body.deployments[0].id;
  const res = await httpReq(port, 'PATCH', `/api/deployments/${depId}`, { status: 'paused' });
  assert.equal(res.status, 401);
});

test('PATCH /api/deployments/:id updates deployment', async () => {
  const list = await httpReq(port, 'GET', '/api/deployments?organizationId=org-test-1');
  const depId = list.body.deployments[0].id;
  const res = await httpReq(port, 'PATCH', `/api/deployments/${depId}`, { status: 'paused' },
    { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 200);
  assert.equal(res.body.deployment.status, 'paused');
});

test('DELETE /api/deployments/:id requires auth', async () => {
  const list = await httpReq(port, 'GET', '/api/deployments?organizationId=org-test-1');
  const depId = list.body.deployments[0].id;
  const res = await httpReq(port, 'DELETE', `/api/deployments/${depId}`);
  assert.equal(res.status, 401);
});

test('DELETE /api/deployments/:id marks deleted', async () => {
  const list = await httpReq(port, 'GET', '/api/deployments?organizationId=org-test-1');
  const depId = list.body.deployments[0].id;
  const res = await httpReq(port, 'DELETE', `/api/deployments/${depId}`, undefined,
    { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

// ---------------------------------------------------------------------------
// Reviews — auth required
// ---------------------------------------------------------------------------

test('POST /api/workflows/:id/reviews requires auth', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows/wf-lead-nurture/reviews',
    { rating: 5, comment: 'Great!' });
  assert.equal(res.status, 401);
});

test('POST /api/workflows/:id/reviews creates review', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows/wf-lead-nurture/reviews',
    { rating: 5, comment: 'Excellent workflow, saved us hours!', author: 'Test User' },
    { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.review);
  assert.equal(res.body.review.rating, 5);
  assert.equal(res.body.review.workflowId, 'wf-lead-nurture');
});

test('POST /api/workflows/:id/reviews requires rating and comment', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows/wf-lead-nurture/reviews',
    { rating: 5 }, { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 400);
});

test('POST /api/workflows/:id/reviews 404 for unknown workflow', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows/wf-no-exist/reviews',
    { rating: 5, comment: 'test' }, { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 404);
});

// ---------------------------------------------------------------------------
// Seller dashboard
// ---------------------------------------------------------------------------

test('GET /api/seller/workflows requires sellerId', async () => {
  const res = await httpReq(port, 'GET', '/api/seller/workflows');
  assert.equal(res.status, 400);
});

test('GET /api/seller/workflows returns seller workflows', async () => {
  const res = await httpReq(port, 'GET', '/api/seller/workflows?sellerId=seller-rtmn');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.workflows.length >= 18);
});

// ---------------------------------------------------------------------------
// Create / update workflow — auth required
// ---------------------------------------------------------------------------

test('POST /api/workflows requires auth', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows', {
    name: 'Test Workflow', category: 'sales', seller: { id: 's1', name: 'Test' }
  });
  assert.equal(res.status, 401);
});

test('POST /api/workflows creates workflow', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows', {
    name: 'My Custom Workflow',
    description: 'A test workflow',
    category: 'sales',
    price: 99,
    priceType: 'monthly',
    tags: ['test'],
    steps: [{ order: 1, name: 'Step 1', type: 'trigger' }],
    integrations: ['crm'],
    industries: ['SaaS'],
    seller: { id: 'seller-rtmn', name: 'RTMN Official', verified: true }
  }, { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.workflow);
  assert.equal(res.body.workflow.name, 'My Custom Workflow');
  assert.equal(res.body.workflow.price, 99);
});

test('POST /api/workflows requires name, category, seller', async () => {
  const res = await httpReq(port, 'POST', '/api/workflows', { name: 'Test' },
    { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 400);
});

test('PATCH /api/workflows/:id requires auth', async () => {
  const res = await httpReq(port, 'PATCH', '/api/workflows/wf-lead-nurture', { price: 59 });
  assert.equal(res.status, 401);
});

test('PATCH /api/workflows/:id updates workflow', async () => {
  const res = await httpReq(port, 'PATCH', '/api/workflows/wf-lead-nurture',
    { price: 59, description: 'Updated description' }, { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 200);
  assert.equal(res.body.workflow.price, 59);
  assert.equal(res.body.workflow.description, 'Updated description');
});

test('PATCH /api/workflows/:id 404 for unknown', async () => {
  const res = await httpReq(port, 'PATCH', '/api/workflows/wf-no-exist',
    { price: 59 }, { 'x-internal-token': INTERNAL_TOKEN });
  assert.equal(res.status, 404);
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

test('GET /api/stats returns marketplace stats', async () => {
  const res = await httpReq(port, 'GET', '/api/stats');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.stats);
  assert.ok(res.body.stats.totalWorkflows >= 18);
  assert.ok(res.body.stats.totalInstalls > 0);
  assert.ok(res.body.stats.byCategory.length >= 8);
});

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

test('GET /api/workflows/:id/execute returns execution payload', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows/wf-lead-nurture/execute');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.workflow);
  assert.equal(res.body.workflow.id, 'wf-lead-nurture');
  assert.ok(res.body.workflow.steps);
  assert.ok(res.body.workflow.integrations);
});

test('GET /api/workflows/:id/execute 404 for unknown', async () => {
  const res = await httpReq(port, 'GET', '/api/workflows/wf-no-exist/execute');
  assert.equal(res.status, 404);
});
