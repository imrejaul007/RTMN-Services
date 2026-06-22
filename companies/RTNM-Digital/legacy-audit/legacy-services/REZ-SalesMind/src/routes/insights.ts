/**
 * Insights Routes - Market insights and analytics
 */

import { Router } from 'express';
import { IntelligenceEngine } from '../services/intelligenceEngine.js';
import { SignalAggregator } from '../services/signalAggregator.js';

export const insightRoutes = (
  intelligenceEngine: IntelligenceEngine,
  signalAggregator: SignalAggregator
) => {
  const router = Router();

  // Get market insights for an industry
  router.get('/market/:industry', async (req, res) => {
    try {
      const { industry } = req.params;
      const signals = await signalAggregator.getMarketSignals(industry);

      res.json({
        industry,
        signals,
        count: signals.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching market insights:', error);
      res.status(500).json({ error: 'Failed to fetch market insights' });
    }
  });

  // Get intent signals for a prospect
  router.get('/intent/:prospectId', async (req, res) => {
    try {
      const { prospectId } = req.params;
      const signals = await signalAggregator.getIntentSignals(prospectId);

      res.json({
        prospectId,
        signals,
        count: signals.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching intent signals:', error);
      res.status(500).json({ error: 'Failed to fetch intent signals' });
    }
  });

  // Get churn risk signals
  router.get('/churn-risk/:prospectId', async (req, res) => {
    try {
      const { prospectId } = req.params;
      const signals = await signalAggregator.detectChurnRisk(prospectId);

      res.json({
        prospectId,
        riskLevel: signals.length > 5 ? 'high' : signals.length > 2 ? 'medium' : 'low',
        signals,
        count: signals.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error detecting churn risk:', error);
      res.status(500).json({ error: 'Failed to detect churn risk' });
    }
  });

  // Get pipeline summary
  router.get('/pipeline-summary', async (req, res) => {
    try {
      const pipeline = await intelligenceEngine.getPipelineIntelligence();

      res.json({
        ...pipeline,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching pipeline summary:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline summary' });
    }
  });

  // Get engagement analytics
  router.get('/engagement/:leadId', async (req, res) => {
    try {
      const { leadId } = req.params;
      const score = await signalAggregator.getSignalScore(leadId);

      res.json({
        leadId,
        engagement: score,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching engagement analytics:', error);
      res.status(500).json({ error: 'Failed to fetch engagement analytics' });
    }
  });

  return router;
};