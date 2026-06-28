/**
 * Rollback Routes - Rollback management endpoints
 */

import express from 'express';
import * as rollback from '../rollback.js';

const router = express.Router();

/**
 * POST /api/rollback/:agentId
 * Rollback agent to previous version
 */
router.post('/:agentId', async (req, res) => {
  try {
    const { environment, reason, initiatedBy } = req.body;

    if (!environment) {
      return res.status(400).json({ error: 'environment is required' });
    }

    // Get available versions before rollback
    const availableVersions = rollback.getAvailableVersionsForRollback(
      req.params.agentId,
      environment
    );

    if (availableVersions.length === 0) {
      return res.status(400).json({
        error: 'No previous version available for rollback'
      });
    }

    // Initiate rollback
    const rollbackRecord = rollback.rollback(req.params.agentId, environment, {
      reason,
      initiatedBy
    });

    // Simulate rollback completion (in production, this would be async)
    setImmediate(async () => {
      try {
        await rollback.simulateRollback(rollbackRecord.id);
      } catch (error) {
        console.error('Rollback simulation error:', error);
      }
    });

    res.status(201).json({
      ...rollbackRecord,
      availableVersions
    });
  } catch (error) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/rollback/:agentId
 * Get rollback history for an agent
 */
router.get('/:agentId', (req, res) => {
  try {
    const rollbacks = rollback.getRollbacksByAgent(req.params.agentId);
    res.json(rollbacks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rollback/:agentId/:environment
 * Get rollback history for an agent's environment
 */
router.get('/:agentId/:environment', (req, res) => {
  try {
    const rollbacks = rollback.getRollbacksByEnvironment(
      req.params.agentId,
      req.params.environment
    );
    res.json(rollbacks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rollback/details/:id
 * Get rollback details
 */
router.get('/details/:id', (req, res) => {
  try {
    const rollbackRecord = rollback.getRollback(req.params.id);

    if (!rollbackRecord) {
      return res.status(404).json({ error: 'Rollback not found' });
    }

    res.json(rollbackRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rollback/:agentId/:environment/available
 * Get available versions for rollback
 */
router.get('/:agentId/:environment/available', (req, res) => {
  try {
    const availableVersions = rollback.getAvailableVersionsForRollback(
      req.params.agentId,
      req.params.environment
    );
    res.json(availableVersions);
  } catch (error) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;