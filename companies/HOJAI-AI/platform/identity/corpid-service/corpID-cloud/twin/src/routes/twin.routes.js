/**
 * CorpID Cloud - Identity Twin Routes
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../../shared/utils/logger.js';
import {
  identityTwins,
  twinSimulations,
  getOrCreateTwin,
  getTwin,
  refreshTwin,
  updateTwin,
  runSimulation,
  getTwinStats
} from '../models/twin.model.js';

const router = express.Router();

/**
 * Get my identity twin
 * GET /api/twin/me
 */
router.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const twin = getTwin(req.user.id);
    res.json({ success: true, twin });
  })
);

/**
 * Refresh my identity twin
 * POST /api/twin/me/refresh
 */
router.post('/me/refresh',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const twin = refreshTwin(req.user.id);
    dataAudit('twin.refreshed', req, 'identity_twin', twin.id);
    res.json({ success: true, message: 'Twin refreshed', twin });
  })
);

/**
 * Update my identity twin
 * PUT /api/twin/me
 */
router.put('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const twin = updateTwin(req.user.id, req.body);
    dataAudit('twin.updated', req, 'identity_twin', twin.id);
    res.json({ success: true, twin });
  })
);

/**
 * Run simulation
 * POST /api/twin/me/simulate
 */
router.post('/me/simulate',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { name, type, parameters } = req.body;
    if (!type) {
      throw new AppError('Simulation type is required', 400, 'VALIDATION_ERROR');
    }

    const result = runSimulation(req.user.id, { name, type, parameters });
    dataAudit('twin.simulation_run', req, 'identity_twin', result.id, { type });

    res.json({ success: true, simulation: result });
  })
);

/**
 * Get twin predictions
 * GET /api/twin/me/predictions
 */
router.get('/me/predictions',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const twin = refreshTwin(req.user.id);
    res.json({
      success: true,
      predictions: twin.predictions,
      state: twin.state
    });
  })
);

/**
 * Get twin profile
 * GET /api/twin/me/profile
 */
router.get('/me/profile',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const twin = getTwin(req.user.id);
    res.json({
      success: true,
      profile: {
        demographics: twin.profile.demographics,
        psychographics: twin.profile.psychographics,
        technographics: twin.profile.technographics,
        preferences: {
          explicit: twin.preferences.explicit,
          inferred: twin.preferences.inferred
        }
      }
    });
  })
);

/**
 * Get twin behaviors
 * GET /api/twin/me/behaviors
 */
router.get('/me/behaviors',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const twin = getTwin(req.user.id);
    res.json({ success: true, behaviors: twin.behaviors });
  })
);

// ============ ADMIN ROUTES ============

/**
 * Get twin for user (admin)
 * GET /api/twin/user/:userId
 */
router.get('/user/:userId',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const twin = getTwin(req.params.userId);
    res.json({ success: true, twin });
  })
);

/**
 * Get twin statistics
 * GET /api/twin/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const stats = getTwinStats();
    res.json({ success: true, stats });
  })
);

/**
 * Get simulation by ID
 * GET /api/twin/simulations/:id
 */
router.get('/simulations/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const sim = twinSimulations.get(req.params.id);
    if (!sim) {
      throw new AppError('Simulation not found', 404, 'SIMULATION_NOT_FOUND');
    }
    if (sim.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }
    res.json({ success: true, simulation: sim });
  })
);

export default router;
