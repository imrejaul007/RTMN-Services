/**
 * refresh-scheduler — Schedule re-crawls, TTL-based refresh, on-demand
 * Port: 5340
 *
 * Schedules refresh jobs (periodic, on-demand, on-stale-triggered).
 * Tracks execution history per schedule.
 *
 * Storage: $DATA_DIR/refresh.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5340', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'knowledge-freshness-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'refresh.json');

const VALID_TRIGGERS = ['periodic', 'on_demand', 'on_stale'];
const VALID_JOB_STATUSES = ['scheduled', 'running', 'completed', 'failed', 'cancelled'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ schedules: {}, runs: {} }, null, 2));
  }
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { schedules: {}, runs: {} }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function computeNextRun(schedule, now = new Date()) {
  if (schedule.trigger !== 'periodic') return null;
  if (!schedule.interval_seconds) return null;
  return new Date(now.getTime() + schedule.interval_seconds * 1000).toISOString();
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateSchedule(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name) return 'name required';
  if (!body.target) return 'target required (e.g. doc_id or url)';
  if (!body.trigger || !VALID_TRIGGERS.includes(body.trigger)) return `trigger must be one of ${VALID_TRIGGERS.join(',')}`;
  if (body.trigger === 'periodic') {
    if (typeof body.interval_seconds !== 'number' || body.interval_seconds <= 0) return 'interval_seconds (positive number) required for periodic';
  }
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'refresh-scheduler', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Schedules CRUD ----
  app.post('/schedules', requireInternal, (req, res) => {
    const err = validateSchedule(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { name, description = '', target, target_type = 'doc_id', trigger, interval_seconds, source = '', enabled = true } = req.body;
    const now = new Date();
    const schedule = {
      id: newId('sch'),
      name, description, target, target_type, trigger,
      interval_seconds: interval_seconds || null,
      source,
      enabled,
      next_run_at: trigger === 'periodic' ? computeNextRun({ trigger, interval_seconds }, now) : null,
      last_run_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.schedules[schedule.id] = schedule;
    saveAll(data);
    res.status(201).json(schedule);
  });

  app.get('/schedules', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.schedules);
    if (req.query.target) items = items.filter((s) => s.target === req.query.target);
    if (req.query.enabled !== undefined) items = items.filter((s) => String(s.enabled) === req.query.enabled);
    res.json({ count: items.length, schedules: items });
  });

  app.get('/schedules/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const s = data.schedules[req.params.id];
    if (!s) return res.status(404).json({ error: 'not_found' });
    res.json(s);
  });

  app.put('/schedules/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const s = data.schedules[req.params.id];
    if (!s) return res.status(404).json({ error: 'not_found' });
    const { name, description, target, target_type, trigger, interval_seconds, enabled, source } = req.body;
    if (name !== undefined) s.name = name;
    if (description !== undefined) s.description = description;
    if (target !== undefined) s.target = target;
    if (target_type !== undefined) s.target_type = target_type;
    if (trigger !== undefined) s.trigger = trigger;
    if (interval_seconds !== undefined) s.interval_seconds = interval_seconds;
    if (enabled !== undefined) s.enabled = enabled;
    if (source !== undefined) s.source = source;
    if (s.trigger === 'periodic' && s.interval_seconds) {
      s.next_run_at = computeNextRun(s, new Date());
    }
    s.updated_at = nowIso();
    saveAll(data);
    res.json(s);
  });

  app.delete('/schedules/:id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.schedules[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.schedules[req.params.id];
    saveAll(data);
    res.json({ deleted: true, id: req.params.id });
  });

  // ---- Trigger refresh ----
  app.post('/schedules/:id/trigger', requireInternal, (req, res) => {
    const data = loadAll();
    const s = data.schedules[req.params.id];
    if (!s) return res.status(404).json({ error: 'not_found' });
    const run = {
      id: newId('run'),
      schedule_id: s.id,
      target: s.target,
      source: s.source,
      status: 'running',
      started_at: nowIso(),
      completed_at: null,
      triggered_by: (req.body && req.body.triggered_by) || 'manual',
      items_refreshed: 0,
      error: null,
    };
    data.runs[run.id] = run;
    // Stub: mark as completed immediately
    run.status = 'completed';
    run.completed_at = nowIso();
    run.items_refreshed = 1;
    s.last_run_at = run.completed_at;
    if (s.trigger === 'periodic' && s.interval_seconds) {
      s.next_run_at = computeNextRun(s, new Date());
    }
    saveAll(data);
    res.status(201).json({ schedule: s, run });
  });

  // ---- Runs ----
  app.get('/runs', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.runs);
    if (req.query.schedule_id) items = items.filter((r) => r.schedule_id === req.query.schedule_id);
    if (req.query.status) items = items.filter((r) => r.status === req.query.status);
    const limit = parseInt(req.query.limit || '50', 10);
    items = items.sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, limit);
    res.json({ count: items.length, runs: items });
  });

  app.get('/runs/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.runs[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`refresh-scheduler listening on ${PORT}`));
}

module.exports = { createApp };