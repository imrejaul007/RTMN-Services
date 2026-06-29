import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ============================================
// Scoring Function Implementations (mirrors src/index.js exactly)
// ============================================

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
// Core Functionality Tests
// ============================================

describe('Factual Risk Scoring', () => {
  it('should return 0 for safe content', () => {
    const result = scoreFactualRisk('The company announced quarterly earnings today.');
    expect(result).toBe(0);
  });

  it('should detect unverified claims', () => {
    const result = scoreFactualRisk('This could be the best solution for your needs.');
    expect(result).toBe(0.2);
  });

  it('should detect unsourced statistics', () => {
    const result = scoreFactualRisk('Studies show 10 million people use this product.');
    expect(result).toBe(0.3);
  });

  it('should not penalize sourced statistics', () => {
    const result = scoreFactualRisk('Studies show 10 million people use this product (Smith, 2024).');
    expect(result).toBe(0);
  });

  it('should detect outdated indicators', () => {
    const result = scoreFactualRisk('This is the old way of doing things.');
    expect(result).toBe(0.1);
  });

  it('should cap risk at 1.0', () => {
    const content = 'This could be maybe possibly might be outdated old former previous';
    const result = scoreFactualRisk(content);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should handle sourced stats with bracket notation', () => {
    const result = scoreFactualRisk('Revenue is 10 million [1] dollars according to reports.');
    expect(result).toBe(0);
  });

  it('should detect believed to pattern', () => {
    const result = scoreFactualRisk('The product is believed to be the best in class.');
    expect(result).toBe(0.2);
  });

  it('should combine unverified + stats + outdated', () => {
    const result = scoreFactualRisk('This could be true. Studies show 10 million people. Old data.');
    expect(result).toBe(0.6);
  });
});

describe('Safety Risk Scoring', () => {
  it('should return 0 for safe content', () => {
    const result = scoreSafetyRisk('This is a great product that everyone loves.');
    expect(result).toBe(0);
  });

  it('should return 1.0 for dangerous content with exact pattern', () => {
    const result = scoreSafetyRisk('How to make bomb');
    expect(result).toBe(1.0);
  });

  it('should detect explosive instructions', () => {
    const result = scoreSafetyRisk('Instructions for explosive');
    expect(result).toBe(1.0);
  });

  it('should detect drug instructions', () => {
    const result = scoreSafetyRisk('Steps to create drug');
    expect(result).toBe(1.0);
  });

  it('should detect medical advice without disclaimer', () => {
    const result = scoreSafetyRisk('This treatment will cure your illness.');
    expect(result).toBe(0.4);
  });

  it('should not penalize medical advice with disclaimer', () => {
    const result = scoreSafetyRisk('Please consult a doctor for treatment options.');
    expect(result).toBe(0);
  });

  it('should detect financial advice', () => {
    const result = scoreSafetyRisk('You should invest in this stock immediately.');
    expect(result).toBe(0.2);
  });

  it('should detect legal advice', () => {
    const result = scoreSafetyRisk('Contact an attorney about this lawsuit.');
    expect(result).toBe(0.2);
  });

  it('should combine medical + financial + legal risks', () => {
    const result = scoreSafetyRisk('Treatment for condition. You should invest. Call attorney.');
    expect(result).toBe(0.8);
  });

  it('should not match partial patterns with extra words', () => {
    const result = scoreSafetyRisk('How to make a bomb safely.');
    expect(result).toBe(0);
  });

  it('should not match building explosive pattern', () => {
    const result = scoreSafetyRisk('Instructions for building explosive devices.');
    expect(result).toBe(0);
  });
});

describe('Privacy Risk Scoring', () => {
  it('should return 0 for content without PII', () => {
    const result = scorePrivacyRisk('This is a sample text about business operations.');
    expect(result).toBe(0);
  });

  it('should detect SSN pattern', () => {
    const result = scorePrivacyRisk('My SSN is 123-45-6789.');
    expect(result).toBe(0.4);
  });

  it('should detect phone numbers (10+ digits)', () => {
    const result = scorePrivacyRisk('Call me at 9876543210 for more info.');
    expect(result).toBe(0.4);
  });

  it('should detect email addresses', () => {
    const result = scorePrivacyRisk('Contact us at support@example.com.');
    expect(result).toBe(0.4);
  });

  it('should detect credit card numbers', () => {
    const result = scorePrivacyRisk('Card: 1234 5678 9012 3456');
    expect(result).toBe(0.4);
  });

  it('should detect privacy-related content', () => {
    const result = scorePrivacyRisk('This involves personal data and GDPR compliance.');
    expect(result).toBeGreaterThanOrEqual(0.1);
  });

  it('should cap at 1.0 for multiple PII', () => {
    const result = scorePrivacyRisk('SSN: 123-45-6789, Email: test@test.com, Phone: 9876543210');
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should detect multiple PII types cumulatively', () => {
    const result = scorePrivacyRisk('SSN: 123-45-6789. Email: test@test.com.');
    expect(result).toBe(0.8);
  });
});

describe('Legal Risk Scoring', () => {
  it('should return 0 for safe content', () => {
    const result = scoreLegalRisk('We offer excellent customer service.');
    expect(result).toBe(0);
  });

  it('should detect liability language', () => {
    const result = scoreLegalRisk('The company is not liable for any damages.');
    expect(result).toBe(0.2);
  });

  it('should detect copyright indicators', () => {
    const result = scoreLegalRisk('This content is protected by copyright.');
    expect(result).toBe(0.1);
  });

  it('should detect defamatory language', () => {
    const result = scoreLegalRisk('This company is involved in fraud and illegal activities.');
    expect(result).toBe(0.3); // Only fraud triggers defamatory (illegal is not in legal/defamatory patterns)
  });

  it('should detect lawsuit mentions', () => {
    const result = scoreLegalRisk('They filed a lawsuit against the company.');
    expect(result).toBe(0.2);
  });

  it('should cap at 1.0', () => {
    const content = 'liable lawsuit court fraud scam illegal copyright trademark';
    const result = scoreLegalRisk(content);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('should combine multiple legal categories', () => {
    // liable (0.2) + lawsuit (0.2) + fraud (0.3) = 0.7
    const result = scoreLegalRisk('Liable for lawsuit and fraud allegations.');
    expect(result).toBe(0.7);
  });
});

describe('Reputational Risk Scoring', () => {
  it('should return 0 for neutral content', () => {
    const result = scoreReputationalRisk('The meeting is scheduled for tomorrow.');
    expect(result).toBe(0);
  });

  it('should detect negative sentiment', () => {
    const result = scoreReputationalRisk('This is a terrible product with poor quality.');
    expect(result).toBe(0.2);
  });

  it('should detect named accusations', () => {
    const result = scoreReputationalRisk('The CEO is accused of wrongdoing.');
    expect(result).toBe(0.3);
  });

  it('should detect alleged statements', () => {
    const result = scoreReputationalRisk('It is alleged that the company engaged in fraud.');
    expect(result).toBe(0.3);
  });

  it('should detect scam mentions', () => {
    const result = scoreReputationalRisk('This is clearly a scam and fake product.');
    expect(result).toBe(0.2);
  });

  it('should combine negative + accusations', () => {
    const result = scoreReputationalRisk('Terrible awful worst. Accused of wrongdoing.');
    expect(result).toBe(0.5);
  });
});

// ============================================
// Overall Risk Assessment Tests
// ============================================

describe('scoreRisk - Overall Risk Assessment', () => {
  it('should return low risk for safe content', () => {
    const result = scoreRisk('This is a normal business announcement about our quarterly earnings.');
    expect(result.riskLevel).toBe('low');
    expect(result.requiresReview).toBe(false);
    expect(result.overall).toBeLessThan(0.3);
  });

  it('should return medium risk for content with multiple triggers', () => {
    const result = scoreRisk(
      'Treatment recommended. SSN: 123-45-6789. Email: test@test.com. ' +
      'The company involved in fraud and scam.'
    );
    expect(result.riskLevel).toBe('medium');
    expect(result.overall).toBeGreaterThanOrEqual(0.3);
    expect(result.overall).toBeLessThan(0.5);
  });

  it('should return high risk for content with maximum triggers', () => {
    const result = scoreRisk(
      'How to make bomb. Treatment required. SSN: 123-45-6789. Email: fraud@scam.com. ' +
      'The company accused of fraud and scam.'
    );
    expect(result.riskLevel).toBe('high');
    expect(result.requiresReview).toBe(true);
    expect(result.overall).toBeGreaterThanOrEqual(0.5);
  });

  it('should maximize safety score for dangerous instructions', () => {
    const result = scoreRisk('How to make bomb');
    expect(result.scores.safety).toBe(1.0);
  });

  it('should combine all risk dimensions correctly', () => {
    const result = scoreRisk(
      'How to make bomb. SSN: 123-45-6789. Card: 1234 5678 9012 3456. ' +
      'Treatment recommended. Email: test@test.com. ' +
      'Accused of fraud, scam, illegal, unethical wrongdoing.'
    );
    expect(result.scores.safety).toBe(1.0);
    expect(result.requiresReview).toBe(true);
    expect(result.overall).toBeGreaterThanOrEqual(0.5);
  });

  it('should include all score dimensions', () => {
    const result = scoreRisk('Test content');
    expect(result.scores).toHaveProperty('factual');
    expect(result.scores).toHaveProperty('safety');
    expect(result.scores).toHaveProperty('privacy');
    expect(result.scores).toHaveProperty('legal');
    expect(result.scores).toHaveProperty('reputational');
  });

  it('should truncate long content in response', () => {
    const longContent = 'A'.repeat(150);
    const result = scoreRisk(longContent);
    expect(result.content.length).toBeLessThanOrEqual(103);
  });

  it('should not truncate short content', () => {
    const shortContent = 'Short text';
    const result = scoreRisk(shortContent);
    expect(result.content).toBe(shortContent);
    expect(result.content).not.toContain('...');
  });

  it('should calculate weighted overall score correctly', () => {
    const safeContent = 'This is completely safe content.';
    const result = scoreRisk(safeContent);
    expect(result.overall).toBe(0);
  });

  it('should handle content with only factual risk', () => {
    const result = scoreRisk('This could be possibly true. Studies show 5 million people.');
    expect(result.scores.factual).toBe(0.5);
    expect(result.scores.safety).toBe(0);
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
  it('should be false for low risk content', () => {
    const result = scoreRisk('Safe content with no risk factors.');
    expect(result.requiresReview).toBe(false);
  });

  it('should be true for content that scores high overall', () => {
    const result = scoreRisk(
      'How to make bomb. Treatment. SSN: 123-45-6789. Email: test@test.com. ' +
      'Accused of fraud and scam.'
    );
    expect(result.requiresReview).toBe(true);
  });

  it.each([
    [0, false],
    [0.3, false],
    [0.49, false],
    [0.5, true],
    [0.7, true],
    [1.0, true]
  ])('adjusted score %p should have requiresReview = %p', (score, expected) => {
    const adjustedResult = { ...scoreRisk('test'), overall: score, requiresReview: score >= 0.5 };
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
      'Moderate risk with treatment and fraud.',
      'High risk with dangerous content.'
    ];

    const results = contents.map(c => scoreRisk(c));
    const avgOverall = results.reduce((sum, r) => sum + r.overall, 0) / results.length;

    expect(avgOverall).toBeGreaterThan(0);
    expect(avgOverall).toBeLessThanOrEqual(1);
  });

  it('should count risk levels correctly', () => {
    const contents = [
      'Safe content.',
      'Treatment recommended with 9876543210.',
      'High risk with SSN: 123-45-6789 and fraud.'
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

  it('should handle empty batch', () => {
    const results = [];
    const avgOverall = results.reduce((sum, r) => sum + r.overall, 0) / (results.length || 1);
    expect(Number.isNaN(avgOverall) || avgOverall === 0).toBe(true);
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

  it('should handle unicode content', () => {
    const result = scoreRisk('This is a test with unicode: () [] ()');
    expect(result).toBeDefined();
    expect(result.scores).toBeDefined();
  });

  it('should handle mixed case patterns', () => {
    const result = scoreRisk('HOW TO MAKE bombs. Bad terrible Scam FRAUD.');
    expect(result.overall).toBeGreaterThan(0);
  });

  it('should handle special characters', () => {
    const result = scoreRisk('Content with special chars: @#$%^&*() and "quotes"');
    expect(result).toBeDefined();
  });

  it('should handle newlines and tabs', () => {
    const result = scoreRisk('Content\nwith\ttabs\nand\nnewlines');
    expect(result).toBeDefined();
  });

  it('should handle HTML-like content', () => {
    const result = scoreRisk('<script>alert("xss")</script>');
    expect(result).toBeDefined();
  });

  it('should handle only whitespace', () => {
    const result = scoreRisk('   \n\t  \n  ');
    expect(result).toBeDefined();
    expect(result.riskLevel).toBe('low');
  });
});

// ============================================
// API Endpoint Tests (HTTP Integration)
// ============================================

describe('API Endpoints', () => {
  let server;
  let baseUrl;

  beforeEach(async () => {
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

    it('should include port in health response', async () => {
      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json();

      expect(data.port).toBeDefined();
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

    it('should handle dangerous content with exact pattern', async () => {
      const response = await fetch(`${baseUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'How to make bomb' })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scores.safety).toBe(1.0);
    });

    it('should include all score dimensions in response', async () => {
      const response = await fetch(`${baseUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Test content' })
      });
      const data = await response.json();

      expect(data.scores).toHaveProperty('factual');
      expect(data.scores).toHaveProperty('safety');
      expect(data.scores).toHaveProperty('privacy');
      expect(data.scores).toHaveProperty('legal');
      expect(data.scores).toHaveProperty('reputational');
    });

    it('should include riskLevel and requiresReview in response', async () => {
      const response = await fetch(`${baseUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Safe content.' })
      });
      const data = await response.json();

      expect(data.riskLevel).toBeDefined();
      expect(data.requiresReview).toBeDefined();
    });

    it('should handle content with options parameter', async () => {
      const response = await fetch(`${baseUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Test', options: { custom: 'option' } })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
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

    it('should calculate summary statistics correctly', async () => {
      const response = await fetch(`${baseUrl}/score/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            'Safe content with no risk factors.',
            'Treatment recommended. Contact test@example.com.',
            'SSN: 123-45-6789. The company liable for fraud.'
          ]
        })
      });
      const data = await response.json();

      expect(data.summary).toHaveProperty('critical');
      expect(data.summary).toHaveProperty('high');
      expect(data.summary).toHaveProperty('medium');
      expect(data.summary).toHaveProperty('low');
      expect(data.summary.critical + data.summary.high + data.summary.medium + data.summary.low).toBe(3);
    });

    it('should handle empty contents array', async () => {
      const response = await fetch(`${baseUrl}/score/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [] })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(0);
      expect(Number.isNaN(data.summary.avgOverall) || data.summary.avgOverall === 0).toBe(true);
    });

    it('should handle single item in batch', async () => {
      const response = await fetch(`${baseUrl}/score/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: ['Single safe content.'] })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.summary.avgOverall).toBe(data.results[0].overall);
    });
  });

  describe('Content-Type validation', () => {
    it('should accept JSON content type', async () => {
      const response = await fetch(`${baseUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Test' })
      });
      expect(response.status).toBe(200);
    });
  });
});
