/**
 * Archive Routes - Archived Memory Management
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/archive
 * List archived memories
 */
router.get('/', (req, res) => {
  const { userId = 'default', page = 1, limit = 20, twinType } = req.query;

  // Sample archived memories
  const archives = [
    {
      id: 'arch_001',
      content: 'Visited Paris for the first time...',
      archivedAt: '2025-12-01T10:00:00Z',
      originalCreatedAt: '2024-06-15T14:30:00Z',
      originalTwinType: 'personal',
      metadata: {
        importance: 'medium',
        tags: ['travel', 'france', 'milestone'],
        redacted: false
      },
      compressed: true,
      contentLength: 1250
    },
    {
      id: 'arch_002',
      content: 'Old project notes from 2024',
      archivedAt: '2025-09-15T08:00:00Z',
      originalCreatedAt: '2024-03-20T11:00:00Z',
      originalTwinType: 'business',
      metadata: {
        importance: 'low',
        tags: ['project', 'old'],
        redacted: false
      },
      compressed: true,
      contentLength: 3400
    },
    {
      id: 'arch_003',
      content: 'Health data from last year',
      archivedAt: '2025-06-01T12:00:00Z',
      originalCreatedAt: '2024-06-01T09:00:00Z',
      originalTwinType: 'health',
      metadata: {
        importance: 'high',
        tags: ['health', 'annual'],
        redacted: true,
        redactedFields: ['specific_metrics']
      },
      contentLength: 890
    }
  ];

  const filtered = twinType
    ? archives.filter(a => a.originalTwinType === twinType)
    : archives;

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    archives: paginated,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filtered.length,
      pages: Math.ceil(filtered.length / limit)
    },
    userId
  });
});

/**
 * GET /api/archive/:id
 * Get specific archived memory
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const { userId = 'default', restore = 'false' } = req.query;

  // Sample archive
  const archive = {
    id,
    content: 'Sample archived memory content...',
    archivedAt: '2025-12-01T10:00:00Z',
    originalCreatedAt: '2024-06-15T14:30:00Z',
    originalTwinType: 'personal',
    metadata: {
      importance: 'medium',
      tags: ['travel'],
      accessCount: 0,
      redacted: false
    }
  };

  if (restore === 'true') {
    return res.json({
      success: true,
      message: 'Memory restored from archive',
      memory: {
        ...archive,
        state: 'active',
        restoredAt: new Date().toISOString()
      },
      userId
    });
  }

  res.json({
    success: true,
    archive,
    userId
  });
});

/**
 * POST /api/archive/:id/restore
 * Restore memory from archive
 */
router.post('/:id/restore', (req, res) => {
  const { id } = req.params;
  const { userId = 'default' } = req.body;

  res.json({
    success: true,
    message: 'Memory restored from archive',
    memory: {
      id,
      state: 'active',
      restoredAt: new Date().toISOString(),
      originalArchivedAt: '2025-12-01T10:00:00Z'
    },
    userId
  });
});

/**
 * DELETE /api/archive/:id
 * Permanently delete archived memory
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { userId = 'default' } = req.body;

  res.json({
    success: true,
    message: 'Archived memory permanently deleted',
    id,
    deletedAt: new Date().toISOString(),
    userId
  });
});

/**
 * GET /api/archive/stats
 * Archive statistics
 */
router.get('/stats', (req, res) => {
  const { userId = 'default' } = req.query;

  res.json({
    success: true,
    userId,
    stats: {
      totalArchived: 140,
      byTwinType: {
        personal: 45,
        business: 38,
        creative: 25,
        financial: 12,
        health: 8,
        learning: 7,
        relationship: 5
      },
      byImportance: {
        high: 8,
        medium: 52,
        low: 80
      },
      storageMB: 12.8,
      oldestArchive: '2024-03-15T00:00:00Z',
      newestArchive: '2026-01-10T00:00:00Z',
      upcomingDeletion: '2026-07-01T00:00:00Z', // Next scheduled cleanup
      retentionPolicy: {
        high: 'never_delete',
        medium: '2_years',
        low: '1_year'
      }
    },
    updatedAt: new Date().toISOString()
  });
});

/**
 * POST /api/archive/cleanup
 * Trigger archive cleanup
 */
router.post('/cleanup', (req, res) => {
  const { userId = 'default', dryRun = 'false' } = req.body;

  const dryRunMode = dryRun === true || dryRun === 'true';

  res.json({
    success: true,
    message: dryRunMode
      ? 'Cleanup analysis complete'
      : 'Cleanup executed',
    results: {
      examined: 140,
      toDelete: 8,
      toKeep: 132,
      storageFreedMB: 2.4,
      executedAt: new Date().toISOString()
    },
    dryRun: dryRunMode,
    userId
  });
});

module.exports = router;
