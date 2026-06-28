/**
 * Health Routes
 */

import express from 'express';

const router = express.Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'agent-lifecycle',
    timestamp: new Date().toISOString()
  });
});

export default router;