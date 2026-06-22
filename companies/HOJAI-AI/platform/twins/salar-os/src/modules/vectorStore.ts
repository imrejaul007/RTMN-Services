import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('vectorStore');
/**
 * Salar OS - Vector Store Module
 *
 * Enables semantic search and RAG capabilities
 * Uses MongoDB for storage (can be upgraded to Redis/pgvector later)
 */

import { Router, Request, Response } from 'express';
import mongoose, { Schema, model } from 'mongoose';
import { randomBytes } from 'crypto';

const router = Router();

// ============================================================================
// CONFIG
// ============================================================================

const EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '1536'); // OpenAI default

// ============================================================================
// MONGODB SCHEMAS
// ============================================================================

// Vector Collection Schema
const vectorCollectionSchema = new Schema({
  collectionId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  dimension: { type: Number, default: EMBEDDING_DIMENSION },
  metric: { type: String, enum: ['cosine', 'euclidean', 'dotproduct'], default: 'cosine' },

  // Metadata
  ownerCorpId: String,
  entityType: String,  // HUMAN, AGENT, ORGANIZATION
  entityId: String,

  // Stats
  documentCount: { type: Number, default: 0 },
  lastIndexed: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const VectorCollection = model('VectorCollection', vectorCollectionSchema);

// Vector Document Schema
const vectorDocumentSchema = new Schema({
  documentId: { type: String, required: true, unique: true, index: true },
  collectionId: { type: String, required: true, index: true },

  // Content
  content: { type: String, required: true },
  embedding: { type: [Number], index: true },

  // Metadata
  metadata: {
    title: String,
    source: String,      // github, jira, document, etc.
    sourceId: String,    // External reference
    corpId: String,     // Entity this belongs to
    entityType: String,  // HUMAN, AGENT, ORGANIZATION
    tags: [String],
    author: String,
    url: String,
  },

  // For similarity search
  chunkIndex: Number,  // If document was chunked
  totalChunks: Number,

  // Status
  status: { type: String, enum: ['ACTIVE', 'INDEXED', 'FAILED'], default: 'INDEXED' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

vectorDocumentSchema.index({ collectionId: 1, status: 1 });
vectorDocumentSchema.index({ 'metadata.corpId': 1 });
vectorDocumentSchema.index({ 'metadata.tags': 1 });

const VectorDocument = model('VectorDocument', vectorDocumentSchema);

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string = 'VEC'): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

// Simple embedding generation (replace with real OpenAI/Claude in production)
function generateEmbedding(text: string): number[] {
  // Simple hash-based embedding for demo
  // In production, use OpenAI embeddings or similar
  const hash = simpleHash(text);
  const embedding = new Array(EMBEDDING_DIMENSION).fill(0);

  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    embedding[i] = Math.sin(hash * (i + 1) * 0.01) * 0.5 + 0.5;
  }

  return embedding;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Create collection
 * POST /vector/collections
 */
router.post('/collections', async (req: Request, res: Response) => {
  try {
    const { name, description, dimension, metric, entityType, entityId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name is required' },
      });
    }

    const existing = await VectorCollection.findOne({ name });
    if (existing) {
      return res.json({
        success: true,
        data: { collectionId: existing.collectionId, name: existing.name },
      });
    }

    const collection = new VectorCollection({
      collectionId: generateId('COL'),
      name,
      description,
      dimension: dimension || EMBEDDING_DIMENSION,
      metric: metric || 'cosine',
      entityType,
      entityId,
    });

    await collection.save();

    res.status(201).json({
      success: true,
      data: {
        collectionId: collection.collectionId,
        name: collection.name,
      },
    });
  } catch (error: any) {
    logger.error('Error creating collection:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Add document to collection
 * POST /vector/documents
 */
router.post('/documents', async (req: Request, res: Response) => {
  try {
    const { collectionId, content, metadata, generateEmbedding: shouldEmbed = true } = req.body;

    if (!collectionId || !content) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'collectionId and content are required' },
      });
    }

    // Get collection to check dimension
    const collection = await VectorCollection.findOne({ collectionId });
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found' },
      });
    }

    // Generate embedding
    let embedding = [];
    if (shouldEmbed) {
      embedding = generateEmbedding(content);
    }

    const document = new VectorDocument({
      documentId: generateId('DOC'),
      collectionId,
      content,
      embedding,
      metadata: {
        ...metadata,
        corpId: metadata?.corpId || metadata?.entityId,
      },
      status: shouldEmbed ? 'INDEXED' : 'PENDING',
    });

    await document.save();

    // Update collection count
    await VectorCollection.updateOne(
      { collectionId },
      {
        $inc: { documentCount: 1 },
        $set: { lastIndexed: new Date() },
      }
    );

    res.status(201).json({
      success: true,
      data: {
        documentId: document.documentId,
        collectionId,
        status: document.status,
      },
    });
  } catch (error: any) {
    logger.error('Error adding document:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Search similar documents
 * POST /vector/search
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, collectionId, corpId, limit = 10, minSimilarity = 0.5 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'query is required' },
      });
    }

    // Generate query embedding
    const queryEmbedding = generateEmbedding(query);

    // Build filter
    const filter: any = { status: 'INDEXED' };
    if (collectionId) filter.collectionId = collectionId;
    if (corpId) filter['metadata.corpId'] = corpId;

    // Get all documents in collection
    const documents = await VectorDocument.find(filter).limit(1000).lean();

    // Calculate similarities
    const results = documents
      .map(doc => ({
        documentId: doc.documentId,
        content: doc.content,
        similarity: cosineSimilarity(queryEmbedding, doc.embedding || []),
        metadata: doc.metadata,
      }))
      .filter(r => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    res.json({
      success: true,
      data: {
        query,
        results,
        total: results.length,
      },
    });
  } catch (error: any) {
    logger.error('Error searching:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Search across workforce (humans + agents)
 * POST /vector/search/workforce
 */
router.post('/search/workforce', async (req: Request, res: Response) => {
  try {
    const { query, entityType, corpId, limit = 10 } = req.body;

    // Generate query embedding
    const queryEmbedding = generateEmbedding(query);

    // Search both humans and agents
    const filter: any = {
      status: 'INDEXED',
      'metadata.entityType': { $in: ['HUMAN', 'AGENT'] },
    };
    if (entityType) filter['metadata.entityType'] = entityType;
    if (corpId) filter['metadata.corpId'] = corpId;

    const documents = await VectorDocument.find(filter).limit(500).lean();

    // Calculate similarities
    const results = documents
      .map(doc => ({
        documentId: doc.documentId,
        content: doc.content,
        similarity: cosineSimilarity(queryEmbedding, doc.embedding || []),
        entityType: doc.metadata?.entityType,
        corpId: doc.metadata?.corpId,
        tags: doc.metadata?.tags,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    res.json({
      success: true,
      data: {
        query,
        results,
        total: results.length,
      },
    });
  } catch (error: any) {
    logger.error('Error searching workforce:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get collection
 * GET /vector/collections/:id
 */
router.get('/collections/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const collection = await VectorCollection.findOne({ collectionId: id }).lean();

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found' },
      });
    }

    res.json({
      success: true,
      data: collection,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get document
 * GET /vector/documents/:id
 */
router.get('/documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await VectorDocument.findOne({ documentId: id }).lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
    }

    res.json({
      success: true,
      data: document,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Delete document
 * DELETE /vector/documents/:id
 */
router.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const doc = await VectorDocument.findOneAndDelete({ documentId: id });

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
    }

    // Update collection count
    await VectorCollection.updateOne(
      { collectionId: doc.collectionId },
      { $inc: { documentCount: -1 } }
    );

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Bulk index documents
 * POST /vector/bulk
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { collectionId, documents } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'documents array required' },
      });
    }

    // Get collection
    const collection = await VectorCollection.findOne({ collectionId });
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found' },
      });
    }

    // Create documents
    const created = [];
    const failed = [];

    for (const doc of documents) {
      try {
        const embedding = generateEmbedding(doc.content);

        const document = new VectorDocument({
          documentId: generateId('DOC'),
          collectionId,
          content: doc.content,
          embedding,
          metadata: doc.metadata,
          status: 'INDEXED',
        });

        await document.save();
        created.push(document.documentId);
      } catch (err) {
        failed.push({ content: doc.content?.substring(0, 50), error: (err as Error).message });
      }
    }

    // Update collection
    await VectorCollection.updateOne(
      { collectionId },
      {
        $inc: { documentCount: created.length },
        $set: { lastIndexed: new Date() },
      }
    );

    res.json({
      success: true,
      data: {
        created: created.length,
        failed: failed.length,
        documentIds: created,
        errors: failed.slice(0, 5),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get stats
 * GET /vector/stats
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [collections, documents, byType] = await Promise.all([
      VectorCollection.countDocuments(),
      VectorDocument.countDocuments({ status: 'INDEXED' }),
      VectorDocument.aggregate([
        { $group: { _id: '$metadata.entityType', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        collections,
        documents,
        byEntityType: Object.fromEntries(byType.map(t => [t._id || 'UNKNOWN', t.count])),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

export { router as vectorStoreRouter, VectorCollection, VectorDocument };
export default router;
