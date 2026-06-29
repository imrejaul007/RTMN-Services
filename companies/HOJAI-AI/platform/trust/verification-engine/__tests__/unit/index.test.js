import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, knowledgeGraph, addFact, verifyFact, parseStatement, isContradiction } from '../../src/index.js';

describe('Verification Engine', () => {
  let app;

  beforeEach(() => {
    // Clear knowledge graph before each test
    knowledgeGraph.clear();
    app = createApp();
  });

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

    it('should return false for same values', () => {
      expect(isContradiction('hot', 'hot')).toBe(false);
    });

    it('should return false for unrelated values', () => {
      expect(isContradiction('hot', 'fast')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isContradiction('HOT', 'cold')).toBe(true);
    });
  });

  describe('addFact', () => {
    it('should add a fact to the knowledge graph', () => {
      addFact('coffee', 'is', 'beverage', 'source1', 0.95);
      expect(knowledgeGraph.size).toBeGreaterThan(0);
    });

    it('should use default reliability when not specified', () => {
      addFact('fact', 'is', 'active', 'default_test');
      const key = 'fact|is';
      const facts = knowledgeGraph.get(key);
      expect(facts[0].reliability).toBe(0.8);
    });

    it('should store multiple facts for same subject-predicate', () => {
      addFact('item', 'is', 'red', 'source1', 0.8);
      addFact('item', 'is', 'blue', 'source2', 0.7);
      const key = 'item|is';
      const facts = knowledgeGraph.get(key);
      expect(facts.length).toBe(2);
    });

    it('should store fact with timestamp', () => {
      addFact('fact', 'is', 'active', 'test');
      const key = 'fact|is';
      const facts = knowledgeGraph.get(key);
      expect(facts[0].timestamp).toBeDefined();
    });
  });

  describe('verifyFact', () => {
    it('should return unknown verdict for unparseable statements', () => {
      const result = verifyFact('random text');
      expect(result).toBeDefined();
      expect(result.statement).toBe('random text');
    });

    it('should return verified for matching facts', () => {
      addFact('coffee', 'is', 'beverage', 'health_site', 0.95);
      const result = verifyFact('coffee is beverage');
      expect(result.verified).toBe(true);
      expect(result.confidence).toBe(1);
      expect(result.verdict).toBe('verified');
    });

    it('should detect contradicting facts', () => {
      addFact('coffee', 'is', 'hot', 'site_a', 0.8);
      addFact('coffee', 'is', 'cold', 'site_b', 0.7);
      const result = verifyFact('coffee is hot');
      expect(result.contradictingFacts.length).toBeGreaterThan(0);
    });

    it('should calculate 50% confidence for equal supporting and contradicting', () => {
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

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('verification-engine');
    });
  });

  describe('POST /fact', () => {
    it('should add fact successfully', async () => {
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

    it('should return 400 when subject is missing', async () => {
      const res = await request(app)
        .post('/fact')
        .send({ predicate: 'is', object: 'value' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when object is missing', async () => {
      const res = await request(app)
        .post('/fact')
        .send({ subject: 'test', predicate: 'is' });
      expect(res.status).toBe(400);
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
      await request(app)
        .post('/fact')
        .send({
          subject: 'coffee',
          predicate: 'is',
          object: 'beverage',
          source: 'source1',
          reliability: 0.95
        });

      const res = await request(app)
        .post('/verify')
        .send({ statement: 'coffee is beverage' });

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
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
  });

  describe('POST /verify/batch', () => {
    it('should return 400 when statements array is missing', async () => {
      const res = await request(app)
        .post('/verify/batch')
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 when statements is not an array', async () => {
      const res = await request(app)
        .post('/verify/batch')
        .send({ statements: 'not an array' });
      expect(res.status).toBe(400);
    });

    it('should process batch of statements', async () => {
      const res = await request(app)
        .post('/verify/batch')
        .send({
          statements: ['fact1 is true', 'fact2 is false']
        });
      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.summary).toBeDefined();
    });

    it('should handle empty array', async () => {
      const res = await request(app)
        .post('/verify/batch')
        .send({ statements: [] });
      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(0);
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
    });

    it('should filter by subject and predicate', async () => {
      await request(app)
        .post('/fact')
        .send({ subject: 'filter_test', predicate: 'is', object: 'active' });

      const res = await request(app)
        .get('/graph')
        .query({ subject: 'filter_test', predicate: 'is' });
      expect(res.status).toBe(200);
      expect(res.body.facts).toHaveLength(1);
    });

    it('should return empty array for non-existent query', async () => {
      const res = await request(app)
        .get('/graph')
        .query({ subject: 'nonexistent', predicate: 'is' });
      expect(res.status).toBe(200);
      expect(res.body.facts).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty body for POST /fact', async () => {
      const res = await request(app)
        .post('/fact')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long subject and object', () => {
      const longSubject = 'a'.repeat(1000);
      const longObject = 'b'.repeat(1000);
      const result = parseStatement(longSubject + ' is ' + longObject);
      expect(result).not.toBeNull();
      expect(result.subject).toBe(longSubject);
    });

    it('should handle statements with multiple spaces', () => {
      const result = parseStatement('product    is    premium');
      expect(result).not.toBeNull();
      expect(result.subject).toBe('product');
    });

    it('should handle numeric values', () => {
      addFact('temperature', 'is', '100', 'sensor', 0.95);
      const result = verifyFact('temperature is 100');
      expect(result.verified).toBe(true);
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

  describe('Integration Tests', () => {
    it('should support full fact verification workflow', async () => {
      await request(app)
        .post('/fact')
        .send({ subject: 'product', predicate: 'is', object: 'premium', source: 'manual' });

      await request(app)
        .post('/fact')
        .send({ subject: 'product', predicate: 'is', object: 'expensive', source: 'auto' });

      const verifyRes = await request(app)
        .post('/verify')
        .send({ statement: 'product is premium' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.verified).toBe(true);

      const graphRes = await request(app)
        .get('/graph')
        .query({ subject: 'product', predicate: 'is' });

      expect(graphRes.status).toBe(200);
      expect(graphRes.body.facts.length).toBe(2);
    });

    it('should handle batch verification with mixed results', async () => {
      await request(app)
        .post('/fact')
        .send({ subject: 'fact1', predicate: 'is', object: 'true', source: 's1' });

      await request(app)
        .post('/fact')
        .send({ subject: 'fact2', predicate: 'is', object: 'true', source: 's2' });

      const res = await request(app)
        .post('/verify/batch')
        .send({
          statements: [
            'fact1 is true',
            'fact2 is true'
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
