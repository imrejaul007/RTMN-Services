/**
 * studio-eval — Evaluation: datasets, metrics, runs, alerts
 * Port: 4907
 *
 * Datasets contain test cases (input + expected output + criteria).
 * Metrics compute scores on a run (accuracy, exact_match, contains, regex_match, custom).
 * Runs execute a dataset against a target (agent_id or model) and record per-case results.
 * Alerts fire when a metric drops below a threshold.
 *
 * Storage: $DATA_DIR/eval.json (datasets, metrics, runs, alerts)
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4907', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'studio-internal-token';

const EVAL_FILE = path.join(DATA_DIR, 'eval.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EVAL_FILE)) fs.writeFileSync(EVAL_FILE, JSON.stringify({ datasets: {}, dataset_name_to_id: {}, metrics: {}, metric_name_to_id: {}, runs: {}, alerts: {}, alert_name_to_id: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(EVAL_FILE, 'utf8')); } catch (_) { return { datasets: {}, dataset_name_to_id: {}, metrics: {}, metric_name_to_id: {}, runs: {}, alerts: {}, alert_name_to_id: {} }; } }
function saveAll(d) { const tmp = EVAL_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, EVAL_FILE); }

const VALID_METRIC_TYPES = ['accuracy', 'exact_match', 'contains', 'regex_match', 'length', 'latency', 'json_valid', 'custom'];
const VALID_RUN_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'];
const VALID_ALERT_OPS = ['lt', 'lte', 'gt', 'gte', 'eq', 'neq'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function findByIdOrName(items, nameMap, idOrName) {
  if (items[idOrName]) return items[idOrName];
  if (nameMap[idOrName]) return items[nameMap[idOrName]];
  return null;
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// Mock metric computation
function computeMetric(metricType, actual, expected, config = {}) {
  switch (metricType) {
    case 'accuracy': return actual === expected ? 1 : 0;
    case 'exact_match': return (actual || '').trim() === (expected || '').trim() ? 1 : 0;
    case 'contains': return (actual || '').toLowerCase().includes((expected || '').toLowerCase()) ? 1 : 0;
    case 'regex_match': {
      try { return new RegExp(expected).test(actual) ? 1 : 0; } catch (_) { return 0; }
    }
    case 'length': {
      const target = config.target_length || (expected ? String(expected).length : 0);
      const actual_len = (actual || '').length;
      const tolerance = config.tolerance || 0.2;
      const diff = Math.abs(actual_len - target) / Math.max(target, 1);
      return diff <= tolerance ? 1 - diff : 0;
    }
    case 'latency': {
      const target = config.target_latency_ms || 1000;
      const actual_ms = actual || 0;
      return actual_ms <= target ? 1 : target / actual_ms;
    }
    case 'json_valid': {
      try { JSON.parse(actual); return 1; } catch (_) { return 0; }
    }
    case 'custom': return config.score !== undefined ? config.score : 0;
    default: return 0;
  }
}

function validateDataset(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name || typeof body.name !== 'string') return 'name required';
  if (body.cases !== undefined && !Array.isArray(body.cases)) return 'cases must be array';
  return null;
}

function validateCase(c) {
  if (!c.input && c.input !== '') return 'case.input required';
  return null;
}

function validateMetric(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name || typeof body.name !== 'string') return 'name required';
  if (!body.type || !VALID_METRIC_TYPES.includes(body.type)) return `type must be one of: ${VALID_METRIC_TYPES.join(', ')}`;
  return null;
}

function validateAlert(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.name || typeof body.name !== 'string') return 'name required';
  if (!body.metric_id) return 'metric_id required';
  if (!body.op || !VALID_ALERT_OPS.includes(body.op)) return `op must be one of: ${VALID_ALERT_OPS.join(', ')}`;
  if (body.threshold === undefined || typeof body.threshold !== 'number') return 'threshold (number) required';
  return null;
}

function evaluateOp(op, score, threshold) {
  switch (op) {
    case 'lt': return score < threshold;
    case 'lte': return score <= threshold;
    case 'gt': return score > threshold;
    case 'gte': return score >= threshold;
    case 'eq': return score === threshold;
    case 'neq': return score !== threshold;
    default: return false;
  }
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({
    ok: true, service: 'studio-eval', port: PORT,
    metric_types: VALID_METRIC_TYPES, alert_ops: VALID_ALERT_OPS
  }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.get('/capabilities', requireInternal, (_req, res) => {
    res.json({ metric_types: VALID_METRIC_TYPES, alert_ops: VALID_ALERT_OPS, run_statuses: VALID_RUN_STATUSES });
  });

  // ----- Datasets -----

  app.post('/datasets', requireInternal, (req, res) => {
    const err = validateDataset(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    for (const c of req.body.cases || []) {
      const e = validateCase(c);
      if (e) return res.status(400).json({ error: 'validation', message: e });
    }
    const { name, description = '', project_id, user_id, cases = [] } = req.body;
    if (!project_id) return res.status(400).json({ error: 'validation', message: 'project_id required' });
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id required' });
    const data = loadAll();
    if (data.dataset_name_to_id[name]) return res.status(409).json({ error: 'conflict', message: `dataset ${name} exists` });
    const ds = {
      id: newId('ds'),
      name,
      description,
      project_id,
      user_id,
      cases: cases.map((c, i) => ({
        id: c.id || newId('cs'),
        index: i,
        input: c.input,
        expected_output: c.expected_output || '',
        metadata: c.metadata || {},
        criteria: c.criteria || {}
      })),
      case_count: cases.length,
      created_at: nowIso(),
      updated_at: nowIso()
    };
    data.datasets[ds.id] = ds;
    data.dataset_name_to_id[name] = ds.id;
    saveAll(data);
    res.status(201).json(ds);
  });

  app.get('/datasets', requireInternal, (req, res) => {
    const data = loadAll();
    const seen = new Set();
    const items = [];
    for (const ds of Object.values(data.datasets)) {
      if (!ds.id || seen.has(ds.id)) continue;
      seen.add(ds.id);
      if (req.query.project_id && ds.project_id !== req.query.project_id) continue;
      if (req.query.user_id && ds.user_id !== req.query.user_id) continue;
      items.push(ds);
    }
    res.json({ count: items.length, datasets: items });
  });

  app.get('/datasets/:idOrName', requireInternal, (req, res) => {
    const data = loadAll();
    const ds = findByIdOrName(data.datasets, data.dataset_name_to_id, req.params.idOrName);
    if (!ds) return res.status(404).json({ error: 'not_found' });
    res.json(ds);
  });

  app.put('/datasets/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const ds = data.datasets[req.params.id];
    if (!ds) return res.status(404).json({ error: 'not_found' });
    if (req.body.cases) {
      for (const c of req.body.cases) {
        const e = validateCase(c);
        if (e) return res.status(400).json({ error: 'validation', message: e });
      }
    }
    ['description', 'cases'].forEach((k) => {
      if (req.body[k] !== undefined) {
        ds[k] = req.body[k];
        if (k === 'cases') ds.case_count = req.body[k].length;
      }
    });
    ds.updated_at = nowIso();
    saveAll(data);
    res.json(ds);
  });

  app.delete('/datasets/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const ds = data.datasets[req.params.id];
    if (!ds) return res.status(404).json({ error: 'not_found' });
    delete data.datasets[ds.id];
    delete data.dataset_name_to_id[ds.name];
    saveAll(data);
    res.json({ deleted: true, dataset_id: req.params.id });
  });

  // ----- Metrics -----

  app.post('/metrics', requireInternal, (req, res) => {
    const err = validateMetric(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, type, description = '', project_id, user_id, config = {} } = req.body;
    if (!project_id) return res.status(400).json({ error: 'validation', message: 'project_id required' });
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id required' });
    const data = loadAll();
    if (data.metric_name_to_id[name]) return res.status(409).json({ error: 'conflict', message: `metric ${name} exists` });
    const m = {
      id: newId('mt'),
      name,
      type,
      description,
      project_id,
      user_id,
      config,
      created_at: nowIso()
    };
    data.metrics[m.id] = m;
    data.metric_name_to_id[name] = m.id;
    saveAll(data);
    res.status(201).json(m);
  });

  app.get('/metrics', requireInternal, (req, res) => {
    const data = loadAll();
    const seen = new Set();
    const items = [];
    for (const m of Object.values(data.metrics)) {
      if (!m.id || seen.has(m.id)) continue;
      seen.add(m.id);
      if (req.query.project_id && m.project_id !== req.query.project_id) continue;
      items.push(m);
    }
    res.json({ count: items.length, metrics: items });
  });

  app.get('/metrics/:idOrName', requireInternal, (req, res) => {
    const data = loadAll();
    const m = findByIdOrName(data.metrics, data.metric_name_to_id, req.params.idOrName);
    if (!m) return res.status(404).json({ error: 'not_found' });
    res.json(m);
  });

  app.delete('/metrics/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const m = data.metrics[req.params.id];
    if (!m) return res.status(404).json({ error: 'not_found' });
    delete data.metrics[m.id];
    delete data.metric_name_to_id[m.name];
    saveAll(data);
    res.json({ deleted: true, metric_id: req.params.id });
  });

  // ----- Runs -----

  app.post('/runs', requireInternal, (req, res) => {
    const { dataset_id, dataset_name, metric_ids = [], metric_names = [], target_type, target_id, project_id, user_id } = req.body || {};
    if (!dataset_id && !dataset_name) return res.status(400).json({ error: 'validation', message: 'dataset_id or dataset_name required' });
    const data = loadAll();
    const ds = findByIdOrName(data.datasets, data.dataset_name_to_id, dataset_id || dataset_name);
    if (!ds) return res.status(404).json({ error: 'not_found', message: 'dataset not found' });
    if (ds.cases.length === 0) return res.status(400).json({ error: 'validation', message: 'dataset has no cases' });
    if (!target_type || !target_id) return res.status(400).json({ error: 'validation', message: 'target_type and target_id required' });
    // Resolve metrics
    const metrics = [];
    for (const id of [...metric_ids, ...metric_names]) {
      const m = data.metrics[id];
      if (m) metrics.push(m);
    }
    if (metrics.length === 0) return res.status(400).json({ error: 'validation', message: 'at least one metric required' });
    // Mock execution: compute scores
    const case_results = ds.cases.map((c, i) => {
      const mockOutput = `Output for case ${i}: ${c.expected_output || 'N/A'}`;
      const scores = {};
      for (const m of metrics) {
        const score = computeMetric(m.type, mockOutput, c.expected_output, m.config);
        scores[m.id] = { metric_id: m.id, metric_name: m.name, metric_type: m.type, score, value: score };
      }
      return { case_id: c.id, input: c.input, expected_output: c.expected_output, actual_output: mockOutput, scores };
    });
    // Compute aggregate per metric
    const summary = {};
    for (const m of metrics) {
      const scores = case_results.map(r => r.scores[m.id].score);
      const sum = scores.reduce((a, b) => a + b, 0);
      summary[m.id] = {
        metric_id: m.id,
        metric_name: m.name,
        avg: sum / scores.length,
        min: Math.min(...scores),
        max: Math.max(...scores),
        count: scores.length
      };
    }
    const run = {
      id: newId('run'),
      dataset_id: ds.id,
      dataset_name: ds.name,
      metric_ids: metrics.map(m => m.id),
      target_type,
      target_id,
      project_id: project_id || ds.project_id,
      user_id: user_id || ds.user_id,
      case_count: ds.cases.length,
      case_results,
      summary,
      status: 'completed',
      started_at: nowIso(),
      finished_at: nowIso(),
      duration_ms: Math.floor(Math.random() * 500) + 50
    };
    data.runs[run.id] = run;
    saveAll(data);

    // Check alerts
    const triggered = [];
    for (const alert of Object.values(data.alerts)) {
      if (!alert.id) continue;
      if (alert.metric_id && summary[alert.metric_id]) {
        const score = summary[alert.metric_id].avg;
        if (evaluateOp(alert.op, score, alert.threshold)) {
          triggered.push({ alert_id: alert.id, alert_name: alert.name, score, threshold: alert.threshold, op: alert.op, run_id: run.id });
        }
      }
    }
    res.status(201).json({ run, triggered_alerts: triggered });
  });

  app.get('/runs', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.runs);
    if (req.query.dataset_id) items = items.filter((r) => r.dataset_id === req.query.dataset_id);
    if (req.query.project_id) items = items.filter((r) => r.project_id === req.query.project_id);
    if (req.query.user_id) items = items.filter((r) => r.user_id === req.query.user_id);
    if (req.query.status) items = items.filter((r) => r.status === req.query.status);
    const limit = parseInt(req.query.limit || '50', 10);
    items = items.slice(-limit);
    res.json({ count: items.length, runs: items.reverse() });
  });

  app.get('/runs/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.runs[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  app.delete('/runs/:id', requireInternal, (req, res) => {
    const data = loadAll();
    if (!data.runs[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.runs[req.params.id];
    saveAll(data);
    res.json({ deleted: true, run_id: req.params.id });
  });

  // ----- Alerts -----

  app.post('/alerts', requireInternal, (req, res) => {
    const err = validateAlert(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { name, description = '', metric_id, op, threshold, project_id, user_id, enabled = true } = req.body;
    if (!project_id) return res.status(400).json({ error: 'validation', message: 'project_id required' });
    if (!user_id) return res.status(400).json({ error: 'validation', message: 'user_id required' });
    const data = loadAll();
    if (data.alert_name_to_id[name]) return res.status(409).json({ error: 'conflict', message: `alert ${name} exists` });
    if (!data.metrics[metric_id]) return res.status(400).json({ error: 'validation', message: 'metric not found' });
    const alert = {
      id: newId('al'),
      name,
      description,
      metric_id,
      op,
      threshold,
      project_id,
      user_id,
      enabled,
      created_at: nowIso()
    };
    data.alerts[alert.id] = alert;
    data.alert_name_to_id[name] = alert.id;
    saveAll(data);
    res.status(201).json(alert);
  });

  app.get('/alerts', requireInternal, (req, res) => {
    const data = loadAll();
    const seen = new Set();
    const items = [];
    for (const a of Object.values(data.alerts)) {
      if (!a.id || seen.has(a.id)) continue;
      seen.add(a.id);
      if (req.query.project_id && a.project_id !== req.query.project_id) continue;
      items.push(a);
    }
    res.json({ count: items.length, alerts: items });
  });

  app.get('/alerts/:idOrName', requireInternal, (req, res) => {
    const data = loadAll();
    const a = findByIdOrName(data.alerts, data.alert_name_to_id, req.params.idOrName);
    if (!a) return res.status(404).json({ error: 'not_found' });
    res.json(a);
  });

  app.put('/alerts/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.alerts[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    ['description', 'op', 'threshold', 'enabled'].forEach((k) => {
      if (req.body[k] !== undefined) a[k] = req.body[k];
    });
    if (a.op && !VALID_ALERT_OPS.includes(a.op)) return res.status(400).json({ error: 'validation', message: 'invalid op' });
    saveAll(data);
    res.json(a);
  });

  app.delete('/alerts/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.alerts[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    delete data.alerts[a.id];
    delete data.alert_name_to_id[a.name];
    saveAll(data);
    res.json({ deleted: true, alert_id: req.params.id });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[studio-eval] listening on :${PORT}`));
}

module.exports = { createApp, VALID_METRIC_TYPES, VALID_ALERT_OPS, computeMetric, evaluateOp };
