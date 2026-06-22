/**
 * Memory Routes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Memory, memoryStore, textToEmbedding } from '../index.js';

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
 * POST /memory
 * Store a memory
 */
router.post('/', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId, type, content, importance = 0.5, tags, expiresAt, metadata, generateEmbedding = true } = req.body;

  if (!type || !content) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'type and content are required'));
  }

  // Generate embedding
  let embedding: number[] | undefined;
  if (generateEmbedding) {
    embedding = textToEmbedding(content);
  }

  const memory: Memory = {
    id: uuidv4(),
    tenantId: ctx.tenant_id,
    userId,
    type,
    content,
    embedding,
    importance,
    tags,
    expiresAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata
  };

  const tenantMemories = memoryStore.get(ctx.tenant_id) || [];
  tenantMemories.push(memory);
  memoryStore.set(ctx.tenant_id, tenantMemories);

  res.status(201).json(createResponse({ memory }, ctx.tenant_id));
});

/**
 * GET /memory
 * Get memories for tenant/user
 */
router.get('/', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { userId, type, tag, limit = 50, minImportance } = req.query;

  let memories = memoryStore.get(ctx.tenant_id) || [];

  if (userId) {
    memories = memories.filter(m => m.userId === userId);
  }

  if (type) {
    memories = memories.filter(m => m.type === type);
  }

  if (tag) {
    memories = memories.filter(m => m.tags?.includes(tag as string));
  }

  if (minImportance) {
    memories = memories.filter(m => m.importance >= Number(minImportance));
  }

  // Sort by importance and timestamp
  memories.sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json(createResponse({
    memories: memories.slice(0, Number(limit)),
    total: memories.length
  }, ctx.tenant_id));
});

/**
 * GET /memory/:id
 * Get memory by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const memories = memoryStore.get(ctx.tenant_id) || [];
  const memory = memories.find(m => m.id === id);

  if (!memory) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Memory ${id} not found`));
  }

  res.json(createResponse({ memory }, ctx.tenant_id));
});

/**
 * POST /memory/search
 * Search memories (semantic)
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

  // Filter out memories without embeddings
  memories = memories.filter(m => m.embedding && m.embedding.length > 0);

  // Calculate similarity scores
  const scored = memories.map(m => ({
    memory: m,
    score: cosineSimilarityScore(queryEmbedding, m.embedding!)
  }))
  .filter(r => r.score >= Number(minScore))
  .sort((a, b) => b.score - a.score);

  res.json(createResponse({
    results: scored.slice(0, Number(limit)),
    total: scored.length
  }, ctx.tenant_id));
});

// Simple cosine similarity for numbers
function cosineSimilarityScore(a: number[], b: number[]): number {
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
 * PUT /memory/:id
 * Update memory
 */
router.put('/:id', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;
  const { content, importance, tags, metadata } = req.body;

  const memories = memoryStore.get(ctx.tenant_id) || [];
  const memory = memories.find(m => m.id === id);

  if (!memory) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Memory ${id} not found`));
  }

  if (content) {
    memory.content = content;
    memory.embedding = textToEmbedding(content);
  }
  if (importance !== undefined) memory.importance = importance;
  if (tags) memory.tags = tags;
  if (metadata) memory.metadata = { ...memory.metadata, ...metadata };
  memory.updatedAt = new Date().toISOString();

  res.json(createResponse({ memory }, ctx.tenant_id));
});

/**
 * DELETE /memory/:id
 * Delete memory
 */
router.delete('/:id', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const memories = memoryStore.get(ctx.tenant_id) || [];
  const index = memories.findIndex(m => m.id === id);

  if (index === -1) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Memory ${id} not found`));
  }

  memories.splice(index, 1);
  memoryStore.set(ctx.tenant_id, memories);

  res.json(createResponse({ deleted: true }));
});

/**
 * POST /memory/batch
 * Store multiple memories
 */
router.post('/batch', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { memories: newMemories } = req.body;

  if (!Array.isArray(newMemories)) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'memories array required'));
  }

  const memories = memoryStore.get(ctx.tenant_id) || [];
  const created: Memory[] = [];

  for (const m of newMemories) {
    if (!m.type || !m.content) continue;

    const memory: Memory = {
      id: uuidv4(),
      tenantId: ctx.tenant_id,
      userId: m.userId,
      type: m.type,
      content: m.content,
      embedding: m.generateEmbedding !== false ? textToEmbedding(m.content) : undefined,
      importance: m.importance ?? 0.5,
      tags: m.tags,
      expiresAt: m.expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: m.metadata
    };

    memories.push(memory);
    created.push(memory);
  }

  memoryStore.set(ctx.tenant_id, memories);

  res.status(201).json(createResponse({ memories: created, count: created.length }, ctx.tenant_id));
});

/**
 * GET /memory/types
 * Get available memory types
 */
router.get('/meta/types', (req: Request, res: Response) => {
  const types = [
    { type: 'fact', name: 'Fact', description: 'Factual information about user' },
    { type: 'preference', name: 'Preference', description: 'User preferences' },
    { type: 'context', name: 'Context', description: 'Current context or situation' },
    { type: 'interaction', name: 'Interaction', description: 'Past interactions' },
    { type: 'learning', name: 'Learning', description: 'Learned patterns or behaviors' }
  ];

  res.json(createResponse({ types }));
});

export { router as memoryRoutes };
