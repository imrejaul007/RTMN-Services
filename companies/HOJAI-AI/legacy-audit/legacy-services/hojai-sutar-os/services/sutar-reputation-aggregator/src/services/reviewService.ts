import { v4 as uuidv4 } from 'uuid';
import {
  Review,
  ReviewInput,
  ReviewFilters,
  ReviewSource,
  ReviewStatus,
} from '../types/index.js';

interface ReviewStore {
  reviews: Map<string, Review>;
  entityIndex: Map<string, Set<string>>;
}

const store: ReviewStore = {
  reviews: new Map(),
  entityIndex: new Map(),
};

export class ReviewService {
  async addReview(input: ReviewInput): Promise<Review> {
    const now = new Date().toISOString();
    const review: Review = {
      id: uuidv4(),
      entityId: input.entityId,
      userId: input.userId,
      rating: this.validateRating(input.rating),
      title: input.title.trim(),
      content: input.content.trim(),
      source: input.source || 'manual',
      status: 'approved', // Auto-approve for now
      verified: input.verified || false,
      helpful: 0,
      notHelpful: 0,
      tags: input.tags || [],
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    // Store the review
    store.reviews.set(review.id, review);

    // Index by entity
    if (!store.entityIndex.has(input.entityId)) {
      store.entityIndex.set(input.entityId, new Set());
    }
    store.entityIndex.get(input.entityId)!.add(review.id);

    console.log(`[ReviewService] Added review ${review.id} for entity ${input.entityId}`);
    return review;
  }

  async getReview(reviewId: string): Promise<Review | null> {
    return store.reviews.get(reviewId) || null;
  }

  async updateReview(reviewId: string, updates: Partial<Review>): Promise<Review | null> {
    const review = store.reviews.get(reviewId);
    if (!review) return null;

    const updatedReview: Review = {
      ...review,
      ...updates,
      id: review.id, // Prevent ID change
      entityId: review.entityId, // Prevent entity change
      createdAt: review.createdAt, // Prevent creation time change
      updatedAt: new Date().toISOString(),
    };

    store.reviews.set(reviewId, updatedReview);
    return updatedReview;
  }

  async deleteReview(reviewId: string): Promise<boolean> {
    const review = store.reviews.get(reviewId);
    if (!review) return false;

    store.reviews.delete(reviewId);

    const entityReviews = store.entityIndex.get(review.entityId);
    if (entityReviews) {
      entityReviews.delete(reviewId);
      if (entityReviews.size === 0) {
        store.entityIndex.delete(review.entityId);
      }
    }

    return true;
  }

  async getReviewsByEntity(entityId: string, filters?: ReviewFilters): Promise<Review[]> {
    const reviewIds = store.entityIndex.get(entityId);
    if (!reviewIds) return [];

    let reviews = Array.from(reviewIds)
      .map(id => store.reviews.get(id))
      .filter((r): r is Review => r !== undefined);

    // Apply filters
    if (filters) {
      if (filters.status) {
        reviews = reviews.filter(r => r.status === filters.status);
      }
      if (filters.minRating !== undefined) {
        reviews = reviews.filter(r => r.rating >= filters.minRating!);
      }
      if (filters.maxRating !== undefined) {
        reviews = reviews.filter(r => r.rating <= filters.maxRating!);
      }
      if (filters.source) {
        reviews = reviews.filter(r => r.source === filters.source);
      }
      if (filters.verified !== undefined) {
        reviews = reviews.filter(r => r.verified === filters.verified);
      }
      if (filters.startDate) {
        reviews = reviews.filter(r => r.createdAt >= filters.startDate!);
      }
      if (filters.endDate) {
        reviews = reviews.filter(r => r.createdAt <= filters.endDate!);
      }

      // Sort by creation date (newest first)
      reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      if (filters.offset) {
        reviews = reviews.slice(filters.offset);
      }
      if (filters.limit) {
        reviews = reviews.slice(0, filters.limit);
      }
    }

    return reviews;
  }

  async getReviewByUserAndEntity(userId: string, entityId: string): Promise<Review | null> {
    const reviewIds = store.entityIndex.get(entityId);
    if (!reviewIds) return null;

    for (const reviewId of reviewIds) {
      const review = store.reviews.get(reviewId);
      if (review && review.userId === userId) {
        return review;
      }
    }
    return null;
  }

  async voteHelpful(reviewId: string): Promise<Review | null> {
    const review = store.reviews.get(reviewId);
    if (!review) return null;

    review.helpful++;
    review.updatedAt = new Date().toISOString();
    return review;
  }

  async voteNotHelpful(reviewId: string): Promise<Review | null> {
    const review = store.reviews.get(reviewId);
    if (!review) return null;

    review.notHelpful++;
    review.updatedAt = new Date().toISOString();
    return review;
  }

  async updateStatus(reviewId: string, status: ReviewStatus): Promise<Review | null> {
    const review = store.reviews.get(reviewId);
    if (!review) return null;

    review.status = status;
    review.updatedAt = new Date().toISOString();
    return review;
  }

  async getStats(entityId: string): Promise<ReviewStats> {
    const reviews = await this.getReviewsByEntity(entityId);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    let verifiedCount = 0;
    let totalHelpful = 0;
    let totalNotHelpful = 0;

    reviews.forEach(review => {
      const rating = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
      totalRating += review.rating;
      if (review.verified) verifiedCount++;
      totalHelpful += review.helpful;
      totalNotHelpful += review.notHelpful;
    });

    return {
      totalReviews: reviews.length,
      averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
      distribution,
      verifiedCount,
      totalHelpful,
      totalNotHelpful,
    };
  }

  private validateRating(rating: number): number {
    return Math.max(1, Math.min(5, Math.round(rating)));
  }

  // For testing/debugging
  clearStore(): void {
    store.reviews.clear();
    store.entityIndex.clear();
  }

  getStoreSize(): number {
    return store.reviews.size;
  }
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  verifiedCount: number;
  totalHelpful: number;
  totalNotHelpful: number;
}

// Export a singleton store accessor for use by other services
export const reviewStore = {
  getReviewsByEntity: (entityId: string): Review[] => {
    const reviewIds = store.entityIndex.get(entityId);
    if (!reviewIds) return [];
    return Array.from(reviewIds)
      .map(id => store.reviews.get(id))
      .filter((r): r is Review => r !== undefined);
  },
};

export const reviewService = new ReviewService();