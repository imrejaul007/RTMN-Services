/**
 * Brain Routes - Personal Knowledge Graph
 *
 * NOT "memory" or "knowledge base"
 * This is YOUR brain - contacts, projects, decisions, preferences
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

// ============================================================================
// BRAIN ITEM MODEL
// ============================================================================

const BrainItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },

  // Type categories
  type: {
    type: String,
    enum: ['contact', 'project', 'decision', 'preference', 'context', 'conversation', 'note'],
    required: true,
  },

  // Content
  title: { type: String, required: true },
  summary: String,
  content: String,

  // Relationships
  connections: [{
    itemId: String,
    type: { type: String, enum: ['related', 'mentioned', 'decided', 'worked_on'] },
    strength: { type: Number, default: 1 }, // 1-10
  }],

  // Contact-specific
  contactInfo: {
    name: String,
    email: String,
    phone: String,
    role: String,
    company: String,
    lastContacted: Date,
    importance: { type: Number, default: 5 }, // 1-10
  },

  // Project-specific
  projectInfo: {
    status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'] },
    priority: { type: Number, default: 5 },
    deadline: Date,
    collaborators: [String],
  },

  // Decision-specific
  decisionInfo: {
    decidedAt: Date,
    alternatives: [String],
    outcome: String,
    reasoning: String,
  },

  // Context (current situation)
  contextInfo: {
    situation: String,
    challenge: String,
    goal: String,
  },

  // Memory summary
  memorySummary: String,

  // Stats
  accessCount: { type: Number, default: 0 },
  lastAccessedAt: Date,

  // Tags
  tags: [String],

  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

BrainItemSchema.index({ userId: 1, tenantId: 1, type: 1 });
BrainItemSchema.index({ userId: 1, tenantId: 1, 'contactInfo.name': 'text', title: 'text', summary: 'text' });

export const BrainItem = mongoose.model('BrainItem', BrainItemSchema);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/brain
 * Add to brain
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, type, title, content, summary, connections, tags, ...typeSpecific } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId || !type || !title) {
      return res.status(400).json({ success: false, error: 'userId, type, and title required' });
    }

    const item = await BrainItem.create({
      itemId: `brain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      tenantId,
      type,
      title,
      summary: summary || content?.substring(0, 200),
      content,
      connections: connections || [],
      tags: tags || [],
      ...typeSpecific,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('[Brain] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to add to brain' });
  }
});

/**
 * GET /api/brain
 * Get all brain items
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, type, q, limit = 50 } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const filter: Record<string, unknown> = { userId, tenantId };
    if (type) filter.type = type;

    let items;
    if (q) {
      items = await BrainItem.find({
        ...filter,
        $text: { $search: q as string }
      }).limit(parseInt(limit as string));
    } else {
      items = await BrainItem.find(filter)
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit as string));
    }

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('[Brain] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to get brain' });
  }
});

/**
 * GET /api/brain/summary
 * Get brain summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }

    const [contacts, projects, decisions, notes] = await Promise.all([
      BrainItem.countDocuments({ userId, tenantId, type: 'contact' }),
      BrainItem.countDocuments({ userId, tenantId, type: 'project' }),
      BrainItem.countDocuments({ userId, tenantId, type: 'decision' }),
      BrainItem.countDocuments({ userId, tenantId, type: 'note' }),
    ]);

    const recentItems = await BrainItem.find({ userId, tenantId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('type title updatedAt');

    res.json({
      success: true,
      data: {
        counts: { contacts, projects, decisions, notes },
        total: contacts + projects + decisions + notes,
        recentItems,
      }
    });
  } catch (error) {
    console.error('[Brain] Summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to get summary' });
  }
});

/**
 * GET /api/brain/contacts
 * Get contacts brain
 */
router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const { userId, q } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const filter: Record<string, unknown> = { userId, tenantId, type: 'contact' };
    if (q) {
      filter.$text = { $search: q as string };
    }

    const contacts = await BrainItem.find(filter)
      .sort({ 'contactInfo.lastContacted': -1, 'contactInfo.importance': -1 })
      .limit(50);

    res.json({ success: true, data: contacts });
  } catch (error) {
    console.error('[Brain] Contacts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get contacts' });
  }
});

/**
 * GET /api/brain/projects
 * Get projects brain
 */
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const { userId, status } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const filter: Record<string, unknown> = { userId, tenantId, type: 'project' };
    if (status) filter['projectInfo.status'] = status;

    const projects = await BrainItem.find(filter)
      .sort({ 'projectInfo.priority': -1, updatedAt: -1 })
      .limit(50);

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('[Brain] Projects error:', error);
    res.status(500).json({ success: false, error: 'Failed to get projects' });
  }
});

/**
 * GET /api/brain/decisions
 * Get decisions brain
 */
router.get('/decisions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const decisions = await BrainItem.find({
      userId, tenantId, type: 'decision'
    })
      .sort({ 'decisionInfo.decidedAt': -1 })
      .limit(50);

    res.json({ success: true, data: decisions });
  } catch (error) {
    console.error('[Brain] Decisions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get decisions' });
  }
});

/**
 * POST /api/brain/connect
 * Connect two brain items
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { userId, itemId1, itemId2, connectionType, strength } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId || !itemId1 || !itemId2) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    await BrainItem.updateOne(
      { itemId: itemId1, userId, tenantId },
      {
        $push: {
          connections: { itemId: itemId2, type: connectionType || 'related', strength: strength || 5 }
        }
      }
    );

    await BrainItem.updateOne(
      { itemId: itemId2, userId, tenantId },
      {
        $push: {
          connections: { itemId: itemId1, type: connectionType || 'related', strength: strength || 5 }
        }
      }
    );

    res.json({ success: true, message: 'Items connected' });
  } catch (error) {
    console.error('[Brain] Connect error:', error);
    res.status(500).json({ success: false, error: 'Failed to connect' });
  }
});

/**
 * GET /api/brain/search
 * Search brain with context
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { userId, query } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!userId || !query) {
      return res.status(400).json({ success: false, error: 'userId and query required' });
    }

    // Search across all types
    const results = await BrainItem.find({
      userId, tenantId,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { 'contactInfo.name': { $regex: query, $options: 'i' } },
        { 'contactInfo.company': { $regex: query, $options: 'i' } },
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(20);

    // Group by type
    const grouped = results.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, typeof results>);

    res.json({ success: true, data: { results, grouped } });
  } catch (error) {
    console.error('[Brain] Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

/**
 * DELETE /api/brain/:id
 * Remove from brain
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await BrainItem.deleteOne({ itemId: req.params.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Remove connections to this item
    await BrainItem.updateMany(
      { 'connections.itemId': req.params.id },
      { $pull: { connections: { itemId: req.params.id } }
    );

    res.json({ success: true, message: 'Removed from brain' });
  } catch (error) {
    console.error('[Brain] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove' });
  }
});

export default router;
