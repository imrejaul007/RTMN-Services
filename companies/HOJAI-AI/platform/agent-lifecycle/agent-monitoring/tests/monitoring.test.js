/**
 * Tests for agent-monitoring
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'amon-test-'));
process.env.DATA_DIR = tmpDir;
process.env.PORT = '0';
process.env.INTERNAL_TOKEN = 'test-tok';

const indexPath = require.resolve('../src/index.js');
delete require.cache[indexPath];
const { createApp, validateDatapoint, computePercentile, checkThresholds } = require('../src/index.js');
const TOKEN = 'test-tok';

function auth() { return { 'X-Internal-Token': TOKEN, 'Content-Type': 'application/json' }; }

test('validateDatapoint catches bad inputs', () => {
  assert.ok(validateDatapoint(null));
  assert.ok(validateDatapoint({}));
  assert.ok(validateDatapoint({ agentId: 'a', version: '1' }));
  assert.ok(validateDatapoint({ agentId: 'a', version: '1', kind: 'invalid', metric: 'x', value: 1 }));
  assert.ok(validateDatapoint({ agentId: 'a', version: '1', kind: 'quality', metric: 'x', value: 'nope' }));
});

test('validateDatapoint accepts valid input', () => {
  assert.strictEqual(validateDatapoint({ agentId: 'a', version: '1', kind: 'quality', metric: 'success_rate', value: 0.95 }), null);
});

test('computePercentile handles percentiles', () => {
  assert.strictEqual(computePercentile([1, 2, 3, 4, 5], 50), 3);
  assert.strictEqual(computePercentile([1, 2, 3, 4, 5], 100), 5);
  assert.strictEqual(computePercentile([], 50), 0);
});

test('checkThresholds detects max breach', () => {
  const dps = [{ kind: 'performance', metric: 'latency_ms', value: 6000 }];
  const thresholds = { 'a@1': { performance: { latency_ms: { max: 5000 } } } };
  const alerts = checkThresholds('a', '1', dps, thresholds);
  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].metric, 'latency_ms');
});

test('checkThresholds detects min breach', () => {
  const dps = [{ kind: 'quality', metric: 'success_rate', value: 0.5 }];
  const thresholds = { 'a@1': { quality: { success_rate: { min: 0.9 } } } };
  const alerts = checkThresholds('a', '1', dps, thresholds);
  assert.strictEqual(alerts.length, 1);
});

test('checkThresholds returns empty for healthy metrics', () => {
  const dps = [{ kind: 'quality', metric: 'success_rate', value: 0.99 }];
  const thresholds = { 'a@1': { quality: { success_rate: { min: 0.9 } } } };
  assert.strictEqual(checkThresholds('a', '1', dps, thresholds).length, 0);
});

test('checkThresholds returns empty when no threshold set', () => {
  const dps = [{ kind: 'quality', metric: 'success_rate', value: 0.99 }];
  assert.strictEqual(checkThresholds('a', '1', dps, {}).length, 0);
});

test('health/ready', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/health`);
    assert.strictEqual(r.status, 200);
  } finally { s.close(); }
});

test('rejects unauth', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/metrics`);
    assert.strictEqual(r.status, 401);
  } finally { s.close(); }
});

test('record and query single datapoint', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/metrics`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', kind: 'quality', metric: 'success_rate', value: 0.95 }),
    });
    assert.strictEqual(r.status, 201);
    const g = await fetch(`http://127.0.0.1:${s.address().port}/metrics?agentId=a`, { headers: auth() });
    const j = await g.json();
    assert.ok(j.count >= 1);
  } finally { s.close(); }
});

test('batch record', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/metrics/batch`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        datapoints: [
          { agentId: 'a', version: '1', kind: 'performance', metric: 'latency_ms', value: 100 },
          { agentId: 'a', version: '1', kind: 'performance', metric: 'latency_ms', value: 200 },
        ],
      }),
    });
    assert.strictEqual(r.status, 201);
    const j = await r.json();
    assert.strictEqual(j.count, 2);
  } finally { s.close(); }
});

test('batch validates every datapoint', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/metrics/batch`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        datapoints: [
          { agentId: 'a', version: '1', kind: 'quality', metric: 'success_rate', value: 0.95 },
          { agentId: 'a', version: '1' }, // invalid
        ],
      }),
    });
    assert.strictEqual(r.status, 400);
  } finally { s.close(); }
});

test('aggregate computes percentiles', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    for (const v of [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]) {
      await fetch(`http://127.0.0.1:${s.address().port}/metrics`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ agentId: 'agg-1', version: '1', kind: 'performance', metric: 'latency_ms', value: v }),
      });
    }
    const r = await fetch(`http://127.0.0.1:${s.address().port}/metrics/aggregate?agentId=agg-1&version=1&window_ms=600000`, { headers: auth() });
    const j = await r.json();
    const lat = j.metrics.find((m) => m.metric === 'latency_ms');
    assert.ok(lat);
    assert.strictEqual(lat.count, 10);
    assert.strictEqual(lat.p95, 1000);
  } finally { s.close(); }
});

test('set thresholds and trigger alert on next datapoint', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/agents/a/versions/1/thresholds`, {
      method: 'PUT', headers: auth(),
      body: JSON.stringify({ performance: { latency_ms: { max: 500 } } }),
    });
    await fetch(`http://127.0.0.1:${s.address().port}/metrics`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a', version: '1', kind: 'performance', metric: 'latency_ms', value: 1000 }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/alerts?agentId=a`, { headers: auth() });
    const j = await r.json();
    assert.ok(j.count >= 1);
    assert.strictEqual(j.alerts[0].metric, 'latency_ms');
  } finally { s.close(); }
});

test('acknowledge alert', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/agents/a2/versions/1/thresholds`, {
      method: 'PUT', headers: auth(),
      body: JSON.stringify({ quality: { success_rate: { min: 0.9 } } }),
    });
    await fetch(`http://127.0.0.1:${s.address().port}/metrics`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a2', version: '1', kind: 'quality', metric: 'success_rate', value: 0.5 }),
    });
    const list = await (await fetch(`http://127.0.0.1:${s.address().port}/alerts?agentId=a2`, { headers: auth() })).json();
    const alert = list.alerts[0];
    const ack = await fetch(`http://127.0.0.1:${s.address().port}/alerts/${alert.id}/acknowledge`, { method: 'POST', headers: auth() });
    const aj = await ack.json();
    assert.strictEqual(aj.acknowledged, true);
  } finally { s.close(); }
});

test('manual check endpoint', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    await fetch(`http://127.0.0.1:${s.address().port}/agents/a3/versions/1/thresholds`, {
      method: 'PUT', headers: auth(),
      body: JSON.stringify({ performance: { latency_ms: { max: 100 } } }),
    });
    await fetch(`http://127.0.0.1:${s.address().port}/metrics`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ agentId: 'a3', version: '1', kind: 'performance', metric: 'latency_ms', value: 500 }),
    });
    const r = await fetch(`http://127.0.0.1:${s.address().port}/agents/a3/versions/1/check`, { method: 'POST', headers: auth() });
    const j = await r.json();
    assert.ok(j.alerts.length >= 1);
  } finally { s.close(); }
});

test('filter alerts by acknowledged', async () => {
  const app = createApp();
  const s = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/alerts?acknowledged=false`, { headers: auth() });
    assert.strictEqual(r.status, 200);
  } finally { s.close(); }
});

test('cleanup', () => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
});