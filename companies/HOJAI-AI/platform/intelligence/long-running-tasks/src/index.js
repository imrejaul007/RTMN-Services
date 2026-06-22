/**
 * Long-Running Tasks Service (Phase 6.4 placeholder)
 *
 * Port: 4812
 *
 * Composes `background-agents` (cron-driven) and `one-shot-actions` (intent +
 * plan) into user-visible multi-hour/multi-day progress.
 *
 * Full implementation lands in Phase 7 ("Multi-user Genie") once we have
 * feedback from Phase 6.1/6.2. This service is a scaffold that:
 *   - reserves the port
 *   - exposes the same envelope shape as other PIOS services
 *   - tracks tasks in PersistentMap (per-user)
 *   - delegates actual work to background-agents / one-shot-actions
 *
 * Routes:
 *   GET    /api/lrt/:userId/tasks
 *   POST   /api/lrt/:userId/tasks
 *   GET    /api/lrt/:userId/tasks/:taskId
 *   DELETE /api/lrt/:userId/tasks/:taskId
 *   POST   /api/lrt/:userId/tasks/:taskId/progress
 *   GET    /health
 *   GET    /ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requireAuth } from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { createLogger } from '@rtmn/shared/lib/logger';

const PORT = parseInt(process.env.PORT || '4812', 10);
const log = createLogger('long-running-tasks');

const tasks = new PersistentMap('lrt-data', { serviceName: 'long-running-tasks' });

const TASK_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  AWAITING_INPUT: 'awaiting_input',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) =>
  res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) =>
  res.status(s).json({
    success: false,
    error: { code, message: msg },
    meta: { timestamp: new Date().toISOString() },
  });

function taskKey(userId, taskId) { return `${userId}:${taskId}`; }

function buildTask(userId, input) {
  return {
    id: input.id || `lrt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    title: String(input.title || 'Untitled task').slice(0, 200),
    description: String(input.description || '').slice(0, 2000),
    status: TASK_STATUS.PENDING,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agentRefs: Array.isArray(input.agentRefs) ? input.agentRefs : [],
    planRef: input.planRef || null,
    history: [],
  };
}

function appendHistory(task, entry) {
  const next = { ...task, history: [...(task.history || []), { ...entry, at: new Date().toISOString() }].slice(-50) };
  next.updatedAt = new Date().toISOString();
  return next;
}

app.get('/health', (_req, res) => send(res, 200, { status: 'healthy', service: 'long-running-tasks', phase: '6.4-stub' }));
app.get('/ready', (_req, res) => send(res, 200, { status: 'ready', service: 'long-running-tasks', phase: '6.4-stub' }));

app.get('/api/lrt/:userId/tasks', requireAuth, (req, res) => {
  const out = [];
  for (const [, t] of tasks) {
    if (t && t.userId === req.params.userId) out.push(t);
  }
  send(res, 200, { tasks: out });
});

app.post('/api/lrt/:userId/tasks', requireAuth, (req, res) => {
  const t = buildTask(req.params.userId, req.body || {});
  tasks.set(taskKey(req.params.userId, t.id), t);
  send(res, 201, t);
});

app.get('/api/lrt/:userId/tasks/:taskId', requireAuth, (req, res) => {
  const t = tasks.get(taskKey(req.params.userId, req.params.taskId));
  if (!t) return sendErr(res, 404, 'not_found', 'Task not found');
  send(res, 200, t);
});

app.delete('/api/lrt/:userId/tasks/:taskId', requireAuth, (req, res) => {
  const t = tasks.get(taskKey(req.params.userId, req.params.taskId));
  if (!t) return sendErr(res, 404, 'not_found', 'Task not found');
  const next = { ...t, status: TASK_STATUS.CANCELLED, updatedAt: new Date().toISOString() };
  tasks.set(taskKey(req.params.userId, req.params.taskId), next);
  send(res, 200, next);
});

app.post('/api/lrt/:userId/tasks/:taskId/progress', requireAuth, (req, res) => {
  const key = taskKey(req.params.userId, req.params.taskId);
  const t = tasks.get(key);
  if (!t) return sendErr(res, 404, 'not_found', 'Task not found');
  const next = appendHistory(
    { ...t, progress: Math.max(0, Math.min(100, Number(req.body?.progress ?? t.progress))), status: req.body?.status || t.status },
    { kind: 'progress', note: req.body?.note || '', progress: req.body?.progress }
  );
  tasks.set(key, next);
  send(res, 200, next);
});

requireEnv(['INTERNAL_SERVICE_TOKEN'], { soft: true });
installGracefulShutdown({ server: app, log });

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => log.info(`long-running-tasks (Phase 6.4 stub) listening on :${PORT}`));
}

export default app;