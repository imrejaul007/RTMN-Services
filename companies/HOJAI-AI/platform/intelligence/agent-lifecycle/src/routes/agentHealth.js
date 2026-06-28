/**
 * Agent Health Routes - Health monitoring endpoints
 */

import express from 'express';
import * as health from '../health.js';

const router = express.Router();

/**
 * GET /api/health/:agentId
 * Get agent health across all environments
 */
router.get('/:agentId', (req, res) => {
  try {
    const agentHealth = health.getAgentHealth(req.params.agentId);
    res.json(agentHealth);
  } catch (error) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health/:agentId/:environment
 * Get agent health in specific environment
 */
router.get('/:agentId/:environment', (req, res) => {
  try {
    const { agentId, environment } = req.params;

    if (!['dev', 'staging', 'prod'].includes(environment)) {
      return res.status(400).json({ error: 'Invalid environment' });
    }

    const healthData = health.getHealth(agentId, environment);

    if (!healthData) {
      return res.json({
        agentId,
        environment,
        status: 'unknown',
        message: 'No health data available',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      agentId,
      environment,
      ...healthData,
      latestStatus: healthData.history.length > 0
        ? healthData.history[healthData.history.length - 1]
        : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/health/:agentId/:environment
 * Update agent health metrics
 */
router.post('/:agentId/:environment', (req, res) => {
  try {
    const { agentId, environment } = req.params;
    const { requestsPerSec, errorRate, latencyP99 } = req.body;

    if (!['dev', 'staging', 'prod'].includes(environment)) {
      return res.status(400).json({ error: 'Invalid environment' });
    }

    const healthStatus = health.updateHealth(agentId, environment, {
      requestsPerSec: requestsPerSec || 0,
      errorRate: errorRate || 0,
      latencyP99: latencyP99 || 0
    });

    res.json(healthStatus);
  } catch (error) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health/:agentId/:environment/history
 * Get health history for an agent
 */
router.get('/:agentId/:environment/history', (req, res) => {
  try {
    const { agentId, environment } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const history = health.getHealthHistory(agentId, environment, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/health/:agentId/:environment/reset
 * Reset health data for an agent
 */
router.post('/:agentId/:environment/reset', (req, res) => {
  try {
    const { agentId, environment } = req.params;

    const success = health.resetHealth(agentId, environment);

    if (!success) {
      return res.status(404).json({ error: 'No health data found to reset' });
    }

    res.json({ message: 'Health data reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;