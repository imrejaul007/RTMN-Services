import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requireAuth } from './middleware/auth.js';
import {
  createReview,
  getReviewById,
  getReviewsByProduct,
  getReviewsByCustomer,
  updateReview,
  moderateReview,
  deleteReview,
  addOwnerResponse,
  getReviewStats,
  createReviewRequest,
  saveReviewRequest,
  incrementHelpful
} from './services/reviewService.js';

const app = express();
const PORT = 5480;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'review-collection',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// ============ REVIEW ROUTES ============

/**
 * POST /api/reviews/request
 * Send review request (email/WhatsApp)
 */
app.post('/api/reviews/request', requireAuth, async (req, res) => {
  try {
    const {
      companyId,
      customerId,
      customerEmail,
      customerName,
      productId,
      orderId,
      channel,
      scheduledFor
    } = req.body;

    if (!companyId || !customerEmail || !productId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['companyId', 'customerEmail', 'productId']
      });
    }

    const request = await createReviewRequest({
      companyId,
      customerId,
      customerEmail,
      customerName,
      productId,
      orderId,
      channel,
      scheduledFor
    });

    await saveReviewRequest(request);

    res.status(201).json({
      success: true,
      data: request,
      message: `Review request ${channel === 'whatsapp' ? 'WhatsApp' : 'email'} scheduled`
    });
  } catch (error) {
    console.error('Error creating review request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create review request',
      message: error.message
    });
  }
});

/**
 * POST /api/reviews/submit
 * Submit a new review
 */
app.post('/api/reviews/submit', requireAuth, async (req, res) => {
  try {
    const {
      companyId,
      productId,
      orderId,
      customerId,
      customerName,
      customerEmail,
      rating,
      title,
      content,
      images,
      verified,
      source
    } = req.body;

    // Validation
    if (!companyId || !productId || !customerId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['companyId', 'productId', 'customerId', 'rating']
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const review = await createReview({
      companyId,
      productId,
      orderId,
      customerId,
      customerName,
      customerEmail,
      rating,
      title,
      content,
      images,
      verified,
      source
    });

    res.status(201).json({
      success: true,
      data: review,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit review',
      message: error.message
    });
  }
});

/**
 * GET /api/reviews/:reviewId
 * Get review by ID
 */
app.get('/api/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'X-Company-Id header required'
      });
    }

    const review = await getReviewById(companyId, reviewId);

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
    console.error('Error fetching review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review',
      message: error.message
    });
  }
});

/**
 * GET /api/reviews/product/:productId
 * Get reviews for a product
 */
app.get('/api/reviews/product/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const companyId = req.headers['x-company-id'];
    const status = req.query.status || 'approved';

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'X-Company-Id header required'
      });
    }

    const reviews = await getReviewsByProduct(companyId, productId, status);

    res.json({
      success: true,
      data: reviews,
      count: reviews.length
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product reviews',
      message: error.message
    });
  }
});

/**
 * GET /api/reviews/customer/:customerId
 * Get customer's reviews
 */
app.get('/api/reviews/customer/:customerId', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'X-Company-Id header required'
      });
    }

    const reviews = await getReviewsByCustomer(companyId, customerId);

    res.json({
      success: true,
      data: reviews,
      count: reviews.length
    });
  } catch (error) {
    console.error('Error fetching customer reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer reviews',
      message: error.message
    });
  }
});

/**
 * PUT /api/reviews/:reviewId
 * Update a review
 */
app.put('/api/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const companyId = req.headers['x-company-id'];
    const updates = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'X-Company-Id header required'
      });
    }

    if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const review = await updateReview(companyId, reviewId, updates);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review,
      message: 'Review updated successfully'
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update review',
      message: error.message
    });
  }
});

/**
 * PUT /api/reviews/:reviewId/moderate
 * Moderate review (approve/reject)
 */
app.put('/api/reviews/:reviewId/moderate', requireAuth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const companyId = req.headers['x-company-id'];
    const { decision, moderatorNotes } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'X-Company-Id header required'
      });
    }

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Decision must be "approved" or "rejected"'
      });
    }

    const review = await moderateReview(companyId, reviewId, decision, moderatorNotes);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review,
      message: `Review ${decision}`
    });
  } catch (error) {
    console.error('Error moderating review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to moderate review',
      message: error.message
    });
  }
});

/**
 * DELETE /api/reviews/:reviewId
 * Delete a review
 */
app.delete('/api/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'X-Company-Id header required'
      });
    }

    const deleted = await deleteReview(companyId, reviewId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete review',
      message: error.message
    });
  }
});

/**
 * GET /api/reviews/stats
 * Get review statistics
 */
app.get('/api/reviews/stats', requireAuth, async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const productId = req.query.productId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'X-Company-Id header required'
      });
    }

    const stats = await getReviewStats(companyId, productId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/reviews/:reviewId/respond
 * Owner response to review
 */
app.post('/api/reviews/:reviewId/respond', requireAuth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const companyId = req.headers['x-company-id'];
    const { response } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'X-Company-Id header required'
      });
    }

    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Response text is required'
      });
    }

    const review = await addOwnerResponse(companyId, reviewId, response);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: review,
      message: 'Owner response added successfully'
    });
  } catch (error) {
    console.error('Error adding owner response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add owner response',
      message: error.message
    });
  }
});

/**
 * POST /api/reviews/:reviewId/helpful
 * Mark review as helpful
 */
app.post('/api/reviews/:reviewId/helpful', requireAuth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'X-Company-Id header required'
      });
    }

    const review = await incrementHelpful(companyId, reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: { helpful: review.helpful },
      message: 'Marked as helpful'
    });
  } catch (error) {
    console.error('Error marking review helpful:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark review as helpful',
      message: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`Review Collection Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
