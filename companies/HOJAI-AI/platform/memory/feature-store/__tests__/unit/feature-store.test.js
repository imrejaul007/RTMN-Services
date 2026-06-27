/**
 * Feature Store Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

function createApp() {
  const app = express(); app.use(express.json());
  const groups = new Map(), features = new Map(), views = new Map();
  function genId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

  app.post('/api/groups', (req, res) => {
    const { name, entity, schema } = req.body;
    if (!name || !entity) return res.status(400).json({ error: 'name and entity are required' });
    const id = genId('fg');
    groups.set(id, { id, name, entity, schema: schema || {}, version: 1, createdAt: new Date().toISOString() });
    res.status(201).json({ id, group: groups.get(id) });
  });
  app.get('/api/groups', (req, res) => {
    let result = Array.from(groups.values());
    if (req.query.entity) result = result.filter(g => g.entity === req.query.entity);
    res.json({ groups: result, total: result.length });
  });
  app.get('/api/groups/:id', (req, res) => {
    const g = groups.get(req.params.id);
    if (!g) return res.status(404).json({ error: 'Group not found' });
    res.json({ group: g });
  });
  app.post('/api/features', (req, res) => {
    const { groupId, name, type } = req.body;
    if (!groupId || !name || !type) return res.status(400).json({ error: 'groupId, name, and type are required' });
    if (!groups.has(groupId)) return res.status(404).json({ error: 'Group not found' });
    const id = genId('ftr');
    features.set(id, { id, groupId, name, type, createdAt: new Date().toISOString() });
    res.status(201).json({ id, feature: features.get(id) });
  });
  app.get('/api/features', (req, res) => {
    let result = Array.from(features.values());
    if (req.query.groupId) result = result.filter(f => f.groupId === req.query.groupId);
    res.json({ features: result, total: result.length });
  });
  app.get('/api/features/:id', (req, res) => {
    const f = features.get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Feature not found' });
    res.json({ feature: f });
  });
  app.post('/api/values', (req, res) => {
    const { featureId, entityId, value } = req.body;
    if (!featureId || !entityId || value === undefined) return res.status(400).json({ error: 'featureId, entityId, and value are required' });
    const key = `${featureId}:${entityId}`;
    res.status(201).json({ key, featureId, entityId, value });
  });
  app.post('/api/views', (req, res) => {
    const { name, groupIds } = req.body;
    if (!name || !groupIds) return res.status(400).json({ error: 'name and groupIds are required' });
    const id = genId('fv');
    views.set(id, { id, name, groupIds, createdAt: new Date().toISOString() });
    res.status(201).json({ id, view: views.get(id) });
  });
  app.get('/api/views', (req, res) => res.json({ views: Array.from(views.values()), total: views.size }));
  app.get('/api/stats', (req, res) => res.json({ groups: groups.size, features: features.size, views: views.size }));
  app.get('/health', (req, res) => res.json({ service: 'feature-store', status: 'healthy' }));
  return app;
}

describe('Feature Store', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  it('should create feature group', async () => {
    const res = await request(app).post('/api/groups').send({ name: 'user_features', entity: 'user' });
    expect(res.status).toBe(201);
    expect(res.body.group.entity).toBe('user');
  });

  it('should reject without name/entity', async () => {
    const res = await request(app).post('/api/groups').send({ name: 'test' });
    expect(res.status).toBe(400);
  });

  it('should list groups by entity', async () => {
    await request(app).post('/api/groups').send({ name: 'g1', entity: 'user' });
    await request(app).post('/api/groups').send({ name: 'g2', entity: 'product' });
    const res = await request(app).get('/api/groups?entity=user');
    expect(res.body.total).toBe(1);
  });

  it('should create feature', async () => {
    const { body: { id } } = await request(app).post('/api/groups').send({ name: 'grp', entity: 'user' });
    const res = await request(app).post('/api/features').send({ groupId: id, name: 'age', type: 'int32' });
    expect(res.status).toBe(201);
  });

  it('should reject feature without group', async () => {
    const res = await request(app).post('/api/features').send({ groupId: 'fake', name: 'test', type: 'int' });
    expect(res.status).toBe(404);
  });

  it('should list features by group', async () => {
    const { body: { id } } = await request(app).post('/api/groups').send({ name: 'grp', entity: 'u' });
    await request(app).post('/api/features').send({ groupId: id, name: 'f1', type: 'int' });
    await request(app).post('/api/features').send({ groupId: id, name: 'f2', type: 'float' });
    const res = await request(app).get(`/api/features?groupId=${id}`);
    expect(res.body.total).toBe(2);
  });

  it('should write feature value', async () => {
    const { body: { id } } = await request(app).post('/api/groups').send({ name: 'grp', entity: 'u' });
    const { body: { id: fid } } = await request(app).post('/api/features').send({ groupId: id, name: 'age', type: 'int' });
    const res = await request(app).post('/api/values').send({ featureId: fid, entityId: 'user_1', value: 25 });
    expect(res.status).toBe(201);
    expect(res.body.value).toBe(25);
  });

  it('should create feature view', async () => {
    const { body: { id } } = await request(app).post('/api/groups').send({ name: 'grp', entity: 'u' });
    const res = await request(app).post('/api/views').send({ name: 'user_view', groupIds: [id] });
    expect(res.status).toBe(201);
  });

  it('should return stats', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.groups).toBeDefined();
  });

  it('should return health', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('healthy');
  });
});