/**
 * CorpID Cloud - Identity Memory Routes
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../shared/utils/logger.js';
import {
  memories,
  memoryLinks,
  memoryCategories,
  getOrCreateMemoryLink,
  storeMemory,
  getMemoryById,
  getUserMemories,
  updateMemory,
  archiveMemory,
  deleteMemory,
  searchMemories,
  updateMemoryLink,
  getMemoryStats
} from '../models/memory.model.js';

const router = express.Router();

/**
 * Get memory categories
 * GET /api/memory/categories
 */
router.get('/categories',
  requireAuth(),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      categories: memoryCategories
    });
  })
);

/**
 * Get my memory link
 * GET /api/memory/me
 */
router.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const link = getOrCreateMemoryLink(req.user.id);
    res.json({ success: true, memoryLink: link });
  })
);

/**
 * Update memory link settings
 * PUT /api/memory/me
 */
router.put('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const link = updateMemoryLink(req.user.id, req.body);

    dataAudit('memory.link_updated', req, 'memory_link', link.id);

    res.json({
      success: true,
      message: 'Memory settings updated',
      memoryLink: link
    });
  })
);

/**
 * Store a memory
 * POST /api/memory/me/memories
 */
router.post('/me/memories',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type, category, key, value, data, confidence, source, sourceAgentId, visibility, expiresAt } = req.body;

    if (!key) {
      throw new AppError('Memory key is required', 400, 'VALIDATION_ERROR');
    }

    const memory = storeMemory(req.user.id, {
      type, category, key, value, data, confidence, source, sourceAgentId, visibility, expiresAt
    });

    dataAudit('memory.stored', req, 'memory', memory.id, { key, type });

    res.status(201).json({
      success: true,
      message: 'Memory stored',
      memory
    });
  })
);

/**
 * Get my memories
 * GET /api/memory/me/memories
 */
router.get('/me/memories',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type, category, archived, source, limit = 50 } = req.query;
    const mems = getUserMemories(req.user.id, {
      type, category, archived, source
    }).slice(0, parseInt(limit));

    res.json({
      success: true,
      count: mems.length,
      memories: mems
    });
  })
);

/**
 * Search memories
 * GET /api/memory/me/memories/search
 */
router.get('/me/memories/search',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { q, type, category } = req.query;
    const results = searchMemories(req.user.id, q, { type, category });

    res.json({
      success: true,
      count: results.length,
      results
    });
  })
);

/**
 * Get specific memory
 * GET /api/memory/me/memories/:id
 */
router.get('/me/memories/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const memory = getMemoryById(req.params.id);
    if (!memory) {
      throw new AppError('Memory not found', 404, 'MEMORY_NOT_FOUND');
    }
    if (memory.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Update access stats
    memory.lastAccessedAt = new Date().toISOString();
    memory.accessCount++;
    memories.set(memory.id, memory);

    res.json({ success: true, memory });
  })
);

/**
 * Update memory
 * PUT /api/memory/me/memories/:id
 */
router.put('/me/memories/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const memory = getMemoryById(req.params.id);
    if (!memory) {
      throw new AppError('Memory not found', 404, 'MEMORY_NOT_FOUND');
    }
    if (memory.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const updated = updateMemory(req.params.id, req.body);

    dataAudit('memory.updated', req, 'memory', req.params.id);

    res.json({
      success: true,
      message: 'Memory updated',
      memory: updated
    });
  })
);

/**
 * Archive memory
 * POST /api/memory/me/memories/:id/archive
 */
router.post('/me/memories/:id/archive',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const memory = getMemoryById(req.params.id);
    if (!memory) {
      throw new AppError('Memory not found', 404, 'MEMORY_NOT_FOUND');
    }
    if (memory.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    archiveMemory(req.params.id);

    dataAudit('memory.archived', req, 'memory', req.params.id);

    res.json({ success: true, message: 'Memory archived' });
  })
);

/**
 * Delete memory
 * DELETE /api/memory/me/memories/:id
 */
router.delete('/me/memories/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const memory = getMemoryById(req.params.id);
    if (!memory) {
      throw new AppError('Memory not found', 404, 'MEMORY_NOT_FOUND');
    }
    if (memory.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    deleteMemory(req.params.id);

    dataAudit('memory.deleted', req, 'memory', req.params.id);

    res.json({ success: true, message: 'Memory deleted' });
  })
);

/**
 * Get memory statistics
 * GET /api/memory/me/stats
 */
router.get('/me/stats',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const stats = getMemoryStats(req.user.id);
    res.json({ success: true, ...stats });
  })
);

/**
 * Bulk store memories (for agent sync)
 * POST /api/memory/me/memories/bulk
 */
router.post('/me/memories/bulk',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { memories: memsToStore } = req.body;

    if (!Array.isArray(memsToStore)) {
      throw new AppError('Memories must be an array', 400, 'VALIDATION_ERROR');
    }

    const stored = [];
    for (const mem of memsToStore) {
      const stored_mem = storeMemory(req.user.id, {
        ...mem,
        source: mem.source || 'agent',
        sourceAgentId: mem.sourceAgentId || null
      });
      stored.push(stored_mem);
    }

    res.status(201).json({
      success: true,
      message: `${stored.length} memories stored`,
      memories: stored
    });
  })
);

export default router;
