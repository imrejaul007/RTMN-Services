// ============================================================================
// SUTAR Marketplace - Recommendation Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { storage, COLLECTIONS } from './storage';
import { serviceCatalog } from './serviceCatalog';
import { favoritesService } from './favoritesService';
import { orderService } from './orderService';
import {
  Recommendation,
  RecommendationReason,
  Service,
} from './types';

interface UserProfile {
  userId: string;
  interests: string[];
  purchasedServices: string[];
  favoriteCategories: string[];
  averageRating: number;
  totalSpending: number;
  lastUpdated: string;
}

export class RecommendationService {
  private readonly MAX_RECOMMENDATIONS = 20;
  private readonly TRENDING_DECAY_HOURS = 24 * 7; // 7 days

  // Get personalized recommendations for user
  public getRecommendations(userId: string, params: {
    limit?: number;
    offset?: number;
    categories?: string[];
  } = {}): { recommendations: Recommendation[]; total: number } {
    const { limit = this.MAX_RECOMMENDATIONS, offset = 0, categories } = params;

    // Get user's purchase history
    const userOrders = orderService.getOrdersByUser(userId);
    const purchasedServiceIds = new Set(
      userOrders.orders
        .filter(o => o.status === 'completed')
        .flatMap(o => o.items.map(i => i.serviceId))
    );

    // Get user favorites
    const userFavorites = favoritesService.getFavorites(userId);
    const favoriteServiceIds = new Set(userFavorites.favorites.map(f => f.serviceId));

    // Build user profile
    const userProfile = this.buildUserProfile(userId, userOrders.orders, userFavorites.favorites);

    // Generate recommendations
    const recommendations: Recommendation[] = [];

    // 1. Similar to purchased services
    const purchasedServices = Array.from(purchasedServiceIds)
      .map(id => serviceCatalog.getService(id))
      .filter(Boolean) as Service[];

    purchasedServices.forEach(service => {
      const similar = this.findSimilarServices(service, purchasedServiceIds);
      similar.slice(0, 3).forEach(s => {
        if (!this.hasRecommendation(recommendations, s.id)) {
          recommendations.push(this.createRecommendation(userId, s, 'similar_to_purchased', {
            reason: `Similar to ${service.name}`,
            basedOn: service.id,
          }));
        }
      });
    });

    // 2. Popular in user's favorite categories
    userProfile.favoriteCategories.forEach(category => {
      const popular = serviceCatalog.searchServices({
        category,
        status: 'active',
        sortBy: 'popular',
        limit: 5,
      }).services;

      popular.forEach(s => {
        if (!this.hasRecommendation(recommendations, s.id) && !purchasedServiceIds.has(s.id)) {
          recommendations.push(this.createRecommendation(userId, s, 'popular_in_category', {
            reason: `Popular in ${category}`,
          }));
        }
      });
    });

    // 3. Trending services
    const trending = serviceCatalog.getTrendingServices(10);
    trending.forEach(s => {
      if (!this.hasRecommendation(recommendations, s.id) && !purchasedServiceIds.has(s.id)) {
        recommendations.push(this.createRecommendation(userId, s, 'trending', {
          reason: 'Trending now',
        }));
      }
    });

    // 4. Highly rated services in user's interests
    userProfile.interests.forEach(interest => {
      const highlyRated = serviceCatalog.searchServices({
        query: interest,
        minRating: 4,
        status: 'active',
        sortBy: 'rating',
        limit: 3,
      }).services;

      highlyRated.forEach(s => {
        if (!this.hasRecommendation(recommendations, s.id) && !purchasedServiceIds.has(s.id)) {
          recommendations.push(this.createRecommendation(userId, s, 'highly_rated', {
            reason: `Highly rated in ${interest}`,
          }));
        }
      });
    });

    // 5. New releases in favorite categories
    const newInCategories = (categories || userProfile.favoriteCategories).map(category => {
      return serviceCatalog.searchServices({
        category,
        status: 'active',
        sortBy: 'newest',
        limit: 3,
      }).services;
    }).flat();

    newInCategories.forEach(s => {
      if (!this.hasRecommendation(recommendations, s.id) && !purchasedServiceIds.has(s.id)) {
        recommendations.push(this.createRecommendation(userId, s, 'new_release', {
          reason: 'New in your favorite category',
        }));
      }
    });

    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);

    // Assign positions
    recommendations.forEach((rec, index) => {
      rec.position = index + 1;
    });

    return {
      recommendations: recommendations.slice(offset, offset + limit),
      total: recommendations.length,
    };
  }

  // Get trending recommendations
  public getTrendingRecommendations(limit = 10): Recommendation[] {
    const trending = serviceCatalog.getTrendingServices(limit);
    return trending.map(service => this.createRecommendation('anonymous', service, 'trending', {
      reason: 'Trending now',
    }));
  }

  // Get category-based recommendations
  public getCategoryRecommendations(categoryId: string, limit = 10): Recommendation[] {
    const services = serviceCatalog.searchServices({
      category: categoryId,
      status: 'active',
      sortBy: 'rating',
      limit,
    }).services;

    return services.map(service => this.createRecommendation('anonymous', service, 'popular_in_category', {
      reason: `Popular in ${service.category}`,
    }));
  }

  // Get frequently bought together
  public getFrequentlyBoughtTogether(serviceId: string, limit = 5): Recommendation[] {
    const orders = storage.getAll<any>(COLLECTIONS.ORDERS)
      .filter(o => o.status === 'completed' && o.items.some((i: any) => i.serviceId === serviceId));

    const coOccurrence = new Map<string, number>();

    orders.forEach(order => {
      const relatedServices = order.items
        .filter((i: any) => i.serviceId !== serviceId)
        .map((i: any) => i.serviceId as string);

      relatedServices.forEach((relatedId: string) => {
        coOccurrence.set(relatedId, (coOccurrence.get(relatedId) || 0) + 1);
      });
    });

    const sorted = Array.from(coOccurrence.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([id, count]) => {
      const service = serviceCatalog.getService(id);
      if (!service) return null;
      return this.createRecommendation('anonymous', service, 'frequently_bought_together', {
        reason: `Bought together ${count} times`,
        basedOn: serviceId,
      });
    }).filter(Boolean) as Recommendation[];
  }

  // Get personalized homepage feed
  public getHomepageFeed(userId?: string, limit = 20): {
    featured: Recommendation[];
    trending: Recommendation[];
    newReleases: Recommendation[];
    forYou: Recommendation[];
  } {
    const featured = serviceCatalog.getFeaturedServices(5).map(s =>
      this.createRecommendation(userId || 'anonymous', s, 'personalized', {
        reason: 'Featured',
      })
    );

    const trending = this.getTrendingRecommendations(5);

    const newReleases = serviceCatalog.searchServices({
      status: 'active',
      sortBy: 'newest',
      limit: 5,
    }).services.map(s =>
      this.createRecommendation(userId || 'anonymous', s, 'new_release', {
        reason: 'New release',
      })
    );

    const forYou = userId
      ? this.getRecommendations(userId, { limit: 5 }).recommendations
      : trending;

    return { featured, trending, newReleases, forYou };
  }

  // Track recommendation view
  public trackView(recommendationId: string): void {
    const rec = storage.get<Recommendation>(COLLECTIONS.RECOMMENDATIONS, recommendationId);
    if (rec) {
      storage.update(COLLECTIONS.RECOMMENDATIONS, recommendationId, {
        viewed: true,
      });
    }
  }

  // Track recommendation click
  public trackClick(recommendationId: string): void {
    const rec = storage.get<Recommendation>(COLLECTIONS.RECOMMENDATIONS, recommendationId);
    if (rec) {
      storage.update(COLLECTIONS.RECOMMENDATIONS, recommendationId, {
        clicked: true,
      });
    }
  }

  // Get recommendation analytics
  public getRecommendationAnalytics(): {
    totalRecommendations: number;
    viewRate: number;
    clickRate: number;
    conversionRate: number;
    topReasons: { reason: RecommendationReason; count: number }[];
  } {
    const recommendations = storage.getAll<Recommendation>(COLLECTIONS.RECOMMENDATIONS);

    const viewed = recommendations.filter(r => r.viewed).length;
    const clicked = recommendations.filter(r => r.clicked).length;

    const reasonCounts = new Map<RecommendationReason, number>();
    recommendations.forEach(r => {
      reasonCounts.set(r.reason, (reasonCounts.get(r.reason) || 0) + 1);
    });

    return {
      totalRecommendations: recommendations.length,
      viewRate: recommendations.length > 0 ? (viewed / recommendations.length) * 100 : 0,
      clickRate: viewed > 0 ? (clicked / viewed) * 100 : 0,
      conversionRate: clicked > 0 ? (clicked / recommendations.length) * 100 : 0,
      topReasons: Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }

  // Private helper methods
  private buildUserProfile(userId: string, orders: any[], favorites: any[]): UserProfile {
    const purchasedServices = orders
      .filter(o => o.status === 'completed')
      .flatMap((o: any) => o.items.map((i: any) => i.serviceId));

    const serviceDetails = purchasedServices
      .map(id => serviceCatalog.getService(id))
      .filter(Boolean) as Service[];

    const categoryCounts = new Map<string, number>();
    serviceDetails.forEach(s => {
      categoryCounts.set(s.category, (categoryCounts.get(s.category) || 0) + 1);
    });

    const favoriteCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    const interests = [
      ...new Set([
        ...serviceDetails.flatMap(s => s.tags),
        ...favoriteCategories,
      ]),
    ].slice(0, 20);

    const totalSpending = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0);

    return {
      userId,
      interests,
      purchasedServices: [...new Set(purchasedServices)],
      favoriteCategories,
      averageRating: serviceDetails.length > 0
        ? serviceDetails.reduce((sum, s) => sum + s.rating, 0) / serviceDetails.length
        : 0,
      totalSpending,
      lastUpdated: new Date().toISOString(),
    };
  }

  private findSimilarServices(service: Service, excludeIds: Set<string>, limit = 5): Service[] {
    return serviceCatalog.searchServices({
      category: service.category,
      tags: service.tags,
      status: 'active',
      sortBy: 'rating',
      limit: 10,
    }).services
      .filter(s => s.id !== service.id && !excludeIds.has(s.id))
      .slice(0, limit);
  }

  private hasRecommendation(recommendations: Recommendation[], serviceId: string): boolean {
    return recommendations.some(r => r.serviceId === serviceId);
  }

  private createRecommendation(
    userId: string,
    service: Service,
    reason: RecommendationReason,
    options: { reason: string; basedOn?: string }
  ): Recommendation {
    const score = this.calculateScore(service, reason);

    const recommendation: Recommendation = {
      id: `rec-${uuidv4()}`,
      userId,
      serviceId: service.id,
      serviceName: service.name,
      serviceThumbnail: service.thumbnail,
      servicePrice: service.price,
      score,
      reason,
      reasons: [options.reason],
      position: 0,
      viewed: false,
      clicked: false,
      createdAt: new Date().toISOString(),
    };

    // Store for tracking
    storage.create(COLLECTIONS.RECOMMENDATIONS, recommendation);

    return recommendation;
  }

  private calculateScore(service: Service, reason: RecommendationReason): number {
    let score = 0;

    switch (reason) {
      case 'similar_to_purchased':
        score = 90 + service.rating * 2;
        break;
      case 'popular_in_category':
        score = 70 + service.rating * 2 + (service.viewCount / 100);
        break;
      case 'trending':
        score = 80 + (service.downloadCount / 50);
        break;
      case 'highly_rated':
        score = 75 + service.rating * 3;
        break;
      case 'frequently_bought_together':
        score = 85;
        break;
      case 'new_release':
        const daysSinceCreation = (Date.now() - new Date(service.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        score = 70 + Math.max(0, 30 - daysSinceCreation);
        break;
      case 'personalized':
        score = 80 + service.rating * 2;
        break;
      case 'based_on_browsing':
        score = 65 + service.rating * 2;
        break;
      default:
        score = 50 + service.rating * 2;
    }

    return Math.round(score * 100) / 100;
  }
}

// Singleton instance
export const recommendationService = new RecommendationService();