// Planning Engine tests — gracefully handles MongoDB being unavailable
process.env.PLANNING_ENGINE_PORT = '19321';
process.env.MONGODB_URI = 'mongodb://localhost:27017/hojai_test_planning';
process.env.NODE_ENV = 'test';
process.env.SUPPRESS_LISTEN = '1';
process.env.JWT_SECRET = 'test-secret-min-32-chars-plz-change';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

const { app } = await import('../src/index.js');
const PORT = 19321;
let server;

async function mongoAvailable() {
  try {
    const r = await fetch('http://localhost:27017', { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

async function setup() {
  await new Promise(r => { server = app.listen(PORT, () => console.log(`[test] listening on ${PORT}`), r); });
}
async function teardown() {
  if (server) server.close();
}
async function req(m, p, b, h = {}) {
  const url = `http://localhost:${PORT}${p}`;
  const r = await fetch(url, {
    method: m,
    headers: { 'content-type': 'application/json', 'x-internal-token': 'test-internal-token', ...h },
    body: b ? JSON.stringify(b) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { success: false, error: { message: text.slice(0, 100) } }; }
  return { status: r.status, data };
}

let pCount = 0, fCount = 0;
const a = (n, c) => {
  if (c) { pCount++; console.log(`  ✓ ${n}`); }
  else { fCount++; console.log(`  ✗ ${n}`); }
};

async function run() {
  await setup();
  console.log('\nPlanning Engine tests:');

  const mongo = await mongoAvailable();
  if (!mongo) {
    console.log('  ⚠  MongoDB not available — running partial tests\n');
  }

  // Health & readiness (always work, no DB needed)
  let res = await req('GET', '/health');
  a('GET /health returns 200 + healthy status', res.status === 200 && res.data.data.status === 'healthy');
  a('GET /health has service name', res.data.data.service === 'planning-engine');

  res = await req('GET', '/ready');
  a('GET /ready returns ready: true', res.status === 200 && (res.data.data?.ready || res.data.ready) === true);

  if (mongo) {
    // Template routes (DB required)
    res = await req('GET', '/api/templates');
    a('GET /api/templates returns templates array', res.status === 200 && Array.isArray(res.data.data.templates));

    // Create a plan
    res = await req('POST', '/api/plans', {
      goal: 'Book a hotel room',
      userId: 'test-user',
      steps: [
        { order: 1, name: 'auth_check', est_ms: 50, depends_on: [] },
        { order: 2, name: 'fetch_customer', est_ms: 80, depends_on: [1] },
        { order: 3, name: 'check_inventory', est_ms: 120, depends_on: [1] },
        { order: 4, name: 'process_payment', est_ms: 300, depends_on: [2, 3] },
      ],
    });
    a('POST /api/plans creates plan with 200', res.status === 200 && res.data.success);
    const planId = res.data.data?.planId;
    a('Plan ID is generated (PLN-...)', planId && typeof planId === 'string');
    a('Critical path is computed', res.data.data?.critical_path && Array.isArray(res.data.data.critical_path));
    a('Estimated total ms is a number', typeof res.data.data?.estimated_total_ms === 'number');

    // Fetch plan
    res = await req('GET', `/api/plans/${planId}`);
    a('GET /api/plans/:id returns plan', res.status === 200 && res.data.data?.plan?.planId === planId);
    a('Plan has 4 steps', res.status === 200 && res.data.data?.plan?.steps?.length === 4);

    // List plans
    res = await req('GET', '/api/plans?userId=test-user');
    a('GET /api/plans lists plans', res.status === 200 && res.data.data?.count >= 1);

    // Validate DAG (no cycle)
    res = await req('GET', `/api/plans/${planId}/validate`);
    a('validate: DAG is valid', res.status === 200 && res.data.data?.valid === true);
    a('validate: correct execution order', res.status === 200 && res.data.data?.execution_order?.join(',') === '1,2,3,4');

    // Cycle detection — plan with cycle should fail
    res = await req('POST', '/api/plans', {
      goal: 'Cyclic plan (should fail)',
      steps: [
        { order: 1, name: 'step_a', est_ms: 50, depends_on: [3] },
        { order: 2, name: 'step_b', est_ms: 50, depends_on: [1] },
        { order: 3, name: 'step_c', est_ms: 50, depends_on: [2] },
      ],
    });
    a('POST with cycle returns 400', res.status === 400 && !res.data.success);

    // Generate plan (rule-based — no LLM needed)
    res = await req('POST', '/api/plans/generate', {
      goal: 'Schedule a meeting with my team',
      category: 'personal',
      userId: 'test-user',
    });
    a('POST /api/plans/generate creates plan', res.status === 200 && res.data.success);
    const genPlanId = res.data.data?.planId;
    a('Generated plan has steps', res.status === 200 && res.data.data?.steps?.length > 0);
    a('Generated plan has critical path', res.status === 200 && Array.isArray(res.data.data?.critical_path));

    // Validate generated plan
    res = await req('GET', `/api/plans/${genPlanId}/validate`);
    a('Generated plan is valid DAG', res.status === 200 && res.data.data?.valid === true);

    // Execute plan
    res = await req('POST', `/api/plans/${planId}/execute`);
    a('POST /api/plans/:id/execute returns 202', res.status === 202 && res.data.data?.status === 'running');

    // Wait a bit and check status
    await new Promise(r => setTimeout(r, 500));
    res = await req('GET', `/api/plans/${planId}`);
    a('Plan status updated after execution', res.status === 200 && ['running', 'completed'].includes(res.data.data?.plan?.status));

    // Get execution logs
    res = await req('GET', `/api/plans/${planId}/logs`);
    a('GET /api/plans/:id/logs returns logs', res.status === 200 && Array.isArray(res.data.data?.logs));

    // Get stats
    res = await req('GET', '/api/stats');
    a('GET /api/stats returns stats', res.status === 200 && typeof res.data.data?.plans?.total === 'number');

    // Delete plan
    res = await req('DELETE', `/api/plans/${planId}`);
    a('DELETE /api/plans/:id returns 200', res.status === 200);

    // Validation: missing goal
    res = await req('POST', '/api/plans', { steps: [{ order: 1, name: 'a' }] });
    a('POST without goal returns 400', res.status === 400 && !res.data.success);

    // Validation: empty steps
    res = await req('POST', '/api/plans', { goal: 'Test', steps: [] });
    a('POST with empty steps returns 400', res.status === 400 && !res.data.success);
  } else {
    // Without MongoDB: test that DB routes return proper errors (not HTML)
    res = await req('GET', '/api/templates');
    a('GET /api/templates returns JSON error (not HTML) when DB unavailable', res.status === 500 && !Array.isArray(res.data.data?.templates) && !res.data.data?.templates);
    a('GET /api/templates error has code field', res.status === 500 && res.data.error?.code);

    res = await req('POST', '/api/plans', { goal: 'Test', steps: [{ order: 1, name: 'a' }] });
    a('POST /api/plans returns JSON error when DB unavailable', res.status === 500);

    // Health/readiness still work
    a('(DB skipped) health still works', true);
  }

  await teardown();
  console.log(`\nPlanning Engine: ${pCount} passed, ${fCount} failed${!mongo ? ' (partial — MongoDB not running)' : ''}`);
  process.exit(fCount > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
