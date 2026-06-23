/**
 * RTMN Background Agents v1.0
 * Background job/agent runner: schedule recurring or one-shot jobs, track run history.
 * @port 4792
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4792;
const SERVICE_NAME = 'background-agents';

const BACKGROUND_AGENTS_REQUIRE_AUTH =
  (process.env.BACKGROUND_AGENTS_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const BACKGROUND_AGENTS_NO_LISTEN =
  (process.env.BACKGROUND_AGENTS_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';
const authOrBypass = (req, res, next) =>
  BACKGROUND_AGENTS_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => { const s = Date.now(); res.on('finish', () => console.log(`[background-agents] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now()-s}ms)`)); next(); });

const jobs = new PersistentMap('jobs', { serviceName: SERVICE_NAME });
const runs = new PersistentMap('runs', { serviceName: SERVICE_NAME });
const auditLog = [];

function audit(action, actor, payload) {
  const e = { id: uuidv4(), service: SERVICE_NAME, action, actor: actor || 'system', payload: payload || {}, timestamp: new Date().toISOString() };
  auditLog.push(e); return e;
}

const VALID_JOB_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'];

function simulateRun(job) {
  // Simulated run: just return a success after delay
  return {
    id: uuidv4(),
    jobId: job.id,
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Math.floor(Math.random() * 1000) + 50,
    result: { ok: true, jobName: job.name, payload: job.payload },
    error: null,
  };
}

// POST /api/jobs
app.post('/api/jobs', authOrBypass, (req, res) => {
  const { name, schedule, payload, actor } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const job = {
    id: uuidv4(),
    name,
    schedule: schedule || 'once',
    payload: payload || {},
    enabled: true,
    cancelled: false,
    lastRunAt: null,
    lastRunId: null,
    runCount: 0,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  audit('job.create', actor || 'system', { id: job.id, name });
  res.status(201).json(job);
});

// GET /api/jobs
app.get('/api/jobs', (req, res) => {
  const list = Array.from(jobs.values());
  res.json({ jobs: list, count: list.length });
});

// GET /api/jobs/:id
app.get('/api/jobs/:id', (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({ error: 'Job not found' });
  res.json(j);
});

// POST /api/jobs/:id/run
app.post('/api/jobs/:id/run', authOrBypass, (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({ error: 'Job not found' });
  if (j.cancelled) return res.status(400).json({ error: 'Job is cancelled' });
  const run = simulateRun(j);
  runs.set(run.id, run);
  j.lastRunAt = run.completedAt;
  j.lastRunId = run.id;
  j.runCount += 1;
  jobs.set(j.id, j);
  audit('job.run', req.body?.actor || 'system', { jobId: j.id, runId: run.id });
  res.status(201).json(run);
});

// POST /api/jobs/:id/cancel
app.post('/api/jobs/:id/cancel', authOrBypass, (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return res.status(404).json({ error: 'Job not found' });
  j.cancelled = true;
  j.enabled = false;
  jobs.set(j.id, j);
  audit('job.cancel', req.body?.actor || 'system', { id: j.id });
  res.json(j);
});

// GET /api/runs
app.get('/api/runs', (req, res) => {
  const { jobId, status, limit } = req.query;
  let list = Array.from(runs.values());
  if (jobId) list = list.filter(r => r.jobId === jobId);
  if (status) list = list.filter(r => r.status === status);
  const max = Math.min(parseInt(limit, 10) || 100, 5000);
  res.json({ runs: list.slice(-max).reverse(), count: list.length });
});

// GET /api/runs/:id
app.get('/api/runs/:id', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Run not found' });
  res.json(r);
});

// GET /api/agents/audit
app.get('/api/agents/audit', (req, res) => {
  const { action, limit } = req.query;
  let entries = auditLog;
  if (action) entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, jobs: jobs.size, runs: runs.size, audits: auditLog.length, uptime: process.uptime() }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.use((err, req, res, next) => { console.error('[background-agents] error:', err); res.status(500).json({ error: 'Internal server error', message: err.message }); });

let server = null;
if (require.main === module && !BACKGROUND_AGENTS_NO_LISTEN) {
  server = app.listen(PORT, () => console.log(`background-agents running on port ${PORT}`));
  installGracefulShutdown(server);
}

module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.BACKGROUND_AGENTS_REQUIRE_AUTH = BACKGROUND_AGENTS_REQUIRE_AUTH;
module.exports.BACKGROUND_AGENTS_NO_LISTEN = BACKGROUND_AGENTS_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;