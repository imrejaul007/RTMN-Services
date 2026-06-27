/**
 * scheduler (port 4808) — Phase 32.8
 *
 * Time and event-driven triggers for HOJAI AI Agent OS. Supports:
 *   - cron      : standard 5-field cron expressions (minute, hour, dom, month, dow)
 *   - once      : fire once at a future ISO timestamp
 *   - interval  : fire every N ms (minimum 1000ms)
 *   - event     : fire when matching message arrives on topic
 *
 * Storage: file-backed JSON in data/jobs.json + append-only runs in data/job-history.jsonl
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 4808;
const SERVICE_NAME = 'scheduler';
const VERSION = '1.0.0';
const DATA_DIR = process.env.SCHEDULER_DATA_DIR || path.join(__dirname, '../data');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const HISTORY_FILE = path.join(DATA_DIR, 'job-history.jsonl');
const MIN_INTERVAL_MS = 1000;
const DEFAULT_CRON_NEXT_COUNT = 5;
const DEFAULT_RUN_LIMIT = 100;

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }
function nowIso() { return new Date().toISOString(); }
function rid() { return crypto.randomBytes(8).toString('hex'); }
function jobId() { return `job_${rid()}`; }
function runId() { return `run_${rid()}`; }

// ---------------------------------------------------------------------------
// Cron parsing
// ---------------------------------------------------------------------------

const CRON_FIELD_BOUNDS = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 6 }, // 0 = Sunday
};
const CRON_FIELD_NAMES = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];

function parseCronField(field, name) {
  if (field === undefined || field === null || field === '') {
    return { error: `${name} field empty` };
  }
  const str = String(field).trim();
  if (str.length === 0) return { error: `${name} field empty` };

  const { min, max } = CRON_FIELD_BOUNDS[name];
  const allowed = new Set();
  const parts = str.split(',');
  for (const part of parts) {
    // handle step: a-b / s
    let step = 1;
    let range = part;
    if (part.includes('/')) {
      const [r, s] = part.split('/');
      if (!/^\d+$/.test(s)) return { error: `${name} invalid step "${part}"` };
      step = parseInt(s, 10);
      if (step <= 0) return { error: `${name} step must be > 0` };
      range = r;
    }
    let lo, hi;
    if (range === '*' || range === '') {
      lo = min; hi = max;
    } else if (range.includes('-')) {
      const [a, b] = range.split('-');
      if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) {
        return { error: `${name} invalid range "${range}"` };
      }
      lo = parseInt(a, 10); hi = parseInt(b, 10);
    } else {
      if (!/^\d+$/.test(range)) return { error: `${name} invalid value "${range}"` };
      lo = parseInt(range, 10); hi = lo;
    }
    if (lo < min || hi > max || lo > hi) {
      return { error: `${name} value out of bounds [${min}-${max}]: ${lo}-${hi}` };
    }
    for (let v = lo; v <= hi; v += step) allowed.add(v);
  }
  return { values: allowed };
}

function validateCronExpr(expr) {
  if (expr === undefined || expr === null || expr === '') {
    return ['cron expression is empty'];
  }
  const str = String(expr).trim();
  const parts = str.split(/\s+/);
  if (parts.length !== 5) {
    return [`cron must have 5 fields (got ${parts.length})`];
  }
  const errors = [];
  for (let i = 0; i < 5; i += 1) {
    const r = parseCronField(parts[i], CRON_FIELD_NAMES[i]);
    if (r.error) errors.push(r.error);
  }
  return errors;
}

// Given a parsed cron expr and a Date, check if all 5 fields match
function cronMatches(expr, date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return false;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dom = date.getDate();
  const month = date.getMonth() + 1; // JS month is 0-indexed
  const dow = date.getDay();         // 0=Sun..6=Sat
  const values = [
    parseCronField(parts[0], 'minute').values,
    parseCronField(parts[1], 'hour').values,
    parseCronField(parts[2], 'dayOfMonth').values,
    parseCronField(parts[3], 'month').values,
    parseCronField(parts[4], 'dayOfWeek').values,
  ];
  const checks = [minute, hour, dom, month, dow];
  for (let i = 0; i < 5; i += 1) {
    if (!values[i] || !values[i].has(checks[i])) return false;
  }
  return true;
}

// Smart next-fire: iterate minute-by-minute but cap at 1 year
function nextCronFire(expr, from) {
  const fromDate = from instanceof Date ? new Date(from.getTime()) : new Date();
  if (isNaN(fromDate.getTime())) return null;
  // Start at next minute boundary
  const start = new Date(fromDate.getTime());
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);
  const MAX_ITER = 60 * 24 * 366; // ~1 year in minutes
  const step = new Date(start.getTime());
  for (let i = 0; i < MAX_ITER; i += 1) {
    if (cronMatches(expr, step)) return new Date(step.getTime());
    step.setMinutes(step.getMinutes() + 1);
  }
  return null;
}

function nextCronFires(expr, from, count) {
  const n = Math.max(1, Math.min(100, count || DEFAULT_CRON_NEXT_COUNT));
  const fires = [];
  let cursor = from instanceof Date ? new Date(from.getTime()) : new Date();
  for (let i = 0; i < n; i += 1) {
    const next = nextCronFire(expr, cursor);
    if (!next) break;
    fires.push(next.toISOString());
    cursor = next;
  }
  return fires;
}

// ---------------------------------------------------------------------------
// Validation - schedule types
// ---------------------------------------------------------------------------

function validateOnceTime(schedule) {
  if (schedule === undefined || schedule === null || schedule === '') {
    return ['once schedule (ISO timestamp) required'];
  }
  const t = new Date(schedule);
  if (isNaN(t.getTime())) return ['once schedule is not a valid ISO timestamp'];
  if (t.getTime() <= Date.now()) return ['once schedule must be in the future'];
  return [];
}

function validateInterval(schedule) {
  if (schedule === undefined || schedule === null) return ['interval schedule (ms) required'];
  if (typeof schedule !== 'number' || !Number.isInteger(schedule)) {
    return ['interval schedule must be an integer (ms)'];
  }
  if (schedule <= 0) return ['interval must be positive'];
  if (schedule < MIN_INTERVAL_MS) return [`interval must be >= ${MIN_INTERVAL_MS}ms`];
  return [];
}

function nextIntervalFire(schedule, from) {
  if (typeof schedule !== 'number' || schedule < MIN_INTERVAL_MS) return null;
  const base = from instanceof Date ? from : new Date();
  return new Date(base.getTime() + schedule);
}

// ---------------------------------------------------------------------------
// Validation - top-level job
// ---------------------------------------------------------------------------

const VALID_TYPES = ['cron', 'once', 'interval', 'event'];
const VALID_RUN_STATUS = ['success', 'failed', 'skipped'];

function validateJob(body, { partial = false } = {}) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!partial) {
    if (!body.name || typeof body.name !== 'string') errors.push('name required (string)');
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      errors.push(`type must be one of ${VALID_TYPES.join(',')}`);
    }
    if (!body.agentId || typeof body.agentId !== 'string') errors.push('agentId required (string)');
    if (!body.action || typeof body.action !== 'string') errors.push('action required (string)');
  } else {
    // PATCH: type and agentId/action can be omitted; if present must be valid
    if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
      errors.push(`type must be one of ${VALID_TYPES.join(',')}`);
    }
    if (body.agentId !== undefined && (typeof body.agentId !== 'string' || !body.agentId)) {
      errors.push('agentId must be non-empty string');
    }
    if (body.action !== undefined && (typeof body.action !== 'string' || !body.action)) {
      errors.push('action must be non-empty string');
    }
  }
  // Type-specific schedule validation (only when type is provided/known)
  const t = body.type;
  if (t === 'cron') {
    const ce = validateCronExpr(body.schedule);
    for (const e of ce) errors.push(e);
  } else if (t === 'once') {
    const oe = validateOnceTime(body.schedule);
    for (const e of oe) errors.push(e);
  } else if (t === 'interval') {
    const ie = validateInterval(body.schedule);
    for (const e of ie) errors.push(e);
  } else if (t === 'event') {
    if (!body.schedule || typeof body.schedule !== 'string') {
      errors.push('event schedule (pattern string) required');
    }
  }
  // params optional object
  if (body.params !== undefined && body.params !== null && typeof body.params !== 'object') {
    errors.push('params must be object when provided');
  }
  // callback: optional string or null. Reject other types.
  if (body.callback !== undefined && body.callback !== null && typeof body.callback !== 'string') {
    errors.push('callback must be string or null');
  }
  // retries: integer 0-3
  if (body.retries !== undefined) {
    if (typeof body.retries !== 'number' || !Number.isInteger(body.retries)) {
      errors.push('retries must be integer');
    } else if (body.retries < 0 || body.retries > 3) {
      errors.push('retries must be between 0 and 3');
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function nextFireTime(job, from) {
  if (!job || typeof job !== 'object') return null;
  if (job.type === 'cron') return nextCronFire(job.schedule, from || new Date());
  if (job.type === 'once') {
    const t = new Date(job.schedule);
    if (isNaN(t.getTime())) return null;
    return t;
  }
  if (job.type === 'interval') return nextIntervalFire(job.schedule, from || new Date());
  if (job.type === 'event') return null;
  return null;
}

function normalizeJob(body, existing) {
  const now = nowIso();
  const merged = { ...(existing || {}), ...body };
  // PATCH merge: if body.callback is null, allow clearing; otherwise keep existing.
  // The validation step ensures callback is string|null|undefined.
  const job = {
    id: existing?.id || body.id || jobId(),
    name: body.name || existing?.name,
    type: body.type || existing?.type,
    schedule: body.schedule !== undefined ? body.schedule : existing?.schedule,
    agentId: body.agentId || existing?.agentId,
    action: body.action || existing?.action,
    params: body.params !== undefined ? body.params : (existing?.params || null),
    callback: body.callback !== undefined ? body.callback : (existing?.callback ?? null),
    enabled: body.enabled !== undefined ? !!body.enabled : (existing?.enabled !== undefined ? existing.enabled : true),
    lastRunAt: body.lastRunAt !== undefined ? body.lastRunAt : (existing?.lastRunAt || null),
    lastRunStatus: body.lastRunStatus !== undefined ? body.lastRunStatus : (existing?.lastRunStatus || null),
    nextRunAt: body.nextRunAt !== undefined ? body.nextRunAt : null,
    runCount: body.runCount !== undefined ? body.runCount : (existing?.runCount || 0),
    failCount: body.failCount !== undefined ? body.failCount : (existing?.failCount || 0),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  // Recompute nextRunAt after merge
  const nf = nextFireTime(job);
  job.nextRunAt = nf ? nf.toISOString() : null;
  return job;
}

function summarizeJob(job) {
  if (!job || typeof job !== 'object') return null;
  return {
    id: job.id,
    name: job.name,
    type: job.type,
    schedule: job.schedule,
    agentId: job.agentId,
    action: job.action,
    params: job.params || null,
    callback: job.callback ?? null,
    enabled: !!job.enabled,
    lastRunAt: job.lastRunAt,
    lastRunStatus: job.lastRunStatus,
    nextRunAt: job.nextRunAt,
    runCount: job.runCount || 0,
    failCount: job.failCount || 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function summarizeRun(run) {
  if (!run || typeof run !== 'object') return null;
  return {
    id: run.id,
    jobId: run.jobId,
    status: run.status,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    durationMs: typeof run.durationMs === 'number' ? run.durationMs : null,
    error: run.error || null,
  };
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadJobs() {
  ensureDir();
  if (!fs.existsSync(JOBS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8')); } catch { return []; }
}

function saveJobs(jobs) {
  ensureDir();
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

function loadRuns(limit) {
  ensureDir();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let runs = [];
  for (const line of lines) {
    try { runs.push(JSON.parse(line)); } catch { /* skip bad line */ }
  }
  if (typeof limit === 'number' && limit > 0) {
    runs = runs.slice(-limit);
  }
  return runs;
}

function appendRun(run) {
  ensureDir();
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(run) + '\n');
  return run;
}

// ---------------------------------------------------------------------------
// Filters / lookup
// ---------------------------------------------------------------------------

function findJob(jobs, id) { return jobs.find((j) => j.id === id) || null; }
function findIndex(jobs, id) { return jobs.findIndex((j) => j.id === id); }
function byType(jobs, type) {
  if (!type) return jobs;
  return jobs.filter((j) => j.type === type);
}
function byEnabled(jobs, enabled) {
  if (enabled === undefined || enabled === null) return jobs;
  const want = enabled === true || enabled === 'true';
  return jobs.filter((j) => !!j.enabled === want);
}
function byAgent(jobs, agentId) {
  if (!agentId) return jobs;
  return jobs.filter((j) => j.agentId === agentId);
}
function listAll(jobs) { return jobs; }

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// Health
app.get('/health', (_req, res) => res.json({ service: SERVICE_NAME, version: VERSION, port: PORT, status: 'ok' }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// Create
app.post('/api/jobs', requireInternal, (req, res) => {
  const errs = validateJob(req.body, { partial: false });
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const jobs = loadJobs();
  const job = normalizeJob({ ...req.body, enabled: req.body.enabled !== undefined ? !!req.body.enabled : true }, null);
  jobs.push(job);
  saveJobs(jobs);
  res.status(201).json(summarizeJob(job));
});

// List (with filters)
app.get('/api/jobs', (req, res) => {
  let jobs = loadJobs();
  jobs = byType(jobs, req.query.type);
  jobs = byEnabled(jobs, req.query.enabled);
  jobs = byAgent(jobs, req.query.agentId);
  res.json({ count: jobs.length, jobs: jobs.map(summarizeJob) });
});

// IMPORTANT: specific routes must come BEFORE /api/jobs/:id
app.get('/api/jobs/search', (req, res) => {
  let jobs = loadJobs();
  jobs = byType(jobs, req.query.type);
  jobs = byEnabled(jobs, req.query.enabled);
  jobs = byAgent(jobs, req.query.agentId);
  res.json({ count: jobs.length, jobs: jobs.map(summarizeJob) });
});

// Get one
app.get('/api/jobs/:id', (req, res) => {
  const jobs = loadJobs();
  const j = findJob(jobs, req.params.id);
  if (!j) return res.status(404).json({ error: 'not_found', id: req.params.id });
  res.json(summarizeJob(j));
});

// Patch (partial update)
app.patch('/api/jobs/:id', requireInternal, (req, res) => {
  const jobs = loadJobs();
  const idx = findIndex(jobs, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });

  const errs = validateJob(req.body, { partial: true });
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });

  const updated = normalizeJob(req.body, jobs[idx]);
  jobs[idx] = updated;
  saveJobs(jobs);
  res.json(summarizeJob(updated));
});

// Delete
app.delete('/api/jobs/:id', requireInternal, (req, res) => {
  const jobs = loadJobs();
  const idx = findIndex(jobs, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const removed = jobs.splice(idx, 1)[0];
  saveJobs(jobs);
  res.json({ ok: true, id: removed.id });
});

// Enable
app.post('/api/jobs/:id/enable', requireInternal, (req, res) => {
  const jobs = loadJobs();
  const idx = findIndex(jobs, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  jobs[idx].enabled = true;
  jobs[idx].updatedAt = nowIso();
  const nf = nextFireTime(jobs[idx]);
  jobs[idx].nextRunAt = nf ? nf.toISOString() : null;
  saveJobs(jobs);
  res.json(summarizeJob(jobs[idx]));
});

// Disable
app.post('/api/jobs/:id/disable', requireInternal, (req, res) => {
  const jobs = loadJobs();
  const idx = findIndex(jobs, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  jobs[idx].enabled = false;
  jobs[idx].nextRunAt = null;
  jobs[idx].updatedAt = nowIso();
  saveJobs(jobs);
  res.json(summarizeJob(jobs[idx]));
});

// Trigger manually
app.post('/api/jobs/:id/trigger', requireInternal, (req, res) => {
  const jobs = loadJobs();
  const idx = findIndex(jobs, req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const now = nowIso();
  const run = {
    id: runId(),
    jobId: jobs[idx].id,
    status: 'recorded',
    startedAt: now,
    endedAt: now,
    durationMs: 0,
    error: null,
  };
  appendRun(run);
  jobs[idx].lastRunAt = now;
  jobs[idx].lastRunStatus = run.status;
  jobs[idx].runCount = (jobs[idx].runCount || 0) + 1;
  jobs[idx].updatedAt = now;
  const nf = nextFireTime(jobs[idx]);
  jobs[idx].nextRunAt = nf ? nf.toISOString() : null;
  saveJobs(jobs);
  res.json({ ok: true, runId: run.id, status: run.status });
});

// Runs for one job
app.get('/api/jobs/:id/runs', (req, res) => {
  const jobs = loadJobs();
  if (!findJob(jobs, req.params.id)) {
    return res.status(404).json({ error: 'not_found', id: req.params.id });
  }
  const limit = req.query.limit ? Math.max(1, Math.min(1000, parseInt(req.query.limit, 10) || DEFAULT_RUN_LIMIT)) : DEFAULT_RUN_LIMIT;
  const runs = loadRuns(limit).filter((r) => r.jobId === req.params.id);
  res.json({ jobId: req.params.id, count: runs.length, runs: runs.map(summarizeRun) });
});

// Next fire time for one job
app.get('/api/jobs/:id/next', (req, res) => {
  const jobs = loadJobs();
  const j = findJob(jobs, req.params.id);
  if (!j) return res.status(404).json({ error: 'not_found', id: req.params.id });
  const from = req.query.from ? new Date(req.query.from) : new Date();
  const next = nextFireTime(j, isNaN(from.getTime()) ? new Date() : from);
  res.json({ jobId: j.id, nextRunAt: next ? next.toISOString() : null });
});

// Cron next-N fire times
app.get('/api/cron/next', (req, res) => {
  const expr = req.query.expr;
  const errs = validateCronExpr(expr);
  if (errs.length) return res.status(400).json({ error: 'validation', details: errs });
  const from = req.query.from ? new Date(req.query.from) : new Date();
  const count = req.query.count ? parseInt(req.query.count, 10) : DEFAULT_CRON_NEXT_COUNT;
  const fires = nextCronFires(expr, isNaN(from.getTime()) ? new Date() : from, count);
  res.json({ expr, count: fires.length, next: fires });
});

// All runs (with filters)
app.get('/api/runs', (req, res) => {
  const limit = req.query.limit ? Math.max(1, Math.min(1000, parseInt(req.query.limit, 10) || DEFAULT_RUN_LIMIT)) : DEFAULT_RUN_LIMIT;
  let runs = loadRuns(limit);
  if (req.query.jobId) runs = runs.filter((r) => r.jobId === req.query.jobId);
  if (req.query.status) runs = runs.filter((r) => r.status === req.query.status);
  if (req.query.since) {
    const since = new Date(req.query.since);
    if (!isNaN(since.getTime())) {
      runs = runs.filter((r) => new Date(r.startedAt) >= since);
    }
  }
  res.json({ count: runs.length, runs: runs.map(summarizeRun) });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

if (require.main === module) {
  app.listen(PORT, () => {
    ensureDir();
    console.log(`${SERVICE_NAME} listening on :${PORT}`);
  });
}

module.exports = {
  app,
  PORT, SERVICE_NAME, VERSION,
  JOBS_FILE, HISTORY_FILE, MIN_INTERVAL_MS, DEFAULT_CRON_NEXT_COUNT, DEFAULT_RUN_LIMIT,
  VALID_TYPES, VALID_RUN_STATUS, CRON_FIELD_NAMES, CRON_FIELD_BOUNDS,
  validateJob, validateCronExpr, parseCronField, cronMatches,
  nextCronFire, nextCronFires, nextFireTime,
  validateOnceTime, validateInterval, nextIntervalFire,
  normalizeJob, summarizeJob, summarizeRun,
  findJob, findIndex, byType, byEnabled, byAgent, listAll,
  loadJobs, saveJobs, loadRuns, appendRun,
};
