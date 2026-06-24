/**
 * agent-rollback — Instant Revert + Scheduled Rollback
 * Port: 4915
 *
 * Manages rollback operations for deployed agents:
 *   - Instant rollback: revert immediately to a previous version
 *   - Scheduled rollback: revert at a future time
 *   - Conditional rollback: based on metric thresholds (integrates with monitoring)
 *
 * Each rollback records: trigger source (manual/metric/alarm), reason,
 * from/to versions, status, and the deployment record affected.
 *
 * Storage: JSON file at $DATA_DIR/rollbacks.json
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4915', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'rollbacks.json');

const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || 'http://localhost:4913';

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ rollbacks: [], rollback_history: [] }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { rollbacks: [], rollback_history: [] }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateRollbackRequest(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.agentId) return 'agentId required';
  if (!body.fromVersion) return 'fromVersion required (the current/bad version)';
  if (!body.toVersion) return 'toVersion required (the version to revert to)';
  if (body.fromVersion === body.toVersion) return 'fromVersion and toVersion must differ';
  if (body.trigger && !['manual', 'metric', 'alarm', 'scheduled'].includes(body.trigger)) {
    return `invalid trigger: ${body.trigger}`;
  }
  return null;
}

async function notifyDeploymentService(rollback) {
  // Best-effort notification to deployment service that the deployment
  // was rolled back. Failures don't block the rollback record.
  try {
    const r = await fetch(`${DEPLOYMENT_URL}/deployments/${rollback.deployment_id}/rolled-back`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN },
      // signal fetch to fail fast
      signal: AbortSignal.timeout(2000),
    });
    return r.ok;
  } catch (_) {
    return false;
  }
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'agent-rollback', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Create an instant rollback
  app.post('/rollbacks', requireInternal, async (req, res) => {
    const err = validateRollbackRequest(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { agentId, fromVersion, toVersion, reason, deployment_id, trigger = 'manual' } = req.body;
    const data = loadAll();
    const rb = {
      id: newId('rb'),
      agent_id: agentId,
      from_version: fromVersion,
      to_version: toVersion,
      reason: reason || '',
      trigger,
      deployment_id: deployment_id || null,
      status: 'in_progress',
      kind: 'instant',
      scheduled_at: null,
      created_at: nowIso(),
      completed_at: null,
      notified_deployment: false,
    };
    data.rollbacks.push(rb);
    if (deployment_id) {
      rb.notified_deployment = await notifyDeploymentService(rb);
    }
    rb.status = 'completed';
    rb.completed_at = nowIso();
    data.rollback_history.push({ id: rb.id, agent_id: rb.agent_id, from_version: rb.from_version, to_version: rb.to_version, trigger: rb.trigger, completed_at: rb.completed_at });
    if (data.rollback_history.length > 1000) data.rollback_history = data.rollback_history.slice(-1000);
    saveAll(data);
    res.status(201).json(rb);
  });

  // Schedule a rollback for a future time
  app.post('/rollbacks/schedule', requireInternal, (req, res) => {
    const err = validateRollbackRequest(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { agentId, fromVersion, toVersion, reason, scheduled_at } = req.body;
    if (!scheduled_at) return res.status(400).json({ error: 'validation', message: 'scheduled_at is required' });
    const when = new Date(scheduled_at).getTime();
    if (isNaN(when)) return res.status(400).json({ error: 'validation', message: 'scheduled_at must be valid ISO date' });
    if (when < Date.now()) return res.status(400).json({ error: 'validation', message: 'scheduled_at must be in the future' });
    const data = loadAll();
    const rb = {
      id: newId('rb'),
      agent_id: agentId,
      from_version: fromVersion,
      to_version: toVersion,
      reason: reason || '',
      trigger: 'scheduled',
      deployment_id: req.body.deployment_id || null,
      status: 'scheduled',
      kind: 'scheduled',
      scheduled_at,
      created_at: nowIso(),
      completed_at: null,
      notified_deployment: false,
    };
    data.rollbacks.push(rb);
    saveAll(data);
    res.status(201).json(rb);
  });

  // List rollbacks (optionally filter)
  app.get('/rollbacks', requireInternal, (req, res) => {
    const data = loadAll();
    let items = data.rollbacks.slice().reverse();
    if (req.query.agentId) items = items.filter((r) => r.agent_id === req.query.agentId);
    if (req.query.status) items = items.filter((r) => r.status === req.query.status);
    if (req.query.trigger) items = items.filter((r) => r.trigger === req.query.trigger);
    items = items.slice(0, 100);
    res.json({ count: items.length, rollbacks: items });
  });

  // List scheduled rollbacks that are due (for a scheduler) - must come BEFORE /:id
  app.get('/rollbacks/due', requireInternal, (_req, res) => {
    const data = loadAll();
    const now = Date.now();
    const due = data.rollbacks.filter((r) => r.status === 'scheduled' && new Date(r.scheduled_at).getTime() <= now);
    res.json({ count: due.length, rollbacks: due });
  });

  // Get a rollback by id
  app.get('/rollbacks/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.rollbacks.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  // Execute a scheduled rollback (called by scheduler tick)
  app.post('/rollbacks/:id/execute', requireInternal, async (req, res) => {
    const data = loadAll();
    const rb = data.rollbacks.find((r) => r.id === req.params.id);
    if (!rb) return res.status(404).json({ error: 'not_found' });
    if (rb.status !== 'scheduled') return res.status(400).json({ error: 'invalid_op', message: `status is ${rb.status}` });
    rb.status = 'in_progress';
    rb.executed_at = nowIso();
    if (rb.deployment_id) rb.notified_deployment = await notifyDeploymentService(rb);
    rb.status = 'completed';
    rb.completed_at = nowIso();
    data.rollback_history.push({ id: rb.id, agent_id: rb.agent_id, from_version: rb.from_version, to_version: rb.to_version, trigger: rb.trigger, completed_at: rb.completed_at });
    saveAll(data);
    res.json(rb);
  });

  // Cancel a scheduled rollback
  app.post('/rollbacks/:id/cancel', requireInternal, (req, res) => {
    const data = loadAll();
    const rb = data.rollbacks.find((r) => r.id === req.params.id);
    if (!rb) return res.status(404).json({ error: 'not_found' });
    if (rb.status !== 'scheduled') return res.status(400).json({ error: 'invalid_op', message: `cannot cancel: status is ${rb.status}` });
    rb.status = 'cancelled';
    rb.cancelled_at = nowIso();
    saveAll(data);
    res.json(rb);
  });

  // Rollback history per agent
  app.get('/agents/:agentId/history', requireInternal, (req, res) => {
    const data = loadAll();
    const items = data.rollback_history
      .filter((r) => r.agent_id === req.params.agentId)
      .slice(-100);
    res.json({ count: items.length, history: items });
  });

  // Summary
  app.get('/summary', requireInternal, (_req, res) => {
    const data = loadAll();
    const counts = {};
    for (const r of data.rollbacks) counts[r.status] = (counts[r.status] || 0) + 1;
    res.json({ total: data.rollbacks.length, by_status: counts });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[agent-rollback] listening on :${PORT} data=${DATA_FILE}`));
}

module.exports = { createApp, validateRollbackRequest, notifyDeploymentService };