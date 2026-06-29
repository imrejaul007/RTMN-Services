import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4995;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Risk categories
const RISK_TYPES = {
  factual: 'factual_accuracy',
  safety: 'safety_harm',
  privacy: 'privacy_leak',
  legal: 'legal_compliance',
  reputational: 'reputational_damage'
};

// Score risk for content
function scoreRisk(content, options = {}) {
  const scores = {
    factual: scoreFactualRisk(content),
    safety: scoreSafetyRisk(content),
    privacy: scorePrivacyRisk(content),
    legal: scoreLegalRisk(content),
    reputational: scoreReputationalRisk(content)
  };

  // Weighted overall risk
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

function scoreFactualRisk(content) {
  let risk = 0;

  // Unverified claims
  const unverifiedClaims = content.match(/\b(could be|maybe|possibly|might be|believed to|thought to)/gi);
  if (unverifiedClaims) risk += 0.2;

  // Specific statistics without sources
  const stats = content.match(/\b\d+\s+(million|billion|people|percent|%)/gi);
  const hasSource = content.match(/\[(\d+)\]|\([^)]+\d{4}\)/);
  if (stats && !hasSource) risk += 0.3;

  // Outdated information indicators
  const outdated = content.match(/\b(old|outdated|former|previous)/gi);
  if (outdated) risk += 0.1;

  return Math.min(1, risk);
}

function scoreSafetyRisk(content) {
  let risk = 0;

  // Dangerous instructions
  const dangerous = content.match(/\b(how to make|instructions for|steps to create)\s+(bomb|weapon|explosive|poison|drug)/i);
  if (dangerous) return 1.0;

  // Medical advice without disclaimer
  const medicalAdvice = content.match(/\b(treatment|diagnosis|cure|remedy|medication)\b/i);
  const disclaimer = content.match(/\b(consult|doctor|specialist|medical professional)/i);
  if (medicalAdvice && !disclaimer) risk += 0.4;

  // Financial advice
  const financialAdvice = content.match(/\b(invest|stock|market|trading|financial)\b/i);
  if (financialAdvice) risk += 0.2;

  // Legal advice
  const legalAdvice = content.match(/\b(legal|court|lawsuit|attorney|lawyer)\b/i);
  if (legalAdvice) risk += 0.2;

  return Math.min(1, risk);
}

function scorePrivacyRisk(content) {
  let risk = 0;

  // PII patterns
  const piiPatterns = [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/, name: 'SSN' },
    { pattern: /\b\d{10,}\b/, name: 'Phone' },
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, name: 'Email' },
    { pattern: /\b\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\b/, name: 'Credit Card' }
  ];

  for (const { pattern, name } of piiPatterns) {
    if (content.match(pattern)) risk += 0.4;
  }

  // Privacy-related content
  const privacyContent = content.match(/\b(privacy|personal data|gdpr|consent|information)\b/i);
  if (privacyContent) risk += 0.1;

  return Math.min(1, risk);
}

function scoreLegalRisk(content) {
  let risk = 0;

  // Legal disclaimers
  const legal = content.match(/\b(liable|lawsuit|court|legal action|attorney)\b/i);
  if (legal) risk += 0.2;

  // Copyright indicators
  const copyright = content.match(/\b(copyright|trademark|patent|intellectual property)\b/i);
  if (copyright) risk += 0.1;

  // Defamatory language
  const defamatory = content.match(/\b(fraud|scam|illegal|unethical|wrongdoing)\b/i);
  if (defamatory) risk += 0.3;

  return Math.min(1, risk);
}

function scoreReputationalRisk(content) {
  let risk = 0;

  // Negative sentiment
  const negative = content.match(/\b(bad|poor|terrible|awful|worst|avoid|scam|fake)\b/gi);
  if (negative) risk += 0.2;

  // Named accusations
  const accusations = content.match(/\b(accused|alleged|reported|known for)\b/i);
  if (accusations) risk += 0.3;

  return Math.min(1, risk);
}

// POST /score - Score risk
app.post('/score', (req, res) => {
  const { content, options } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const result = scoreRisk(content, options);

  res.json(result);
});

// POST /score/batch - Batch score
app.post('/score/batch', (req, res) => {
  const { contents, options } = req.body;

  if (!contents || !Array.isArray(contents)) {
    return res.status(400).json({ error: 'Contents array is required' });
  }

  const results = contents.map(c => scoreRisk(c, options));

  const avgOverall = results.reduce((sum, r) => sum + r.overall, 0) / results.length;

  res.json({
    results,
    summary: {
      avgOverall,
      critical: results.filter(r => r.riskLevel === 'critical').length,
      high: results.filter(r => r.riskLevel === 'high').length,
      medium: results.filter(r => r.riskLevel === 'medium').length,
      low: results.filter(r => r.riskLevel === 'low').length
    }
  });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'risk-scorer', port: PORT });
});

app.listen(PORT, () => {
  console.log(`Risk Scorer running on port ${PORT}`);
});

export default app;
