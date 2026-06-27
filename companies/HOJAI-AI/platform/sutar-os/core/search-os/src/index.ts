/**
 * Search OS - Enterprise Search
 * Full-text search with ranking and facets
 * Port: 4877
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4877;
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Types
interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  metadata: Record<string, string>;
  author?: string;
  createdAt: string;
  updatedAt: string;
  indexedAt: string;
}

interface SearchResult {
  document: Document;
  score: number;
  highlights: string[];
  matchedTerms: string[];
}

interface SearchFilters {
  type?: string;
  tags?: string[];
  author?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface Facets {
  types: { value: string; count: number }[];
  tags: { value: string; count: number }[];
  authors: { value: string; count: number }[];
}

// In-memory storage
const documents = new Map<string, Document>();
const invertedIndex = new Map<string, Set<string>>();

// BM25 parameters
const K1 = 1.5;
const B = 0.75;

// Tokenize text
function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'this', 'that', 'with', 'from']);

// Build inverted index
function buildIndex(doc: Document): void {
  const terms = tokenize(doc.content + ' ' + doc.title);
  for (const term of terms) {
    if (!invertedIndex.has(term)) {
      invertedIndex.set(term, new Set());
    }
    invertedIndex.get(term)!.add(doc.id);
  }
}

// Remove from index
function removeFromIndex(docId: string): void {
  for (const [term, docs] of invertedIndex) {
    docs.delete(docId);
    if (docs.size === 0) {
      invertedIndex.delete(term);
    }
  }
}

// Calculate BM25 score
function bm25Score(doc: Document, queryTerms: string[], avgDocLength: number): number {
  if (queryTerms.length === 0) return 0;

  let score = 0;
  const docTerms = tokenize(doc.content + ' ' + doc.title);
  const docLength = docTerms.length;

  const termFreq = new Map<string, number>();
  for (const term of docTerms) {
    termFreq.set(term, (termFreq.get(term) || 0) + 1);
  }

  for (const term of queryTerms) {
    const tf = termFreq.get(term) || 0;
    if (tf > 0) {
      const idf = Math.log((documents.size + 1) / (1 + (invertedIndex.get(term)?.size || 1)));
      const numerator = tf * (K1 + 1);
      const denominator = tf + K1 * (1 - B + B * (docLength / avgDocLength));
      score += idf * (numerator / denominator);
    }
  }

  return score;
}

// Extract highlights
function extractHighlights(content: string, queryTerms: string[], maxLength = 200): string[] {
  const highlights: string[] = [];
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (queryTerms.some(term => lowerSentence.includes(term))) {
      const trimmed = sentence.trim();
      if (trimmed.length <= maxLength) {
        highlights.push(trimmed);
      } else {
        // Find the first match position
        const matchPos = queryTerms.reduce((pos, term) => {
          const idx = lowerSentence.indexOf(term);
          return idx >= 0 && (pos < 0 || idx < pos) ? idx : pos;
        }, -1);
        if (matchPos >= 0) {
          const start = Math.max(0, matchPos - 50);
          const end = Math.min(sentence.length, matchPos + maxLength - 50);
          highlights.push('...' + sentence.slice(start, end) + '...');
        } else {
          highlights.push(trimmed.slice(0, maxLength) + '...');
        }
      }
    }
  }

  return highlights.slice(0, 3);
}

// Calculate facets
function calculateFacets(results: Document[]): Facets {
  const typeCount = new Map<string, number>();
  const tagCount = new Map<string, number>();
  const authorCount = new Map<string, number>();

  for (const doc of results) {
    typeCount.set(doc.type, (typeCount.get(doc.type) || 0) + 1);
    if (doc.author) authorCount.set(doc.author, (authorCount.get(doc.author) || 0) + 1);
    for (const tag of doc.tags) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
  }

  return {
    types: Array.from(typeCount.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
    tags: Array.from(tagCount.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
    authors: Array.from(authorCount.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
  };
}

// Validation schemas
const IndexSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.string(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string()).optional(),
  author: z.string().optional(),
});

const SearchSchema = z.object({
  q: z.string().min(1),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'search-os',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    documents: documents.size,
    indexTerms: invertedIndex.size,
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Index document
app.post('/api/search/index', (req: Request, res: Response) => {
  try {
    const data = IndexSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date().toISOString();

    const doc: Document = {
      id,
      title: data.title,
      content: data.content,
      type: data.type,
      tags: data.tags || [],
      metadata: data.metadata || {},
      author: data.author,
      createdAt: now,
      updatedAt: now,
      indexedAt: now,
    };

    documents.set(id, doc);
    buildIndex(doc);

    res.status(201).json({ id, indexed: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Search
app.get('/api/search', (req: Request, res: Response) => {
  try {
    const { q, type, tags, author, dateFrom, dateTo, limit = 20, offset = 0 } = req.query as any;

    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

    const queryTerms = tokenize(q);
    if (queryTerms.length === 0) return res.json({ query: q, total: 0, results: [], facets: { types: [], tags: [], authors: [] } });

    // Calculate average document length
    let totalLength = 0;
    for (const doc of documents.values()) {
      totalLength += tokenize(doc.content + ' ' + doc.title).length;
    }
    const avgDocLength = documents.size > 0 ? totalLength / documents.size : 100;

    // Score all documents
    const scored: SearchResult[] = [];
    for (const doc of documents.values()) {
      // Apply filters
      if (type && doc.type !== type) continue;
      if (author && doc.author !== author) continue;
      if (tags && !tags.some((t: string) => doc.tags.includes(t))) continue;
      if (dateFrom && doc.createdAt < dateFrom) continue;
      if (dateTo && doc.createdAt > dateTo) continue;

      const score = bm25Score(doc, queryTerms, avgDocLength);
      if (score > 0) {
        scored.push({
          document: doc,
          score: Math.round(score * 100) / 100,
          highlights: extractHighlights(doc.content, queryTerms),
          matchedTerms: queryTerms.filter(t => tokenize(doc.content + ' ' + doc.title).includes(t)),
        });
      }
    }

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    const total = scored.length;
    const results = scored.slice(offset, offset + limit);
    const facets = calculateFacets(scored.map(s => s.document));

    res.json({
      query: q,
      total,
      limit: Number(limit),
      offset: Number(offset),
      results,
      facets,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search POST (for complex queries)
app.post('/api/search', (req: Request, res: Response) => {
  try {
    const data = SearchSchema.parse(req.body);
    const { q, type, tags, author, dateFrom, dateTo, limit, offset } = data;

    const queryTerms = tokenize(q);
    if (queryTerms.length === 0) return res.json({ query: q, total: 0, results: [], facets: { types: [], tags: [], authors: [] } });

    let totalLength = 0;
    for (const doc of documents.values()) {
      totalLength += tokenize(doc.content + ' ' + doc.title).length;
    }
    const avgDocLength = documents.size > 0 ? totalLength / documents.size : 100;

    const scored: SearchResult[] = [];
    for (const doc of documents.values()) {
      if (type && doc.type !== type) continue;
      if (author && doc.author !== author) continue;
      if (tags && !tags.some(t => doc.tags.includes(t))) continue;
      if (dateFrom && doc.createdAt < dateFrom) continue;
      if (dateTo && doc.createdAt > dateTo) continue;

      const score = bm25Score(doc, queryTerms, avgDocLength);
      if (score > 0) {
        scored.push({
          document: doc,
          score: Math.round(score * 100) / 100,
          highlights: extractHighlights(doc.content, queryTerms),
          matchedTerms: queryTerms.filter(t => tokenize(doc.content + ' ' + doc.title).includes(t)),
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const total = scored.length;
    const results = scored.slice(offset, offset + limit);
    const facets = calculateFacets(scored.map(s => s.document));

    res.json({ query: q, total, limit, offset, results, facets });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Autocomplete / suggestions
app.get('/api/search/suggest', (req: Request, res: Response) => {
  const { q, limit = 10 } = req.query as any;

  if (!q) return res.json({ suggestions: [] });

  const queryTerms = tokenize(q);
  if (queryTerms.length === 0) return res.json({ suggestions: [] });

  const lastTerm = queryTerms[queryTerms.length - 1];
  if (lastTerm.length < 2) return res.json({ suggestions: [] });

  const suggestions = new Set<string>();
  for (const term of invertedIndex.keys()) {
    if (term.startsWith(lastTerm) && term !== lastTerm) {
      suggestions.add(term);
      if (suggestions.size >= Number(limit)) break;
    }
  }

  // Also suggest from titles
  for (const doc of documents.values()) {
    const titleTerms = tokenize(doc.title);
    for (const term of titleTerms) {
      if (term.startsWith(lastTerm) && term !== lastTerm && !suggestions.has(term)) {
        suggestions.add(term);
        if (suggestions.size >= Number(limit)) break;
      }
    }
    if (suggestions.size >= Number(limit)) break;
  }

  res.json({ suggestions: Array.from(suggestions).slice(0, Number(limit)) });
});

// Get document by ID
app.get('/api/search/index/:id', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// Update document
app.put('/api/search/index/:id', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  try {
    const data = IndexSchema.partial().parse(req.body);
    removeFromIndex(doc.id);

    if (data.title) doc.title = data.title;
    if (data.content) doc.content = data.content;
    if (data.type) doc.type = data.type;
    if (data.tags) doc.tags = data.tags;
    if (data.metadata) doc.metadata = { ...doc.metadata, ...data.metadata };
    if (data.author) doc.author = data.author;
    doc.updatedAt = new Date().toISOString();
    doc.indexedAt = doc.updatedAt;

    buildIndex(doc);
    res.json(doc);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Delete document
app.delete('/api/search/index/:id', (req: Request, res: Response) => {
  if (!documents.has(req.params.id)) return res.status(404).json({ error: 'Document not found' });
  removeFromIndex(req.params.id);
  documents.delete(req.params.id);
  res.json({ success: true });
});

// Index status
app.get('/api/search/status', (_req: Request, res: Response) => {
  res.json({
    documents: documents.size,
    indexTerms: invertedIndex.size,
    avgDocLength: documents.size > 0
      ? Math.round(Array.from(documents.values()).reduce((sum, d) => sum + tokenize(d.content + ' ' + d.title).length, 0) / documents.size)
      : 0,
    lastIndexed: Array.from(documents.values()).sort((a, b) => b.indexedAt.localeCompare(a.indexedAt))[0]?.indexedAt,
  });
});

// Bulk index
app.post('/api/search/index/bulk', (req: Request, res: Response) => {
  const schema = z.object({
    documents: z.array(IndexSchema),
  });

  try {
    const { documents: docs } = schema.parse(req.body);
    const ids: string[] = [];

    for (const data of docs) {
      const id = uuidv4();
      const now = new Date().toISOString();
      const doc: Document = {
        id,
        title: data.title,
        content: data.content,
        type: data.type,
        tags: data.tags || [],
        metadata: data.metadata || {},
        author: data.author,
        createdAt: now,
        updatedAt: now,
        indexedAt: now,
      };
      documents.set(id, doc);
      buildIndex(doc);
      ids.push(id);
    }

    res.status(201).json({ success: true, indexed: ids.length, ids });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  console.error('[search-os] error:', err);
  res.status(500).json({ error: 'Internal error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[search-os] listening on :${PORT}`);
  console.log(`[search-os] features: BM25 search, highlighting, facets, autocomplete`);
});

export default app;
