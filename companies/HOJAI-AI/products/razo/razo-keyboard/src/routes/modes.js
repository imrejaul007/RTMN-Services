/**
 * Phase 2 Modes Routes
 * Founder Mode, Negotiation Mode, Photo Intelligence
 */

const FounderMode = require('../modes/founder');
const NegotiationMode = require('../modes/negotiation');
const PhotoIntelligence = require('../modes/photoIntelligence');

/**
 * Create Phase 2 mode routes
 */
function createPhase2Routes(logger) {
  const router = require('express').Router();

  // Initialize Phase 2 modes
  const founderMode = new FounderMode(logger);
  const negotiationMode = new NegotiationMode(logger);
  const photoIntelligence = new PhotoIntelligence(logger);

  // ── Founder Mode Routes ─────────────────────────────────────────────

  /**
   * GET /api/modes/founder/config
   * Get founder mode UI configuration
   */
  router.get('/founder/config', (req, res) => {
    try {
      res.json(founderMode.getUIConfig());
    } catch (error) {
      logger.error('Failed to get founder config', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/modes/founder/generate
   * Generate content for specific audience
   */
  router.post('/founder/generate', async (req, res) => {
    try {
      const { text, audience, tone, context, userId } = req.body;

      if (!audience) {
        return res.status(400).json({ error: 'audience is required' });
      }

      const result = await founderMode.generateContent({ text, audience, tone, context, userId });
      res.json(result);
    } catch (error) {
      logger.error('Failed to generate founder content', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/modes/founder/templates/:audience
   * Get templates for specific audience
   */
  router.get('/founder/templates/:audience', (req, res) => {
    try {
      const templates = founderMode.getTemplates(req.params.audience);
      res.json({ success: true, templates });
    } catch (error) {
      logger.error('Failed to get templates', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/modes/founder/milestone-types
   * Get milestone types for tracking
   */
  router.get('/founder/milestone-types', (req, res) => {
    try {
      res.json({ success: true, types: founderMode.getMilestoneTypes() });
    } catch (error) {
      logger.error('Failed to get milestone types', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ── Negotiation Mode Routes ─────────────────────────────────────────

  /**
   * GET /api/modes/negotiation/config
   * Get negotiation mode UI configuration
   */
  router.get('/negotiation/config', (req, res) => {
    try {
      res.json(negotiationMode.getUIConfig());
    } catch (error) {
      logger.error('Failed to get negotiation config', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/modes/negotiation/start
   * Start a new negotiation
   */
  router.post('/negotiation/start', async (req, res) => {
    try {
      const { userId, sellerPrice, item, category, context } = req.body;

      if (!sellerPrice || !item) {
        return res.status(400).json({ error: 'sellerPrice and item are required' });
      }

      const result = await negotiationMode.startNegotiation({
        userId,
        sellerPrice,
        item,
        category: category || 'other',
        context
      });
      res.json(result);
    } catch (error) {
      logger.error('Failed to start negotiation', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/modes/negotiation/counter
   * Make a counter offer
   */
  router.post('/negotiation/counter', async (req, res) => {
    try {
      const { negotiationId, yourOffer, message, tactic } = req.body;

      if (!negotiationId || !yourOffer) {
        return res.status(400).json({ error: 'negotiationId and yourOffer are required' });
      }

      const result = await negotiationMode.counterOffer({
        negotiationId,
        yourOffer,
        message,
        tactic
      });
      res.json(result);
    } catch (error) {
      logger.error('Failed to counter offer', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/modes/negotiation/accept
   * Accept current offer
   */
  router.post('/negotiation/accept', (req, res) => {
    try {
      const { negotiationId } = req.body;

      if (!negotiationId) {
        return res.status(400).json({ error: 'negotiationId is required' });
      }

      const result = negotiationMode.acceptOffer({ negotiationId });
      res.json(result);
    } catch (error) {
      logger.error('Failed to accept offer', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/modes/negotiation/walk-away
   * Walk away from negotiation
   */
  router.post('/negotiation/walk-away', (req, res) => {
    try {
      const { negotiationId } = req.body;

      if (!negotiationId) {
        return res.status(400).json({ error: 'negotiationId is required' });
      }

      const result = negotiationMode.walkAway({ negotiationId });
      res.json(result);
    } catch (error) {
      logger.error('Failed to walk away', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/modes/negotiation/status/:negotiationId
   * Get negotiation status
   */
  router.get('/negotiation/status/:negotiationId', (req, res) => {
    try {
      const result = negotiationMode.getStatus(req.params.negotiationId);
      res.json(result);
    } catch (error) {
      logger.error('Failed to get negotiation status', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ── Photo Intelligence Routes ───────────────────────────────────────

  /**
   * GET /api/modes/photo/config
   * Get photo intelligence UI configuration
   */
  router.get('/photo/config', (req, res) => {
    try {
      res.json(photoIntelligence.getUIConfig());
    } catch (error) {
      logger.error('Failed to get photo config', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/modes/photo/analyze
   * Analyze a photo
   */
  router.post('/photo/analyze', async (req, res) => {
    try {
      const { imageData, photoType, action, userId, context } = req.body;

      if (!imageData || !photoType) {
        return res.status(400).json({ error: 'imageData and photoType are required' });
      }

      const result = await photoIntelligence.analyze({
        imageData,
        photoType,
        action,
        userId,
        context
      });
      res.json(result);
    } catch (error) {
      logger.error('Failed to analyze photo', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/modes/photo/action
   * Execute action on extracted data
   */
  router.post('/photo/action', async (req, res) => {
    try {
      const { action, extractedData, userId } = req.body;

      if (!action || !extractedData) {
        return res.status(400).json({ error: 'action and extractedData are required' });
      }

      // Get suggested actions based on data
      const suggestedActions = photoIntelligence.getSuggestedActions(extractedData);
      res.json({ success: true, suggestedActions });
    } catch (error) {
      logger.error('Failed to execute photo action', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ── Stats Route ──────────────────────────────────────────────────────

  /**
   * GET /api/modes/stats
   * Get stats for all Phase 2 modes
   */
  router.get('/stats', (req, res) => {
    try {
      res.json({
        success: true,
        founder: founderMode.getStats(),
        negotiation: negotiationMode.getStats(),
        photo: photoIntelligence.getStats()
      });
    } catch (error) {
      logger.error('Failed to get mode stats', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createPhase2Routes };
