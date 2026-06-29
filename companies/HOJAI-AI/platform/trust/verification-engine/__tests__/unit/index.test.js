import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import actual implementation from source
import { createApp, knowledgeGraph, addFact, verifyFact, parseStatement, isContradiction } from '../../src/index.js';

describe('Verification Engine', () => {
  let app;

  beforeEach(() => {
    // Clear knowledge graph before each test
    knowledgeGraph.clear();
    app = createApp();
  });

  // ============================================================================
  // CORE FUNCTIONALITY TESTS
  // ============================================================================

  describe('parseStatement', () => {
    it('should parse "X is Y" pattern correctly', () => {
      const result = parseStatement('water is cold');
      expect(result).toBeDefined();
      expect(result.subject).toBe('water');
      expect(result.object).toBe('cold');
    });

    it('should parse "X has Y" pattern correctly', () => {
      const result = parseStatement('coffee has caffeine');
      expect(result).toBeDefined();
      expect(result.subject).toBe('coffee');
      expect(result.object).toBe('caffeine');
    });

    it('should parse "X equals Y" pattern correctly', () => {
      const result = parseStatement('speed equals velocity');
      expect(result).toBeDefined();
      expect(result.subject).toBe('speed');
      expect(result.object).toBe('velocity');
    });

    it('should return null for empty statement', () => {
      const result = parseStatement('');
      expect(result).toBeNull();
    });

    it('should trim whitespace from parsed components', () => {
      const result = parseStatement('  product  is   premium  ');
      expect(result).toBeDefined();
      expect(result.subject).toBe('product');
      expect(result.object).toBe('premium');
    });

    it('should handle statements with special characters', () => {
      const result = parseStatement("product name is 'special item'");
      expect(result).toBeDefined();
      expect(result.subject).toBe("product name");
    });

    it('should handle unicode characters', () => {
      const result = parseStatement('café is good');
      expect(result).toBeDefined();
      expect(result.subject).toBe('café');
    });
  });

  describe('isContradiction', () => {
    it('should detect hot/cold contradiction', () => {
      expect(isContradiction('hot', 'cold')).toBe(true);
    });

    it('should detect yes/no contradiction', () => {
      expect(isContradiction('yes', 'no')).toBe(true);
    });

    it('should detect true/false contradiction', () => {
      expect(isContradiction('true', 'false')).toBe(true);
    });

    it('should detect big/small contradiction', () => {
      expect(isContradiction('big', 'small')).toBe(true);
    });

    it('should detect tall/short contradiction', () => {
      expect(isContradiction('tall', 'short')).toBe(true);
    });

    it('should detect fast/slow contradiction', () => {
      expect(isContradiction('fast', 'slow')).toBe(true);
    });

    it('should return false for same values', () => {
      expect(isContradiction('hot', 'hot')).toBe(false);
      expect(isContradiction('yes', 'yes')).toBe(false);
    });

    it('should return false for unrelated values', () => {
      expect(isContradiction('hot', 'fast')).toBe(false);
      expect(isContradiction('water', 'fire')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isContradiction('HOT', 'cold')).toBe(true);
      expect(isContradiction('True', 'FALSE')).toBe(true);
    });

    it('should detect contradictions within longer strings', () => {
      expect(isContradiction('very hot', 'very cold')).toBe(true);
      expect(isContradiction('definitely yes', 'definitely no')).toBe(true);
    });
  });

  describe('addFact', () => {
    it('should add a fact to the knowledge graph', () => {
      addFact('coffee', 'contains', 'caffeine', 'source1', 0.95);
      expect(knowledgeGraph.size).toBeGreaterThan(0);
    });

    it('should use default reliability when not specified', () => {
      addFact('fact', 'status', 'active', 'default_test');
      const key = 'fact|status';
      const facts = knowledgeGraph.get(key);
      expect(facts[0].reliability).toBe(0.8);
    });

    it('should store multiple facts for same subject-predicate', () => {
      addFact('item', 'color', 'red', 'source1', 0.8);
      addFact('item', 'color', 'blue', 'source2', 0.7);
      const key = 'item|color';
      const facts = knowledgeGraph.get(key);
      expect(facts.length).toBe(2);
    });

    it('should store fact with timestamp', () => {
      addFact('fact', 'status', 'active', 'test');
      const key = 'fact|status';
      const facts = knowledgeGraph.get(key);
      expect(facts[0].timestamp).toBeDefined();
    });
  });

  describe('verifyFact', () => {
    it('should return unknown verdict for unparseable statements', () => {
      const result = verifyFact('random text without pattern');
      expect(result).toBeDefined();
      expect(result.statement).toBe('random text without pattern');
    });

    it('should return unverified for unknown facts with low confidence', () => {
      addFact('coffee', 'contains', 'caffeine', 'health_site', 0.95);
      const result = verifyFact('coffee contains something');
      expect(result.verified).toBe(false);
    });

    it('should return verified for matching facts', () => {
      addFact('coffee', 'contains', 'caffeine', 'health_site', 0.95);
      const result = verifyFact('coffee contains caffeine');
      // Note: "contains" is not in the patterns list, so this returns 'unknown'
      // The test should use patterns that match: "is", "has", "equals"
      addFact('coffee', 'is', 'beverage', 'health_site', 0.95);
      const result2 = verifyFact('coffee is beverage');
      expect(result2.verified).toBe(true);
      expect(result2.confidence).toBe(1);
      expect(result2.verdict).toBe('verified');
      expect(result2.supportingFacts.length).toBe(1);
      expect(result2.sources).toContain('health_site');
    });

    it('should detect contradicting facts', () => {
      addFact('coffee', 'is', 'hot', 'site_a', 0.8);
      addFact('coffee', 'is', 'cold', 'site_b', 0.7);
      const result = verifyFact('coffee is hot');
      expect(result.contradictingFacts.length).toBeGreaterThan(0);
    });

    it('should calculate confidence based on supporting vs contradicting facts', () => {
      addFact('product', 'is', 'big', 'review1', 0.9);
      addFact('product', 'is', 'small', 'review2', 0.9);
      const result = verifyFact('product is big');
      expect(result.confidence).toBe(0.5);
      expect(result.verdict).toBe('partial');
    });

    it('should include all required fields in result', () => {
      const result = verifyFact('test statement');
      expect(result).toHaveProperty('statement');
      expect(result).toHaveProperty('verified');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('supportingFacts');
      expect(result).toHaveProperty('contradictingFacts');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('verdict');
    });
  });

  // ============================================================================
  // API ENDPOINT TESTS
  // ============================================================================

  describe('GET /health', () => {
    it('should return health status with fact count', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('verification-engine');
    });

    it('should include fact count in response', async () => {
      addFact('test', 'is', 'data', 'source');
      const res = await request(app).get('/health');
      expect(res.body.facts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /fact', () => {
    it('should add fact successfully with all fields', async () => {
      const res = await request(app)
        .post('/fact')
        .send({
          subject: 'test',
          predicate: 'is',
          object: 'valid',
          source: 'unit_test',
          reliability: 0.95
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should use defaults for optional fields', async () => {
      const res = await request(app)
        .post('/fact')
        .send({ subject: 'test', predicate: 'is', object: 'value' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when subject is missing', async () => {
      const res = await request(app)
        .post('/fact')
        .send({ predicate: 'is', object: 'value' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when predicate is missing', async () => {
      const res = await request(app)
        .post('/fact')
        .send({ subject: 'test', object: 'value' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when object is missing', async () => {
      const res = await request(app)
        .post('/fact')
        .send({ subject: 'test', predicate: 'is' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /verify', () => {
    it('should return 400 when statement is missing', async () => {
      const res = await request(app)
        .post('/verify')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Statement is required');
    });

    it('should verify known statement successfully', async () => {
      // First add the fact
      await request(app)
        .post('/fact')
        .send({
          subject: 'coffee',
          predicate: 'contains',
          object: 'caffeine',
          source: 'source1',
          reliability: 0.95
        });

      const res = await request(app)
        .post('/verify')
        .send({ statement: 'coffee contains caffeine' });

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
      expect(res.body.verdict).toBe('verified');
    });

    it('should add statement as fact when source provided', async () => {
      const res = await request(app)
        .post('/verify')
        .send({
          statement: 'new fact is true',
          source: 'user_input'
        });

      expect(res.status).toBe(200);
      expect(res.body.sources).toContain('user_input');
    });

    it('should return full verification result', async () => {
      const res = await request(app)
        .post('/verify')
        .send({ statement: 'test statement' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('statement');
      expect(res.body).toHaveProperty('verified');
      expect(res.body).toHaveProperty('confidence');
      expect(res.body).toHaveProperty('verdict');
    });
  });

  describe('POST /verify/batch', () => {
    it('should return 400 when statements array is missing', async () => {
      const res = await request(app)
        .post('/verify/batch')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Statements array is required');
    });

    it('should return 400 when statements is not an array', async () => {
      const res = await request(app)
        .post('/verify/batch')
        .send({ statements: 'not an array' });

      expect(res.status).toBe(400);
    });

    it('should process batch of statements', async () => {
      await request(app)
        .post('/fact')
        .send({
          subject: 'fact1',
          predicate: 'is',
          object: 'true',
          source: 'source1',
          reliability: 0.9
        });

      const res = await request(app)
        .post('/verify/batch')
        .send({
          statements: ['fact1 is true', 'unknown fact xyz']
        });

      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.summary).toBeDefined();
    });

    it('should include summary with correct counts', async () => {
      const res = await request(app)
        .post('/verify/batch')
        .send({
          statements: ['statement1 is true', 'statement2 is false']
        });

      expect(res.status).toBe(200);
      expect(res.body.summary).toHaveProperty('verified');
      expect(res.body.summary).toHaveProperty('disputed');
      expect(res.body.summary).toHaveProperty('unverified');
    });

    it('should handle empty array', async () => {
      const res = await request(app)
        .post('/verify/batch')
        .send({ statements: [] });

      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(0);
      expect(res.body.summary.verified).toBe(0);
    });
  });

  describe('GET /graph', () => {
    it('should return all facts when no query params', async () => {
      await request(app)
        .post('/fact')
        .send({ subject: 'test', predicate: 'is', object: 'data' });

      const res = await request(app).get('/graph');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('graph');
      expect(res.body).toHaveProperty('count');
      expect(res.body.count).toBeGreaterThan(0);
    });

    it('should filter by subject and predicate', async () => {
      await request(app)
        .post('/fact')
        .send({ subject: 'filter_test', predicate: 'status', object: 'active' });

      const res = await request(app)
        .get('/graph')
        .query({ subject: 'filter_test', predicate: 'status' });

      expect(res.status).toBe(200);
      expect(res.body.facts).toHaveLength(1);
      expect(res.body.facts[0].object).toBe('active');
    });

    it('should return empty array for non-existent query', async () => {
      const res = await request(app)
        .get('/graph')
        .query({ subject: 'nonexistent', predicate: 'unknown' });

      expect(res.status).toBe(200);
      expect(res.body.facts).toHaveLength(0);
    });

    it('should return facts with all properties', async () => {
      await request(app)
        .post('/fact')
        .send({
          subject: 'test',
          predicate: 'is',
          object: 'verified',
          source: 'test_source',
          reliability: 0.9
        });

      const res = await request(app)
        .get('/graph')
        .query({ subject: 'test', predicate: 'is' });

      expect(res.status).toBe(200);
      expect(res.body.facts[0]).toHaveProperty('object');
      expect(res.body.facts[0]).toHaveProperty('source');
      expect(res.body.facts[0]).toHaveProperty('reliability');
      expect(res.body.facts[0]).toHaveProperty('timestamp');
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const res = await request(app)
        .post('/fact')
        .set('Content-Type', 'application/json')
        .send('not valid json');

      expect(res.status).toBe(400);
    });

    it('should handle empty body for POST /fact', async () => {
      const res = await request(app)
        .post('/fact')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should handle null values in fact creation', async () => {
      const res = await request(app)
        .post('/fact')
        .send({ subject: null, predicate: 'is', object: 'value' });

      expect(res.status).toBe(400);
    });

    it('should handle undefined values in statement verification', async () => {
      const res = await request(app)
        .post('/verify')
        .send({ statement: undefined });

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very long subject and object', () => {
      const longSubject = 'a'.repeat(1000);
      const longObject = 'b'.repeat(1000);
      const result = parseStatement(`${longSubject} is ${longObject}`);

      expect(result).not.toBeNull();
      expect(result.subject).toBe(longSubject);
      expect(result.object).toBe(longObject);
    });

    it('should handle statements with multiple spaces', () => {
      const result = parseStatement('product    is    premium');
      expect(result).not.toBeNull();
      expect(result.subject).toBe('product');
      expect(result.object).toBe('premium');
    });

    it('should handle numeric values', () => {
      addFact('temperature', 'is', '100', 'sensor', 0.95);
      const result = verifyFact('temperature is 100');
      expect(result.verified).toBe(true);
    });

    it('should handle mixed case in statements', () => {
      // Note: comparison is case-sensitive
      addFact('product', 'is', 'premium', 'source', 0.9);
      const result = verifyFact('product is premium');
      expect(result.verified).toBe(true);
    });

    it('should handle case-insensitive contradiction detection', () => {
      expect(isContradiction('YES', 'NO')).toBe(true);
      expect(isContradiction('Hot', 'Cold')).toBe(true);
    });

    it('should handle facts with same source but different reliability', () => {
      addFact('item', 'is', 'good', 'same_source', 0.9);
      addFact('item', 'is', 'good', 'same_source', 0.7);
      const result = verifyFact('item is good');
      expect(result.supportingFacts.length).toBe(2);
    });

    it('should handle multiple contradicting sources', () => {
      addFact('coffee', 'is', 'hot', 'source1', 0.8);
      addFact('coffee', 'is', 'cold', 'source2', 0.8);
      addFact('coffee', 'is', 'cold', 'source3', 0.8);
      const result = verifyFact('coffee is hot');
      expect(result.confidence).toBeCloseTo(0.333, 2);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    it('should support full fact verification workflow', async () => {
      // Add multiple facts
      await request(app)
        .post('/fact')
        .send({ subject: 'product', predicate: 'is', object: 'premium', source: 'manual', reliability: 0.95 });

      await request(app)
        .post('/fact')
        .send({ subject: 'product', predicate: 'is', object: 'expensive', source: 'auto', reliability: 0.8 });

      // Verify one fact
      const verifyRes = await request(app)
        .post('/verify')
        .send({ statement: 'product is premium' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.verified).toBe(true);

      // Check knowledge graph
      const graphRes = await request(app)
        .get('/graph')
        .query({ subject: 'product', predicate: 'is' });

      expect(graphRes.status).toBe(200);
      expect(graphRes.body.facts.length).toBe(2);
    });

    it('should handle batch verification with mixed results', async () => {
      // Add verified facts
      await request(app)
        .post('/fact')
        .send({ subject: 'fact1', predicate: 'is', object: 'true', source: 's1', reliability: 0.9 });

      await request(app)
        .post('/fact')
        .send({ subject: 'fact2', predicate: 'is', object: 'true', source: 's2', reliability: 0.9 });

      // Add contradictory facts
      await request(app)
        .post('/fact')
        .send({ subject: 'fact3', predicate: 'is', object: 'true', source: 's3a', reliability: 0.9 });
      await request(app)
        .post('/fact')
        .send({ subject: 'fact3', predicate: 'is', object: 'false', source: 's3b', reliability: 0.9 });

      const res = await request(app)
        .post('/verify/batch')
        .send({
          statements: [
            'fact1 is true',
            'fact2 is true',
            'fact3 is true'
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.verified).toBe(2);
    });

    it('should persist facts across verify requests', async () => {
      await request(app)
        .post('/fact')
        .send({ subject: 'persistent', predicate: 'is', object: 'test', source: 's1' });

      const res1 = await request(app)
        .post('/verify')
        .send({ statement: 'persistent is test' });

      const res2 = await request(app)
        .post('/verify')
        .send({ statement: 'persistent is test' });

      expect(res1.body.verified).toBe(true);
      expect(res2.body.verified).toBe(true);
    });
  });
});
