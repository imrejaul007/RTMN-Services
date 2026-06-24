'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const idx = require('../../src/index');
const {
  validateExecution, validateStep, normalizeExecution, normalizeStep,
  buildReActPrompt, parseReActStep, shouldContinue, buildSummary,
  findReadySteps, generateReActNextStep, generatePlanSteps, generateReflectionSteps,
  loadExecutions, saveExecutions, loadSteps, saveSteps, appendStep,
  findExecution, byAgent, byPattern, byStatus, listAll, summarizeExecution, runLoop,
  app, SERVICE_NAME, PORT, VERSION,
  VALID_PATTERNS, VALID_STATUS, VALID_STEP_TYPES,
} = idx;

// ---------- Validation: validateExecution ----------

test('validateExecution accepts a minimal valid execution (react)', () => {
  const errs = validateExecution({ agentId: 'agt_1', pattern: 'react', goal: 'find a hotel' });
  assert.deepEqual(errs, []);
});

test('validateExecution accepts plan-execute pattern', () => {
  const errs = validateExecution({ agentId: 'agt_1', pattern: 'plan-execute', goal: 'g' });
  assert.deepEqual(errs, []);
});

test('validateExecution accepts reflection pattern', () => {
  const errs = validateExecution({ agentId: 'agt_1', pattern: 'reflection', goal: 'g' });
  assert.deepEqual(errs, []);
});

test('validateExecution rejects missing agentId', () => {
  const errs = validateExecution({ pattern: 'react', goal: 'g' });
  assert.ok(errs.some((e) => e.includes('agentId')));
});

test('validateExecution rejects invalid pattern', () => {
  const errs = validateExecution({ agentId: 'a', pattern: 'unknown', goal: 'g' });
  assert.ok(errs.some((e) => e.includes('pattern must be')));
});

test('validateExecution rejects empty goal', () => {
  const errs = validateExecution({ agentId: 'a', pattern: 'react', goal: '' });
  assert.ok(errs.some((e) => e.includes('goal')));
});

test('validateExecution rejects non-positive maxSteps', () => {
  const errs = validateExecution({ agentId: 'a', pattern: 'react', goal: 'g', maxSteps: 0 });
  assert.ok(errs.some((e) => e.includes('maxSteps')));
});

test('validateExecution rejects non-integer maxSteps', () => {
  const errs = validateExecution({ agentId: 'a', pattern: 'react', goal: 'g', maxSteps: 1.5 });
  assert.ok(errs.some((e) => e.includes('maxSteps')));
});

test('validateExecution handles null', () => {
  const errs = validateExecution(null);
  assert.ok(errs.length > 0);
});

// ---------- normalizeExecution ----------

test('normalizeExecution assigns id with exec_ prefix', () => {
  const e = normalizeExecution({ agentId: 'a', pattern: 'react', goal: 'g' }, null);
  assert.ok(e.id && e.id.startsWith('exec_'));
  assert.equal(e.status, 'pending');
  assert.equal(e.maxSteps, 10);
});

test('normalizeExecution preserves existing fields when body omits them', () => {
  const existing = { id: 'exec_1', agentId: 'agt_1', pattern: 'react', goal: 'g', createdAt: '2020' };
  const e = normalizeExecution({ agentId: 'agt_1' }, existing);
  assert.equal(e.id, 'exec_1');
  assert.equal(e.pattern, 'react');
  assert.equal(e.goal, 'g');
});

// ---------- shouldContinue ----------

test('shouldContinue returns true for running execution under maxSteps', () => {
  const e = { status: 'running', currentStep: 2, maxSteps: 10 };
  assert.equal(shouldContinue(e), true);
});

test('shouldContinue returns false when currentStep >= maxSteps', () => {
  const e = { status: 'running', currentStep: 10, maxSteps: 10 };
  assert.equal(shouldContinue(e), false);
});

test('shouldContinue returns false when not running', () => {
  const e = { status: 'paused', currentStep: 2, maxSteps: 10 };
  assert.equal(shouldContinue(e), false);
});

test('shouldContinue handles null', () => {
  assert.equal(shouldContinue(null), false);
});

// ---------- buildReActPrompt ----------

test('buildReActPrompt includes goal text', () => {
  const p = buildReActPrompt('find cheapest hotel');
  assert.ok(p.includes('find cheapest hotel'));
});

test('buildReActPrompt handles null', () => {
  const p = buildReActPrompt(null);
  assert.ok(typeof p === 'string' && p.length > 0);
});

// ---------- parseReActStep ----------

test('parseReActStep extracts thought from thought step', () => {
  const s = { type: 'thought', content: 'thinking' };
  const r = parseReActStep(s);
  assert.equal(r.thought, 'thinking');
  assert.equal(r.action, null);
});

test('parseReActStep extracts action from action step', () => {
  const s = { type: 'action', content: 'do it', toolName: 'search', toolInput: { q: 'x' } };
  const r = parseReActStep(s);
  assert.equal(r.thought, null);
  assert.equal(r.action.tool, 'search');
  assert.deepEqual(r.action.input, { q: 'x' });
});

test('parseReActStep handles null', () => {
  const r = parseReActStep(null);
  assert.deepEqual(r, { thought: null, action: null });
});

// ---------- buildSummary ----------

test('buildSummary includes id, pattern, goal', () => {
  const e = { id: 'exec_1', pattern: 'react', goal: 'g', stepIds: ['a', 'b'] };
  const s = buildSummary(e);
  assert.ok(s.includes('exec_1'));
  assert.ok(s.includes('react'));
  assert.ok(s.includes('2'));
});

test('buildSummary handles null', () => {
  const s = buildSummary(null);
  assert.equal(typeof s, 'string');
});

// ---------- Step generators (pure) ----------

test('generateReActNextStep index 0 returns thought', () => {
  const e = { goal: 'g' };
  const s = generateReActNextStep(e, 0);
  assert.equal(s.type, 'thought');
  assert.ok(s.content.includes('g'));
});

test('generateReActNextStep index 1 returns action with search tool', () => {
  const e = { goal: 'g' };
  const s = generateReActNextStep(e, 1);
  assert.equal(s.type, 'action');
  assert.equal(s.toolName, 'search');
});

test('generateReActNextStep index 4 returns finalize action', () => {
  const e = { goal: 'g' };
  const s = generateReActNextStep(e, 4);
  assert.equal(s.type, 'action');
  assert.equal(s.toolName, 'finalize');
});

test('generateReActNextStep out-of-range returns null', () => {
  const e = { goal: 'g' };
  assert.equal(generateReActNextStep(e, 99), null);
});

test('generatePlanSteps returns 5 templates (1 plan + 3 act + 1 reflection)', () => {
  const e = { goal: 'g' };
  const arr = generatePlanSteps(e);
  assert.equal(arr.length, 5);
  assert.equal(arr[0].type, 'plan');
  assert.equal(arr[4].type, 'reflection');
});

test('generateReflectionSteps returns 3 templates', () => {
  const e = { goal: 'g' };
  const arr = generateReflectionSteps(e);
  assert.equal(arr.length, 3);
  assert.equal(arr[0].type, 'thought');
  assert.equal(arr[1].type, 'action');
  assert.equal(arr[2].type, 'reflection');
});

test('generatePlanSteps handles null execution', () => {
  const arr = generatePlanSteps(null);
  assert.ok(Array.isArray(arr));
});

// ---------- Filters ----------

test('byAgent filters by agentId', () => {
  const arr = [{ agentId: 'a' }, { agentId: 'b' }];
  assert.equal(byAgent(arr, 'a').length, 1);
});

test('byAgent returns all when agentId is missing', () => {
  const arr = [{ agentId: 'a' }, { agentId: 'b' }];
  assert.equal(byAgent(arr, undefined).length, 2);
});

test('byPattern filters by pattern', () => {
  const arr = [{ pattern: 'react' }, { pattern: 'reflection' }];
  assert.equal(byPattern(arr, 'react').length, 1);
});

test('byStatus filters by status', () => {
  const arr = [{ status: 'running' }, { status: 'completed' }];
  assert.equal(byStatus(arr, 'running').length, 1);
});

test('listAll returns same array', () => {
  const arr = [{ a: 1 }];
  assert.equal(listAll(arr), arr);
});

// ---------- findExecution / findReadySteps ----------

test('findExecution returns matching execution or null', () => {
  const arr = [{ id: 'exec_1' }];
  assert.equal(findExecution(arr, 'exec_1').id, 'exec_1');
  assert.equal(findExecution(arr, 'nope'), null);
});

test('findReadySteps filters steps for execution', () => {
  const e = { id: 'exec_1' };
  const steps = [
    { executionId: 'exec_1', type: 'thought' },
    { executionId: 'exec_2', type: 'action' },
    { executionId: 'exec_1', type: 'action' },
  ];
  const r = findReadySteps(e, steps);
  assert.equal(r.length, 2);
});

test('findReadySteps handles null', () => {
  const r = findReadySteps(null, []);
  assert.deepEqual(r, []);
});

// ---------- summarizeExecution ----------

test('summarizeExecution returns summary object', () => {
  const e = { id: 'exec_1', agentId: 'a', pattern: 'react', goal: 'g', status: 'completed', finalAnswer: 'x', currentStep: 5, maxSteps: 10, stepIds: ['1', '2'], createdAt: 'c', updatedAt: 'u' };
  const s = summarizeExecution(e);
  assert.equal(s.id, 'exec_1');
  assert.equal(s.stepCount, 2);
});

test('summarizeExecution handles null', () => {
  assert.equal(summarizeExecution(null), null);
});

// ---------- validateStep ----------

test('validateStep accepts thought type', () => {
  const errs = validateStep({ type: 'thought', content: 'x' });
  assert.deepEqual(errs, []);
});

test('validateStep rejects unknown type', () => {
  const errs = validateStep({ type: 'unknown' });
  assert.ok(errs.length > 0);
});

test('validateStep rejects non-string content', () => {
  const errs = validateStep({ type: 'thought', content: 123 });
  assert.ok(errs.some((e) => e.includes('content')));
});

// ---------- normalizeStep ----------

test('normalizeStep assigns id with step_ prefix', () => {
  const s = normalizeStep({ type: 'thought', content: 'x', executionId: 'exec_1' }, 'exec_1');
  assert.ok(s.id && s.id.startsWith('step_'));
  assert.equal(s.executionId, 'exec_1');
  assert.ok(s.timestamp);
});

// ---------- HTTP integration ----------

function startTestServer() {
  return new Promise((resolve) => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-execution-engine-test-'));
    process.env.AGENT_EXECUTION_ENGINE_DATA_DIR = testDataDir;
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
  assert.equal(body.service, 'agent-execution-engine');
  assert.equal(body.port, 4813);
  srv.close();
});

test('HTTP: GET /ready works', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/ready`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ready, true);
  srv.close();
});

test('HTTP: POST /api/executions (react) creates execution and auto-runs loop', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_1', pattern: 'react', goal: 'find cheapest hotel' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id && body.id.startsWith('exec_'));
  assert.equal(body.status, 'completed');
  assert.ok(body.steps.length >= 4);
  // Should contain thought, action, observation, thought, action (finalize)
  const types = body.steps.map((s) => s.type);
  assert.ok(types.includes('thought'));
  assert.ok(types.includes('action'));
  assert.ok(types.includes('observation'));
  srv.close();
});

test('HTTP: POST /api/executions (plan-execute) auto-runs plan', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_2', pattern: 'plan-execute', goal: 'ship feature' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.status, 'completed');
  // 1 plan + 3 act + 1 reflection = 5
  assert.equal(body.steps.length, 5);
  assert.equal(body.steps[0].type, 'plan');
  assert.equal(body.steps[4].type, 'reflection');
  srv.close();
});

test('HTTP: POST /api/executions (reflection) auto-runs reflect loop', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_3', pattern: 'reflection', goal: 'improve' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.status, 'completed');
  assert.equal(body.steps.length, 3);
  assert.equal(body.steps[2].type, 'reflection');
  srv.close();
});

test('HTTP: POST /api/executions validates body and returns 400', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pattern: 'react' }), // missing agentId & goal
  });
  assert.equal(res.status, 400);
  srv.close();
});

test('HTTP: GET /api/executions/:id returns execution', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_x', pattern: 'react', goal: 'g' }),
  });
  const e = await create.json();
  const get = await fetch(`http://localhost:${port}/api/executions/${e.id}`);
  assert.equal(get.status, 200);
  const body = await get.json();
  assert.equal(body.id, e.id);
  srv.close();
});

test('HTTP: GET /api/executions/:id 404 when missing', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/executions/nope`);
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: GET /api/executions/:id/steps returns steps', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_s', pattern: 'react', goal: 'g' }),
  });
  const e = await create.json();
  const res = await fetch(`http://localhost:${port}/api/executions/${e.id}/steps`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.executionId, e.id);
  assert.ok(body.count > 0);
  srv.close();
});

test('HTTP: POST /api/executions/:id/step manually adds a step', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_m', pattern: 'react', goal: 'g' }),
  });
  const e = await create.json();
  const addStep = await fetch(`http://localhost:${port}/api/executions/${e.id}/step`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'thought', content: 'manual injection' }),
  });
  assert.equal(addStep.status, 201);
  const s = await addStep.json();
  assert.equal(s.type, 'thought');
  assert.equal(s.executionId, e.id);
  srv.close();
});

test('HTTP: POST /api/executions/:id/cancel cancels execution (capped before completion)', async () => {
  const { srv, port } = await startTestServer();
  // Use plan-execute with maxSteps 1 so loop stops early, status remains 'running'
  const create = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_c', pattern: 'plan-execute', goal: 'g', maxSteps: 1 }),
  });
  const e = await create.json();
  // With maxSteps 1, the loop hits the cap on first step, status stays 'running'
  assert.equal(e.status, 'running');
  const cancel = await fetch(`http://localhost:${port}/api/executions/${e.id}/cancel`, { method: 'POST' });
  assert.equal(cancel.status, 200);
  const body = await cancel.json();
  assert.equal(body.status, 'cancelled');
  srv.close();
});

test('HTTP: POST /api/executions/:id/cancel returns 409 on already completed', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_c2', pattern: 'reflection', goal: 'g' }),
  });
  const e = await create.json();
  assert.equal(e.status, 'completed');
  const cancel = await fetch(`http://localhost:${port}/api/executions/${e.id}/cancel`, { method: 'POST' });
  assert.equal(cancel.status, 409);
  srv.close();
});

test('HTTP: POST /api/executions/:id/pause works on running execution (capped)', async () => {
  const { srv, port } = await startTestServer();
  // Use plan-execute with maxSteps 1 so loop stops early, status 'running'
  const create = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_p', pattern: 'plan-execute', goal: 'g', maxSteps: 1 }),
  });
  const e = await create.json();
  assert.equal(e.status, 'running');
  const pause = await fetch(`http://localhost:${port}/api/executions/${e.id}/pause`, { method: 'POST' });
  assert.equal(pause.status, 200);
  const paused = await pause.json();
  assert.equal(paused.status, 'paused');
  srv.close();
});

test('HTTP: POST /api/executions/:id/continue resumes a paused execution', async () => {
  const { srv, port, idx: i2 } = await startTestServer();
  // Create a paused execution
  const create = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_cont', pattern: 'reflection', goal: 'g' }),
  });
  const e = await create.json();
  // Manually set status to 'paused' (simulating pause action)
  const execs = i2.loadExecutions();
  const target = execs.find((x) => x.id === e.id);
  target.status = 'paused';
  i2.saveExecutions(execs);
  // Continue
  const cont = await fetch(`http://localhost:${port}/api/executions/${e.id}/continue`, { method: 'POST' });
  assert.equal(cont.status, 200);
  const resumed = await cont.json();
  assert.ok(['running', 'completed'].includes(resumed.status));
  srv.close();
});

test('HTTP: POST /api/executions/:id/continue returns 409 on non-paused', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_cont2', pattern: 'reflection', goal: 'g' }),
  });
  const e = await create.json();
  assert.equal(e.status, 'completed');
  const cont = await fetch(`http://localhost:${port}/api/executions/${e.id}/continue`, { method: 'POST' });
  assert.equal(cont.status, 409);
  srv.close();
});

test('HTTP: GET /api/executions/search filters by agentId', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_a', pattern: 'react', goal: 'g1' }),
  });
  await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_b', pattern: 'react', goal: 'g2' }),
  });
  const res = await fetch(`http://localhost:${port}/api/executions/search?agentId=agt_a`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.executions[0].agentId, 'agt_a');
  srv.close();
});

test('HTTP: GET /api/executions?pattern=reflection filters by pattern', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'a', pattern: 'react', goal: 'g' }),
  });
  await fetch(`http://localhost:${port}/api/executions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'b', pattern: 'reflection', goal: 'g' }),
  });
  const res = await fetch(`http://localhost:${port}/api/executions?pattern=reflection`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.executions[0].pattern, 'reflection');
  srv.close();
});

test('HTTP: unknown route returns 404', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/no-such-route`);
  assert.equal(res.status, 404);
  srv.close();
});
