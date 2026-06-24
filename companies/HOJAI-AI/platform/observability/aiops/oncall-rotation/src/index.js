/**
 * oncall-rotation — On-call schedules with rotation handover
 * Port: 5334
 *
 * Defines rotations: a list of users who take turns being on-call,
 * with shift duration (e.g., weekly, daily, hourly). Provides
 * "who is on-call now" queries and shift overrides.
 *
 * Storage: $DATA_DIR/oncall.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5334', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'aiops-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'oncall.json');

const VALID_PERIODS = ['hourly', 'daily', 'weekly'];
const VALID_OVERRIDE_TYPES = ['replace', 'add', 'remove'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function periodMs(period) {
  if (period === 'hourly') return 60 * 60 * 1000;
  if (period === 'daily') return 24 * 60 * 60 * 1000;
  if (period === 'weekly') return 7 * 24 * 60 * 60 * 1000;
  return null;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ rotations: {}, overrides: {} }, null, 2));
  }
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { rotations: {}, overrides: {} }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function currentOncall(rotation, data, now = new Date()) {
  // Check overrides first
  for (const ov of Object.values(data.overrides)) {
    if (ov.rotation_id !== rotation.id) continue;
    const start = new Date(ov.start_at);
    const end = new Date(ov.end_at);
    if (now >= start && now < end) return { user: ov.user_id, override: true, override_id: ov.id, start_at: ov.start_at, end_at: ov.end_at };
  }
  if (!rotation.members || rotation.members.length === 0) return null;
  const shiftMs = periodMs(rotation.period);
  if (!shiftMs) return null;
  const startMs = new Date(rotation.starts_at).getTime();
  const elapsed = now.getTime() - startMs;
  if (elapsed < 0) return null;
  const index = Math.floor(elapsed / shiftMs) % rotation.members.length;
  const shiftStart = new Date(startMs + index * shiftMs);
  const shiftEnd = new Date(shiftStart.getTime() + shiftMs);
  return {
    user: rotation.members[index],
    override: false,
    start_at: shiftStart.toISOString(),
    end_at: shiftEnd.toISOString(),
    shift_index: index,
  };
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateRotation(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name) return 'name required';
  if (!body.period || !VALID_PERIODS.includes(body.period)) return `period must be one of ${VALID_PERIODS.join(',')}`;
  if (!Array.isArray(body.members) || body.members.length === 0) return 'members array required';
  if (!body.starts_at) return 'starts_at required';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'oncall-rotation', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Rotation CRUD ----
  app.post('/rotations', requireInternal, (req, res) => {
    const err = validateRotation(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { name, description = '', period, members, starts_at, timezone = 'UTC' } = req.body;
    const rotation = {
      id: newId('rot'),
      name, description, period, members, starts_at, timezone,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.rotations[rotation.id] = rotation;
    saveAll(data);
    res.status(201).json(rotation);
  });

  app.get('/rotations', requireInternal, (_req, res) => {
    const data = loadAll();
    res.json({ count: Object.keys(data.rotations).length, rotations: Object.values(data.rotations) });
  });

  app.get('/rotations/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.rotations[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  app.put('/rotations/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.rotations[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    const err = validateRotation({ ...r, ...req.body });
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, description, period, members, starts_at, timezone } = req.body;
    if (name !== undefined) r.name = name;
    if (description !== undefined) r.description = description;
    if (period !== undefined) r.period = period;
    if (members !== undefined) r.members = members;
    if (starts_at !== undefined) r.starts_at = starts_at;
    if (timezone !== undefined) r.timezone = timezone;
    r.updated_at = nowIso();
    saveAll(data);
    res.json(r);
  });

  app.delete('/rotations/:id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.rotations[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.rotations[req.params.id];
    // Remove overrides for this rotation
    for (const k of Object.keys(data.overrides)) {
      if (data.overrides[k].rotation_id === req.params.id) delete data.overrides[k];
    }
    saveAll(data);
    res.json({ deleted: true, id: req.params.id });
  });

  // ---- "Who is on-call now?" ----
  app.get('/rotations/:id/now', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.rotations[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    const now = new Date();
    res.json({
      rotation_id: r.id,
      rotation_name: r.name,
      current: currentOncall(r, data, now),
      checked_at: now.toISOString(),
    });
  });

  // ---- Overrides ----
  app.post('/rotations/:id/overrides', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.rotations[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    if (!req.body || !req.body.user_id || !req.body.start_at || !req.body.end_at) {
      return res.status(400).json({ error: 'validation', message: 'user_id, start_at, end_at required' });
    }
    const override = {
      id: newId('ovr'),
      rotation_id: r.id,
      user_id: req.body.user_id,
      type: 'replace',
      start_at: req.body.start_at,
      end_at: req.body.end_at,
      reason: req.body.reason || '',
      created_at: nowIso(),
    };
    data.overrides[override.id] = override;
    saveAll(data);
    res.status(201).json(override);
  });

  app.get('/rotations/:id/overrides', requireInternal, (req, res) => {
    const data = loadAll();
    const items = Object.values(data.overrides).filter((o) => o.rotation_id === req.params.id);
    res.json({ count: items.length, overrides: items });
  });

  app.delete('/overrides/:id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.overrides[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.overrides[req.params.id];
    saveAll(data);
    res.json({ deleted: true, id: req.params.id });
  });

  // 404 fallback
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`oncall-rotation listening on ${PORT}`));
}

module.exports = { createApp };