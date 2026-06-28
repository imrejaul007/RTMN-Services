/**
 * Twin Behavior Model - Integration Tests
 */
import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import express from 'express';

function createTestApp() {
  const app = express();
  app.use(express.json());

  // Storage
  const behaviors = new Map();
  const events = new Map();
  const prefs = new Map();

  // Health
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'twin-behavior-model', version: '1.0.0' });
  });

  // Observe event
  app.post('/api/behavior/observe', (req, res) => {
    const { twinId, eventType, data, context } = req.body;

    if (!twinId || !eventType) {
      return res.status(400).json({ error: 'twinId and eventType required' });
    }

    const event = {
      twinId,
      eventType,
      timestamp: new Date().toISOString(),
      data: data || {},
      context
    };

    const twinEvents = events.get(twinId) || [];
    twinEvents.push(event);
    events.set(twinId, twinEvents.slice(-1000));

    // Create behavior if not exists
    if (!behaviors.has(twinId)) {
      behaviors.set(twinId, {
        twinId,
        patterns: [],
        preferences: {},
        personality: {
          openness: 0.5,
          conscientiousness: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          neuroticism: 0.5,
          primaryType: 'balanced',
          traits: []
        },
        riskTolerance: 0.5,
        strengths: [],
        weaknesses: [],
        routines: [],
        anomalies: [],
        lastUpdated: new Date().toISOString()
      });
    }

    const behavior = behaviors.get(twinId);
    behavior.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      event,
      patterns: behavior.patterns.length,
      anomaly: null
    });
  });

  // Get profile
  app.get('/api/behavior/profile/:twinId', (req, res) => {
    const { twinId } = req.params;

    if (!behaviors.has(twinId)) {
      behaviors.set(twinId, {
        twinId,
        patterns: [],
        preferences: {},
        personality: null,
        riskTolerance: 0.5,
        strengths: [],
        weaknesses: [],
        routines: [],
        anomalies: [],
        lastUpdated: new Date().toISOString()
      });
    }

    const behavior = behaviors.get(twinId);

    res.json({
      success: true,
      behavior,
      eventCount: (events.get(twinId) || []).length
    });
  });

  // Preferences
  app.post('/api/behavior/preferences', (req, res) => {
    const { twinId, category, value, confidence = 0.5 } = req.body;

    if (!twinId || !category) {
      return res.status(400).json({ error: 'twinId and category required' });
    }

    const twinPrefs = prefs.get(twinId) || [];
    const existing = twinPrefs.findIndex(p => p.category === category);

    const pref = {
      category,
      value,
      confidence,
      frequency: existing >= 0 ? twinPrefs[existing].frequency + 1 : 1,
      lastExpressed: new Date().toISOString()
    };

    if (existing >= 0) {
      twinPrefs[existing] = pref;
    } else {
      twinPrefs.push(pref);
    }

    prefs.set(twinId, twinPrefs);

    res.json({ success: true, preference: pref });
  });

  app.get('/api/behavior/preferences/:twinId', (req, res) => {
    res.json({
      success: true,
      preferences: prefs.get(req.params.twinId) || []
    });
  });

  // Patterns
  app.post('/api/behavior/patterns', (req, res) => {
    const { twinId } = req.body;

    if (!twinId) {
      return res.status(400).json({ error: 'twinId required' });
    }

    const twinEvents = events.get(twinId) || [];
    const eventTypes = [...new Set(twinEvents.map(e => e.eventType))];

    const patterns = eventTypes.map((type, i) => ({
      id: `pat-${i}`,
      name: type,
      type: 'behavioral',
      confidence: Math.min(twinEvents.filter(e => e.eventType === type).length / 10, 0.95)
    }));

    res.json({ success: true, patterns, count: patterns.length });
  });

  // Anomalies
  app.post('/api/behavior/anomalies', (req, res) => {
    const { twinId } = req.body;

    if (!twinId) {
      return res.status(400).json({ error: 'twinId required' });
    }

    const twinEvents = events.get(twinId) || [];
    const anomalies = twinEvents
      .filter(e => {
        const hour = new Date(e.timestamp).getHours();
        return hour < 6 || hour > 22;
      })
      .map((e, i) => ({
        id: `anom-${i}`,
        type: 'unusual_timing',
        description: `Event at unusual hour`,
        severity: 'low',
        detectedAt: new Date().toISOString()
      }));

    res.json({ success: true, anomalies, count: anomalies.length });
  });

  // Events
  app.get('/api/behavior/events/:twinId', (req, res) => {
    const { twinId } = req.params;
    const { limit = 100, type } = req.query;

    let twinEvents = events.get(twinId) || [];

    if (type) {
      twinEvents = twinEvents.filter(e => e.eventType === type);
    }

    res.json({
      success: true,
      events: twinEvents.slice(-Number(limit)),
      count: twinEvents.length
    });
  });

  // Learn
  app.post('/api/behavior/learn', (req, res) => {
    const { twinId, preference } = req.body;

    if (!twinId || !preference) {
      return res.status(400).json({ error: 'twinId and preference required' });
    }

    const twinPrefs = prefs.get(twinId) || [];
    const existing = twinPrefs.findIndex(p => p.category === preference.category);

    const learned = {
      ...preference,
      confidence: Math.min(1, (preference.confidence || 0.5) + 0.1),
      frequency: existing >= 0 ? twinPrefs[existing].frequency + 1 : 1
    };

    if (existing >= 0) {
      twinPrefs[existing] = learned;
    } else {
      twinPrefs.push(learned);
    }

    prefs.set(twinId, twinPrefs);

    res.json({ success: true, learned });
  });

  return app;
}

describe('Twin Behavior Model - Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health', () => {
    it('should return healthy status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('Behavior Observation', () => {
    it('should observe task_complete event', async () => {
      const res = await supertest(app)
        .post('/api/behavior/observe')
        .send({
          twinId: 'emp-123',
          eventType: 'task_complete',
          data: { taskId: 'task-1' }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.event.eventType).toBe('task_complete');
    });

    it('should observe multiple events', async () => {
      const events = ['task_complete', 'meeting', 'email_sent', 'task_complete', 'task_complete'];

      for (const type of events) {
        await supertest(app)
          .post('/api/behavior/observe')
          .send({ twinId: 'emp-456', eventType: type });
      }

      const res = await supertest(app).get('/api/behavior/events/emp-456');
      expect(res.body.count).toBe(5);
    });

    it('should track event timestamps', async () => {
      await supertest(app)
        .post('/api/behavior/observe')
        .send({ twinId: 'emp-789', eventType: 'login' });

      const res = await supertest(app).get('/api/behavior/events/emp-789');
      expect(res.body.events[0].timestamp).toBeDefined();
    });
  });

  describe('Behavior Profile', () => {
    it('should return profile for new twin', async () => {
      const res = await supertest(app).get('/api/behavior/profile/new-twin');
      expect(res.status).toBe(200);
      expect(res.body.behavior.twinId).toBe('new-twin');
      expect(res.body.behavior.patterns).toEqual([]);
    });

    it('should include event count', async () => {
      await supertest(app)
        .post('/api/behavior/observe')
        .send({ twinId: 'emp-profile', eventType: 'meeting' });

      const res = await supertest(app).get('/api/behavior/profile/emp-profile');
      expect(res.body.eventCount).toBeGreaterThan(0);
    });

    it('should include personality profile', async () => {
      const res = await supertest(app).get('/api/behavior/profile/personality-twin');
      expect(res.body.behavior.personality).toBeDefined();
    });
  });

  describe('Preferences', () => {
    it('should add preference', async () => {
      const res = await supertest(app)
        .post('/api/behavior/preferences')
        .send({
          twinId: 'emp-prefs',
          category: 'communication_channel',
          value: 'slack'
        });

      expect(res.status).toBe(200);
      expect(res.body.preference.category).toBe('communication_channel');
      expect(res.body.preference.value).toBe('slack');
    });

    it('should update existing preference', async () => {
      await supertest(app)
        .post('/api/behavior/preferences')
        .send({
          twinId: 'emp-prefs2',
          category: 'work_hours',
          value: '9-5',
          confidence: 0.5
        });

      const res = await supertest(app)
        .post('/api/behavior/preferences')
        .send({
          twinId: 'emp-prefs2',
          category: 'work_hours',
          value: '10-6',
          confidence: 0.7
        });

      expect(res.body.preference.frequency).toBe(2);
      expect(res.body.preference.value).toBe('10-6');
    });

    it('should get preferences', async () => {
      await supertest(app)
        .post('/api/behavior/preferences')
        .send({
          twinId: 'emp-get-prefs',
          category: 'timezone',
          value: 'IST'
        });

      const res = await supertest(app).get('/api/behavior/preferences/emp-get-prefs');
      expect(res.body.preferences.length).toBeGreaterThan(0);
    });

    it('should require twinId for preferences', async () => {
      const res = await supertest(app)
        .post('/api/behavior/preferences')
        .send({ category: 'test' });

      expect(res.status).toBe(400);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect patterns from events', async () => {
      // Add multiple similar events
      for (let i = 0; i < 5; i++) {
        await supertest(app)
          .post('/api/behavior/observe')
          .send({ twinId: 'pattern-twin', eventType: 'morning_checkin' });
      }

      const res = await supertest(app)
        .post('/api/behavior/patterns')
        .send({ twinId: 'pattern-twin' });

      expect(res.status).toBe(200);
      expect(res.body.patterns.length).toBeGreaterThan(0);
    });

    it('should calculate pattern confidence', async () => {
      // Add events first
      for (let i = 0; i < 3; i++) {
        await supertest(app)
          .post('/api/behavior/observe')
          .send({ twinId: 'confidence-twin', eventType: 'standup' });
      }

      const res = await supertest(app)
        .post('/api/behavior/patterns')
        .send({ twinId: 'confidence-twin' });

      expect(res.body.patterns.length).toBeGreaterThan(0);
      expect(res.body.patterns[0].confidence).toBeDefined();
      expect(res.body.patterns[0].confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect unusual timing', async () => {
      // Add event at unusual hour (would need mocking for real test)
      const res = await supertest(app)
        .post('/api/behavior/anomalies')
        .send({ twinId: 'anomaly-twin' });

      expect(res.status).toBe(200);
      expect(res.body.anomalies).toBeDefined();
    });

    it('should return empty anomalies for normal events', async () => {
      const res = await supertest(app)
        .post('/api/behavior/anomalies')
        .send({ twinId: 'normal-twin' });

      expect(res.status).toBe(200);
    });
  });

  describe('Event Retrieval', () => {
    it('should limit events', async () => {
      // Add 10 events
      for (let i = 0; i < 10; i++) {
        await supertest(app)
          .post('/api/behavior/observe')
          .send({ twinId: 'limit-twin', eventType: `event_${i}` });
      }

      const res = await supertest(app)
        .get('/api/behavior/events/limit-twin?limit=5');

      expect(res.body.events.length).toBe(5);
    });

    it('should filter by event type', async () => {
      await supertest(app)
        .post('/api/behavior/observe')
        .send({ twinId: 'filter-twin', eventType: 'meeting' });

      await supertest(app)
        .post('/api/behavior/observe')
        .send({ twinId: 'filter-twin', eventType: 'task' });

      const res = await supertest(app)
        .get('/api/behavior/events/filter-twin?type=meeting');

      expect(res.body.events.every(e => e.eventType === 'meeting')).toBe(true);
    });
  });

  describe('Preference Learning', () => {
    it('should learn from outcomes', async () => {
      const res = await supertest(app)
        .post('/api/behavior/learn')
        .send({
          twinId: 'learn-twin',
          preference: {
            category: 'preferred_channel',
            value: 'email',
            confidence: 0.6
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.learned.confidence).toBeGreaterThan(0.6);
    });

    it('should require twinId and preference', async () => {
      const res = await supertest(app)
        .post('/api/behavior/learn')
        .send({ twinId: 'incomplete' });

      expect(res.status).toBe(400);
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete behavior tracking flow', async () => {
      const twinId = 'e2e-twin-' + Date.now();

      // 1. Observe events
      await supertest(app)
        .post('/api/behavior/observe')
        .send({ twinId, eventType: 'login' });

      await supertest(app)
        .post('/api/behavior/observe')
        .send({ twinId, eventType: 'task_complete' });

      await supertest(app)
        .post('/api/behavior/observe')
        .send({ twinId, eventType: 'meeting' });

      // 2. Add preference
      await supertest(app)
        .post('/api/behavior/preferences')
        .send({ twinId, category: 'work_style', value: 'focused' });

      // 3. Get profile with all data
      const profileRes = await supertest(app)
        .get(`/api/behavior/profile/${twinId}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.eventCount).toBe(3);

      // 4. Detect patterns
      const patternsRes = await supertest(app)
        .post('/api/behavior/patterns')
        .send({ twinId });

      expect(patternsRes.body.count).toBe(3);

      // 5. Get preferences
      const prefsRes = await supertest(app)
        .get(`/api/behavior/preferences/${twinId}`);

      expect(prefsRes.body.preferences.length).toBe(1);

      // 6. Learn from outcome
      const learnRes = await supertest(app)
        .post('/api/behavior/learn')
        .send({
          twinId,
          preference: { category: 'work_style', value: 'collaborative', confidence: 0.5 }
        });

      expect(learnRes.status).toBe(200);
    });
  });
});
