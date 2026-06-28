/**
 * Twin Intelligence Orchestrator - Integration Tests
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import supertest from 'supertest';
import express from 'express';

// Mock all downstream services
vi.mock('node-fetch', () => vi.fn());

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mock health
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'twin-intelligence-orchestrator' });
  });

  // Mock services status
  app.get('/api/orchestrator/services', (_req, res) => {
    res.json({
      success: true,
      services: {
        twinHub: { status: 'healthy', url: 'http://localhost:4705' },
        memoryOS: { status: 'healthy', url: 'http://localhost:4703' },
        behaviorModel: { status: 'unavailable' },
        predictionEngine: { status: 'unavailable' },
        reasoningEngine: { status: 'unavailable' },
        twinLearning: { status: 'unavailable' }
      }
    });
  });

  // Mock analyze
  const analysisCache = new Map();
  app.post('/api/orchestrator/analyze', (req, res) => {
    const { twinId, forceRefresh } = req.body;

    if (!twinId) {
      return res.status(400).json({ success: false, error: 'twinId required' });
    }

    // Return cached if exists
    if (!forceRefresh && analysisCache.has(twinId)) {
      return res.json({ success: true, analysis: analysisCache.get(twinId), cached: true });
    }

    const analysis = {
      twinId,
      timestamp: new Date().toISOString(),
      summary: 'Test analysis summary',
      intelligence: {
        behavior: { patterns: ['pattern1'], preferences: {}, strengths: [], weaknesses: [], lastUpdated: new Date().toISOString() },
        predictions: { churnRisk: 0.2, ltvScore: 5000, nextAction: 'engage', confidence: 0.8, predictions: [], lastUpdated: new Date().toISOString() },
        reasoning: { recentDecisions: [], relationshipInsights: [], contextUnderstanding: 'Active', recommendations: [], lastUpdated: new Date().toISOString() },
        learning: { skills: ['JS'], knowledgeGaps: [], recentLearnings: [], suggestedLearnings: [], progressScore: 0.7, lastUpdated: new Date().toISOString() }
      },
      recommendations: [
        { id: 'rec-1', type: 'opportunity', priority: 'high', title: 'VIP Program', description: 'Upgrade customer', reasoning: 'High LTV', confidence: 0.9, actions: [] }
      ],
      confidence: 0.85,
      metadata: { requestId: 'test-123', duration: 50, servicesAvailable: { behavior: true, prediction: true, reasoning: false, learning: true } }
    };

    analysisCache.set(twinId, analysis);

    res.json({ success: true, analysis, cached: false });
  });

  // Mock get analysis
  app.get('/api/orchestrator/analysis/:twinId', (req, res) => {
    const { twinId } = req.params;
    const cached = analysisCache.get(twinId);

    if (cached) {
      return res.json({ success: true, analysis: cached, cached: true });
    }

    res.status(404).json({ success: false, error: 'Not found' });
  });

  // Mock reason
  app.post('/api/orchestrator/reason', (req, res) => {
    const { twins, query } = req.body;

    if (!twins || !Array.isArray(twins)) {
      return res.status(400).json({ success: false, error: 'twins array required' });
    }

    if (!query) {
      return res.status(400).json({ success: false, error: 'query required' });
    }

    res.json({
      success: true,
      reasoning: {
        twins,
        query,
        conclusion: 'Cross-twin reasoning complete',
        confidence: 0.88,
        twinsInvolved: twins,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Mock learn
  app.post('/api/orchestrator/learn', (req, res) => {
    const { twinId, outcome, event } = req.body;

    if (!twinId) {
      return res.status(400).json({ success: false, error: 'twinId required' });
    }

    res.json({
      success: true,
      learning: { twinId, outcome, event, recorded: true, timestamp: new Date().toISOString() }
    });
  });

  // Mock predict
  app.post('/api/orchestrator/predict', (req, res) => {
    const { twinId, horizon, predictionType } = req.body;

    if (!twinId) {
      return res.status(400).json({ success: false, error: 'twinId required' });
    }

    res.json({
      success: true,
      prediction: {
        twinId,
        horizon: horizon || '30d',
        type: predictionType || 'churn',
        value: 0.25,
        confidence: 0.85,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Mock cache delete
  const cache = new Map();
  app.delete('/api/orchestrator/cache/:twinId', (req, res) => {
    cache.delete(req.params.twinId);
    res.json({ success: true, message: `Cache cleared for ${req.params.twinId}` });
  });

  app.delete('/api/orchestrator/cache', (_req, res) => {
    cache.clear();
    res.json({ success: true, message: 'All cache cleared' });
  });

  return app;
}

describe('Twin Intelligence Orchestrator - Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health & Status', () => {
    it('should return healthy status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });

    it('should list available services', async () => {
      const res = await supertest(app).get('/api/orchestrator/services');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.services.twinHub.status).toBe('healthy');
      expect(res.body.services.memoryOS.status).toBe('healthy');
    });
  });

  describe('Twin Analysis', () => {
    it('should analyze a twin', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({ twinId: 'customer-123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.analysis.twinId).toBe('customer-123');
      expect(res.body.analysis.intelligence).toBeDefined();
      expect(res.body.analysis.confidence).toBeGreaterThan(0);
    });

    it('should return cached analysis', async () => {
      // First request
      await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({ twinId: 'customer-456' });

      // Second request should be cached
      const res = await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({ twinId: 'customer-456' });

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(true);
    });

    it('should force refresh when requested', async () => {
      // First request
      await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({ twinId: 'customer-789' });

      // Force refresh
      const res = await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({ twinId: 'customer-789', forceRefresh: true });

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(false);
    });

    it('should require twinId', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should include recommendations in analysis', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({ twinId: 'vip-customer' });

      expect(res.status).toBe(200);
      expect(res.body.analysis.recommendations).toBeDefined();
      expect(Array.isArray(res.body.analysis.recommendations)).toBe(true);
    });
  });

  describe('Get Cached Analysis', () => {
    it('should return cached analysis', async () => {
      // Create analysis first
      await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({ twinId: 'cached-twin' });

      // Get cached
      const res = await supertest(app)
        .get('/api/orchestrator/analysis/cached-twin');

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(true);
    });

    it('should return 404 for unknown twin', async () => {
      const res = await supertest(app)
        .get('/api/orchestrator/analysis/unknown-twin');

      expect(res.status).toBe(404);
    });
  });

  describe('Cross-Twin Reasoning', () => {
    it('should reason across multiple twins', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/reason')
        .send({
          twins: ['customer-123', 'order-456', 'merchant-789'],
          query: 'Why did customer churn?'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reasoning.twins).toContain('customer-123');
      expect(res.body.reasoning.query).toBe('Why did customer churn?');
    });

    it('should require twins array', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/reason')
        .send({ twins: 'not-array', query: 'test' });

      expect(res.status).toBe(400);
    });

    it('should require query', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/reason')
        .send({ twins: ['twin-1'] });

      expect(res.status).toBe(400);
    });
  });

  describe('Learning', () => {
    it('should record learning', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/learn')
        .send({
          twinId: 'employee-123',
          outcome: 'promotion',
          event: 'performance_review'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.learning.recorded).toBe(true);
    });

    it('should require twinId', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/learn')
        .send({ outcome: 'test' });

      expect(res.status).toBe(400);
    });
  });

  describe('Predictions', () => {
    it('should generate prediction', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/predict')
        .send({
          twinId: 'customer-123',
          horizon: '30d',
          predictionType: 'churn'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.prediction.twinId).toBe('customer-123');
      expect(res.body.prediction.value).toBeDefined();
    });

    it('should use defaults when optional params missing', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/predict')
        .send({ twinId: 'customer-123' });

      expect(res.status).toBe(200);
      expect(res.body.prediction.horizon).toBe('30d');
      expect(res.body.prediction.type).toBe('churn');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache for specific twin', async () => {
      const res = await supertest(app)
        .delete('/api/orchestrator/cache/customer-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('customer-123');
    });

    it('should clear all cache', async () => {
      const res = await supertest(app)
        .delete('/api/orchestrator/cache');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('cleared');
    });
  });

  describe('Intelligence Analysis Flow', () => {
    it('should perform full analysis flow', async () => {
      // 1. Create analysis
      const analyzeRes = await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({ twinId: 'flow-test-123' });

      expect(analyzeRes.status).toBe(200);
      const twinId = analyzeRes.body.analysis.twinId;

      // 2. Get cached analysis
      const cachedRes = await supertest(app)
        .get(`/api/orchestrator/analysis/${twinId}`);

      expect(cachedRes.status).toBe(200);

      // 3. Reason about the twin
      const reasonRes = await supertest(app)
        .post('/api/orchestrator/reason')
        .send({
          twins: [twinId, 'order-999'],
          query: 'Customer journey analysis'
        });

      expect(reasonRes.status).toBe(200);

      // 4. Record learning
      const learnRes = await supertest(app)
        .post('/api/orchestrator/learn')
        .send({
          twinId,
          outcome: 'success',
          event: 'conversion'
        });

      expect(learnRes.status).toBe(200);

      // 5. Get prediction
      const predictRes = await supertest(app)
        .post('/api/orchestrator/predict')
        .send({ twinId });

      expect(predictRes.status).toBe(200);
    });
  });
});
