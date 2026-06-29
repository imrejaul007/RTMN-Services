/**
 * Unit tests for InferenceEngine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InferenceEngine } from '../../src/inference/inferenceEngine.js';

// Mock the database module
vi.mock('../../src/db/database.js', () => ({
  query: vi.fn()
}));

import { query } from '../../src/db/database.js';

const mockQuery = query as ReturnType<typeof vi.fn>;

describe('InferenceEngine', () => {
  let engine: InferenceEngine;

  beforeEach(() => {
    engine = new InferenceEngine();
    vi.clearAllMocks();
  });

  describe('addFact', () => {
    it('should add a fact to the graph', () => {
      engine.addFact({
        subject: 'A',
        predicate: 'knows',
        object: 'B',
        confidence: 1.0
      });

      const facts = engine.query('knows');
      expect(facts).toHaveLength(1);
      expect(facts[0].subject).toBe('A');
      expect(facts[0].object).toBe('B');
    });

    it('should add multiple facts for same predicate', () => {
      engine.addFact({ subject: 'A', predicate: 'knows', object: 'B', confidence: 1.0 });
      engine.addFact({ subject: 'C', predicate: 'knows', object: 'D', confidence: 0.8 });

      const facts = engine.query('knows');
      expect(facts).toHaveLength(2);
    });
  });

  describe('clearFacts', () => {
    it('should clear all facts', () => {
      engine.addFact({ subject: 'A', predicate: 'knows', object: 'B', confidence: 1.0 });
      engine.clearFacts();

      const facts = engine.query('knows');
      expect(facts).toHaveLength(0);
    });
  });

  describe('query', () => {
    it('should return facts for a predicate', () => {
      engine.addFact({ subject: 'A', predicate: 'parentOf', object: 'B', confidence: 1.0 });
      engine.addFact({ subject: 'B', predicate: 'parentOf', object: 'C', confidence: 1.0 });

      const facts = engine.query('parentOf');
      expect(facts).toHaveLength(2);
    });

    it('should filter by subject when provided', () => {
      engine.addFact({ subject: 'A', predicate: 'knows', object: 'B', confidence: 1.0 });
      engine.addFact({ subject: 'A', predicate: 'knows', object: 'C', confidence: 1.0 });
      engine.addFact({ subject: 'D', predicate: 'knows', object: 'E', confidence: 1.0 });

      const facts = engine.query('knows', 'A');
      expect(facts).toHaveLength(2);
      expect(facts.every(f => f.subject === 'A')).toBe(true);
    });
  });

  describe('getFactsAbout', () => {
    it('should return all facts involving a subject', () => {
      engine.addFact({ subject: 'A', predicate: 'knows', object: 'B', confidence: 1.0 });
      engine.addFact({ subject: 'C', predicate: 'knows', object: 'A', confidence: 1.0 });
      engine.addFact({ subject: 'A', predicate: 'likes', object: 'D', confidence: 1.0 });

      const facts = engine.getFactsAbout('A');
      expect(facts).toHaveLength(3);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      engine.addFact({ subject: 'A', predicate: 'knows', object: 'B', confidence: 1.0 });
      engine.addFact({ subject: 'A', predicate: 'knows', object: 'C', confidence: 1.0 });
      engine.addFact({ subject: 'A', predicate: 'likes', object: 'D', confidence: 1.0 });

      const stats = engine.getStats();
      expect(stats.facts).toBe(3);
      expect(stats.rules).toBe(0);
    });
  });

  describe('infer - execution time tracking', () => {
    it('should track execution time', async () => {
      // Mock all queries to return empty
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const facts = [
        { subject: 'A', predicate: 'knows', object: 'B', confidence: 1.0 }
      ];

      const result = await engine.infer(facts);

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return empty results when no inference applies', async () => {
      // All mocks return empty
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      const facts = [
        { subject: 'A', predicate: 'knows', object: 'B', confidence: 1.0 }
      ];

      const result = await engine.infer(facts);

      expect(result).toBeDefined();
      expect(result.inferredFacts).toBeDefined();
      expect(result.appliedRules).toBeDefined();
    });
  });
});
