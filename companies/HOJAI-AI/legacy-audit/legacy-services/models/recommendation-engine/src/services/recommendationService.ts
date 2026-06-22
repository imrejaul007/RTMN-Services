/**
 * HOJAI AI Recommendation Engine - Recommendation Service
 *
 * Implements rule-based + embedding similarity recommendations
 */

import type {
  RecommendationItem,
  RecommendationType,
} from '../types/index.js';
import {
  getProductById,
  getProductsByIds,
  getAllProducts,
  getTrendingItems as getTrendingData,
  getFrequentlyBoughtTogether as getCoPurchases,
  getUserPurchasedProductIds,
  recordPurchase,
} from './dataStore.js';
import { cosineSimilarity, findMostSimilar } from '../utils/embedding.js';
import { logger } from '../utils/logger.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Validate and normalize limit parameter
 */
function normalizeLimit(limit?: number): number {
  if (limit === undefined || limit === null) {
    return DEFAULT_LIMIT;
  }
  const parsed = parseInt(String(limit), 10);
  if (isNaN(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

/**
 * Get personalized recommendations for a user
 * Combines user history with trending items
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = DEFAULT_LIMIT
): Promise<RecommendationItem[]> {
  const normalizedLimit = normalizeLimit(limit);

  logger.info(`Getting personalized recommendations for user: ${userId}`);

  // Get user's purchase history
  const purchasedProductIds = getUserPurchasedProductIds(userId);

  // Get all products
  const allProducts = getAllProducts();

  if (purchasedProductIds.size === 0) {
    // Cold start: Return trending items
    logger.info(`Cold start for user ${userId}, returning trending items`);
    return getTrendingRecommendations(normalizedLimit);
  }

  // Build user preference vector from purchase history
  const purchasedProducts = getProductsByIds(Array.from(purchasedProductIds));
  const userPreferenceEmbedding = computeAverageEmbedding(
    purchasedProducts.map(p => p.embedding)
  );

  // Score all products
  const scoredProducts: RecommendationItem[] = [];

  for (const product of allProducts) {
    if (purchasedProductIds.has(product.id)) {
      continue; // Skip already purchased
    }

    // Compute similarity to user preferences
    const similarityScore = cosineSimilarity(userPreferenceEmbedding, product.embedding);

    // Get trending score (normalized)
    const trendingData = getTrendingData(7, allProducts.length);
    const trendingScore = (trendingData.find(t => t.productId === product.id)?.velocity ?? 0) /
      Math.max(...trendingData.map(t => t.velocity), 1);

    // Get category affinity score (user's preferred categories)
    const categoryAffinity = computeCategoryAffinity(product.category, purchasedProducts);

    // Combine scores: 40% similarity + 35% trending + 25% category affinity
    const combinedScore = (similarityScore * 0.4) + (trendingScore * 0.35) + (categoryAffinity * 0.25);

    scoredProducts.push({
      id: product.id,
      name: product.name,
      score: Math.round(combinedScore * 1000) / 1000,
      reason: buildPersonalizationReason(similarityScore, trendingScore, categoryAffinity),
    });
  }

  // Sort by score and return top N
  scoredProducts.sort((a, b) => b.score - a.score);
  return scoredProducts.slice(0, normalizedLimit);
}

/**
 * Get trending item recommendations
 * Based on most purchased in last 7 days
 */
export async function getTrendingRecommendations(
  limit: number = DEFAULT_LIMIT,
  category?: string
): Promise<RecommendationItem[]> {
  const normalizedLimit = normalizeLimit(limit);

  logger.info(`Getting trending recommendations, limit: ${normalizedLimit}, category: ${category ?? 'all'}`);

  const trendingData = getTrendingData(7, normalizedLimit * 2);
  const maxVelocity = Math.max(...trendingData.map(t => t.velocity), 1);

  const recommendations: RecommendationItem[] = [];

  for (const item of trendingData) {
    const product = getProductById(item.productId);
    if (!product) continue;

    // Filter by category if specified
    if (category && product.category !== category) continue;

    const normalizedScore = item.velocity / maxVelocity;

    recommendations.push({
      id: product.id,
      name: product.name,
      score: Math.round(normalizedScore * 1000) / 1000,
      reason: `Trending: ${item.recentPurchases} purchases this week`,
    });
  }

  return recommendations.slice(0, normalizedLimit);
}

/**
 * Get similar items based on embedding similarity
 */
export async function getSimilarItems(
  productId: string,
  limit: number = DEFAULT_LIMIT
): Promise<RecommendationItem[]> {
  const normalizedLimit = normalizeLimit(limit);

  logger.info(`Getting similar items for product: ${productId}`);

  const sourceProduct = getProductById(productId);
  if (!sourceProduct) {
    logger.warn(`Product not found: ${productId}`);
    return [];
  }

  const allProducts = getAllProducts();

  // Find similar products using embedding similarity
  const similarProducts = findMostSimilar(
    sourceProduct.embedding,
    allProducts.filter(p => p.id !== productId).map(p => ({
      id: p.id,
      name: p.name,
      embedding: p.embedding,
    })),
    normalizedLimit
  );

  const recommendations: RecommendationItem[] = similarProducts.map(similar => ({
    id: similar.id,
    name: similar.name,
    score: Math.round(similar.similarity * 1000) / 1000,
    reason: `Similar to "${sourceProduct.name}"`,
  }));

  return recommendations;
}

/**
 * Get frequently bought together recommendations
 * Based on co-purchase patterns
 */
export async function getFrequentlyBoughtRecommendations(
  productId: string,
  limit: number = DEFAULT_LIMIT
): Promise<RecommendationItem[]> {
  const normalizedLimit = normalizeLimit(limit);

  logger.info(`Getting frequently bought together for product: ${productId}`);

  const sourceProduct = getProductById(productId);
  if (!sourceProduct) {
    logger.warn(`Product not found: ${productId}`);
    return [];
  }

  const coPurchases = getCoPurchases(productId, normalizedLimit);

  const recommendations: RecommendationItem[] = [];
  const maxFrequency = Math.max(...coPurchases.map(c => c.frequency), 1);

  for (const cp of coPurchases) {
    const product = getProductById(cp.productId);
    if (!product) continue;

    recommendations.push({
      id: product.id,
      name: product.name,
      score: Math.round((cp.frequency / maxFrequency) * 1000) / 1000,
      reason: `Frequently bought with "${sourceProduct.name}"`,
    });
  }

  return recommendations;
}

/**
 * Get recommendations by type
 */
export async function getRecommendationsByType(
  type: RecommendationType,
  userId?: string,
  productId?: string,
  limit?: number
): Promise<RecommendationItem[]> {
  const normalizedLimit = normalizeLimit(limit);

  switch (type) {
    case 'personalized':
      if (!userId) {
        // Fall back to trending if no userId
        return getTrendingRecommendations(normalizedLimit);
      }
      return getPersonalizedRecommendations(userId, normalizedLimit);

    case 'trending':
      return getTrendingRecommendations(normalizedLimit);

    case 'similar':
      if (!productId) {
        logger.warn('productId required for similar recommendations');
        return [];
      }
      return getSimilarItems(productId, normalizedLimit);

    case 'frequently-bought':
      if (!productId) {
        logger.warn('productId required for frequently-bought recommendations');
        return [];
      }
      return getFrequentlyBoughtRecommendations(productId, normalizedLimit);

    default:
      logger.warn(`Unknown recommendation type: ${type}`);
      return [];
  }
}

/**
 * Record a user interaction (purchase)
 */
export function recordUserPurchase(
  userId: string,
  productId: string,
  quantity: number = 1
): void {
  recordPurchase(userId, productId, quantity);
  logger.info(`Recorded purchase: user=${userId}, product=${productId}, qty=${quantity}`);
}

// Helper functions

/**
 * Compute average embedding from a list of embeddings
 */
function computeAverageEmbedding(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    return new Array(128).fill(0);
  }

  const dimension = embeddings[0].length;
  const sum = new Array(dimension).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      sum[i] += embedding[i];
    }
  }

  const avg = sum.map(v => v / embeddings.length);

  // Normalize
  let magnitude = 0;
  for (const v of avg) {
    magnitude += v * v;
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude > 0) {
    return avg.map(v => v / magnitude);
  }

  return avg;
}

/**
 * Compute category affinity based on user's purchase history
 */
function computeCategoryAffinity(
  category: string,
  purchasedProducts: Array<{ id: string; category: string }>
): number {
  if (purchasedProducts.length === 0) {
    return 0.5; // Neutral for cold start
  }

  const categoryCount = purchasedProducts.filter(p => p.category === category).length;
  return categoryCount / purchasedProducts.length;
}

/**
 * Build a human-readable reason for personalization
 */
function buildPersonalizationReason(
  similarity: number,
  trending: number,
  categoryAffinity: number
): string {
  const reasons: string[] = [];

  if (similarity > 0.7) {
    reasons.push('Similar to your favorites');
  } else if (similarity > 0.4) {
    reasons.push('Based on your browsing');
  }

  if (trending > 0.6) {
    reasons.push('Trending now');
  }

  if (categoryAffinity > 0.3) {
    reasons.push('From your favorite category');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Recommended for you';
}
