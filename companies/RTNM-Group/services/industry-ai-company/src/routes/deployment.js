import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DEPLOYMENT_STATUS } from '../index.js';

const router = express.Router();

// Deployment registry
const deployments = new Map();

/**
 * GET /api/deployments
 * List all deployments
 */
router.get('/', async (req, res) => {
  try {
    const { status, companyId } = req.query;

    let list = Array.from(deployments.values());

    if (status) list = list.filter(d => d.status === status);
    if (companyId) list = list.filter(d => d.companyId === companyId);

    res.json({
      success: true,
      count: list.length,
      deployments: list
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/deployments
 * Create deployment
 */
router.post('/', async (req, res) => {
  try {
    const {
      companyId,
      capabilityId,
      environment = 'production',
      config = {}
    } = req.body;

    if (!companyId || !capabilityId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID and capability ID are required'
      });
    }

    const deploymentId = `deploy_${uuidv4()}`;
    const deployment = {
      id: deploymentId,
      companyId,
      capabilityId,
      environment,
      config,
      status: DEPLOYMENT_STATUS.PLANNING,
      progress: 0,
      logs: [],
      createdAt: new Date().toISOString()
    };

    deployments.set(deploymentId, deployment);

    res.status(201).json({
      success: true,
      deployment
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/deployments/:id
 * Get deployment details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deployment = deployments.get(id);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    res.json({
      success: true,
      deployment
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/deployments/:id/status
 * Update deployment status
 */
router.post('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, progress, message } = req.body;

    const deployment = deployments.get(id);
    if (!deployment) {
      return res.status(404).json({ success: false, error: 'Deployment not found' });
    }

    deployment.status = status || deployment.status;
    deployment.progress = progress !== undefined ? progress : deployment.progress;

    if (message) {
      deployment.logs.push({
        timestamp: new Date().toISOString(),
        message
      });
    }

    deployments.set(id, deployment);

    res.json({
      success: true,
      deployment
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
