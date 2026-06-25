/**
 * AI Recommender Service
 *
 * Provides intelligent recommendations based on:
 * - User browsing history
 * - Similar listings
 * - Trending/popular items
 * - Company blueprint matching
 * - Capability-based matching
 */

const mongoose = require('mongoose');

// In-memory recommendation cache
const recommendationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate recommendations for a user or context
 */
async function getRecommendations({
  userId,
  companyBlueprint,
  currentListingId,
  category,
  limit = 10,
}) {
  const recommendations = [];
  const seen = new Set();

  // Don't recommend the current listing
  if (currentListingId) seen.add(currentListingId);

  // 1. Similar listings based on category and tags
  if (category) {
    const similar = await getSimilarByCategory(category, currentListingId, Math.ceil(limit / 3));
    similar.forEach(l => { if (!seen.has(l.listingId)) { recommendations.push(l); seen.add(l.listingId); } });
  }

  // 2. Popular in same category
  if (category) {
    const popular = await getPopularByCategory(category, Math.ceil(limit / 3));
    popular.forEach(l => { if (!seen.has(l.listingId)) { recommendations.push(l); seen.add(l.listingId); } });
  }

  // 3. Recommended based on company blueprint
  if (companyBlueprint) {
    const blueprint = await getByBlueprint(companyBlueprint, Math.ceil(limit / 3));
    blueprint.forEach(l => { if (!seen.has(l.listingId)) { recommendations.push(l); seen.add(l.listingId); } });
  }

  // 4. Trending across platform
  const trending = await getTrending(limit - recommendations.length);
  trending.forEach(l => { if (!seen.has(l.listingId)) { recommendations.push(l); seen.add(l.listingId); } });

  return recommendations.slice(0, limit);
}

/**
 * Get similar listings based on category
 */
async function getSimilarByCategory(category, excludeId, limit) {
  try {
    const { Index } = require('../models/Discovery');
    return await Index.find({
      kind: 'listing',
      'metadata.category': category,
      documentId: { $ne: excludeId },
    })
      .sort({ rating: -1, installCount: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('[recommender] getSimilarByCategory error:', err.message);
    return [];
  }
}

/**
 * Get popular listings by category
 */
async function getPopularByCategory(category, limit) {
  try {
    const { Index } = require('../models/Discovery');
    return await Index.find({
      kind: 'listing',
      'metadata.category': category,
    })
      .sort({ installCount: -1, rating: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('[recommender] getPopularByCategory error:', err.message);
    return [];
  }
}

/**
 * Get listings matching a company blueprint
 * E.g., for "restaurant" blueprint, recommend restaurant OS, POS, ordering, etc.
 */
async function getByBlueprint(blueprint, limit) {
  try {
    const { Index } = require('../models/Discovery');
    const blueprintTags = getBlueprintTags(blueprint);

    return await Index.find({
      kind: 'listing',
      $or: [
        { tags: { $in: blueprintTags } },
        { 'metadata.industry': blueprint.toLowerCase() },
        { 'metadata.department': { $in: blueprintTags } },
      ],
    })
      .sort({ rating: -1, installCount: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('[recommender] getByBlueprint error:', err.message);
    return [];
  }
}

/**
 * Get trending listings (high installs recently)
 */
async function getTrending(limit) {
  try {
    const { Index } = require('../models/Discovery');
    return await Index.find({
      kind: 'listing',
      installCount: { $gt: 0 },
    })
      .sort({ installCount: -1, rating: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('[recommender] getTrending error:', err.message);
    return [];
  }
}

/**
 * Get capability-based recommendations
 * Match listings based on required capabilities
 */
async function getByCapabilities(requiredCapabilities, excludeId, limit) {
  try {
    const { Index } = require('../models/Discovery');
    return await Index.find({
      kind: 'listing',
      documentId: { $ne: excludeId },
      $or: requiredCapabilities.map(cap => ({
        tags: { $in: [cap.toLowerCase()] },
      })),
    })
      .sort({ rating: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('[recommender] getByCapabilities error:', err.message);
    return [];
  }
}

/**
 * Collaborative filtering based on user history
 */
async function getCollaborativeSuggestions(userId, limit) {
  try {
    // In production, this would use actual user behavior data
    // For now, return popular items
    return await getTrending(limit);
  } catch (err) {
    console.error('[recommender] getCollaborativeSuggestions error:', err.message);
    return [];
  }
}

/**
 * Smart search with AI-enhanced ranking
 */
async function smartSearch(query, {
  category,
  pricingModel,
  minRating,
  limit = 20,
  offset = 0,
} = {}) {
  try {
    const { Index, PopularSearch } = require('../models/Discovery');

    // Build query
    const searchQuery = {
      kind: 'listing',
      ...(category && { 'metadata.category': category }),
      ...(pricingModel && { 'metadata.pricingModel': pricingModel }),
      ...(minRating && { rating: { $gte: minRating } }),
    };

    // Text search with fallback
    let results;
    if (query && query.trim()) {
      // Record search for analytics
      PopularSearch.recordSearch(query, 0).catch(() => {});

      results = await Index.find({
        ...searchQuery,
        $text: { $search: query },
      }, {
        score: { $meta: 'textScore' },
      })
        .sort({ score: { $meta: 'textScore' } })
        .skip(offset)
        .limit(limit)
        .lean();
    } else {
      results = await Index.find(searchQuery)
        .sort({ rating: -1, installCount: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
    }

    return {
      results,
      query,
      count: results.length,
      hasMore: results.length === limit,
    };
  } catch (err) {
    console.error('[recommender] smartSearch error:', err.message);
    return { results: [], query, count: 0, hasMore: false };
  }
}

/**
 * Get bundle recommendations (Business Capability Packs)
 */
async function getBundleRecommendations(industry, excludeId, limit) {
  try {
    const { Index } = require('../models/Discovery');
    return await Index.find({
      kind: 'listing',
      documentId: { $ne: excludeId },
      $or: [
        { 'metadata.category': 'business-capability-pack' },
        { 'metadata.category': 'company-blueprint' },
        { 'metadata.industry': industry?.toLowerCase() },
      ],
    })
      .sort({ rating: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('[recommender] getBundleRecommendations error:', err.message);
    return [];
  }
}

/**
 * Get AI employee team recommendations
 */
async function getTeamRecommendations(industry, excludeId, limit) {
  try {
    const { Index } = require('../models/Discovery');
    return await Index.find({
      kind: 'listing',
      documentId: { $ne: excludeId },
      $or: [
        { 'metadata.category': 'ai-employee' },
        { 'metadata.category': 'ai-team' },
        { 'metadata.industry': industry?.toLowerCase() },
      ],
    })
      .sort({ rating: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('[recommender] getTeamRecommendations error:', err.message);
    return [];
  }
}

// Helper: Map blueprints to relevant tags
function getBlueprintTags(blueprint) {
  const tagMap = {
    restaurant: ['restaurant', 'pos', 'kitchen', 'ordering', 'delivery', 'hospitality'],
    hotel: ['hotel', 'hospitality', 'booking', 'frontdesk', 'housekeeping', 'revenue'],
    retail: ['retail', 'pos', 'inventory', 'ecommerce', 'store'],
    healthcare: ['healthcare', 'medical', 'hospital', 'clinic', 'hipaa'],
    b2b: ['b2b', 'marketplace', 'rfq', 'procurement', 'enterprise'],
    saas: ['saas', 'subscription', 'multi-tenant', 'billing'],
    ecommerce: ['ecommerce', 'd2c', 'cart', 'checkout', 'shipping'],
  };
  return tagMap[blueprint.toLowerCase()] || [blueprint.toLowerCase()];
}

module.exports = {
  getRecommendations,
  getSimilarByCategory,
  getPopularByCategory,
  getByBlueprint,
  getTrending,
  getByCapabilities,
  getCollaborativeSuggestions,
  smartSearch,
  getBundleRecommendations,
  getTeamRecommendations,
};
