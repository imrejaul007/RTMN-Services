/**
 * Grocery Briefing Routes
 */

const express = require('express');
const router = express.Router();
const briefingService = require('../services/briefing.service');

/**
 * POST /api/briefing/generate
 * Generate morning briefing
 */
router.post('/generate', async (req, res) => {
  try {
    const { ownerId, storeId, date } = req.body;
    const briefing = await briefingService.generateBriefing(ownerId, storeId, date ? new Date(date) : new Date());
    res.json({ success: true, briefing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/briefing/:ownerId
 * Get briefing for owner
 */
router.get('/:ownerId', async (req, res) => {
  try {
    const { date } = req.query;
    const briefing = await briefingService.getBriefing(req.params.ownerId, date || new Date());
    res.json({ success: true, briefing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/briefing/:ownerId/history
 * Get briefing history
 */
router.get('/:ownerId/history', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const briefings = await briefingService.getBriefingHistory(req.params.ownerId, parseInt(days));
    res.json({ success: true, briefings, count: briefings.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/briefing/:briefingId/delivered
 * Mark as delivered
 */
router.post('/:briefingId/delivered', async (req, res) => {
  try {
    const briefing = await briefingService.markDelivered(req.params.briefingId);
    res.json({ success: true, briefing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/briefing/:briefingId/read
 * Mark as read
 */
router.post('/:briefingId/read', async (req, res) => {
  try {
    const briefing = await briefingService.markRead(req.params.briefingId);
    res.json({ success: true, briefing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
