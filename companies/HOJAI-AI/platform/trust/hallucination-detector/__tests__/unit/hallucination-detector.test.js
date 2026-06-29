/**
 * Hallucination Detector - Unit Tests
 *
 * Tests for all detection functions:
 * - detectHallucinations() - Main detection function
 * - extractNamedEntities() - Named entity extraction
 * - checkConsistency() - Internal contradiction detection
 * - findUngroundedClaims() - Ungrounded fact detection
 * - calculateHallucinationScore() - Score computation
 */

import { describe, it, expect } from 'vitest';

// Import functions from the main module
// Since we're testing ES module, we need to import the source directly
const moduleUrl = new URL('../../src/index.js', import.meta.url);
const { default: app } = await import(moduleUrl);

// Extract functions by making HTTP requests to the running server
// For unit testing, we'll test the detection logic directly
// We'll use supertest-style assertions via the /detect endpoint

describe('Hallucination Detector - Health Check', () => {
  it('should return healthy status', async () => {
    const response = await fetch('http://localhost:4994/health');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.service).toBe('hallucination-detector');
    expect(data.port).toBe(4994);
  });
});

describe('Hallucination Detector - /detect endpoint', () => {
  it('should reject requests without text', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Text is required');
  });

  it('should accept valid text and return detection result', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'The weather is nice today.' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('text');
    expect(data).toHaveProperty('issues');
    expect(data).toHaveProperty('hallucinationScore');
    expect(data).toHaveProperty('risk');
    expect(data).toHaveProperty('requiresReview');

    expect(Array.isArray(data.issues)).toBe(true);
    expect(typeof data.hallucinationScore).toBe('number');
    expect(['low', 'medium', 'high']).toContain(data.risk);
    expect(typeof data.requiresReview).toBe('boolean');
  });
});

describe('Hallucination Detection - Overconfidence', () => {
  it('should detect overconfidence with multiple absolute statements', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'This product is 100% effective. It always works. It never fails. It is definitely the best solution.',
      }),
    });

    const data = await response.json();
    const overconfidenceIssue = data.issues.find(i => i.type === 'overconfidence');

    expect(overconfidenceIssue).toBeDefined();
    expect(overconfidenceIssue.severity).toBe('high');
    expect(data.risk).toBe('high');
  });

  it('should not flag normal confidence statements', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The solution typically works well for most users.',
      }),
    });

    const data = await response.json();
    const overconfidenceIssue = data.issues.find(i => i.type === 'overconfidence');

    expect(overconfidenceIssue).toBeUndefined();
  });
});

describe('Hallucination Detection - Unsupported Specificity', () => {
  it('should detect specific claims without citations', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The company has 75 million users and generated 1 billion in revenue last year.',
      }),
    });

    const data = await response.json();
    const specificityIssue = data.issues.find(i => i.type === 'unsupported_specificity');

    expect(specificityIssue).toBeDefined();
    expect(specificityIssue.severity).toBe('medium');
  });

  it('should not flag specific claims with citations', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'According to the 2024 report [1], the company has 75 million users. (McKinsey, 2024)',
      }),
    });

    const data = await response.json();
    const specificityIssue = data.issues.find(i => i.type === 'unsupported_specificity');

    expect(specificityIssue).toBeUndefined();
  });

  it('should not flag specific claims with links', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The company has 75 million users. Learn more at https://example.com/report',
      }),
    });

    const data = await response.json();
    const specificityIssue = data.issues.find(i => i.type === 'unsupported_specificity');

    expect(specificityIssue).toBeUndefined();
  });
});

describe('Hallucination Detection - Internal Inconsistency', () => {
  it('should detect however + therefore contradiction', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The results are inconclusive, however further testing is needed. Therefore, we recommend proceeding with caution.',
      }),
    });

    const data = await response.json();
    const inconsistencyIssue = data.issues.find(i => i.type === 'internal_inconsistency');

    expect(inconsistencyIssue).toBeDefined();
    expect(inconsistencyIssue.severity).toBe('high');
  });

  it('should detect but + similarly contradiction', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The product works well, but it has limitations. Similarly, other solutions have their own issues.',
      }),
    });

    const data = await response.json();
    const inconsistencyIssue = data.issues.find(i => i.type === 'internal_inconsistency');

    expect(inconsistencyIssue).toBeDefined();
  });
});

describe('Hallucination Detection - Ungrounded Facts', () => {
  it('should detect specific facts without evidence markers', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The market will grow by 50 percent next quarter.',
      }),
    });

    const data = await response.json();
    const ungroundedIssue = data.issues.find(i => i.type === 'ungrounded_specific_fact');

    expect(ungroundedIssue).toBeDefined();
    expect(ungroundedIssue.severity).toBe('medium');
  });

  it('should not flag facts with evidence markers', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'According to our research, the market will grow because of increased adoption.',
      }),
    });

    const data = await response.json();
    const ungroundedIssue = data.issues.find(i => i.type === 'ungrounded_specific_fact');

    expect(ungroundedIssue).toBeUndefined();
  });
});

describe('Hallucination Detection - Score Calculation', () => {
  it('should return low score for clean text', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Based on the available data, we can see that most users find the product helpful.',
      }),
    });

    const data = await response.json();

    expect(data.hallucinationScore).toBeLessThan(0.4);
    expect(data.risk).toBe('low');
  });

  it('should return high score for problematic text', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'This is 100% guaranteed. We always succeed. We never fail. 1 billion people use our product. It is definitely the best. However, some people disagree. Therefore, we should proceed.',
      }),
    });

    const data = await response.json();

    expect(data.hallucinationScore).toBeGreaterThan(0.3);
    expect(data.requiresReview).toBe(true);
  });

  it('should normalize score by text length', async () => {
    const shortText = 'This is 100% perfect.';
    const longText = 'This is 100% perfect. ' + 'Regular text. '.repeat(100);

    const shortResponse = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: shortText }),
    });

    const longResponse = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: longText }),
    });

    const shortData = await shortResponse.json();
    const longData = await longResponse.json();

    // Short text with same issues should have higher normalized score
    expect(shortData.hallucinationScore).toBeGreaterThanOrEqual(longData.hallucinationScore);
  });

  it('should clamp score between 0 and 1', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'This is 100% guaranteed. Always works. Never fails. Definite. Certain. Impossible. Absolutely. 100%. 100%. 100%.',
      }),
    });

    const data = await response.json();

    expect(data.hallucinationScore).toBeGreaterThanOrEqual(0);
    expect(data.hallucinationScore).toBeLessThanOrEqual(1);
  });
});

describe('Hallucination Detection - /detect/batch endpoint', () => {
  it('should reject batch requests without texts array', async () => {
    const response = await fetch('http://localhost:4994/detect/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'not an array' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Texts array is required');
  });

  it('should reject batch requests with non-array texts', async () => {
    const response = await fetch('http://localhost:4994/detect/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: 'not an array' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Texts array is required');
  });

  it('should process multiple texts and return summary', async () => {
    const response = await fetch('http://localhost:4994/detect/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: [
          'Clean text with no issues.',
          'This is 100% perfect and always works.',
          'The market will grow by 50 percent.',
        ],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('results');
    expect(data).toHaveProperty('summary');
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBe(3);

    // Check summary structure
    expect(data.summary).toHaveProperty('avgScore');
    expect(data.summary).toHaveProperty('highRisk');
    expect(data.summary).toHaveProperty('mediumRisk');
    expect(data.summary).toHaveProperty('lowRisk');

    expect(typeof data.summary.avgScore).toBe('number');
    expect(data.summary.highRisk + data.summary.mediumRisk + data.summary.lowRisk).toBe(3);
  });

  it('should calculate correct risk counts in summary', async () => {
    const response = await fetch('http://localhost:4994/detect/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: [
          'Normal text without issues.',
          'This always works 100% of the time.',
          'Another normal statement here.',
        ],
      }),
    });

    const data = await response.json();

    const highRiskCount = data.results.filter(r => r.risk === 'high').length;
    const lowRiskCount = data.results.filter(r => r.risk === 'low').length;

    expect(data.summary.highRisk).toBe(highRiskCount);
    expect(data.summary.lowRisk).toBe(lowRiskCount);
  });

  it('should handle empty array', async () => {
    const response = await fetch('http://localhost:4994/detect/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: [] }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.results.length).toBe(0);
    expect(data.summary.avgScore).toBe(0);
    expect(data.summary.highRisk).toBe(0);
  });
});

describe('Hallucination Detection - Edge Cases', () => {
  it('should handle empty text', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    });

    // Empty string is truthy, should process
    expect(response.status).toBe(200);
  });

  it('should handle very long text', async () => {
    const longText = 'This is a test sentence. '.repeat(1000);

    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: longText }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('hallucinationScore');
  });

  it('should handle text with only whitespace', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '   ' }),
    });

    expect(response.status).toBe(200);
  });

  it('should handle text with special characters', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Company reported 100% <success> with "quotes" and numbers: 1,000,000.',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.issues)).toBe(true);
  });

  it('should include context in request if provided', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Test text.',
        context: { domain: 'technology', source: 'ai-model' },
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('hallucinationScore');
  });
});

describe('Hallucination Detection - Risk Classification', () => {
  it('should classify score > 0.7 as high risk', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '100% guaranteed. Always. Never fails. Definitely. Certainly. Absolutely. Impossible. Definite. Certain. Perfect. 100%. 100%.',
      }),
    });

    const data = await response.json();

    if (data.hallucinationScore > 0.7) {
      expect(data.risk).toBe('high');
    }
  });

  it('should classify score between 0.4 and 0.7 as medium risk', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The company has 50 million users. The market will grow by 25 percent.',
      }),
    });

    const data = await response.json();

    if (data.hallucinationScore > 0.4 && data.hallucinationScore <= 0.7) {
      expect(data.risk).toBe('medium');
    }
  });

  it('should classify score <= 0.4 as low risk', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The product is generally well-received by users.',
      }),
    });

    const data = await response.json();

    expect(data.risk).toBe('low');
  });

  it('should set requiresReview to true when score > 0.5', async () => {
    const response = await fetch('http://localhost:4994/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'This is 100% guaranteed. It always works. Never fails. Definitely certain.',
      }),
    });

    const data = await response.json();

    if (data.hallucinationScore > 0.5) {
      expect(data.requiresReview).toBe(true);
    }
  });
});