/**
 * Version Routes - Version management endpoints
 */

import express from 'express';
import * as registry from '../registry.js';

const router = express.Router();

/**
 * GET /api/versions/:agentId/:version
 * Get specific version details
 */
router.get('/:agentId/:version', (req, res) => {
  try {
    const agent = registry.getAgentById(req.params.agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const version = registry.getVersion(req.params.agentId, req.params.version);

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/versions/:agentId/latest
 * Get latest version for an agent
 */
router.get('/:agentId/latest', (req, res) => {
  try {
    const agent = registry.getAgentById(req.params.agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const version = registry.getLatestVersion(req.params.agentId);

    if (!version) {
      return res.status(404).json({ error: 'No versions found for this agent' });
    }

    res.json(version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;