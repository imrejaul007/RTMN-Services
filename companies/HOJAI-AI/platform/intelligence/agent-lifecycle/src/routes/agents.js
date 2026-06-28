/**
 * Agent Routes - CRUD operations for agents
 */

import express from 'express';
import * as registry from '../registry.js';
import * as deployer from '../deployer.js';

const router = express.Router();

/**
 * POST /api/agents
 * Register a new agent
 */
router.post('/', (req, res) => {
  try {
    const { name, description, type, metadata } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Agent name is required' });
    }

    if (!['reasoning', 'action', 'hybrid'].includes(type)) {
      return res.status(400).json({ error: 'Invalid agent type. Must be reasoning, action, or hybrid' });
    }

    const agent = registry.createAgent({ name, description, type, metadata });
    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents
 * List all agents
 */
router.get('/', (req, res) => {
  try {
    const agents = registry.getAllAgents();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/:id
 * Get agent details
 */
router.get('/:id', (req, res) => {
  try {
    const agent = registry.getAgentById(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/agents/:id
 * Update agent
 */
router.put('/:id', (req, res) => {
  try {
    const agent = registry.updateAgent(req.params.id, req.body);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/agents/:id
 * Retire agent
 */
router.delete('/:id', (req, res) => {
  try {
    const success = registry.deleteAgent(req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ message: 'Agent retired successfully', agentId: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agents/:id/versions
 * Register new version
 */
router.post('/:id/versions', (req, res) => {
  try {
    const { version, changelog, imageUrl, config, createdBy } = req.body;

    if (!version) {
      return res.status(400).json({ error: 'Version is required' });
    }

    const versionRecord = registry.registerVersion(req.params.id, {
      version,
      changelog,
      imageUrl,
      config,
      createdBy
    });

    res.status(201).json(versionRecord);
  } catch (error) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/agents/:id/versions
 * List versions
 */
router.get('/:id/versions', (req, res) => {
  try {
    const agent = registry.getAgentById(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const versions = registry.getVersions(req.params.id);
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/:id/metrics
 * Get agent performance metrics
 */
router.get('/:id/metrics', (req, res) => {
  try {
    const agent = registry.getAgentById(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get all deployments for this agent
    const deployments = deployer.getDeploymentsByAgent(req.params.id);

    // Calculate metrics
    const metrics = {
      totalDeployments: deployments.length,
      successfulDeployments: deployments.filter(d => d.status === 'healthy').length,
      failedDeployments: deployments.filter(d => d.status === 'unhealthy').length,
      rolledBackDeployments: deployments.filter(d => d.status === 'rolled_back').length,
      environments: {},
      recentPerformance: []
    };

    // Calculate per-environment metrics
    for (const env of ['dev', 'staging', 'prod']) {
      const envDeployments = deployments.filter(d => d.environment === env);
      const latestDeployment = envDeployments[0];

      metrics.environments[env] = {
        currentVersion: agent.environments[env],
        totalDeployments: envDeployments.length,
        status: latestDeployment?.status || 'never_deployed',
        lastDeployed: latestDeployment?.completedAt || null,
        avgErrorRate: envDeployments.length > 0
          ? envDeployments.reduce((sum, d) => sum + d.metrics.errorRate, 0) / envDeployments.length
          : 0,
        avgLatency: envDeployments.length > 0
          ? envDeployments.reduce((sum, d) => sum + d.metrics.latencyP99, 0) / envDeployments.length
          : 0
      };
    }

    // Get recent performance (last 10 deployments with metrics)
    metrics.recentPerformance = deployments
      .filter(d => d.completedAt)
      .slice(0, 10)
      .map(d => ({
        deploymentId: d.id,
        version: d.version,
        environment: d.environment,
        status: d.status,
        completedAt: d.completedAt,
        metrics: d.metrics
      }));

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;