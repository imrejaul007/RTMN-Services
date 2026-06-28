/**
 * Experiment Tracking Service
 * Memory experiments and iterations
 */
import express from 'express';
import crypto from 'crypto';

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

app.use(express.json());

const experiments = new Map();
const runs = new Map();
const metrics = new Map();

function genId(prefix = 'exp') { return `${prefix}_${crypto.randomBytes(6).toString('hex')}`; }

// Experiments
app.post('/api/experiments', requireInternal, (req, res) => {
  const { name, description, hypothesis, parameters, tags } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = genId('exp');
  experiments.set(id, { id, name, description: description || '', hypothesis: hypothesis || '', parameters: parameters || {}, tags: tags || [], status: 'active', createdAt: new Date().toISOString(), runCount: 0 });
  res.status(201).json({ id, experiment: experiments.get(id) });
});

app.get('/api/experiments', (req, res) => {
  const { status, tag } = req.query;
  let result = Array.from(experiments.values());
  if (status) result = result.filter(e => e.status === status);
  if (tag) result = result.filter(e => e.tags.includes(tag));
  res.json({ experiments: result, total: result.length });
});

app.get('/api/experiments/:id', (req, res) => {
  const e = experiments.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Experiment not found' });
  res.json({ experiment: e });
});

app.patch('/api/experiments/:id', requireInternal, (req, res) => {
  const e = experiments.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Experiment not found' });
  const { status, tags, parameters } = req.body;
  if (status) e.status = status;
  if (tags) e.tags = tags;
  if (parameters) e.parameters = { ...e.parameters, ...parameters };
  res.json({ experiment: e });
});

// Runs
app.post('/api/runs', requireInternal, (req, res) => {
  const { experimentId, config, status } = req.body;
  if (!experimentId) return res.status(400).json({ error: 'experimentId is required' });
  if (!experiments.has(experimentId)) return res.status(404).json({ error: 'Experiment not found' });
  const id = genId('run');
  const run = { id, experimentId, config: config || {}, status: status || 'running', metrics: {}, artifacts: [], startedAt: new Date().toISOString(), endedAt: null };
  runs.set(id, run);
  experiments.get(experimentId).runCount++;
  res.status(201).json({ id, run });
});

app.get('/api/runs', (req, res) => {
  const { experimentId, status } = req.query;
  let result = Array.from(runs.values());
  if (experimentId) result = result.filter(r => r.experimentId === experimentId);
  if (status) result = result.filter(r => r.status === status);
  res.json({ runs: result, total: result.length });
});

app.get('/api/runs/:id', (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Run not found' });
  res.json({ run: r });
});

app.patch('/api/runs/:id', requireInternal, (req, res) => {
  const r = runs.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Run not found' });
  const { status, metrics: m } = req.body;
  if (status) { r.status = status; if (status === 'completed' || status === 'failed') r.endedAt = new Date().toISOString(); }
  if (m) r.metrics = { ...r.metrics, ...m };
  res.json({ run: r });
});

// Metrics
app.post('/api/metrics', requireInternal, (req, res) => {
  const { runId, name, value, step } = req.body;
  if (!runId || !name || value === undefined) return res.status(400).json({ error: 'runId, name, and value are required' });
  if (!runs.has(runId)) return res.status(404).json({ error: 'Run not found' });
  const id = genId('met');
  const metric = { id, runId, name, value, step: step || 0, timestamp: new Date().toISOString() };
  metrics.set(id, metric);
  res.status(201).json({ id, metric });
});

app.get('/api/metrics', (req, res) => {
  const { runId, name } = req.query;
  let result = Array.from(metrics.values());
  if (runId) result = result.filter(m => m.runId === runId);
  if (name) result = result.filter(m => m.name === name);
  res.json({ metrics: result, total: result.length });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({ totalExperiments: experiments.size, totalRuns: runs.size, totalMetrics: metrics.size, runsByStatus: Array.from(runs.values()).reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {}) });
});

app.get('/health', (req, res) => res.json({ service: 'experiment-tracking', status: 'healthy', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 4798;
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => console.log(`Experiment Tracking running on port ${PORT}`));
export default app;