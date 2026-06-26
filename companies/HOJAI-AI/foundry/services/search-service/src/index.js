/**
 * HOJAI Studio - Search Service
 * Full-text search with typo tolerance
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4772;
app.use(express.json());

const indices = new Map(); // indexName -> documents
const searchLogs = [];

// REST API - Create Index
app.post('/api/indices', (req, res) => {
  const { name, fields = ['title', 'content'], options = {} } = req.body;
  indices.set(name, { name, fields, documents: [], options, createdAt: new Date().toISOString() });
  res.json({ name, documents: 0 });
});

// REST API - Index Document
app.post('/api/indices/:name/documents', (req, res) => {
  const index = indices.get(req.params.name);
  if (!index) return res.status(404).json({ error: 'Index not found' });

  const doc = { id: req.body.id || uuidv4(), ...req.body, indexedAt: new Date().toISOString() };
  const existing = index.documents.findIndex(d => d.id === doc.id);
  if (existing >= 0) {
    index.documents[existing] = doc;
  } else {
    index.documents.push(doc);
  }
  res.json(doc);
});

// REST API - Bulk Index
app.post('/api/indices/:name/bulk', (req, res) => {
  const index = indices.get(req.params.name);
  if (!index) return res.status(404).json({ error: 'Index not found' });

  const { documents } = req.body;
  documents.forEach(doc => {
    doc.indexedAt = new Date().toISOString();
    const existing = index.documents.findIndex(d => d.id === doc.id);
    if (existing >= 0) index.documents[existing] = doc;
    else index.documents.push(doc);
  });

  res.json({ indexed: documents.length, total: index.documents.length });
});

// REST API - Search
app.get('/api/indices/:name/search', (req, res) => {
  const { q, limit = 10, fuzzy = true } = req.query;
  const index = indices.get(req.params.name);
  if (!index) return res.status(404).json({ error: 'Index not found' });

  const query = q.toLowerCase();
  const results = index.documents
    .map(doc => ({ doc, score: calculateScore(doc, query, index.fields, fuzzy === 'true') }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, parseInt(limit))
    .map(r => r.doc);

  searchLogs.push({ index: index.name, query: q, results: results.length, timestamp: new Date().toISOString() });

  res.json({ query: q, total: results.length, results });
});

// REST API - Autocomplete
app.get('/api/indices/:name/suggest', (req, res) => {
  const { q, limit = 5 } = req.query;
  const index = indices.get(req.params.name);
  if (!index) return res.status(404).json({ error: 'Index not found' });

  const suggestions = index.documents
    .filter(doc => index.fields.some(f => (doc[f] || '').toLowerCase().startsWith(q.toLowerCase())))
    .slice(0, parseInt(limit))
    .map(doc => ({ id: doc.id, text: doc.title || doc.name || doc.id }));

  res.json({ query: q, suggestions });
});

// REST API - Delete
app.delete('/api/indices/:name/documents/:id', (req, res) => {
  const index = indices.get(req.params.name);
  if (!index) return res.status(404).json({ error: 'Index not found' });
  index.documents = index.documents.filter(d => d.id !== req.params.id);
  res.json({ deleted: true, remaining: index.documents.length });
});

// REST API - Analytics
app.get('/api/indices/:name/stats', (req, res) => {
  const index = indices.get(req.params.name);
  if (!index) return res.status(404).json({ error: 'Index not found' });

  const logs = searchLogs.filter(l => l.index === index.name);
  res.json({
    name: index.name,
    documents: index.documents.length,
    searches: logs.length,
    avgResults: logs.length > 0 ? (logs.reduce((s, l) => s + l.results, 0) / logs.length).toFixed(1) : 0
  });
});

function calculateScore(doc, query, fields, fuzzy) {
  let score = 0;
  const queryWords = query.split(/\s+/);

  for (const field of fields) {
    const value = (doc[field] || '').toLowerCase();
    if (value.includes(query)) score += 10; // Exact match
    queryWords.forEach(word => {
      if (value.includes(word)) score += 5; // Word match
      if (fuzzy && levenshtein(word, value) <= 2) score += 2; // Fuzzy match
    });
  }
  return score;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'search-service', indices: indices.size }));
app.listen(PORT, () => console.log(`Search Service running on port ${PORT}`));
