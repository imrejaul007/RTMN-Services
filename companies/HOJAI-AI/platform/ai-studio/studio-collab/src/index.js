// studio-collab (4909) — Collaboration layer for AI Studio
// Entities: Comment, EditLock, ActivityEntry, ShareLink

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

// ---------- Storage ----------
function readData(dataDir) {
  const file = path.join(dataDir, 'collab.json');
  if (!fs.existsSync(file)) {
    const seed = {
      comments: {},          // id -> comment
      locks: {},             // id -> lock
      activities: {},        // id -> activity
      share_links: {},       // id -> share link
    };
    fs.writeFileSync(file, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeData(dataDir, data) {
  const file = path.join(dataDir, 'collab.json');
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// ---------- ID helpers ----------
function genId(prefix) {
  return prefix + '_' + crypto.randomBytes(6).toString('hex');
}

// ---------- Validators ----------
function validateComment(body) {
  if (!body) return 'body is required';
  if (typeof body.target_type !== 'string' || !body.target_type.trim()) return 'target_type is required';
  if (typeof body.target_id !== 'string' || !body.target_id.trim()) return 'target_id is required';
  if (typeof body.user_id !== 'string' || !body.user_id.trim()) return 'user_id is required';
  if (typeof body.body !== 'string' || !body.body.trim()) return 'comment body must be a non-empty string';
  if (body.parent_id !== undefined && typeof body.parent_id !== 'string') return 'parent_id must be a string';
  return null;
}

function validateLock(body) {
  if (!body) return 'body is required';
  if (typeof body.target_type !== 'string' || !body.target_type.trim()) return 'target_type is required';
  if (typeof body.target_id !== 'string' || !body.target_id.trim()) return 'target_id is required';
  if (typeof body.user_id !== 'string' || !body.user_id.trim()) return 'user_id is required';
  if (body.ttl_seconds !== undefined) {
    if (typeof body.ttl_seconds !== 'number' || body.ttl_seconds <= 0) return 'ttl_seconds must be a positive number';
  }
  return null;
}

function validateActivity(body) {
  if (!body) return 'body is required';
  if (typeof body.project_id !== 'string' || !body.project_id.trim()) return 'project_id is required';
  if (typeof body.user_id !== 'string' || !body.user_id.trim()) return 'user_id is required';
  if (typeof body.action !== 'string' || !body.action.trim()) return 'action is required';
  if (body.target !== undefined && typeof body.target !== 'object') return 'target must be an object';
  return null;
}

function validateShareLink(body) {
  if (!body) return 'body is required';
  if (typeof body.target_type !== 'string' || !body.target_type.trim()) return 'target_type is required';
  if (typeof body.target_id !== 'string' || !body.target_id.trim()) return 'target_id is required';
  if (!['view', 'edit'].includes(body.permission)) return 'permission must be view or edit';
  if (body.expires_at !== undefined && typeof body.expires_at !== 'string') return 'expires_at must be an ISO string';
  return null;
}

// ---------- Lock helpers ----------
function findActiveLock(data, targetType, targetId) {
  const now = Date.now();
  for (const lock of Object.values(data.locks)) {
    if (
      lock.target_type === targetType &&
      lock.target_id === targetId &&
      !lock.released_at &&
      new Date(lock.expires_at).getTime() > now
    ) {
      return lock;
    }
  }
  return null;
}

// ---------- Activity helper ----------
function recordActivity(data, projectId, userId, action, target) {
  const id = genId('act_');
  const entry = {
    id,
    project_id: projectId,
    user_id: userId,
    action,
    target: target || {},
    created_at: new Date().toISOString(),
  };
  data.activities[id] = entry;
  return entry;
}

// ---------- Service factory ----------
function createService({ dataDir, internalToken }) {
  const data = readData(dataDir);
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Auth middleware
  app.use((req, res, next) => {
    if (req.method === 'GET' && (req.path === '/' || req.path === '/health' || req.path === '/ready')) {
      return next();
    }
    const provided = req.get('X-Internal-Token');
    if (!provided || provided !== internalToken) {
      return res.status(401).json({ error: 'unauthorized', message: 'invalid or missing X-Internal-Token' });
    }
    next();
  });

  // Capabilities + health
  app.get('/', (req, res) => {
    res.json({
      service: 'studio-collab',
      port: 4909,
      capabilities: {
        comments: 'post, list, resolve',
        locks: 'acquire, release, list',
        activity: 'record, list per project',
        share_links: 'create, resolve',
      },
      entity_counts: {
        comments: Object.keys(data.comments).length,
        locks: Object.keys(data.locks).length,
        activities: Object.keys(data.activities).length,
        share_links: Object.keys(data.share_links).length,
      },
    });
  });

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/ready', (req, res) => res.json({ ready: true }));

  // ----- Comments -----
  app.post('/comments', (req, res) => {
    const err = validateComment(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });

    const id = genId('cmt_');
    const comment = {
      id,
      target_type: req.body.target_type.trim(),
      target_id: req.body.target_id.trim(),
      user_id: req.body.user_id.trim(),
      body: req.body.body.trim(),
      parent_id: req.body.parent_id || null,
      created_at: new Date().toISOString(),
      resolved: false,
      resolved_at: null,
      resolved_by: null,
    };
    data.comments[id] = comment;

    // Activity (best-effort; collab doesn't have project_id from a comment)
    // Skip activity for comments since project_id is unknown without a join.

    writeData(dataDir, data);
    res.status(201).json(comment);
  });

  app.get('/comments', (req, res) => {
    const { target_type, target_id, resolved } = req.query;
    let list = Object.values(data.comments);
    if (target_type) list = list.filter((c) => c.target_type === target_type);
    if (target_id) list = list.filter((c) => c.target_id === target_id);
    if (resolved !== undefined) {
      const want = resolved === 'true';
      list = list.filter((c) => c.resolved === want);
    }
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    res.json({ comments: list, total: list.length });
  });

  app.post('/comments/:id/resolve', (req, res) => {
    const c = data.comments[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    if (typeof req.body?.user_id !== 'string' || !req.body.user_id.trim()) {
      return res.status(400).json({ error: 'validation', message: 'user_id is required' });
    }
    c.resolved = true;
    c.resolved_at = new Date().toISOString();
    c.resolved_by = req.body.user_id.trim();
    writeData(dataDir, data);
    res.json(c);
  });

  // ----- Locks -----
  app.post('/locks/acquire', (req, res) => {
    const err = validateLock(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });

    const { target_type, target_id, user_id } = req.body;
    const existing = findActiveLock(data, target_type, target_id);
    if (existing && existing.user_id !== user_id) {
      return res.status(409).json({
        error: 'locked',
        message: 'target is locked by another user',
        lock: existing,
      });
    }

    const ttl = req.body.ttl_seconds || 300;
    const id = existing ? existing.id : genId('lk_');
    const now = Date.now();
    const lock = {
      id,
      target_type,
      target_id,
      user_id,
      acquired_at: existing ? existing.acquired_at : new Date(now).toISOString(),
      expires_at: new Date(now + ttl * 1000).toISOString(),
      released_at: null,
    };
    data.locks[id] = lock;
    writeData(dataDir, data);
    res.status(existing ? 200 : 201).json(lock);
  });

  app.post('/locks/release', (req, res) => {
    const { target_type, target_id, user_id } = req.body || {};
    if (!target_type || !target_id || !user_id) {
      return res.status(400).json({ error: 'validation', message: 'target_type, target_id, user_id required' });
    }
    const lock = findActiveLock(data, target_type, target_id);
    if (!lock) return res.status(404).json({ error: 'not_found' });
    if (lock.user_id !== user_id) {
      return res.status(403).json({ error: 'forbidden', message: 'lock is held by another user' });
    }
    lock.released_at = new Date().toISOString();
    writeData(dataDir, data);
    res.json(lock);
  });

  app.get('/locks', (req, res) => {
    const { target_type, target_id } = req.query;
    let list = Object.values(data.locks).filter((l) => !l.released_at && new Date(l.expires_at) > new Date());
    if (target_type) list = list.filter((l) => l.target_type === target_type);
    if (target_id) list = list.filter((l) => l.target_id === target_id);
    res.json({ locks: list, total: list.length });
  });

  // ----- Activity -----
  app.post('/activity', (req, res) => {
    const err = validateActivity(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const entry = recordActivity(data, req.body.project_id, req.body.user_id, req.body.action, req.body.target);
    writeData(dataDir, data);
    res.status(201).json(entry);
  });

  app.get('/activity', (req, res) => {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'validation', message: 'project_id is required' });
    let list = Object.values(data.activities).filter((a) => a.project_id === project_id);
    const limit = parseInt(req.query.limit, 10);
    if (!isNaN(limit) && limit > 0) list = list.slice(-limit);
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ activities: list, total: list.length });
  });

  // ----- Share links -----
  app.post('/share', (req, res) => {
    const err = validateShareLink(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });

    const id = genId('shr_');
    const link = {
      id,
      target_type: req.body.target_type.trim(),
      target_id: req.body.target_id.trim(),
      permission: req.body.permission,
      expires_at: req.body.expires_at || null,
      created_at: new Date().toISOString(),
    };
    data.share_links[id] = link;
    writeData(dataDir, data);
    res.status(201).json({ ...link, url: `/api/collab/share/${id}` });
  });

  app.get('/share/:id', (req, res) => {
    const link = data.share_links[req.params.id];
    if (!link) return res.status(404).json({ error: 'not_found' });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: 'expired', link });
    }
    res.json(link);
  });

  return app;
}

function createApp() {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const internalToken = process.env.INTERNAL_TOKEN || 'studio-internal-token';
  return createService({ dataDir, internalToken });
}

if (require.main === module) {
  const app = createApp();
  const port = parseInt(process.env.PORT, 10) || 4909;
  app.listen(port, () => {
    console.log(`[studio-collab] listening on :${port}`);
  });
}

module.exports = { createApp, createService };
