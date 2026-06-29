/**
 * Genie Intelligence Routes
 *
 * Express routes that connect Genie Gateway to Intelligence Gateway
 * Enables Genie to leverage AI intelligence services
 *
 * @routePrefix /api/intelligence
 */

import express from 'express';
import { intelligenceBridge } from '../services/intelligence-bridge.js';

const router = express.Router();

// ===== AI ANALYSIS =====

/**
 * POST /api/intelligence/analyze
 * Analyze text for intent, sentiment, entities
 */
router.post('/analyze', async (req, res) => {
  try {
    const { text, userId } = req.body;
    const result = await intelligenceBridge.analyze(text, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'ANALYSIS_FAILED', message: error.message });
  }
});

/**
 * POST /api/intelligence/intent
 * Detect user intent from text
 */
router.post('/intent', async (req, res) => {
  try {
    const { text, userId } = req.body;
    const result = await intelligenceBridge.detectIntent(text, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'INTENT_DETECTION_FAILED', message: error.message });
  }
});

/**
 * POST /api/intelligence/sentiment
 * Analyze text sentiment
 */
router.post('/sentiment', async (req, res) => {
  try {
    const { text } = req.body;
    const result = await intelligenceBridge.analyzeSentiment(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'SENTIMENT_FAILED', message: error.message });
  }
});

// ===== PREDICTIVE =====

/**
 * POST /api/intelligence/forecast
 * Forecast demand/trends
 */
router.post('/forecast', async (req, res) => {
  try {
    const { metric, history } = req.body;
    const result = await intelligenceBridge.forecast(metric, history);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'FORECAST_FAILED', message: error.message });
  }
});

/**
 * POST /api/intelligence/anomaly
 * Detect anomalies
 */
router.post('/anomaly', async (req, res) => {
  try {
    const { value, baseline } = req.body;
    const result = await intelligenceBridge.detectAnomaly(value, baseline);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'ANOMALY_DETECTION_FAILED', message: error.message });
  }
});

// ===== RISK =====

/**
 * POST /api/intelligence/fraud-score
 * Score fraud risk
 */
router.post('/fraud-score', async (req, res) => {
  try {
    const { userId, transaction } = req.body;
    const result = await intelligenceBridge.fraudScore(userId, transaction);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'FRAUD_SCORING_FAILED', message: error.message });
  }
});

/**
 * POST /api/intelligence/churn-score
 * Predict churn probability
 */
router.post('/churn-score', async (req, res) => {
  try {
    const { userId, metrics } = req.body;
    const result = await intelligenceBridge.churnScore(userId, metrics);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'CHURN_SCORING_FAILED', message: error.message });
  }
});

// ===== DECISIONS =====

/**
 * POST /api/intelligence/recommend
 * Get personalized recommendations
 */
router.post('/recommend', async (req, res) => {
  try {
    const { userId, category, limit } = req.body;
    const result = await intelligenceBridge.recommend(userId, category, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'RECOMMENDATION_FAILED', message: error.message });
  }
});

/**
 * POST /api/intelligence/nba
 * Get Next Best Action
 */
router.post('/nba', async (req, res) => {
  try {
    const { userId, context } = req.body;
    const result = await intelligenceBridge.nextBestAction(userId, context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'NBA_FAILED', message: error.message });
  }
});

// ===== REASONING =====

/**
 * POST /api/intelligence/reason
 * Chain-of-thought reasoning
 */
router.post('/reason', async (req, res) => {
  try {
    const { query, strategy } = req.body;
    const result = await intelligenceBridge.reason(query, strategy);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'REASONING_FAILED', message: error.message });
  }
});

// ===== PERSONALIZATION =====

/**
 * GET /api/intelligence/profile/:userId
 * Get user profile
 */
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await intelligenceBridge.getUserProfile(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'PROFILE_FETCH_FAILED', message: error.message });
  }
});

/**
 * POST /api/intelligence/track
 * Track user preference
 */
router.post('/track', async (req, res) => {
  try {
    const { userId, action, itemId, itemType } = req.body;
    const result = await intelligenceBridge.trackPreference(userId, action, itemId, itemType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'TRACKING_FAILED', message: error.message });
  }
});

// ===== KNOWLEDGE =====

/**
 * POST /api/intelligence/search
 * Search knowledge base
 */
router.post('/search', async (req, res) => {
  try {
    const { query, type } = req.body;
    const result = await intelligenceBridge.searchKnowledge(query, type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'KNOWLEDGE_SEARCH_FAILED', message: error.message });
  }
});

/**
 * GET /api/intelligence/knowledge/:assetId
 * Get knowledge asset
 */
router.get('/knowledge/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const result = await intelligenceBridge.getKnowledgeAsset(assetId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'ASSET_FETCH_FAILED', message: error.message });
  }
});

// ===== PLANNING =====

/**
 * POST /api/intelligence/plan
 * Create plan from goal
 */
router.post('/plan', async (req, res) => {
  try {
    const { name, goal, owner } = req.body;
    const result = await intelligenceBridge.createPlan(name, goal, owner);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'PLAN_CREATION_FAILED', message: error.message });
  }
});

/**
 * POST /api/intelligence/plan/:planId/execute
 * Execute plan
 */
router.post('/plan/:planId/execute', async (req, res) => {
  try {
    const { planId } = req.params;
    const context = req.body;
    const result = await intelligenceBridge.executePlan(planId, context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'PLAN_EXECUTION_FAILED', message: error.message });
  }
});

// ===== REFLECTION =====

/**
 * POST /api/intelligence/reflect
 * Score content quality
 */
router.post('/reflect', async (req, res) => {
  try {
    const { text, dimensions } = req.body;
    const result = await intelligenceBridge.reflect(text, dimensions);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'REFLECTION_FAILED', message: error.message });
  }
});

// ===== PROACTIVE =====

/**
 * POST /api/intelligence/suggest
 * Get proactive suggestions
 */
router.post('/suggest', async (req, res) => {
  try {
    const { userId, context } = req.body;
    const result = await intelligenceBridge.suggest(userId, context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'SUGGESTION_FAILED', message: error.message });
  }
});

// ===== BATCH & CHAIN =====

/**
 * POST /api/intelligence/batch
 * Batch multiple requests
 */
router.post('/batch', async (req, res) => {
  try {
    const { requests } = req.body;
    const result = await intelligenceBridge.batch(requests);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'BATCH_FAILED', message: error.message });
  }
});

/**
 * POST /api/intelligence/chain
 * Chain multiple services
 */
router.post('/chain', async (req, res) => {
  try {
    const { steps } = req.body;
    const result = await intelligenceBridge.chain(steps);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'CHAIN_FAILED', message: error.message });
  }
});

// ===== HEALTH =====

/**
 * GET /api/intelligence/health
 * Check gateway health
 */
router.get('/health', async (req, res) => {
  try {
    const result = await intelligenceBridge.health();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'HEALTH_CHECK_FAILED', message: error.message });
  }
});

/**
 * GET /api/intelligence/services
 * Get all services status
 */
router.get('/services', async (req, res) => {
  try {
    const result = await intelligenceBridge.servicesHealth();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'SERVICES_CHECK_FAILED', message: error.message });
  }
});

export default router;
