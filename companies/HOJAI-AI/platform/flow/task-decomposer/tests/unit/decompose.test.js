/**
 * Phase 14.1 — Task Decomposer unit tests
 * Covers: validateDag, heuristicDecompose, extractJson, decompose.
 */
const TEST_DATA_DIR = '/tmp/decompose-test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
process.env.TASK_DECOMPOSER_DATA_DIR = TEST_DATA_DIR;

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { decompose, validateDag, heuristicDecompose, extractJson, decompositions } = require('../../src/index');

// ---------------------- extractJson ----------------------

test('extractJson: direct JSON parses', () => {
  const out = extractJson('{"tasks": [{"id": "t1"}]}');
  assert.deepEqual(out, { tasks: [{ id: 't1' }] });
});

test('extractJson: code fence stripped', () => {
  const out = extractJson('```json\n{"tasks": []}\n```');
  assert.deepEqual(out, { tasks: [] });
});

test('extractJson: prose around JSON recovered', () => {
  const out = extractJson('Here is the result:\n{"tasks": [{"id": "x"}]}\nDone.');
  assert.deepEqual(out, { tasks: [{ id: 'x' }] });
});

test('extractJson: garbage returns null', () => {
  assert.equal(extractJson('not json at all'), null);
  assert.equal(extractJson(''), null);
  assert.equal(extractJson(null), null);
});

// ---------------------- validateDag ----------------------

test('validateDag: ok for simple chain', () => {
  const r = validateDag([
    { id: 't1', name: 'one' },
    { id: 't2', name: 'two', dependsOn: ['t1'] },
  ]);
  assert.equal(r.valid, true);
});

test('validateDag: cycle detected', () => {
  const r = validateDag([
    { id: 'a', name: 'a', dependsOn: ['b'] },
    { id: 'b', name: 'b', dependsOn: ['a'] },
  ]);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('cycle')));
});

test('validateDag: missing id', () => {
  const r = validateDag([{ name: 'no-id' }]);
  assert.equal(r.valid, false);
});

// ---------------------- heuristicDecompose ----------------------

test('heuristicDecompose: splits on "then"', () => {
  const r = heuristicDecompose('Book a hotel then order dinner then send confirmation');
  assert.ok(r.tasks.length >= 2);
  assert.equal(r.source, 'heuristic');
  assert.ok(r.tasks[0].dependsOn.length === 0);
  assert.equal(r.tasks[1].dependsOn[0], 't1');
});

test('heuristicDecompose: sequential by default', () => {
  const r = heuristicDecompose('Find venue and then book catering and send invites');
  for (let i = 1; i < r.tasks.length; i++) {
    assert.deepEqual(r.tasks[i].dependsOn, [`t${i}`]);
  }
});

test('heuristicDecompose: extracts verbs as kind', () => {
  const r = heuristicDecompose('Book a flight then reserve a hotel');
  const kinds = r.tasks.map((t) => t.kind);
  assert.ok(kinds.some((k) => k.includes('book')));
  assert.ok(kinds.some((k) => k.includes('reserve')));
});

test('heuristicDecompose: respects maxTasks option', () => {
  const r = heuristicDecompose('a then b then c then d then e then f then g then h', { maxTasks: 4 });
  assert.ok(r.tasks.length <= 4);
});

test('heuristicDecompose: assigns priorities (first high, last low)', () => {
  const r = heuristicDecompose('A then B then C');
  assert.equal(r.tasks[0].priority, 'high');
  assert.equal(r.tasks[r.tasks.length - 1].priority, 'low');
});

test('heuristicDecompose: single-sentence goal returns 1 task', () => {
  const r = heuristicDecompose('Buy a laptop');
  assert.ok(r.tasks.length === 1);
  assert.equal(r.tasks[0].dependsOn.length, 0);
});

test('heuristicDecompose: estimates duration by clause length', () => {
  const short = heuristicDecompose('Send email');
  const long = heuristicDecompose(
    'Write a comprehensive strategic plan covering technical implementation timeline resource allocation budget forecasting risk analysis stakeholder engagement reporting structure and post-launch review'
  );
  // Both single clauses, but long clause is much longer → longer duration.
  assert.ok(short.tasks[0].durationMin < long.tasks[0].durationMin);
});

// ---------------------- decompose ----------------------

test('decompose: throws on empty goal', async () => {
  await assert.rejects(() => decompose(''), { status: 400, code: 'VALIDATION_ERROR' });
});

test('decompose: throws on non-string goal', async () => {
  await assert.rejects(() => decompose(null), { status: 400, code: 'VALIDATION_ERROR' });
});

test('decompose: throws on too-long goal', async () => {
  await assert.rejects(() => decompose('x'.repeat(2001)), { status: 400, code: 'VALIDATION_ERROR' });
});

test('decompose: with useLlm:false falls back to heuristic', async () => {
  const r = await decompose('Send email then book flight', {}, { useLlm: false });
  assert.equal(r.source, 'heuristic');
  assert.ok(r.tasks.length >= 1);
  assert.ok(r.warnings.length > 0);
  assert.ok(r.goalId);
});

test('decompose: returns goalId, normalized tasks', async () => {
  const r = await decompose('Order cake then deliver cake', {}, { useLlm: false });
  assert.ok(r.goalId);
  assert.ok(r.createdAt);
  for (const t of r.tasks) {
    assert.ok(t.id);
    assert.ok(t.name);
    assert.ok(t.description);
    assert.ok(Array.isArray(t.dependsOn));
    assert.ok(typeof t.durationMin === 'number');
    assert.ok(['high', 'normal', 'low'].includes(t.priority));
  }
});

test('decompose: stores result in decompositions Map', async () => {
  const r = await decompose('A then B', {}, { useLlm: false });
  assert.equal(decompositions.get(r.goalId), r);
});

// ---------------------- Teardown ----------------------

test('teardown: clear and remove data dir', () => {
  decompositions.clear();
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});