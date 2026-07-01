/**
 * SocialOS Routes
 * Phase 5: Real Social Media API Integration
 * Date: July 2, 2026
 */

const express = require('express');
const router = express.Router();
const socialOS = require('../modules/social-os');
const logger = require('../config/logger');

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

// Connect social account
router.post('/connect', async (req, res) => {
  try {
    const { userId, platform, authCode } = req.body;
    if (!userId || !platform || !authCode) {
      return res.status(400).json({ success: false, error: 'userId, platform, and authCode required' });
    }
    const result = await socialOS.connectAccount(userId, platform, authCode);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error('Connect account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Disconnect social account
router.post('/disconnect', async (req, res) => {
  try {
    const { userId, platform } = req.body;
    const result = await socialOS.disconnectAccount(userId, platform);
    res.json(result);
  } catch (error) {
    logger.error('Disconnect account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// POSTING
// ============================================

// Post to single platform
router.post('/post', async (req, res) => {
  try {
    const { userId, platform, content } = req.body;
    if (!userId || !platform || !content) {
      return res.status(400).json({ success: false, error: 'userId, platform, and content required' });
    }
    const result = await socialOS.post(userId, platform, content);
    res.json(result);
  } catch (error) {
    logger.error('Post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Broadcast to multiple platforms
router.post('/broadcast', async (req, res) => {
  try {
    const { userId, content, platforms } = req.body;
    if (!userId || !content) {
      return res.status(400).json({ success: false, error: 'userId and content required' });
    }
    const result = await socialOS.broadcast(userId, content, platforms);
    res.json(result);
  } catch (error) {
    logger.error('Broadcast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SCHEDULING
// ============================================

// Schedule a post
router.post('/schedule', async (req, res) => {
  try {
    const { userId, platform, content, publishAt } = req.body;
    if (!userId || !platform || !content || !publishAt) {
      return res.status(400).json({ success: false, error: 'userId, platform, content, and publishAt required' });
    }
    const result = await socialOS.schedule(userId, platform, content, publishAt);
    res.json(result);
  } catch (error) {
    logger.error('Schedule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get optimal posting times
router.get('/optimal-times', async (req, res) => {
  try {
    const { userId, platform } = req.query;
    if (!userId || !platform) {
      return res.status(400).json({ success: false, error: 'userId and platform required' });
    }
    const result = await socialOS.getOptimalTimes(userId, platform);
    res.json(result);
  } catch (error) {
    logger.error('Optimal times error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ANALYTICS
// ============================================

// Get analytics for platform
router.get('/analytics', async (req, res) => {
  try {
    const { userId, platform, days = 7 } = req.query;
    if (!userId || !platform) {
      return res.status(400).json({ success: false, error: 'userId and platform required' });
    }
    const result = await socialOS.getAnalytics(userId, platform, parseInt(days));
    res.json(result);
  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cross-platform analytics
router.get('/analytics/cross-platform', async (req, res) => {
  try {
    const { userId, days = 7 } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    const result = await socialOS.getCrossPlatformAnalytics(userId, parseInt(days));
    res.json(result);
  } catch (error) {
    logger.error('Cross-platform analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SOCIAL LISTENING
// ============================================

// Search mentions
router.get('/search', async (req, res) => {
  try {
    const { userId, platform, query } = req.query;
    if (!userId || !platform || !query) {
      return res.status(400).json({ success: false, error: 'userId, platform, and query required' });
    }
    const result = await socialOS.search(userId, platform, query);
    res.json(result);
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sentiment analysis
router.get('/sentiment', async (req, res) => {
  try {
    const { userId, keyword } = req.query;
    if (!userId || !keyword) {
      return res.status(400).json({ success: false, error: 'userId and keyword required' });
    }
    const result = await socialOS.getSentiment(userId, keyword);
    res.json(result);
  } catch (error) {
    logger.error('Sentiment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
