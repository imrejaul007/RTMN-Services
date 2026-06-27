/**
 * Genie Research Agent — port 4719.
 *
 * Vision role: research (per HOJAI vision).
 * Capabilities: web-search, pdf-parsing, citation-tracking, cross-source-synthesis.
 *
 * Endpoints:
 *   GET  /health, /ready, /info
 *   POST /api/v1/research/search          — search the web + knowledge base
 *   POST /api/v1/research/synthesize      — synthesize N sources into a report
 *   POST /api/v1/research/extract         — extract entities/facts from text
 *   POST /api/v1/research/citations/format — format citations (APA, MLA, Chicago)
 *
 * In production, /search calls Brave Search API or Google CSE; /synthesize
 * uses HOJAI inference-gateway (companies/HOJAI-AI/platform/intelligence/inference-gateway).
 * For MVP, /search returns mocked results and /synthesize does template-based
 * synthesis — enough to satisfy the registry contract and prove the shape.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.env.RESEARCH_PORT || '4719');
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUIRE_AUTH = process.env.RESEARCH_REQUIRE_AUTH !== 'false';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

function apiResponse(success, data, error) {
  return { success, data, error, timestamp: new Date().toISOString() };
}

function apiKeyAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const auth = req.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json(apiResponse(false, undefined, 'Auth required'));
  if (HOJAI_API_KEY && token !== HOJAI_API_KEY) return res.status(401).json(apiResponse(false, undefined, 'Invalid key'));
  next();
}

// ─── In-memory state ───────────────────────────────────────────────────
const researchJobs = new Map();

// ─── Endpoints ─────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'genie-research', version: '1.0.0', port: PORT });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, jobs: researchJobs.size, port: PORT });
});

app.get('/info', (_req, res) => {
  res.json(apiResponse(true, {
    name: 'Genie Research',
    visionRole: 'research',
    version: '1.0.0',
    capabilities: ['web-search', 'pdf-parsing', 'citation-tracking', 'cross-source-synthesis']
  }));
});

app.post('/api/v1/research/search', apiKeyAuth, (req, res) => {
  const { query, limit = 5, sources = ['web', 'kb'] } = req.body || {};
  if (!query) return res.status(400).json(apiResponse(false, undefined, 'query is required'));

  // MVP: deterministic mock results. Production: Brave Search / Google CSE / KB lookup.
  const results = mockSearch(query, limit, sources);
  res.json(apiResponse(true, {
    query,
    sources: sources,
    total: results.length,
    results
  }));
});

app.post('/api/v1/research/synthesize', apiKeyAuth, (req, res) => {
  const { query, sources = [], maxWords = 500 } = req.body || {};
  if (!query) return res.status(400).json(apiResponse(false, undefined, 'query is required'));
  if (!Array.isArray(sources) || sources.length === 0) {
    return res.status(400).json(apiResponse(false, undefined, 'sources array is required'));
  }

  // MVP: extract key claims from each source, dedupe, produce summary.
  const claims = sources.map(extractKeyClaim);
  const uniqueClaims = dedupeClaims(claims);
  const summary = synthesizeText(query, uniqueClaims, maxWords);
  const citations = sources.map((s, i) => `[${i + 1}] ${s.title || s.url || `Source ${i + 1}`}`);

  res.json(apiResponse(true, {
    query,
    summary,
    wordCount: summary.split(/\s+/).length,
    claimCount: uniqueClaims.length,
    citations,
    sources: sources.map((s, i) => ({ ...s, citationId: i + 1 }))
  }));
});

app.post('/api/v1/research/extract', apiKeyAuth, (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json(apiResponse(false, undefined, 'text is required'));

  // MVP: extract capitalized entities, dates, and dollar amounts.
  const entities = [
    ...(text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || []).map((name) => ({ type: 'person_or_org', value: name })),
    ...(text.match(/\b\d{4}\b/g) || []).filter((y) => parseInt(y) > 1900 && parseInt(y) < 2100).map((year) => ({ type: 'year', value: year })),
    ...(text.match(/\$\d+(?:,\d{3})*(?:\.\d{2})?/g) || []).map((amount) => ({ type: 'money', value: amount }))
  ];

  res.json(apiResponse(true, {
    textLength: text.length,
    entities,
    entityCount: entities.length
  }));
});

app.post('/api/v1/research/citations/format', apiKeyAuth, (req, res) => {
  const { sources = [], style = 'apa' } = req.body || {};
  if (!Array.isArray(sources)) return res.status(400).json(apiResponse(false, undefined, 'sources array is required'));

  const formatted = sources.map((s, i) => formatCitation(s, style, i + 1));
  res.json(apiResponse(true, {
    style,
    count: formatted.length,
    citations: formatted,
    bibliography: formatted.join('\n')
  }));
});

// ─── Helpers (MVP — production uses real APIs) ─────────────────────────

function mockSearch(query, limit, sources) {
  // Deterministic mock — returns N results shaped like real web results.
  const out = [];
  for (let i = 0; i < Math.min(limit, 10); i++) {
    out.push({
      id: `mock_${i}`,
      title: `${query} — Source ${i + 1}`,
      url: `https://example.com/article-${i + 1}-${query.toLowerCase().replace(/\s+/g, '-')}`,
      snippet: `A relevant result about "${query}". This is mocked content for MVP testing — production would call Brave Search API or Google Custom Search.`,
      source: sources[i % sources.length] || 'web',
      relevance: 0.95 - i * 0.05,
      publishedAt: '2025-01-15',
      author: 'Mock Author'
    });
  }
  return out;
}

function extractKeyClaim(source) {
  // MVP: take first sentence as the key claim. Production: use LLM to extract.
  const text = source.snippet || source.text || source.content || '';
  const firstSentence = text.split(/[.!?]/)[0];
  return { text: firstSentence.trim(), source: source.title || source.url };
}

function dedupeClaims(claims) {
  // Normalize: lowercase, strip punctuation, collapse whitespace, take first 6 words
  // Short window catches near-duplicates that share a sentence subject.
  const seen = new Set();
  const out = [];
  for (const c of claims) {
    const normalized = c.text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 6)
      .join(' ');
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(c);
  }
  return out;
}

function synthesizeText(query, claims, maxWords) {
  if (claims.length === 0) return `No information found about: ${query}`;
  const intro = `Regarding ${query}, the available evidence indicates the following:`;
  const bullets = claims.slice(0, 5).map((c, i) => `  ${i + 1}. ${c.text}.`);
  let text = [intro, ...bullets].join('\n');
  const words = text.split(/\s+/);
  if (words.length > maxWords) {
    text = words.slice(0, maxWords).join(' ') + '...';
  }
  return text;
}

function formatCitation(source, style, idx) {
  const author = source.author || 'Unknown';
  const year = source.publishedAt ? new Date(source.publishedAt).getFullYear() : 'n.d.';
  const title = source.title || 'Untitled';
  const url = source.url || '';

  switch (style) {
    case 'mla':
      return `(${idx}) ${author}. "${title}." ${year}. ${url}`;
    case 'chicago':
      return `(${idx}) ${author}. "${title}." ${year}. ${url}.`;
    case 'apa':
    default:
      return `(${idx}) ${author} (${year}). ${title}. ${url}`;
  }
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[genie-research] listening on :${PORT}`);
    console.log(`[genie-research] vision role: research`);
    console.log(`[genie-research] auth: ${REQUIRE_AUTH ? 'required' : 'disabled'}`);
  });
}

module.exports = { app, mockSearch, extractKeyClaim, dedupeClaims, synthesizeText, formatCitation };