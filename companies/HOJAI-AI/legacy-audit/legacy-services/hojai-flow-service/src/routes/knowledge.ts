/**
 * Knowledge Routes - Knowledge base and search
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

// ============================================================================
// KNOWLEDGE MODEL
// ============================================================================

const KnowledgeSchema = new mongoose.Schema({
  knowledgeId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },

  title: { type: String, required: true },
  content: { type: String, required: true },
  summary: String,

  type: { type: String, enum: ['document', 'policy', 'contact', 'company', 'product'], required: true },
  category: String,
  tags: [String],

  // For contacts
  contactInfo: {
    name: String,
    email: String,
    phone: String,
    role: String,
    company: String,
  },

  // For companies
  companyInfo: {
    name: String,
    website: String,
    industry: String,
    size: String,
  },

  // For products
  productInfo: {
    name: String,
    category: String,
    price: Number,
    description: String,
  },

  metadata: mongoose.Schema.Types.Mixed,

  visibility: { type: String, enum: ['private', 'team', 'company', 'public'], default: 'private' },

  embeddings: [Number], // For vector search

  lastAccessedAt: Date,
  accessCount: { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

KnowledgeSchema.index({ userId: 1, tenantId: 1 });
KnowledgeSchema.index({ title: 'text', content: 'text' });
KnowledgeSchema.index({ type: 1, tags: 1 });

export const Knowledge = mongoose.model('Knowledge', KnowledgeSchema);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/knowledge
 * Add knowledge
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, title, content, type, tags, visibility } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId || !title || !content || !type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const knowledge = await Knowledge.create({
      knowledgeId: `know_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      tenantId,
      title,
      content,
      type,
      tags: tags || [],
      visibility: visibility || 'private',
      summary: content.substring(0, 200),
    });

    res.status(201).json({ success: true, data: knowledge });
  } catch (error) {
    console.error('[Knowledge] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create knowledge' });
  }
});

/**
 * POST /api/knowledge/search
 * Search knowledge
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { userId, query, types, limit = 10 } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId || !query) {
      return res.status(400).json({ success: false, error: 'userId and query required' });
    }

    // Build filter
    const filter: Record<string, unknown> = {
      tenantId,
      $or: [
        { visibility: { $in: ['public', 'company', 'team'] } },
        { userId }
      ]
    };

    if (types && types.length > 0) {
      filter.type = { $in: types };
    }

    // Text search
    const results = await Knowledge.find({
      ...filter,
      $text: { $search: query }
    })
      .select({ score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit);

    // If no text search results, try regex
    if (results.length === 0) {
      const regexResults = await Knowledge.find({
        ...filter,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
        ]
      })
        .limit(limit);

      const formatted = regexResults.map(k => ({
        id: k.knowledgeId,
        title: k.title,
        content: k.content,
        type: k.type,
        relevance: 0.5, // Default relevance for regex search
        lastUpdated: k.updatedAt,
      }));

      return res.json({ success: true, data: formatted });
    }

    const formatted = results.map(k => ({
      id: k.knowledgeId,
      title: k.title,
      content: k.content,
      type: k.type,
      relevance: (k as any).score / 100, // Normalize score
      lastUpdated: k.updatedAt,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('[Knowledge] Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

/**
 * GET /api/knowledge
 * List knowledge
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, type, limit = 50 } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const filter: Record<string, unknown> = {
      tenantId,
      $or: [
        { visibility: { $in: ['public', 'company', 'team'] } },
        { userId }
      ]
    };

    if (type) filter.type = type;

    const knowledge = await Knowledge.find(filter)
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit as string));

    res.json({ success: true, data: knowledge });
  } catch (error) {
    console.error('[Knowledge] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to list knowledge' });
  }
});

/**
 * GET /api/knowledge/:id
 * Get single knowledge
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const knowledge = await Knowledge.findOne({ knowledgeId: req.params.id });

    if (!knowledge) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    // Update access stats
    knowledge.lastAccessedAt = new Date();
    knowledge.accessCount = (knowledge.accessCount || 0) + 1;
    await knowledge.save();

    res.json({ success: true, data: knowledge });
  } catch (error) {
    console.error('[Knowledge] Get error:', error);
    res.status(500).json({ success: false, error: 'Failed to get knowledge' });
  }
});

/**
 * DELETE /api/knowledge/:id
 * Delete knowledge
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await Knowledge.deleteOne({
      knowledgeId: req.params.id,
      userId: req.query.userId // Only owner can delete
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Not found or not authorized' });
    }

    res.json({ success: true, message: 'Knowledge deleted' });
  } catch (error) {
    console.error('[Knowledge] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete knowledge' });
  }
});

export default router;
