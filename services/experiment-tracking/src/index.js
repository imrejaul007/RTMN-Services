// Experiment Tracking (4781)
// ML experiment tracking: projects, experiments, runs, metrics, hyperparams, artifacts, comparison.
// Self-contained alternative to W&B / MLflow.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const PORT = process.env.PORT || 4781;
const SERVICE = 'experiment-tracking';

const projects = new Map();    // projectId -> { id, name, description, created }
const experiments = new Map(); // expId -> { id, project_id, name, status, created }
const runs = new Map();        // runId -> { id, experiment_id, name, status, hyperparams, started, ended, tags }
const metrics = new Map();     // metricId -> { id, run_id, name, value, step, ts }
const artifacts = new Map();   // artifactId -> { id, run_id, name, type, size_bytes, url, ts }

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

function seed() {
  // Project
  const projId = uuid();
  projects.set(projId, { id: projId, name: 'hojai-finetune', description: 'Fine-tuning experiments', created: new Date().toISOString() });

  // Experiment
  const expId = uuid();
  experiments.set(expId, { id: expId, project_id: projId, name: 'lora-vs-qlora', status: 'running', created: new Date().toISOString() });

  // Runs
  const configs = [
    { name: 'lora-r8', hyperparams: { method: 'lora', rank: 8, lr: 0.0001, epochs: 3 } },
    { name: 'lora-r16', hyperparams: { method: 'lora', rank: 16, lr: 0.0001, epochs: 3 } },
    { name: 'qlora-r8', hyperparams: { method: 'qlora', rank: 8, lr: 0.0001, epochs: 3 } }
  ];
  configs.forEach(c => {
    const rid = uuid();
    runs.set(rid, { id: rid, experiment_id: expId, name: c.name, status: 'completed',
      hyperparams: c.hyperparams, started: new Date().toISOString(), ended: new Date().toISOString(), tags: [] });
    // Seed some metrics
    ['loss', 'accuracy', 'f1'].forEach(metric => {
      for (let step = 0; step < 5; step++) {
        const mid = uuid();
        const value = metric === 'loss' ? 1.5 / (step + 1) + Math.random() * 0.1
                    : metric === 'accuracy' ? 0.5 + step * 0.1 + Math.random() * 0.05
                    : 0.4 + step * 0.08 + Math.random() * 0.05;
        metrics.set(mid, { id: mid, run_id: rid, name: metric, value: parseFloat(value.toFixed(4)), step, ts: new Date().toISOString() });
      }
    });
    // Seed artifact
    const aid = uuid();
    artifacts.set(aid, { id: aid, run_id: rid, name: 'model.bin', type: 'model', size_bytes: 1024 * 1024 * 250, url: `s3://hojai-models/${rid}/model.bin`, ts: new Date().toISOString() });
  });
}

// Projects
app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  endpoints: ['/api/projects', '/api/projects/:id', '/api/experiments', '/api/runs',
              '/api/runs/:id/metrics', '/api/runs/:id/artifacts', '/api/runs/:id/log',
              '/api/compare']
})));

app.get('/api/projects', (_req, res) => res.json(ok({ projects: [...projects.values()] })));
app.post('/api/projects', (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const p = { id, name, description: description || '', created: new Date().toISOString() };
  projects.set(id, p);
  res.status(201).json(ok({ project: p }));
});

// Experiments
app.get('/api/experiments', (req, res) => {
  const { project_id } = req.query;
  let list = [...experiments.values()];
  if (project_id) list = list.filter(e => e.project_id === project_id);
  res.json(ok({ experiments: list }));
});
app.post('/api/experiments', (req, res) => {
  const { project_id, name } = req.body || {};
  if (!project_id || !name) return res.status(400).json(fail('project_id + name required'));
  if (!projects.has(project_id)) return res.status(404).json(fail('project not found'));
  const id = uuid();
  const e = { id, project_id, name, status: 'running', created: new Date().toISOString() };
  experiments.set(id, e);
  res.status(201).json(ok({ experiment: e }));
});

// Runs
app.get('/api/runs', (req, res) => {
  const { experiment_id, status } = req.query;
  let list = [...runs.values()];
  if (experiment_id) list = list.filter(r => r.experiment_id === experiment_id);
  if (status) list = list.filter(r => r.status === status);
  res.json(ok({ runs: list }));
});
app.get('/api/runs/:id', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json(fail('run not found'));
  res.json(ok({ run: r }));
});
app.post('/api/runs', (req, res) => {
  const { experiment_id, name, hyperparams = {}, tags = [] } = req.body || {};
  if (!experiment_id || !name) return res.status(400).json(fail('experiment_id + name required'));
  if (!experiments.has(experiment_id)) return res.status(404).json(fail('experiment not found'));
  const id = uuid();
  const r = { id, experiment_id, name, status: 'running', hyperparams, tags,
    started: new Date().toISOString(), ended: null };
  runs.set(id, r);
  res.status(201).json(ok({ run: r }));
});
app.post('/api/runs/:id/finish', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json(fail('run not found'));
  r.status = 'completed';
  r.ended = new Date().toISOString();
  runs.set(r.id, r);
  res.json(ok({ run: r }));
});

// Metrics
app.post('/api/runs/:id/log', (req, res) => {
  const { name, value, step = 0 } = req.body || {};
  if (!runs.has(req.params.id)) return res.status(404).json(fail('run not found'));
  if (!name || value === undefined) return res.status(400).json(fail('name + value required'));
  const id = uuid();
  const m = { id, run_id: req.params.id, name, value: parseFloat(value), step, ts: new Date().toISOString() };
  metrics.set(id, m);
  res.status(201).json(ok({ metric: m }));
});

app.get('/api/runs/:id/metrics', (req, res) => {
  if (!runs.has(req.params.id)) return res.status(404).json(fail('run not found'));
  const list = [...metrics.values()].filter(m => m.run_id === req.params.id);
  const byName = {};
  list.forEach(m => {
    if (!byName[m.name]) byName[m.name] = [];
    byName[m.name].push({ step: m.step, value: m.value, ts: m.ts });
  });
  // Sort by step
  Object.keys(byName).forEach(k => byName[k].sort((a, b) => a.step - b.step));
  res.json(ok({ run_id: req.params.id, by_metric: byName, total_points: list.length }));
});

// Artifacts
app.post('/api/runs/:id/artifacts', (req, res) => {
  const { name, type = 'file', size_bytes = 0, url = '' } = req.body || {};
  if (!runs.has(req.params.id)) return res.status(404).json(fail('run not found'));
  if (!name) return res.status(400).json(fail('name required'));
  const id = uuid();
  const a = { id, run_id: req.params.id, name, type, size_bytes, url, ts: new Date().toISOString() };
  artifacts.set(id, a);
  res.status(201).json(ok({ artifact: a }));
});

app.get('/api/runs/:id/artifacts', (req, res) => {
  if (!runs.has(req.params.id)) return res.status(404).json(fail('run not found'));
  const list = [...artifacts.values()].filter(a => a.run_id === req.params.id);
  res.json(ok({ run_id: req.params.id, artifacts: list }));
});

// Compare runs
app.post('/api/compare', (req, res) => {
  const { run_ids, metric } = req.body || {};
  if (!Array.isArray(run_ids) || run_ids.length === 0) return res.status(400).json(fail('run_ids array required'));
  const comparison = run_ids.map(rid => {
    const r = runs.get(rid);
    if (!r) return { run_id: rid, error: 'not found' };
    const ms = [...metrics.values()].filter(m => m.run_id === rid);
    const summary = {};
    ms.forEach(m => {
      if (!summary[m.name]) summary[m.name] = { min: m.value, max: m.value, count: 1, last: m.value };
      else {
        summary[m.name].min = Math.min(summary[m.name].min, m.value);
        summary[m.name].max = Math.max(summary[m.name].max, m.value);
        summary[m.name].count++;
        summary[m.name].last = m.value;
      }
    });
    if (metric && summary[metric]) {
      return { run_id: rid, name: r.name, hyperparams: r.hyperparams, metric_summary: summary[metric] };
    }
    return { run_id: rid, name: r.name, hyperparams: r.hyperparams, all_metrics: summary };
  });
  res.json(ok({ comparison }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));