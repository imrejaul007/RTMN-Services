import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4992;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Evidence store
const evidence = [];

// Retrieve relevant evidence for a claim
function retrieveEvidence(claim, options = {}) {
  const { limit = 10, minRelevance = 0.3 } = options;

  // Simple keyword-based retrieval
  const claimWords = claim.toLowerCase().split(/\s+/);

  const scored = evidence.map(e => {
    const evidenceWords = e.content.toLowerCase().split(/\s+/);
    const overlap = claimWords.filter(w => evidenceWords.includes(w)).length;
    const relevance = overlap / Math.max(claimWords.length, 1);

    return { ...e, relevance };
  });

  return scored
    .filter(e => e.relevance >= minRelevance)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

// Rank evidence by quality
function rankEvidence(evidences) {
  return evidences.map(e => ({
    ...e,
    quality: calculateQuality(e),
    supporting: e.supporting !== false
  })).sort((a, b) => b.quality - a.quality);
}

function calculateQuality(evidence) {
  let score = 0.5;

  // Boost by source type
  if (evidence.sourceType === 'academic') score += 0.2;
  if (evidence.sourceType === 'government') score += 0.15;
  if (evidence.sourceType === 'verified') score += 0.1;

  // Boost by recency
  if (evidence.date) {
    const age = Date.now() - new Date(evidence.date).getTime();
    const years = age / (365 * 24 * 60 * 60 * 1000);
    if (years < 1) score += 0.1;
    else if (years < 5) score += 0.05;
  }

  // Boost by citation count
  if (evidence.citations > 10) score += 0.1;
  else if (evidence.citations > 5) score += 0.05;

  return Math.min(1, score);
}

// POST /collect - Add evidence
app.post('/collect', (req, res) => {
  const { content, source, sourceType, date, citations, supporting } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const item = {
    id: `evidence-${Date.now()}`,
    content,
    source: source || 'unknown',
    sourceType: sourceType || 'general',
    date: date || new Date().toISOString(),
    citations: citations || 0,
    supporting: supporting !== false,
    addedAt: new Date().toISOString()
  };

  evidence.push(item);

  res.json({ success: true, evidence: item });
});

// POST /retrieve - Retrieve evidence for claim
app.post('/retrieve', (req, res) => {
  const { claim, limit, minRelevance } = req.body;

  if (!claim) {
    return res.status(400).json({ error: 'Claim is required' });
  }

  const retrieved = retrieveEvidence(claim, { limit, minRelevance });
  const ranked = rankEvidence(retrieved);

  res.json({
    claim,
    evidence: ranked,
    count: ranked.length
  });
});

// GET /evidence - List all evidence
app.get('/evidence', (req, res) => {
  const { sourceType, supporting, limit } = req.query;

  let result = [...evidence];

  if (sourceType) {
    result = result.filter(e => e.sourceType === sourceType);
  }
  if (supporting !== undefined) {
    result = result.filter(e => e.supporting === (supporting === 'true'));
  }
  if (limit) {
    result = result.slice(0, parseInt(limit));
  }

  res.json({ evidence: result, count: result.length });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'evidence-collector', port: PORT, evidence: evidence.length });
});

app.listen(PORT, () => {
  console.log(`Evidence Collector running on port ${PORT}`);
});

export default app;
