/**
 * Scoring Routes - Lead scoring endpoints
 */

import express from 'express';
import { scoreLead, bulkScore, getLeadScore } from '../services/scoringService.js';
import { validateScoreRequest } from '../utils/validators.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /score/lead
 * Score a single lead
 */
router.post('/lead', async (req, res) => {
  try {
    const leadData = req.body;

    const validation = validateScoreRequest(leadData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    const result = await scoreLead(leadData);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Lead scoring error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Scoring failed',
      message: error.message
    });
  }
});

/**
 * POST /score/bulk
 * Bulk score multiple leads
 */
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({
        success: false,
        error: 'leads array is required'
      });
    }

    const result = await bulkScore(leads);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Bulk scoring error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Bulk scoring failed',
      message: error.message
    });
  }
});

/**
 * GET /score/:leadId
 * Get score for a specific lead
 */
router.get('/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const result = await getLeadScore(leadId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Get lead score error', { error: error.message, leadId: req.params.leadId });
    res.status(500).json({
      success: false,
      error: 'Failed to get lead score',
      message: error.message
    });
  }
});

export default router;
