/**
 * Knowledge Distillation Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

function createApp() {
  const app = express(); app.use(express.json());
  const bases = new Map(), distillations = new Map(), summaries = new Map();
  function genId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

  app.post('/api/bases', (req, res) => {
    const { name, description, capacity } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = genId('kb');
    bases.set(id, { id, name, description: description || '', capacity: capacity || 1000, currentSize: 0, createdAt: new Date().toISOString() });
    res.status(201).json({ id, base: bases.get(id) });
  });
  app.get('/api/bases', (req, res) => res.json({ bases: Array.from(bases.values()), total: bases.size }));
  app.get('/api/bases/:id', (req, res) => {
    const kb = bases.get(req.params.id);
    if (!kb) return res.status(404).json({ error: 'Knowledge base not found' });
    res.json({ base: kb });
  });
  app.post('/api/distillations', (req, res) => {
    const { baseId, sourceData, targetSize } = req.body;
    if (!baseId || !sourceData) return res.status(400).json({ error: 'baseId and sourceData are required' });
    if (!bases.has(baseId)) return res.status(404).json({ error: 'Knowledge base not found' });
    const id = genId('dist');
    const original = JSON.stringify(sourceData);
    distillations.set(id, { id, baseId, originalSize: original.length, distilledSize: Math.min(original.length, targetSize || 500), status: 'completed', createdAt: new Date().toISOString() });
    res.status(201).json({ id, distillation: distillations.get(id) });
  });
  app.get('/api/distillations', (req, res) => {
    let result = Array.from(distillations.values());
    if (req.query.baseId) result = result.filter(d => d.baseId === req.query.baseId);
    res.json({ distillations: result, total: result.length });
  });
  app.get('/api/distillations/:id', (req, res) => {
    const d = distillations.get(req.params.id);
    if (!d) return res.status(404).json({ error: 'Distillation not found' });
    res.json({ distillation: d });
  });
  app.post('/api/summaries', (req, res) => {
    const { baseId, content, type } = req.body;
    if (!baseId || !content) return res.status(400).json({ error: 'baseId and content are required' });
    if (!bases.has(baseId)) return res.status(404).json({ error: 'Knowledge base not found' });
    const id = genId('sum');
    summaries.set(id, { id, baseId, originalLength: content.length, type: type || 'abstractive', createdAt: new Date().toISOString() });
    res.status(201).json({ id, summary: summaries.get(id) });
  });
  app.get('/api/summaries', (req, res) => {
    let result = Array.from(summaries.values());
    if (req.query.baseId) result = result.filter(s => s.baseId === req.query.baseId);
    res.json({ summaries: result, total: result.length });
  });
  app.get('/api/stats', (req, res) => res.json({ bases: bases.size, distillations: distillations.size, summaries: summaries.size }));
  app.get('/health', (req, res) => res.json({ service: 'knowledge-distillation', status: 'healthy' }));
  return app;
}

describe('Knowledge Distillation', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  it('should create knowledge base', async () => {
    const res = await request(app).post('/api/bases').send({ name: 'ML Knowledge', capacity: 5000 });
    expect(res.status).toBe(201);
    expect(res.body.base.capacity).toBe(5000);
  });

  it('should reject without name', async () => {
    const res = await request(app).post('/api/bases').send({});
    expect(res.status).toBe(400);
  });

  it('should list knowledge bases', async () => {
    await request(app).post('/api/bases').send({ name: 'kb1' });
    await request(app).post('/api/bases').send({ name: 'kb2' });
    const res = await request(app).get('/api/bases');
    expect(res.body.total).toBe(2);
  });

  it('should create distillation', async () => {
    const { body: { id } } = await request(app).post('/api/bases').send({ name: 'kb' });
    const res = await request(app).post('/api/distillations').send({ baseId: id, sourceData: { knowledge: 'test data', more: 'content' }, targetSize: 100 });
    expect(res.status).toBe(201);
  });

  it('should reject distillation without base', async () => {
    const res = await request(app).post('/api/distillations').send({ baseId: 'fake', sourceData: 'test' });
    expect(res.status).toBe(404);
  });

  it('should list distillations by base', async () => {
    const { body: { id } } = await request(app).post('/api/bases').send({ name: 'kb' });
    await request(app).post('/api/distillations').send({ baseId: id, sourceData: 'd1' });
    await request(app).post('/api/distillations').send({ baseId: id, sourceData: 'd2' });
    const res = await request(app).get(`/api/distillations?baseId=${id}`);
    expect(res.body.total).toBe(2);
  });

  it('should create summary', async () => {
    const { body: { id } } = await request(app).post('/api/bases').send({ name: 'kb' });
    const res = await request(app).post('/api/summaries').send({ baseId: id, content: 'This is a long document that needs summarization', type: 'extractive' });
    expect(res.status).toBe(201);
  });

  it('should reject summary without base', async () => {
    const res = await request(app).post('/api/summaries').send({ baseId: 'fake', content: 'test' });
    expect(res.status).toBe(404);
  });

  it('should return stats', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.bases).toBeDefined();
  });

  it('should return health', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('healthy');
  });
});