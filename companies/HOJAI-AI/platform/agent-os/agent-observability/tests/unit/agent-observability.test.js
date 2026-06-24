'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const idx = require('../../src/index');
const {
  validateTrace, validateSpan, validateMetric, validateLog,
  timeBucket, percentile, summarizeValues, calculateBuckets,
  buildTraceTree, summarizeSpans, summarizeAgent,
  findTrace, findSpan, listAll,
  recordMetricValue, getRecentBuckets, getSystemBuckets, toMetricSummary,
  app, SERVICE_NAME, PORT, VERSION, BUCKET_MS,
} = idx;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('validateTrace accepts a minimal valid trace', () => {
  const errs = validateTrace({ agentId: 'agt_1', name: 'do-thing' });
  assert.deepEqual(errs, []);
});

test('validateTrace rejects missing agentId', () => {
  const errs = validateTrace({ name: 'x' });
  assert.ok(errs.some((e) => e.includes('agentId')));
});

test('validateTrace rejects missing name', () => {
  const errs = validateTrace({ agentId: 'agt_1' });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateTrace handles null body', () => {
  const errs = validateTrace(null);
  assert.ok(errs.length > 0);
});

test('validateSpan accepts minimal valid span', () => {
  const errs = validateSpan({ name: 'step-1', kind: 'tool' });
  assert.deepEqual(errs, []);
});

test('validateSpan rejects invalid kind', () => {
  const errs = validateSpan({ name: 'x', kind: 'mystery' });
  assert.ok(errs.some((e) => e.includes('kind must be')));
});

test('validateSpan rejects non-object attributes', () => {
  const errs = validateSpan({ name: 'x', kind: 'tool', attributes: 'nope' });
  assert.ok(errs.some((e) => e.includes('attributes must be object')));
});

test('validateMetric requires finite number value', () => {
  const errs = validateMetric({ name: 'latency', value: 'oops' });
  assert.ok(errs.some((e) => e.includes('value required')));
});

test('validateLog rejects missing level', () => {
  const errs = validateLog({ agentId: 'a', message: 'hi' });
  assert.ok(errs.some((e) => e.includes('level must be')));
});

test('validateLog accepts all four levels', () => {
  for (const lvl of ['debug', 'info', 'warn', 'error']) {
    const errs = validateLog({ agentId: 'a', level: lvl, message: 'm' });
    assert.deepEqual(errs, []);
  }
});

// ---------------------------------------------------------------------------
// timeBucket / percentile / calculateBuckets
// ---------------------------------------------------------------------------

test('timeBucket aligns to 5-minute UTC window', () => {
  const ts = Date.UTC(2026, 5, 24, 12, 34, 17);
  const bucket = timeBucket(ts);
  assert.equal(bucket, Date.UTC(2026, 5, 24, 12, 30, 0));
});

test('timeBucket handles null/invalid input safely', () => {
  assert.equal(timeBucket(null), null);
  assert.equal(timeBucket(undefined), null);
  assert.equal(timeBucket('not-a-date'), null);
});

test('percentile returns correct value for p50 on sorted input', () => {
  // Nearest-rank: rank = ceil(0.5 * 5) = 3 → sorted[2] = 30
  assert.equal(percentile([10, 20, 30, 40, 50], 50), 30);
});

test('percentile returns null for empty / invalid input', () => {
  assert.equal(percentile([], 95), null);
  assert.equal(percentile(null, 95), null);
  assert.equal(percentile([1, 2, 3], 'oops'), null);
});

test('percentile handles unsorted input by sorting first', () => {
  // For [1..100] p95 = 95 (nearest-rank)
  const arr = Array.from({ length: 100 }, (_, i) => i + 1).reverse();
  assert.equal(percentile(arr, 95), 95);
});

test('summarizeValues computes count/sum/min/max/avg', () => {
  const s = summarizeValues([10, 20, 30, 40, 50]);
  assert.equal(s.count, 5);
  assert.equal(s.sum, 150);
  assert.equal(s.min, 10);
  assert.equal(s.max, 50);
  assert.equal(s.avg, 30);
  assert.equal(s.p50, 30);
});

test('summarizeValues returns safe defaults for empty input', () => {
  const s = summarizeValues([]);
  assert.equal(s.count, 0);
  assert.equal(s.sum, 0);
  assert.equal(s.p50, null);
});

test('calculateBuckets returns N ascending bucket starts', () => {
  const end = Date.UTC(2026, 5, 24, 12, 30, 0);
  const buckets = calculateBuckets(end, 5);
  assert.equal(buckets.length, 5);
  assert.equal(buckets[0], end - 4 * BUCKET_MS);
  assert.equal(buckets[4], end);
  for (let i = 1; i < buckets.length; i++) {
    assert.ok(buckets[i] > buckets[i - 1]);
  }
});

// ---------------------------------------------------------------------------
// buildTraceTree / summarizeSpans / summarizeAgent
// ---------------------------------------------------------------------------

test('buildTraceTree returns null for null trace', () => {
  assert.equal(buildTraceTree(null, []), null);
});

test('buildTraceTree builds parent → children structure', () => {
  const trace = { id: 'trc_1', agentId: 'a', name: 'root', startedAt: 't', status: 'running', totalSpans: 3 };
  const spans = [
    { id: 'spn_1', traceId: 'trc_1', name: 'root', kind: 'agent', parentSpanId: null, agentId: 'a', startedAt: 0, durationMs: 100, attributes: {}, status: 'ok' },
    { id: 'spn_2', traceId: 'trc_1', name: 'tool-1', kind: 'tool', parentSpanId: 'spn_1', agentId: 'a', startedAt: 0, durationMs: 50, attributes: {}, status: 'ok' },
    { id: 'spn_3', traceId: 'trc_1', name: 'tool-2', kind: 'tool', parentSpanId: 'spn_1', agentId: 'a', startedAt: 0, durationMs: 30, attributes: {}, status: 'ok' },
  ];
  const tree = buildTraceTree(trace, spans);
  assert.equal(tree.id, 'trc_1');
  assert.equal(tree.spans.length, 1);
  assert.equal(tree.spans[0].id, 'spn_1');
  assert.equal(tree.spans[0].children.length, 2);
  const childIds = tree.spans[0].children.map((c) => c.id).sort();
  assert.deepEqual(childIds, ['spn_2', 'spn_3']);
});

test('summarizeSpans computes totals and errors', () => {
  const spans = [
    { status: 'ok', kind: 'tool', durationMs: 10 },
    { status: 'ok', kind: 'tool', durationMs: 20 },
    { status: 'error', kind: 'llm', durationMs: 30, errorMessage: 'oops' },
  ];
  const s = summarizeSpans(spans);
  assert.equal(s.count, 3);
  assert.equal(s.totalDurationMs, 60);
  assert.equal(s.errorCount, 1);
  assert.equal(s.byKind.tool, 2);
  assert.equal(s.byKind.llm, 1);
});

test('summarizeSpans handles null/undefined input safely', () => {
  const s = summarizeSpans(null);
  assert.equal(s.count, 0);
  assert.equal(s.errorCount, 0);
});

test('summarizeAgent aggregates across traces/metrics/logs', () => {
  const traces = [{ agentId: 'a' }, { agentId: 'b' }, { agentId: 'a' }];
  const metrics = [{ agentId: 'a', name: 'latency' }];
  const logs = [
    { agentId: 'a', level: 'error' },
    { agentId: 'a', level: 'warn' },
    { agentId: 'a', level: 'info' },
  ];
  const s = summarizeAgent(traces, metrics, logs, 'a');
  assert.equal(s.traceCount, 2);
  assert.equal(s.metricCount, 1);
  assert.equal(s.logCount, 3);
  assert.equal(s.errorCount, 1);
  assert.equal(s.warnCount, 1);
});

test('summarizeAgent returns safe defaults for null agentId', () => {
  const s = summarizeAgent([], [], [], null);
  assert.equal(s.traceCount, 0);
});

// ---------------------------------------------------------------------------
// recordMetricValue / getRecentBuckets / getSystemBuckets
// ---------------------------------------------------------------------------

test('recordMetricValue creates a new bucket on first call', () => {
  const metrics = [];
  const ts = Date.UTC(2026, 5, 24, 12, 30, 0);
  const b = recordMetricValue(metrics, 'a', 'latency', 100, ts);
  assert.equal(b.agentId, 'a');
  assert.equal(b.name, 'latency');
  assert.equal(b.count, 1);
  assert.equal(b.sum, 100);
  assert.equal(b.min, 100);
  assert.equal(b.max, 100);
  assert.equal(b.avg, 100);
  assert.equal(b.p50, 100);
});

test('recordMetricValue aggregates multiple values in same bucket', () => {
  const metrics = [];
  const ts = Date.UTC(2026, 5, 24, 12, 30, 0);
  recordMetricValue(metrics, 'a', 'latency', 100, ts);
  recordMetricValue(metrics, 'a', 'latency', 200, ts);
  const b = recordMetricValue(metrics, 'a', 'latency', 300, ts);
  assert.equal(b.count, 3);
  assert.equal(b.sum, 600);
  assert.equal(b.avg, 200);
  assert.equal(b.min, 100);
  assert.equal(b.max, 300);
});

test('recordMetricValue keeps separate buckets per timestamp', () => {
  const metrics = [];
  const t1 = Date.UTC(2026, 5, 24, 12, 30, 0);
  const t2 = Date.UTC(2026, 5, 24, 12, 35, 0);
  recordMetricValue(metrics, 'a', 'latency', 100, t1);
  recordMetricValue(metrics, 'a', 'latency', 500, t2);
  const buckets = getRecentBuckets(metrics, 'a', 10);
  assert.equal(buckets.length, 2);
  assert.ok(buckets[0].timestamp < buckets[1].timestamp);
});

test('toMetricSummary strips internal _sample', () => {
  const b = { agentId: 'a', name: 'x', timestamp: 0, count: 1, sum: 1, min: 1, max: 1, avg: 1, p50: 1, p95: 1, p99: 1, _sample: [1] };
  const s = toMetricSummary(b);
  assert.equal(s._sample, undefined);
  assert.equal(s.count, 1);
});

test('getSystemBuckets aggregates across agents', () => {
  const metrics = [];
  const ts = Date.UTC(2026, 5, 24, 12, 30, 0);
  recordMetricValue(metrics, 'a', 'latency', 100, ts);
  recordMetricValue(metrics, 'b', 'latency', 200, ts);
  const buckets = getSystemBuckets(metrics, 10);
  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].count, 2);
  assert.equal(buckets[0].sum, 300);
});

// ---------------------------------------------------------------------------
// Finders
// ---------------------------------------------------------------------------

test('findTrace returns the matching trace or null', () => {
  const traces = [{ id: 'trc_1' }, { id: 'trc_2' }];
  assert.equal(findTrace(traces, 'trc_2').id, 'trc_2');
  assert.equal(findTrace(traces, 'missing'), null);
  assert.equal(findTrace(null, 'trc_1'), null);
});

test('findSpan returns the matching span or null', () => {
  const spans = [{ id: 'spn_1' }];
  assert.equal(findSpan(spans, 'spn_1').id, 'spn_1');
  assert.equal(findSpan(spans, 'missing'), null);
});

test('listAll returns the array or []', () => {
  assert.deepEqual(listAll([1, 2]), [1, 2]);
  assert.deepEqual(listAll(null), []);
});

// ---------------------------------------------------------------------------
// HTTP integration
// ---------------------------------------------------------------------------

function startTestServer() {
  return new Promise((resolve) => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-observability-test-'));
    process.env.AGENT_OBSERVABILITY_DATA_DIR = testDataDir;
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
  assert.equal(body.service, 'agent-observability');
  assert.equal(body.status, 'ok');
  srv.close();
});

test('HTTP: POST /api/traces creates a trace', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/traces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_1', name: 'do-task' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id.startsWith('trc_'));
  assert.equal(body.agentId, 'agt_1');
  assert.equal(body.status, 'running');
  srv.close();
});

test('HTTP: trace → span → end → get full flow', async () => {
  const { srv, port } = await startTestServer();
  const tRes = await fetch(`http://localhost:${port}/api/traces`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_1', name: 'flow' }),
  });
  const trace = await tRes.json();
  const sRes = await fetch(`http://localhost:${port}/api/traces/${trace.id}/spans`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'root', kind: 'agent' }),
  });
  assert.equal(sRes.status, 201);
  const root = await sRes.json();
  assert.ok(root.id.startsWith('spn_'));
  const cRes = await fetch(`http://localhost:${port}/api/traces/${trace.id}/spans`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'child', kind: 'tool', parentSpanId: root.id }),
  });
  const child = await cRes.json();
  await new Promise((r) => setTimeout(r, 10));
  const e1 = await fetch(`http://localhost:${port}/api/traces/${trace.id}/spans/${root.id}/end`, { method: 'POST' });
  assert.equal(e1.status, 200);
  const ended1 = await e1.json();
  assert.equal(ended1.status, 'ok');
  assert.ok(ended1.durationMs >= 0);
  const e2 = await fetch(`http://localhost:${port}/api/traces/${trace.id}/spans/${child.id}/end`, { method: 'POST' });
  assert.equal(e2.status, 200);
  const g = await fetch(`http://localhost:${port}/api/traces/${trace.id}`);
  assert.equal(g.status, 200);
  const full = await g.json();
  assert.equal(full.totalSpans, 2);
  assert.equal(full.status, 'ok');
  assert.ok(full.totalDurationMs >= 0);
  assert.equal(full.spans.length, 1);
  assert.equal(full.spans[0].children.length, 1);
  srv.close();
});

test('HTTP: GET /api/traces lists traces with agentId filter', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/traces`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_A', name: 'one' }),
  });
  await fetch(`http://localhost:${port}/api/traces`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_B', name: 'two' }),
  });
  const res = await fetch(`http://localhost:${port}/api/traces?agentId=agt_A`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.traces[0].agentId, 'agt_A');
  srv.close();
});

test('HTTP: POST /api/metrics/agents/:agentId records metric', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/metrics/agents/agt_1`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'latency_ms', value: 250 }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.agentId, 'agt_1');
  assert.equal(body.name, 'latency_ms');
  assert.equal(body.count, 1);
  assert.equal(body.avg, 250);
  assert.equal(body.p50, 250);
  srv.close();
});

test('HTTP: GET /api/metrics/agents/:agentId returns last N buckets', async () => {
  const { srv, port } = await startTestServer();
  for (const v of [100, 200, 300]) {
    await fetch(`http://localhost:${port}/api/metrics/agents/agt_1`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'latency', value: v }),
    });
  }
  const res = await fetch(`http://localhost:${port}/api/metrics/agents/agt_1?buckets=5`);
  const body = await res.json();
  assert.equal(body.agentId, 'agt_1');
  assert.equal(body.count, 1);
  assert.equal(body.buckets[0].count, 3);
  assert.equal(body.buckets[0].avg, 200);
  srv.close();
});

test('HTTP: GET /api/metrics/system aggregates across agents', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/metrics/agents/a`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'latency', value: 100 }),
  });
  await fetch(`http://localhost:${port}/api/metrics/agents/b`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'latency', value: 300 }),
  });
  const res = await fetch(`http://localhost:${port}/api/metrics/system`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.buckets[0].count, 2);
  assert.equal(body.buckets[0].sum, 400);
  srv.close();
});

test('HTTP: POST /api/logs writes a log entry', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/logs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'agt_1', level: 'error', message: 'boom', attributes: { code: 42 } }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id.startsWith('log_'));
  assert.equal(body.level, 'error');
  assert.equal(body.attributes.code, 42);
  srv.close();
});

test('HTTP: GET /api/logs filters by agentId and level', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/logs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'a', level: 'info', message: 'one' }),
  });
  await fetch(`http://localhost:${port}/api/logs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'a', level: 'error', message: 'two' }),
  });
  await fetch(`http://localhost:${port}/api/logs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'b', level: 'error', message: 'three' }),
  });
  const res = await fetch(`http://localhost:${port}/api/logs?agentId=a&level=error`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.logs[0].message, 'two');
  srv.close();
});

test('HTTP: GET /api/logs respects limit', async () => {
  const { srv, port } = await startTestServer();
  for (let i = 0; i < 5; i++) {
    await fetch(`http://localhost:${port}/api/logs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'a', level: 'info', message: `m${i}` }),
    });
  }
  const res = await fetch(`http://localhost:${port}/api/logs?limit=2`);
  const body = await res.json();
  assert.equal(body.count, 2);
  srv.close();
});

test('HTTP: validation returns 400 for invalid bodies', async () => {
  const { srv, port } = await startTestServer();
  const badTrace = await fetch(`http://localhost:${port}/api/traces`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'no-agent' }),
  });
  assert.equal(badTrace.status, 400);
  const badSpan = await fetch(`http://localhost:${port}/api/traces`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'a', name: 't' }),
  });
  const t = await badSpan.json();
  const s = await fetch(`http://localhost:${port}/api/traces/${t.id}/spans`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'bad', kind: 'mystery' }),
  });
  assert.equal(s.status, 400);
  srv.close();
});

test('HTTP: 404 for unknown trace / path', async () => {
  const { srv, port } = await startTestServer();
  const r1 = await fetch(`http://localhost:${port}/api/traces/nope`);
  assert.equal(r1.status, 404);
  const r2 = await fetch(`http://localhost:${port}/api/nonsense`);
  assert.equal(r2.status, 404);
  srv.close();
});

test('HTTP: end-span with error marks status=error', async () => {
  const { srv, port } = await startTestServer();
  const tRes = await fetch(`http://localhost:${port}/api/traces`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'a', name: 't' }),
  });
  const trace = await tRes.json();
  const sRes = await fetch(`http://localhost:${port}/api/traces/${trace.id}/spans`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'fail', kind: 'tool' }),
  });
  const span = await sRes.json();
  const eRes = await fetch(`http://localhost:${port}/api/traces/${trace.id}/spans/${span.id}/end`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'error', errorMessage: 'kaboom' }),
  });
  const ended = await eRes.json();
  assert.equal(ended.status, 'error');
  assert.equal(ended.errorMessage, 'kaboom');
  const g = await fetch(`http://localhost:${port}/api/traces/${trace.id}`);
  const full = await g.json();
  assert.equal(full.status, 'error');
  srv.close();
});

test('HTTP: data persists in DATA_DIR across requests', async () => {
  const { srv, port, dataDir } = await startTestServer();
  await fetch(`http://localhost:${port}/api/traces`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId: 'a', name: 'persist' }),
  });
  const tracesFile = path.join(dataDir, 'traces.json');
  assert.ok(fs.existsSync(tracesFile));
  const data = JSON.parse(fs.readFileSync(tracesFile, 'utf8'));
  assert.equal(data.length, 1);
  srv.close();
});