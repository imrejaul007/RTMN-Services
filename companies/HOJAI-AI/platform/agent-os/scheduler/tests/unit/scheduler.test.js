'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const idx = require('../../src/index');
const {
  validateJob, validateCronExpr, parseCronField, cronMatches,
  nextCronFire, nextCronFires, nextFireTime,
  validateOnceTime, validateInterval, nextIntervalFire,
  normalizeJob, summarizeJob, summarizeRun,
  findJob, findIndex, byType, byEnabled, byAgent, listAll,
  loadJobs, saveJobs, loadRuns, appendRun,
  app, SERVICE_NAME, PORT, VERSION,
  VALID_TYPES, MIN_INTERVAL_MS,
} = idx;

// ---------- Cron field parsing ----------

test('parseCronField accepts "*"', () => {
  const r = parseCronField('*', 'minute');
  assert.equal(r.error, undefined);
  assert.ok(r.values.has(0));
  assert.ok(r.values.has(59));
});

test('parseCronField accepts range "1-5"', () => {
  const r = parseCronField('1-5', 'hour');
  assert.equal(r.error, undefined);
  assert.deepEqual([...r.values].sort(), [1, 2, 3, 4, 5]);
});

test('parseCronField accepts step "*/15"', () => {
  const r = parseCronField('*/15', 'minute');
  assert.equal(r.error, undefined);
  assert.deepEqual([...r.values].sort(), [0, 15, 30, 45]);
});

test('parseCronField accepts list "1,15,30"', () => {
  const r = parseCronField('1,15,30', 'minute');
  assert.equal(r.error, undefined);
  assert.deepEqual([...r.values].sort(), [1, 15, 30]);
});

test('parseCronField rejects out-of-bounds', () => {
  const r = parseCronField('60', 'minute');
  assert.ok(r.error && r.error.includes('out of bounds'));
});

test('parseCronField rejects invalid range direction', () => {
  const r = parseCronField('10-5', 'hour');
  assert.ok(r.error);
});

test('parseCronField rejects non-numeric range', () => {
  const r = parseCronField('abc-def', 'minute');
  assert.ok(r.error);
});

test('parseCronField rejects non-numeric step', () => {
  const r = parseCronField('*/x', 'minute');
  assert.ok(r.error);
});

// ---------- validateCronExpr ----------

test('validateCronExpr accepts standard 5-field cron', () => {
  assert.deepEqual(validateCronExpr('*/15 * * * *'), []);
  assert.deepEqual(validateCronExpr('0 0 * * *'), []);
  assert.deepEqual(validateCronExpr('30 14 1 1 *'), []);
});

test('validateCronExpr rejects wrong field count', () => {
  const errs = validateCronExpr('* * *');
  assert.ok(errs.some((e) => e.includes('5 fields')));
});

test('validateCronExpr rejects empty', () => {
  const errs = validateCronExpr('');
  assert.ok(errs.length > 0);
});

test('validateCronExpr rejects invalid value', () => {
  const errs = validateCronExpr('60 * * * *');
  assert.ok(errs.length > 0);
});

// ---------- cronMatches ----------

test('cronMatches: */15 * * * * matches at minute 0, 15, 30, 45', () => {
  const expr = '*/15 * * * *';
  // 12:30 (any hour, any dom, any month, any dow)
  const d = new Date('2026-06-24T12:30:00');
  assert.equal(cronMatches(expr, d), true);
  // 12:45
  const d2 = new Date('2026-06-24T12:45:00');
  assert.equal(cronMatches(expr, d2), true);
  // 12:07 should NOT match
  const d3 = new Date('2026-06-24T12:07:00');
  assert.equal(cronMatches(expr, d3), false);
});

test('cronMatches: 0 0 * * * matches only midnight', () => {
  const expr = '0 0 * * *';
  assert.equal(cronMatches(expr, new Date('2026-06-24T00:00:00')), true);
  assert.equal(cronMatches(expr, new Date('2026-06-24T00:01:00')), false);
  assert.equal(cronMatches(expr, new Date('2026-06-24T12:00:00')), false);
});

test('cronMatches: handles invalid date', () => {
  assert.equal(cronMatches('* * * * *', null), false);
  assert.equal(cronMatches('* * * * *', new Date('invalid')), false);
});

test('cronMatches: handles wrong field count', () => {
  assert.equal(cronMatches('* * *', new Date()), false);
});

// ---------- nextCronFire ----------

test('nextCronFire: * * * * * returns next minute', () => {
  const from = new Date('2026-06-24T12:00:00');
  const next = nextCronFire('* * * * *', from);
  assert.ok(next);
  assert.equal(next.getMinutes(), 1);
  assert.equal(next.getHours(), 12);
});

test('nextCronFire: 0 * * * * returns next hour', () => {
  const from = new Date('2026-06-24T12:30:00');
  const next = nextCronFire('0 * * * *', from);
  assert.ok(next);
  assert.equal(next.getMinutes(), 0);
  assert.equal(next.getHours(), 13);
});

test('nextCronFire: 0 0 * * * returns next midnight', () => {
  const from = new Date('2026-06-24T12:30:00');
  const next = nextCronFire('0 0 * * *', from);
  assert.ok(next);
  assert.equal(next.getHours(), 0);
  assert.equal(next.getMinutes(), 0);
  assert.equal(next.getDate(), 25); // next day
});

test('nextCronFire: */15 * * * * returns next 15-min boundary', () => {
  const from = new Date('2026-06-24T12:07:00');
  const next = nextCronFire('*/15 * * * *', from);
  assert.ok(next);
  assert.equal(next.getMinutes(), 15);
});

test('nextCronFire returns null for invalid expr', () => {
  const next = nextCronFire('bad', new Date());
  assert.equal(next, null);
});

test('nextCronFires returns N timestamps', () => {
  const from = new Date('2026-06-24T12:00:00');
  const fires = nextCronFires('*/15 * * * *', from, 5);
  assert.equal(fires.length, 5);
  // All should be increasing
  for (let i = 1; i < fires.length; i += 1) {
    assert.ok(new Date(fires[i]) > new Date(fires[i - 1]));
  }
});

// ---------- validateOnceTime ----------

test('validateOnceTime rejects empty', () => {
  assert.ok(validateOnceTime('').length > 0);
  assert.ok(validateOnceTime(null).length > 0);
});

test('validateOnceTime rejects invalid ISO', () => {
  assert.ok(validateOnceTime('not-a-date').length > 0);
});

test('validateOnceTime rejects past timestamps', () => {
  assert.ok(validateOnceTime('2020-01-01T00:00:00Z').length > 0);
});

test('validateOnceTime accepts future ISO', () => {
  const future = new Date(Date.now() + 60000).toISOString();
  assert.deepEqual(validateOnceTime(future), []);
});

// ---------- validateInterval ----------

test('validateInterval rejects zero/negative', () => {
  assert.ok(validateInterval(0).length > 0);
  assert.ok(validateInterval(-100).length > 0);
});

test('validateInterval rejects non-integer', () => {
  assert.ok(validateInterval(1500.5).length > 0);
  assert.ok(validateInterval('1500').length > 0);
});

test('validateInterval rejects below minimum', () => {
  assert.ok(validateInterval(500).length > 0);
});

test('validateInterval accepts >= 1000', () => {
  assert.deepEqual(validateInterval(1000), []);
  assert.deepEqual(validateInterval(60000), []);
});

test('nextIntervalFire adds interval ms to from', () => {
  const from = new Date('2026-06-24T12:00:00');
  const next = nextIntervalFire(5000, from);
  assert.equal(next.getTime(), from.getTime() + 5000);
});

// ---------- validateJob ----------

test('validateJob accepts minimal valid cron job', () => {
  const errs = validateJob({
    name: 'n', type: 'cron', schedule: '*/15 * * * *', agentId: 'a', action: 'do',
  });
  assert.deepEqual(errs, []);
});

test('validateJob rejects missing name', () => {
  const errs = validateJob({ type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd' });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateJob rejects invalid type', () => {
  const errs = validateJob({ name: 'n', type: 'weird', schedule: '* * * * *', agentId: 'a', action: 'd' });
  assert.ok(errs.some((e) => e.includes('type must be')));
});

test('validateJob rejects missing agentId', () => {
  const errs = validateJob({ name: 'n', type: 'cron', schedule: '* * * * *', action: 'd' });
  assert.ok(errs.some((e) => e.includes('agentId')));
});

test('validateJob rejects missing action', () => {
  const errs = validateJob({ name: 'n', type: 'cron', schedule: '* * * * *', agentId: 'a' });
  assert.ok(errs.some((e) => e.includes('action')));
});

test('validateJob rejects non-string callback', () => {
  const errs = validateJob({
    name: 'n', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd', callback: 123,
  });
  assert.ok(errs.some((e) => e.includes('callback')));
});

test('validateJob allows null callback', () => {
  const errs = validateJob({
    name: 'n', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd', callback: null,
  });
  assert.deepEqual(errs, []);
});

test('validateJob rejects retries out of range', () => {
  const errs = validateJob({
    name: 'n', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd', retries: 10,
  });
  assert.ok(errs.some((e) => e.includes('retries')));
});

test('validateJob rejects non-integer retries', () => {
  const errs = validateJob({
    name: 'n', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd', retries: 1.5,
  });
  assert.ok(errs.some((e) => e.includes('retries')));
});

test('validateJob rejects non-object params', () => {
  const errs = validateJob({
    name: 'n', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd', params: 'string',
  });
  assert.ok(errs.some((e) => e.includes('params')));
});

test('validateJob: once requires future ISO', () => {
  const errs = validateJob({ name: 'n', type: 'once', schedule: '2020-01-01', agentId: 'a', action: 'd' });
  assert.ok(errs.length > 0);
});

test('validateJob: interval rejects below min', () => {
  const errs = validateJob({ name: 'n', type: 'interval', schedule: 500, agentId: 'a', action: 'd' });
  assert.ok(errs.some((e) => e.includes('interval')));
});

test('validateJob: event requires schedule string', () => {
  const errs = validateJob({ name: 'n', type: 'event', agentId: 'a', action: 'd' });
  assert.ok(errs.some((e) => e.includes('event schedule')));
});

test('validateJob: cron requires valid cron expr', () => {
  const errs = validateJob({ name: 'n', type: 'cron', schedule: 'bad', agentId: 'a', action: 'd' });
  assert.ok(errs.length > 0);
});

test('validateJob handles null body', () => {
  const errs = validateJob(null);
  assert.ok(errs.length > 0);
});

test('validateJob partial allows omitted type', () => {
  const errs = validateJob({ name: 'n', schedule: '* * * * *', agentId: 'a', action: 'd' }, { partial: true });
  assert.deepEqual(errs, []);
});

// ---------- normalizeJob ----------

test('normalizeJob assigns id with job_ prefix', () => {
  const j = normalizeJob({ name: 'n', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd' }, null);
  assert.ok(j.id && j.id.startsWith('job_'));
  assert.equal(j.enabled, true);
  assert.ok(j.nextRunAt);
});

test('normalizeJob recomputes nextRunAt', () => {
  const existing = { id: 'job_x', name: 'n', type: 'interval', schedule: 5000, agentId: 'a', action: 'd', enabled: true };
  const j = normalizeJob({ name: 'n2' }, existing);
  assert.equal(j.id, 'job_x');
  assert.ok(j.nextRunAt);
});

test('normalizeJob PATCH with null callback clears it', () => {
  const existing = { id: 'job_x', name: 'n', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd', enabled: true, callback: 'http://example.com' };
  const j = normalizeJob({ callback: null }, existing);
  assert.equal(j.callback, null);
});

// ---------- summarizeJob ----------

test('summarizeJob returns summary', () => {
  const j = { id: 'job_1', name: 'n', type: 'cron', agentId: 'a', action: 'd', enabled: true, runCount: 3, failCount: 1, createdAt: 'c', updatedAt: 'u' };
  const s = summarizeJob(j);
  assert.equal(s.id, 'job_1');
  assert.equal(s.runCount, 3);
});

test('summarizeJob handles null', () => {
  assert.equal(summarizeJob(null), null);
});

// ---------- Filters ----------

test('byType filters by type', () => {
  const arr = [{ type: 'cron' }, { type: 'interval' }];
  assert.equal(byType(arr, 'cron').length, 1);
});

test('byEnabled filters enabled true', () => {
  const arr = [{ enabled: true }, { enabled: false }];
  assert.equal(byEnabled(arr, true).length, 1);
  assert.equal(byEnabled(arr, 'true').length, 1);
});

test('byEnabled filters enabled false', () => {
  const arr = [{ enabled: true }, { enabled: false }];
  assert.equal(byEnabled(arr, false).length, 1);
});

test('byEnabled returns all when undefined', () => {
  const arr = [{ enabled: true }, { enabled: false }];
  assert.equal(byEnabled(arr, undefined).length, 2);
});

test('byAgent filters by agentId', () => {
  const arr = [{ agentId: 'a' }, { agentId: 'b' }];
  assert.equal(byAgent(arr, 'a').length, 1);
});

test('byAgent returns all when missing', () => {
  const arr = [{ agentId: 'a' }, { agentId: 'b' }];
  assert.equal(byAgent(arr, undefined).length, 2);
});

test('listAll returns same array', () => {
  const arr = [{ a: 1 }];
  assert.equal(listAll(arr), arr);
});

// ---------- findJob ----------

test('findJob returns matching or null', () => {
  const arr = [{ id: 'job_1' }];
  assert.equal(findJob(arr, 'job_1').id, 'job_1');
  assert.equal(findJob(arr, 'nope'), null);
});

// ---------- nextFireTime ----------

test('nextFireTime for cron returns Date', () => {
  const j = { type: 'cron', schedule: '*/15 * * * *' };
  const nf = nextFireTime(j);
  assert.ok(nf instanceof Date);
});

test('nextFireTime for once returns the schedule date', () => {
  const future = new Date(Date.now() + 60000).toISOString();
  const j = { type: 'once', schedule: future };
  const nf = nextFireTime(j);
  assert.ok(nf instanceof Date);
  assert.equal(nf.toISOString(), future);
});

test('nextFireTime for interval adds ms', () => {
  const from = new Date('2026-06-24T12:00:00');
  const j = { type: 'interval', schedule: 5000 };
  const nf = nextFireTime(j, from);
  assert.equal(nf.getTime(), from.getTime() + 5000);
});

test('nextFireTime for event returns null', () => {
  const j = { type: 'event', schedule: 'topic.x' };
  assert.equal(nextFireTime(j), null);
});

test('nextFireTime handles null job', () => {
  assert.equal(nextFireTime(null), null);
});

// ---------- loadJobs / saveJobs / loadRuns / appendRun ----------

test('saveJobs + loadJobs round-trip', () => {
  // Use a temp data dir to avoid polluting real data
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scheduler-test-'));
  process.env.SCHEDULER_DATA_DIR = tmpDir;
  delete require.cache[require.resolve('../../src/index')];
  const m = require('../../src/index');
  m.saveJobs([{ id: 'job_x', name: 'n' }]);
  const loaded = m.loadJobs();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'job_x');
  // Reset
  process.env.SCHEDULER_DATA_DIR = '';
  delete require.cache[require.resolve('../../src/index')];
  require('../../src/index');
});

test('appendRun + loadRuns reads appended runs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scheduler-test-'));
  process.env.SCHEDULER_DATA_DIR = tmpDir;
  delete require.cache[require.resolve('../../src/index')];
  const m = require('../../src/index');
  m.appendRun({ id: 'run_1', jobId: 'job_1', status: 'recorded' });
  m.appendRun({ id: 'run_2', jobId: 'job_1', status: 'success' });
  const runs = m.loadRuns();
  assert.equal(runs.length, 2);
  process.env.SCHEDULER_DATA_DIR = '';
  delete require.cache[require.resolve('../../src/index')];
  require('../../src/index');
});

// ---------- HTTP integration ----------

function startTestServer() {
  return new Promise((resolve) => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scheduler-test-'));
    process.env.SCHEDULER_DATA_DIR = testDataDir;
    delete require.cache[require.resolve('../../src/index')];
    const idx2 = require('../../src/index');
    const srv = idx2.app.listen(0, () => resolve({ srv, port: srv.address().port, dataDir: testDataDir, idx: idx2 }));
  });
}

async function stopServer(srv) {
  if (srv && typeof srv.closeAllConnections === 'function') srv.closeAllConnections();
  if (srv) await new Promise((resolve) => srv.close(resolve));
}

test('HTTP: GET /health works', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.service, 'scheduler');
  assert.equal(body.port, 4808);
  await stopServer(srv);
});

test('HTTP: GET /ready works', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/ready`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ready, true);
  await stopServer(srv);
});

test('HTTP: POST /api/jobs creates a cron job', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'every-15', type: 'cron', schedule: '*/15 * * * *', agentId: 'agt_1', action: 'ping',
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id && body.id.startsWith('job_'));
  assert.equal(body.enabled, true);
  assert.ok(body.nextRunAt);
  await stopServer(srv);
});

test('HTTP: POST /api/jobs validates body and returns 400', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'cron' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'validation');
  await stopServer(srv);
});

test('HTTP: POST /api/jobs rejects past once timestamp', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'past', type: 'once', schedule: '2020-01-01T00:00:00Z', agentId: 'a', action: 'd',
    }),
  });
  assert.equal(res.status, 400);
  await stopServer(srv);
});

test('HTTP: GET /api/jobs lists jobs with filters', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'cron', schedule: '* * * * *', agentId: 'agt_x', action: 'd' }),
  });
  await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', type: 'interval', schedule: 5000, agentId: 'agt_y', action: 'd' }),
  });
  const all = await fetch(`http://localhost:${port}/api/jobs`);
  const allBody = await all.json();
  assert.equal(allBody.count, 2);
  const filtered = await fetch(`http://localhost:${port}/api/jobs?type=cron`);
  const fBody = await filtered.json();
  assert.equal(fBody.count, 1);
  await stopServer(srv);
});

test('HTTP: GET /api/jobs/search filters', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'cron', schedule: '* * * * *', agentId: 'agt_a', action: 'd' }),
  });
  const res = await fetch(`http://localhost:${port}/api/jobs/search?type=cron&enabled=true`);
  const body = await res.json();
  assert.equal(body.count, 1);
  await stopServer(srv);
});

test('HTTP: GET /api/jobs/:id returns job', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd' }),
  });
  const e = await create.json();
  const get = await fetch(`http://localhost:${port}/api/jobs/${e.id}`);
  assert.equal(get.status, 200);
  const body = await get.json();
  assert.equal(body.id, e.id);
  await stopServer(srv);
});

test('HTTP: GET /api/jobs/:id 404 when missing', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/jobs/nope`);
  assert.equal(res.status, 404);
  await stopServer(srv);
});

test('HTTP: PATCH /api/jobs/:id updates job', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd' }),
  });
  const e = await create.json();
  const patch = await fetch(`http://localhost:${port}/api/jobs/${e.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'renamed' }),
  });
  assert.equal(patch.status, 200);
  const body = await patch.json();
  assert.equal(body.name, 'renamed');
  await stopServer(srv);
});

test('HTTP: DELETE /api/jobs/:id removes job', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd' }),
  });
  const e = await create.json();
  const del = await fetch(`http://localhost:${port}/api/jobs/${e.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const get = await fetch(`http://localhost:${port}/api/jobs/${e.id}`);
  assert.equal(get.status, 404);
  await stopServer(srv);
});

test('HTTP: POST /api/jobs/:id/enable and /disable', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd', enabled: false }),
  });
  const e = await create.json();
  assert.equal(e.enabled, false);

  const en = await fetch(`http://localhost:${port}/api/jobs/${e.id}/enable`, { method: 'POST' });
  assert.equal(en.status, 200);
  const enBody = await en.json();
  assert.equal(enBody.enabled, true);

  const dis = await fetch(`http://localhost:${port}/api/jobs/${e.id}/disable`, { method: 'POST' });
  assert.equal(dis.status, 200);
  const disBody = await dis.json();
  assert.equal(disBody.enabled, false);
  assert.equal(disBody.nextRunAt, null);
  await stopServer(srv);
});

test('HTTP: POST /api/jobs/:id/trigger records a run', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd' }),
  });
  const e = await create.json();
  const trig = await fetch(`http://localhost:${port}/api/jobs/${e.id}/trigger`, { method: 'POST' });
  assert.equal(trig.status, 200);
  const body = await trig.json();
  assert.equal(body.ok, true);
  assert.ok(body.runId && body.runId.startsWith('run_'));
  assert.equal(body.status, 'recorded');
  await stopServer(srv);
});

test('HTTP: GET /api/jobs/:id/runs returns runs for job', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd' }),
  });
  const e = await create.json();
  await fetch(`http://localhost:${port}/api/jobs/${e.id}/trigger`, { method: 'POST' });
  const res = await fetch(`http://localhost:${port}/api/jobs/${e.id}/runs`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.jobId, e.id);
  assert.equal(body.count, 1);
  await stopServer(srv);
});

test('HTTP: GET /api/jobs/:id/next returns next run time', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'cron', schedule: '0 0 * * *', agentId: 'a', action: 'd' }),
  });
  const e = await create.json();
  const res = await fetch(`http://localhost:${port}/api/jobs/${e.id}/next`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.jobId, e.id);
  assert.ok(body.nextRunAt);
  await stopServer(srv);
});

test('HTTP: GET /api/cron/next returns N fire times', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/cron/next?expr=*/15 * * * *&count=5`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 5);
  assert.equal(body.next.length, 5);
  await stopServer(srv);
});

test('HTTP: GET /api/cron/next returns 400 on invalid expr', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/cron/next?expr=bad`);
  assert.equal(res.status, 400);
  await stopServer(srv);
});

test('HTTP: GET /api/runs lists runs with filters', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd' }),
  });
  const e = await create.json();
  await fetch(`http://localhost:${port}/api/jobs/${e.id}/trigger`, { method: 'POST' });
  const res = await fetch(`http://localhost:${port}/api/runs?jobId=${e.id}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 1);
  await stopServer(srv);
});

test('HTTP: unknown route returns 404', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/no-such-route`);
  assert.equal(res.status, 404);
  await stopServer(srv);
});

test('HTTP: GET /api/jobs/:id 404 should NOT swallow /api/jobs/search', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/jobs/search`);
  assert.equal(res.status, 200);
  await stopServer(srv);
});

test('HTTP: PATCH with null callback clears callback', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'a', type: 'cron', schedule: '* * * * *', agentId: 'a', action: 'd', callback: 'http://x',
    }),
  });
  const e = await create.json();
  assert.equal(e.callback, 'http://x');
  const patch = await fetch(`http://localhost:${port}/api/jobs/${e.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback: null }),
  });
  assert.equal(patch.status, 200);
  const body = await patch.json();
  assert.equal(body.callback, null);
  await stopServer(srv);
});

test('HTTP: DELETE on missing returns 404', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/jobs/nope`, { method: 'DELETE' });
  assert.equal(res.status, 404);
  await stopServer(srv);
});
