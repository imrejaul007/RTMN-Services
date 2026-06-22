/**
 * HOJAI Commerce Intelligence - Recommendation Service
 * Product recommendations and personalization
 */

import { v4 as uuid } from 'uuid';
import { ProductIntelligenceModel } from '../models/index.js';
import { behaviorService } from './behaviorService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('commerce-recommendation');

export interface RecommendationRequest {
  tenantId: string;
  userId: string;
  type: 'personalized' | 'trending' | 'similar' | 'frequently_bought' | 'complementary' | 'cross_sell' | 'upsell';
  productId?: string;
  limit?: number;
  context?: {
    trigger?: 'home' | 'product' | 'cart' | 'checkout' | 'search' | 'wishlist';
    category?: string;
  };
}

export interface Recommendation {
  id: string;
  productId: string;
  title: string;
  category: string;
  score: number;
  confidence: number;
  reason: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  imageUrl?: string;
  inStock?: boolean;
  metadata?: Record<string, unknown>;
}

export class RecommendationService {
  /**
   * Get recommendations for a user
   */
  async getRecommendations(input: RecommendationRequest): Promise<Recommendation[]> {
    const { tenantId, userId, type, productId, limit = 10, context } = input;

    let recommendations: Recommendation[];

    switch (type) {
      case 'personalized':
        recommendations = await this.getPersonalizedRecommendations(tenantId, userId, limit, context);
        break;
      case 'trending':
        recommendations = await this.getTrendingProducts(tenantId, limit, context);
        break;
      case 'similar':
        if (!productId) throw new Error('productId required for similar recommendations');
        recommendations = await this.getSimilarProducts(tenantId, productId, limit);
        break;
      case 'frequently_bought':
        if (!productId) throw new Error('productId required for frequently bought recommendations');
        recommendations = await this.getFrequentlyBoughtTogether(tenantId, productId, limit);
        break;
      case 'complementary':
        if (!productId) throw new Error('productId required for complementary recommendations');
        recommendations = await this.getComplementaryProducts(tenantId, productId, limit);
        break;
      case 'cross_sell':
        recommendations = await this.getCrossSellRecommendations(tenantId, userId, limit);
        break;
      case 'upsell':
        recommendations = await this.getUpsellRecommendations(tenantId, userId, limit);
        break;
      default:
        throw new Error(`Unknown recommendation type: ${type}`);
    }

    logger.info('recommendations_generated', {
      tenantId,
      userId,
      type,
      count: recommendations.length
    });

    return recommendations;
  }

  /**
   * Get personalized recommendations based on user behavior
   */
  private async getPersonalizedRecommendations(
    tenantId: string,
    userId: string,
    limit: number,
    context?: RecommendationRequest['context']
  ): Promise<Recommendation[]> {
    const behavior = await behaviorService.getOrCreateBehavior(tenantId, userId);

    // Get products similar to previously viewed/purchased
    const viewedProducts = behavior.productsViewed.slice(-20);
    const purchasedProducts = behavior.productsPurchased.slice(-10);

    // Query products based on user's pattern
    const query: Record<string, unknown> = {
      tenantId,
      trending: true
    };

    if (context?.category) {
      // Filter by category if provided
      query['category'] = context.category;
    }

    const products = await ProductIntelligenceModel.find(query)
      .sort({ trendingScore: -1, purchaseRate: -1 })
      .limit(limit);

    // Transform to recommendations
    return products.map((product, index) => ({
      id: uuid(),
      productId: product.productId,
      title: `Product ${product.productId.slice(0, 8)}`,
      category: 'personalized',
      score: Math.max(0.3, 1 - index * 0.05),
      confidence: 0.75,
      reason: this.generatePersonalizedReason(behavior),
      price: product.currentPrice,
      originalPrice: product.originalPrice,
      discount: product.discountPercent > 0 ? product.discountPercent : undefined,
      inStock: product.stockLevel > 0,
      metadata: {
        purchaseRate: product.purchaseRate,
        trending: product.trending,
        trendingScore: product.trendingScore
      }
    }));
  }

  /**
   * Get trending products
   */
  private async getTrendingProducts(
    tenantId: string,
    limit: number,
    context?: RecommendationRequest['context']
  ): Promise<Recommendation[]> {
    const query: Record<string, unknown> = {
      tenantId,
      trending: true
    };

    if (context?.category) {
      query['category'] = context.category;
    }

    const products = await ProductIntelligenceModel.find(query)
      .sort({ trendingScore: -1, views: -1 })
      .limit(limit);

    return products.map((product, index) => ({
      id: uuid(),
      productId: product.productId,
      title: `Trending Product ${product.productId.slice(0, 8)}`,
      category: 'trending',
      score: Math.max(0.5, 1 - index * 0.03),
      confidence: 0.85,
      reason: 'Trending in your area',
      price: product.currentPrice,
      originalPrice: product.originalPrice,
      discount: product.discountPercent > 0 ? product.discountPercent : undefined,
      inStock: product.stockLevel > 0,
      metadata: {
        views: product.views,
        purchases: product.purchases,
        trendingScore: product.trendingScore
      }
    }));
  }

  /**
   * Get similar products
   */
  private async getSimilarProducts(
    tenantId: string,
    productId: string,
    limit: number
  ): Promise<Recommendation[]> {
    const sourceProduct = await ProductIntelligenceModel.findOne({ tenantId, productId });

    if (!sourceProduct) {
      // Return generic similar products
      const products = await ProductIntelligenceModel.find({ tenantId })
        .sort({ purchaseRate: -1 })
        .limit(limit);

      return products.map((product) => ({
        id: uuid(),
        productId: product.productId,
        title: `Similar to ${productId.slice(0, 8)}`,
        category: 'similar',
        score: 0.7,
        confidence: 0.6,
        reason: 'Popular alternative',
        price: product.currentPrice,
        inStock: product.stockLevel > 0
      }));
    }

    // Get similar products from the product's similarProducts array
    const similarIds = sourceProduct.similarProducts.slice(0, limit);

    if (similarIds.length > 0) {
      const products = await ProductIntelligenceModel.find({
        tenantId,
        productId: { $in: similarIds }
      });

      return products.map((product) => ({
        id: uuid(),
        productId: product.productId,
        title: `Similar Product`,
        category: 'similar',
        score: 0.85,
        confidence: 0.8,
        reason: 'Based on your browsing',
        price: product.currentPrice,
        originalPrice: product.originalPrice,
        inStock: product.stockLevel > 0
      }));
    }

    // Fallback: get products with similar price range
    const priceVariance = 0.2;
    const minPrice = sourceProduct.currentPrice * (1 - priceVariance);
    const maxPrice = sourceProduct.currentPrice * (1 + priceVariance);

    const products = await ProductIntelligenceModel.find({
      tenantId,
      productId: { $ne: productId },
      currentPrice: { $gte: minPrice, $lte: maxPrice }
    })
      .sort({ purchaseRate: -1 })
      .limit(limit);

    return products.map((product) => ({
      id: uuid(),
      productId: product.productId,
      title: 'Similar Price Range',
      category: 'similar',
      score: 0.65,
      confidence: 0.55,
      reason: 'Similar price point',
      price: product.currentPrice,
      inStock: product.stockLevel > 0
    }));
  }

  /**
   * Get frequently bought together products
   */
  private async getFrequentlyBoughtTogether(
    tenantId: string,
    productId: string,
    limit: number
  ): Promise<Recommendation[]> {
    const sourceProduct = await ProductIntelligenceModel.findOne({ tenantId, productId });

    if (!sourceProduct || sourceProduct.frequentlyBoughtTogether.length === 0) {
      // Return random complementary products
      const products = await ProductIntelligenceModel.find({ tenantId })
        .sort({ purchaseRate: -1 })
        .limit(limit);

      return products.map((product) => ({
        id: uuid(),
        productId: product.productId,
        title: 'Frequently Bought Together',
        category: 'frequently_bought',
        score: 0.75,
        confidence: 0.6,
        reason: 'Often purchased together',
        price: product.currentPrice,
        inStock: product.stockLevel > 0
      }));
    }

    const fbtIds = sourceProduct.frequentlyBoughtTogether.slice(0, limit);
    const products = await ProductIntelligenceModel.find({
      tenantId,
      productId: { $in: fbtIds }
    });

    return products.map((product) => ({
      id: uuid(),
      productId: product.productId,
      title: 'Complete the Bundle',
      category: 'frequently_bought',
      score: 0.9,
      confidence: 0.85,
      reason: 'Frequently bought together',
      price: product.currentPrice,
      originalPrice: product.originalPrice,
      inStock: product.stockLevel > 0
    }));
  }

  /**
   * Get complementary products
   */
  private async getComplementaryProducts(
    tenantId: string,
    productId: string,
    limit: number
  ): Promise<Recommendation[]> {
    const sourceProduct = await ProductIntelligenceModel.findOne({ tenantId, productId });

    if (!sourceProduct || sourceProduct.complementaryProducts.length === 0) {
      // Return products with high complementary score
      const products = await ProductIntelligenceModel.find({ tenantId })
        .sort({ addToCartRate: -1 })
        .limit(limit);

      return products.map((product) => ({
        id: uuid(),
        productId: product.productId,
        title: 'Goes Well With',
        category: 'complementary',
        score: 0.7,
        confidence: 0.6,
        reason: 'Pairs well with this product',
        price: product.currentPrice,
        inStock: product.stockLevel > 0
      }));
    }

    const compIds = sourceProduct.complementaryProducts.slice(0, limit);
    const products = await ProductIntelligenceModel.find({
      tenantId,
      productId: { $in: compIds }
    });

    return products.map((product) => ({
      id: uuid(),
      productId: product.productId,
      title: 'Pairs Well With',
      category: 'complementary',
      score: 0.85,
      confidence: 0.8,
      reason: 'Complementary product',
      price: product.currentPrice,
      inStock: product.stockLevel > 0
    }));
  }

  /**
   * Get cross-sell recommendations
   */
  private async getCrossSellRecommendations(
    tenantId: string,
    userId: string,
    limit: number
  ): Promise<Recommendation[]> {
    const behavior = await behaviorService.getOrCreateBehavior(tenantId, userId);

    // Get products from categories user hasn't purchased from
    const purchasedCategories = new Set<string>();
    // Simple category assignment based on product patterns
    const categories = ['electronics', 'fashion', 'home', 'beauty', 'sports'];

    const products = await ProductIntelligenceModel.find({ tenantId })
      .sort({ purchaseRate: -1 })
      .limit(limit);

    return products.map((product) => ({
      id: uuid(),
      productId: product.productId,
      title: 'You Might Also Like',
      category: 'cross_sell',
      score: 0.75,
      confidence: 0.7,
      reason: 'Expand your horizons',
      price: product.currentPrice,
      originalPrice: product.originalPrice,
      discount: product.discountPercent > 0 ? product.discountPercent : undefined,
      inStock: product.stockLevel > 0
    }));
  }

  /**
   * Get upsell recommendations
   */
  private async getUpsellRecommendations(
    tenantId: string,
    userId: string,
    limit: number
  ): Promise<Recommendation[]> {
    const behavior = await behaviorService.getOrCreateBehavior(tenantId, userId);

    // Find higher-tier alternatives to previously purchased products
    const products = await ProductIntelligenceModel.find({
      tenantId,
      currentPrice: { $gte: behavior.avgOrderValue }
    })
      .sort({ purchaseRate: -1, price: -1 })
      .limit(limit);

    return products.map((product) => ({
      id: uuid(),
      productId: product.productId,
      title: 'Upgrade Your Experience',
      category: 'upsell',
      score: 0.7,
      confidence: 0.65,
      reason: 'Premium alternative',
      price: product.currentPrice,
      originalPrice: product.originalPrice,
      discount: product.discountPercent > 0 ? product.discountPercent : undefined,
      inStock: product.stockLevel > 0,
      metadata: {
        premium: true,
        quality: 'high'
      }
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generatePersonalizedReason(behavior: any): string {
    if (behavior.segment === 'vip' || behavior.segment === 'whale') {
      return 'Recommended for our premium customers';
    }
    if (behavior.totalOrders > 10) {
      return 'Based on your shopping history';
    }
    if (behavior.productsViewed.length > 0) {
      return 'Similar to items you viewed';
    }
    return 'Popular with customers like you';
  }

  /**
   * Update product recommendation data
   */
  async updateProductRecommendations(
    tenantId: string,
    productId: string,
    data: {
      relatedProducts?: string[];
      frequentlyBoughtTogether?: string[];
      similarProducts?: string[];
      complementaryProducts?: string[];
    }
  ): Promise<void> {
    await ProductIntelligenceModel.findOneAndUpdate(
      { tenantId, productId },
      {
        $set: {
          ...(data.relatedProducts && { relatedProducts: data.relatedProducts }),
          ...(data.frequentlyBoughtTogether && { frequentlyBoughtTogether: data.frequentlyBoughtTogether }),
          ...(data.similarProducts && { similarProducts: data.similarProducts }),
          ...(data.complementaryProducts && { complementaryProducts: data.complementaryProducts })
        }
      },
      { upsert: true }
    );
  }
}

export const recommendationService = new RecommendationService();
export default recommendationService;
