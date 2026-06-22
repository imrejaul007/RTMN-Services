/**
 * Leads Routes - Lead management and enrichment
 */

import { Router } from 'express';
import { IntelligenceEngine } from '../services/intelligenceEngine.js';
import { HojaiAIClient } from '../services/hojaiClient.js';

export const leadRoutes = (
  intelligenceEngine: IntelligenceEngine,
  hojaiClient: HojaiAIClient
) => {
  const router = Router();

  // Get all leads
  router.get('/', async (req, res) => {
    try {
      const { stage, owner } = req.query;
      const result = await intelligenceEngine.getCRMClient().getLeads({
        stage: stage as string,
        owner: owner as string
      });

      res.json({ leads: result.data, count: result.data.length, error: result.error });
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: 'Failed to fetch leads', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get lead by ID
  router.get('/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const result = await intelligenceEngine.getCRMClient().getLead(leadId);

      if (!result.data) {
        return res.status(404).json({ error: 'Lead not found', details: result.error });
      }

      res.json(result.data);
    } catch (error) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ error: 'Failed to fetch lead', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Create new lead
  router.post('/', async (req, res) => {
    try {
      const leadData = req.body;
      const result = await intelligenceEngine.getCRMClient().createLead(leadData);

      if (!result.data) {
        return res.status(500).json({ error: 'Failed to create lead', details: result.error });
      }

      res.status(201).json(result.data);
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Failed to create lead', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Update lead stage
  router.patch('/:leadId/stage', async (req, res) => {
    try {
      const { leadId } = req.params;
      const { stage } = req.body;

      const result = await intelligenceEngine.getCRMClient().updateLeadStage(leadId, stage);

      if (!result.success) {
        return res.status(500).json({ error: 'Failed to update lead stage', details: result.error });
      }

      res.json({ success: true, leadId, stage });
    } catch (error) {
      console.error('Error updating lead stage:', error);
      res.status(500).json({ error: 'Failed to update lead stage', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Enrich lead with AI
  router.post('/:leadId/enrich', async (req, res) => {
    try {
      const { leadId } = req.params;
      const enriched = await hojaiClient.enrichLead(leadId);

      res.json({
        leadId,
        enriched: enriched || false,
        data: enriched
      });
    } catch (error) {
      console.error('Error enriching lead:', error);
      res.status(500).json({ error: 'Failed to enrich lead' });
    }
  });

  // Score lead with AI
  router.post('/:leadId/score', async (req, res) => {
    try {
      const { leadId } = req.params;
      const result = await intelligenceEngine.getCRMClient().getLead(leadId);

      if (!result.data) {
        return res.status(404).json({ error: 'Lead not found', details: result.error });
      }

      const scoring = await hojaiClient.scoreLead(result.data);

      res.json({
        leadId,
        score: scoring.score,
        factors: scoring.factors,
        recommendations: scoring.recommendations
      });
    } catch (error) {
      console.error('Error scoring lead:', error);
      res.status(500).json({ error: 'Failed to score lead', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  return router;
};