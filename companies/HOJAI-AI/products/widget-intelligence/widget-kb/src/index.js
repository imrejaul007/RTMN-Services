/**
 * HOJAI SiteOS - Widget Knowledge Base Service
 * Knowledge Base Widget: RAG-powered FAQ and document search (Port 5407)
 *
 * Features:
 * - Knowledge base with RAG (Retrieval Augmented Generation)
 * - PDF upload -> extract text -> chunk -> embed -> store
 * - Website URL crawl -> extract content
 * - FAQ import (CSV, JSON)
 * - POST /api/kb/upload, POST /api/kb/crawl, POST /api/kb/query
 * - GET /api/kb/status
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import pino from 'pino';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Logger setup
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Express app setup
const app = express();

// In-memory stores
const documentsStore = new Map();
const chunksStore = new Map();
const faqsStore = new Map();
const queriesStore = new Map();

// Configuration
const CHUNK_SIZE = 500; // Characters per chunk
const CHUNK_OVERLAP = 50; // Overlap between chunks
const EMBEDDING_DIM = 384; // Simplified embedding dimension

// ─────────────────────────────────────────────────────────────────────────────
// Document Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a document entry
 */
export function createDocument(docData) {
  const document = {
    id: uuidv4(),
    name: docData.name,
    type: docData.type, // 'pdf', 'url', 'faq', 'text'
    source: docData.source,
    content: docData.content,
    url: docData.url,
    metadata: docData.metadata || {},
    chunks: [],
    chunkCount: 0,
    status: 'processing', // processing, indexed, failed
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  documentsStore.set(document.id, document);
  logger.info({ event: 'document_created', documentId: document.id, type: docData.type });

  return document;
}

/**
 * Get document by ID
 */
export function getDocument(docId) {
  return documentsStore.get(docId);
}

/**
 * Update document
 */
export function updateDocument(docId, updates) {
  const doc = documentsStore.get(docId);
  if (!doc) return null;

  Object.assign(doc, updates, { updatedAt: Date.now() });
  return doc;
}

/**
 * Get all documents
 */
export function getAllDocuments(options = {}) {
  const { type, status, limit = 100, offset = 0 } = options;

  let docs = Array.from(documentsStore.values());

  if (type) {
    docs = docs.filter(d => d.type === type);
  }
  if (status) {
    docs = docs.filter(d => d.status === status);
  }

  docs.sort((a, b) => b.createdAt - a.createdAt);

  return {
    total: docs.length,
    documents: docs.slice(offset, offset + limit),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clean and normalize text
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, '\n')
    .trim();
}

/**
 * Split text into chunks with overlap
 */
export function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const cleaned = cleanText(text);
  const chunks = [];

  if (cleaned.length <= chunkSize) {
    return [{ text: cleaned, index: 0 }];
  }

  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    let end = start + chunkSize;

    // Try to break at a sentence or paragraph boundary
    if (end < cleaned.length) {
      const periodIdx = cleaned.lastIndexOf('.', end);
      const newlineIdx = cleaned.lastIndexOf('\n', end);
      const breakIdx = Math.max(periodIdx, newlineIdx);

      if (breakIdx > start + chunkSize * 0.5) {
        end = breakIdx + 1;
      }
    }

    chunks.push({
      text: cleaned.slice(start, end),
      index,
      start,
      end,
    });

    start = end - overlap;
    index++;
  }

  return chunks;
}

/**
 * Generate a simple embedding (simulated)
 * In production, use OpenAI embeddings or similar
 */
export function generateEmbedding(text) {
  // Simplified embedding - uses hash-based approach
  // In production, use proper embedding models
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(EMBEDDING_DIM).fill(0);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const idx = (word.charCodeAt(j) * (i + 1) + j) % EMBEDDING_DIM;
      embedding[idx] += 1;
    }
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

/**
 * Process and index a document
 */
export function processDocument(docId) {
  const doc = documentsStore.get(docId);
  if (!doc) return null;

  try {
    const chunks = chunkText(doc.content);
    const chunkIds = [];

    for (const chunk of chunks) {
      const chunkId = uuidv4();
      const embedding = generateEmbedding(chunk.text);

      const chunkData = {
        id: chunkId,
        documentId: docId,
        text: chunk.text,
        index: chunk.index,
        start: chunk.start,
        end: chunk.end,
        embedding,
        metadata: {
          ...doc.metadata,
          source: doc.source,
        },
        createdAt: Date.now(),
      };

      chunksStore.set(chunkId, chunkData);
      chunkIds.push(chunkId);
    }

    doc.chunks = chunkIds;
    doc.chunkCount = chunkIds.length;
    doc.status = 'indexed';

    logger.info({ event: 'document_indexed', documentId: docId, chunkCount: chunkIds.length });

    return doc;
  } catch (err) {
    doc.status = 'failed';
    logger.error({ event: 'document_processing_failed', documentId: docId, error: err.message });
    return doc;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create FAQ entry
 */
export function createFAQ(faqData) {
  const faq = {
    id: uuidv4(),
    question: faqData.question,
    answer: faqData.answer,
    category: faqData.category || 'general',
    tags: faqData.tags || [],
    embedding: generateEmbedding(`${faqData.question} ${faqData.answer}`),
    views: 0,
    helpful: 0,
    notHelpful: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  faqsStore.set(faq.id, faq);
  logger.info({ event: 'faq_created', faqId: faq.id });

  return faq;
}

/**
 * Get FAQ by ID
 */
export function getFAQ(faqId) {
  return faqsStore.get(faqId);
}

/**
 * Update FAQ
 */
export function updateFAQ(faqId, updates) {
  const faq = faqsStore.get(faqId);
  if (!faq) return null;

  Object.assign(faq, updates, { updatedAt: Date.now() });
  return faq;
}

/**
 * Import FAQs from JSON
 */
export function importFAQsFromJSON(faqs) {
  const imported = [];

  for (const faqData of faqs) {
    if (faqData.question && faqData.answer) {
      const faq = createFAQ(faqData);
      imported.push(faq);
    }
  }

  logger.info({ event: 'faqs_imported', count: imported.length });
  return imported;
}

/**
 * Import FAQs from CSV (simple parser)
 */
export function importFAQsFromCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const imported = [];

  // Skip header if present
  const startIdx = lines[0]?.toLowerCase().includes('question') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const faq = createFAQ({
        question: parts[0],
        answer: parts[1],
        category: parts[2] || 'general',
        tags: parts[3] ? parts[3].split(';').map(t => t.trim()) : [],
      });
      imported.push(faq);
    }
  }

  logger.info({ event: 'faqs_imported_from_csv', count: imported.length });
  return imported;
}

/**
 * Get all FAQs
 */
export function getAllFAQs(options = {}) {
  const { category, limit = 100, offset = 0 } = options;

  let faqs = Array.from(faqsStore.values());

  if (category) {
    faqs = faqs.filter(f => f.category === category);
  }

  faqs.sort((a, b) => b.createdAt - a.createdAt);

  return {
    total: faqs.length,
    faqs: faqs.slice(offset, offset + limit),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// URL Crawling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract text content from HTML
 */
function extractTextFromHTML(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside').remove();
  return cleanText($('body').text());
}

/**
 * Crawl a URL and extract content
 */
export async function crawlURL(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HOJAI-KB-Crawler/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const text = extractTextFromHTML(html);

    // Extract title
    const $ = cheerio.load(html);
    const title = $('title').text().trim();

    return {
      url,
      title,
      content: text,
      status: 'success',
    };
  } catch (err) {
    logger.error({ event: 'url_crawl_failed', url, error: err.message });
    return {
      url,
      error: err.message,
      status: 'failed',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Search / Query
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search chunks for relevant content
 */
export function searchChunks(query, options = {}) {
  const { limit = 5, minScore = 0.1, documentId } = options;

  const queryEmbedding = generateEmbedding(query);
  const results = [];

  for (const chunk of chunksStore.values()) {
    if (documentId && chunk.documentId !== documentId) continue;

    const score = cosineSimilarity(queryEmbedding, chunk.embedding);

    if (score >= minScore) {
      const doc = documentsStore.get(chunk.documentId);
      results.push({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        documentName: doc?.name,
        text: chunk.text,
        score,
        metadata: chunk.metadata,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Search FAQs for relevant content
 */
export function searchFAQs(query, options = {}) {
  const { limit = 5, minScore = 0.1, category } = options;

  const queryEmbedding = generateEmbedding(query);
  const results = [];

  for (const faq of faqsStore.values()) {
    if (category && faq.category !== category) continue;

    const score = cosineSimilarity(queryEmbedding, faq.embedding);

    if (score >= minScore) {
      results.push({
        faqId: fa.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        tags: faq.tags,
        score,
        views: faq.views,
      });
    }

    // Increment view count
    faq.views++;
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Query the knowledge base
 */
export function queryKnowledgeBase(queryText, options = {}) {
  const { limit = 10, includeChunks = true, includeFAQs = true } = options;

  const queryLog = {
    id: uuidv4(),
    query: queryText,
    startedAt: Date.now(),
    results: { chunks: [], faqs: [] },
    completedAt: null,
  };

  queriesStore.set(queryLog.id, queryLog);

  if (includeChunks) {
    queryLog.results.chunks = searchChunks(queryText, { limit });
  }

  if (includeFAQs) {
    queryLog.results.faqs = searchFAQs(queryText, { limit });
  }

  queryLog.completedAt = Date.now();

  return {
    query: queryText,
    queryId: queryLog.id,
    results: queryLog.results,
    totalResults: queryLog.results.chunks.length + queryLog.results.faqs.length,
  };
}

/**
 * Mark FAQ as helpful or not
 */
export function rateFAQ(faqId, helpful) {
  const faq = faqsStore.get(faqId);
  if (!faq) return null;

  if (helpful) {
    faq.helpful++;
  } else {
    faq.notHelpful++;
  }

  return faq;
}

// ────────────────────────────────────────────────────────���────────────────────
// Express Routes
// ─────────────────────────────────────────────────────────────────────────────

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing (larger limit for file uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'widget-kb',
    version: '1.0.0',
    port: process.env.PORT || 5407,
    timestamp: new Date().toISOString(),
    stats: {
      documents: documentsStore.size,
      chunks: chunksStore.size,
      faqs: faqsStore.size,
      queries: queriesStore.size,
    },
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// Document Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload and process a document
 * POST /api/kb/upload
 */
app.post('/api/kb/upload', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      type: z.enum(['pdf', 'text', 'faq', 'url']),
      content: z.string().min(1).optional(),
      url: z.string().url().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const data = schema.parse(req.body);

    // For URL type, fetch content
    if (data.type === 'url') {
      const crawlResult = await crawlURL(data.url);
      if (crawlResult.status === 'failed') {
        return res.status(400).json({ error: 'Failed to crawl URL', details: crawlResult.error });
      }
      data.content = crawlResult.content;
      data.name = data.name || crawlResult.title;
      data.metadata = { ...data.metadata, url: data.url, title: crawlResult.title };
    }

    const document = createDocument(data);

    // Process in background
    setImmediate(() => processDocument(document.id));

    res.status(201).json({
      success: true,
      document,
      message: 'Document uploaded and processing. Use GET /api/kb/document/:id to check status.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Crawl URL and index
 * POST /api/kb/crawl
 */
app.post('/api/kb/crawl', async (req, res) => {
  try {
    const schema = z.object({
      url: z.string().url(),
      name: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const { url, name, metadata } = schema.parse(req.body);

    const crawlResult = await crawlURL(url);
    if (crawlResult.status === 'failed') {
      return res.status(400).json({ error: 'Failed to crawl URL', details: crawlResult.error });
    }

    const document = createDocument({
      name: name || crawlResult.title,
      type: 'url',
      source: url,
      content: crawlResult.content,
      url,
      metadata: { ...metadata, title: crawlResult.title },
    });

    setImmediate(() => processDocument(document.id));

    res.status(201).json({
      success: true,
      document,
      message: 'URL crawled and processing.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get document
 * GET /api/kb/document/:docId
 */
app.get('/api/kb/document/:docId', (req, res) => {
  const doc = getDocument(req.params.docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Get chunks if indexed
  let chunks = [];
  if (doc.status === 'indexed') {
    chunks = doc.chunks.map(chunkId => chunksStore.get(chunkId)).filter(Boolean);
  }

  res.json({ success: true, document: doc, chunks });
});

/**
 * List documents
 * GET /api/kb/documents
 */
app.get('/api/kb/documents', (req, res) => {
  const { type, status, limit = 100, offset = 0 } = req.query;
  const result = getAllDocuments({ type, status, limit: parseInt(limit), offset: parseInt(offset) });
  res.json({ success: true, ...result });
});

/**
 * Delete document
 * DELETE /api/kb/document/:docId
 */
app.delete('/api/kb/document/:docId', (req, res) => {
  const doc = documentsStore.get(req.params.docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Remove associated chunks
  for (const chunkId of doc.chunks) {
    chunksStore.delete(chunkId);
  }

  documentsStore.delete(req.params.docId);
  logger.info({ event: 'document_deleted', documentId: req.params.docId });

  res.json({ success: true, message: 'Document deleted' });
});

// ─────────────────────────────────────────────────────────────────────────────
// FAQ Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create FAQ
 * POST /api/kb/faq
 */
app.post('/api/kb/faq', (req, res) => {
  try {
    const schema = z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
    });

    const faq = createFAQ(schema.parse(req.body));
    res.status(201).json({ success: true, faq });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Import FAQs from JSON
 * POST /api/kb/faqs/import/json
 */
app.post('/api/kb/faqs/import/json', (req, res) => {
  try {
    const schema = z.object({
      faqs: z.array(z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })),
    });

    const { faqs } = schema.parse(req.body);
    const imported = importFAQsFromJSON(faqs);

    res.status(201).json({
      success: true,
      count: imported.length,
      faqs: imported,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Import FAQs from CSV
 * POST /api/kb/faqs/import/csv
 */
app.post('/api/kb/faqs/import/csv', (req, res) => {
  try {
    const schema = z.object({
      csv: z.string().min(1),
    });

    const { csv } = schema.parse(req.body);
    const imported = importFAQsFromCSV(csv);

    res.status(201).json({
      success: true,
      count: imported.length,
      faqs: imported,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all FAQs
 * GET /api/kb/faqs
 */
app.get('/api/kb/faqs', (req, res) => {
  const { category, limit = 100, offset = 0 } = req.query;
  const result = getAllFAQs({ category, limit: parseInt(limit), offset: parseInt(offset) });
  res.json({ success: true, ...result });
});

/**
 * Get FAQ
 * GET /api/kb/faq/:faqId
 */
app.get('/api/kb/faq/:faqId', (req, res) => {
  const faq = getFAQ(req.params.faqId);
  if (!faq) {
    return res.status(404).json({ error: 'FAQ not found' });
  }
  res.json({ success: true, faq });
});

/**
 * Update FAQ
 * PATCH /api/kb/faq/:faqId
 */
app.patch('/api/kb/faq/:faqId', (req, res) => {
  try {
    const schema = z.object({
      question: z.string().min(1).optional(),
      answer: z.string().min(1).optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
    });

    const faq = updateFAQ(req.params.faqId, schema.parse(req.body));
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    // Regenerate embedding if content changed
    if (req.body.question || req.body.answer) {
      faq.embedding = generateEmbedding(`${faq.question} ${faq.answer}`);
      updateFAQ(faq.id, { embedding: faq.embedding });
    }

    res.json({ success: true, faq });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Rate FAQ
 * POST /api/kb/faq/:faqId/rate
 */
app.post('/api/kb/faq/:faqId/rate', (req, res) => {
  try {
    const schema = z.object({
      helpful: z.boolean(),
    });

    const { helpful } = schema.parse(req.body);
    const faq = rateFAQ(req.params.faqId, helpful);

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({ success: true, faq });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Query Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query knowledge base
 * POST /api/kb/query
 */
app.post('/api/kb/query', (req, res) => {
  try {
    const schema = z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).optional(),
      includeChunks: z.boolean().optional(),
      includeFAQs: z.boolean().optional(),
    });

    const result = queryKnowledgeBase(
      schema.parse(req.body).query,
      schema.parse(req.body)
    );

    res.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    logger.error({ err, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get query log
 * GET /api/kb/query/:queryId
 */
app.get('/api/kb/query/:queryId', (req, res) => {
  const queryLog = queriesStore.get(req.params.queryId);
  if (!queryLog) {
    return res.status(404).json({ error: 'Query not found' });
  }
  res.json({ success: true, query: queryLog });
});

/**
 * Get KB status
 * GET /api/kb/status
 */
app.get('/api/kb/status', (req, res) => {
  const docs = Array.from(documentsStore.values());
  const indexedDocs = docs.filter(d => d.status === 'indexed').length;
  const processingDocs = docs.filter(d => d.status === 'processing').length;
  const failedDocs = docs.filter(d => d.status === 'failed').length;

  res.json({
    success: true,
    status: {
      documents: {
        total: documentsStore.size,
        indexed: indexedDocs,
        processing: processingDocs,
        failed: failedDocs,
      },
      chunks: chunksStore.size,
      faqs: faqsStore.size,
      queries: queriesStore.size,
      categories: [...new Set(Array.from(faqsStore.values()).map(f => f.category))],
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method });

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5407;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Widget KB Service running on port ${port}`);
      resolve(server);
    });
  });
}

// Start if run directly
const isMainModule = process.argv[1]?.includes('index.js');
if (isMainModule) {
  startServer();
}

export { app };
