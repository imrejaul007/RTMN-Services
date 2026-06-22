import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';

// Types
import {
  ApiResponse,
  HealthResponse,
  ReviewInput,
  ReviewFilters,
  RatingBreakdown,
  RatingPercentages,
  RatingStatistics,
  RatingTrend,
  EntitySentiment,
  HistoricalData,
  MetricType,
  Review,
} from './types/index.js';

// Services
import { reputationService } from './services/reputationService.js';
import { reviewService } from './services/reviewService.js';
import { sentimentService } from './services/sentimentService.js';
import { historyService } from './services/historyService.js';
import { trustEngineClient } from './services/trustEngineClient.js';

// Middleware
import { createRateLimiter, createStrictRateLimiter } from './middleware/rateLimiter.js';
import {
  validateBody,
  validateQuery,
  validateParams,
  entityIdSchema,
  reviewInputSchema,
  reviewFiltersSchema,
  historyQuerySchema,
  metricTypeSchema,
  entityTypeSchema,
} from './middleware/validation.js';
import { requestLogger, errorLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler, Errors } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4258;
const START_TIME = Date.now();

// Trust Engine URL
const TRUST_ENGINE_URL = process.env.TRUST_ENGINE_URL || 'http://localhost:4180';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting
const generalLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 100 });
const strictLimiter = createStrictRateLimiter(10, 60000);
const writeLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 30 });

app.use(generalLimiter);
app.use(requestLogger);

// Health check (no rate limit)
app.get('/health', (_req: Request, res: Response) => {
  const health: HealthResponse = {
    status: 'healthy',
    service: 'sutar-reputation-aggregator',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  };
  res.json(health);
});

// Service info
app.get('/api/v1/info', (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: 'sutar-reputation-aggregator',
      description: 'Reputation Aggregator - Trust and reputation scoring service',
      version: '1.0.0',
      features: [
        'Reputation score calculation',
        'Review aggregation',
        'Rating breakdown',
        'Sentiment analysis',
        'Trust score integration',
        'Historical tracking',
        'Weighted scoring',
      ],
      endpoints: [
        'GET /api/v1/reputation/:entityId - Get reputation score',
        'GET /api/v1/reputation/:entityId/reviews - Get reviews',
        'POST /api/v1/reputation/:entityId/reviews - Add review',
        'GET /api/v1/reputation/:entityId/sentiment - Sentiment analysis',
        'GET /api/v1/reputation/:entityId/history - Historical reputation',
        'GET /api/v1/ratings/:entityId - Rating breakdown',
      ],
    },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

// Helper function for API responses
const apiResponse = <T>(success: boolean, data?: T, error?: string): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
});

// ============================================
// REPUTATION ENDPOINTS
// ============================================

/**
 * GET /api/v1/reputation/:entityId
 * Get reputation score for an entity
 */
app.get(
  '/api/v1/reputation/:entityId',
  validateParams(entityIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const entityType = (req.query.entityType as string) || 'user';

      // Validate entity type
      const parsedType = entityTypeSchema.safeParse(entityType);
      if (!parsedType.success) {
        res.status(400).json(apiResponse(false, undefined, 'Invalid entity type'));
        return;
      }

      console.log(`[Reputation] Calculating reputation for ${entityId}`);
      const reputation = await reputationService.getReputation(entityId, parsedType.data);

      res.json(apiResponse(true, reputation));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reputation/:entityId/reviews
 * Get reviews for an entity
 */
app.get(
  '/api/v1/reputation/:entityId/reviews',
  validateParams(entityIdSchema),
  validateQuery(reviewFiltersSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const filters = req.query as unknown as ReviewFilters;

      console.log(`[Reviews] Fetching reviews for ${entityId}`);
      const reviews = await reviewService.getReviewsByEntity(entityId, filters);

      // Get stats
      const stats = await reviewService.getStats(entityId);

      res.json(apiResponse(true, {
        reviews,
        pagination: {
          total: reviews.length,
          limit: filters.limit || reviews.length,
          offset: filters.offset || 0,
        },
        stats,
      }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/reputation/:entityId/reviews
 * Add a review for an entity
 */
app.post(
  '/api/v1/reputation/:entityId/reviews',
  writeLimiter,
  validateParams(entityIdSchema),
  validateBody(reviewInputSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const reviewInput: ReviewInput = req.body;

      // Check for duplicate review
      const existingReview = await reviewService.getReviewByUserAndEntity(
        reviewInput.userId,
        entityId
      );

      if (existingReview) {
        res.status(409).json(apiResponse(false, undefined, 'User has already reviewed this entity'));
        return;
      }

      console.log(`[Reviews] Adding review for ${entityId}`);
      const review = await reviewService.addReview(reviewInput);

      // Invalidate reputation cache by recalculating
      await reputationService.calculateReputation(entityId);

      res.status(201).json(apiResponse(true, review));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reputation/:entityId/sentiment
 * Get sentiment analysis for an entity
 */
app.get(
  '/api/v1/reputation/:entityId/sentiment',
  validateParams(entityIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const period = req.query.period as string || '30d';

      console.log(`[Sentiment] Analyzing sentiment for ${entityId}`);
      const sentiment: EntitySentiment = await sentimentService.getEntitySentiment(entityId);

      res.json(apiResponse(true, {
        ...sentiment,
        period,
        analyzedAt: new Date().toISOString(),
      }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reputation/:entityId/history
 * Get historical reputation data
 */
app.get(
  '/api/v1/reputation/:entityId/history',
  validateParams(entityIdSchema),
  validateQuery(historyQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const { startDate, endDate, limit, metricType } = req.query as {
        startDate?: string;
        endDate?: string;
        limit?: number;
        metricType?: MetricType;
      };

      console.log(`[History] Fetching history for ${entityId}`);
      const history = await historyService.getHistory(
        entityId,
        metricType || 'reputation',
        { startDate, endDate, limit }
      );

      // Get trend info
      const trend = await historyService.getTrend(entityId, metricType || 'reputation');
      const change = await historyService.getChange(entityId, metricType || 'reputation');

      res.json(apiResponse(true, {
        ...history,
        trend,
        change,
      }));
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// RATINGS ENDPOINTS
// ============================================

/**
 * GET /api/v1/ratings/:entityId
 * Get rating breakdown for an entity
 */
app.get(
  '/api/v1/ratings/:entityId',
  validateParams(entityIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const period = req.query.period as string || 'all';

      console.log(`[Ratings] Fetching rating breakdown for ${entityId}`);
      const reviews = await reviewService.getReviewsByEntity(entityId);

      if (reviews.length === 0) {
        res.json(apiResponse(true, {
          entityId,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          statistics: {
            mean: 0,
            median: 0,
            mode: 0,
            standardDeviation: 0,
            totalReviews: 0,
          },
          trends: [],
          period,
        }));
        return;
      }

      // Calculate distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const ratings: number[] = [];

      reviews.forEach(review => {
        const rating = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
        if (rating >= 1 && rating <= 5) {
          distribution[rating]++;
          ratings.push(rating);
        }
      });

      // Calculate percentages
      const total = ratings.length;
      const percentages: RatingPercentages = {
        1: Math.round((distribution[1] / total) * 10000) / 100,
        2: Math.round((distribution[2] / total) * 10000) / 100,
        3: Math.round((distribution[3] / total) * 10000) / 100,
        4: Math.round((distribution[4] / total) * 10000) / 100,
        5: Math.round((distribution[5] / total) * 10000) / 100,
      };

      // Calculate statistics
      const sum = ratings.reduce((a, b) => a + b, 0);
      const mean = sum / total;
      const sortedRatings = [...ratings].sort((a, b) => a - b);
      const median = total % 2 === 0
        ? (sortedRatings[total / 2 - 1] + sortedRatings[total / 2]) / 2
        : sortedRatings[Math.floor(total / 2)];

      // Mode
      const frequency: Record<number, number> = {};
      ratings.forEach(r => { frequency[r] = (frequency[r] || 0) + 1; });
      const mode = Object.entries(frequency).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

      // Standard deviation
      const squaredDiffs = ratings.map(r => Math.pow(r - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / total;
      const standardDeviation = Math.sqrt(variance);

      const statistics: RatingStatistics = {
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        mode: parseInt(String(mode)),
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        totalReviews: total,
      };

      // Calculate trends (monthly)
      const trends: RatingTrend[] = [];
      const sortedByDate = [...reviews].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Group by month
      const monthlyGroups: Record<string, number[]> = {};
      sortedByDate.forEach(review => {
        const month = review.createdAt.substring(0, 7); // YYYY-MM
        if (!monthlyGroups[month]) monthlyGroups[month] = [];
        monthlyGroups[month].push(review.rating);
      });

      for (const [month, monthRatings] of Object.entries(monthlyGroups)) {
        const avg = monthRatings.reduce((a, b) => a + b, 0) / monthRatings.length;
        trends.push({
          period: month,
          average: Math.round(avg * 100) / 100,
          count: monthRatings.length,
        });
      }

      const breakdown: RatingBreakdown = {
        entityId,
        distribution,
        percentages,
        statistics,
        trends,
      };

      res.json(apiResponse(true, breakdown));
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// TRUST ENGINE INTEGRATION
// ============================================

/**
 * GET /api/v1/trust/:entityId
 * Get trust score from Trust Engine
 */
app.get(
  '/api/v1/trust/:entityId',
  validateParams(entityIdSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const entityType = (req.query.entityType as string) || 'user';

      console.log(`[Trust] Fetching trust score for ${entityId}`);
      const trustScore = await trustEngineClient.getTrustScore(entityId, entityType as any);

      if (!trustScore) {
        res.status(404).json(apiResponse(false, undefined, 'Trust score not found'));
        return;
      }

      res.json(apiResponse(true, trustScore));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/trust/calculate
 * Calculate trust score locally
 */
app.post(
  '/api/v1/trust/calculate',
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityType, reviewCount, averageRating, verifiedReviews, sentimentScore } = req.body;

      console.log(`[Trust] Calculating trust score for ${entityId}`);
      const trustScore = await trustEngineClient.calculateTrustScore({
        entityId,
        entityType: entityType || 'user',
        reviewCount: reviewCount || 0,
        averageRating: averageRating || 0,
        verifiedReviews: verifiedReviews || 0,
        sentimentScore: sentimentScore || 0,
      });

      res.json(apiResponse(true, trustScore));
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// REVIEW MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /api/v1/reviews/:reviewId
 * Get a specific review
 */
app.get(
  '/api/v1/reviews/:reviewId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const review = await reviewService.getReview(reviewId);

      if (!review) {
        res.status(404).json(apiResponse(false, undefined, 'Review not found'));
        return;
      }

      res.json(apiResponse(true, review));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/reviews/:reviewId
 * Update a review
 */
app.put(
  '/api/v1/reviews/:reviewId',
  writeLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const updates = req.body;

      const review = await reviewService.updateReview(reviewId, updates);

      if (!review) {
        res.status(404).json(apiResponse(false, undefined, 'Review not found'));
        return;
      }

      res.json(apiResponse(true, review));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/reviews/:reviewId
 * Delete a review
 */
app.delete(
  '/api/v1/reviews/:reviewId',
  strictLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const deleted = await reviewService.deleteReview(reviewId);

      if (!deleted) {
        res.status(404).json(apiResponse(false, undefined, 'Review not found'));
        return;
      }

      res.json(apiResponse(true, { deleted: true }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/reviews/:reviewId/vote
 * Vote on a review's helpfulness
 */
app.post(
  '/api/v1/reviews/:reviewId/vote',
  writeLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const { helpful } = req.body;

      let review: Review | null = null;
      if (helpful === true) {
        review = await reviewService.voteHelpful(reviewId);
      } else {
        review = await reviewService.voteNotHelpful(reviewId);
      }

      if (!review) {
        res.status(404).json(apiResponse(false, undefined, 'Review not found'));
        return;
      }

      res.json(apiResponse(true, review));
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// INTENT/EVENT HANDLING (SUTAR OS Integration)
// ============================================

app.post('/api/v1/intent', async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, payload);

    // Handle different intent types
    let response: Record<string, unknown> = {};

    switch (type) {
      case 'get_reputation':
        if (payload?.entityId) {
          const reputation = await reputationService.getReputation(payload.entityId, payload.entityType);
          response = { reputation };
        }
        break;
      case 'add_review':
        if (payload?.entityId && payload?.userId && payload?.rating) {
          const review = await reviewService.addReview({
            entityId: payload.entityId,
            userId: payload.userId,
            rating: payload.rating,
            title: payload.title || '',
            content: payload.content || '',
          });
          response = { review };
        }
        break;
      case 'analyze_sentiment':
        if (payload?.entityId) {
          const sentiment = await sentimentService.getEntitySentiment(payload.entityId);
          response = { sentiment };
        }
        break;
    }

    res.json(apiResponse(true, { intentId: `intent_${Date.now()}`, type, response }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

app.post('/api/v1/event', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, data);

    // Handle different event types
    switch (type) {
      case 'review_created':
        if (data?.entityId) {
          // Recalculate reputation when new review is created
          await reputationService.calculateReputation(data.entityId);
        }
        break;
      case 'review_updated':
        if (data?.entityId) {
          await reputationService.calculateReputation(data.entityId);
        }
        break;
      case 'review_deleted':
        if (data?.entityId) {
          await reputationService.calculateReputation(data.entityId);
        }
        break;
    }

    res.json(apiResponse(true, { eventId: `event_${Date.now()}`, type, status: 'processed' }));
  } catch (error) {
    res.status(400).json(apiResponse(false, undefined, String(error)));
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use(errorLogger);
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   SUTAR REPUTATION AGGREGATOR                              ║
║   Version: 1.0.0                                          ║
║                                                            ║
║   Service running on port ${PORT}                            ║
║   Trust Engine: ${TRUST_ENGINE_URL}             ║
║                                                            ║
║   Endpoints:                                               ║
║   - GET  /health                                          ║
║   - GET  /api/v1/info                                      ║
║   - GET  /api/v1/reputation/:entityId                      ║
║   - GET  /api/v1/reputation/:entityId/reviews               ║
║   - POST /api/v1/reputation/:entityId/reviews               ║
║   - GET  /api/v1/reputation/:entityId/sentiment             ║
║   - GET  /api/v1/reputation/:entityId/history               ║
║   - GET  /api/v1/ratings/:entityId                         ║
║   - GET  /api/v1/trust/:entityId                           ║
║   - POST /api/v1/trust/calculate                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
