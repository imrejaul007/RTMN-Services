/**
 * Memory Multimodal Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

function createApp() {
  const app = express(); app.use(express.json());
  const assets = new Map(), processors = new Map(), extractions = new Map(), thumbnails = new Map(), transcripts = new Map();
  function genId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

  // Assets
  app.post('/api/assets', (req, res) => {
    const { type, source, metadata } = req.body;
    if (!type || !source) return res.status(400).json({ error: 'type and source required' });
    const validTypes = ['image', 'audio', 'video', 'document', 'whiteboard'];
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid type' });
    const id = genId('asset');
    assets.set(id, { id, type, source, status: 'pending', extractedText: '', metadata: metadata || {}, tags: [], memoryLinks: [], createdAt: new Date().toISOString() });
    res.status(201).json({ id, asset: assets.get(id) });
  });
  app.get('/api/assets', (req, res) => {
    let result = Array.from(assets.values());
    if (req.query.type) result = result.filter(a => a.type === req.query.type);
    if (req.query.status) result = result.filter(a => a.status === req.query.status);
    res.json({ assets: result, total: result.length });
  });
  app.get('/api/assets/:id', (req, res) => {
    const a = assets.get(req.params.id);
    if (!a) return res.status(404).json({ error: 'Asset not found' });
    res.json({ asset: a });
  });
  app.patch('/api/assets/:id', (req, res) => {
    const a = assets.get(req.params.id);
    if (!a) return res.status(404).json({ error: 'Asset not found' });
    Object.assign(a, req.body);
    if (a.status === 'processed') a.processedAt = new Date().toISOString();
    res.json({ asset: a });
  });
  app.delete('/api/assets/:id', (req, res) => {
    if (!assets.has(req.params.id)) return res.status(404).json({ error: 'Asset not found' });
    assets.delete(req.params.id);
    res.json({ message: 'Asset deleted' });
  });

  // Processors
  app.post('/api/processors', (req, res) => {
    const { type } = req.body;
    if (!type) return res.status(400).json({ error: 'type required' });
    const id = genId('proc');
    processors.set(id, { id, type, status: 'idle', totalProcessed: 0, createdAt: new Date().toISOString() });
    res.status(201).json({ id, processor: processors.get(id) });
  });
  app.get('/api/processors', (req, res) => res.json({ processors: Array.from(processors.values()), total: processors.size }));

  // Extract
  app.post('/api/extract', (req, res) => {
    const { assetId } = req.body;
    if (!assetId) return res.status(400).json({ error: 'assetId required' });
    const asset = assets.get(assetId);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    const id = genId('extract');
    const text = `Extracted from ${asset.type}`;
    extractions.set(id, { id, assetId, status: 'completed', content: text, entities: [], createdAt: new Date().toISOString() });
    asset.extractedText = text;
    asset.status = 'processed';
    res.status(201).json({ id, extraction: extractions.get(id) });
  });
  app.get('/api/extractions', (req, res) => {
    let result = Array.from(extractions.values());
    if (req.query.assetId) result = result.filter(e => e.assetId === req.query.assetId);
    res.json({ extractions: result, total: result.length });
  });

  // Search
  app.get('/api/search', (req, res) => {
    const query = req.query.query;
    if (!query) return res.status(400).json({ error: 'query required' });
    const results = Array.from(assets.values())
      .filter(a => a.extractedText && a.extractedText.toLowerCase().includes(query.toLowerCase()))
      .map(a => ({ ...a, score: 0.8 }));
    res.json({ results, total: results.length });
  });

  // Transcripts
  app.post('/api/transcripts', (req, res) => {
    const { assetId, segments } = req.body;
    if (!assetId || !segments) return res.status(400).json({ error: 'assetId and segments required' });
    transcripts.set(assetId, { assetId, segments, createdAt: new Date().toISOString() });
    res.status(201).json({ transcript: transcripts.get(assetId) });
  });
  app.get('/api/transcripts/:assetId', (req, res) => {
    const t = transcripts.get(req.params.assetId);
    if (!t) return res.status(404).json({ error: 'Transcript not found' });
    res.json({ transcript: t });
  });

  // Thumbnails
  app.post('/api/thumbnails', (req, res) => {
    const { assetId, data } = req.body;
    if (!assetId || !data) return res.status(400).json({ error: 'assetId and data required' });
    thumbnails.set(assetId, { assetId, data, createdAt: new Date().toISOString() });
    res.status(201).json({ success: true });
  });

  // Stats
  app.get('/api/stats', (req, res) => {
    res.json({ totalAssets: assets.size, byType: {}, totalProcessors: processors.size, totalExtractions: extractions.size });
  });

  // Health
  app.get('/health', (req, res) => res.json({ service: 'memory-multimodal', status: 'healthy' }));

  return app;
}

describe('Memory Multimodal', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  it('should create image asset', async () => {
    const res = await request(app).post('/api/assets').send({ type: 'image', source: 'upload', metadata: { dimensions: '1920x1080' } });
    expect(res.status).toBe(201);
    expect(res.body.asset.type).toBe('image');
    expect(res.body.asset.status).toBe('pending');
  });

  it('should create audio asset', async () => {
    const res = await request(app).post('/api/assets').send({ type: 'audio', source: 'recording', metadata: { duration: 120 } });
    expect(res.status).toBe(201);
    expect(res.body.asset.type).toBe('audio');
  });

  it('should create video asset', async () => {
    const res = await request(app).post('/api/assets').send({ type: 'video', source: 'capture' });
    expect(res.status).toBe(201);
    expect(res.body.asset.type).toBe('video');
  });

  it('should create document asset', async () => {
    const res = await request(app).post('/api/assets').send({ type: 'document', source: 'upload', metadata: { pageCount: 10 } });
    expect(res.status).toBe(201);
    expect(res.body.asset.type).toBe('document');
  });

  it('should reject invalid type', async () => {
    const res = await request(app).post('/api/assets').send({ type: 'invalid', source: 'upload' });
    expect(res.status).toBe(400);
  });

  it('should list assets by type', async () => {
    await request(app).post('/api/assets').send({ type: 'image', source: 's1' });
    await request(app).post('/api/assets').send({ type: 'audio', source: 's2' });
    const res = await request(app).get('/api/assets?type=image');
    expect(res.body.total).toBe(1);
    expect(res.body.assets[0].type).toBe('image');
  });

  it('should process asset extraction', async () => {
    const { body: { id } } = await request(app).post('/api/assets').send({ type: 'image', source: 's' });
    const res = await request(app).post('/api/extract').send({ assetId: id });
    expect(res.status).toBe(201);
    expect(res.body.extraction.content).toContain('image');
  });

  it('should update asset status', async () => {
    const { body: { id } } = await request(app).post('/api/assets').send({ type: 'document', source: 's' });
    const res = await request(app).patch(`/api/assets/${id}`).send({ status: 'processed', extractedText: 'Extracted text' });
    expect(res.body.asset.status).toBe('processed');
    expect(res.body.asset.extractedText).toBe('Extracted text');
  });

  it('should delete asset', async () => {
    const { body: { id } } = await request(app).post('/api/assets').send({ type: 'image', source: 's' });
    await request(app).delete(`/api/assets/${id}`);
    const res = await request(app).get(`/api/assets/${id}`);
    expect(res.status).toBe(404);
  });

  it('should register processor', async () => {
    const res = await request(app).post('/api/processors').send({ type: 'ocr' });
    expect(res.status).toBe(201);
    expect(res.body.processor.type).toBe('ocr');
  });

  it('should search assets', async () => {
    const { body: { id } } = await request(app).post('/api/assets').send({ type: 'document', source: 's' });
    await request(app).patch(`/api/assets/${id}`).send({ status: 'processed', extractedText: 'Meeting notes about budget' });
    const res = await request(app).get('/api/search?query=budget');
    expect(res.body.total).toBe(1);
  });

  it('should store transcript for audio', async () => {
    const { body: { id } } = await request(app).post('/api/assets').send({ type: 'audio', source: 's', metadata: { duration: 60 } });
    const res = await request(app).post('/api/transcripts').send({ assetId: id, segments: [{ start: 0, end: 10, text: 'Hello' }] });
    expect(res.status).toBe(201);
    expect(res.body.transcript.segments).toHaveLength(1);
  });

  it('should get transcript', async () => {
    const { body: { id } } = await request(app).post('/api/assets').send({ type: 'audio', source: 's' });
    await request(app).post('/api/transcripts').send({ assetId: id, segments: [{ text: 'Test' }] });
    const res = await request(app).get(`/api/transcripts/${id}`);
    expect(res.body.transcript.segments).toHaveLength(1);
  });

  it('should store thumbnail', async () => {
    const { body: { id } } = await request(app).post('/api/assets').send({ type: 'image', source: 's' });
    const res = await request(app).post('/api/thumbnails').send({ assetId: id, data: 'base64...' });
    expect(res.status).toBe(201);
  });

  it('should return stats', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.totalAssets).toBeDefined();
    expect(res.body.totalProcessors).toBeDefined();
  });

  it('should return health', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('healthy');
  });
});