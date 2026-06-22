import { v4 as uuidv4 } from 'uuid';
import { Review, IReview, Brand, IBrand } from '../models/index.js';
import { sentimentService } from './sentiment.service.js';

// ============================================================================
// REVIEW SERVICE
// ============================================================================

export interface CreateReviewParams {
  brandId: string;
  tenantId: string;
  source: IReview['source'];
  content: string;
  rating: number;
  title?: string;
  author: {
    name: string;
    avatar?: string;
    isVerified?: boolean;
    reviewCount?: number;
  };
  sourceId?: string;
  sourceUrl?: string;
  publishedAt?: Date;
  metadata?: Partial<IReview['metadata']>;
}

export interface ReviewFilter {
  brandId: string;
  tenantId?: string;
  source?: IReview['source'];
  sentiment?: IReview['sentiment']['label'];
  rating?: { min?: number; max?: number };
  dateRange?: { start: Date; end: Date };
  moderationStatus?: IReview['moderation']['status'];
  page?: number;
  limit?: number;
  sortBy?: 'publishedAt' | 'rating' | 'sentiment';
  sortOrder?: 'asc' | 'desc';
}

export class ReviewService {
  /**
   * Create a new review
   */
  async createReview(params: CreateReviewParams): Promise<IReview> {
    // Analyze sentiment
    const sentiment = await sentimentService.analyze(params.content);

    // Generate review ID
    const reviewId = params.sourceId || `rev_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    // Create review
    const review = new Review({
      reviewId,
      brandId: params.brandId,
      tenantId: params.tenantId,
      source: params.source,
      content: params.content,
      rating: params.rating,
      title: params.title,
      author: {
        name: params.author.name,
        avatar: params.author.avatar,
        isVerified: params.author.isVerified || false,
        reviewCount: params.author.reviewCount
      },
      sourceId: params.sourceId,
      sourceUrl: params.sourceUrl,
      sentiment: {
        score: sentiment.score,
        label: sentiment.label,
        confidence: sentiment.confidence,
        aspects: sentiment.aspects,
        keywords: sentiment.keywords
      },
      moderation: {
        status: 'pending'
      },
      publishedAt: params.publishedAt || new Date(),
      metadata: {
        language: params.metadata?.language || 'en',
        verified: params.metadata?.verified || false,
        sponsored: params.metadata?.sponsored || false,
        location: params.metadata?.location,
        device: params.metadata?.device
      }
    });

    await review.save();

    // Update brand stats
    await this.updateBrandStats(params.brandId);

    // Check for alerts
    await this.checkForAlerts(review);

    return review;
  }

  /**
   * Get reviews with filtering
   */
  async getReviews(filter: ReviewFilter): Promise<{
    reviews: IReview[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = { brandId: filter.brandId };

    if (filter.tenantId) query.tenantId = filter.tenantId;
    if (filter.source) query.source = filter.source;
    if (filter.sentiment) query['sentiment.label'] = filter.sentiment;
    if (filter.moderationStatus) query['moderation.status'] = filter.moderationStatus;

    if (filter.rating) {
      query.rating = {};
      if (filter.rating.min !== undefined) query.rating.$gte = filter.rating.min;
      if (filter.rating.max !== undefined) query.rating.$lte = filter.rating.max;
    }

    if (filter.dateRange) {
      query.publishedAt = {
        $gte: filter.dateRange.start,
        $lte: filter.dateRange.end
      };
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const sortField = filter.sortBy || 'publishedAt';
    const sortOrder = filter.sortOrder || 'desc';
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [reviews, total] = await Promise.all([
      Review.find(query).sort(sort).skip(skip).limit(limit),
      Review.countDocuments(query)
    ]);

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get single review
   */
  async getReview(reviewId: string): Promise<IReview | null> {
    return Review.findOne({ reviewId });
  }

  /**
   * Update review
   */
  async updateReview(reviewId: string, updates: Partial<IReview>): Promise<IReview | null> {
    const review = await Review.findOneAndUpdate(
      { reviewId },
      { $set: updates },
      { new: true }
    );

    if (review) {
      await this.updateBrandStats(review.brandId);
    }

    return review;
  }

  /**
   * Moderate review
   */
  async moderateReview(
    reviewId: string,
    status: IReview['moderation']['status'],
    moderatorId: string,
    flagReason?: string
  ): Promise<IReview | null> {
    const update: any = {
      'moderation.status': status,
      'moderation.moderatedAt': new Date(),
      'moderation.moderatedBy': moderatorId
    };

    if (status === 'flagged') {
      update['moderation.flagged'] = true;
      update['moderation.flagReason'] = flagReason;
    }

    return Review.findOneAndUpdate(
      { reviewId },
      { $set: update },
      { new: true }
    );
  }

  /**
   * Add response to review
   */
  async addResponse(
    reviewId: string,
    content: string,
    author: string
  ): Promise<IReview | null> {
    const review = await Review.findOne({ reviewId });
    if (!review) return null;

    // Analyze response sentiment
    const sentiment = await sentimentService.analyze(content);

    review.responses.push({
      content,
      author,
      createdAt: new Date(),
      sentiment: sentiment.label
    });

    await review.save();
    return review;
  }

  /**
   * Get review statistics
   */
  async getReviewStats(brandId: string, dateRange?: { start: Date; end: Date }): Promise<{
    total: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
    sourceDistribution: { [key: string]: number };
    sentimentDistribution: { positive: number; neutral: number; negative: number };
    recentTrend: number[];
  }> {
    const query: any = { brandId, 'moderation.status': 'approved' };

    if (dateRange) {
      query.publishedAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const reviews = await Review.find(query);

    if (reviews.length === 0) {
      return {
        total: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        sourceDistribution: {},
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        recentTrend: []
      };
    }

    // Calculate stats
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const sourceDistribution: { [key: string]: number } = {};
    const sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
    let totalRating = 0;

    for (const review of reviews) {
      totalRating += review.rating;
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
      sourceDistribution[review.source] = (sourceDistribution[review.source] || 0) + 1;
      sentimentDistribution[review.sentiment.label]++;
    }

    // Get recent trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReviews = await Review.find({
      brandId,
      'moderation.status': 'approved',
      publishedAt: { $gte: thirtyDaysAgo }
    }).sort({ publishedAt: 1 });

    const recentTrend = recentReviews.map(r => r.sentiment.score);

    return {
      total: reviews.length,
      averageRating: totalRating / reviews.length,
      ratingDistribution,
      sourceDistribution,
      sentimentDistribution,
      recentTrend
    };
  }

  /**
   * Update brand statistics
   */
  private async updateBrandStats(brandId: string): Promise<void> {
    const reviews = await Review.find({
      brandId,
      'moderation.status': 'approved'
    });

    if (reviews.length === 0) {
      await Brand.updateOne(
        { brandId },
        {
          $set: {
            'stats.totalReviews': 0,
            'stats.averageRating': 0,
            'stats.sentimentScore': 0,
            'stats.positivePercent': 0,
            'stats.neutralPercent': 0,
            'stats.negativePercent': 0,
            'stats.lastUpdated': new Date()
          }
        }
      );
      return;
    }

    const stats = await sentimentService.calculateBrandScore(reviews);
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await Brand.updateOne(
      { brandId },
      {
        $set: {
          'stats.totalReviews': reviews.length,
          'stats.averageRating': avgRating,
          'stats.sentimentScore': stats.score,
          'stats.positivePercent': stats.positivePercent,
          'stats.neutralPercent': stats.neutralPercent,
          'stats.negativePercent': stats.negativePercent,
          'stats.lastUpdated': new Date()
        }
      }
    );
  }

  /**
   * Check for alerts based on review
   */
  private async checkForAlerts(review: IReview): Promise<void> {
    const brand = await Brand.findOne({ brandId: review.brandId });
    if (!brand) return;

    // Import Alert model here to avoid circular dependency
    const { Alert } = await import('../models/index.js');

    // Check for negative review
    if (review.sentiment.label === 'negative' && review.sentiment.confidence > 0.7) {
      const existingAlert = await Alert.findOne({
        brandId: review.brandId,
        reviewId: review.reviewId,
        status: 'active'
      });

      if (!existingAlert) {
        await Alert.create({
          brandId: review.brandId,
          tenantId: review.tenantId,
          type: 'negative_review',
          severity: review.sentiment.confidence > 0.9 ? 'high' : 'medium',
          title: `Negative review from ${review.author.name}`,
          message: review.content.substring(0, 200),
          reviewId: review.reviewId,
          data: {
            sentiment: review.sentiment,
            rating: review.rating,
            source: review.source
          }
        });
      }
    }

    // Check for low rating
    if (review.rating <= 2) {
      const existingAlert = await Alert.findOne({
        brandId: review.brandId,
        reviewId: review.reviewId,
        type: 'low_rating',
        status: 'active'
      });

      if (!existingAlert) {
        await Alert.create({
          brandId: review.brandId,
          tenantId: review.tenantId,
          type: 'low_rating',
          severity: review.rating === 1 ? 'critical' : 'high',
          title: `Low rating (${review.rating}/5) from ${review.author.name}`,
          message: review.content.substring(0, 200),
          reviewId: review.reviewId,
          data: { rating: review.rating }
        });
      }
    }
  }

  /**
   * Bulk import reviews
   */
  async bulkImport(reviews: CreateReviewParams[]): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const reviewData of reviews) {
      try {
        await this.createReview(reviewData);
        imported++;
      } catch (error) {
        failed++;
        errors.push(`Failed to import review: ${error}`);
      }
    }

    return { imported, failed, errors };
  }
}

export const reviewService = new ReviewService();
