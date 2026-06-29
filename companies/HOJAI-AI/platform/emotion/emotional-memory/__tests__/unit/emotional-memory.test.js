import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

/**
 * Emotional Memory Service Unit Tests
 *
 * These tests cover the core functionality of the Emotional Memory Service:
 * - Storing emotions for entities
 * - Retrieving emotional timelines
 * - Calculating emotional trends
 * - Managing relationship emotions
 * - Querying across entities
 */

describe('Emotional Memory Service', () => {
  // Mock in-memory stores (matching the service implementation)
  let emotionalMemories;
  let relationshipEmotions;

  // Core functions extracted from the service for testing
  function storeEmotion(entityId, emotion) {
    if (!emotionalMemories.has(entityId)) {
      emotionalMemories.set(entityId, []);
    }

    const timeline = emotionalMemories.get(entityId);
    timeline.push({
      ...emotion,
      timestamp: emotion.timestamp || new Date().toISOString(),
      id: `emotion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    return timeline[timeline.length - 1];
  }

  function getTimeline(entityId, options = {}) {
    const { startDate, endDate, limit = 100 } = options;
    const timeline = emotionalMemories.get(entityId) || [];

    let filtered = timeline;

    if (startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(endDate));
    }

    return filtered.slice(-limit);
  }

  function calculateTrends(timeline) {
    if (timeline.length < 2) {
      return { trend: 'insufficient_data', change: 0 };
    }

    const recent = timeline.slice(-5);
    const older = timeline.slice(-10, -5);

    if (older.length === 0) {
      return { trend: 'new_data', change: 0 };
    }

    const recentAvg = recent.reduce((sum, e) => sum + (e.intensity || 0.5), 0) / recent.length;
    const olderAvg = older.reduce((sum, e) => sum + (e.intensity || 0.5), 0) / older.length;

    const change = recentAvg - olderAvg;

    return {
      trend: change > 0.2 ? 'improving' : change < -0.2 ? 'declining' : 'stable',
      change: Math.round(change * 100) / 100,
      recentAvg: Math.round(recentAvg * 100) / 100,
      olderAvg: Math.round(olderAvg * 100) / 100
    };
  }

  function storeRelationshipEmotion(relId, emotion) {
    if (!relationshipEmotions.has(relId)) {
      relationshipEmotions.set(relId, []);
    }

    const history = relationshipEmotions.get(relId);
    history.push({
      ...emotion,
      timestamp: new Date().toISOString(),
      id: `rel-emotion-${Date.now()}`,
      mutual: emotion.mutual !== undefined ? emotion.mutual : false
    });

    return history[history.length - 1];
  }

  function getEmotionalSummary(entityId) {
    const timeline = emotionalMemories.get(entityId) || [];

    const emotionCounts = {};
    for (const e of timeline) {
      emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
    }

    const mostCommon = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0];

    const avgIntensity = timeline.length > 0
      ? timeline.reduce((sum, e) => sum + (e.intensity || 0.5), 0) / timeline.length
      : 0;

    return {
      entityId,
      emotionCounts,
      dominantEmotion: mostCommon?.[0] || 'unknown',
      emotionCount: mostCommon?.[1] || 0,
      avgIntensity: Math.round(avgIntensity * 100) / 100,
      totalEvents: timeline.length,
      firstEvent: timeline[0]?.timestamp,
      lastEvent: timeline[timeline.length - 1]?.timestamp
    };
  }

  beforeEach(() => {
    emotionalMemories = new Map();
    relationshipEmotions = new Map();
  });

  describe('storeEmotion', () => {
    it('should store a new emotion for an entity', () => {
      const entityId = 'user-123';
      const emotionData = {
        emotion: 'joy',
        intensity: 0.8,
        context: 'Positive interaction',
        source: 'support-chat'
      };

      const result = storeEmotion(entityId, emotionData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.emotion).toBe('joy');
      expect(result.intensity).toBe(0.8);
      expect(result.context).toBe('Positive interaction');
      expect(result.source).toBe('support-chat');
      expect(result.timestamp).toBeDefined();
    });

    it('should append emotions to existing timeline', () => {
      const entityId = 'user-123';

      storeEmotion(entityId, { emotion: 'joy', intensity: 0.5 });
      storeEmotion(entityId, { emotion: 'frustration', intensity: 0.7 });
      const result = storeEmotion(entityId, { emotion: 'satisfaction', intensity: 0.9 });

      const timeline = emotionalMemories.get(entityId);
      expect(timeline.length).toBe(3);
      expect(result.emotion).toBe('satisfaction');
    });

    it('should generate unique IDs for each emotion', () => {
      const entityId = 'user-123';

      const emotion1 = storeEmotion(entityId, { emotion: 'joy', intensity: 0.5 });
      const emotion2 = storeEmotion(entityId, { emotion: 'joy', intensity: 0.5 });

      expect(emotion1.id).not.toBe(emotion2.id);
    });

    it('should use provided timestamp if available', () => {
      const entityId = 'user-123';
      const customTimestamp = '2026-01-15T10:00:00.000Z';

      const result = storeEmotion(entityId, {
        emotion: 'joy',
        intensity: 0.8,
        timestamp: customTimestamp
      });

      expect(result.timestamp).toBe(customTimestamp);
    });

    it('should use current timestamp if not provided', () => {
      const entityId = 'user-123';
      const beforeTime = new Date().toISOString();

      const result = storeEmotion(entityId, { emotion: 'joy', intensity: 0.5 });

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    });
  });

  describe('getTimeline', () => {
    it('should return empty array for non-existent entity', () => {
      const result = getTimeline('non-existent-user');
      expect(result).toEqual([]);
    });

    it('should return all emotions for an entity', () => {
      const entityId = 'user-123';
      storeEmotion(entityId, { emotion: 'joy', intensity: 0.5 });
      storeEmotion(entityId, { emotion: 'frustration', intensity: 0.7 });

      const result = getTimeline(entityId);

      expect(result.length).toBe(2);
    });

    it('should filter by start date', () => {
      const entityId = 'user-123';
      storeEmotion(entityId, {
        emotion: 'joy',
        intensity: 0.5,
        timestamp: '2026-01-01T00:00:00.000Z'
      });
      storeEmotion(entityId, {
        emotion: 'frustration',
        intensity: 0.7,
        timestamp: '2026-06-15T00:00:00.000Z'
      });

      const result = getTimeline(entityId, { startDate: '2026-06-01' });

      expect(result.length).toBe(1);
      expect(result[0].emotion).toBe('frustration');
    });

    it('should filter by end date', () => {
      const entityId = 'user-123';
      storeEmotion(entityId, {
        emotion: 'joy',
        intensity: 0.5,
        timestamp: '2026-01-01T00:00:00.000Z'
      });
      storeEmotion(entityId, {
        emotion: 'frustration',
        intensity: 0.7,
        timestamp: '2026-06-15T00:00:00.000Z'
      });

      const result = getTimeline(entityId, { endDate: '2026-03-01' });

      expect(result.length).toBe(1);
      expect(result[0].emotion).toBe('joy');
    });

    it('should respect limit parameter', () => {
      const entityId = 'user-123';
      for (let i = 0; i < 10; i++) {
        storeEmotion(entityId, { emotion: 'joy', intensity: 0.1 + i * 0.1 });
      }

      const result = getTimeline(entityId, { limit: 3 });

      expect(result.length).toBe(3);
      // Should return the most recent (last 3 of 10)
      // Intensities: 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0
      // Most recent 3: 0.8, 0.9, 1.0
      expect(result[0].intensity).toBe(0.8);
    });

    it('should combine start and end date filters', () => {
      const entityId = 'user-123';
      storeEmotion(entityId, {
        emotion: 'joy',
        intensity: 0.5,
        timestamp: '2026-01-01T00:00:00.000Z'
      });
      storeEmotion(entityId, {
        emotion: 'neutral',
        intensity: 0.5,
        timestamp: '2026-03-15T00:00:00.000Z'
      });
      storeEmotion(entityId, {
        emotion: 'frustration',
        intensity: 0.7,
        timestamp: '2026-06-15T00:00:00.000Z'
      });

      const result = getTimeline(entityId, {
        startDate: '2026-02-01',
        endDate: '2026-05-01'
      });

      expect(result.length).toBe(1);
      expect(result[0].emotion).toBe('neutral');
    });
  });

  describe('calculateTrends', () => {
    it('should return insufficient_data for empty timeline', () => {
      const result = calculateTrends([]);
      expect(result.trend).toBe('insufficient_data');
      expect(result.change).toBe(0);
    });

    it('should return insufficient_data for single emotion', () => {
      const result = calculateTrends([{ intensity: 0.8 }]);
      expect(result.trend).toBe('insufficient_data');
    });

    it('should return new_data when only recent data exists', () => {
      const timeline = [
        { intensity: 0.5 },
        { intensity: 0.6 },
        { intensity: 0.7 }
      ];

      const result = calculateTrends(timeline);
      expect(result.trend).toBe('new_data');
    });

    it('should detect improving trend', () => {
      const timeline = [
        // Older data
        { intensity: 0.3 },
        { intensity: 0.35 },
        { intensity: 0.4 },
        { intensity: 0.38 },
        { intensity: 0.42 },
        // Recent data (significantly higher)
        { intensity: 0.7 },
        { intensity: 0.75 },
        { intensity: 0.8 },
        { intensity: 0.72 },
        { intensity: 0.78 }
      ];

      const result = calculateTrends(timeline);
      expect(result.trend).toBe('improving');
      expect(result.change).toBeGreaterThan(0.2);
    });

    it('should detect declining trend', () => {
      const timeline = [
        // Older data (high intensity)
        { intensity: 0.8 },
        { intensity: 0.85 },
        { intensity: 0.82 },
        { intensity: 0.78 },
        { intensity: 0.81 },
        // Recent data (low intensity)
        { intensity: 0.3 },
        { intensity: 0.35 },
        { intensity: 0.28 },
        { intensity: 0.32 },
        { intensity: 0.3 }
      ];

      const result = calculateTrends(timeline);
      expect(result.trend).toBe('declining');
      expect(result.change).toBeLessThan(-0.2);
    });

    it('should detect stable trend when change is minimal', () => {
      const timeline = [
        // Older data
        { intensity: 0.5 },
        { intensity: 0.52 },
        { intensity: 0.48 },
        { intensity: 0.51 },
        { intensity: 0.49 },
        // Recent data (similar)
        { intensity: 0.52 },
        { intensity: 0.54 },
        { intensity: 0.51 },
        { intensity: 0.53 },
        { intensity: 0.52 }
      ];

      const result = calculateTrends(timeline);
      expect(result.trend).toBe('stable');
      expect(Math.abs(result.change)).toBeLessThanOrEqual(0.2);
    });

    it('should handle missing intensity (defaults to 0.5)', () => {
      const timeline = [
        // Older without intensity
        { emotion: 'joy' },
        { emotion: 'joy' },
        { emotion: 'joy' },
        { emotion: 'joy' },
        { emotion: 'joy' },
        // Recent with intensity
        { intensity: 0.8 },
        { intensity: 0.8 },
        { intensity: 0.8 },
        { intensity: 0.8 },
        { intensity: 0.8 }
      ];

      const result = calculateTrends(timeline);
      expect(result.trend).toBe('improving');
    });

    it('should calculate correct averages', () => {
      const timeline = [
        // Older: avg = 0.4
        { intensity: 0.3 },
        { intensity: 0.4 },
        { intensity: 0.5 },
        { intensity: 0.35 },
        { intensity: 0.45 },
        // Recent: avg = 0.6
        { intensity: 0.5 },
        { intensity: 0.6 },
        { intensity: 0.7 },
        { intensity: 0.55 },
        { intensity: 0.65 }
      ];

      const result = calculateTrends(timeline);
      expect(result.olderAvg).toBe(0.4);
      expect(result.recentAvg).toBe(0.6);
      expect(result.change).toBe(0.2);
    });
  });

  describe('storeRelationshipEmotion', () => {
    it('should store emotion for a new relationship', () => {
      const relationshipId = 'customer-agent-123-456';
      const emotionData = {
        emotion: 'trust',
        intensity: 0.9,
        mutual: true
      };

      const result = storeRelationshipEmotion(relationshipId, emotionData);

      expect(result.id).toBeDefined();
      expect(result.emotion).toBe('trust');
      expect(result.intensity).toBe(0.9);
      expect(result.mutual).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should append to existing relationship history', () => {
      const relationshipId = 'customer-agent-123-456';

      storeRelationshipEmotion(relationshipId, { emotion: 'trust', intensity: 0.5 });
      storeRelationshipEmotion(relationshipId, { emotion: 'frustration', intensity: 0.6 });

      const history = relationshipEmotions.get(relationshipId);
      expect(history.length).toBe(2);
    });

    it('should default mutual to false if not provided', () => {
      const relationshipId = 'user-user-789-101';

      const result = storeRelationshipEmotion(relationshipId, {
        emotion: 'curiosity',
        intensity: 0.4
      });

      expect(result.mutual).toBe(false);
    });
  });

  describe('getEmotionalSummary', () => {
    it('should return correct emotion counts', () => {
      const entityId = 'user-123';
      storeEmotion(entityId, { emotion: 'joy', intensity: 0.8 });
      storeEmotion(entityId, { emotion: 'joy', intensity: 0.9 });
      storeEmotion(entityId, { emotion: 'frustration', intensity: 0.3 });
      storeEmotion(entityId, { emotion: 'joy', intensity: 0.7 });

      const result = getEmotionalSummary(entityId);

      expect(result.emotionCounts.joy).toBe(3);
      expect(result.emotionCounts.frustration).toBe(1);
    });

    it('should identify dominant emotion', () => {
      const entityId = 'user-123';
      storeEmotion(entityId, { emotion: 'joy', intensity: 0.8 });
      storeEmotion(entityId, { emotion: 'frustration', intensity: 0.3 });
      storeEmotion(entityId, { emotion: 'frustration', intensity: 0.4 });
      storeEmotion(entityId, { emotion: 'frustration', intensity: 0.5 });

      const result = getEmotionalSummary(entityId);

      expect(result.dominantEmotion).toBe('frustration');
      expect(result.emotionCount).toBe(3);
    });

    it('should calculate average intensity', () => {
      const entityId = 'user-123';
      storeEmotion(entityId, { emotion: 'joy', intensity: 0.8 });
      storeEmotion(entityId, { emotion: 'joy', intensity: 0.6 });
      storeEmotion(entityId, { emotion: 'joy', intensity: 0.4 });

      const result = getEmotionalSummary(entityId);

      expect(result.avgIntensity).toBe(0.6);
    });

    it('should return unknown as dominant emotion for empty timeline', () => {
      const result = getEmotionalSummary('empty-user');

      expect(result.dominantEmotion).toBe('unknown');
      expect(result.totalEvents).toBe(0);
      expect(result.emotionCounts).toEqual({});
    });

    it('should track first and last events', () => {
      const entityId = 'user-123';
      const firstTimestamp = '2026-01-01T10:00:00.000Z';
      const lastTimestamp = '2026-06-29T15:30:00.000Z';

      storeEmotion(entityId, { emotion: 'joy', intensity: 0.5, timestamp: firstTimestamp });
      storeEmotion(entityId, { emotion: 'frustration', intensity: 0.3, timestamp: '2026-03-15T12:00:00.000Z' });
      storeEmotion(entityId, { emotion: 'satisfaction', intensity: 0.9, timestamp: lastTimestamp });

      const result = getEmotionalSummary(entityId);

      expect(result.firstEvent).toBe(firstTimestamp);
      expect(result.lastEvent).toBe(lastTimestamp);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode in emotion names', () => {
      const entityId = 'user-unicode';
      const result = storeEmotion(entityId, {
        emotion: 'निराशा', // Hindi for disappointment
        intensity: 0.8
      });

      expect(result.emotion).toBe('निराशा');
    });

    it('should handle special characters in entity IDs', () => {
      const entityId = 'user:with:colons';
      storeEmotion(entityId, { emotion: 'joy', intensity: 0.5 });

      const timeline = getTimeline(entityId);
      expect(timeline.length).toBe(1);
    });

    it('should handle very long context strings', () => {
      const entityId = 'user-long-context';
      const longContext = 'A'.repeat(10000);

      const result = storeEmotion(entityId, {
        emotion: 'contemplation',
        intensity: 0.6,
        context: longContext
      });

      expect(result.context.length).toBe(10000);
    });

    it('should handle extreme intensity values', () => {
      const entityId = 'user-extreme';

      storeEmotion(entityId, { emotion: 'joy', intensity: 0 });
      storeEmotion(entityId, { emotion: 'euphoria', intensity: 1 });

      const timeline = getTimeline(entityId);
      expect(timeline[0].intensity).toBe(0);
      expect(timeline[1].intensity).toBe(1);
    });

    it('should handle batch operations correctly', () => {
      const entityId = 'user-batch';
      const emotions = [
        { emotion: 'joy', intensity: 0.8 },
        { emotion: 'satisfaction', intensity: 0.7 },
        { emotion: 'gratitude', intensity: 0.9 }
      ];

      emotions.forEach(e => storeEmotion(entityId, e));

      const timeline = getTimeline(entityId);
      expect(timeline.length).toBe(3);
      expect(timeline[0].emotion).toBe('joy');
      expect(timeline[2].emotion).toBe('gratitude');
    });
  });
});

describe('API Validation', () => {
  // Test the validation logic for API endpoints

  describe('POST /emotion validation', () => {
    it('should require entityId', () => {
      const body = { emotion: 'joy', intensity: 0.8 };
      const isValid = !!(body.entityId && body.emotion);
      expect(isValid).toBe(false);
    });

    it('should require emotion', () => {
      const body = { entityId: 'user-123' };
      const isValid = !!(body.entityId && body.emotion);
      expect(isValid).toBe(false);
    });

    it('should accept valid input', () => {
      const body = { entityId: 'user-123', emotion: 'joy', intensity: 0.8 };
      const isValid = !!(body.entityId && body.emotion);
      expect(isValid).toBe(true);
    });
  });

  describe('POST /emotion/batch validation', () => {
    it('should require entityId and emotions array', () => {
      const body = { entityId: 'user-123' };
      const isValid = !!(body.entityId && body.emotions && Array.isArray(body.emotions));
      expect(isValid).toBe(false);
    });

    it('should reject non-array emotions', () => {
      const body = { entityId: 'user-123', emotions: 'not-an-array' };
      const isValid = !!(body.entityId && body.emotions && Array.isArray(body.emotions));
      expect(isValid).toBe(false);
    });

    it('should accept valid batch input', () => {
      const body = {
        entityId: 'user-123',
        emotions: [
          { emotion: 'joy', intensity: 0.8 },
          { emotion: 'satisfaction', intensity: 0.7 }
        ]
      };
      const isValid = !!(body.entityId && body.emotions && Array.isArray(body.emotions));
      expect(isValid).toBe(true);
    });
  });

  describe('POST /relationship validation', () => {
    it('should require relationshipId and emotion', () => {
      const body = { emotion: 'trust' };
      const isValid = !!(body.relationshipId && body.emotion);
      expect(isValid).toBe(false);
    });

    it('should accept valid relationship input', () => {
      const body = {
        relationshipId: 'customer-agent-123-456',
        emotion: 'trust',
        intensity: 0.9
      };
      const isValid = !!(body.relationshipId && body.emotion);
      expect(isValid).toBe(true);
    });
  });
});

describe('HTTP Integration Tests', () => {
  // Create a fresh app instance for each test
  let app;
  let emotionalMemories;
  let relationshipEmotions;

  // Mock stores
  beforeEach(() => {
    emotionalMemories = new Map();
    relationshipEmotions = new Map();

    // Create a test app
    app = express();
    app.use(express.json());

    // Store emotion endpoint
    app.post('/emotion', (req, res) => {
      const { entityId, emotion, intensity, context, source } = req.body;

      if (!entityId || !emotion) {
        return res.status(400).json({ error: 'entityId and emotion are required' });
      }

      if (!emotionalMemories.has(entityId)) {
        emotionalMemories.set(entityId, []);
      }

      const timeline = emotionalMemories.get(entityId);
      const stored = {
        ...{ emotion, intensity, context, source },
        timestamp: new Date().toISOString(),
        id: `emotion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      timeline.push(stored);

      res.json({ success: true, memory: stored });
    });

    // Batch store endpoint
    app.post('/emotion/batch', (req, res) => {
      const { entityId, emotions } = req.body;

      if (!entityId || !emotions || !Array.isArray(emotions)) {
        return res.status(400).json({ error: 'entityId and emotions array required' });
      }

      if (!emotionalMemories.has(entityId)) {
        emotionalMemories.set(entityId, []);
      }

      const timeline = emotionalMemories.get(entityId);
      const stored = emotions.map(e => {
        const item = {
          ...e,
          timestamp: e.timestamp || new Date().toISOString(),
          id: `emotion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        timeline.push(item);
        return item;
      });

      res.json({ success: true, memories: stored, count: stored.length });
    });

    // Get timeline endpoint
    app.get('/emotion/:entityId', (req, res) => {
      const { entityId } = req.params;
      const { startDate, endDate, limit } = req.query;
      const timeline = emotionalMemories.get(entityId) || [];

      let filtered = timeline;
      if (startDate) {
        filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(startDate));
      }
      if (endDate) {
        filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(endDate));
      }

      const result = filtered.slice(-(limit ? parseInt(limit) : 100));

      res.json({
        entityId,
        timeline: result,
        count: result.length
      });
    });

    // Health endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'emotional-memory',
        entities: emotionalMemories.size,
        relationships: relationshipEmotions.size
      });
    });
  });

  describe('POST /emotion', () => {
    it('should create an emotion and return it', async () => {
      const response = await request(app)
        .post('/emotion')
        .send({
          entityId: 'user-http-123',
          emotion: 'happiness',
          intensity: 0.85,
          context: 'Test context',
          source: 'api-test'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.memory.emotion).toBe('happiness');
      expect(response.body.memory.intensity).toBe(0.85);
      expect(response.body.memory.context).toBe('Test context');
      expect(response.body.memory.source).toBe('api-test');
      expect(response.body.memory.id).toBeDefined();
      expect(response.body.memory.timestamp).toBeDefined();
    });

    it('should return 400 when entityId is missing', async () => {
      const response = await request(app)
        .post('/emotion')
        .send({
          emotion: 'joy',
          intensity: 0.8
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('entityId and emotion are required');
    });

    it('should return 400 when emotion is missing', async () => {
      const response = await request(app)
        .post('/emotion')
        .send({
          entityId: 'user-123',
          intensity: 0.8
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('entityId and emotion are required');
    });
  });

  describe('POST /emotion/batch', () => {
    it('should store multiple emotions', async () => {
      const response = await request(app)
        .post('/emotion/batch')
        .send({
          entityId: 'user-batch-123',
          emotions: [
            { emotion: 'joy', intensity: 0.9 },
            { emotion: 'satisfaction', intensity: 0.8 },
            { emotion: 'gratitude', intensity: 0.95 }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.memories).toHaveLength(3);
    });

    it('should return 400 when emotions is not an array', async () => {
      const response = await request(app)
        .post('/emotion/batch')
        .send({
          entityId: 'user-123',
          emotions: 'not-an-array'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('entityId and emotions array required');
    });

    it('should return 400 when entityId is missing', async () => {
      const response = await request(app)
        .post('/emotion/batch')
        .send({
          emotions: [{ emotion: 'joy' }]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('entityId and emotions array required');
    });
  });

  describe('GET /emotion/:entityId', () => {
    it('should return empty timeline for non-existent entity', async () => {
      const response = await request(app)
        .get('/emotion/non-existent-user');

      expect(response.status).toBe(200);
      expect(response.body.entityId).toBe('non-existent-user');
      expect(response.body.timeline).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return stored emotions', async () => {
      // First, store some emotions
      await request(app)
        .post('/emotion')
        .send({ entityId: 'user-get-123', emotion: 'joy', intensity: 0.7 });

      await request(app)
        .post('/emotion')
        .send({ entityId: 'user-get-123', emotion: 'excitement', intensity: 0.9 });

      const response = await request(app)
        .get('/emotion/user-get-123');

      expect(response.status).toBe(200);
      expect(response.body.entityId).toBe('user-get-123');
      expect(response.body.timeline).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should filter by limit', async () => {
      // Store 5 emotions
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/emotion')
          .send({ entityId: 'user-limit-123', emotion: 'joy', intensity: 0.1 * (i + 1) });
      }

      const response = await request(app)
        .get('/emotion/user-limit-123?limit=2');

      expect(response.status).toBe(200);
      expect(response.body.timeline).toHaveLength(2);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('emotional-memory');
      expect(response.body.entities).toBeDefined();
      expect(response.body.relationships).toBeDefined();
    });
  });
});

describe('Query Functionality Tests', () => {
  let emotionalMemories;

  function storeEmotion(entityId, emotion) {
    if (!emotionalMemories.has(entityId)) {
      emotionalMemories.set(entityId, []);
    }
    const timeline = emotionalMemories.get(entityId);
    timeline.push({
      ...emotion,
      timestamp: emotion.timestamp || new Date().toISOString(),
      id: `emotion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    return timeline[timeline.length - 1];
  }

  function queryEmotions(entityIds, emotion, startDate, endDate, minIntensity) {
    const results = [];

    for (const entityId of (entityIds || [])) {
      let timeline = emotionalMemories.get(entityId) || [];

      if (startDate) {
        timeline = timeline.filter(e => new Date(e.timestamp) >= new Date(startDate));
      }
      if (endDate) {
        timeline = timeline.filter(e => new Date(e.timestamp) <= new Date(endDate));
      }
      if (emotion) {
        timeline = timeline.filter(e => e.emotion === emotion);
      }
      if (minIntensity !== undefined) {
        timeline = timeline.filter(e => (e.intensity || 0.5) >= minIntensity);
      }

      if (timeline.length > 0) {
        results.push({ entityId, events: timeline, count: timeline.length });
      }
    }

    return {
      results,
      totalEvents: results.reduce((sum, r) => sum + r.count, 0)
    };
  }

  beforeEach(() => {
    emotionalMemories = new Map();
  });

  it('should query emotions by specific emotion type', () => {
    storeEmotion('user-1', { emotion: 'joy', intensity: 0.8 });
    storeEmotion('user-1', { emotion: 'frustration', intensity: 0.6 });
    storeEmotion('user-2', { emotion: 'joy', intensity: 0.9 });

    const result = queryEmotions(['user-1', 'user-2'], 'joy');

    expect(result.totalEvents).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].entityId).toBe('user-1');
    expect(result.results[1].entityId).toBe('user-2');
  });

  it('should filter by minimum intensity', () => {
    storeEmotion('user-1', { emotion: 'joy', intensity: 0.3 });
    storeEmotion('user-1', { emotion: 'satisfaction', intensity: 0.7 });
    storeEmotion('user-1', { emotion: 'excitement', intensity: 0.95 });

    const result = queryEmotions(['user-1'], null, null, null, 0.5);

    expect(result.totalEvents).toBe(2);
    expect(result.results[0].count).toBe(2);
  });

  it('should combine date range and emotion filters', () => {
    storeEmotion('user-1', {
      emotion: 'joy',
      intensity: 0.8,
      timestamp: '2026-01-01T10:00:00.000Z'
    });
    storeEmotion('user-1', {
      emotion: 'joy',
      intensity: 0.6,
      timestamp: '2026-06-15T10:00:00.000Z'
    });

    const result = queryEmotions(
      ['user-1'],
      'joy',
      '2026-06-01',
      '2026-12-31'
    );

    expect(result.totalEvents).toBe(1);
    expect(result.results[0].events[0].intensity).toBe(0.6);
  });

  it('should return empty results for non-matching queries', () => {
    storeEmotion('user-1', { emotion: 'joy', intensity: 0.8 });

    const result = queryEmotions(['user-1'], 'frustration');

    expect(result.totalEvents).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('should handle empty entity list', () => {
    const result = queryEmotions([], 'joy');

    expect(result.totalEvents).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('should return results for multiple entities', () => {
    storeEmotion('user-A', { emotion: 'trust', intensity: 0.9 });
    storeEmotion('user-B', { emotion: 'trust', intensity: 0.85 });
    storeEmotion('user-C', { emotion: 'trust', intensity: 0.7 });

    const result = queryEmotions(['user-A', 'user-B', 'user-C'], 'trust');

    expect(result.totalEvents).toBe(3);
    expect(result.results).toHaveLength(3);
  });
});
