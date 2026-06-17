import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Workflow } from '../models/Workflow';
import logger from '../logger';

const router = Router();

// Validation schema for review
const ReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(1, 'Comment is required').max(1000),
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * GET /api/marketplace/:workflowId/reviews
 * Get reviews for a workflow
 */
router.get('/:workflowId/reviews', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const workflow = await Workflow.findOne({ workflowId });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    const pageLimit = parseInt(limit as string, 10);
    const pageOffset = parseInt(offset as string, 10);

    const reviews = workflow.reviews.slice(pageOffset, pageOffset + pageLimit);
    const averageRating =
      workflow.reviews.length > 0
        ? (
            workflow.reviews.reduce((sum, r) => sum + r.rating, 0) /
            workflow.reviews.length
          ).toFixed(1)
        : 0;

    res.json({
      success: true,
      data: {
        reviews,
        total: workflow.reviews.length,
        averageRating: parseFloat(averageRating as string),
        limit: pageLimit,
        offset: pageOffset,
      },
    });
  } catch (error) {
    logger.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews',
    });
  }
});

/**
 * POST /api/marketplace/:workflowId/reviews
 * Add a review to a workflow
 */
router.post('/:workflowId/reviews', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;

    // Validate request body
    const validationResult = ReviewSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const { rating, comment, userId } = validationResult.data;

    const workflow = await Workflow.findOne({ workflowId });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    // Check if user already reviewed
    const existingReview = workflow.reviews.find((r) => r.userId === userId);
    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'User has already reviewed this workflow',
      });
    }

    // Add review
    workflow.reviews.push({
      rating,
      comment,
      userId,
      createdAt: new Date(),
    });

    await workflow.save();

    const newReview = workflow.reviews[workflow.reviews.length - 1];

    logger.info(`Review added for workflow ${workflowId} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: newReview,
    });
  } catch (error) {
    logger.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add review',
    });
  }
});

/**
 * DELETE /api/marketplace/:workflowId/reviews/:reviewId
 * Delete a review (only by admin or original user)
 */
router.delete(
  '/:workflowId/reviews/:reviewId',
  async (req: Request, res: Response) => {
    try {
      const { workflowId, reviewId } = req.params;

      const workflow = await Workflow.findOne({ workflowId });

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found',
        });
      }

      const reviewIndex = workflow.reviews.findIndex(
        (r) => r.userId === reviewId
      );

      if (reviewIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Review not found',
        });
      }

      workflow.reviews.splice(reviewIndex, 1);
      await workflow.save();

      logger.info(`Review deleted for workflow ${workflowId}`);

      res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting review:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete review',
      });
    }
  }
);

/**
 * GET /api/marketplace/:workflowId/rating
 * Get rating summary for a workflow
 */
router.get('/:workflowId/rating', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;

    const workflow = await Workflow.findOne({ workflowId });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    workflow.reviews.forEach((r) => {
      ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
    });

    const averageRating =
      workflow.reviews.length > 0
        ? (
            workflow.reviews.reduce((sum, r) => sum + r.rating, 0) /
            workflow.reviews.length
          ).toFixed(1)
        : 0;

    res.json({
      success: true,
      data: {
        workflowId,
        averageRating: parseFloat(averageRating as string),
        totalReviews: workflow.reviews.length,
        distribution: ratingDistribution,
      },
    });
  } catch (error) {
    logger.error('Error fetching rating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rating',
    });
  }
});

export default router;
