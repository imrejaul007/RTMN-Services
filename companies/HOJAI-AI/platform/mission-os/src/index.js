/**
 * RTMN MissionOS v1.0
 * First-class Mission unit: define, decompose, track, complete.
 * A Mission is a multi-step goal with sub-tasks, owners, deadlines, status.
 * @port 4295
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

requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4295;
const SERVICE_NAME = 'mission-os';

const MISSION_OS_REQUIRE_AUTH =
  (process.env.MISSION_OS_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
const MISSION_OS_NO_LISTEN =
  (process.env.MISSION_OS_NO_LISTEN ?? '').toLowerCase() === 'true' ||
  process.env.NODE_ENV === 'test';
const authOrBypass = (req, res, next) =>
  MISSION_OS_REQUIRE_AUTH ? requireAuth(req, res, next) : next();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => { const s = Date.now(); res.on('finish', () => console.log(`[mission-os] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now()-s}ms)`)); next(); });

const missions = new PersistentMap('missions', { serviceName: SERVICE_NAME });
const tasks = new PersistentMap('tasks', { serviceName: SERVICE_NAME });
const auditLog = [];

const MISSION_STATUSES = ['planning', 'active', 'paused', 'completed', 'cancelled', 'failed'];
const TASK_STATUSES = ['pending', 'blocked', 'in-progress', 'completed', 'cancelled', 'failed'];

function audit(action, actor, payload) {
  const e = { id: uuidv4(), service: SERVICE_NAME, action, actor: actor || 'system', payload: payload || {}, timestamp: new Date().toISOString() };
  auditLog.push(e); return e;
}

function getMissionOr404(req, res) {
  const m = missions.get(req.params.id);
  if (!m) {
    res.status(404).json({ error: 'Mission not found' });
    return null;
  }
  return m;
}

// POST /api/missions
app.post('/api/missions',requireAuth,  authOrBypass, (req, res) => {
  const { title, goal, owner, deadline, tags, actor } = req.body || {};
  if (!title || !goal) return res.status(400).json({ error: 'title and goal are required' });
  const mission = {
    id: uuidv4(),
    title,
    goal,
    owner: owner || null,
    deadline: deadline || null,
    tags: Array.isArray(tags) ? tags : [],
    status: 'planning',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
  missions.set(mission.id, mission);
  audit('mission.create', actor || 'system', { id: mission.id, title });
  res.status(201).json(mission);
});

// GET /api/missions (list)
app.get('/api/missions', (req, res) => {
  const { status, owner, tag, limit } = req.query;
  let list = Array.from(missions.values());
  if (status) list = list.filter(m => m.status === status);
  if (owner) list = list.filter(m => m.owner === owner);
  if (tag) list = list.filter(m => m.tags.includes(tag));
  const max = Math.min(parseInt(limit, 10) || 100, 1000);
  res.json({ missions: list.slice(-max).reverse(), count: list.length });
});

// GET /api/missions/audit (must come BEFORE /:id route)
app.get('/api/missions/audit', (req, res) => {
  const { action, missionId, limit } = req.query;
  let list = [...auditLog];
  if (action) list = list.filter(e => e.action === action);
  if (missionId) list = list.filter(e => e.payload && e.payload.id === missionId);
  const max = Math.min(parseInt(limit, 10) || 100, 1000);
  res.json({ events: list.slice(-max).reverse(), count: list.length });
});

// GET /api/missions/:id (full graph)
app.get('/api/missions/:id', (req, res) => {
  const m = getMissionOr404(req, res);
  if (!m) return;
  const taskList = Array.from(tasks.values()).filter(t => t.missionId === m.id);
  res.json({ ...m, tasks: taskList, taskCount: taskList.length });
});

// PUT /api/missions/:id
app.put('/api/missions/:id',requireAuth,  authOrBypass, (req, res) => {
  const m = getMissionOr404(req, res);
  if (!m) return;
  const { title, goal, owner, deadline, tags, status, actor } = req.body || {};
  if (title) m.title = title;
  if (goal) m.goal = goal;
  if (owner !== undefined) m.owner = owner;
  if (deadline !== undefined) m.deadline = deadline;
  if (tags) m.tags = Array.isArray(tags) ? tags : [];
  if (status) {
    if (!MISSION_STATUSES.includes(status)) return res.status(400).json({ error: `unknown status '${status}'`, allowed: MISSION_STATUSES });
    m.status = status;
    if (status === 'completed') m.completedAt = new Date().toISOString();
  }
  m.updatedAt = new Date().toISOString();
  missions.set(m.id, m);
  audit('mission.update', actor || 'system', { id: m.id });
  res.json(m);
});

// POST /api/missions/:id/complete
app.post('/api/missions/:id/complete',requireAuth,  authOrBypass, (req, res) => {
  const m = getMissionOr404(req, res);
  if (!m) return;
  // Mark all incomplete tasks as completed
  const missionTasks = Array.from(tasks.values()).filter(t => t.missionId === m.id && t.status !== 'completed' && t.status !== 'cancelled');
  for (const t of missionTasks) {
    t.status = 'completed';
    t.completedAt = new Date().toISOString();
    tasks.set(t.id, t);
  }
  m.status = 'completed';
  m.progress = 1;
  m.completedAt = new Date().toISOString();
  m.updatedAt = m.completedAt;
  missions.set(m.id, m);
  audit('mission.complete', req.body?.actor || 'system', { id: m.id, completedTasks: missionTasks.length });
  res.json({ ...m, autoCompletedTasks: missionTasks.length });
});

// POST /api/missions/:id/tasks
app.post('/api/missions/:id/tasks',requireAuth,  authOrBypass, (req, res) => {
  const m = getMissionOr404(req, res);
  if (!m) return;
  const { title, dependsOn, owner, deadline, actor } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  const task = {
    id: uuidv4(),
    missionId: m.id,
    title,
    dependsOn: Array.isArray(dependsOn) ? dependsOn : [],
    owner: owner || m.owner,
    deadline: deadline || null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  tasks.set(task.id, task);
  // Update mission progress
  updateMissionProgress(m.id);
  audit('task.create', actor || 'system', { id: task.id, missionId: m.id });
  res.status(201).json(task);
});

// PUT /api/missions/:id/tasks/:taskId
app.put('/api/missions/:id/tasks/:taskId',requireAuth,  authOrBypass, (req, res) => {
  const m = getMissionOr404(req, res);
  if (!m) return;
  const t = tasks.get(req.params.taskId);
  if (!t || t.missionId !== m.id) return res.status(404).json({ error: 'Task not found in this mission' });
  const { title, status, owner, deadline, dependsOn, actor } = req.body || {};
  if (title) t.title = title;
  if (status) {
    if (!TASK_STATUSES.includes(status)) return res.status(400).json({ error: `unknown status '${status}'`, allowed: TASK_STATUSES });
    t.status = status;
    if (status === 'completed') t.completedAt = new Date().toISOString();
  }
  if (owner !== undefined) t.owner = owner;
  if (deadline !== undefined) t.deadline = deadline;
  if (dependsOn) t.dependsOn = Array.isArray(dependsOn) ? dependsOn : [];
  tasks.set(t.id, t);
  updateMissionProgress(m.id);
  audit('task.update', actor || 'system', { id: t.id, status: t.status });
  res.json(t);
});

// GET /api/missions/audit
app.get('/api/missions/audit', (req, res) => {
  const { action, limit } = req.query;
  let entries = auditLog;
  if (action) entries = entries.filter(e => e.action === action);
  const max = Math.min(parseInt(limit, 10) || 200, 5000);
  res.json({ entries: entries.slice(-max).reverse(), count: entries.length });
});

function updateMissionProgress(missionId) {
  const m = missions.get(missionId);
  if (!m) return;
  const missionTasks = Array.from(tasks.values()).filter(t => t.missionId === missionId);
  if (missionTasks.length === 0) {
    m.progress = 0;
  } else {
    const completed = missionTasks.filter(t => t.status === 'completed').length;
    m.progress = Number((completed / missionTasks.length).toFixed(3));
  }
  m.updatedAt = new Date().toISOString();
  missions.set(m.id, m);
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, statuses: MISSION_STATUSES }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, port: PORT, missions: missions.size, tasks: tasks.size, audits: auditLog.length, uptime: process.uptime() }));
app.get('/ready', (_req, res) => res.json({ ready: true }));

app.use((err, req, res, next) => { console.error('[mission-os] error:', err); res.status(500).json({ error: 'Internal server error', message: err.message }); });

let server = null;
if (require.main === module && !MISSION_OS_NO_LISTEN) {
  server = app.listen(PORT, () => console.log(`mission-os running on port ${PORT}`));
  installGracefulShutdown(server);
}

module.exports = app;
module.exports.app = app;
module.exports.authOrBypass = authOrBypass;
module.exports.MISSION_OS_REQUIRE_AUTH = MISSION_OS_REQUIRE_AUTH;
module.exports.MISSION_OS_NO_LISTEN = MISSION_OS_NO_LISTEN;
module.exports.SERVICE_NAME = SERVICE_NAME;
module.exports.MISSION_STATUSES = MISSION_STATUSES;
module.exports.TASK_STATUSES = TASK_STATUSES;