/**
 * Deploy Routes - Deployment management endpoints
 */

import express from 'express';
import * as deployer from '../deployer.js';
import * as canary from '../canary.js';

const router = express.Router();

/**
 * POST /api/deploy
 * Create and start a new deployment
 */
router.post('/', async (req, res) => {
  try {
    const { agentId, version, environment, strategy, canaryPercent } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    if (!version) {
      return res.status(400).json({ error: 'version is required' });
    }

    if (!environment) {
      return res.status(400).json({ error: 'environment is required' });
    }

    // Create deployment
    const deployment = deployer.createDeployment({
      agentId,
      version,
      environment,
      strategy: strategy || 'rolling',
      canaryPercent: canaryPercent || 0
    });

    // Start deployment
    const started = deployer.startDeployment(deployment.id);

    // If canary deployment, start canary tracking
    if (strategy === 'canary') {
      canary.startCanary(deployment.id, agentId, version, environment);
    }

    // Simulate deployment completion (in production, this would be async)
    setImmediate(async () => {
      try {
        await deployer.simulateDeployment(deployment.id);

        // If canary, promote to first step
        if (strategy === 'canary') {
          const canaryDeployment = canary.getCanaryByDeployment(deployment.id);
          if (canaryDeployment) {
            canary.updateCanaryPercent(canaryDeployment.id, 5);
          }
        }
      } catch (error) {
        console.error('Deployment simulation error:', error);
      }
    });

    res.status(201).json(started);
  } catch (error) {
    if (error.message === 'Agent not found' || error.message === 'Version not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/deploy/:id
 * Get deployment status
 */
router.get('/:id', (req, res) => {
  try {
    const deployment = deployer.getDeployment(req.params.id);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // If canary deployment, include canary info
    if (deployment.strategy === 'canary') {
      const canaryDeployment = canary.getCanaryByDeployment(req.params.id);
      return res.json({
        ...deployment,
        canary: canaryDeployment
      });
    }

    res.json(deployment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/deploy/agent/:agentId
 * Get all deployments for an agent
 */
router.get('/agent/:agentId', (req, res) => {
  try {
    const deployments = deployer.getDeploymentsByAgent(req.params.agentId);
    res.json(deployments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/deploy/agent/:agentId/:environment
 * Get deployments for an agent in a specific environment
 */
router.get('/agent/:agentId/:environment', (req, res) => {
  try {
    const deployments = deployer.getDeploymentsByEnvironment(
      req.params.agentId,
      req.params.environment
    );
    res.json(deployments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/deploy/:id/metrics
 * Update deployment metrics
 */
router.put('/:id/metrics', (req, res) => {
  try {
    const { requestsPerSec, errorRate, latencyP99 } = req.body;

    const deployment = deployer.updateMetrics(req.params.id, {
      requestsPerSec,
      errorRate,
      latencyP99
    });

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    res.json(deployment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;