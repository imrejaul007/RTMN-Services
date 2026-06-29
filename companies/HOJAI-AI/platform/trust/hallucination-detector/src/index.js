import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4994;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Check for hallucinations in AI output
function detectHallucinations(text, context = {}) {
  const issues = [];

  // Check 1: Overconfidence without sources
  const hasSpecificClaims = text.match(/\b\d+\s+(million|billion|years?|people|percent|%)/gi);
  const hasCitations = text.match(/\[(\d+)\]|\([^)]+\d{4}\)/g);
  const hasLinks = text.match(/https?:\/\//g);

  if (hasSpecificClaims && !hasCitations && !hasLinks) {
    issues.push({
      type: 'unsupported_specificity',
      severity: 'medium',
      message: 'Specific claims made without supporting sources'
    });
  }

  // Check 2: Consistency with previous statements
  const namedEntities = extractNamedEntities(text);
  const contradictions = checkConsistency(text);
  issues.push(...contradictions);

  // Check 3: Out-of-domain claims
  const domainIndicators = text.match(/\b(100%|definitely|always|never|impossible|certain)/gi);
  if (domainIndicators && domainIndicators.length > 3) {
    issues.push({
      type: 'overconfidence',
      severity: 'high',
      message: 'Multiple absolute statements detected'
    });
  }

  // Check 4: Source grounding
  const ungroundedClaims = findUngroundedClaims(text);
  issues.push(...ungroundedClaims);

  // Calculate hallucination score
  const hallucinationScore = calculateHallucinationScore(issues, text);

  return {
    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    issues,
    hallucinationScore,
    risk: hallucinationScore > 0.7 ? 'high' : hallucinationScore > 0.4 ? 'medium' : 'low',
    requiresReview: hallucinationScore > 0.5
  };
}

function extractNamedEntities(text) {
  // Simple NER - extract capitalized phrases
  const entities = [];
  const words = text.split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.charAt(0) === word.charAt(0).toUpperCase()) {
      let entity = word;
      // Look ahead for multi-word entities
      for (let j = i + 1; j < Math.min(i + 4, words.length); j++) {
        if (words[j].charAt(0) === words[j].charAt(0).toUpperCase() && !['.', ',', '!', '?', ';'].includes(words[j][0])) {
          entity += ' ' + words[j];
        } else {
          break;
        }
      }
      if (entity.split(/\s+/).length > 1) {
        entities.push(entity);
      }
    }
  }

  return [...new Set(entities)];
}

function checkConsistency(text) {
  const issues = [];

  // Check for contradictions in text
  const contradictions = [
    { a: /\bhowever\b/gi, b: /\btherefore\b/gi },
    { a: /\bbut\b/gi, b: /\bsimilarly\b/gi },
    { a: /\bnever\b/gi, b: /\bsometimes\b/gi }
  ];

  for (const { a, b } of contradictions) {
    const matchesA = text.match(a);
    const matchesB = text.match(b);
    if (matchesA && matchesB) {
      issues.push({
        type: 'internal_inconsistency',
        severity: 'high',
        message: 'Potentially contradictory statements detected'
      });
      break;
    }
  }

  return issues;
}

function findUngroundedClaims(text) {
  const issues = [];
  const claims = text.split(/[.!?]/);

  for (const claim of claims) {
    if (!claim.trim()) continue;

    // Check for claims about specific facts without evidence markers
    const hasEvidence = claim.match(/\b(because|study|research|according|shown|demonstrated)\b/i);
    const hasSpecificFact = claim.match(/\b\d+\s+(million|billion|years?|people|percent|%)/);

    if (hasSpecificFact && !hasEvidence) {
      issues.push({
        type: 'ungrounded_specific_fact',
        severity: 'medium',
        message: `Specific claim without evidence: "${claim.trim().substring(0, 50)}..."`
      });
    }
  }

  return issues;
}

function calculateHallucinationScore(issues, text) {
  if (issues.length === 0) return 0.1;

  let score = 0;
  const weights = { high: 0.3, medium: 0.15, low: 0.05 };

  for (const issue of issues) {
    score += weights[issue.severity] || 0.1;
  }

  // Normalize by text length
  const lengthFactor = Math.min(1, 500 / text.length);
  score = score * lengthFactor;

  return Math.min(1, score);
}

// POST /detect - Detect hallucinations
app.post('/detect', (req, res) => {
  const { text, context } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const result = detectHallucinations(text, context);

  res.json(result);
});

// POST /detect/batch - Batch detect
app.post('/detect/batch', (req, res) => {
  const { texts, context } = req.body;

  if (!texts || !Array.isArray(texts)) {
    return res.status(400).json({ error: 'Texts array is required' });
  }

  const results = texts.map(text => detectHallucinations(text, context));
  const avgScore = results.reduce((sum, r) => sum + r.hallucinationScore, 0) / results.length;

  res.json({
    results,
    summary: {
      avgScore,
      highRisk: results.filter(r => r.risk === 'high').length,
      mediumRisk: results.filter(r => r.risk === 'medium').length,
      lowRisk: results.filter(r => r.risk === 'low').length
    }
  });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hallucination-detector', port: PORT });
});

app.listen(PORT, () => {
  console.log(`Hallucination Detector running on port ${PORT}`);
});

// Export detection functions for testing
export {
  detectHallucinations,
  extractNamedEntities,
  checkConsistency,
  findUngroundedClaims,
  calculateHallucinationScore
};

export default app;
