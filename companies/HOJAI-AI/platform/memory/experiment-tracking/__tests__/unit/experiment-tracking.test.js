/**
 * Experiment Tracking Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

function createApp() {
  const app = express(); app.use(express.json());
  const experiments = new Map(), runs = new Map(), metrics = new Map();
  function genId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

  app.post('/api/experiments', (req, res) => {
    const { name, description, hypothesis, parameters, tags } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = genId('exp');
    experiments.set(id, { id, name, description: description || '', hypothesis: hypothesis || '', parameters: parameters || {}, tags: tags || [], status: 'active', createdAt: new Date().toISOString(), runCount: 0 });
    res.status(201).json({ id, experiment: experiments.get(id) });
  });
  app.get('/api/experiments', (req, res) => {
    let result = Array.from(experiments.values());
    if (req.query.status) result = result.filter(e => e.status === req.query.status);
    res.json({ experiments: result, total: result.length });
  });
  app.get('/api/experiments/:id', (req, res) => {
    const e = experiments.get(req.params.id);
    if (!e) return res.status(404).json({ error: 'Experiment not found' });
    res.json({ experiment: e });
  });
  app.patch('/api/experiments/:id', (req, res) => {
    const e = experiments.get(req.params.id);
    if (!e) return res.status(404).json({ error: 'Experiment not found' });
    if (req.body.status) e.status = req.body.status;
    res.json({ experiment: e });
  });
  app.post('/api/runs', (req, res) => {
    const { experimentId, config, status } = req.body;
    if (!experimentId) return res.status(400).json({ error: 'experimentId is required' });
    if (!experiments.has(experimentId)) return res.status(404).json({ error: 'Experiment not found' });
    const id = genId('run');
    runs.set(id, { id, experimentId, config: config || {}, status: status || 'running', metrics: {}, startedAt: new Date().toISOString() });
    experiments.get(experimentId).runCount++;
    res.status(201).json({ id, run: runs.get(id) });
  });
  app.get('/api/runs', (req, res) => {
    let result = Array.from(runs.values());
    if (req.query.experimentId) result = result.filter(r => r.experimentId === req.query.experimentId);
    res.json({ runs: result, total: result.length });
  });
  app.get('/api/runs/:id', (req, res) => {
    const r = runs.get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Run not found' });
    res.json({ run: r });
  });
  app.patch('/api/runs/:id', (req, res) => {
    const r = runs.get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Run not found' });
    if (req.body.status) { r.status = req.body.status; if (req.body.status === 'completed') r.endedAt = new Date().toISOString(); }
    if (req.body.metrics) r.metrics = { ...r.metrics, ...req.body.metrics };
    res.json({ run: r });
  });
  app.post('/api/metrics', (req, res) => {
    const { runId, name, value, step } = req.body;
    if (!runId || !name || value === undefined) return res.status(400).json({ error: 'runId, name, and value are required' });
    const id = genId('met');
    metrics.set(id, { id, runId, name, value, step: step || 0, timestamp: new Date().toISOString() });
    res.status(201).json({ id, metric: metrics.get(id) });
  });
  app.get('/api/metrics', (req, res) => res.json({ metrics: Array.from(metrics.values()), total: metrics.size }));
  app.get('/api/stats', (req, res) => res.json({ totalExperiments: experiments.size, totalRuns: runs.size, totalMetrics: metrics.size }));
  app.get('/health', (req, res) => res.json({ service: 'experiment-tracking', status: 'healthy' }));
  return app;
}

describe('Experiment Tracking', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  it('should create experiment', async () => {
    const res = await request(app).post('/api/experiments').send({ name: 'Test Exp', hypothesis: 'H1' });
    expect(res.status).toBe(201);
    expect(res.body.experiment.name).toBe('Test Exp');
  });

  it('should reject without name', async () => {
    const res = await request(app).post('/api/experiments').send({});
    expect(res.status).toBe(400);
  });

  it('should list experiments', async () => {
    await request(app).post('/api/experiments').send({ name: 'e1' });
    await request(app).post('/api/experiments').send({ name: 'e2' });
    const res = await request(app).get('/api/experiments');
    expect(res.body.total).toBe(2);
  });

  it('should update experiment status', async () => {
    const { body: { id } } = await request(app).post('/api/experiments').send({ name: 'test' });
    const res = await request(app).patch(`/api/experiments/${id}`).send({ status: 'completed' });
    expect(res.body.experiment.status).toBe('completed');
  });

  it('should create run', async () => {
    const { body: { id } } = await request(app).post('/api/experiments').send({ name: 'exp' });
    const res = await request(app).post('/api/runs').send({ experimentId: id, config: { lr: 0.01 } });
    expect(res.status).toBe(201);
  });

  it('should reject run without experiment', async () => {
    const res = await request(app).post('/api/runs').send({ experimentId: 'fake' });
    expect(res.status).toBe(404);
  });

  it('should update run metrics', async () => {
    const { body: { id } } = await request(app).post('/api/experiments').send({ name: 'exp' });
    const { body: { id: runId } } = await request(app).post('/api/runs').send({ experimentId: id });
    const res = await request(app).patch(`/api/runs/${runId}`).send({ metrics: { accuracy: 0.95 } });
    expect(res.body.run.metrics.accuracy).toBe(0.95);
  });

  it('should complete run', async () => {
    const { body: { id } } = await request(app).post('/api/experiments').send({ name: 'exp' });
    const { body: { id: runId } } = await request(app).post('/api/runs').send({ experimentId: id });
    const res = await request(app).patch(`/api/runs/${runId}`).send({ status: 'completed' });
    expect(res.body.run.endedAt).toBeDefined();
  });

  it('should log metrics', async () => {
    const { body: { id } } = await request(app).post('/api/experiments').send({ name: 'exp' });
    const { body: { id: runId } } = await request(app).post('/api/runs').send({ experimentId: id });
    const res = await request(app).post('/api/metrics').send({ runId, name: 'loss', value: 0.1, step: 100 });
    expect(res.status).toBe(201);
  });

  it('should return stats', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.totalExperiments).toBeDefined();
  });

  it('should return health', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('healthy');
  });
});