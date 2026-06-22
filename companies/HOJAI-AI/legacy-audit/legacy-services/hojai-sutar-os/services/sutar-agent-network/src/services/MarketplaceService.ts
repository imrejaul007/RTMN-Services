// ============================================================================
// SUTAR Agent Network - Marketplace Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  MarketplaceListing,
  ServiceOffered,
  Agent,
  ApiResponse,
} from '../types/index.js';

export interface MarketplaceSearchFilters {
  category?: string;
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  availability?: 'now' | 'scheduled';
  featured?: boolean;
  skills?: string[];
  location?: string;
  languages?: string[];
}

export class MarketplaceService {
  private listings: Map<string, MarketplaceListing> = new Map();
  private agentListings: Map<string, string[]> = new Map();

  /**
   * Create a marketplace listing
   */
  createListing(agentId: string, data: {
    title: string;
    description: string;
    services: ServiceOffered[];
    pricing: {
      hourlyRate?: number;
      dailyRate?: number;
      fixedPrice?: number;
      currency: string;
      negotiable: boolean;
    };
    availability: {
      availableNow: boolean;
      nextAvailable?: string;
      limitedSlots?: number;
    };
  }): MarketplaceListing {
    const now = new Date().toISOString();
    const listing: MarketplaceListing = {
      id: `listing-${uuidv4()}`,
      agentId,
      title: data.title,
      description: data.description,
      services: data.services,
      pricing: {
        ...data.pricing,
        currency: data.pricing.currency || 'USD',
      },
      availability: data.availability,
      ratings: {
        average: 0,
        totalReviews: 0,
        fiveStar: 0,
      },
      statistics: {
        totalJobs: 0,
        completionRate: 100,
        responseTime: 0,
        memberSince: now,
      },
      featured: false,
      promoted: false,
      views: 0,
      inquiries: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.listings.set(listing.id, listing);

    // Track agent's listings
    if (!this.agentListings.has(agentId)) {
      this.agentListings.set(agentId, []);
    }
    this.agentListings.get(agentId)!.push(listing.id);

    return listing;
  }

  /**
   * Get listing by ID
   */
  getListing(listingId: string): MarketplaceListing | undefined {
    return this.listings.get(listingId);
  }

  /**
   * Get listing by agent ID
   */
  getListingByAgent(agentId: string): MarketplaceListing | undefined {
    const listingIds = this.agentListings.get(agentId);
    if (!listingIds || listingIds.length === 0) {
      return undefined;
    }
    return this.listings.get(listingIds[0]);
  }

  /**
   * Get all active listings
   */
  getAllListings(filters?: MarketplaceSearchFilters): MarketplaceListing[] {
    let listings = Array.from(this.listings.values()).filter(l => l.status === 'active');

    if (filters) {
      if (filters.minRating !== undefined) {
        listings = listings.filter(l => l.ratings.average >= filters.minRating!);
      }

      if (filters.maxPrice !== undefined) {
        listings = listings.filter(l => {
          const price = l.pricing.hourlyRate || l.pricing.dailyRate || l.pricing.fixedPrice || 0;
          return price <= filters.maxPrice!;
        });
      }

      if (filters.minPrice !== undefined) {
        listings = listings.filter(l => {
          const price = l.pricing.hourlyRate || l.pricing.dailyRate || l.pricing.fixedPrice || 0;
          return price >= filters.minPrice!;
        });
      }

      if (filters.availability === 'now') {
        listings = listings.filter(l => l.availability.availableNow);
      } else if (filters.availability === 'scheduled') {
        listings = listings.filter(l => !l.availability.availableNow);
      }

      if (filters.featured) {
        listings = listings.filter(l => l.featured);
      }

      if (filters.skills && filters.skills.length > 0) {
        listings = listings.filter(l =>
          filters.skills!.some(skill =>
            l.description.toLowerCase().includes(skill.toLowerCase()) ||
            l.services.some(s => s.name.toLowerCase().includes(skill.toLowerCase()))
          )
        );
      }

      if (filters.location) {
        listings = listings.filter(l =>
          l.description.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }
    }

    // Sort by featured first, then by rating
    return listings.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.ratings.average - a.ratings.average;
    });
  }

  /**
   * Update listing
   */
  updateListing(listingId: string, updates: Partial<MarketplaceListing>): MarketplaceListing | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return undefined;
    }

    const updatedListing: MarketplaceListing = {
      ...listing,
      ...updates,
      id: listing.id,
      agentId: listing.agentId,
      createdAt: listing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.listings.set(listingId, updatedListing);
    return updatedListing;
  }

  /**
   * Update pricing
   */
  updatePricing(
    listingId: string,
    pricing: Partial<MarketplaceListing['pricing']>
  ): MarketplaceListing | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return undefined;
    }

    listing.pricing = { ...listing.pricing, ...pricing };
    listing.updatedAt = new Date().toISOString();
    this.listings.set(listingId, listing);

    return listing;
  }

  /**
   * Update availability
   */
  updateAvailability(
    listingId: string,
    availability: Partial<MarketplaceListing['availability']>
  ): MarketplaceListing | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return undefined;
    }

    listing.availability = { ...listing.availability, ...availability };
    listing.updatedAt = new Date().toISOString();
    this.listings.set(listingId, listing);

    return listing;
  }

  /**
   * Add service to listing
   */
  addService(listingId: string, service: ServiceOffered): MarketplaceListing | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return undefined;
    }

    listing.services.push(service);
    listing.updatedAt = new Date().toISOString();
    this.listings.set(listingId, listing);

    return listing;
  }

  /**
   * Remove service from listing
   */
  removeService(listingId: string, serviceIndex: number): MarketplaceListing | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return undefined;
    }

    if (serviceIndex >= 0 && serviceIndex < listing.services.length) {
      listing.services.splice(serviceIndex, 1);
      listing.updatedAt = new Date().toISOString();
      this.listings.set(listingId, listing);
    }

    return listing;
  }

  /**
   * Record view
   */
  recordView(listingId: string): void {
    const listing = this.listings.get(listingId);
    if (listing) {
      listing.views += 1;
      this.listings.set(listingId, listing);
    }
  }

  /**
   * Record inquiry
   */
  recordInquiry(listingId: string): void {
    const listing = this.listings.get(listingId);
    if (listing) {
      listing.inquiries += 1;
      this.listings.set(listingId, listing);
    }
  }

  /**
   * Add review
   */
  addReview(
    listingId: string,
    review: { rating: number; comment?: string }
  ): MarketplaceListing | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return undefined;
    }

    const totalRating = listing.ratings.average * listing.ratings.totalReviews + review.rating;
    listing.ratings.totalReviews += 1;
    listing.ratings.average = totalRating / listing.ratings.totalReviews;

    if (review.rating === 5) {
      listing.ratings.fiveStar += 1;
    }

    listing.updatedAt = new Date().toISOString();
    this.listings.set(listingId, listing);

    return listing;
  }

  /**
   * Record job completion
   */
  recordJobCompletion(listingId: string, success: boolean): void {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return;
    }

    listing.statistics.totalJobs += 1;
    const currentSuccessCount = Math.round(
      (listing.statistics.completionRate / 100) * (listing.statistics.totalJobs - 1)
    );
    listing.statistics.completionRate = success
      ? ((currentSuccessCount + 1) / listing.statistics.totalJobs) * 100
      : (currentSuccessCount / listing.statistics.totalJobs) * 100;

    this.listings.set(listingId, listing);
  }

  /**
   * Record response time
   */
  recordResponseTime(listingId: string, responseTimeMinutes: number): void {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return;
    }

    const totalTime =
      listing.statistics.responseTime * (listing.statistics.totalJobs - 1) + responseTimeMinutes;
    listing.statistics.responseTime = totalTime / listing.statistics.totalJobs;

    this.listings.set(listingId, listing);
  }

  /**
   * Set featured status
   */
  setFeatured(listingId: string, featured: boolean): MarketplaceListing | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return undefined;
    }

    listing.featured = featured;
    listing.updatedAt = new Date().toISOString();
    this.listings.set(listingId, listing);

    return listing;
  }

  /**
   * Set promoted status
   */
  setPromoted(listingId: string, promoted: boolean): MarketplaceListing | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return undefined;
    }

    listing.promoted = promoted;
    listing.updatedAt = new Date().toISOString();
    this.listings.set(listingId, listing);

    return listing;
  }

  /**
   * Pause listing
   */
  pauseListing(listingId: string): MarketplaceListing | undefined {
    return this.updateListing(listingId, { status: 'paused' });
  }

  /**
   * Resume listing
   */
  resumeListing(listingId: string): MarketplaceListing | undefined {
    return this.updateListing(listingId, { status: 'active' });
  }

  /**
   * Suspend listing
   */
  suspendListing(listingId: string): MarketplaceListing | undefined {
    return this.updateListing(listingId, { status: 'suspended' });
  }

  /**
   * Delete listing
   */
  deleteListing(listingId: string): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return false;
    }

    // Remove from agent's listings
    const agentListings = this.agentListings.get(listing.agentId);
    if (agentListings) {
      const index = agentListings.indexOf(listingId);
      if (index > -1) {
        agentListings.splice(index, 1);
      }
    }

    return this.listings.delete(listingId);
  }

  /**
   * Get listings by agent
   */
  getListingsByAgent(agentId: string): MarketplaceListing[] {
    const listingIds = this.agentListings.get(agentId) || [];
    return listingIds
      .map(id => this.listings.get(id))
      .filter((l): l is MarketplaceListing => l !== undefined);
  }

  /**
   * Get featured listings
   */
  getFeaturedListings(limit: number = 10): MarketplaceListing[] {
    return Array.from(this.listings.values())
      .filter(l => l.featured && l.status === 'active')
      .sort((a, b) => b.ratings.average - a.ratings.average)
      .slice(0, limit);
  }

  /**
   * Get promoted listings
   */
  getPromotedListings(limit: number = 10): MarketplaceListing[] {
    return Array.from(this.listings.values())
      .filter(l => l.promoted && l.status === 'active')
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  /**
   * Get trending listings
   */
  getTrendingListings(limit: number = 10): MarketplaceListing[] {
    return Array.from(this.listings.values())
      .filter(l => l.status === 'active')
      .sort((a, b) => b.inquiries - a.inquiries)
      .slice(0, limit);
  }

  /**
   * Get marketplace statistics
   */
  getMarketplaceStats(): {
    totalListings: number;
    activeListings: number;
    averageRating: number;
    totalJobs: number;
    averagePrice: number;
    topCategories: Array<{ category: string; count: number }>;
  } {
    const listings = Array.from(this.listings.values()).filter(l => l.status === 'active');
    const totalRating = listings.reduce((sum, l) => sum + l.ratings.average, 0);
    const totalJobs = listings.reduce((sum, l) => sum + l.statistics.totalJobs, 0);
    const prices = listings
      .map(l => l.pricing.hourlyRate || l.pricing.dailyRate || l.pricing.fixedPrice || 0)
      .filter(p => p > 0);
    const averagePrice = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0;

    // Count categories from services
    const categoryCounts: Map<string, number> = new Map();
    listings.forEach(l => {
      l.services.forEach(s => {
        categoryCounts.set(s.name, (categoryCounts.get(s.name) || 0) + 1);
      });
    });

    return {
      totalListings: this.listings.size,
      activeListings: listings.length,
      averageRating: listings.length > 0 ? totalRating / listings.length : 0,
      totalJobs,
      averagePrice,
      topCategories: Array.from(categoryCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }

  /**
   * Search listings
   */
  searchListings(query: string, limit: number = 20): MarketplaceListing[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.listings.values())
      .filter(
        l =>
          l.status === 'active' &&
          (l.title.toLowerCase().includes(lowerQuery) ||
            l.description.toLowerCase().includes(lowerQuery) ||
            l.services.some(s => s.name.toLowerCase().includes(lowerQuery)))
      )
      .sort((a, b) => b.ratings.average - a.ratings.average)
      .slice(0, limit);
  }

  /**
   * Export listing data
   */
  exportListing(listingId: string): Record<string, unknown> | undefined {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return undefined;
    }

    return {
      ...listing,
      exportDate: new Date().toISOString(),
    };
  }
}

// Singleton instance
export const marketplaceService = new MarketplaceService();
