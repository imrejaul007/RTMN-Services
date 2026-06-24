'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const idx = require('../../src/index');
const {
  validateWorkflow, normalizeWorkflow, validateStep, buildStep,
  topoSort, findReadySteps, isComplete, hasFailed, hasCycle,
  listAll, findWorkflow, findRun, summarizeRun, nextSteps,
  loadWorkflows, saveWorkflows, loadRuns, saveRuns,
  DEFAULT_STEP_TIMEOUT_MS, MAX_STEP_TIMEOUT_MS, DEFAULT_RETRIES, MAX_RETRIES,
  app, SERVICE_NAME, PORT, VERSION,
} = idx;

// ---------------------------------------------------------------------------
// validateWorkflow
// ---------------------------------------------------------------------------

test('validateWorkflow accepts a minimal valid workflow', () => {
  const errs = validateWorkflow({
    name: 'wf-1',
    steps: [{ id: 's1', agentId: 'agt_1' }],
  });
  assert.deepEqual(errs, []);
});

test('validateWorkflow rejects missing name', () => {
  const errs = validateWorkflow({ steps: [{ id: 's1', agentId: 'agt_1' }] });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateWorkflow rejects empty steps', () => {
  const errs = validateWorkflow({ name: 'x', steps: [] });
  assert.ok(errs.some((e) => e.includes('steps must be a non-empty array')));
});

test('validateWorkflow rejects missing steps', () => {
  const errs = validateWorkflow({ name: 'x' });
  assert.ok(errs.some((e) => e.includes('steps must be a non-empty array')));
});

test('validateWorkflow rejects duplicate step ids', () => {
  const errs = validateWorkflow({
    name: 'x',
    steps: [
      { id: 's1', agentId: 'a' },
      { id: 's1', toolId: 't' },
    ],
  });
  assert.ok(errs.some((e) => e.includes('duplicate step id')));
});

test('validateWorkflow rejects dependsOn referencing unknown step', () => {
  const errs = validateWorkflow({
    name: 'x',
    steps: [
      { id: 's1', agentId: 'a', dependsOn: ['ghost'] },
    ],
  });
  assert.ok(errs.some((e) => e.includes('dependsOn missing step')));
});

test('validateWorkflow detects cycles', () => {
  const errs = validateWorkflow({
    name: 'x',
    steps: [
      { id: 'a', agentId: 'x', dependsOn: ['b'] },
      { id: 'b', agentId: 'x', dependsOn: ['a'] },
    ],
  });
  assert.ok(errs.some((e) => e.includes('cycle')));
});

test('validateWorkflow handles null body safely', () => {
  const errs = validateWorkflow(null);
  assert.ok(errs.length > 0);
  assert.ok(errs.includes('body must be object'));
});

// ---------------------------------------------------------------------------
// validateStep
// ---------------------------------------------------------------------------

test('validateStep accepts a step with agentId', () => {
  assert.deepEqual(validateStep({ id: 's', agentId: 'a' }), []);
});

test('validateStep accepts a step with toolId or skillId', () => {
  assert.deepEqual(validateStep({ id: 's', toolId: 't' }), []);
  assert.deepEqual(validateStep({ id: 's', skillId: 'k' }), []);
});

test('validateStep rejects step with no agent/tool/skill', () => {
  const errs = validateStep({ id: 's' });
  assert.ok(errs.some((e) => e.includes('at least one of agentId, toolId, skillId')));
});

test('validateStep rejects timeout over max', () => {
  const errs = validateStep({ id: 's', agentId: 'a', timeout: MAX_STEP_TIMEOUT_MS + 1 });
  assert.ok(errs.some((e) => e.includes('timeout max')));
});

test('validateStep rejects retries over max', () => {
  const errs = validateStep({ id: 's', agentId: 'a', retries: MAX_RETRIES + 1 });
  assert.ok(errs.some((e) => e.includes('retries max')));
});

test('validateStep handles null safely', () => {
  const errs = validateStep(null);
  assert.ok(errs.length > 0);
});

// ---------------------------------------------------------------------------
// buildStep
// ---------------------------------------------------------------------------

test('buildStep fills defaults', () => {
  const s = buildStep({ id: 's1', agentId: 'a' });
  assert.equal(s.id, 's1');
  assert.equal(s.name, 's1'); // default to id
  assert.deepEqual(s.dependsOn, []);
  assert.equal(s.timeout, DEFAULT_STEP_TIMEOUT_MS);
  assert.equal(s.retries, DEFAULT_RETRIES);
});

test('buildStep handles null', () => {
  assert.deepEqual(buildStep(null), {});
});

// ---------------------------------------------------------------------------
// normalizeWorkflow
// ---------------------------------------------------------------------------

test('normalizeWorkflow assigns id when missing', () => {
  const w = normalizeWorkflow({ name: 'x', steps: [{ id: 's1', agentId: 'a' }] }, null);
  assert.ok(w.id.startsWith('wf_'));
  assert.ok(w.createdAt);
  assert.ok(w.updatedAt);
});

test('normalizeWorkflow preserves existing id', () => {
  const existing = { id: 'wf_abc', name: 'x', createdAt: '2020' };
  const w = normalizeWorkflow({ name: 'x' }, existing);
  assert.equal(w.id, 'wf_abc');
  assert.equal(w.createdAt, '2020');
});

// ---------------------------------------------------------------------------
// topoSort / hasCycle
// ---------------------------------------------------------------------------

test('topoSort produces valid order for a linear chain', () => {
  const steps = [
    { id: 'a', dependsOn: ['b'] },
    { id: 'b', dependsOn: ['c'] },
    { id: 'c', dependsOn: [] },
  ];
  const order = topoSort(steps);
  assert.deepEqual(order, ['c', 'b', 'a']);
});

test('topoSort produces valid order for a DAG', () => {
  const steps = [
    { id: 'd', dependsOn: ['b', 'c'] },
    { id: 'c', dependsOn: ['a'] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'a', dependsOn: [] },
  ];
  const order = topoSort(steps);
  assert.equal(order.length, 4);
  assert.equal(order[0], 'a');
  assert.equal(order[3], 'd');
  // b and c can come in either order
  assert.ok(order.indexOf('b') < order.indexOf('d'));
  assert.ok(order.indexOf('c') < order.indexOf('d'));
});

test('topoSort returns null for a cycle', () => {
  const steps = [
    { id: 'a', dependsOn: ['b'] },
    { id: 'b', dependsOn: ['a'] },
  ];
  assert.equal(topoSort(steps), null);
});

test('topoSort handles empty input', () => {
  assert.deepEqual(topoSort([]), []);
  assert.deepEqual(topoSort(null), []);
});

test('hasCycle detects simple cycle', () => {
  const steps = [
    { id: 'a', dependsOn: ['b'] },
    { id: 'b', dependsOn: ['a'] },
  ];
  assert.equal(hasCycle(steps), true);
});

test('hasCycle returns false for valid DAG', () => {
  const steps = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
  ];
  assert.equal(hasCycle(steps), false);
});

test('hasCycle handles empty input', () => {
  assert.equal(hasCycle([]), false);
  assert.equal(hasCycle(null), false);
});

// ---------------------------------------------------------------------------
// findReadySteps
// ---------------------------------------------------------------------------

test('findReadySteps returns pending step whose deps are complete', () => {
  const workflow = { steps: [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
  ]};
  const run = {
    stepStates: {
      a: { status: 'completed' },
      b: { status: 'pending' },
    },
  };
  assert.deepEqual(findReadySteps(run, workflow), ['b']);
});

test('findReadySteps handles null safely', () => {
  assert.deepEqual(findReadySteps(null, null), []);
});

// ---------------------------------------------------------------------------
// isComplete / hasFailed
// ---------------------------------------------------------------------------

test('isComplete returns true when all steps completed', () => {
  const run = { stepStates: { a: { status: 'completed' }, b: { status: 'completed' } } };
  assert.equal(isComplete(run), true);
});

test('isComplete ignores skipped steps', () => {
  const run = { stepStates: { a: { status: 'completed' }, b: { status: 'skipped' } } };
  assert.equal(isComplete(run), true);
});

test('isComplete returns false when any step is pending', () => {
  const run = { stepStates: { a: { status: 'completed' }, b: { status: 'pending' } } };
  assert.equal(isComplete(run), false);
});

test('isComplete handles null safely', () => {
  assert.equal(isComplete(null), false);
});

test('hasFailed returns true when a step is failed with retries exhausted', () => {
  const run = { stepStates: { a: { status: 'failed', attempts: 3, maxRetries: 3 } } };
  assert.equal(hasFailed(run), true);
});

test('hasFailed returns false when retries remain', () => {
  const run = { stepStates: { a: { status: 'failed', attempts: 1, maxRetries: 3 } } };
  assert.equal(hasFailed(run), false);
});

test('hasFailed returns false when no step is failed', () => {
  const run = { stepStates: { a: { status: 'completed' } } };
  assert.equal(hasFailed(run), false);
});

// ---------------------------------------------------------------------------
// findWorkflow / findRun / listAll
// ---------------------------------------------------------------------------

test('listAll returns array or []', () => {
  assert.deepEqual(listAll(null), []);
  assert.deepEqual(listAll([1, 2]), [1, 2]);
});

test('findWorkflow finds by id', () => {
  const wfs = [{ id: 'wf_1', name: 'a' }, { id: 'wf_2', name: 'b' }];
  assert.equal(findWorkflow(wfs, 'wf_2').name, 'b');
});

test('findWorkflow returns null for missing / null inputs', () => {
  assert.equal(findWorkflow(null, 'x'), null);
  assert.equal(findWorkflow([], 'x'), null);
});

test('findRun finds by id', () => {
  const runs = [{ id: 'run_1' }, { id: 'run_2' }];
  assert.equal(findRun(runs, 'run_1').id, 'run_1');
});

test('findRun returns null for missing / null inputs', () => {
  assert.equal(findRun(null, 'x'), null);
});

// ---------------------------------------------------------------------------
// summarizeRun / nextSteps
// ---------------------------------------------------------------------------

test('summarizeRun strips output but keeps status info', () => {
  const run = {
    id: 'run_1',
    workflowId: 'wf_1',
    status: 'running',
    startedAt: 't1',
    endedAt: null,
    stepStates: {
      a: { status: 'completed', output: { big: 'secret' }, attempts: 1 },
    },
  };
  const s = summarizeRun(run);
  assert.equal(s.id, 'run_1');
  assert.equal(s.stepStates.a.status, 'completed');
  assert.equal(s.stepStates.a.output, undefined);
});

test('summarizeRun handles null safely', () => {
  assert.equal(summarizeRun(null), null);
});

test('nextSteps finds pending steps whose deps are complete', () => {
  const workflow = { steps: [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['b'] },
  ]};
  const stepStates = {
    a: { status: 'completed' },
    b: { status: 'pending' },
    c: { status: 'pending' },
  };
  const ns = nextSteps(workflow, stepStates);
  assert.deepEqual(ns, ['b']);
});

test('nextSteps handles null workflow safely', () => {
  assert.deepEqual(nextSteps(null, {}), []);
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

test('storage: loadWorkflows/saveWorkflows round-trip', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-st-'));
  process.env.AGENT_ORCHESTRATOR_DATA_DIR = tmp;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  const sample = [{ id: 'wf_x', name: 'n', steps: [] }];
  i2.saveWorkflows(sample);
  const got = i2.loadWorkflows();
  assert.equal(got.length, 1);
  assert.equal(got[0].id, 'wf_x');
});

test('storage: loadRuns/saveRuns round-trip', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-runs-'));
  process.env.AGENT_ORCHESTRATOR_DATA_DIR = tmp;
  delete require.cache[require.resolve('../../src/index')];
  const i2 = require('../../src/index');
  const sample = [{ id: 'run_x', workflowId: 'wf_x', status: 'running', stepStates: {} }];
  i2.saveRuns(sample);
  const got = i2.loadRuns();
  assert.equal(got.length, 1);
  assert.equal(got[0].id, 'run_x');
});

// ---------------------------------------------------------------------------
// HTTP integration
// ---------------------------------------------------------------------------

function startTestServer() {
  return new Promise((resolve) => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-orchestrator-test-'));
    process.env.AGENT_ORCHESTRATOR_DATA_DIR = testDataDir;
    delete require.cache[require.resolve('../../src/index')];
    const idx2 = require('../../src/index');
    const srv = idx2.app.listen(0, () => resolve({ srv, port: srv.address().port, dataDir: testDataDir, idx: idx2 }));
  });
}

test('HTTP: GET /health works', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.service, 'agent-orchestrator');
  assert.equal(body.port, 4812);
  srv.close();
});

test('HTTP: POST /api/workflows creates a workflow', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'order-pipeline',
      description: 'Process orders',
      steps: [
        { id: 'validate', agentId: 'agt_validator' },
        { id: 'charge', agentId: 'agt_billing', dependsOn: ['validate'] },
      ],
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id.startsWith('wf_'));
  assert.equal(body.name, 'order-pipeline');
  assert.equal(body.steps.length, 2);
  srv.close();
});

test('HTTP: POST /api/workflows rejects cycle with 400', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'bad',
      steps: [
        { id: 'a', agentId: 'x', dependsOn: ['b'] },
        { id: 'b', agentId: 'x', dependsOn: ['a'] },
      ],
    }),
  });
  assert.equal(res.status, 400);
  srv.close();
});

test('HTTP: POST /api/workflows rejects empty steps with 400', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x', steps: [] }),
  });
  assert.equal(res.status, 400);
  srv.close();
});

test('HTTP: GET /api/workflows lists workflows', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'wf1', steps: [{ id: 's1', agentId: 'a' }] }),
  });
  const res = await fetch(`http://localhost:${port}/api/workflows`);
  const body = await res.json();
  assert.equal(body.count, 1);
  srv.close();
});

test('HTTP: GET /api/workflows/search finds by name (route order)', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'order-pipeline', steps: [{ id: 's1', agentId: 'a' }] }),
  });
  await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'billing-pipeline', steps: [{ id: 's1', agentId: 'a' }] }),
  });
  const res = await fetch(`http://localhost:${port}/api/workflows/search?name=order`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.workflows[0].name, 'order-pipeline');
  srv.close();
});

test('HTTP: GET /api/workflows/:id 404 when missing', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/workflows/wf_nope`);
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: PATCH /api/workflows/:id updates workflow', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'orig', steps: [{ id: 's1', agentId: 'a' }] }),
  });
  const w = await create.json();
  const patch = await fetch(`http://localhost:${port}/api/workflows/${w.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'updated desc' }),
  });
  assert.equal(patch.status, 200);
  const updated = await patch.json();
  assert.equal(updated.description, 'updated desc');
  srv.close();
});

test('HTTP: DELETE /api/workflows/:id removes it', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'd', steps: [{ id: 's1', agentId: 'a' }] }),
  });
  const w = await create.json();
  const del = await fetch(`http://localhost:${port}/api/workflows/${w.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const get = await fetch(`http://localhost:${port}/api/workflows/${w.id}`);
  assert.equal(get.status, 404);
  srv.close();
});

test('HTTP: POST /api/workflows/:id/run creates a run with initial ready step', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'two-step',
      steps: [
        { id: 'a', agentId: 'agt' },
        { id: 'b', agentId: 'agt', dependsOn: ['a'] },
      ],
    }),
  });
  const w = await create.json();
  const runRes = await fetch(`http://localhost:${port}/api/workflows/${w.id}/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: { x: 1 } }),
  });
  assert.equal(runRes.status, 201);
  const run = await runRes.json();
  assert.ok(run.id.startsWith('run_'));
  assert.equal(run.workflowId, w.id);
  assert.equal(run.status, 'running');
  assert.deepEqual(run.currentStepIds, ['a']);
  assert.equal(run.stepStates.a.status, 'ready');
  assert.equal(run.stepStates.b.status, 'pending');
  srv.close();
});

test('HTTP: completing a step advances the DAG', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'chain',
      steps: [
        { id: 'a', agentId: 'agt' },
        { id: 'b', agentId: 'agt', dependsOn: ['a'] },
      ],
    }),
  });
  const w = await create.json();
  const runRes = await fetch(`http://localhost:${port}/api/workflows/${w.id}/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const run = await runRes.json();
  // Complete step a (it is 'ready'; spec allows ready→completed via this endpoint)
  const complete = await fetch(`http://localhost:${port}/api/workflows/runs/${run.id}/step/a/complete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ output: { result: 'ok' } }),
  });
  assert.equal(complete.status, 200);
  const updated = await complete.json();
  assert.equal(updated.stepStates.a.status, 'completed');
  assert.equal(updated.stepStates.b.status, 'ready'); // advanced from pending
  srv.close();
});

test('HTTP: completing the last step marks run completed', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'single',
      steps: [{ id: 'only', agentId: 'agt' }],
    }),
  });
  const w = await create.json();
  const runRes = await fetch(`http://localhost:${port}/api/workflows/${w.id}/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const run = await runRes.json();
  const complete = await fetch(`http://localhost:${port}/api/workflows/runs/${run.id}/step/only/complete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ output: { done: true } }),
  });
  const updated = await complete.json();
  assert.equal(updated.status, 'completed');
  assert.ok(updated.endedAt);
  srv.close();
});

test('HTTP: cancelling a run marks it cancelled', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'cancel-test',
      steps: [{ id: 'a', agentId: 'agt' }, { id: 'b', agentId: 'agt', dependsOn: ['a'] }],
    }),
  });
  const w = await create.json();
  const runRes = await fetch(`http://localhost:${port}/api/workflows/${w.id}/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const run = await runRes.json();
  const cancel = await fetch(`http://localhost:${port}/api/workflows/runs/${run.id}/cancel`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(cancel.status, 200);
  const cancelled = await cancel.json();
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.stepStates.a.status, 'skipped');
  assert.equal(cancelled.stepStates.b.status, 'pending'); // never started
  srv.close();
});

test('HTTP: failing a step with retries left moves to ready', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'retry',
      steps: [{ id: 'a', agentId: 'agt', retries: 2 }],
    }),
  });
  const w = await create.json();
  const runRes = await fetch(`http://localhost:${port}/api/workflows/${w.id}/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const run = await runRes.json();
  const fail = await fetch(`http://localhost:${port}/api/workflows/runs/${run.id}/step/a/fail`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'transient' }),
  });
  const updated = await fail.json();
  assert.equal(updated.stepStates.a.status, 'ready'); // retry available
  assert.equal(updated.stepStates.a.attempts, 1);
  assert.equal(updated.status, 'running'); // not failed yet
  srv.close();
});

test('HTTP: failing with retries exhausted marks run failed', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'no-retry',
      steps: [{ id: 'a', agentId: 'agt', retries: 1 }],
    }),
  });
  const w = await create.json();
  const runRes = await fetch(`http://localhost:${port}/api/workflows/${w.id}/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const run = await runRes.json();
  // Fail twice: 1st retry → ready, 2nd → exhausted
  await fetch(`http://localhost:${port}/api/workflows/runs/${run.id}/step/a/fail`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'e1' }),
  });
  const fail2 = await fetch(`http://localhost:${port}/api/workflows/runs/${run.id}/step/a/fail`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'e2' }),
  });
  const updated = await fail2.json();
  assert.equal(updated.stepStates.a.status, 'failed');
  assert.equal(updated.status, 'failed');
  assert.ok(updated.endedAt);
  srv.close();
});

test('HTTP: GET /api/workflows/runs filters by workflowId and status', async () => {
  const { srv, port } = await startTestServer();
  // Two workflows
  const w1 = await (await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'w1', steps: [{ id: 'a', agentId: 'x' }] }),
  })).json();
  await fetch(`http://localhost:${port}/api/workflows`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'w2', steps: [{ id: 'a', agentId: 'x' }] }),
  });
  await fetch(`http://localhost:${port}/api/workflows/${w1.id}/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const res = await fetch(`http://localhost:${port}/api/workflows/runs?workflowId=${w1.id}&status=running`);
  const body = await res.json();
  assert.equal(body.count, 1);
  srv.close();
});

test('HTTP: GET /api/workflows/runs/:runId returns 404 for missing run', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/workflows/runs/run_nope`);
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: 404 handler returns JSON', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/no-such-thing`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, 'not_found');
  srv.close();
});