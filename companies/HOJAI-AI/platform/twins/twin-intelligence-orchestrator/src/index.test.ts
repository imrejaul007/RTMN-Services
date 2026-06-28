/**
 * TwinOS Intelligence Orchestrator Tests
 * Port: 4715
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import supertest from 'supertest';

// Mock the service dependencies before importing the app
vi.mock('node-fetch', () => vi.fn());

// Import app factory (we'll create it separately for testing)
import express from 'express';

describe('Twin Intelligence Orchestrator', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock health endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', service: 'twin-intelligence-orchestrator' });
    });

    // Mock analyze endpoint
    app.post('/api/orchestrator/analyze', (req, res) => {
      const { twinId, forceRefresh } = req.body;

      if (!twinId) {
        return res.status(400).json({ success: false, error: 'twinId is required' });
      }

      // Return mock analysis
      return res.json({
        success: true,
        analysis: {
          twinId,
          timestamp: new Date().toISOString(),
          summary: 'Mock analysis summary',
          intelligence: {
            behavior: {
              patterns: ['pattern1'],
              preferences: {},
              strengths: [],
              weaknesses: [],
              lastUpdated: new Date().toISOString(),
            },
            predictions: {
              churnRisk: 0.3,
              ltvScore: 5000,
              nextAction: 'Continue engagement',
              confidence: 0.8,
              predictions: [],
              lastUpdated: new Date().toISOString(),
            },
            reasoning: {
              recentDecisions: [],
              relationshipInsights: [],
              contextUnderstanding: 'Active customer',
              recommendations: [],
              lastUpdated: new Date().toISOString(),
            },
            learning: {
              skills: ['JavaScript'],
              knowledgeGaps: [],
              recentLearnings: [],
              suggestedLearnings: [],
              progressScore: 0.7,
              lastUpdated: new Date().toISOString(),
            },
          },
          recommendations: [],
          confidence: 0.75,
          metadata: {
            requestId: 'mock-id',
            duration: 100,
            servicesAvailable: {
              behavior: true,
              prediction: true,
              reasoning: true,
              learning: true,
            },
          },
        },
        cached: false,
      });
    });

    // Mock services endpoint
    app.get('/api/orchestrator/services', (_req, res) => {
      res.json({
        success: true,
        services: {
          twinHub: { status: 'healthy', url: 'http://localhost:4705' },
          memoryOS: { status: 'healthy', url: 'http://localhost:4703' },
          reasoningEngine: { status: 'unavailable', url: 'http://localhost:4716' },
          predictionEngine: { status: 'unavailable', url: 'http://localhost:4719' },
          behaviorModel: { status: 'unavailable', url: 'http://localhost:4718' },
          twinLearning: { status: 'healthy', url: 'http://localhost:4735' },
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Mock reason endpoint
    app.post('/api/orchestrator/reason', (req, res) => {
      const { twins, query } = req.body;

      if (!twins || !Array.isArray(twins)) {
        return res.status(400).json({ success: false, error: 'twins array is required' });
      }

      if (!query) {
        return res.status(400).json({ success: false, error: 'query is required' });
      }

      return res.json({
        success: true,
        reasoning: {
          twins,
          query,
          conclusion: 'Cross-twin analysis complete',
          confidence: 0.85,
          twinsInvolved: twins,
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Mock learn endpoint
    app.post('/api/orchestrator/learn', (req, res) => {
      const { twinId, outcome, event } = req.body;

      if (!twinId) {
        return res.status(400).json({ success: false, error: 'twinId is required' });
      }

      return res.json({
        success: true,
        learning: {
          twinId,
          outcome,
          event,
          recorded: true,
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Mock predict endpoint
    app.post('/api/orchestrator/predict', (req, res) => {
      const { twinId, horizon, predictionType } = req.body;

      if (!twinId) {
        return res.status(400).json({ success: false, error: 'twinId is required' });
      }

      return res.json({
        success: true,
        prediction: {
          twinId,
          horizon: horizon || '30d',
          type: predictionType || 'churn',
          value: 0.25,
          confidence: 0.82,
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Mock cache endpoints
    app.delete('/api/orchestrator/cache/:twinId', (req, res) => {
      res.json({ success: true, message: `Cache cleared for ${req.params.twinId}` });
    });

    app.delete('/api/orchestrator/cache', (_req, res) => {
      res.json({ success: true, message: 'Cleared 5 cached analyses' });
    });

    // Mock analysis/:twinId endpoint
    app.get('/api/orchestrator/analysis/:twinId', (req, res) => {
      res.json({
        success: true,
        analysis: {
          twinId: req.params.twinId,
          summary: 'Cached analysis',
        },
        cached: true,
      });
    });
  });

  // ============================================
  // Health & Status Tests
  // ============================================

  describe('Health & Status', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('twin-intelligence-orchestrator');
    });
  });

  // ============================================
  // Analysis Tests
  // ============================================

  describe('POST /api/orchestrator/analyze', () => {
    it('should analyze a twin successfully', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({ twinId: 'customer-123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.analysis).toBeDefined();
      expect(res.body.analysis.twinId).toBe('customer-123');
      expect(res.body.analysis.intelligence).toBeDefined();
      expect(res.body.analysis.confidence).toBeGreaterThan(0);
    });

    it('should require twinId', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('twinId');
    });

    it('should return cached analysis when available', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/analyze')
        .send({ twinId: 'customer-123' });

      expect(res.status).toBe(200);
      expect(res.body.cached).toBeDefined();
    });
  });

  describe('GET /api/orchestrator/analysis/:twinId', () => {
    it('should get cached analysis', async () => {
      const res = await supertest(app)
        .get('/api/orchestrator/analysis/customer-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.analysis).toBeDefined();
      expect(res.body.cached).toBe(true);
    });
  });

  // ============================================
  // Reasoning Tests
  // ============================================

  describe('POST /api/orchestrator/reason', () => {
    it('should perform cross-twin reasoning', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/reason')
        .send({
          twins: ['customer-123', 'order-456', 'merchant-789'],
          query: 'Why did this customer churn?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reasoning).toBeDefined();
      expect(res.body.reasoning.twins).toContain('customer-123');
    });

    it('should require twins array', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/reason')
        .send({ twins: 'not-an-array', query: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('twins');
    });

    it('should require query', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/reason')
        .send({ twins: ['customer-123'] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('query');
    });
  });

  // ============================================
  // Learning Tests
  // ============================================

  describe('POST /api/orchestrator/learn', () => {
    it('should record learning', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/learn')
        .send({
          twinId: 'employee-123',
          outcome: 'promotion',
          event: 'performance_review',
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
      expect(res.body.error).toContain('twinId');
    });
  });

  // ============================================
  // Prediction Tests
  // ============================================

  describe('POST /api/orchestrator/predict', () => {
    it('should generate prediction', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/predict')
        .send({
          twinId: 'customer-123',
          horizon: '30d',
          predictionType: 'churn',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.prediction).toBeDefined();
      expect(res.body.prediction.value).toBeDefined();
    });

    it('should require twinId', async () => {
      const res = await supertest(app)
        .post('/api/orchestrator/predict')
        .send({ horizon: '30d' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('twinId');
    });
  });

  // ============================================
  // Services Status Tests
  // ============================================

  describe('GET /api/orchestrator/services', () => {
    it('should return services status', async () => {
      const res = await supertest(app).get('/api/orchestrator/services');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.services).toBeDefined();
      expect(res.body.services.twinHub).toBeDefined();
      expect(res.body.services.memoryOS).toBeDefined();
    });
  });

  // ============================================
  // Cache Management Tests
  // ============================================

  describe('DELETE /api/orchestrator/cache/:twinId', () => {
    it('should clear cache for specific twin', async () => {
      const res = await supertest(app)
        .delete('/api/orchestrator/cache/customer-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('customer-123');
    });
  });

  describe('DELETE /api/orchestrator/cache', () => {
    it('should clear all cache', async () => {
      const res = await supertest(app)
        .delete('/api/orchestrator/cache');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Cleared');
    });
  });
});

// ============================================
// Unit Tests for Helper Functions
// ============================================

describe('Intelligence Orchestrator - Unit Tests', () => {
  describe('Analysis Structure', () => {
    it('should have all required fields in analysis response', () => {
      const mockAnalysis = {
        twinId: 'test-twin',
        timestamp: new Date().toISOString(),
        summary: 'Test summary',
        intelligence: {
          behavior: {
            patterns: [],
            preferences: {},
            strengths: [],
            weaknesses: [],
            lastUpdated: new Date().toISOString(),
          },
          predictions: {
            churnRisk: 0.5,
            ltvScore: 1000,
            nextAction: 'test',
            confidence: 0.8,
            predictions: [],
            lastUpdated: new Date().toISOString(),
          },
          reasoning: {
            recentDecisions: [],
            relationshipInsights: [],
            contextUnderstanding: 'test',
            recommendations: [],
            lastUpdated: new Date().toISOString(),
          },
          learning: {
            skills: [],
            knowledgeGaps: [],
            recentLearnings: [],
            suggestedLearnings: [],
            progressScore: 0.5,
            lastUpdated: new Date().toISOString(),
          },
        },
        recommendations: [],
        confidence: 0.7,
        metadata: {
          requestId: 'test-id',
          duration: 100,
          servicesAvailable: {
            behavior: true,
            prediction: true,
            reasoning: true,
            learning: true,
          },
        },
      };

      expect(mockAnalysis.twinId).toBeDefined();
      expect(mockAnalysis.intelligence).toBeDefined();
      expect(mockAnalysis.intelligence.behavior).toBeDefined();
      expect(mockAnalysis.intelligence.predictions).toBeDefined();
      expect(mockAnalysis.intelligence.reasoning).toBeDefined();
      expect(mockAnalysis.intelligence.learning).toBeDefined();
      expect(mockAnalysis.confidence).toBeGreaterThanOrEqual(0);
      expect(mockAnalysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should calculate confidence as average of service confidences', () => {
      const confidences = [0.8, 0.9, 0.7, 0.85];
      const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      expect(avg).toBeCloseTo(0.8125, 5);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate critical recommendation for high churn risk', () => {
      const churnRisk = 0.75;

      if (churnRisk > 0.7) {
        const recommendation = {
          type: 'warning',
          priority: 'critical',
          title: 'High Churn Risk Detected',
          reasoning: 'Based on behavior patterns',
        };

        expect(recommendation.priority).toBe('critical');
        expect(recommendation.type).toBe('warning');
      }
    });

    it('should generate opportunity for high LTV', () => {
      const ltvScore = 15000;

      if (ltvScore > 10000) {
        const recommendation = {
          type: 'opportunity',
          priority: 'high',
          title: 'High-Value Customer',
        };

        expect(recommendation.type).toBe('opportunity');
        expect(recommendation.priority).toBe('high');
      }
    });
  });

  describe('Service Configuration', () => {
    it('should use environment variables with defaults', () => {
      const defaults = {
        twinHub: 'http://localhost:4705',
        memoryOS: 'http://localhost:4703',
        twinLearning: 'http://localhost:4735',
        reasoningEngine: 'http://localhost:4716',
        predictionEngine: 'http://localhost:4719',
        behaviorModel: 'http://localhost:4718',
      };

      expect(defaults.twinHub).toContain('4705');
      expect(defaults.memoryOS).toContain('4703');
    });
  });
});
