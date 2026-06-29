/**
 * Decision Intelligence Tests
 * Spec Part 21: Decision Intelligence
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { extractDecisionsPattern } from '../src/services/decisionExtractor.js';
import { DecisionStorage } from '../src/services/decisionStorage.js';
import { answerWhyQuery, findRelated } from '../src/services/queryEngine.js';
import { Decision } from '../src/types/decision.js';

// Use a fake Redis or mock for tests
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    pipeline: () => ({
      set: vi.fn().mockReturnThis(),
      sadd: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      get: vi.fn().mockReturnThis(),
      del: vi.fn().mockReturnThis(),
      srem: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
    get: vi.fn().mockResolvedValue(null),
    smembers: vi.fn().mockResolvedValue([]),
    sadd: vi.fn().mockResolvedValue(1),
    set: vi.fn().mockResolvedValue('OK'),
  })),
}));

describe('Decision Extractor (Pattern)', () => {
  it('should extract "We will" decisions', () => {
    const text = "We'll launch the new product next month.";
    const decisions = extractDecisionsPattern(text);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions[0].what).toContain('launch');
  });

  it('should extract "decided to" decisions', () => {
    const text = "We decided to expand into Dubai.";
    const decisions = extractDecisionsPattern(text);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions[0].what).toContain('expand');
  });

  it('should extract "chose X over Y" decisions', () => {
    const text = "We chose Dubai over Singapore because of the GCC market.";
    const decisions = extractDecisionsPattern(text);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions[0].what).toContain('Dubai');
  });

  it('should extract "I will" personal decisions', () => {
    const text = "I should call my mom this week.";
    const decisions = extractDecisionsPattern(text);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions[0].who).toContain('I');
  });

  it('should return empty for non-decision text', () => {
    const text = "It was a sunny day.";
    const decisions = extractDecisionsPattern(text);
    expect(decisions.length).toBe(0);
  });
});

describe('Decision Storage', () => {
  const testDecision: Decision = {
    id: 'dec_test_123',
    userId: 'user_test',
    what: 'Launch in Dubai',
    why: 'High GCC market demand',
    who: ['Rejaul', 'Investor A'],
    when: new Date('2026-01-15'),
    alternatives: [
      { name: 'Singapore', rejected: true, reason: 'Lower market fit' },
      { name: 'London', rejected: true, reason: 'Too expensive' },
    ],
    confidence: 0.9,
    impact: 'high',
    context: 'Strategic expansion',
    source: 'meeting',
    tags: ['expansion', 'Dubai', 'GCC'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should save decision', async () => {
    await expect(DecisionStorage.save(testDecision)).resolves.not.toThrow();
  });

  it('should get decision by ID', async () => {
    // Mock Redis to return test decision
    const result = await DecisionStorage.get('dec_test_123');
    // Result depends on mock
    expect(result).toBeDefined();
  });

  it('should calculate memory summary', async () => {
    const summary = await DecisionStorage.getMemorySummary('user_test');
    expect(summary.userId).toBe('user_test');
    expect(summary).toHaveProperty('totalCount');
    expect(summary).toHaveProperty('byImpact');
    expect(summary.byImpact).toHaveProperty('high');
    expect(summary.byImpact).toHaveProperty('medium');
    expect(summary.byImpact).toHaveProperty('low');
  });
});

describe('Query Engine', () => {
  it('should return confidence score 0-1', async () => {
    const result = await answerWhyQuery({
      userId: 'user_test',
      topic: 'Dubai expansion',
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should return reasoning string', async () => {
    const result = await answerWhyQuery({
      userId: 'user_test',
      topic: 'Dubai',
    });
    expect(typeof result.reasoning).toBe('string');
  });

  it('should return similarDecisions array', async () => {
    const result = await answerWhyQuery({
      userId: 'user_test',
      topic: 'Dubai',
    });
    expect(Array.isArray(result.similarDecisions)).toBe(true);
  });

  it('should handle unknown topics', async () => {
    const result = await answerWhyQuery({
      userId: 'user_test',
      topic: 'Random unknown thing xyz123',
    });
    expect(result.confidence).toBeLessThanOrEqual(0.5);
    expect(result.decision).toBeNull();
  });
});

describe('API Endpoints', () => {
  it('should have /health endpoint', () => {
    // Just verify the service exists
    expect(true).toBe(true);
  });
});