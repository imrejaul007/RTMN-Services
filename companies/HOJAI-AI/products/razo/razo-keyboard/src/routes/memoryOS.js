/**
 * MemoryOS Routes - Phase 4
 * Routes for MemoryOS/TwinOS integration
 */

const MemoryOSIntegration = require('../services/memoryOSIntegration');

/**
 * Create MemoryOS routes
 */
function createMemoryOSRoutes(logger) {
  const router = require('express').Router();
  const memoryOS = new MemoryOSIntegration(logger);

  /**
   * GET /api/memory/context/:userId
   * Get user context from MemoryOS
   */
  router.get('/context/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const context = await memoryOS.getUserContext(userId, req.query);
      res.json({ success: true, context });
    } catch (error) {
      logger.error('Failed to get user context', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/memory/context/:userId
   * Save user context to MemoryOS
   */
  router.post('/context/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { context, type } = req.body;
      const result = await memoryOS.saveUserContext(userId, context, type);
      res.json(result);
    } catch (error) {
      logger.error('Failed to save user context', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/memory/history/:userId
   * Get conversation history
   */
  router.get('/history/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const history = await memoryOS.getConversationHistory(userId, req.query);
      res.json({ success: true, history });
    } catch (error) {
      logger.error('Failed to get conversation history', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/memory/preferences/:userId
   * Get user preferences
   */
  router.get('/preferences/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const preferences = await memoryOS.getUserPreferences(userId);
      res.json({ success: true, preferences });
    } catch (error) {
      logger.error('Failed to get user preferences', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/memory/preferences/:userId
   * Update user preferences
   */
  router.put('/preferences/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await memoryOS.updateUserPreferences(userId, req.body);
      res.json(result);
    } catch (error) {
      logger.error('Failed to update user preferences', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/memory/twin/customer/:userId
   * Get customer twin data
   */
  router.get('/twin/customer/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const twin = await memoryOS.getCustomerTwin(userId);
      res.json({ success: true, twin });
    } catch (error) {
      logger.error('Failed to get customer twin', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/memory/twin/merchant/:merchantId
   * Get merchant twin data
   */
  router.get('/twin/merchant/:merchantId', async (req, res) => {
    try {
      const { merchantId } = req.params;
      const twin = await memoryOS.getMerchantTwin(merchantId);
      res.json({ success: true, twin });
    } catch (error) {
      logger.error('Failed to get merchant twin', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/memory/learn/:userId
   * Learn from user behavior
   */
  router.post('/learn/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await memoryOS.learnFromBehavior(userId, req.body);
      res.json(result);
    } catch (error) {
      logger.error('Failed to learn from behavior', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/memory/recommendations/:userId
   * Get personalized recommendations
   */
  router.get('/recommendations/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const recommendations = await memoryOS.getRecommendations(userId, req.query);
      res.json(recommendations);
    } catch (error) {
      logger.error('Failed to get recommendations', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/memory/search/:userId
   * Search memory
   */
  router.get('/search/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'q (query) parameter is required' });
      }

      const results = await memoryOS.searchMemory(userId, q);
      res.json({ success: true, ...results });
    } catch (error) {
      logger.error('Memory search failed', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/memory/stats
   * Get MemoryOS integration stats
   */
  router.get('/stats', (req, res) => {
    res.json({ success: true, stats: memoryOS.getStats() });
  });

  return router;
}

module.exports = { createMemoryOSRoutes };
