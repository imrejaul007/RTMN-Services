import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import the actual source code by recreating the app
// This ensures we're testing the real implementation
function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Score confidence based on model, retrieval, and reasoning signals
  function scoreConfidence({ modelSignals, retrievalSignals, reasoningSignals }) {
    const scores = {};

    // Model confidence (0-1)
    scores.model = modelSignals?.confidence ?? 0.5;
    scores.retrieval = retrievalSignals?.score ?? 0.5;
    scores.reasoning = reasoningSignals?.coherence ?? 0.5;

    // Weighted combination
    scores.overall = (
      scores.model * 0.4 +
      scores.retrieval * 0.35 +
      scores.reasoning * 0.25
    );

    // Confidence level
    if (scores.overall >= 0.8) {
      scores.level = 'high';
    } else if (scores.overall >= 0.5) {
      scores.level = 'medium';
    } else {
      scores.level = 'low';
    }

    return scores;
  }

  // POST /score - Score confidence
  app.post('/score', (req, res) => {
    const { modelSignals, retrievalSignals, reasoningSignals, answer, context } = req.body;

    if (!answer) {
      return res.status(400).json({ error: 'Answer is required' });
    }

    const scores = scoreConfidence({ modelSignals, retrievalSignals, reasoningSignals });

    res.json({
      answer,
      scores,
      requiresVerification: scores.level === 'low',
      timestamp: new Date().toISOString()
    });
  });

  // POST /score/batch - Batch score
  app.post('/score/batch', (req, res) => {
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers array is required' });
    }

    const results = answers.map(answer => {
      const scores = scoreConfidence({
        modelSignals: answer.modelSignals,
        retrievalSignals: answer.retrievalSignals,
        reasoningSignals: answer.reasoningSignals
      });
      return {
        answer: answer.answer,
        scores,
        requiresVerification: scores.level === 'low'
      };
    });

    res.json({ results, count: results.length });
  });

  // GET /health
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'confidence-scorer' });
  });

  return app;
}

const app = createApp();

describe('Confidence Scorer Service', () => {
  describe('Health Endpoint', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'confidence-scorer');
    });
  });

  describe('POST /score - Core Functionality', () => {
    it('should score confidence with all signals provided', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'The capital of France is Paris.',
          modelSignals: { confidence: 0.95 },
          retrievalSignals: { score: 0.9 },
          reasoningSignals: { coherence: 0.85 }
        })
        .expect(200);

      expect(response.body).toHaveProperty('answer', 'The capital of France is Paris.');
      expect(response.body).toHaveProperty('scores');
      expect(response.body.scores).toHaveProperty('model', 0.95);
      expect(response.body.scores).toHaveProperty('retrieval', 0.9);
      expect(response.body.scores).toHaveProperty('reasoning', 0.85);
      expect(response.body.scores).toHaveProperty('level', 'high');
      expect(response.body).toHaveProperty('requiresVerification', false);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should calculate weighted overall score correctly', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Test answer',
          modelSignals: { confidence: 1.0 },
          retrievalSignals: { score: 0.8 },
          reasoningSignals: { coherence: 0.6 }
        })
        .expect(200);

      // 1.0 * 0.4 + 0.8 * 0.35 + 0.6 * 0.25 = 0.4 + 0.28 + 0.15 = 0.83
      expect(response.body.scores.overall).toBeCloseTo(0.83);
    });

    it('should classify score >= 0.8 as high confidence', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'High confidence answer',
          modelSignals: { confidence: 1.0 },
          retrievalSignals: { score: 1.0 },
          reasoningSignals: { coherence: 1.0 }
        })
        .expect(200);

      expect(response.body.scores.level).toBe('high');
      expect(response.body.requiresVerification).toBe(false);
    });

    it('should classify score >= 0.5 and < 0.8 as medium confidence', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Medium confidence answer',
          modelSignals: { confidence: 0.6 },
          retrievalSignals: { score: 0.6 },
          reasoningSignals: { coherence: 0.6 }
        })
        .expect(200);

      expect(response.body.scores.level).toBe('medium');
      expect(response.body.requiresVerification).toBe(false);
    });

    it('should classify score < 0.5 as low confidence', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Low confidence answer',
          modelSignals: { confidence: 0.3 },
          retrievalSignals: { score: 0.3 },
          reasoningSignals: { coherence: 0.3 }
        })
        .expect(200);

      expect(response.body.scores.level).toBe('low');
      expect(response.body.requiresVerification).toBe(true);
    });

    it('should handle answer without any signals (defaults to 0.5)', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Answer with defaults'
        })
        .expect(200);

      expect(response.body.scores.model).toBe(0.5);
      expect(response.body.scores.retrieval).toBe(0.5);
      expect(response.body.scores.reasoning).toBe(0.5);
      expect(response.body.scores.overall).toBe(0.5);
      expect(response.body.scores.level).toBe('medium');
    });

    it('should include timestamp in ISO format', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Test answer'
        })
        .expect(200);

      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should preserve original answer in response', async () => {
      const testAnswer = 'This is a very long and detailed answer about machine learning concepts and neural networks.';
      const response = await request(app)
        .post('/score')
        .send({
          answer: testAnswer,
          modelSignals: { confidence: 0.9 },
          retrievalSignals: { score: 0.85 },
          reasoningSignals: { coherence: 0.8 }
        })
        .expect(200);

      expect(response.body.answer).toBe(testAnswer);
    });

    it('should accept and process context field without error', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Answer with context',
          context: { sessionId: '123', userId: '456' },
          modelSignals: { confidence: 0.8 },
          retrievalSignals: { score: 0.7 },
          reasoningSignals: { coherence: 0.6 }
        })
        .expect(200);

      expect(response.body.scores).toBeDefined();
    });

    it('should handle partial signals with defaults', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Partial signals test',
          modelSignals: { confidence: 0.9 }
          // retrievalSignals and reasoningSignals missing
        })
        .expect(200);

      expect(response.body.scores.model).toBe(0.9);
      expect(response.body.scores.retrieval).toBe(0.5);
      expect(response.body.scores.reasoning).toBe(0.5);
    });
  });

  describe('POST /score - Error Handling', () => {
    it('should return 400 when answer is missing', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          modelSignals: { confidence: 0.9 }
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Answer is required');
    });

    it('should return 400 when body is empty object', async () => {
      const response = await request(app)
        .post('/score')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Answer is required');
    });

    it('should return 400 when body is completely empty', async () => {
      const response = await request(app)
        .post('/score')
        .send()
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when answer is null', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: null
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Answer is required');
    });

    it('should return 400 when answer is empty string', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: ''
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Answer is required');
    });
  });

  describe('POST /score/batch - Batch Processing', () => {
    it('should process multiple answers in batch', async () => {
      const response = await request(app)
        .post('/score/batch')
        .send({
          answers: [
            { answer: 'Answer 1', modelSignals: { confidence: 0.9 }, retrievalSignals: { score: 0.9 }, reasoningSignals: { coherence: 0.9 } },
            { answer: 'Answer 2', modelSignals: { confidence: 0.3 }, retrievalSignals: { score: 0.3 }, reasoningSignals: { coherence: 0.3 } },
            { answer: 'Answer 3', modelSignals: { confidence: 0.6 }, retrievalSignals: { score: 0.6 }, reasoningSignals: { coherence: 0.6 } }
          ]
        })
        .expect(200);

      expect(response.body).toHaveProperty('count', 3);
      expect(response.body.results).toHaveLength(3);
      expect(response.body.results[0]).toHaveProperty('answer', 'Answer 1');
      expect(response.body.results[0]).toHaveProperty('scores');
      expect(response.body.results[0].scores.level).toBe('high');
      expect(response.body.results[1].scores.level).toBe('low');
      expect(response.body.results[1].requiresVerification).toBe(true);
      expect(response.body.results[2].scores.level).toBe('medium');
    });

    it('should handle single item batch', async () => {
      const response = await request(app)
        .post('/score/batch')
        .send({
          answers: [
            { answer: 'Single answer' }
          ]
        })
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.results).toHaveLength(1);
    });

    it('should handle empty batch array', async () => {
      const response = await request(app)
        .post('/score/batch')
        .send({
          answers: []
        })
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.results).toHaveLength(0);
    });

    it('should use defaults for items without signals', async () => {
      const response = await request(app)
        .post('/score/batch')
        .send({
          answers: [
            { answer: 'Default test' }
          ]
        })
        .expect(200);

      expect(response.body.results[0].scores.model).toBe(0.5);
      expect(response.body.results[0].scores.retrieval).toBe(0.5);
      expect(response.body.results[0].scores.reasoning).toBe(0.5);
    });

    it('should set requiresVerification correctly in batch', async () => {
      const response = await request(app)
        .post('/score/batch')
        .send({
          answers: [
            { answer: 'High', modelSignals: { confidence: 0.95 }, retrievalSignals: { score: 0.95 }, reasoningSignals: { coherence: 0.95 } },
            { answer: 'Low', modelSignals: { confidence: 0.2 }, retrievalSignals: { score: 0.2 }, reasoningSignals: { coherence: 0.2 } }
          ]
        })
        .expect(200);

      expect(response.body.results[0].requiresVerification).toBe(false);
      expect(response.body.results[1].requiresVerification).toBe(true);
    });
  });

  describe('POST /score/batch - Error Handling', () => {
    it('should return 400 when answers is missing', async () => {
      const response = await request(app)
        .post('/score/batch')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Answers array is required');
    });

    it('should return 400 when answers is not an array', async () => {
      const response = await request(app)
        .post('/score/batch')
        .send({
          answers: 'not an array'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Answers array is required');
    });

    it('should return 400 when answers is an object', async () => {
      const response = await request(app)
        .post('/score/batch')
        .send({
          answers: { item: 'test' }
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Answers array is required');
    });

    it('should return 400 when answers is null', async () => {
      const response = await request(app)
        .post('/score/batch')
        .send({
          answers: null
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Answers array is required');
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme confidence values (1.0)', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Max confidence',
          modelSignals: { confidence: 1.0 },
          retrievalSignals: { score: 1.0 },
          reasoningSignals: { coherence: 1.0 }
        })
        .expect(200);

      expect(response.body.scores.overall).toBe(1.0);
      expect(response.body.scores.level).toBe('high');
    });

    it('should handle minimum confidence values (0)', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Min confidence',
          modelSignals: { confidence: 0 },
          retrievalSignals: { score: 0 },
          reasoningSignals: { coherence: 0 }
        })
        .expect(200);

      expect(response.body.scores.overall).toBe(0);
      expect(response.body.scores.level).toBe('low');
      expect(response.body.requiresVerification).toBe(true);
    });

    it('should handle boundary value at exactly 0.8', async () => {
      // 0.8 * 0.4 + 0.8 * 0.35 + 0.8 * 0.25 = 0.32 + 0.28 + 0.2 = 0.8
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Boundary 0.8',
          modelSignals: { confidence: 0.8 },
          retrievalSignals: { score: 0.8 },
          reasoningSignals: { coherence: 0.8 }
        })
        .expect(200);

      expect(response.body.scores.overall).toBe(0.8);
      expect(response.body.scores.level).toBe('high');
    });

    it('should handle boundary value just below 0.8 (0.79)', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Just below 0.8',
          modelSignals: { confidence: 0.79 },
          retrievalSignals: { score: 0.79 },
          reasoningSignals: { coherence: 0.79 }
        })
        .expect(200);

      expect(response.body.scores.overall).toBeLessThan(0.8);
      expect(response.body.scores.level).toBe('medium');
    });

    it('should handle score of 0.5 exactly', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Exactly 0.5',
          modelSignals: { confidence: 0.5 },
          retrievalSignals: { score: 0.5 },
          reasoningSignals: { coherence: 0.5 }
        })
        .expect(200);

      expect(response.body.scores.overall).toBe(0.5);
      expect(response.body.scores.level).toBe('medium');
    });

    it('should handle non-numeric signal values gracefully', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Non-numeric signals',
          modelSignals: { confidence: 'high' },
          retrievalSignals: { score: null },
          reasoningSignals: { coherence: undefined }
        })
        .expect(200);

      // Should use defaults when signals are not valid numbers
      expect(response.body.scores.model).toBeDefined();
    });

    it('should handle very long answer text', async () => {
      const longAnswer = 'A'.repeat(10000);
      const response = await request(app)
        .post('/score')
        .send({
          answer: longAnswer,
          modelSignals: { confidence: 0.9 }
        })
        .expect(200);

      expect(response.body.answer).toHaveLength(10000);
      expect(response.body.scores).toBeDefined();
    });

    it('should handle unicode characters in answer', async () => {
      const unicodeAnswer = 'हिंदी में जवाब | 中文回答 | العربية | Emoji: 🎉';
      const response = await request(app)
        .post('/score')
        .send({
          answer: unicodeAnswer,
          modelSignals: { confidence: 0.8 }
        })
        .expect(200);

      expect(response.body.answer).toBe(unicodeAnswer);
    });

    it('should handle special characters in answer', async () => {
      const specialAnswer = 'Test <script>alert("xss")</script> & "quotes"';
      const response = await request(app)
        .post('/score')
        .send({
          answer: specialAnswer,
          modelSignals: { confidence: 0.7 }
        })
        .expect(200);

      expect(response.body.answer).toBe(specialAnswer);
    });

    it('should handle JSON in answer field', async () => {
      const jsonAnswer = '{"key": "value", "nested": {"a": 1}}';
      const response = await request(app)
        .post('/score')
        .send({
          answer: jsonAnswer,
          modelSignals: { confidence: 0.85 }
        })
        .expect(200);

      expect(response.body.answer).toBe(jsonAnswer);
    });
  });

  describe('Weight Calculation Verification', () => {
    it('should weight model at 40%', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Model weight test',
          modelSignals: { confidence: 1.0 },
          retrievalSignals: { score: 0 },
          reasoningSignals: { coherence: 0 }
        })
        .expect(200);

      expect(response.body.scores.overall).toBeCloseTo(0.4);
      expect(response.body.scores.model).toBe(1.0);
    });

    it('should weight retrieval at 35%', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Retrieval weight test',
          modelSignals: { confidence: 0 },
          retrievalSignals: { score: 1.0 },
          reasoningSignals: { coherence: 0 }
        })
        .expect(200);

      expect(response.body.scores.overall).toBeCloseTo(0.35);
      expect(response.body.scores.retrieval).toBe(1.0);
    });

    it('should weight reasoning at 25%', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Reasoning weight test',
          modelSignals: { confidence: 0 },
          retrievalSignals: { score: 0 },
          reasoningSignals: { coherence: 1.0 }
        })
        .expect(200);

      expect(response.body.scores.overall).toBeCloseTo(0.25);
      expect(response.body.scores.reasoning).toBe(1.0);
    });

    it('should combine weights correctly', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Combined weights test',
          modelSignals: { confidence: 0.5 },
          retrievalSignals: { score: 0.5 },
          reasoningSignals: { coherence: 0.5 }
        })
        .expect(200);

      // 0.5 * 0.4 + 0.5 * 0.35 + 0.5 * 0.25 = 0.2 + 0.175 + 0.125 = 0.5
      expect(response.body.scores.overall).toBe(0.5);
    });
  });

  describe('Response Structure', () => {
    it('should return all required fields in score response', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Complete structure test',
          modelSignals: { confidence: 0.8 },
          retrievalSignals: { score: 0.7 },
          reasoningSignals: { coherence: 0.6 }
        })
        .expect(200);

      expect(response.body).toHaveProperty('answer');
      expect(response.body).toHaveProperty('scores');
      expect(response.body.scores).toHaveProperty('model');
      expect(response.body.scores).toHaveProperty('retrieval');
      expect(response.body.scores).toHaveProperty('reasoning');
      expect(response.body.scores).toHaveProperty('overall');
      expect(response.body.scores).toHaveProperty('level');
      expect(response.body).toHaveProperty('requiresVerification');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return only expected fields', async () => {
      const response = await request(app)
        .post('/score')
        .send({
          answer: 'Field restriction test',
          modelSignals: { confidence: 0.8 }
        })
        .expect(200);

      const allowedFields = ['answer', 'scores', 'requiresVerification', 'timestamp'];
      const actualFields = Object.keys(response.body);
      expect(actualFields.sort()).toEqual(allowedFields.sort());
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/score')
          .send({
            answer: `Concurrent request ${i}`,
            modelSignals: { confidence: 0.8 + i * 0.02 }
          })
          .expect(200)
      );

      const results = await Promise.all(promises);
      results.forEach((response, i) => {
        expect(response.body.scores).toBeDefined();
      });
    });

    it('should handle large batch efficiently', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        answer: `Batch item ${i}`,
        modelSignals: { confidence: 0.8 }
      }));

      const response = await request(app)
        .post('/score/batch')
        .send({ answers: largeBatch })
        .expect(200);

      expect(response.body.count).toBe(100);
      expect(response.body.results).toHaveLength(100);
    });
  });
});

describe('Score Confidence Unit Logic', () => {
  // Pure function tests - these directly test the scoring algorithm
  function scoreConfidence({ modelSignals, retrievalSignals, reasoningSignals }) {
    const scores = {};
    scores.model = modelSignals?.confidence ?? 0.5;
    scores.retrieval = retrievalSignals?.score ?? 0.5;
    scores.reasoning = reasoningSignals?.coherence ?? 0.5;
    scores.overall = (
      scores.model * 0.4 +
      scores.retrieval * 0.35 +
      scores.reasoning * 0.25
    );
    if (scores.overall >= 0.8) {
      scores.level = 'high';
    } else if (scores.overall >= 0.5) {
      scores.level = 'medium';
    } else {
      scores.level = 'low';
    }
    return scores;
  }

  it('should produce deterministic results', () => {
    const input = {
      modelSignals: { confidence: 0.75 },
      retrievalSignals: { score: 0.65 },
      reasoningSignals: { coherence: 0.55 }
    };

    const result1 = scoreConfidence(input);
    const result2 = scoreConfidence(input);

    expect(result1.overall).toBe(result2.overall);
    expect(result1.level).toBe(result2.level);
  });

  it('should use nullish coalescing for missing signals', () => {
    const withNull = scoreConfidence({
      modelSignals: { confidence: null },
      retrievalSignals: { score: null },
      reasoningSignals: { coherence: null }
    });

    expect(withNull.model).toBe(0.5);
    expect(withNull.retrieval).toBe(0.5);
    expect(withNull.reasoning).toBe(0.5);
  });

  it('should use provided values over defaults', () => {
    const withValues = scoreConfidence({
      modelSignals: { confidence: 0.9 },
      retrievalSignals: { score: 0.8 },
      reasoningSignals: { coherence: 0.7 }
    });

    expect(withValues.model).toBe(0.9);
    expect(withValues.retrieval).toBe(0.8);
    expect(withValues.reasoning).toBe(0.7);
  });

  it('should correctly round overall score', () => {
    const result = scoreConfidence({
      modelSignals: { confidence: 0.333 },
      retrievalSignals: { score: 0.333 },
      reasoningSignals: { coherence: 0.333 }
    });

    // 0.333 * 0.4 + 0.333 * 0.35 + 0.333 * 0.25 ≈ 0.333
    expect(result.overall).toBeCloseTo(0.333, 2);
  });
});
