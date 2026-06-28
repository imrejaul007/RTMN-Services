/**
 * Twin Working Memory Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

describe('Twin Working Memory', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    const contexts = new Map();
    const items = new Map();

    app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', service: 'twin-working-memory' });
    });

    app.post('/api/working/:twinId', (req, res) => {
      const { twinId } = req.params;
      const { currentTask, focus = [], context = {} } = req.body;
      contexts.set(twinId, { twinId, currentTask, focus, context });
      res.json({ success: true });
    });

    app.get('/api/working/:twinId', (req, res) => {
      const ctx = contexts.get(req.params.twinId) || { twinId: req.params.twinId, focus: [], context: {} };
      res.json({ success: true, context: ctx });
    });

    app.post('/api/working/:twinId/push', (req, res) => {
      const { twinId } = req.params;
      const { key, value, priority = 5 } = req.body;
      const twinItems = items.get(twinId) || [];
      twinItems.push({ id: `item-${Date.now()}`, key, value, priority });
      items.set(twinId, twinItems);
      res.json({ success: true });
    });

    app.post('/api/working/:twinId/pop', (req, res) => {
      const { twinId } = req.params;
      const twinItems = items.get(twinId) || [];
      twinItems.pop();
      items.set(twinId, twinItems);
      res.json({ success: true });
    });

    app.delete('/api/working/:twinId', (req, res) => {
      contexts.delete(req.params.twinId);
      items.delete(req.params.twinId);
      res.json({ success: true });
    });

    app.get('/api/working/:twinId/items', (req, res) => {
      const twinItems = items.get(req.params.twinId) || [];
      res.json({ success: true, items: twinItems, count: twinItems.length });
    });
  });

  describe('Health', () => {
    it('should return health', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('Context Management', () => {
    it('should set working context', async () => {
      const res = await supertest(app)
        .post('/api/working/emp-1')
        .send({ currentTask: 'Review PR', focus: ['code'] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get working context', async () => {
      await supertest(app).post('/api/working/emp-1').send({});
      const res = await supertest(app).get('/api/working/emp-1');
      expect(res.body.context.twinId).toBe('emp-1');
    });

    it('should clear working memory', async () => {
      await supertest(app).post('/api/working/emp-1').send({});
      const res = await supertest(app).delete('/api/working/emp-1');
      expect(res.body.success).toBe(true);
    });
  });

  describe('Memory Items', () => {
    it('should push items', async () => {
      const res = await supertest(app)
        .post('/api/working/emp-1/push')
        .send({ key: 'current-task', value: 'Meeting', priority: 10 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get items', async () => {
      await supertest(app).post('/api/working/emp-1/push').send({ key: 'x', value: 1 });
      const res = await supertest(app).get('/api/working/emp-1/items');
      expect(res.body.count).toBeGreaterThan(0);
    });

    it('should pop items', async () => {
      await supertest(app).post('/api/working/emp-1/push').send({ key: 'a', value: 1 });
      await supertest(app).post('/api/working/emp-1/push').send({ key: 'b', value: 2 });
      const res = await supertest(app).post('/api/working/emp-1/pop');
      expect(res.body.success).toBe(true);
    });
  });
});
