/**
 * Enrichment Routes - Data enrichment endpoints
 */

import express from 'express';
import { enrichCompany, enrichContact, bulkEnrich, getJobStatus, enrichLead } from '../services/enrichmentService.js';
import { validateEnrichment } from '../utils/validators.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /enrich/company
 * Enrich company data
 */
router.post('/company', async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain is required'
      });
    }

    const result = await enrichCompany(domain);

    res.json(result);
  } catch (error) {
    logger.error('Company enrichment error', { error: error.message, domain });
    res.status(500).json({
      success: false,
      error: 'Enrichment failed',
      message: error.message
    });
  }
});

/**
 * POST /enrich/contact
 * Enrich contact data
 */
router.post('/contact', async (req, res) => {
  try {
    const { email, name, company } = req.body;

    const validation = validateEnrichment({ email, domain: company });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    const result = await enrichContact(email, name, company);

    res.json(result);
  } catch (error) {
    logger.error('Contact enrichment error', { error: error.message, email });
    res.status(500).json({
      success: false,
      error: 'Enrichment failed',
      message: error.message
    });
  }
});

/**
 * POST /enrich/bulk
 * Bulk enrichment
 */
router.post('/bulk', async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'records array is required'
      });
    }

    const result = await bulkEnrich(records);

    res.json(result);
  } catch (error) {
    logger.error('Bulk enrichment error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Bulk enrichment failed',
      message: error.message
    });
  }
});

/**
 * GET /enrich/status/:jobId
 * Get enrichment job status
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = getJobStatus(jobId);

    if (!status.found) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      jobId,
      ...status
    });
  } catch (error) {
    logger.error('Job status error', { error: error.message, jobId: req.params.jobId });
    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
      message: error.message
    });
  }
});

/**
 * POST /enrich/lead
 * Enrich a complete lead (company + contact)
 */
router.post('/lead', async (req, res) => {
  try {
    const lead = req.body;

    if (!lead.email && !lead.companyDomain && !lead.company?.name) {
      return res.status(400).json({
        success: false,
        error: 'Email, companyDomain, or company.name is required'
      });
    }

    const result = await enrichLead(lead);

    res.json(result);
  } catch (error) {
    logger.error('Lead enrichment error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Lead enrichment failed',
      message: error.message
    });
  }
});

export default router;
