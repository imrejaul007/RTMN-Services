/**
 * Media OS - Creator & Community Routes
 * Creator studio, brand deals, and community features
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware');
const { CreatorStudio, CreatorAnalytics } = require('../models/CreatorStudio');
const BrandDeal = require('../models/BrandDeal');
const { Post, Community } = require('../models/Community');
const logger = require('../config/database');

// ============================================
// CREATOR STUDIO
// ============================================

// Get creator studio
router.get('/studio', authenticate, async (req, res) => {
  try {
    let studio = await CreatorStudio.findOne({ creatorId: req.user.id });

    if (!studio) {
      studio = new CreatorStudio({
        creatorId: req.user.id,
        preferences: {},
        status: { onboarding: true },
      });
      await studio.save();
    }

    res.json({ success: true, studio });
  } catch (error) {
    logger.error('Failed to get studio', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get studio' });
  }
});

// Update studio preferences
router.patch('/studio/preferences', authenticate, async (req, res) => {
  try {
    const studio = await CreatorStudio.findOne({ creatorId: req.user.id });
    if (!studio) {
      return res.status(404).json({ success: false, error: 'Studio not found' });
    }

    Object.assign(studio.preferences, req.body);
    await studio.save();

    res.json({ success: true, studio });
  } catch (error) {
    logger.error('Failed to update preferences', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

// Get creator analytics
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const studio = await CreatorStudio.findOne({ creatorId: req.user.id });
    if (!studio) {
      return res.status(404).json({ success: false, error: 'Studio not found' });
    }

    const analytics = await studio.getAnalytics(period);

    res.json({ success: true, analytics, period });
  } catch (error) {
    logger.error('Failed to get analytics', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
});

// Get alerts
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const studio = await CreatorStudio.findOne({ creatorId: req.user.id });
    if (!studio) {
      return res.status(404).json({ success: false, error: 'Studio not found' });
    }

    res.json({ success: true, alerts: studio.alerts, unread: studio.unreadAlerts });
  } catch (error) {
    logger.error('Failed to get alerts', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get alerts' });
  }
});

// Mark alert read
router.post('/alerts/:id/read', authenticate, async (req, res) => {
  try {
    const studio = await CreatorStudio.findOne({ creatorId: req.user.id });
    if (!studio) {
      return res.status(404).json({ success: false, error: 'Studio not found' });
    }

    studio.markAlertRead(req.params.id);
    await studio.save();

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to mark alert read', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to mark alert read' });
  }
});

// ============================================
// BRAND DEALS
// ============================================

// Get my brand deals
router.get('/deals', authenticate, async (req, res) => {
  try {
    const { status } = req.query;

    let deals;
    if (status) {
      deals = await BrandDeal.findActiveByCreator(req.user.id);
    } else {
      deals = await BrandDeal.findByCreator(req.user.id);
    }

    res.json({ success: true, deals, count: deals.length });
  } catch (error) {
    logger.error('Failed to get deals', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get deals' });
  }
});

// Get deal by ID
router.get('/deals/:id', authenticate, async (req, res) => {
  try {
    const deal = await BrandDeal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    if (deal.creator.creatorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, deal });
  } catch (error) {
    logger.error('Failed to get deal', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get deal' });
  }
});

// Create new deal
router.post('/deals', authenticate, async (req, res) => {
  try {
    const deal = new BrandDeal({
      ...req.body,
      creator: {
        creatorId: req.user.id,
        handle: req.body.handle,
        name: req.body.name,
      },
    });

    await deal.save();

    res.status(201).json({ success: true, deal });
  } catch (error) {
    logger.error('Failed to create deal', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create deal' });
  }
});

// Submit content for deal
router.post('/deals/:id/submit', authenticate, async (req, res) => {
  try {
    const { contentId, platform } = req.body;

    const deal = await BrandDeal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    deal.submitContent(contentId, platform);
    await deal.save();

    res.json({ success: true, deal });
  } catch (error) {
    logger.error('Failed to submit content', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to submit content' });
  }
});

// Negotiate
router.post('/deals/:id/negotiate', authenticate, async (req, res) => {
  try {
    const { offer, notes } = req.body;

    const deal = await BrandDeal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    deal.addNegotiation('creator', offer, notes);
    deal.status = 'negotiating';
    await deal.save();

    res.json({ success: true, deal });
  } catch (error) {
    logger.error('Failed to negotiate', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to negotiate' });
  }
});

// ============================================
// COMMUNITY
// ============================================

// Get communities
router.get('/communities', optionalAuth, async (req, res) => {
  try {
    const { type, trending } = req.query;

    let communities;
    if (trending) {
      communities = await Community.findTrending(20);
    } else if (type) {
      communities = await Community.find({ type, status: 'active' });
    } else {
      communities = await Community.find({ status: 'active' });
    }

    res.json({ success: true, communities, count: communities.length });
  } catch (error) {
    logger.error('Failed to get communities', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get communities' });
  }
});

// Get community by slug
router.get('/communities/:slug', optionalAuth, async (req, res) => {
  try {
    const community = await Community.findBySlug(req.params.slug);
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    res.json({ success: true, community });
  } catch (error) {
    logger.error('Failed to get community', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get community' });
  }
});

// Join community
router.post('/communities/:slug/join', authenticate, async (req, res) => {
  try {
    const community = await Community.findBySlug(req.params.slug);
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    await community.addMember(req.user.id);

    res.json({ success: true, community });
  } catch (error) {
    logger.error('Failed to join community', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to join community' });
  }
});

// Leave community
router.post('/communities/:slug/leave', authenticate, async (req, res) => {
  try {
    const community = await Community.findBySlug(req.params.slug);
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    await community.removeMember(req.user.id);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to leave community', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to leave community' });
  }
});

// ============================================
// POSTS
// ============================================

// Get feed
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const posts = await Post.findFeed({ limit: parseInt(limit) });

    res.json({ success: true, posts, count: posts.length });
  } catch (error) {
    logger.error('Failed to get feed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get feed' });
  }
});

// Get trending posts
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const posts = await Post.findTrending(parseInt(limit));

    res.json({ success: true, posts, count: posts.length });
  } catch (error) {
    logger.error('Failed to get trending', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get trending' });
  }
});

// Create post
router.post('/posts', authenticate, async (req, res) => {
  try {
    const post = new Post({
      ...req.body,
      author: {
        viewerId: req.user.id,
        type: 'viewer',
      },
    });

    await post.save();

    res.status(201).json({ success: true, post });
  } catch (error) {
    logger.error('Failed to create post', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// Like post
router.post('/posts/:id/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    await post.like(req.user.id);

    res.json({ success: true, likeCount: post.engagement.likeCount });
  } catch (error) {
    logger.error('Failed to like post', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to like post' });
  }
});

// Unlike post
router.post('/posts/:id/unlike', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    await post.unlike(req.user.id);

    res.json({ success: true, likeCount: post.engagement.likeCount });
  } catch (error) {
    logger.error('Failed to unlike post', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to unlike post' });
  }
});

// Get comments
router.get('/posts/:id/comments', optionalAuth, async (req, res) => {
  try {
    const comments = await Post.find({
      'thread.parentId': req.params.id,
      status: 'published',
    }).sort('createdAt');

    res.json({ success: true, comments, count: comments.length });
  } catch (error) {
    logger.error('Failed to get comments', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get comments' });
  }
});

// Comment on post
router.post('/posts/:id/comment', authenticate, async (req, res) => {
  try {
    const { text } = req.body;

    const parentPost = await Post.findById(req.params.id);
    if (!parentPost) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const comment = new Post({
      author: {
        viewerId: req.user.id,
        type: 'viewer',
      },
      content: { text },
      type: 'text',
      thread: {
        isReply: true,
        parentId: parentPost._id,
        rootId: parentPost.thread?.rootId || parentPost._id,
      },
      community: parentPost.community,
    });

    await comment.save();

    parentPost.engagement.comments += 1;
    parentPost.thread.replyCount += 1;
    await parentPost.save();

    res.status(201).json({ success: true, comment });
  } catch (error) {
    logger.error('Failed to comment', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to comment' });
  }
});

module.exports = router;
