/**
 * Hallucination Detector - Comprehensive Unit Tests
 *
 * Tests for all detection functions:
 * - detectHallucinations() - Main detection function
 * - extractNamedEntities() - Named entity extraction
 * - checkConsistency() - Internal contradiction detection
 * - findUngroundedClaims() - Ungrounded fact detection
 * - calculateHallucinationScore() - Score computation
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  detectHallucinations,
  extractNamedEntities,
  checkConsistency,
  findUngroundedClaims,
  calculateHallucinationScore
} from '../../src/index.js';

// ============================================
// Core Function Tests
// ============================================

describe('detectHallucinations - Core Functionality', () => {
  it('should return a valid result object with all required properties', () => {
    const result = detectHallucinations('This is a clean sentence.');

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('hallucinationScore');
    expect(result).toHaveProperty('risk');
    expect(result).toHaveProperty('requiresReview');

    expect(Array.isArray(result.issues)).toBe(true);
    expect(typeof result.hallucinationScore).toBe('number');
    expect(['low', 'medium', 'high']).toContain(result.risk);
    expect(typeof result.requiresReview).toBe('boolean');
  });

  it('should truncate text to 100 characters in response', () => {
    const longText = 'A'.repeat(200);
    const result = detectHallucinations(longText);

    expect(result.text.length).toBe(103); // 100 + '...'
    expect(result.text.endsWith('...')).toBe(true);
  });

  it('should handle empty text gracefully', () => {
    const result = detectHallucinations('');

    expect(result).toHaveProperty('hallucinationScore');
    expect(result).toHaveProperty('issues');
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('should handle text with only whitespace', () => {
    const result = detectHallucinations('   \n\t  ');

    expect(result).toHaveProperty('hallucinationScore');
    expect(result.issues).toEqual([]);
  });

  it('should handle null/undefined context gracefully', () => {
    const result = detectHallucinations('Test text.', null);
    expect(result).toHaveProperty('hallucinationScore');

    const result2 = detectHallucinations('Test text.', undefined);
    expect(result2).toHaveProperty('hallucinationScore');
  });

  it('should accept context object without affecting detection', () => {
    const context = { domain: 'technology', source: 'gpt-4' };
    const result = detectHallucinations('Test text.', context);

    expect(result).toHaveProperty('hallucinationScore');
  });
});

// ============================================
// Overconfidence Detection Tests
// ============================================

describe('detectHallucinations - Overconfidence Detection', () => {
  it('should detect overconfidence with multiple absolute statements', () => {
    const text = 'This product is 100% effective. It always works. It never fails. It is definitely the best. Certain to succeed.';
    const result = detectHallucinations(text);
    const overconfidenceIssue = result.issues.find(i => i.type === 'overconfidence');

    expect(overconfidenceIssue).toBeDefined();
    expect(overconfidenceIssue.severity).toBe('high');
    expect(result.risk).toBe('high');
  });

  it('should not flag normal confidence statements', () => {
    const text = 'The solution typically works well for most users.';
    const result = detectHallucinations(text);
    const overconfidenceIssue = result.issues.find(i => i.type === 'overconfidence');

    expect(overconfidenceIssue).toBeUndefined();
  });

  it('should not flag text with fewer than 4 absolute indicators', () => {
    const text = 'This is 100% effective. It always works.';
    const result = detectHallucinations(text);
    const overconfidenceIssue = result.issues.find(i => i.type === 'overconfidence');

    expect(overconfidenceIssue).toBeUndefined();
  });

  it('should detect all absolute keywords: 100%, definitely, always, never, impossible, certain', () => {
    const text = '100% guaranteed. Definitely perfect. Always works. Never fails. Impossible to beat. Certain winner.';
    const result = detectHallucinations(text);
    const overconfidenceIssue = result.issues.find(i => i.type === 'overconfidence');

    expect(overconfidenceIssue).toBeDefined();
    expect(overconfidenceIssue.severity).toBe('high');
  });
});

// ============================================
// Unsupported Specificity Detection Tests
// ============================================

describe('detectHallucinations - Unsupported Specificity Detection', () => {
  it('should detect specific claims without citations', () => {
    const text = 'The company has 75 million users and generated 1 billion in revenue.';
    const result = detectHallucinations(text);
    const specificityIssue = result.issues.find(i => i.type === 'unsupported_specificity');

    expect(specificityIssue).toBeDefined();
    expect(specificityIssue.severity).toBe('medium');
  });

  it('should not flag specific claims with bracket citations', () => {
    const text = 'According to the report [1], the company has 75 million users.';
    const result = detectHallucinations(text);
    const specificityIssue = result.issues.find(i => i.type === 'unsupported_specificity');

    expect(specificityIssue).toBeUndefined();
  });

  it('should not flag specific claims with parenthetical citations', () => {
    const text = 'The company has 75 million users. (McKinsey, 2024)';
    const result = detectHallucinations(text);
    const specificityIssue = result.issues.find(i => i.type === 'unsupported_specificity');

    expect(specificityIssue).toBeUndefined();
  });

  it('should not flag specific claims with URLs', () => {
    const text = 'The company has 75 million users. https://example.com/report';
    const result = detectHallucinations(text);
    const specificityIssue = result.issues.find(i => i.type === 'unsupported_specificity');

    expect(specificityIssue).toBeUndefined();
  });

  it('should detect various number formats: million, billion, percent, %', () => {
    const texts = [
      'We have 50 million users.',
      'The market is worth 1 billion dollars.',
      'Growth increased by 25 percent this year.',
      'Adoption rate is 80%.'
    ];

    texts.forEach(text => {
      const result = detectHallucinations(text);
      const specificityIssue = result.issues.find(i => i.type === 'unsupported_specificity');
      expect(specificityIssue).toBeDefined();
    });
  });

  it('should not flag numbers without statistical context', () => {
    const text = 'I have 2 cats and 3 dogs.';
    const result = detectHallucinations(text);
    const specificityIssue = result.issues.find(i => i.type === 'unsupported_specificity');

    expect(specificityIssue).toBeUndefined();
  });
});

// ============================================
// Internal Inconsistency Detection Tests
// ============================================

describe('detectHallucinations - Internal Inconsistency Detection', () => {
  it('should detect however + therefore contradiction', () => {
    const text = 'The results are inconclusive, however further testing is needed. Therefore, we recommend proceeding.';
    const result = detectHallucinations(text);
    const inconsistencyIssue = result.issues.find(i => i.type === 'internal_inconsistency');

    expect(inconsistencyIssue).toBeDefined();
    expect(inconsistencyIssue.severity).toBe('high');
  });

  it('should detect but + similarly contradiction', () => {
    const text = 'The product works well, but it has limitations. Similarly, other solutions exist.';
    const result = detectHallucinations(text);
    const inconsistencyIssue = result.issues.find(i => i.type === 'internal_inconsistency');

    expect(inconsistencyIssue).toBeDefined();
  });

  it('should detect never + sometimes contradiction', () => {
    const text = 'We never fail, but sometimes we have setbacks.';
    const result = detectHallucinations(text);
    const inconsistencyIssue = result.issues.find(i => i.type === 'internal_inconsistency');

    expect(inconsistencyIssue).toBeDefined();
  });

  it('should not flag text with only however', () => {
    const text = 'The results are inconclusive, however further testing is needed.';
    const result = detectHallucinations(text);
    const inconsistencyIssue = result.issues.find(i => i.type === 'internal_inconsistency');

    expect(inconsistencyIssue).toBeUndefined();
  });

  it('should not flag text with only therefore', () => {
    const text = 'The results are conclusive. Therefore, we recommend proceeding.';
    const result = detectHallucinations(text);
    const inconsistencyIssue = result.issues.find(i => i.type === 'internal_inconsistency');

    expect(inconsistencyIssue).toBeUndefined();
  });

  it('should not flag contradiction indicators in separate sentences that are logically consistent', () => {
    // Test that it only flags when both contradiction markers appear
    const text = 'The product has many features. However, some users prefer simplicity.';
    const result = detectHallucinations(text);
    const inconsistencyIssue = result.issues.find(i => i.type === 'internal_inconsistency');

    expect(inconsistencyIssue).toBeUndefined();
  });
});

// ============================================
// Ungrounded Facts Detection Tests
// ============================================

describe('detectHallucinations - Ungrounded Facts Detection', () => {
  it('should detect specific facts without evidence markers', () => {
    const text = 'The market will grow by 50 percent next quarter.';
    const result = detectHallucinations(text);
    const ungroundedIssue = result.issues.find(i => i.type === 'ungrounded_specific_fact');

    expect(ungroundedIssue).toBeDefined();
    expect(ungroundedIssue.severity).toBe('medium');
  });

  it('should not flag facts with "because" evidence marker', () => {
    const text = 'The market will grow by 50 percent because of increased adoption.';
    const result = detectHallucinations(text);
    const ungroundedIssue = result.issues.find(i => i.type === 'ungrounded_specific_fact');

    expect(ungroundedIssue).toBeUndefined();
  });

  it('should not flag facts with "study" evidence marker', () => {
    const text = 'A recent study shows growth of 50 percent.';
    const result = detectHallucinations(text);
    const ungroundedIssue = result.issues.find(i => i.type === 'ungrounded_specific_fact');

    expect(ungroundedIssue).toBeUndefined();
  });

  it('should not flag facts with "research" evidence marker', () => {
    const text = 'Our research indicates 50 percent growth.';
    const result = detectHallucinations(text);
    const ungroundedIssue = result.issues.find(i => i.type === 'ungrounded_specific_fact');

    expect(ungroundedIssue).toBeUndefined();
  });

  it('should not flag facts with "according" evidence marker', () => {
    const text = 'According to analysts, 50 percent growth is expected.';
    const result = detectHallucinations(text);
    const ungroundedIssue = result.issues.find(i => i.type === 'ungrounded_specific_fact');

    expect(ungroundedIssue).toBeUndefined();
  });

  it('should not flag facts with "shown" evidence marker', () => {
    const text = 'Studies have shown 50 percent growth.';
    const result = detectHallucinations(text);
    const ungroundedIssue = result.issues.find(i => i.type === 'ungrounded_specific_fact');

    expect(ungroundedIssue).toBeUndefined();
  });

  it('should not flag facts with "demonstrated" evidence marker', () => {
    const text = 'Results have demonstrated 50 percent improvement.';
    const result = detectHallucinations(text);
    const ungroundedIssue = result.issues.find(i => i.type === 'ungrounded_specific_fact');

    expect(ungroundedIssue).toBeUndefined();
  });
});

// ============================================
// Score Calculation Tests
// ============================================

describe('calculateHallucinationScore', () => {
  it('should return 0.1 for empty issues array', () => {
    const score = calculateHallucinationScore([], 'Some text');
    expect(score).toBe(0.1);
  });

  it('should apply correct weights for high severity issues', () => {
    const issues = [{ severity: 'high' }];
    const score = calculateHallucinationScore(issues, 'Short text');
    expect(score).toBeGreaterThan(0);
  });

  it('should apply correct weights for medium severity issues', () => {
    const issues = [{ severity: 'medium' }];
    const score = calculateHallucinationScore(issues, 'Some text');
    expect(score).toBeGreaterThan(0);
  });

  it('should apply correct weights for low severity issues', () => {
    const issues = [{ severity: 'low' }];
    const score = calculateHallucinationScore(issues, 'Some text');
    expect(score).toBeGreaterThan(0);
  });

  it('should normalize score by text length', () => {
    const issues = [{ severity: 'high' }];
    const shortScore = calculateHallucinationScore(issues, 'Short');
    const longScore = calculateHallucinationScore(issues, 'Longer text with more words to increase length significantly');
    expect(shortScore).toBeGreaterThanOrEqual(longScore);
  });

  it('should clamp score between 0 and 1', () => {
    const manyIssues = [
      { severity: 'high' },
      { severity: 'high' },
      { severity: 'high' },
      { severity: 'high' },
      { severity: 'high' }
    ];
    const score = calculateHallucinationScore(manyIssues, 'Short');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should handle unknown severity with default weight', () => {
    const issues = [{ severity: 'unknown' }];
    const score = calculateHallucinationScore(issues, 'Some text');
    expect(score).toBeGreaterThan(0);
  });

  it('should accumulate scores from multiple issues', () => {
    const issues = [
      { severity: 'high' },
      { severity: 'medium' },
      { severity: 'low' }
    ];
    const score = calculateHallucinationScore(issues, 'Medium length text for testing');
    expect(score).toBeGreaterThan(0);
  });
});

// ============================================
// Risk Classification Tests
// ============================================

describe('detectHallucinations - Risk Classification', () => {
  it('should classify score > 0.7 as high risk', () => {
    const text = '100% guaranteed. Always. Never fails. Definitely. Certainly. Absolutely. Impossible. Definite. Certain. Perfect. 100%. 100%.';
    const result = detectHallucinations(text);

    if (result.hallucinationScore > 0.7) {
      expect(result.risk).toBe('high');
    }
  });

  it('should classify score between 0.4 and 0.7 as medium risk', () => {
    const text = 'The company has 50 million users. The market will grow by 25 percent.';
    const result = detectHallucinations(text);

    if (result.hallucinationScore > 0.4 && result.hallucinationScore <= 0.7) {
      expect(result.risk).toBe('medium');
    }
  });

  it('should classify score <= 0.4 as low risk', () => {
    const text = 'The product is generally well-received by users.';
    const result = detectHallucinations(text);

    expect(result.risk).toBe('low');
  });

  it('should set requiresReview to true when score > 0.5', () => {
    const text = 'This is 100% guaranteed. It always works. Never fails. Definitely certain.';
    const result = detectHallucinations(text);

    if (result.hallucinationScore > 0.5) {
      expect(result.requiresReview).toBe(true);
    }
  });

  it('should set requiresReview to false when score <= 0.5', () => {
    const text = 'The product is generally well-received.';
    const result = detectHallucinations(text);

    expect(result.requiresReview).toBe(false);
  });
});

// ============================================
// Named Entity Extraction Tests
// ============================================

describe('extractNamedEntities', () => {
  it('should extract multi-word capitalized phrases', () => {
    const text = 'Apple Inc. released the new iPhone.';
    const entities = extractNamedEntities(text);

    expect(entities).toContain('Apple Inc');
  });

  it('should deduplicate entities', () => {
    const text = 'New York is great. New York has many museums.';
    const entities = extractNamedEntities(text);

    const newYorkCount = entities.filter(e => e.includes('New York')).length;
    expect(newYorkCount).toBe(1);
  });

  it('should return empty array for text without capitalized phrases', () => {
    const text = 'this is all lowercase.';
    const entities = extractNamedEntities(text);

    expect(entities).toEqual([]);
  });

  it('should extract organization names', () => {
    const text = 'Microsoft and Google compete in the market.';
    const entities = extractNamedEntities(text);

    expect(entities.length).toBeGreaterThan(0);
  });

  it('should handle single word entities at start of sentence', () => {
    const text = 'John went to the store.';
    const entities = extractNamedEntities(text);

    // 'John' is capitalized but single word
    expect(entities.some(e => e === 'John')).toBe(true);
  });

  it('should limit multi-word entities to 4 words', () => {
    const text = 'The United States of America is large.';
    const entities = extractNamedEntities(text);

    entities.forEach(entity => {
      expect(entity.split(/\s+/).length).toBeLessThanOrEqual(4);
    });
  });
});

// ============================================
// Consistency Check Tests
// ============================================

describe('checkConsistency', () => {
  it('should return empty array for consistent text', () => {
    const text = 'The product is good. It has many features.';
    const issues = checkConsistency(text);

    expect(issues).toEqual([]);
  });

  it('should detect internal contradictions', () => {
    const text = 'However, we should proceed. Therefore, we agree.';
    const issues = checkConsistency(text);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].type).toBe('internal_inconsistency');
  });

  it('should return issues with correct severity', () => {
    const text = 'We never fail. Sometimes we succeed.';
    const issues = checkConsistency(text);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe('high');
  });

  it('should return issues with descriptive message', () => {
    const text = 'However, therefore.';
    const issues = checkConsistency(text);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].message).toBeDefined();
    expect(typeof issues[0].message).toBe('string');
  });
});

// ============================================
// Ungrounded Claims Detection Tests
// ============================================

describe('findUngroundedClaims', () => {
  it('should return empty array for grounded claims', () => {
    const text = 'Studies show growth because of market conditions.';
    const claims = findUngroundedClaims(text);

    expect(claims).toEqual([]);
  });

  it('should detect ungrounded specific facts', () => {
    const text = 'Revenue increased by 40 percent this quarter.';
    const claims = findUngroundedClaims(text);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].type).toBe('ungrounded_specific_fact');
  });

  it('should handle multiple sentences', () => {
    const text = 'First sentence without facts. Second sentence with 50 million users.';
    const claims = findUngroundedClaims(text);

    expect(claims.length).toBeGreaterThan(0);
  });

  it('should handle empty claims gracefully', () => {
    const text = '...';
    const claims = findUngroundedClaims(text);

    expect(Array.isArray(claims)).toBe(true);
  });
});

// ============================================
// Integration Tests - Combined Detection
// ============================================

describe('detectHallucinations - Combined Detection', () => {
  it('should detect multiple issues in same text', () => {
    const text = '100% guaranteed. We have 50 million users. However, we are also the best. Therefore, we should proceed.';
    const result = detectHallucinations(text);

    expect(result.issues.length).toBeGreaterThan(1);
  });

  it('should handle clean, well-sourced text', () => {
    const text = 'According to research, the market shows promising growth because of increased adoption. (McKinsey, 2024)';
    const result = detectHallucinations(text);

    expect(result.hallucinationScore).toBeLessThan(0.5);
    expect(result.risk).toBe('low');
  });

  it('should handle text with multiple problem types', () => {
    const text = 'This is 100% perfect. We have 75 million users. However, we never fail. Therefore, we succeed.';
    const result = detectHallucinations(text);

    const hasOverconfidence = result.issues.some(i => i.type === 'overconfidence');
    const hasUnspecific = result.issues.some(i => i.type === 'unsupported_specificity');
    const hasInconsistency = result.issues.some(i => i.type === 'internal_inconsistency');

    expect(hasOverconfidence || hasUnspecific || hasInconsistency).toBe(true);
  });

  it('should handle mixed case text', () => {
    const text = 'THIS IS 100% CERTAIN. We have 50 MILLION users.';
    const result = detectHallucinations(text);

    expect(result).toHaveProperty('hallucinationScore');
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should handle text with numbers and units', () => {
    const text = 'The company grew by 25% over 3 years with 10 million users.';
    const result = detectHallucinations(text);

    expect(result).toHaveProperty('hallucinationScore');
  });

  it('should handle unicode text', () => {
    const text = 'The company has 50 million users. However, हम सफल हैं। Therefore, proceeding.';
    const result = detectHallucinations(text);

    expect(result).toHaveProperty('hallucinationScore');
  });

  it('should handle text with URLs and citations', () => {
    const text = 'According to https://example.com [1], we have 50 million users. (Study, 2024)';
    const result = detectHallucinations(text);

    expect(result.hallucinationScore).toBeLessThan(0.5);
  });
});

// ============================================
// Edge Cases Tests
// ============================================

describe('detectHallucinations - Edge Cases', () => {
  it('should handle very short text', () => {
    const result = detectHallucinations('Hi');
    expect(result).toHaveProperty('hallucinationScore');
  });

  it('should handle very long text', () => {
    const longText = 'This is a test. '.repeat(1000);
    const result = detectHallucinations(longText);

    expect(result).toHaveProperty('hallucinationScore');
    expect(result.text.length).toBe(103);
  });

  it('should handle special characters', () => {
    const text = 'Company reported 100% <success> with "quotes" and numbers: 1,000,000.';
    const result = detectHallucinations(text);

    expect(result).toHaveProperty('hallucinationScore');
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('should handle emoji in text', () => {
    const text = 'The product is 100% effective! 🚀 Always works. Never fails.';
    const result = detectHallucinations(text);

    expect(result).toHaveProperty('hallucinationScore');
  });

  it('should handle newlines and tabs', () => {
    const text = 'Line one.\n\tLine two.\n\nLine three.';
    const result = detectHallucinations(text);

    expect(result).toHaveProperty('hallucinationScore');
  });

  it('should handle consecutive sentences', () => {
    const text = 'One. Two. Three. Four. Five.';
    const result = detectHallucinations(text);

    expect(result).toHaveProperty('hallucinationScore');
  });

  it('should handle text with only numbers', () => {
    const result = detectHallucinations('123 456 789');
    expect(result).toHaveProperty('hallucinationScore');
  });

  it('should handle text with repeated words', () => {
    const text = 'Always always always always always.';
    const result = detectHallucinations(text);

    expect(result.issues.some(i => i.type === 'overconfidence')).toBe(true);
  });

  it('should not crash on malformed regex patterns', () => {
    const text = 'Test [invalid regex {} in text.';
    const result = detectHallucinations(text);

    expect(result).toHaveProperty('hallucinationScore');
  });

  it('should handle very large numbers', () => {
    const text = 'The market is worth 1000000000000 dollars.';
    const result = detectHallucinations(text);

    expect(result.issues.some(i => i.type === 'unsupported_specificity')).toBe(true);
  });
});

// ============================================
// Performance Tests
// ============================================

describe('detectHallucinations - Performance', () => {
  it('should complete detection quickly for normal text', () => {
    const text = 'The product is well-received. However, there are some concerns. Therefore, we should proceed.';
    const start = performance.now();

    detectHallucinations(text);

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });

  it('should handle multiple consecutive calls', () => {
    const texts = [
      'First text about the product.',
      'Second text with 50 million users.',
      'Third text with 100% certainty.',
      'Fourth text however therefore.',
      'Fifth clean text.'
    ];

    const start = performance.now();

    texts.forEach(text => detectHallucinations(text));

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
});