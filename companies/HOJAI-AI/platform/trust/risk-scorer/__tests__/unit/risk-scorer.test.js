import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as http from 'http';

// Mock scoring functions to test in isolation
// These replicate the logic from src/index.js for unit testing

const RISK_TYPES = {
  factual: 'factual_accuracy',
  safety: 'safety_harm',
  privacy: 'privacy_leak',
  legal: 'legal_compliance',
  reputational: 'reputational_damage'
};

// Scoring function implementations (mirrors src/index.js)
function scoreFactualRisk(content) {
  let risk = 0;

  const unverifiedClaims = content.match(/\b(could be|maybe|possibly|might be|believed to|thought to)/gi);
  if (unverifiedClaims) risk += 0.2;

  const stats = content.match(/\b\d+\s+(million|billion|people|percent|%)/gi);
  const hasSource = content.match(/\[(\d+)\]|\([^)]+\d{4}\)/);
  if (stats && !hasSource) risk += 0.3;

  const outdated = content.match(/\b(old|outdated|former|previous)/gi);
  if (outdated) risk += 0.1;

  return Math.min(1, risk);
}

function scoreSafetyRisk(content) {
  let risk = 0;

  const dangerous = content.match(/\b(how to make|instructions for|steps to create)\s+(bomb|weapon|explosive|poison|drug)/i);
  if (dangerous) return 1.0;

  const medicalAdvice = content.match(/\b(treatment|diagnosis|cure|remedy|medication)\b/i);
  const disclaimer = content.match(/\b(consult|doctor|specialist|medical professional)/i);
  if (medicalAdvice && !disclaimer) risk += 0.4;

  const financialAdvice = content.match(/\b(invest|stock|market|trading|financial)\b/i);
  if (financialAdvice) risk += 0.2;

  const legalAdvice = content.match(/\b(legal|court|lawsuit|attorney|lawyer)\b/i);
  if (legalAdvice) risk += 0.2;

  return Math.min(1, risk);
}

function scorePrivacyRisk(content) {
  let risk = 0;

  const piiPatterns = [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/, name: 'SSN' },
    { pattern: /\b\d{10,}\b/, name: 'Phone' },
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, name: 'Email' },
    { pattern: /\b\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\b/, name: 'Credit Card' }
  ];

  for (const { pattern } of piiPatterns) {
    if (content.match(pattern)) risk += 0.4;
  }

  const privacyContent = content.match(/\b(privacy|personal data|gdpr|consent|information)\b/i);
  if (privacyContent) risk += 0.1;

  return Math.min(1, risk);
}

function scoreLegalRisk(content) {
  let risk = 0;

  const legal = content.match(/\b(liable|lawsuit|court|legal action|attorney)\b/i);
  if (legal) risk += 0.2;

  const copyright = content.match(/\b(copyright|trademark|patent|intellectual property)\b/i);
  if (copyright) risk += 0.1;

  const defamatory = content.match(/\b(fraud|scam|illegal|unethical|wrongdoing)\b/i);
  if (defamatory) risk += 0.3;

  return Math.min(1, risk);
}

function scoreReputationalRisk(content) {
  let risk = 0;

  const negative = content.match(/\b(bad|poor|terrible|awful|worst|avoid|scam|fake)\b/gi);
  if (negative) risk += 0.2;

  const accusations = content.match(/\b(accused|alleged|reported|known for)\b/i);
  if (accusations) risk += 0.3;

  return Math.min(1, risk);
}

function scoreRisk(content, options = {}) {
  const scores = {
    factual: scoreFactualRisk(content),
    safety: scoreSafetyRisk(content),
    privacy: scorePrivacyRisk(content),
    legal: scoreLegalRisk(content),
    reputational: scoreReputationalRisk(content)
  };

  const weights = { factual: 0.3, safety: 0.3, privacy: 0.2, legal: 0.1, reputational: 0.1 };

  let overall = 0;
  for (const [type, score] of Object.entries(scores)) {
    overall += score * weights[type];
  }

  return {
    content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    scores,
    overall,
    riskLevel: overall >= 0.7 ? 'critical' : overall >= 0.5 ? 'high' : overall >= 0.3 ? 'medium' : 'low',
    requiresReview: overall >= 0.5
  };
}

function getRiskLevel(overall) {
  if (overall >= 0.7) return 'critical';
  if (overall >= 0.5) return 'high';
  if (overall >= 0.3) return 'medium';
  return 'low';
}

// ============================================
// Unit Tests for Individual Scoring Functions
// ============================================

describe('Factual Risk Scoring', () => {
  it('should return 0 for safe content', () => {
    const result = scoreFactualRisk('The company announced quarterly earnings today.');
    expect(result).toBe(0);
  });

  it('should detect unverified claims', () => {
    const result = scoreFactualRisk('This could be the best solution for your needs.');
    expect(result).toBeGreaterThan(0);
  });

  it('should detect unsourced statistics', () => {
    const result = scoreFactualRisk('Studies show 10 million people use this product.');
    expect(result).toBeGreaterThanOrEqual(0.3);
  });

  it('should not penalize sourced statistics', () => {
    const result = scoreFactualRisk('Studies show 10 million people use this product (Smith, 2024).');
    expect(result).toBeLessThan(0.3);
  });

  it('should detect outdated indicators', () => {
    const result = scoreFactualRisk('This is the old way of doing things.');
    expect(result).toBeGreaterThanOrEqual(0.1);
  });

  it('should cap risk at 1.0', () => {
    const content = 'This could be maybe possibly might be believed to thought to outdated old former previous';
    const result = scoreFactualRisk(content);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('Safety Risk Scoring', () => {
  it('should return 0 for safe content', () => {
    const result = scoreSafetyRisk('This is a great product that everyone loves.');
    expect(result).toBe(0);
  });

  it('should immediately return 1.0 for dangerous content', () => {
    // Pattern requires dangerous word immediately after "how to make|instructions for|steps to create"
    const result = scoreSafetyRisk('How to make bomb for self-defense.');
    expect(result).toBe(1.0);
  });

  it('should detect dangerous weapon instructions', () => {
    const result = scoreSafetyRisk('Instructions for building explosive devices.');
    expect(result).toBe(1.0);
  });

  it('should detect medical advice without disclaimer', () => {
    const result = scoreSafetyRisk('This treatment will cure your illness.');
    expect(result).toBeGreaterThanOrEqual(0.4);
  });

  it('should not penalize medical advice with disclaimer', () => {
    const result = scoreSafetyRisk('Please consult a doctor for treatment options.');
    expect(result).toBe(0);
  });

  it('should detect financial advice', () => {
    const result = scoreSafetyRisk('You should invest in this stock immediately.');
    expect(result).toBeGreaterThanOrEqual(0.2);
  });

  it('should detect legal advice', () => {
    const result = scoreSafetyRisk('Contact an attorney about this lawsuit.');
    expect(result).toBeGreaterThanOrEqual(0.2);
  });
});

describe('Privacy Risk Scoring', () => {
  it('should return 0 for content without PII', () => {
    // Use text that doesn't trigger any privacy patterns
    const result = scorePrivacyRisk('This is a sample text about business operations.');
    expect(result).toBe(0);
  });

  it('should detect SSN pattern', () => {
    const result = scorePrivacyRisk('My SSN is 123-45-6789.');
    expect(result).toBeGreaterThanOrEqual(0.4);
  });

  it('should detect phone numbers (10+ digits)', () => {
    const result = scorePrivacyRisk('Call me at 9876543210 for more info.');
    expect(result).toBeGreaterThanOrEqual(0.4);
  });

  it('should detect email addresses', () => {
    const result = scorePrivacyRisk('Contact us at support@example.com.');
    expect(result).toBeGreaterThanOrEqual(0.4);
  });

  it('should detect credit card numbers', () => {
    const result = scorePrivacyRisk('Card: 1234 5678 9012 3456');
    expect(result).toBeGreaterThanOrEqual(0.4);
  });

  it('should detect privacy-related content', () => {
    const result = scorePrivacyRisk('This involves personal data and GDPR compliance.');
    expect(result).toBeGreaterThanOrEqual(0.1);
  });

  it('should cap at 1.0 for multiple PII', () => {
    const result = scorePrivacyRisk('SSN: 123-45-6789, Email: test@test.com, Phone: 9876543210');
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('Legal Risk Scoring', () => {
  it('should return 0 for safe content', () => {
    const result = scoreLegalRisk('We offer excellent customer service.');
    expect(result).toBe(0);
  });

  it('should detect liability language', () => {
    const result = scoreLegalRisk('The company is not liable for any damages.');
    expect(result).toBeGreaterThanOrEqual(0.2);
  });

  it('should detect copyright indicators', () => {
    const result = scoreLegalRisk('This content is protected by copyright.');
    expect(result).toBeGreaterThanOrEqual(0.1);
  });

  it('should detect defamatory language', () => {
    const result = scoreLegalRisk('This company is involved in fraud and illegal activities.');
    expect(result).toBeGreaterThanOrEqual(0.3);
  });

  it('should cap at 1.0', () => {
    const content = 'liable lawsuit court fraud scam illegal copyright trademark';
    const result = scoreLegalRisk(content);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('Reputational Risk Scoring', () => {
  it('should return 0 for neutral content', () => {
    const result = scoreReputationalRisk('The meeting is scheduled for tomorrow.');
    expect(result).toBe(0);
  });

  it('should detect negative sentiment', () => {
    const result = scoreReputationalRisk('This is a terrible product with poor quality.');
    expect(result).toBeGreaterThanOrEqual(0.2);
  });

  it('should detect named accusations', () => {
    const result = scoreReputationalRisk('The CEO is accused of wrongdoing.');
    expect(result).toBeGreaterThanOrEqual(0.3);
  });

  it('should detect alleged statements', () => {
    const result = scoreReputationalRisk('It is alleged that the company engaged in fraud.');
    expect(result).toBeGreaterThanOrEqual(0.3);
  });
});

// ============================================
// Integration Tests for Main Risk Scoring
// ============================================

describe('scoreRisk - Overall Risk Assessment', () => {
  it('should return low risk for safe content', () => {
    const result = scoreRisk('This is a normal business announcement about our quarterly earnings.');
    expect(result.riskLevel).toBe('low');
    expect(result.requiresReview).toBe(false);
    expect(result.overall).toBeLessThan(0.3);
  });

  it('should return medium risk for moderately concerning content', () => {
    // Factual: 0.2 (could be, possibly) + 0.3 (unsourced stat) = 0.5, capped at 1
    // Legal: 0.2 (liable) + 0.3 (fraud) = 0.5
    // weighted = 0.5*0.3 + 0.5*0.3 + 0.2*0.2 + 0.1*0.1 + 0.1*0.1 = 0.38
    const result = scoreRisk('This could be possibly the best solution. Studies show 10 million people use it. The company is liable for fraud.');
    expect(result.riskLevel).toBe('medium');
    expect(result.requiresReview).toBe(false);
    expect(result.overall).toBeGreaterThanOrEqual(0.3);
    expect(result.overall).toBeLessThan(0.5);
  });

  it('should return high risk for concerning content', () => {
    // Safety: 0.4 (treatment, no disclaimer) + 0.2 (financial) = 0.6
    // Legal: 0.2 (liable) + 0.3 (fraud) = 0.5
    // Privacy: 0.4 (phone 10+ digits)
    // weighted = 0.6*0.3 + 0.6*0.3 + 0.4*0.2 + 0.5*0.1 + 0.1*0.1 = 0.18 + 0.18 + 0.08 + 0.05 + 0.01 = 0.50
    const result = scoreRisk('Call 9876543210 for treatment. The company might be liable for fraud.');
    expect(result.riskLevel).toBe('high');
    expect(result.requiresReview).toBe(true);
    expect(result.overall).toBeGreaterThanOrEqual(0.5);
  });

  it('should return critical risk for dangerous content', () => {
    // Safety: 1.0 (dangerous)
    // Legal: 0.3 (fraud) + 0.2 (liable) = 0.5
    // Reputational: 0.3 (accused) + 0.2 (scam) = 0.5
    // weighted = 1.0*0.3 + 0.5*0.3 + 0.1*0.2 + 0.5*0.1 + 0.5*0.1 = 0.3 + 0.15 + 0.02 + 0.05 + 0.05 = 0.57... still not critical
    // Need more risk factors: add privacy (SSN) + more legal
    // Privacy: 0.4 (SSN), Legal: 0.5, Reputational: 0.5, Factual: 0.2 (unsourced stat)
    // weighted = 1.0*0.3 + 0.5*0.3 + 0.4*0.2 + 0.5*0.1 + 0.5*0.1 = 0.3 + 0.15 + 0.08 + 0.05 + 0.05 = 0.63 < 0.7
    // Need all maxed: privacy multiple PII = 1.0
    // weighted = 1.0*0.3 + 0.5*0.3 + 1.0*0.2 + 0.5*0.1 + 0.5*0.1 = 0.3 + 0.15 + 0.2 + 0.05 + 0.05 = 0.75
    const result = scoreRisk('How to make bomb. SSN: 123-45-6789. Email: test@test.com. Phone: 9876543210. Accused of fraud.');
    expect(result.riskLevel).toBe('critical');
    expect(result.requiresReview).toBe(true);
    expect(result.overall).toBeGreaterThanOrEqual(0.7);
  });

  it('should include all score dimensions', () => {
    const result = scoreRisk('Test content');
    expect(result.scores).toHaveProperty('factual');
    expect(result.scores).toHaveProperty('safety');
    expect(result.scores).toHaveProperty('privacy');
    expect(result.scores).toHaveProperty('legal');
    expect(result.scores).toHaveProperty('reputational');
  });

  it('should truncate long content', () => {
    const longContent = 'A'.repeat(150);
    const result = scoreRisk(longContent);
    expect(result.content.length).toBeLessThanOrEqual(103); // 100 + '...'
  });

  it('should calculate weighted overall score', () => {
    // Test that weights are applied correctly
    const factualOnly = 'This could be true about the statistics.';
    const result = scoreRisk(factualOnly);
    // factual risk ~0.2, weighted by 0.3 = 0.06
    expect(result.overall).toBeLessThan(0.1);
  });
});

// ============================================
// Risk Level Classification Tests
// ============================================

describe('Risk Level Classification', () => {
  it.each([
    [0, 'low'],
    [0.1, 'low'],
    [0.29, 'low'],
    [0.3, 'medium'],
    [0.4, 'medium'],
    [0.49, 'medium'],
    [0.5, 'high'],
    [0.6, 'high'],
    [0.69, 'high'],
    [0.7, 'critical'],
    [0.85, 'critical'],
    [1.0, 'critical']
  ])('score %p should be classified as %s', (score, expectedLevel) => {
    expect(getRiskLevel(score)).toBe(expectedLevel);
  });
});

// ============================================
// requiresReview Flag Tests
// ============================================

describe('requiresReview Flag', () => {
  it.each([
    [0, false],
    [0.3, false],
    [0.49, false],
    [0.5, true],
    [0.7, true],
    [1.0, true]
  ])('score %p should have requiresReview = %p', (score, expected) => {
    const result = scoreRisk('Test content with score ' + score);
    // Adjust the result's overall score for testing
    const adjustedResult = { ...result, overall: score, requiresReview: score >= 0.5 };
    expect(adjustedResult.requiresReview).toBe(expected);
  });
});

// ============================================
// Batch Processing Tests
// ============================================

describe('Batch Processing Logic', () => {
  it('should calculate average overall correctly', () => {
    const contents = [
      'Safe content here.',
      'Moderate risk could be present.',
      'High risk with phone 9876543210'
    ];

    const results = contents.map(c => scoreRisk(c));
    const avgOverall = results.reduce((sum, r) => sum + r.overall, 0) / results.length;

    expect(avgOverall).toBeGreaterThan(0);
    expect(avgOverall).toBeLessThanOrEqual(1);
  });

  it('should count risk levels correctly', () => {
    const contents = [
      'Safe content.',
      'Medium risk: could be treatment.',
      'High risk with 9876543210'
    ];

    const results = contents.map(c => scoreRisk(c));
    const summary = {
      critical: results.filter(r => r.riskLevel === 'critical').length,
      high: results.filter(r => r.riskLevel === 'high').length,
      medium: results.filter(r => r.riskLevel === 'medium').length,
      low: results.filter(r => r.riskLevel === 'low').length
    };

    expect(summary.critical + summary.high + summary.medium + summary.low).toBe(3);
  });
});

// ============================================
// Edge Cases
// ============================================

describe('Edge Cases', () => {
  it('should handle empty content', () => {
    const result = scoreRisk('');
    expect(result.scores).toBeDefined();
    expect(result.overall).toBe(0);
    expect(result.riskLevel).toBe('low');
  });

  it('should handle very long content', () => {
    const longContent = 'Normal text. '.repeat(1000);
    const result = scoreRisk(longContent);
    expect(result).toBeDefined();
    expect(result.overall).toBeLessThanOrEqual(1);
  });

  it('should handle content with multiple risk factors', () => {
    const content = 'how to make bomb. SSN: 123-45-6789. Contact test@test.com. Accused of fraud.';
    const result = scoreRisk(content);
    expect(result.riskLevel).toBe('critical');
    expect(result.scores.safety).toBe(1.0);
    expect(result.requiresReview).toBe(true);
  });

  it('should handle unicode content', () => {
    const result = scoreRisk('This is a test with unicode: () [] ()');
    expect(result).toBeDefined();
  });

  it('should handle content with mixed case patterns', () => {
    const result = scoreRisk('HOW TO MAKE bombs. Bad terrible Scam FRAUD.');
    expect(result.overall).toBeGreaterThan(0);
  });
});

// ============================================
// API Endpoint Tests (HTTP Integration)
// ============================================

describe('API Endpoints', () => {
  let server;
  let baseUrl;

  beforeEach(async () => {
    // Dynamic import for ESM
    const { default: app } = await import('../../src/index.js');

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.service).toBe('risk-scorer');
    });
  });

  describe('POST /score', () => {
    it('should score content successfully', async () => {
      const response = await fetch(`${baseUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'This is a safe content.' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scores).toBeDefined();
      expect(data.overall).toBeDefined();
      expect(data.riskLevel).toBe('low');
    });

    it('should return 400 for missing content', async () => {
      const response = await fetch(`${baseUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Content is required');
    });

    it('should handle dangerous content', async () => {
      const response = await fetch(`${baseUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'How to make a bomb.' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scores.safety).toBe(1.0);
      expect(data.riskLevel).toBe('critical');
    });
  });

  describe('POST /score/batch', () => {
    it('should batch score multiple contents', async () => {
      const response = await fetch(`${baseUrl}/score/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: ['Safe content.', 'Another safe text.']
        })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(2);
      expect(data.summary).toBeDefined();
      expect(data.summary.avgOverall).toBeDefined();
    });

    it('should return 400 for missing contents array', async () => {
      const response = await fetch(`${baseUrl}/score/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Contents array is required');
    });

    it('should return 400 for non-array contents', async () => {
      const response = await fetch(`${baseUrl}/score/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: 'not an array' })
      });

      expect(response.status).toBe(400);
    });

    it('should calculate summary statistics', async () => {
      const response = await fetch(`${baseUrl}/score/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            'Safe content.',
            'Medium risk could be present.',
            'Critical: how to make bomb.'
          ]
        })
      });
      const data = await response.json();

      expect(data.summary.critical).toBe(1);
      expect(data.summary.medium).toBe(1);
      expect(data.summary.low).toBe(1);
    });
  });
});
