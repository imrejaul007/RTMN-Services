/**
 * studio-projects — Workspace projects + members + RBAC + audit log
 * Port: 4901
 *
 * Projects are the top-level container for all AI Studio work.
 * Each project has members with roles (owner/editor/viewer), an
 * audit log of all changes, and tags for organization.
 *
 * Storage: $DATA_DIR/projects.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4901', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'studio-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'projects.json');

const VALID_ROLES = ['owner', 'editor', 'viewer'];
const VALID_STATUSES = ['active', 'archived', 'deleted'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ projects: {}, audit: [] }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { projects: {}, audit: [] }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function appendAudit(data, entry) {
  data.audit.push({ id: newId('aud'), ...entry, created_at: nowIso() });
  if (data.audit.length > 5000) data.audit = data.audit.slice(-5000);
}

function getMemberRole(project, userId) {
  if (!userId) return null;
  const m = project.members.find((m) => m.user_id === userId);
  return m ? m.role : null;
}

function canEdit(project, userId) {
  const r = getMemberRole(project, userId);
  return r === 'owner' || r === 'editor';
}

function canAdmin(project, userId) {
  return getMemberRole(project, userId) === 'owner';
}

function validateCreate(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name || typeof body.name !== 'string') return 'name is required';
  if (typeof body.name === 'string' && body.name.trim().length === 0) return 'name must not be empty';
  if (body.tags !== undefined && !Array.isArray(body.tags)) return 'tags must be an array';
  if (!body.owner_id) return 'owner_id is required';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'studio-projects', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Create project
  app.post('/projects', requireInternal, (req, res) => {
    const err = validateCreate(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, description = '', owner_id, tags = [] } = req.body;
    const data = loadAll();
    const project = {
      id: newId('proj'),
      name,
      description,
      owner_id,
      members: [{ user_id: owner_id, role: 'owner', joined_at: nowIso() }],
      tags: Array.isArray(tags) ? tags : [],
      status: 'active',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.projects[project.id] = project;
    appendAudit(data, { project_id: project.id, user_id: owner_id, action: 'project.create', target: project.id });
    saveAll(data);
    res.status(201).json(project);
  });

  // List projects (filter by owner or member)
  app.get('/projects', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.projects);
    if (req.query.user_id) {
      items = items.filter((p) => p.members.some((m) => m.user_id === req.query.user_id));
    }
    if (req.query.status) items = items.filter((p) => p.status === req.query.status);
    res.json({ count: items.length, projects: items });
  });

  // Get project
  app.get('/projects/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const p = data.projects[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    res.json(p);
  });

  // Update project
  app.put('/projects/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const p = data.projects[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    const { user_id, name, description, tags, status } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id is required' });
    if (!canEdit(p, user_id)) return res.status(403).json({ error: 'forbidden' });
    if (name !== undefined) p.name = name;
    if (description !== undefined) p.description = description;
    if (tags !== undefined) p.tags = Array.isArray(tags) ? tags : p.tags;
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'validation', message: `status must be one of ${VALID_STATUSES.join(',')}` });
      p.status = status;
    }
    p.updated_at = nowIso();
    appendAudit(data, { project_id: p.id, user_id, action: 'project.update', target: p.id });
    saveAll(data);
    res.json(p);
  });

  // Delete project (owner only, soft delete)
  app.delete('/projects/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const p = data.projects[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id is required' });
    if (!canAdmin(p, user_id)) return res.status(403).json({ error: 'forbidden' });
    p.status = 'deleted';
    p.deleted_at = nowIso();
    p.updated_at = nowIso();
    appendAudit(data, { project_id: p.id, user_id, action: 'project.delete', target: p.id });
    saveAll(data);
    res.json({ deleted: true, project_id: p.id });
  });

  // Add member
  app.post('/projects/:id/members', requireInternal, (req, res) => {
    const data = loadAll();
    const p = data.projects[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    const { user_id, new_user_id, role } = req.body || {};
    if (!user_id || !new_user_id || !role) return res.status(400).json({ error: 'validation', message: 'user_id, new_user_id, role required' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'validation', message: `role must be one of ${VALID_ROLES.join(',')}` });
    if (!canAdmin(p, user_id)) return res.status(403).json({ error: 'forbidden' });
    if (p.members.some((m) => m.user_id === new_user_id)) return res.status(409).json({ error: 'conflict', message: 'user already a member' });
    p.members.push({ user_id: new_user_id, role, joined_at: nowIso() });
    p.updated_at = nowIso();
    appendAudit(data, { project_id: p.id, user_id, action: 'member.add', target: new_user_id, detail: { role } });
    saveAll(data);
    res.status(201).json(p);
  });

  // Remove member
  app.delete('/projects/:id/members/:userId', requireInternal, (req, res) => {
    const data = loadAll();
    const p = data.projects[req.params.id];
    if (!p) return res.status(404).json({ error: 'not_found' });
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id is required' });
    if (!canAdmin(p, user_id)) return res.status(403).json({ error: 'forbidden' });
    if (p.owner_id === req.params.userId) return res.status(400).json({ error: 'invalid_op', message: 'cannot remove owner' });
    const before = p.members.length;
    p.members = p.members.filter((m) => m.user_id !== req.params.userId);
    if (p.members.length === before) return res.status(404).json({ error: 'not_found', message: 'member not found' });
    p.updated_at = nowIso();
    appendAudit(data, { project_id: p.id, user_id, action: 'member.remove', target: req.params.userId });
    saveAll(data);
    res.json(p);
  });

  // Audit log
  app.get('/projects/:id/audit', requireInternal, (req, res) => {
    const data = loadAll();
    const items = data.audit.filter((a) => a.project_id === req.params.id).slice(-200);
    res.json({ count: items.length, audit: items });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[studio-projects] listening on :${PORT} data=${DATA_FILE}`));
}

module.exports = { createApp, VALID_ROLES, VALID_STATUSES, getMemberRole, canEdit, canAdmin };