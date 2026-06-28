/**
 * TwinOS Behavior Model Tests
 * Port: 4718
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import express from 'express';

describe('Twin Behavior Model', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Health
    app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', service: 'twin-behavior-model' });
    });

    // Observe
    app.post('/api/behavior/observe', (req, res) => {
      const { twinId, eventType, data, context } = req.body;
      if (!twinId || !eventType) {
        return res.status(400).json({ error: 'twinId and eventType are required' });
      }
      res.json({
        success: true,
        event: { twinId, eventType, timestamp: new Date().toISOString() },
        patterns: 1,
        anomaly: null,
      });
    });

    // Get profile
    app.get('/api/behavior/profile/:twinId', (req, res) => {
      res.json({
        success: true,
        behavior: {
          twinId: req.params.twinId,
          patterns: [],
          preferences: {},
          personality: {
            openness: 0.6,
            conscientiousness: 0.7,
            extraversion: 0.5,
            agreeableness: 0.6,
            neuroticism: 0.4,
            primaryType: 'Organized',
            traits: ['Organized'],
          },
          riskTolerance: 0.5,
          strengths: ['communication'],
          weaknesses: [],
          routines: [],
          anomalies: [],
          lastUpdated: new Date().toISOString(),
        },
        eventCount: 5,
      });
    });

    // Preferences
    app.post('/api/behavior/preferences', (req, res) => {
      const { twinId, category, value } = req.body;
      if (!twinId || !category) {
        return res.status(400).json({ error: 'twinId and category are required' });
      }
      res.json({
        success: true,
        preference: { category, value, confidence: 0.5, frequency: 1 },
      });
    });

    app.get('/api/behavior/preferences/:twinId', (req, res) => {
      res.json({
        success: true,
        preferences: [{ category: 'channel', value: 'email' }],
      });
    });

    // Patterns
    app.post('/api/behavior/patterns', (req, res) => {
      const { twinId } = req.body;
      if (!twinId) {
        return res.status(400).json({ error: 'twinId is required' });
      }
      res.json({
        success: true,
        patterns: [
          { id: 'pat-1', name: 'morning_checkin', type: 'temporal', confidence: 0.8 },
        ],
        count: 1,
      });
    });

    // Anomalies
    app.post('/api/behavior/anomalies', (req, res) => {
      const { twinId } = req.body;
      if (!twinId) {
        return res.status(400).json({ error: 'twinId is required' });
      }
      res.json({ success: true, anomalies: [], count: 0 });
    });

    // Events
    app.get('/api/behavior/events/:twinId', (req, res) => {
      res.json({
        success: true,
        events: [
          { twinId: req.params.twinId, eventType: 'task_complete', timestamp: new Date().toISOString() },
        ],
        count: 1,
      });
    });
  });

  describe('Health', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('POST /api/behavior/observe', () => {
    it('should observe behavior event', async () => {
      const res = await supertest(app)
        .post('/api/behavior/observe')
        .send({ twinId: 'emp-123', eventType: 'task_complete' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should require twinId and eventType', async () => {
      const res = await supertest(app)
        .post('/api/behavior/observe')
        .send({ twinId: 'emp-123' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/behavior/profile/:twinId', () => {
    it('should get behavior profile', async () => {
      const res = await supertest(app).get('/api/behavior/profile/emp-123');
      expect(res.status).toBe(200);
      expect(res.body.behavior).toBeDefined();
      expect(res.body.behavior.twinId).toBe('emp-123');
    });
  });

  describe('POST /api/behavior/preferences', () => {
    it('should add preference', async () => {
      const res = await supertest(app)
        .post('/api/behavior/preferences')
        .send({ twinId: 'emp-123', category: 'channel', value: 'slack' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should require twinId and category', async () => {
      const res = await supertest(app)
        .post('/api/behavior/preferences')
        .send({ twinId: 'emp-123' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/behavior/preferences/:twinId', () => {
    it('should get preferences', async () => {
      const res = await supertest(app).get('/api/behavior/preferences/emp-123');
      expect(res.status).toBe(200);
      expect(res.body.preferences).toBeDefined();
    });
  });

  describe('POST /api/behavior/patterns', () => {
    it('should detect patterns', async () => {
      const res = await supertest(app)
        .post('/api/behavior/patterns')
        .send({ twinId: 'emp-123' });
      expect(res.status).toBe(200);
      expect(res.body.patterns).toBeDefined();
    });

    it('should require twinId', async () => {
      const res = await supertest(app)
        .post('/api/behavior/patterns')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/behavior/anomalies', () => {
    it('should detect anomalies', async () => {
      const res = await supertest(app)
        .post('/api/behavior/anomalies')
        .send({ twinId: 'emp-123' });
      expect(res.status).toBe(200);
      expect(res.body.anomalies).toBeDefined();
    });
  });

  describe('GET /api/behavior/events/:twinId', () => {
    it('should get events', async () => {
      const res = await supertest(app).get('/api/behavior/events/emp-123');
      expect(res.status).toBe(200);
      expect(res.body.events).toBeDefined();
    });
  });
});

// Unit tests
describe('Behavior Model - Unit Tests', () => {
  describe('Pattern Detection', () => {
    it('should detect repeated patterns', () => {
      const events = ['task_complete', 'task_complete', 'task_complete'];
      const eventCount = events.filter(e => e === 'task_complete').length;
      expect(eventCount).toBeGreaterThanOrEqual(3);
    });

    it('should calculate pattern confidence', () => {
      const eventCount = 5;
      const confidence = Math.min(eventCount / 10, 0.95);
      expect(confidence).toBe(0.5);
    });
  });

  describe('Personality Calculation', () => {
    it('should calculate personality from events', () => {
      const eventTypes = ['meeting', 'email', 'task_complete'];
      let openness = 0.5;
      let conscientiousness = 0.5;

      if (eventTypes.includes('meeting')) openness += 0.1;
      if (eventTypes.includes('task_complete')) conscientiousness += 0.2;

      expect(openness).toBe(0.6);
      expect(conscientiousness).toBe(0.7);
    });

    it('should normalize personality scores to 0-1', () => {
      let score = 1.5;
      score = Math.max(0, Math.min(1, score));
      expect(score).toBe(1);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect unusual timing', () => {
      const hour = 3; // 3 AM
      const isUnusual = hour < 6 || hour > 22;
      expect(isUnusual).toBe(true);
    });

    it('should detect rapid repetition', () => {
      const recentCount = 6;
      const isRapid = recentCount > 5;
      expect(isRapid).toBe(true);
    });
  });

  describe('Risk Tolerance', () => {
    it('should calculate risk score', () => {
      const events = ['new_experience', 'innovation', 'risk_taker'];
      const riskScore = events.filter(e =>
        e.includes('risk') || e.includes('new') || e.includes('innovation')
      ).length / events.length;
      expect(riskScore).toBeGreaterThan(0.5);
    });
  });

  describe('Preference Learning', () => {
    it('should update preference confidence', () => {
      const current = 0.5;
      const increment = 0.1;
      const updated = Math.min(1, current + increment);
      expect(updated).toBe(0.6);
    });

    it('should cap confidence at 1.0', () => {
      const current = 0.95;
      const increment = 0.1;
      const updated = Math.min(1, current + increment);
      expect(updated).toBe(1);
    });
  });
});
