/**
 * Media OS - Recommendation Routes
 * Content recommendation engine
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware');
const { Content, Viewer, ViewerProfile, ...models } = require('../models');
const { rtmnService } = require('../services');
const logger = require('../config/database');

/**
 * Recommendation Engine
 * Personalized content recommendations based on viewer behavior
 */
class RecommendationEngine {
  constructor() {
    this.weights = {
      collaborative: 0.3,    // Similar viewers watched
      content: 0.25,          // Similar content
      trending: 0.15,        // Currently trending
      popularity: 0.1,       // Popular content
      fresh: 0.1,           // Recently added
      demographics: 0.1,     // Demographic matching
    };
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(viewerId, options = {}) {
    const {
      limit = 10,
      exclude = [],
      contentTypes = ['movie', 'series', 'episode'],
      genres,
    } = options;

    try {
      const viewer = await Viewer.findById(viewerId);
      if (!viewer) {
        return this.getPopularContent(limit, { contentTypes, genres });
      }

      // Parallel fetching of recommendation sources
      const [
        collaborativeRecs,
        contentBasedRecs,
        trendingRecs,
        popularRecs,
        freshRecs,
      ] = await Promise.all([
        this.getCollaborativeRecs(viewer, limit * 2),
        this.getContentBasedRecs(viewer, limit * 2),
        this.getTrendingRecs(limit * 2),
        this.getPopularContent(limit * 2, { contentTypes, genres }),
        this.getFreshContent(limit * 2, { contentTypes }),
      ]);

      // Merge and score recommendations
      const scored = this.mergeAndScore({
        collaborative: collaborativeRecs,
        contentBased: contentBasedRecs,
        trending: trendingRecs,
        popular: popularRecs,
        fresh: freshRecs,
      }, viewer);

      // Filter and limit
      const recommendations = scored
        .filter(rec => !exclude.includes(rec.contentId.toString()))
        .slice(0, limit);

      return recommendations;
    } catch (error) {
      logger.error('Recommendation failed', { viewerId, error: error.message });
      return this.getPopularContent(limit, { contentTypes, genres });
    }
  }

  /**
   * Collaborative filtering - what similar users watched
   */
  async getCollaborativeRecs(viewer, limit) {
    // Find similar viewers based on watch history
    const watchGenres = viewer.preferences?.genres || [];
    const similarViewers = await Viewer.find({
      _id: { $ne: viewer._id },
      'preferences.genres': { $in: watchGenres },
      status: 'active',
    }).limit(50);

    if (similarViewers.length === 0) {
      return [];
    }

    // Get content they watched that viewer hasn't
    const viewerWatched = viewer.watchHistory?.map(h => h.contentId?.toString()) || [];
    const viewerGenres = viewer.preferences?.genres || [];

    const recommendations = await Content.aggregate([
      {
        $match: {
          status: 'published',
          _id: { $nin: viewerWatched.map(id => new (require('mongoose').Types.ObjectId)(id)) },
          genres: { $in: viewerGenres },
        },
      },
      {
        $lookup: {
          from: 'viewers',
          let: { contentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$$contentId', '$watchHistory.contentId'] },
                _id: { $in: similarViewers.map(v => v._id) },
              },
            },
          ],
          as: 'similarViewers',
        },
      },
      {
        $addFields: {
          similarityScore: { $size: '$similarViewers' },
        },
      },
      { $sort: { similarityScore: -1, 'performance.views': -1 } },
      { $limit: limit },
    ]);

    return recommendations.map(c => ({
      contentId: c._id,
      title: c.title,
      type: c.type,
      thumbnail: c.thumbnail,
      score: c.similarityScore / similarViewers.length,
      reason: 'Viewers like you watched this',
    }));
  }

  /**
   * Content-based filtering - similar to what user watched
   */
  async getContentBasedRecs(viewer, limit) {
    const recentWatch = viewer.watchHistory?.slice(-10) || [];
    if (recentWatch.length === 0) return [];

    const watchedContent = await Content.find({
      _id: { $in: recentWatch.map(h => h.contentId) },
    }).limit(20);

    if (watchedContent.length === 0) return [];

    // Find similar content
    const allGenres = [...new Set(watchedContent.flatMap(c => c.genres || []))];
    const watchedIds = watchedContent.map(c => c._id);

    const recommendations = await Content.find({
      status: 'published',
      _id: { $nin: watchedIds },
      genres: { $in: allGenres },
    })
      .sort({ 'performance.views': -1 })
      .limit(limit);

    return recommendations.map(c => {
      const commonGenres = c.genres?.filter(g => allGenres.includes(g)) || [];
      return {
        contentId: c._id,
        title: c.title,
        type: c.type,
        thumbnail: c.thumbnail,
        score: commonGenres.length / Math.max(allGenres.length, 1),
        reason: `Because you watched ${watchedContent[0]?.title}`,
      };
    });
  }

  /**
   * Trending content - high velocity
   */
  async getTrendingRecs(limit) {
    const trending = await Content.find({
      status: 'published',
      'performance.trending': true,
    })
      .sort({ 'performance.velocity': -1 })
      .limit(limit);

    return trending.map(c => ({
      contentId: c._id,
      title: c.title,
      type: c.type,
      thumbnail: c.thumbnail,
      score: Math.min(c.performance?.velocity / 1000, 1),
      reason: 'Trending now',
    }));
  }

  /**
   * Popular content - highest views
   */
  async getPopularContent(limit, filters = {}) {
    const { contentTypes, genres } = filters;

    const query = { status: 'published' };
    if (contentTypes?.length) query.type = { $in: contentTypes };
    if (genres?.length) query.genres = { $in: genres };

    const popular = await Content.find(query)
      .sort({ 'performance.views': -1 })
      .limit(limit);

    return popular.map(c => ({
      contentId: c._id,
      title: c.title,
      type: c.type,
      thumbnail: c.thumbnail,
      score: 0.5,
      reason: 'Popular on Media OS',
    }));
  }

  /**
   * Fresh content - recently added
   */
  async getFreshContent(limit, filters = {}) {
    const { contentTypes } = filters;

    const query = {
      status: 'published',
      publishedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    };
    if (contentTypes?.length) query.type = { $in: contentTypes };

    const fresh = await Content.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit);

    return fresh.map(c => ({
      contentId: c._id,
      title: c.title,
      type: c.type,
      thumbnail: c.thumbnail,
      score: 0.4,
      reason: 'Recently added',
    }));
  }

  /**
   * Merge recommendations and calculate final score
   */
  mergeAndScore(sources, viewer) {
    const scored = new Map();

    // Process collaborative filtering
    sources.collaborative.forEach(rec => {
      const key = rec.contentId.toString();
      const existing = scored.get(key) || { ...rec, totalScore: 0 };
      existing.totalScore += rec.score * this.weights.collaborative;
      existing.sources = [...(existing.sources || []), 'collaborative'];
      scored.set(key, existing);
    });

    // Process content-based
    sources.contentBased.forEach(rec => {
      const key = rec.contentId.toString();
      const existing = scored.get(key) || { ...rec, totalScore: 0 };
      existing.totalScore += rec.score * this.weights.content;
      existing.sources = [...(existing.sources || []), 'content'];
      scored.set(key, existing);
    });

    // Process trending
    sources.trending.forEach(rec => {
      const key = rec.contentId.toString();
      const existing = scored.get(key) || { ...rec, totalScore: 0 };
      existing.totalScore += rec.score * this.weights.trending;
      existing.sources = [...(existing.sources || []), 'trending'];
      scored.set(key, existing);
    });

    // Process popular
    sources.popular.forEach(rec => {
      const key = rec.contentId.toString();
      const existing = scored.get(key) || { ...rec, totalScore: 0 };
      existing.totalScore += rec.score * this.weights.popularity;
      existing.sources = [...(existing.sources || []), 'popular'];
      scored.set(key, existing);
    });

    // Process fresh
    sources.fresh.forEach(rec => {
      const key = rec.contentId.toString();
      const existing = scored.get(key) || { ...rec, totalScore: 0 };
      existing.totalScore += rec.score * this.weights.fresh;
      existing.sources = [...(existing.sources || []), 'fresh'];
      scored.set(key, existing);
    });

    // Convert to array and normalize scores
    return Array.from(scored.values())
      .map(rec => ({
        ...rec,
        normalizedScore: Math.min(rec.totalScore, 1),
        primaryReason: rec.sources?.[0] || rec.reason,
      }))
      .sort((a, b) => b.normalizedScore - a.normalizedScore);
  }
}

// Create recommendation engine instance
const recommendationEngine = new RecommendationEngine();

// ============================================
// RECOMMENDATION ROUTES
// ============================================

// Get personalized recommendations
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 10, exclude, types, genres } = req.query;

    const recommendations = await recommendationEngine.getRecommendations(req.user.id, {
      limit: parseInt(limit),
      exclude: exclude?.split(',') || [],
      contentTypes: types?.split(',') || ['movie', 'series', 'episode'],
      genres: genres?.split(','),
    });

    res.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    logger.error('Failed to get recommendations', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
});

// Get because you watched
router.get('/because-you-watched/:contentId', authenticate, async (req, res) => {
  try {
    const content = await Content.findById(req.params.contentId);
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    const recommendations = await recommendationEngine.getContentBasedRecs(
      { preferences: { genres: content.genres }, watchHistory: [] },
      10
    );

    res.json({
      success: true,
      becauseYouWatched: content.title,
      recommendations,
    });
  } catch (error) {
    logger.error('Failed to get because you watched', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
});

// Get trending now
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recommendations = await recommendationEngine.getTrendingRecs(parseInt(limit));

    res.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    logger.error('Failed to get trending', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get trending' });
  }
});

// Get continue watching
router.get('/continue-watching', authenticate, async (req, res) => {
  try {
    const viewer = await Viewer.findById(req.user.id);
    if (!viewer) {
      return res.status(404).json({ success: false, error: 'Viewer not found' });
    }

    // Get unwatched content from watch history
    const continueWatching = viewer.watchHistory
      .filter(h => !h.completed && h.progress > 0)
      .slice(-10)
      .reverse();

    const contentIds = continueWatching.map(h => h.contentId);
    const content = await Content.find({
      _id: { $in: contentIds },
      status: 'published',
    });

    const result = continueWatching.map(item => {
      const c = content.find(cc => cc._id.toString() === item.contentId?.toString());
      return c ? {
        contentId: c._id,
        title: c.title,
        type: c.type,
        thumbnail: c.thumbnail,
        progress: item.progress,
        resumeFrom: Math.floor((item.progress / 100) * (c.duration || 120)),
        reason: 'Continue watching',
      } : null;
    }).filter(Boolean);

    res.json({
      success: true,
      continueWatching: result,
    });
  } catch (error) {
    logger.error('Failed to get continue watching', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get continue watching' });
  }
});

// Get watchlist
router.get('/watchlist', authenticate, async (req, res) => {
  try {
    const viewer = await Viewer.findById(req.user.id)
      .populate('watchlist', 'title type thumbnail duration');

    if (!viewer) {
      return res.status(404).json({ success: false, error: 'Viewer not found' });
    }

    res.json({
      success: true,
      watchlist: viewer.watchlist,
      count: viewer.watchlist?.length || 0,
    });
  } catch (error) {
    logger.error('Failed to get watchlist', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get watchlist' });
  }
});

// Add to watchlist
router.post('/watchlist/:contentId', authenticate, async (req, res) => {
  try {
    const viewer = await Viewer.findById(req.user.id);
    if (!viewer) {
      return res.status(404).json({ success: false, error: 'Viewer not found' });
    }

    if (!viewer.watchlist.includes(req.params.contentId)) {
      viewer.watchlist.push(req.params.contentId);
      await viewer.save();
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to add to watchlist', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add to watchlist' });
  }
});

// Remove from watchlist
router.delete('/watchlist/:contentId', authenticate, async (req, res) => {
  try {
    const viewer = await Viewer.findById(req.user.id);
    if (!viewer) {
      return res.status(404).json({ success: false, error: 'Viewer not found' });
    }

    viewer.watchlist = viewer.watchlist.filter(
      id => id.toString() !== req.params.contentId
    );
    await viewer.save();

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to remove from watchlist', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to remove from watchlist' });
  }
});

// Get for you (personalized homepage)
router.get('/for-you', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const [
      recommendations,
      continueWatching,
      trending,
      fresh,
    ] = await Promise.all([
      recommendationEngine.getRecommendations(req.user.id, { limit: 10 }),
      getContinueWatching(req.user.id, 5),
      recommendationEngine.getTrendingRecs(5),
      recommendationEngine.getFreshContent(5),
    ]);

    res.json({
      success: true,
      forYou: {
        personalized: recommendations,
        continueWatching,
        trendingNow: trending,
        justAdded: fresh,
      },
    });
  } catch (error) {
    logger.error('Failed to get for you', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get for you' });
  }
});

// Helper function
async function getContinueWatching(viewerId, limit) {
  const viewer = await Viewer.findById(viewerId);
  if (!viewer) return [];

  const continueWatching = viewer.watchHistory
    .filter(h => !h.completed && h.progress > 0)
    .slice(-limit)
    .reverse();

  const contentIds = continueWatching.map(h => h.contentId);
  const content = await Content.find({ _id: { $in: contentIds } });

  return continueWatching.map(item => {
    const c = content.find(cc => cc._id.toString() === item.contentId?.toString());
    return c ? {
      contentId: c._id,
      title: c.title,
      type: c.type,
      thumbnail: c.thumbnail,
      progress: item.progress,
    } : null;
  }).filter(Boolean);
}

module.exports = router;
