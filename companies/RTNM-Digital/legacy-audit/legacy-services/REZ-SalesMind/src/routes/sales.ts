/**
 * Sales Routes - Lead and deal management
 */

import { Router } from 'express';
import { IntelligenceEngine } from '../services/intelligenceEngine.js';
import { TwinService } from '../services/twinService.js';
import { SignalAggregator } from '../services/signalAggregator.js';

export const salesRoutes = (
  intelligenceEngine: IntelligenceEngine,
  twinService: TwinService,
  signalAggregator: SignalAggregator
) => {
  const router = Router();

  // Get sales intelligence for a lead
  router.get('/intelligence/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const intelligence = await intelligenceEngine.getSalesIntelligence(leadId);

      if (!intelligence) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json(intelligence);
    } catch (error) {
      console.error('Error fetching sales intelligence:', error);
      res.status(500).json({ error: 'Failed to fetch sales intelligence' });
    }
  });

  // Get pre-call brief
  router.get('/pre-call/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const brief = await intelligenceEngine.getPreCallBrief(leadId);

      if (!brief) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json(brief);
    } catch (error) {
      console.error('Error generating pre-call brief:', error);
      res.status(500).json({ error: 'Failed to generate pre-call brief' });
    }
  });

  // Get prospect twin
  router.get('/twin/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const twin = await twinService.getTwin(leadId);

      if (!twin) {
        return res.status(404).json({ error: 'Prospect not found' });
      }

      res.json(twin);
    } catch (error) {
      console.error('Error fetching prospect twin:', error);
      res.status(500).json({ error: 'Failed to fetch prospect twin' });
    }
  });

  // Get talking points for a lead
  router.get('/talking-points/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const points = await twinService.getTalkingPoints(leadId);

      res.json({ talkingPoints: points });
    } catch (error) {
      console.error('Error fetching talking points:', error);
      res.status(500).json({ error: 'Failed to fetch talking points' });
    }
  });

  // Get next best action
  router.get('/next-action/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const action = await twinService.predictNextAction(leadId);

      res.json(action);
    } catch (error) {
      console.error('Error predicting next action:', error);
      res.status(500).json({ error: 'Failed to predict next action' });
    }
  });

  // Get aggregated signals
  router.get('/signals/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const signals = await signalAggregator.aggregateSignals(leadId);

      res.json({ signals, count: signals.length });
    } catch (error) {
      console.error('Error aggregating signals:', error);
      res.status(500).json({ error: 'Failed to aggregate signals' });
    }
  });

  // Get signal score
  router.get('/signal-score/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const score = await signalAggregator.getSignalScore(leadId);

      res.json(score);
    } catch (error) {
      console.error('Error calculating signal score:', error);
      res.status(500).json({ error: 'Failed to calculate signal score' });
    }
  });

  // Get buying signals
  router.get('/buying-signals/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const signals = await signalAggregator.detectBuyingSignals(leadId);

      res.json({ signals, count: signals.length });
    } catch (error) {
      console.error('Error detecting buying signals:', error);
      res.status(500).json({ error: 'Failed to detect buying signals' });
    }
  });

  // Get pipeline intelligence
  router.get('/pipeline', async (req, res) => {
    try {
      const pipeline = await intelligenceEngine.getPipelineIntelligence();
      res.json(pipeline);
    } catch (error) {
      console.error('Error fetching pipeline intelligence:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline intelligence', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  return router;
};