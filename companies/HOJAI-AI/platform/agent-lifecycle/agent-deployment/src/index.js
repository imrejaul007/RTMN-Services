/**
 * agent-deployment — Canary / Blue-Green / Auto-Rollback
 * Port: 4913
 *
 * Manages deployment strategies for agent versions:
 *   - canary: staged rollout [1%, 10%, 50%, 100%]
 *   - blue_green: instant swap with old version kept for rollback
 *   - immediate: 100% at once
 *
 * Each deployment tracks stages, current percent, status (active/paused/completed/failed/rolled_back).
 * Auto-rollback triggers when monitoring metrics breach threshold.
 *
 * Storage: JSON file at $DATA_DIR/deployments.json
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4913', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'deployments.json');

const DEFAULT_CANARY = [1, 10, 50, 100];
const DEFAULT_POLICY = {
  strategy: 'canary',
  canary_stages: DEFAULT_CANARY,
  stage_interval_seconds: 60,
  auto_rollback: true,
  rollback_threshold: 0.05,
};

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ deployments: [], policies: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { deployments: [], policies: {} }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

/** Validate deployment request body. */
function validateDeployRequest(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.agentId) return 'agentId required';
  if (!body.version) return 'version required';
  if (body.strategy && !['canary', 'blue_green', 'immediate'].includes(body.strategy)) {
    return `invalid strategy: ${body.strategy}`;
  }
  if (body.canary_stages) {
    if (!Array.isArray(body.canary_stages)) return 'canary_stages must be array';
    if (body.canary_stages.length === 0) return 'canary_stages cannot be empty';
    if (body.canary_stages.some((s) => typeof s !== 'number' || s < 0 || s > 100)) return 'canary_stages values must be 0-100';
    if (body.canary_stages[body.canary_stages.length - 1] !== 100) return 'canary_stages must end at 100';
    // Verify monotonic non-decreasing
    for (let i = 1; i < body.canary_stages.length; i++) {
      if (body.canary_stages[i] < body.canary_stages[i - 1]) return 'canary_stages must be non-decreasing';
    }
  }
  return null;
}

/** Advance a canary deployment to the next stage. */
function advanceCanary(dep) {
  const stages = dep.policy.canary_stages;
  const next = (dep.current_stage || 0) + 1;
  if (next >= stages.length) {
    dep.status = 'completed';
    dep.completed_at = nowIso();
    dep.current_percent = 100;
  } else {
    dep.current_stage = next;
    dep.current_percent = stages[next];
    dep.stage_history.push({ stage: next, percent: stages[next], at: nowIso() });
    // Reaching 100% stage auto-completes the deployment
    if (stages[next] === 100) {
      dep.status = 'completed';
      dep.completed_at = nowIso();
    }
  }
}

/** Mark a deployment as failed and (optionally) trigger rollback flag. */
function failDeployment(dep, reason) {
  dep.status = 'failed';
  dep.failure_reason = reason;
  dep.failed_at = nowIso();
  if (dep.policy.auto_rollback) {
    dep.rollback_pending = true;
  }
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'agent-deployment', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Set / update deployment policy for an agent
  app.put('/agents/:agentId/policy', requireInternal, (req, res) => {
    const { agentId } = req.params;
    const policy = { ...DEFAULT_POLICY, ...(req.body || {}) };
    if (!['canary', 'blue_green', 'immediate'].includes(policy.strategy)) {
      return res.status(400).json({ error: 'validation', message: 'invalid strategy' });
    }
    const data = loadAll();
    data.policies[agentId] = policy;
    saveAll(data);
    res.json(policy);
  });

  app.get('/agents/:agentId/policy', requireInternal, (req, res) => {
    const data = loadAll();
    res.json(data.policies[req.params.agentId] || DEFAULT_POLICY);
  });

  // Create a new deployment
  app.post('/deployments', requireInternal, (req, res) => {
    const err = validateDeployRequest(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { agentId, version, strategy, canary_stages } = req.body;
    const data = loadAll();
    const policy = {
      ...DEFAULT_POLICY,
      ...(data.policies[agentId] || {}),
      strategy: strategy || data.policies[agentId]?.strategy || 'canary',
    };
    if (canary_stages) policy.canary_stages = canary_stages;
    // Blue-green & immediate start at 100%
    const initialPercent = policy.strategy === 'canary' ? policy.canary_stages[0] : 100;
    const dep = {
      id: newId('dep'),
      agent_id: agentId,
      version,
      strategy: policy.strategy,
      policy,
      current_stage: policy.strategy === 'canary' ? 0 : null,
      current_percent: initialPercent,
      status: policy.strategy === 'blue_green' ? 'completed' : 'active',
      stage_history: [{ stage: 0, percent: initialPercent, at: nowIso() }],
      previous_version: null,
      created_at: nowIso(),
      rollback_pending: false,
    };
    // Mark any existing active deployments for the same agent as superseded
    for (const d of data.deployments) {
      if (d.agent_id === agentId && d.status === 'active') {
        dep.previous_version = d.version;
        d.status = 'superseded';
        d.superseded_at = nowIso();
      }
    }
    data.deployments.push(dep);
    saveAll(data);
    res.status(201).json(dep);
  });

  // Get a deployment
  app.get('/deployments/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const d = data.deployments.find((x) => x.id === req.params.id);
    if (!d) return res.status(404).json({ error: 'not_found' });
    res.json(d);
  });

  // List deployments (optional filters)
  app.get('/deployments', requireInternal, (req, res) => {
    const data = loadAll();
    let items = data.deployments.slice();
    if (req.query.agentId) items = items.filter((d) => d.agent_id === req.query.agentId);
    if (req.query.status) items = items.filter((d) => d.status === req.query.status);
    items = items.slice(-100).reverse();
    res.json({ count: items.length, deployments: items });
  });

  // Get the currently active deployment for an agent (active OR completed, not failed/superseded/rolled_back)
  app.get('/agents/:agentId/active', requireInternal, (req, res) => {
    const data = loadAll();
    const active = data.deployments
      .filter((d) => d.agent_id === req.params.agentId && ['active', 'paused', 'completed'].includes(d.status))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!active) return res.status(404).json({ error: 'not_found', message: 'no active deployment' });
    res.json(active);
  });

  // Advance a canary deployment to next stage
  app.post('/deployments/:id/advance', requireInternal, (req, res) => {
    const data = loadAll();
    const dep = data.deployments.find((d) => d.id === req.params.id);
    if (!dep) return res.status(404).json({ error: 'not_found' });
    if (dep.strategy !== 'canary') return res.status(400).json({ error: 'invalid_op', message: 'only canary can advance' });
    if (dep.status !== 'active') return res.status(400).json({ error: 'invalid_op', message: `cannot advance: status is ${dep.status}` });
    advanceCanary(dep);
    saveAll(data);
    res.json(dep);
  });

  // Pause an active deployment
  app.post('/deployments/:id/pause', requireInternal, (req, res) => {
    const data = loadAll();
    const dep = data.deployments.find((d) => d.id === req.params.id);
    if (!dep) return res.status(404).json({ error: 'not_found' });
    if (dep.status !== 'active') return res.status(400).json({ error: 'invalid_op', message: `cannot pause: status is ${dep.status}` });
    dep.status = 'paused';
    dep.paused_at = nowIso();
    saveAll(data);
    res.json(dep);
  });

  // Resume a paused deployment
  app.post('/deployments/:id/resume', requireInternal, (req, res) => {
    const data = loadAll();
    const dep = data.deployments.find((d) => d.id === req.params.id);
    if (!dep) return res.status(404).json({ error: 'not_found' });
    if (dep.status !== 'paused') return res.status(400).json({ error: 'invalid_op', message: `cannot resume: status is ${dep.status}` });
    dep.status = 'active';
    dep.resumed_at = nowIso();
    saveAll(data);
    res.json(dep);
  });

  // Report a failure (triggers rollback flag if auto_rollback is true)
  app.post('/deployments/:id/fail', requireInternal, (req, res) => {
    const data = loadAll();
    const dep = data.deployments.find((d) => d.id === req.params.id);
    if (!dep) return res.status(404).json({ error: 'not_found' });
    const { reason } = req.body || {};
    failDeployment(dep, reason || 'manual fail');
    saveAll(data);
    res.json(dep);
  });

  // Mark a deployment as rolled back (called by agent-rollback service)
  app.post('/deployments/:id/rolled-back', requireInternal, (req, res) => {
    const data = loadAll();
    const dep = data.deployments.find((d) => d.id === req.params.id);
    if (!dep) return res.status(404).json({ error: 'not_found' });
    dep.status = 'rolled_back';
    dep.rollback_pending = false;
    dep.rolled_back_at = nowIso();
    saveAll(data);
    res.json(dep);
  });

  // Summary: counts by status
  app.get('/summary', requireInternal, (_req, res) => {
    const data = loadAll();
    const counts = {};
    for (const d of data.deployments) {
      counts[d.status] = (counts[d.status] || 0) + 1;
    }
    res.json({ total: data.deployments.length, by_status: counts });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[agent-deployment] listening on :${PORT} data=${DATA_FILE}`));
}

module.exports = { createApp, validateDeployRequest, advanceCanary, failDeployment, DEFAULT_POLICY };