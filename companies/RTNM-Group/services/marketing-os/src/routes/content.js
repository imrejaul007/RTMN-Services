import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { contentLibrary } from '../index.js';

const router = express.Router();

/**
 * GET /api/content
 * List all content
 */
router.get('/', async (req, res) => {
  try {
    const { type, industry, status } = req.query;

    let content = Array.from(contentLibrary.values());

    if (type) content = content.filter(c => c.type === type);
    if (industry) content = content.filter(c => c.industry === industry);
    if (status) content = content.filter(c => c.status === status);

    res.json({
      success: true,
      count: content.length,
      content
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/content
 * Create content
 */
router.post('/', async (req, res) => {
  try {
    const { title, body, type = 'article', industry, tags = [] } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    const contentId = `content_${uuidv4()}`;
    const content = {
      id: contentId,
      title,
      body,
      type,
      industry,
      tags,
      status: 'draft',
      metrics: { views: 0, shares: 0, engagement: 0 },
      createdAt: new Date().toISOString()
    };

    contentLibrary.set(contentId, content);

    res.status(201).json({
      success: true,
      content
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/content/:id
 * Get content details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const content = contentLibrary.get(id);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      content
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/content/:id
 * Update content
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const content = contentLibrary.get(id);
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    const updated = { ...content, ...updates, updatedAt: new Date().toISOString() };
    contentLibrary.set(id, updated);

    res.json({
      success: true,
      content: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
