import { Router, Response } from 'express';
import { reviewService, CreateReviewParams } from '../services/review.service.js';
import { internalAuth, AuthRequest } from '../middleware/auth.js';
import { CreateReviewSchema, BulkReviewSchema, ReviewFilterSchema } from '../middleware/validation.js';

const router = Router();

// Apply internal auth to all routes
router.use(internalAuth);

/**
 * Create a new review
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = CreateReviewSchema.parse(req.body);

    // Convert publishedAt to Date if provided
    const reviewData = {
      ...data,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined
    };

    const review = await reviewService.createReview(reviewData);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('[Review Routes] Error creating review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create review'
    });
  }
});

/**
 * Bulk import reviews
 */
router.post('/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const { reviews } = BulkReviewSchema.parse(req.body);

    // Convert publishedAt to Date for all reviews
    const convertedReviews = reviews.map(r => ({
      ...r,
      publishedAt: r.publishedAt ? new Date(r.publishedAt) : undefined
    }));

    const result = await reviewService.bulkImport(convertedReviews);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('[Review Routes] Error bulk importing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import reviews'
    });
  }
});

/**
 * Get reviews for a brand
 */
router.get('/brand/:brandId', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const filterQuery = ReviewFilterSchema.parse(req.query);

    const result = await reviewService.getReviews({
      brandId,
      ...filterQuery
    });

    res.json({
      success: true,
      data: result.reviews,
      pagination: {
        page: result.page,
        limit: filterQuery.limit || 20,
        total: result.total,
        pages: result.totalPages
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('[Review Routes] Error getting reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reviews'
    });
  }
});

/**
 * Get single review
 */
router.get('/:reviewId', async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const review = await reviewService.getReview(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('[Review Routes] Error getting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get review'
    });
  }
});

/**
 * Update review
 */
router.patch('/:reviewId', async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const review = await reviewService.updateReview(reviewId, req.body);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('[Review Routes] Error updating review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update review'
    });
  }
});

/**
 * Moderate review
 */
router.patch('/:reviewId/moderate', async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { status, moderatorId, flagReason } = req.body;

    if (!['pending', 'approved', 'rejected', 'flagged'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid moderation status'
      });
    }

    const review = await reviewService.moderateReview(
      reviewId,
      status,
      moderatorId || 'system',
      flagReason
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('[Review Routes] Error moderating review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to moderate review'
    });
  }
});

/**
 * Add response to review
 */
router.post('/:reviewId/responses', async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { content, author } = req.body;

    if (!content || !author) {
      return res.status(400).json({
        success: false,
        error: 'Content and author are required'
      });
    }

    const review = await reviewService.addResponse(reviewId, content, author);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('[Review Routes] Error adding response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add response'
    });
  }
});

/**
 * Get review statistics
 */
router.get('/stats/:brandId', async (req: AuthRequest, res: Response) => {
  try {
    const { brandId } = req.params;
    const { startDate, endDate } = req.query;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }

    const stats = await reviewService.getReviewStats(brandId, dateRange);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Review Routes] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

/**
 * Delete review
 */
router.delete('/:reviewId', async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;

    const review = await reviewService.updateReview(reviewId, {
      moderation: { status: 'rejected', flagged: false }
    } as any);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: 'Review deleted'
    });
  } catch (error) {
    console.error('[Review Routes] Error deleting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete review'
    });
  }
});

export default router;