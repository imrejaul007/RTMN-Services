/**
 * Discovery Routes - Lead discovery endpoints
 */

import express from 'express';
import { discoverGooglePlaces, searchLeads, batchDiscover, getCompanyDetails } from '../services/discoveryService.js';
import { validateDiscoveryRequest } from '../utils/validators.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /discover/google
 * Discover companies from Google Places
 */
router.get('/google', async (req, res) => {
  try {
    const { query, location } = req.query;

    const result = await discoverGooglePlaces(query, location);

    res.json({
      success: true,
      query,
      location,
      ...result
    });
  } catch (error) {
    logger.error('Google discovery error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Discovery failed',
      message: error.message
    });
  }
});

/**
 * GET /discover/search
 * Search for leads across multiple sources
 */
router.get('/search', async (req, res) => {
  try {
    const { query, industry, location, size } = req.query;

    const validation = validateDiscoveryRequest({ query, location });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    const filters = { industry, location, size: parseInt(size) || 50 };
    const result = await searchLeads(query, filters);

    res.json(result);
  } catch (error) {
    logger.error('Lead search error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * POST /discover/batch
 * Batch discover companies
 */
router.post('/batch', async (req, res) => {
  try {
    const { queries } = req.body;

    if (!queries || !Array.isArray(queries)) {
      return res.status(400).json({
        success: false,
        error: 'queries array is required'
      });
    }

    const result = await batchDiscover(queries);

    res.json(result);
  } catch (error) {
    logger.error('Batch discovery error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Batch discovery failed',
      message: error.message
    });
  }
});

/**
 * GET /discover/company/:companyId
 * Get company details from knowledge graph
 */
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await getCompanyDetails(companyId);

    res.json(result);
  } catch (error) {
    logger.error('Company details error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get company details',
      message: error.message
    });
  }
});

export default router;
