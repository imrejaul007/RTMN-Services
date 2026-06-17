/**
 * Outreach Routes - Multi-channel outreach endpoints
 */

import express from 'express';
import { createSequence, executeOutreach, getCampaignStatus, pauseCampaign, resumeCampaign, CHANNELS, TEMPLATES } from '../services/outreachService.js';
import { validateOutreachRequest } from '../utils/validators.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /outreach/sequence
 * Create outreach sequence
 */
router.post('/sequence', async (req, res) => {
  try {
    const { name, steps, leadIds } = req.body;

    if (!name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        error: 'name and steps array are required'
      });
    }

    const result = await createSequence(name, steps, leadIds || []);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Create sequence error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create sequence',
      message: error.message
    });
  }
});

/**
 * POST /outreach/execute
 * Execute outreach for a lead
 */
router.post('/execute', async (req, res) => {
  try {
    const { leadId, channels } = req.body;

    const validation = validateOutreachRequest({ leadId });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    const result = await executeOutreach(leadId, channels || ['email', 'linkedin', 'phone']);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Execute outreach error', { error: error.message, leadId: req.body.leadId });
    res.status(500).json({
      success: false,
      error: 'Outreach execution failed',
      message: error.message
    });
  }
});

/**
 * GET /outreach/status/:campaignId
 * Get campaign status
 */
router.get('/status/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const result = await getCampaignStatus(campaignId);

    res.json({
      success: true,
      campaignId,
      ...result
    });
  } catch (error) {
    logger.error('Get campaign status error', { error: error.message, campaignId: req.params.campaignId });
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign status',
      message: error.message
    });
  }
});

/**
 * POST /outreach/pause
 * Pause outreach campaign
 */
router.post('/pause', async (req, res) => {
  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'campaignId is required'
      });
    }

    const result = await pauseCampaign(campaignId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Pause campaign error', { error: error.message, campaignId: req.body.campaignId });
    res.status(500).json({
      success: false,
      error: 'Failed to pause campaign',
      message: error.message
    });
  }
});

/**
 * POST /outreach/resume
 * Resume outreach campaign
 */
router.post('/resume', async (req, res) => {
  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'campaignId is required'
      });
    }

    const result = await resumeCampaign(campaignId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Resume campaign error', { error: error.message, campaignId: req.body.campaignId });
    res.status(500).json({
      success: false,
      error: 'Failed to resume campaign',
      message: error.message
    });
  }
});

/**
 * GET /outreach/channels
 * Get available outreach channels
 */
router.get('/channels', async (req, res) => {
  res.json({
    success: true,
    channels: Object.values(CHANNELS)
  });
});

/**
 * GET /outreach/templates
 * Get outreach templates
 */
router.get('/templates', async (req, res) => {
  res.json({
    success: true,
    templates: TEMPLATES
  });
});

export default router;
