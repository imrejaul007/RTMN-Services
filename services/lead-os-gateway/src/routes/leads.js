/**
 * Leads Routes - Lead management endpoints
 */

import express from 'express';
import { searchLeads } from '../services/discoveryService.js';
import { enrichLead } from '../services/enrichmentService.js';
import { scoreLead } from '../services/scoringService.js';
import { qualifyLead } from '../services/qualificationService.js';
import { executeOutreach } from '../services/outreachService.js';
import { syncToCRM } from '../services/crmService.js';
import { validateLead } from '../utils/validators.js';
import logger from '../utils/logger.js';

const router = express.Router();

// In-memory lead storage (for demo purposes)
const leadsStore = new Map();

/**
 * Generate unique lead ID
 */
function generateLeadId() {
  return `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * GET /leads
 * List leads with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { q, type, tier, limit = 50, offset = 0 } = req.query;

    // Search leads
    let results = Array.from(leadsStore.values());

    // Apply filters
    if (q) {
      const query = q.toLowerCase();
      results = results.filter(lead =>
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.company?.toLowerCase().includes(query)
      );
    }

    if (type) {
      results = results.filter(lead => lead.type === type);
    }

    if (tier) {
      results = results.filter(lead => lead.tier === tier);
    }

    // Apply pagination
    const total = results.length;
    results = results.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      leads: results,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('List leads error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to list leads',
      message: error.message
    });
  }
});

/**
 * GET /leads/:id
 * Get single lead by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = leadsStore.get(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      lead
    });
  } catch (error) {
    logger.error('Get lead error', { error: error.message, leadId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get lead',
      message: error.message
    });
  }
});

/**
 * POST /leads
 * Create new lead
 */
router.post('/', async (req, res) => {
  try {
    const leadData = req.body;

    // Validate lead
    const validation = validateLead(leadData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Create lead
    const leadId = generateLeadId();
    const lead = {
      id: leadId,
      ...leadData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store lead
    leadsStore.set(leadId, lead);

    res.status(201).json({
      success: true,
      lead,
      message: 'Lead created successfully'
    });
  } catch (error) {
    logger.error('Create lead error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create lead',
      message: error.message
    });
  }
});

/**
 * PATCH /leads/:id
 * Update lead
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const lead = leadsStore.get(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Update lead
    const updatedLead = {
      ...lead,
      ...updates,
      id: lead.id,
      createdAt: lead.createdAt,
      updatedAt: new Date().toISOString()
    };

    leadsStore.set(id, updatedLead);

    res.json({
      success: true,
      lead: updatedLead,
      message: 'Lead updated successfully'
    });
  } catch (error) {
    logger.error('Update lead error', { error: error.message, leadId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update lead',
      message: error.message
    });
  }
});

/**
 * DELETE /leads/:id
 * Delete lead
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!leadsStore.has(id)) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    leadsStore.delete(id);

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    logger.error('Delete lead error', { error: error.message, leadId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead',
      message: error.message
    });
  }
});

/**
 * POST /leads/:id/enrich
 * Enrich single lead
 */
router.post('/:id/enrich', async (req, res) => {
  try {
    const { id } = req.params;
    let lead = leadsStore.get(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Enrich lead
    const enrichment = await enrichLead(lead);

    // Update lead with enrichment
    lead = {
      ...lead,
      ...enrichment,
      updatedAt: new Date().toISOString()
    };

    leadsStore.set(id, lead);

    res.json({
      success: true,
      lead,
      enrichment
    });
  } catch (error) {
    logger.error('Enrich lead error', { error: error.message, leadId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to enrich lead',
      message: error.message
    });
  }
});

/**
 * POST /leads/:id/score
 * Score single lead
 */
router.post('/:id/score', async (req, res) => {
  try {
    const { id } = req.params;
    let lead = leadsStore.get(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Score lead
    const scoreResult = await scoreLead(lead);

    // Update lead with score
    lead = {
      ...lead,
      score: scoreResult.score,
      tier: scoreResult.tier,
      scoreBreakdown: scoreResult.breakdown,
      scoreFactors: scoreResult.factors,
      updatedAt: new Date().toISOString()
    };

    leadsStore.set(id, lead);

    res.json({
      success: true,
      lead,
      scoring: scoreResult
    });
  } catch (error) {
    logger.error('Score lead error', { error: error.message, leadId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to score lead',
      message: error.message
    });
  }
});

/**
 * POST /leads/:id/qualify
 * Qualify lead
 */
router.post('/:id/qualify', async (req, res) => {
  try {
    const { id } = req.params;
    let lead = leadsStore.get(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Qualify lead
    const qualification = await qualifyLead(lead);

    // Update lead with qualification
    lead = {
      ...lead,
      qualified: qualification.qualified,
      type: qualification.classification.type,
      qualificationConfidence: qualification.classification.confidence,
      qualificationReasons: qualification.classification.reasons,
      qualificationChecks: qualification.checks,
      recommendations: qualification.recommendations,
      updatedAt: new Date().toISOString()
    };

    leadsStore.set(id, lead);

    res.json({
      success: true,
      lead,
      qualification
    });
  } catch (error) {
    logger.error('Qualify lead error', { error: error.message, leadId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to qualify lead',
      message: error.message
    });
  }
});

/**
 * POST /leads/:id/outreach
 * Start outreach for lead
 */
router.post('/:id/outreach', async (req, res) => {
  try {
    const { id } = req.params;
    const { channels } = req.body;

    const lead = leadsStore.get(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Execute outreach
    const outreachResult = await executeOutreach(id, channels || ['email']);

    res.json({
      success: true,
      outreach: outreachResult
    });
  } catch (error) {
    logger.error('Outreach lead error', { error: error.message, leadId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to start outreach',
      message: error.message
    });
  }
});

/**
 * POST /leads/:id/sync
 * Sync lead to CRM
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = leadsStore.get(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Sync to CRM
    const syncResult = await syncToCRM(lead);

    // Update lead with CRM info
    lead = {
      ...lead,
      crmId: syncResult.crmId,
      crmSyncedAt: syncResult.syncedAt,
      updatedAt: new Date().toISOString()
    };

    leadsStore.set(id, lead);

    res.json({
      success: true,
      lead,
      sync: syncResult
    });
  } catch (error) {
    logger.error('Sync lead error', { error: error.message, leadId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to sync lead to CRM',
      message: error.message
    });
  }
});

export default router;
