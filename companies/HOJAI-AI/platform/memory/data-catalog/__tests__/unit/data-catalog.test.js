/**
 * Data Catalog Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

function createApp() {
  const app = express(); app.use(express.json());
  const catalogs = new Map(), indexes = new Map(), dataItems = new Map();
  function genId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

  app.post('/api/catalogs', (req, res) => {
    const { name, description, schema, owner } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = genId('catalog');
    catalogs.set(id, { id, name, description: description || '', schema: schema || {}, owner: owner || 'system', createdAt: new Date().toISOString(), itemCount: 0 });
    res.status(201).json({ id, catalog: catalogs.get(id) });
  });
  app.get('/api/catalogs', (req, res) => {
    let result = Array.from(catalogs.values());
    if (req.query.owner) result = result.filter(c => c.owner === req.query.owner);
    res.json({ catalogs: result, total: result.length });
  });
  app.get('/api/catalogs/:id', (req, res) => {
    const c = catalogs.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Catalog not found' });
    res.json({ catalog: c });
  });
  app.delete('/api/catalogs/:id', (req, res) => {
    if (!catalogs.has(req.params.id)) return res.status(404).json({ error: 'Catalog not found' });
    catalogs.delete(req.params.id);
    res.json({ message: 'Catalog deleted' });
  });
  app.post('/api/items', (req, res) => {
    const { catalogId, name, type, data, tags } = req.body;
    if (!catalogId || !name) return res.status(400).json({ error: 'catalogId and name are required' });
    if (!catalogs.has(catalogId)) return res.status(404).json({ error: 'Catalog not found' });
    const id = genId('item');
    dataItems.set(id, { id, catalogId, name, type: type || 'document', data, tags: tags || [], createdAt: new Date().toISOString() });
    catalogs.get(catalogId).itemCount++;
    res.status(201).json({ id, item: dataItems.get(id) });
  });
  app.get('/api/items', (req, res) => {
    let result = Array.from(dataItems.values());
    if (req.query.catalogId) result = result.filter(i => i.catalogId === req.query.catalogId);
    if (req.query.type) result = result.filter(i => i.type === req.query.type);
    res.json({ items: result, total: result.length });
  });
  app.get('/api/items/:id', (req, res) => {
    const item = dataItems.get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ item });
  });
  app.delete('/api/items/:id', (req, res) => {
    const item = dataItems.get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    dataItems.delete(req.params.id);
    res.json({ message: 'Item deleted' });
  });
  app.post('/api/indexes', (req, res) => {
    const { name, catalogId, fields, type } = req.body;
    if (!name || !catalogId) return res.status(400).json({ error: 'name and catalogId are required' });
    const id = genId('idx');
    indexes.set(id, { id, name, catalogId, fields: fields || [], type: type || 'btree', createdAt: new Date().toISOString() });
    res.status(201).json({ id, index: indexes.get(id) });
  });
  app.get('/api/indexes', (req, res) => res.json({ indexes: Array.from(indexes.values()), total: indexes.size }));
  app.get('/api/stats', (req, res) => res.json({ catalogs: catalogs.size, items: dataItems.size, indexes: indexes.size }));
  app.get('/health', (req, res) => res.json({ service: 'data-catalog', status: 'healthy' }));
  return app;
}

describe('Data Catalog', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  it('should create catalog', async () => {
    const res = await request(app).post('/api/catalogs').send({ name: 'Test Catalog', owner: 'user1' });
    expect(res.status).toBe(201);
    expect(res.body.catalog.name).toBe('Test Catalog');
  });

  it('should reject catalog without name', async () => {
    const res = await request(app).post('/api/catalogs').send({});
    expect(res.status).toBe(400);
  });

  it('should list catalogs', async () => {
    await request(app).post('/api/catalogs').send({ name: 'c1' });
    await request(app).post('/api/catalogs').send({ name: 'c2' });
    const res = await request(app).get('/api/catalogs');
    expect(res.body.total).toBe(2);
  });

  it('should get catalog by id', async () => {
    const { body: { id } } = await request(app).post('/api/catalogs').send({ name: 'test' });
    const res = await request(app).get(`/api/catalogs/${id}`);
    expect(res.body.catalog.name).toBe('test');
  });

  it('should create item in catalog', async () => {
    const { body: { id } } = await request(app).post('/api/catalogs').send({ name: 'cat' });
    const res = await request(app).post('/api/items').send({ catalogId: id, name: 'item1', type: 'dataset' });
    expect(res.status).toBe(201);
    expect(res.body.item.catalogId).toBe(id);
  });

  it('should reject item without catalog', async () => {
    const res = await request(app).post('/api/items').send({ name: 'item' });
    expect(res.status).toBe(400);
  });

  it('should list items by catalog', async () => {
    const { body: { id } } = await request(app).post('/api/catalogs').send({ name: 'cat' });
    await request(app).post('/api/items').send({ catalogId: id, name: 'i1' });
    await request(app).post('/api/items').send({ catalogId: id, name: 'i2' });
    const res = await request(app).get(`/api/items?catalogId=${id}`);
    expect(res.body.total).toBe(2);
  });

  it('should delete item', async () => {
    const { body: { id } } = await request(app).post('/api/catalogs').send({ name: 'cat' });
    const { body: { id: itemId } } = await request(app).post('/api/items').send({ catalogId: id, name: 'item' });
    await request(app).delete(`/api/items/${itemId}`);
    const res = await request(app).get(`/api/items/${itemId}`);
    expect(res.status).toBe(404);
  });

  it('should create index', async () => {
    const { body: { id } } = await request(app).post('/api/catalogs').send({ name: 'cat' });
    const res = await request(app).post('/api/indexes').send({ name: 'idx1', catalogId: id, fields: ['name'] });
    expect(res.status).toBe(201);
  });

  it('should return stats', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.catalogs).toBeDefined();
    expect(res.body.items).toBeDefined();
  });

  it('should return health', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('healthy');
  });
});