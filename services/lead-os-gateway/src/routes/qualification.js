/**
 * Qualification Routes - Lead qualification endpoints
 */

import express from 'express';
import { qualifyLead, classifyLeads, getLeadTypes } from '../services/qualificationService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /qualify/lead
 * Qualify a single lead
 */
router.post('/lead', async (req, res) => {
  try {
    const leadData = req.body;

    if (!leadData.id && !leadData.email && !leadData.company) {
      return res.status(400).json({
        success: false,
        error: 'leadId, email, or company is required'
      });
    }

    const result = await qualifyLead(leadData);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Lead qualification error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Qualification failed',
      message: error.message
    });
  }
});

/**
 * POST /qualify/classify
 * Classify multiple leads
 */
router.post('/classify', async (req, res) => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({
        success: false,
        error: 'leads array is required'
      });
    }

    const result = await classifyLeads(leads);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Lead classification error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Classification failed',
      message: error.message
    });
  }
});

/**
 * GET /qualify/types
 * Get all lead type definitions
 */
router.get('/types', async (req, res) => {
  try {
    const types = getLeadTypes();

    res.json({
      success: true,
      types
    });
  } catch (error) {
    logger.error('Get lead types error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get lead types',
      message: error.message
    });
  }
});

export default router;
