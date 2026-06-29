import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4991;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory source store
const sources = new Map();

// Extract citations from text
function extractCitations(text) {
  const citations = [];
  const patterns = [
    /\[(\d+)\]/g,           // [1], [2]
    /\(([^)]+,\s*\d{4}\))/g, // (Author, 2023)
    /"([^"]+)"\s*\(/g,       // "Title" (
    /https?:\/\/[^\s]+/g       // URLs
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      citations.push({
        text: match[0],
        type: getCitationType(match[0]),
        confidence: 0.8,
        position: match.index
      });
    }
  }

  return citations;
}

function getCitationType(text) {
  if (text.startsWith('http')) return 'url';
  if (text.match(/\(\w+,\s*\d{4}\)/)) return 'academic';
  if (text.match(/^\[\d+\]$/)) return 'numeric';
  return 'general';
}

// Rank sources by reliability
function rankSources(citations) {
  return citations.map(c => ({
    ...c,
    reliability: calculateReliability(c)
  })).sort((a, b) => b.reliability - a.reliability);
}

function calculateReliability(citation) {
  let score = 0.5;

  // Boost academic sources
  if (citation.type === 'academic') score += 0.3;

  // Boost verified URLs
  if (sources.has(citation.text)) {
    const source = sources.get(citation.text);
    score = (score + source.reliability) / 2;
  }

  return Math.min(1, score);
}

// POST /extract - Extract citations
app.post('/extract', (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const citations = extractCitations(text);

  res.json({
    citations,
    count: citations.length
  });
});

// POST /track - Track a source
app.post('/track', (req, res) => {
  const { source, type, reliability, metadata } = req.body;

  if (!source) {
    return res.status(400).json({ error: 'Source is required' });
  }

  sources.set(source, {
    type: type || 'unknown',
    reliability: reliability || 0.5,
    metadata: metadata || {},
    trackedAt: new Date().toISOString()
  });

  res.json({ success: true, source });
});

// POST /verify - Verify citations against tracked sources
app.post('/verify', (req, res) => {
  const { citations } = req.body;

  if (!citations || !Array.isArray(citations)) {
    return res.status(400).json({ error: 'Citations array is required' });
  }

  const verified = citations.map(c => {
    const tracked = sources.get(c.text);
    return {
      ...c,
      verified: !!tracked,
      reliability: tracked?.reliability || 0,
      source: tracked || null
    };
  });

  res.json({ verified, count: verified.length });
});

// GET /sources - List tracked sources
app.get('/sources', (req, res) => {
  const { type, minReliability } = req.query;

  let result = Array.from(sources.entries()).map(([source, data]) => ({
    source,
    ...data
  }));

  if (type) {
    result = result.filter(s => s.type === type);
  }
  if (minReliability) {
    result = result.filter(s => s.reliability >= parseFloat(minReliability));
  }

  res.json({ sources: result, count: result.length });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'source-tracker', port: PORT, sources: sources.size });
});

app.listen(PORT, () => {
  console.log(`Source Tracker running on port ${PORT}`);
});

export default app;
