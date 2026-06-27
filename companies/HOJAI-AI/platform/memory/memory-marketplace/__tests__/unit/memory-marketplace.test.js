import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

function createTestApp() {
  const app = express();
  app.use(express.json());

  const memoryTemplates = new Map();
  const subscriptions = new Map();
  const reviews = new Map();
  const categories = new Map();

  const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // CATEGORIES
  app.post('/api/v1/marketplace/categories', async (req, res) => {
    try {
      const { name, description, parentId } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });
      const cat = { id: createId('cat'), name, description: description || '', parentId: parentId || null, templateCount: 0 };
      categories.set(cat.id, cat);
      res.status(201).json(cat);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.get('/api/v1/marketplace/categories', async (req, res) => {
    try {
      const { parentId } = req.query;
      let result = [...categories.values()];
      if (parentId) result = result.filter(c => c.parentId === parentId);
      res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  // TEMPLATES
  app.post('/api/v1/marketplace/templates', async (req, res) => {
    try {
      const { name, providerId, memoryType, price } = req.body;
      if (!name || !providerId) return res.status(400).json({ error: 'name and providerId required' });
      const tpl = {
        id: createId('tpl'), name, providerId, memoryType: memoryType || 'generic',
        price: price || { amount: 0, type: 'free' }, status: 'draft',
        rating: { average: 0, count: 0 }, downloadCount: 0, subscriberCount: 0,
        createdAt: new Date().toISOString(),
      };
      memoryTemplates.set(tpl.id, tpl);
      res.status(201).json(tpl);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.get('/api/v1/marketplace/templates', async (req, res) => {
    try {
      const { status, search } = req.query;
      let result = [...memoryTemplates.values()];
      if (status) result = result.filter(t => t.status === status);
      else result = result.filter(t => t.status === 'published');
      if (search) result = result.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
      res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.get('/api/v1/marketplace/templates/:templateId', async (req, res) => {
    try {
      const tpl = memoryTemplates.get(req.params.templateId);
      if (!tpl) return res.status(404).json({ error: 'Template not found' });
      res.json(tpl);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.post('/api/v1/marketplace/templates/:templateId/publish', async (req, res) => {
    try {
      const tpl = memoryTemplates.get(req.params.templateId);
      if (!tpl) return res.status(404).json({ error: 'Template not found' });
      if (tpl.status === 'published') return res.status(400).json({ error: 'Already published' });
      tpl.status = 'published';
      tpl.publishedAt = new Date().toISOString();
      memoryTemplates.set(tpl.id, tpl);
      res.json({ message: 'Published', template: tpl });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  // SUBSCRIPTIONS
  app.post('/api/v1/marketplace/subscriptions', async (req, res) => {
    try {
      const { templateId, subscriberId } = req.body;
      if (!templateId || !subscriberId) return res.status(400).json({ error: 'templateId and subscriberId required' });
      const tpl = memoryTemplates.get(templateId);
      if (!tpl) return res.status(404).json({ error: 'Template not found' });
      const sub = {
        id: createId('sub'), templateId, subscriberId, status: 'active',
        startDate: new Date().toISOString(),
      };
      subscriptions.set(sub.id, sub);
      tpl.subscriberCount++;
      memoryTemplates.set(tpl.id, tpl);
      res.status(201).json(sub);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  app.get('/api/v1/marketplace/subscriptions', async (req, res) => {
    try {
      const { subscriberId } = req.query;
      let result = [...subscriptions.values()];
      if (subscriberId) result = result.filter(s => s.subscriberId === subscriberId);
      res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  // REVIEWS
  app.post('/api/v1/marketplace/reviews', async (req, res) => {
    try {
      const { templateId, reviewerId, rating, comment } = req.body;
      if (!templateId || !reviewerId || rating === undefined) return res.status(400).json({ error: 'Required fields missing' });
      if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
      const rev = {
        id: createId('rev'), templateId, reviewerId, rating, comment: comment || '',
        status: 'published', helpfulCount: 0,
      };
      reviews.set(rev.id, rev);
      const tpl = memoryTemplates.get(templateId);
      if (tpl) {
        const allReviews = [...reviews.values()].filter(r => r.templateId === templateId);
        tpl.rating = { average: allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length, count: allReviews.length };
        memoryTemplates.set(tpl.id, tpl);
      }
      res.status(201).json(rev);
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  // STATS
  app.get('/api/v1/marketplace/stats', async (req, res) => {
    try {
      res.json({
        templates: { total: memoryTemplates.size, published: [...memoryTemplates.values()].filter(t => t.status === 'published').length },
        subscriptions: { total: subscriptions.size },
        reviews: { total: reviews.size },
      });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  return { app, memoryTemplates, subscriptions, reviews, categories };
}

describe('Memory Marketplace Service', () => {
  describe('Categories', () => {
    it('should create category', async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post('/api/v1/marketplace/categories')
        .send({ name: 'Sales Memory', description: 'Sales related memories' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Sales Memory');
    });

    it('should require name', async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post('/api/v1/marketplace/categories')
        .send({ description: 'test' });

      expect(res.status).toBe(400);
    });

    it('should list categories', async () => {
      const { app } = createTestApp();
      await request(app).post('/api/v1/marketplace/categories').send({ name: 'Cat 1' });
      await request(app).post('/api/v1/marketplace/categories').send({ name: 'Cat 2' });

      const res = await request(app).get('/api/v1/marketplace/categories');
      expect(res.body.length).toBe(2);
    });
  });

  describe('Templates', () => {
    it('should create template', async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post('/api/v1/marketplace/templates')
        .send({ name: 'Customer Insights', providerId: 'provider-1', memoryType: 'customer' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Customer Insights');
      expect(res.body.status).toBe('draft');
    });

    it('should require name and providerId', async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post('/api/v1/marketplace/templates')
        .send({ name: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should publish template', async () => {
      const { app } = createTestApp();
      const createRes = await request(app)
        .post('/api/v1/marketplace/templates')
        .send({ name: 'Test', providerId: 'p1' });

      const res = await request(app)
        .post(`/api/v1/marketplace/templates/${createRes.body.id}/publish`);

      expect(res.status).toBe(200);
      expect(res.body.template.status).toBe('published');
    });

    it('should list published templates', async () => {
      const { app } = createTestApp();
      await request(app).post('/api/v1/marketplace/templates').send({ name: 'Draft', providerId: 'p1' });
      const createRes = await request(app).post('/api/v1/marketplace/templates').send({ name: 'Published', providerId: 'p1' });
      await request(app).post(`/api/v1/marketplace/templates/${createRes.body.id}/publish`);

      const res = await request(app).get('/api/v1/marketplace/templates');
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Published');
    });

    it('should search templates', async () => {
      const { app } = createTestApp();
      const createRes = await request(app).post('/api/v1/marketplace/templates').send({ name: 'Customer Insights', providerId: 'p1' });
      await request(app).post(`/api/v1/marketplace/templates/${createRes.body.id}/publish`);

      const res = await request(app).get('/api/v1/marketplace/templates?search=Customer');
      expect(res.body.length).toBe(1);
    });
  });

  describe('Subscriptions', () => {
    it('should create subscription', async () => {
      const { app } = createTestApp();
      const tplRes = await request(app).post('/api/v1/marketplace/templates').send({ name: 'T', providerId: 'p1' });
      await request(app).post(`/api/v1/marketplace/templates/${tplRes.body.id}/publish`);

      const res = await request(app)
        .post('/api/v1/marketplace/subscriptions')
        .send({ templateId: tplRes.body.id, subscriberId: 'sub-1' });

      expect(res.status).toBe(201);
      expect(res.body.templateId).toBe(tplRes.body.id);
    });

    it('should list subscriptions by subscriber', async () => {
      const { app } = createTestApp();
      const tplRes = await request(app).post('/api/v1/marketplace/templates').send({ name: 'T', providerId: 'p1' });
      await request(app).post(`/api/v1/marketplace/templates/${tplRes.body.id}/publish`);
      await request(app).post('/api/v1/marketplace/subscriptions').send({ templateId: tplRes.body.id, subscriberId: 'sub-1' });

      const res = await request(app).get('/api/v1/marketplace/subscriptions?subscriberId=sub-1');
      expect(res.body.length).toBe(1);
    });
  });

  describe('Reviews', () => {
    it('should create review', async () => {
      const { app } = createTestApp();
      const tplRes = await request(app).post('/api/v1/marketplace/templates').send({ name: 'T', providerId: 'p1' });
      await request(app).post(`/api/v1/marketplace/templates/${tplRes.body.id}/publish`);

      const res = await request(app)
        .post('/api/v1/marketplace/reviews')
        .send({ templateId: tplRes.body.id, reviewerId: 'r1', rating: 5, comment: 'Great!' });

      expect(res.status).toBe(201);
      expect(res.body.rating).toBe(5);
    });

    it('should validate rating 1-5', async () => {
      const { app } = createTestApp();
      const tplRes = await request(app).post('/api/v1/marketplace/templates').send({ name: 'T', providerId: 'p1' });
      await request(app).post(`/api/v1/marketplace/templates/${tplRes.body.id}/publish`);

      const res = await request(app)
        .post('/api/v1/marketplace/reviews')
        .send({ templateId: tplRes.body.id, reviewerId: 'r1', rating: 6 });

      expect(res.status).toBe(400);
    });

    it('should update template rating', async () => {
      const { app } = createTestApp();
      const tplRes = await request(app).post('/api/v1/marketplace/templates').send({ name: 'T', providerId: 'p1' });
      await request(app).post(`/api/v1/marketplace/templates/${tplRes.body.id}/publish`);

      await request(app).post('/api/v1/marketplace/reviews').send({ templateId: tplRes.body.id, reviewerId: 'r1', rating: 4 });
      await request(app).post('/api/v1/marketplace/reviews').send({ templateId: tplRes.body.id, reviewerId: 'r2', rating: 5 });

      const tpl = await request(app).get(`/api/v1/marketplace/templates/${tplRes.body.id}`);
      expect(tpl.body.rating.count).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should return marketplace stats', async () => {
      const { app } = createTestApp();
      await request(app).post('/api/v1/marketplace/templates').send({ name: 'T', providerId: 'p1' });

      const res = await request(app).get('/api/v1/marketplace/stats');
      expect(res.body.templates.total).toBe(1);
    });
  });
});
