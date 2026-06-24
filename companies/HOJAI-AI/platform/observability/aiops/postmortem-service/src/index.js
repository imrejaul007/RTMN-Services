/**
 * postmortem-service — Postmortem templates + action items + blameless culture
 * Port: 5336
 *
 * Creates postmortems for incidents. Each postmortem has:
 * - Summary (blameless)
 * - Timeline
 * - Root cause analysis (5 whys)
 * - Action items (with owners and deadlines)
 *
 * Storage: $DATA_DIR/postmortems.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5336', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'aiops-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'postmortems.json');

const VALID_STATUSES = ['draft', 'in_review', 'published', 'archived'];
const VALID_ACTION_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      templates: { default: defaultTemplate() },
      postmortems: {},
      action_items: {},
    }, null, 2));
  }
}
function defaultTemplate() {
  return {
    name: 'default',
    sections: [
      { name: 'summary', title: 'Summary', description: 'Brief blameless summary of what happened' },
      { name: 'impact', title: 'Impact', description: 'Who was affected, for how long, how severely' },
      { name: 'timeline', title: 'Timeline', description: 'Chronological events leading up to and during the incident' },
      { name: 'root_cause', title: 'Root Cause', description: '5 Whys analysis of contributing factors' },
      { name: 'what_went_well', title: 'What Went Well', description: 'Things that worked well during the incident' },
      { name: 'what_went_wrong', title: 'What Went Wrong', description: 'Things that didn\'t work, contributing to incident duration' },
      { name: 'action_items', title: 'Action Items', description: 'Concrete actions to prevent recurrence' },
    ],
  };
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { templates: { default: defaultTemplate() }, postmortems: {}, action_items: {} }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validatePostmortem(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.title) return 'title required';
  if (!body.incident_id) return 'incident_id required';
  if (!body.summary) return 'summary required (blameless)';
  return null;
}

function validateActionItem(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.postmortem_id) return 'postmortem_id required';
  if (!body.description) return 'description required';
  if (!body.owner) return 'owner required';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'postmortem-service', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Templates ----
  app.get('/templates', requireInternal, (_req, res) => {
    const data = loadAll();
    res.json({ templates: Object.values(data.templates) });
  });

  app.get('/templates/:name', requireInternal, (req, res) => {
    const data = loadAll();
    const t = data.templates[req.params.name];
    if (!t) return res.status(404).json({ error: 'not_found' });
    res.json(t);
  });

  // ---- Postmortems CRUD ----
  app.post('/postmortems', requireInternal, (req, res) => {
    const err = validatePostmortem(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const { title, incident_id, summary, impact = '', timeline = [], root_cause = '', what_went_well = [], what_went_wrong = [], contributors = [], template_name = 'default' } = req.body;
    const pm = {
      id: newId('pm'),
      title, incident_id, summary, impact, timeline,
      root_cause, what_went_well, what_went_wrong,
      contributors: Array.isArray(contributors) ? contributors : [],
      template_name,
      status: 'draft',
      created_at: nowIso(),
      updated_at: nowIso(),
      published_at: null,
    };
    data.postmortems[pm.id] = pm;
    saveAll(data);
    res.status(201).json(pm);
  });

  app.get('/postmortems', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.postmortems);
    if (req.query.status) items = items.filter((p) => p.status === req.query.status);
    if (req.query.incident_id) items = items.filter((p) => p.incident_id === req.query.incident_id);
    const limit = parseInt(req.query.limit || '50', 10);
    items = items.slice(-limit);
    res.json({ count: items.length, postmortems: items });
  });

  app.get('/postmortems/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const p = data.postmortems[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    // Include action items
    const actionItems = Object.values(data.action_items).filter((a) => a.postmortem_id === req.params.id);
    res.json({ ...p, action_items: actionItems });
  });

  app.put('/postmortems/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const p = data.postmortems[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    if (p.status === 'published') return res.status(400).json({ error: 'already_published' });
    const allowed = ['title', 'summary', 'impact', 'timeline', 'root_cause', 'what_went_well', 'what_went_wrong', 'contributors'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) p[k] = req.body[k];
    }
    p.updated_at = nowIso();
    saveAll(data);
    res.json(p);
  });

  app.post('/postmortems/:id/publish', requireInternal, (req, res) => {
    const data = loadAll();
    const p = data.postmortems[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    p.status = 'published';
    p.published_at = nowIso();
    p.published_by = (req.body && req.body.user_id) || 'unknown';
    p.updated_at = nowIso();
    saveAll(data);
    res.json(p);
  });

  app.delete('/postmortems/:id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.postmortems[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.postmortems[req.params.id];
    // Remove action items for this postmortem
    for (const k of Object.keys(data.action_items)) {
      if (data.action_items[k].postmortem_id === req.params.id) delete data.action_items[k];
    }
    saveAll(data);
    res.json({ deleted: true, id: req.params.id });
  });

  // ---- Action Items ----
  app.post('/action-items', requireInternal, (req, res) => {
    const err = validateActionItem(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    if (!data.postmortems[req.body.postmortem_id]) return res.status(404).json({ error: 'postmortem_not_found' });
    const { postmortem_id, description, owner, deadline = null, priority = 'medium', type = 'preventive' } = req.body;
    const item = {
      id: newId('ai'),
      postmortem_id, description, owner, deadline, priority, type,
      status: 'open',
      created_at: nowIso(),
      updated_at: nowIso(),
      completed_at: null,
    };
    data.action_items[item.id] = item;
    saveAll(data);
    res.status(201).json(item);
  });

  app.get('/action-items', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.action_items);
    if (req.query.postmortem_id) items = items.filter((a) => a.postmortem_id === req.query.postmortem_id);
    if (req.query.status) items = items.filter((a) => a.status === req.query.status);
    if (req.query.owner) items = items.filter((a) => a.owner === req.query.owner);
    res.json({ count: items.length, action_items: items });
  });

  app.put('/action-items/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.action_items[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    const allowed = ['description', 'owner', 'deadline', 'priority', 'type', 'status'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === 'status' && !VALID_ACTION_STATUSES.includes(req.body[k])) {
          return res.status(400).json({ error: 'validation', message: 'bad status' });
        }
        a[k] = req.body[k];
      }
    }
    if (req.body.status === 'completed' && !a.completed_at) a.completed_at = nowIso();
    a.updated_at = nowIso();
    saveAll(data);
    res.json(a);
  });

  // 404 fallback
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`postmortem-service listening on ${PORT}`));
}

module.exports = { createApp };