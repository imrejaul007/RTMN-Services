/**
 * Vector Routes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { VectorIndex, vectorIndexStore, memoryStore, textToEmbedding } from '../index.js';

const router = Router();

// ============================================
// HELPERS
// ============================================

function createResponse<T>(data: T, tenantId?: string) {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}`, tenantId }
  };
}

function createErrorResponse(code: string, message: string) {
  return {
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` }
  };
}

/**
 * POST /vectors/indices
 * Create a vector index
 */
router.post('/indices', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { name, dimension = 384, metric = 'cosine' } = req.body;

  if (!name) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'name is required'));
  }

  const index: VectorIndex = {
    id: uuidv4(),
    tenantId: ctx.tenant_id,
    name,
    dimension,
    metric,
    createdAt: new Date().toISOString()
  };

  vectorIndexStore.push(index);

  res.status(201).json(createResponse({ index }, ctx.tenant_id));
});

/**
 * GET /vectors/indices
 * List vector indices
 */
router.get('/indices', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const indices = vectorIndexStore.filter(i => i.tenantId === ctx.tenant_id);
  res.json(createResponse({ indices }, ctx.tenant_id));
});

/**
 * GET /vectors/indices/:id
 * Get index by ID
 */
router.get('/indices/:id', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const index = vectorIndexStore.find(i => i.id === id && i.tenantId === ctx.tenant_id);

  if (!index) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Index ${id} not found`));
  }

  res.json(createResponse({ index }, ctx.tenant_id));
});

/**
 * DELETE /vectors/indices/:id
 * Delete index
 */
router.delete('/indices/:id', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const index = vectorIndexStore.find(i => i.id === id && i.tenantId === ctx.tenant_id);

  if (!index) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Index ${id} not found`));
  }

  const idx = vectorIndexStore.indexOf(index);
  vectorIndexStore.splice(idx, 1);

  res.json(createResponse({ deleted: true }));
});

/**
 * POST /vectors/search
 * Vector similarity search
 */
router.post('/search', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { query, userId, limit = 10, minScore = 0.5 } = req.body;

  if (!query) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'query is required'));
  }

  const queryEmbedding = textToEmbedding(query);
  let memories = memoryStore.get(ctx.tenant_id) || [];

  if (userId) {
    memories = memories.filter(m => m.userId === userId);
  }

  // Only search memories with embeddings
  memories = memories.filter(m => m.embedding && m.embedding.length > 0);

  // Calculate similarity
  const results = memories.map(m => ({
    id: m.id,
    score: cosineSimilarity(queryEmbedding, m.embedding!)
  }))
  .filter(r => r.score >= Number(minScore))
  .sort((a, b) => b.score - a.score)
  .slice(0, Number(limit));

  // Get full memory data
  const memoriesMap = new Map(memories.map(m => [m.id, m]));
  const fullResults = results.map(r => ({
    ...memoriesMap.get(r.id),
    score: r.score
  }));

  res.json(createResponse({
    results: fullResults,
    total: results.length,
    query: query.substring(0, 100)
  }, ctx.tenant_id));
});

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 0.0001);
}

/**
 * POST /vectors/embed
 * Generate embedding for text
 */
router.post('/embed', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'text is required'));
  }

  const embedding = textToEmbedding(text);

  res.json(createResponse({
    embedding,
    dimension: embedding.length,
    model: 'hojai-embed-v1'
  }, ctx.tenant_id));
});

/**
 * POST /vectors/embed/batch
 * Generate embeddings for multiple texts
 */
router.post('/embed/batch', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { texts } = req.body;

  if (!Array.isArray(texts)) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'texts array required'));
  }

  const embeddings = texts.map(text => ({
    text,
    embedding: textToEmbedding(text)
  }));

  res.json(createResponse({
    embeddings,
    count: embeddings.length
  }, ctx.tenant_id));
});

/**
 * GET /vectors/stats
 * Get vector statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;

  const memories = memoryStore.get(ctx.tenant_id) || [];
  const indexedMemories = memories.filter(m => m.embedding && m.embedding.length > 0);
  const indices = vectorIndexStore.filter(i => i.tenantId === ctx.tenant_id);

  res.json(createResponse({
    stats: {
      totalMemories: memories.length,
      indexedMemories: indexedMemories.length,
      indices: indices.length,
      avgDimension: indexedMemories.length > 0
        ? Math.round(indexedMemories.reduce((sum, m) => sum + (m.embedding?.length || 0), 0) / indexedMemories.length)
        : 0
    }
  }, ctx.tenant_id));
});

export { router as vectorRoutes };
