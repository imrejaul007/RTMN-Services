/**
 * Forgetting Routes - Memory Lifecycle Management
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/forgetting/analyze
 * Analyze memories for forgetting decisions
 */
router.get('/analyze', async (req, res) => {
  try {
    const { userId = 'default', rules: customRules } = req.query;

    // In production, this would fetch from MemoryOS
    // For demo, using sample memories
    const memories = generateSampleMemories();

    const rules = customRules ? JSON.parse(customRules) : req.app.locals.DEFAULT_RULES;
    const analysis = req.app.locals.analyzeForgetting(memories, rules);

    res.json({
      success: true,
      userId,
      analysis,
      summary: {
        total: analysis.statistics.total,
        willArchive: analysis.toArchive.length,
        willDelete: analysis.toDelete.length,
        willKeep: analysis.toKeep.length,
        dormant: analysis.dormant.length,
        estimatedSavingsKB: analysis.statistics.estimatedSavings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/forgetting/suggest
 * Get smart forgetting suggestions for specific memories
 */
router.post('/suggest', (req, res) => {
  try {
    const { memories, options } = req.body;

    if (!memories || !Array.isArray(memories)) {
      return res.status(400).json({
        success: false,
        error: 'memories array required'
      });
    }

    const suggestions = memories.map(memory => {
      const importance = req.app.locals.classifyImportance(memory);
      const freshness = req.app.locals.calculateFreshness(memory);

      let suggestion = {
        id: memory.id,
        content: memory.content?.substring(0, 100) + '...',
        importance,
        freshness: Math.round(freshness * 100) + '%',
        recommendedAction: 'keep',
        reason: ''
      };

      // Decision logic
      if (memory.neverForget) {
        suggestion.recommendedAction = 'keep';
        suggestion.reason = 'Marked as never forget';
      } else if (memory.state === req.app.locals.MEMORY_STATES.ARCHIVED) {
        suggestion.recommendedAction = 'delete';
        suggestion.reason = 'Already archived, retention period expired';
      } else if (freshness < 0.2 && importance === 'low') {
        suggestion.recommendedAction = 'archive';
        suggestion.reason = 'Low freshness and low importance';
      } else if (freshness > 0.8) {
        suggestion.recommendedAction = 'keep';
        suggestion.reason = 'High freshness score';
      } else if (importance === 'high') {
        suggestion.recommendedAction = 'keep';
        suggestion.reason = 'High importance memories are preserved';
      }

      return suggestion;
    });

    res.json({
      success: true,
      suggestions,
      stats: {
        keep: suggestions.filter(s => s.recommendedAction === 'keep').length,
        archive: suggestions.filter(s => s.recommendedAction === 'archive').length,
        delete: suggestions.filter(s => s.recommendedAction === 'delete').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/forgetting/keep
 * Mark memory as "keep" (prevent archiving)
 */
router.post('/keep', (req, res) => {
  const { memoryId, reason, userId = 'default' } = req.body;

  if (!memoryId) {
    return res.status(400).json({
      success: false,
      error: 'memoryId required'
    });
  }

  // In production, this would update MemoryOS
  res.json({
    success: true,
    message: 'Memory marked as keep',
    memoryId,
    neverForget: true,
    reason: reason || 'User requested to keep',
    userId,
    updatedAt: new Date().toISOString()
  });
});

/**
 * POST /api/forgetting/archive
 * Archive memory with smart redaction
 */
router.post('/archive', (req, res) => {
  const { memoryId, options, userId = 'default' } = req.body;

  if (!memoryId) {
    return res.status(400).json({
      success: false,
      error: 'memoryId required'
    });
  }

  // Sample memory for demo
  const memory = {
    id: memoryId,
    content: 'Sample memory content with some financial info: Card ending 1234, amount $500',
    twinType: 'financial',
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
  };

  const archived = req.app.locals.smartArchive(memory, options || {});

  res.json({
    success: true,
    message: 'Memory archived successfully',
    archived,
    userId
  });
});

/**
 * POST /api/forgetting/delete
 * Delete memory permanently
 */
router.post('/delete', (req, res) => {
  const { memoryId, reason, userId = 'default' } = req.body;

  if (!memoryId) {
    return res.status(400).json({
      success: false,
      error: 'memoryId required'
    });
  }

  res.json({
    success: true,
    message: 'Memory scheduled for deletion',
    memoryId,
    reason: reason || 'User requested deletion',
    deletedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24hr grace period
    userId
  });
});

/**
 * GET /api/forgetting/stats
 * Get forgetting statistics
 */
router.get('/stats', (req, res) => {
  const { userId = 'default' } = req.query;

  res.json({
    success: true,
    userId,
    statistics: {
      totalMemories: 1250,
      activeMemories: 780,
      dormantMemories: 320,
      archivedMemories: 140,
      deletedMemories: 10,
      avgFreshness: 68,
      storageUsedMB: 45.2,
      storageSavedMB: 12.8,
      retentionRate: 94.2, // % kept vs deleted
      byImportance: {
        high: { total: 200, kept: 198, archived: 2 },
        medium: { total: 450, kept: 380, archived: 65, deleted: 5 },
        low: { total: 600, kept: 202, archived: 380, deleted: 18 }
      },
      byTwin: {
        personal: { total: 400, archived: 45 },
        financial: { total: 150, archived: 5 },
        health: { total: 200, archived: 2 },
        business: { total: 300, archived: 60 },
        creative: { total: 200, archived: 28 }
      }
    },
    updatedAt: new Date().toISOString()
  });
});

// Sample memory generator for demo
function generateSampleMemories() {
  const now = new Date();
  return [
    {
      id: 'mem_001',
      content: 'Important contract signed with client',
      twinType: 'business',
      createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      importance: 'high',
      state: 'active'
    },
    {
      id: 'mem_002',
      content: 'Draft idea for something',
      twinType: 'creative',
      createdAt: new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
      importance: 'low',
      state: 'dormant'
    },
    {
      id: 'mem_003',
      content: 'Health checkup results - all normal',
      twinType: 'health',
      createdAt: new Date(now - 200 * 24 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString(),
      importance: 'high',
      state: 'archived'
    }
  ];
}

module.exports = router;
