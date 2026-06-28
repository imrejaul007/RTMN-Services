/**
 * CorpID Timeline API Tests
 * Tests for P0 Timeline API endpoints
 */
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { body, validationResult } from 'express-validator';
import request from 'supertest';

// ============ SHARED MOCK STORES ============
const mockEvents = [];
const mockNodes = [];
const mockEdges = [];

function createApp() {
  const requireAuth = (req, res, next) => {
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id: 'CI-IND-user1', role: 'user' };
    next();
  };

  const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const sanitizeInput = (obj) => obj;

  function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    next();
  }

  function generateTimelineTitle(event) {
    const titles = {
      'user.registered': 'Account Created',
      'user.login': 'Logged In',
      'auth.login': 'Logged In',
      'user.logout': 'Logged Out',
      'trust.score_changed': 'Trust Score Updated',
      'agent.created': 'AI Agent Created',
      'delegation.created': 'Delegation Created',
      'risk.alert': 'Security Alert',
    };
    return titles[event.type] || event.type.replace('.', ' ').replace(/_/g, ' ');
  }

  function getTimelineIcon(eventType) {
    const icons = {
      'auth': '🔐',
      'mfa': '🛡️',
      'agent': '🤖',
      'trust': '⭐',
      'risk': '⚠️',
    };
    for (const [prefix, icon] of Object.entries(icons)) {
      if (eventType.startsWith(prefix)) return icon;
    }
    return '📌';
  }

  function getTimelineImpact(event) {
    if (['risk.alert', 'trust.degraded'].includes(event.type)) return 'negative';
    if (['trust.elevated', 'agent.created'].includes(event.type)) return 'positive';
    return 'neutral';
  }

  const app = express();
  app.use(express.json());

  // GET /api/timeline/:entityId
  app.get('/api/timeline/:entityId', requireAuth, asyncHandler(async (req, res) => {
    const { entityId } = req.params;
    const { category, limit = '100' } = req.query;

    let events = mockEvents.filter(e => e.corpId === entityId);
    if (category) events = events.filter(e => e.category === category);
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limited = events.slice(0, parseInt(limit));

    const timeline = limited.map(e => ({
      id: e.eventId,
      entityId: e.corpId,
      eventType: e.type,
      title: generateTimelineTitle(e),
      icon: getTimelineIcon(e.type),
      category: e.category,
      impact: getTimelineImpact(e),
      timestamp: e.timestamp,
    }));

    res.json({ success: true, entityId, count: timeline.length, timeline });
  }));

  // GET /api/timeline/:entityId/summary
  app.get('/api/timeline/:entityId/summary', requireAuth, asyncHandler(async (req, res) => {
    const { entityId } = req.params;

    let events = mockEvents.filter(e => e.corpId === entityId);

    const byCategory = {};
    for (const e of events) {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    }

    res.json({
      success: true,
      summary: { entityId, totalEvents: events.length, categories: byCategory }
    });
  }));

  // POST /api/timeline/:entityId/annotate
  app.post('/api/timeline/:entityId/annotate', [
    requireAuth,
    body('title').trim().isLength({ min: 1, max: 200 }),
    validate,
  ], asyncHandler(async (req, res) => {
    const { entityId } = req.params;
    const { title, description, category = 'general' } = sanitizeInput(req.body);

    const event = {
      eventId: `EVT-${Date.now()}`,
      corpId: entityId,
      type: `annotation.${category}`,
      category,
      actor: req.user.id,
      data: { title, description },
      timestamp: new Date().toISOString(),
    };
    mockEvents.push(event);

    res.status(201).json({ success: true, event });
  }));

  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });

  return app;
}

// ============ TESTS ============
describe('CorpID Timeline API', () => {
  beforeEach(() => {
    mockEvents.length = 0;
    mockNodes.length = 0;
    mockEdges.length = 0;
  });

  describe('GET /api/timeline/:entityId', () => {
    it('returns empty timeline for entity with no events', async () => {
      const res = await request(createApp())
        .get('/api/timeline/CI-IND-user1')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.entityId).toBe('CI-IND-user1');
      expect(res.body.count).toBe(0);
      expect(res.body.timeline).toEqual([]);
    });

    it('returns timeline with human-readable entries', async () => {
      mockEvents.push(
        { eventId: 'EVT-1', corpId: 'CI-IND-user1', type: 'auth.login', category: 'authentication', timestamp: '2026-06-28T10:00:00Z' },
        { eventId: 'EVT-2', corpId: 'CI-IND-user1', type: 'trust.score_changed', category: 'trust', timestamp: '2026-06-27T15:00:00Z' }
      );

      const res = await request(createApp())
        .get('/api/timeline/CI-IND-user1')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.timeline[0].title).toBe('Logged In');
      expect(res.body.timeline[0].icon).toBe('🔐');
      expect(res.body.timeline[1].title).toBe('Trust Score Updated');
      expect(res.body.timeline[1].icon).toBe('⭐');
    });

    it('returns 401 without auth', async () => {
      const res = await request(createApp())
        .get('/api/timeline/CI-IND-user1');

      expect(res.status).toBe(401);
    });

    it('filters by category', async () => {
      mockEvents.push(
        { eventId: 'EVT-1', corpId: 'CI-IND-user1', type: 'auth.login', category: 'authentication', timestamp: '2026-06-28T10:00:00Z' },
        { eventId: 'EVT-2', corpId: 'CI-IND-user1', type: 'trust.updated', category: 'trust', timestamp: '2026-06-28T11:00:00Z' }
      );

      const res = await request(createApp())
        .get('/api/timeline/CI-IND-user1?category=authentication')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.timeline[0].category).toBe('authentication');
    });
  });

  describe('GET /api/timeline/:entityId/summary', () => {
    it('returns summary with event counts by category', async () => {
      mockEvents.push(
        { eventId: 'EVT-1', corpId: 'CI-IND-user1', type: 'user.login', category: 'authentication', timestamp: '2026-06-28T10:00:00Z' },
        { eventId: 'EVT-2', corpId: 'CI-IND-user1', type: 'user.logout', category: 'authentication', timestamp: '2026-06-28T11:00:00Z' },
        { eventId: 'EVT-3', corpId: 'CI-IND-user1', type: 'trust.updated', category: 'trust', timestamp: '2026-06-28T12:00:00Z' }
      );

      const res = await request(createApp())
        .get('/api/timeline/CI-IND-user1/summary')
        .set('Authorization', 'Bearer test');

      expect(res.status).toBe(200);
      expect(res.body.summary.totalEvents).toBe(3);
      expect(res.body.summary.categories.authentication).toBe(2);
      expect(res.body.summary.categories.trust).toBe(1);
    });
  });

  describe('POST /api/timeline/:entityId/annotate', () => {
    it('creates annotation event', async () => {
      const res = await request(createApp())
        .post('/api/timeline/CI-IND-user1/annotate')
        .set('Authorization', 'Bearer test')
        .send({
          title: 'User completed onboarding',
          description: 'Completed all onboarding steps',
          category: 'lifecycle',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.event.type).toBe('annotation.lifecycle');
      expect(res.body.event.data.title).toBe('User completed onboarding');
    });

    it('rejects missing title', async () => {
      const res = await request(createApp())
        .post('/api/timeline/CI-IND-user1/annotate')
        .set('Authorization', 'Bearer test')
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
    });
  });
});
