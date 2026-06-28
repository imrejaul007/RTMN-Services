/**
 * CorpID Webhooks Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import { body, validationResult } from 'express-validator';
import request from 'supertest';

// Mock stores
const webhookMock = new Map();
const deliveryMock = new Map();

function makeModel(name) {
  return {
    findOne: (key) => {
      if (name === 'Webhook') {
        return Promise.resolve(webhookMock.get(key) || null);
      }
      return Promise.resolve(null);
    },
    find: () => {
      if (name === 'Webhook') return Promise.resolve([...webhookMock.values()]);
      if (name === 'WebhookDelivery') return Promise.resolve([...deliveryMock.values()]);
      return Promise.resolve([]);
    },
    create: (data) => {
      if (name === 'Webhook') webhookMock.set(data.webhookId, data);
      if (name === 'WebhookDelivery') deliveryMock.set(data.deliveryId, data);
      return Promise.resolve(data);
    },
    updateOne: () => Promise.resolve({}),
    deleteOne: () => Promise.resolve(),
  };
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sanitizeInput = (obj) => obj;
const NotFoundError = class extends Error { constructor(msg) { super(msg); this.status = 404; } };
const ForbiddenError = class extends Error { constructor(msg) { super(msg); this.status = 403; } };

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

const WEBHOOK_EVENTS = [
  'user.created', 'user.updated', 'user.deleted',
  'user.login', 'user.login_failed',
  'agent.created', 'agent.updated', 'agent.suspended', 'agent.revoked',
  'delegation.created', 'delegation.approved', 'delegation.revoked',
];

function createApp() {
  const Webhook = makeModel('Webhook');
  const WebhookDelivery = makeModel('WebhookDelivery');

  const requireAuth = (req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id: 'CI-IND-user1', role: 'admin' };
    next();
  };

  const app = express();
  app.use(express.json());

  // POST /api/webhooks
  app.post('/api/webhooks', [
    requireAuth,
    body('url').trim().isURL().withMessage('Valid URL required'),
    body('events').isArray({ min: 1 }).withMessage('At least one event required'),
    validate,
  ], asyncHandler(async (req, res) => {
    const { url, events } = sanitizeInput(req.body);
    const webhookId = `WHK_test123`;
    const secret = `whsec_test_secret`;

    const webhook = await Webhook.create({
      webhookId, url, events, secret, active: true, ownerId: req.user.id,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ success: true, webhook: { webhookId, url, events, active: true, secret } });
  }));

  // GET /api/webhooks
  app.get('/api/webhooks', requireAuth, asyncHandler(async (req, res) => {
    const webhooks = await Webhook.find();
    res.json({ success: true, count: webhooks.length, webhooks });
  }));

  // GET /api/webhooks/:id
  app.get('/api/webhooks/:id', requireAuth, asyncHandler(async (req, res) => {
    const webhook = await Webhook.findOne(req.params.id);
    if (!webhook) throw new NotFoundError('Webhook not found');
    res.json({ success: true, webhook });
  }));

  // DELETE /api/webhooks/:id
  app.delete('/api/webhooks/:id', requireAuth, asyncHandler(async (req, res) => {
    const webhook = await Webhook.findOne(req.params.id);
    if (!webhook) throw new NotFoundError('Webhook not found');
    await Webhook.deleteOne(req.params.id);
    res.json({ success: true });
  }));

  // GET /api/webhooks/events
  app.get('/api/webhooks/events', (req, res) => {
    res.json({ success: true, events: WEBHOOK_EVENTS });
  });

  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });

  return app;
}

describe('CorpID Webhooks', () => {
  beforeEach(() => {
    webhookMock.clear();
    deliveryMock.clear();
  });

  describe('POST /api/webhooks', () => {
    it('creates a webhook', async () => {
      const res = await request(createApp())
        .post('/api/webhooks')
        .set('Authorization', 'Bearer test')
        .send({ url: 'https://example.com/webhook', events: ['user.created'] });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.webhook.url).toBe('https://example.com/webhook');
      expect(res.body.webhook.secret).toBeDefined();
    });

    it('rejects invalid URL', async () => {
      const res = await request(createApp())
        .post('/api/webhooks')
        .set('Authorization', 'Bearer test')
        .send({ url: 'not-a-url', events: ['user.created'] });

      expect(res.status).toBe(400);
    });

    it('rejects empty events array', async () => {
      const res = await request(createApp())
        .post('/api/webhooks')
        .set('Authorization', 'Bearer test')
        .send({ url: 'https://example.com/webhook', events: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/webhooks', () => {
    it('lists webhooks', async () => {
      webhookMock.set('WHK_1', { webhookId: 'WHK_1', url: 'https://a.com', events: [], ownerId: 'CI-IND-user1' });

      const res = await request(createApp())
        .get('/api/webhooks')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });

    it('returns 401 without auth', async () => {
      const res = await request(createApp()).get('/api/webhooks');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/webhooks/:id', () => {
    it('gets webhook by id', async () => {
      webhookMock.set('WHK_123', { webhookId: 'WHK_123', url: 'https://test.com' });

      const res = await request(createApp())
        .get('/api/webhooks/WHK_123')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body.webhook.webhookId).toBe('WHK_123');
    });

    it('returns 404 for non-existent webhook', async () => {
      const res = await request(createApp())
        .get('/api/webhooks/invalid')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/webhooks/:id', () => {
    it('deletes webhook', async () => {
      webhookMock.set('WHK_123', { webhookId: 'WHK_123', ownerId: 'CI-IND-user1' });

      const res = await request(createApp())
        .delete('/api/webhooks/WHK_123')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/webhooks/event-types', () => {
    it('returns available event types without auth', async () => {
      const res = await request(createApp()).get('/api/webhooks/event-types');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBeGreaterThan(0);
    });
  });
});