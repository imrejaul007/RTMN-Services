// ============================================================================
// SUTAR Marketplace - API Routes
// ============================================================================

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse, Review, ReviewRating } from './types';
import { storage, COLLECTIONS } from './storage';
import { serviceCatalog } from './serviceCatalog';
import { categoryService } from './categoryService';
import { pricingPlans } from './pricingService';
import { orderService } from './orderService';
import { paymentService } from './paymentService';
import { subscriptionService } from './subscriptionService';
import { favoritesService } from './favoritesService';
import { recommendationService } from './recommendationService';
import { analyticsService } from './analyticsService';
import { economyOS } from './economyOS';

// Helper function to create API responses
export const apiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  requestId?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId,
});

// ============================================================================
// Service Routes
// ============================================================================

export const serviceRoutes = {
  // Create service
  'POST /api/v1/services': async (req: Request, res: Response) => {
    try {
      const validation = serviceCatalog.validateService(req.body);
      if (!validation.valid) {
        res.status(400).json(apiResponse(false, undefined, validation.errors.join(', ')));
        return;
      }

      const service = serviceCatalog.createService(req.body);
      res.status(201).json(apiResponse(true, service, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // List services
  'GET /api/v1/services': async (req: Request, res: Response) => {
    try {
      const result = serviceCatalog.searchServices({
        query: req.query.query as string,
        category: req.query.category as string,
        subcategory: req.query.subcategory as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
        status: req.query.status as any,
        featured: req.query.featured === 'true' ? true : req.query.featured === 'false' ? false : undefined,
        trending: req.query.trending === 'true' ? true : req.query.trending === 'false' ? false : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });

      res.json(apiResponse(true, result, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get service by ID
  'GET /api/v1/services/:id': async (req: Request, res: Response) => {
    try {
      const service = serviceCatalog.getService(req.params.id);
      if (!service) {
        res.status(404).json(apiResponse(false, undefined, 'Service not found'));
        return;
      }

      // Increment view count
      serviceCatalog.incrementViewCount(service.id);

      const reviews = storage.find<Review>(COLLECTIONS.REVIEWS, r => r.serviceId === service.id);
      res.json(apiResponse(true, { service, reviews }, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Update service
  'PUT /api/v1/services/:id': async (req: Request, res: Response) => {
    try {
      const service = serviceCatalog.updateService(req.params.id, req.body);
      if (!service) {
        res.status(404).json(apiResponse(false, undefined, 'Service not found'));
        return;
      }
      res.json(apiResponse(true, service, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Delete service
  'DELETE /api/v1/services/:id': async (req: Request, res: Response) => {
    try {
      const deleted = serviceCatalog.deleteService(req.params.id);
      if (!deleted) {
        res.status(404).json(apiResponse(false, undefined, 'Service not found'));
        return;
      }
      res.json(apiResponse(true, { deleted: true }, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get featured services
  'GET /api/v1/services/featured/list': async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const services = serviceCatalog.getFeaturedServices(limit);
      res.json(apiResponse(true, services, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get trending services
  'GET /api/v1/services/trending/list': async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const services = serviceCatalog.getTrendingServices(limit);
      res.json(apiResponse(true, services, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get service statistics
  'GET /api/v1/services/:id/stats': async (req: Request, res: Response) => {
    try {
      const stats = serviceCatalog.getServiceStatistics(req.params.id);
      if (!stats) {
        res.status(404).json(apiResponse(false, undefined, 'Service not found'));
        return;
      }
      res.json(apiResponse(true, stats, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// ============================================================================
// Review Routes
// ============================================================================

export const reviewRoutes = {
  // Create review
  'POST /api/v1/services/:id/reviews': async (req: Request, res: Response) => {
    try {
      const service = serviceCatalog.getService(req.params.id);
      if (!service) {
        res.status(404).json(apiResponse(false, undefined, 'Service not found'));
        return;
      }

      const { userId, userName, rating, title, comment, pros, cons } = req.body;
      if (!userId || !rating) {
        res.status(400).json(apiResponse(false, undefined, 'userId and rating are required'));
        return;
      }

      const review: Review = {
        id: `review-${uuidv4()}`,
        serviceId: service.id,
        userId,
        userName: userName || 'Anonymous',
        rating: rating as ReviewRating,
        title: title || '',
        comment: comment || '',
        pros: pros || [],
        cons: cons || [],
        helpful: 0,
        notHelpful: 0,
        verified: false,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      storage.create(COLLECTIONS.REVIEWS, review);

      // Update service rating
      const allReviews = storage.find<Review>(COLLECTIONS.REVIEWS, r => r.serviceId === service.id);
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      serviceCatalog.updateService(req.params.id, {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: allReviews.length,
      });

      res.status(201).json(apiResponse(true, review, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get reviews for service
  'GET /api/v1/services/:id/reviews': async (req: Request, res: Response) => {
    try {
      const reviews = storage.find<Review>(
        COLLECTIONS.REVIEWS,
        r => r.serviceId === req.params.id
      );
      res.json(apiResponse(true, reviews, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Mark review helpful/not helpful
  'POST /api/v1/reviews/:id/helpful': async (req: Request, res: Response) => {
    try {
      const review = storage.get<Review>(COLLECTIONS.REVIEWS, req.params.id);
      if (!review) {
        res.status(404).json(apiResponse(false, undefined, 'Review not found'));
        return;
      }

      storage.update(COLLECTIONS.REVIEWS, req.params.id, {
        helpful: review.helpful + 1,
      });

      res.json(apiResponse(true, { helpful: review.helpful + 1 }, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// ============================================================================
// Category Routes
// ============================================================================

export const categoryRoutes = {
  // List categories
  'GET /api/v1/categories': async (req: Request, res: Response) => {
    try {
      const includeTree = req.query.tree === 'true';
      if (includeTree) {
        const tree = categoryService.getCategoryTree();
        res.json(apiResponse(true, tree, undefined, (req as any).requestId));
      } else {
        const categories = categoryService.getAllCategories({
          status: req.query.status as any,
          limit: Number(req.query.limit) || 100,
          offset: Number(req.query.offset) || 0,
        });
        res.json(apiResponse(true, categories, undefined, (req as any).requestId));
      }
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Create category
  'POST /api/v1/categories': async (req: Request, res: Response) => {
    try {
      const validation = categoryService.validateCategory(req.body);
      if (!validation.valid) {
        res.status(400).json(apiResponse(false, undefined, validation.errors.join(', ')));
        return;
      }

      const category = categoryService.createCategory(req.body);
      res.status(201).json(apiResponse(true, category, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get category by ID
  'GET /api/v1/categories/:id': async (req: Request, res: Response) => {
    try {
      const category = categoryService.getCategory(req.params.id);
      if (!category) {
        res.status(404).json(apiResponse(false, undefined, 'Category not found'));
        return;
      }
      res.json(apiResponse(true, category, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Update category
  'PUT /api/v1/categories/:id': async (req: Request, res: Response) => {
    try {
      const category = categoryService.updateCategory(req.params.id, req.body);
      if (!category) {
        res.status(404).json(apiResponse(false, undefined, 'Category not found'));
        return;
      }
      res.json(apiResponse(true, category, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Delete category
  'DELETE /api/v1/categories/:id': async (req: Request, res: Response) => {
    try {
      const deleted = categoryService.deleteCategory(req.params.id);
      if (!deleted) {
        res.status(404).json(apiResponse(false, undefined, 'Category not found'));
        return;
      }
      res.json(apiResponse(true, { deleted: true }, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get category path (breadcrumb)
  'GET /api/v1/categories/:id/path': async (req: Request, res: Response) => {
    try {
      const path = categoryService.getCategoryPath(req.params.id);
      res.json(apiResponse(true, path, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get services by category
  'GET /api/v1/categories/:id/services': async (req: Request, res: Response) => {
    try {
      const result = serviceCatalog.getServicesByCategory(
        req.params.id,
        Number(req.query.limit) || 50,
        Number(req.query.offset) || 0
      );
      res.json(apiResponse(true, result, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// ============================================================================
// Pricing Plan Routes
// ============================================================================

export const planRoutes = {
  // Get plans for service
  'GET /api/v1/plans/:serviceId': async (req: Request, res: Response) => {
    try {
      const plans = pricingPlans.getPlansForService(req.params.serviceId);
      res.json(apiResponse(true, plans, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Create pricing plan
  'POST /api/v1/plans': async (req: Request, res: Response) => {
    try {
      const validation = pricingPlans.validatePlan(req.body);
      if (!validation.valid) {
        res.status(400).json(apiResponse(false, undefined, validation.errors.join(', ')));
        return;
      }

      const plan = pricingPlans.createPlan(req.body);
      res.status(201).json(apiResponse(true, plan, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get plan by ID
  'GET /api/v1/plans/plan/:id': async (req: Request, res: Response) => {
    try {
      const plan = pricingPlans.getPlan(req.params.id);
      if (!plan) {
        res.status(404).json(apiResponse(false, undefined, 'Plan not found'));
        return;
      }
      res.json(apiResponse(true, plan, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Update plan
  'PUT /api/v1/plans/:id': async (req: Request, res: Response) => {
    try {
      const plan = pricingPlans.updatePlan(req.params.id, req.body);
      if (!plan) {
        res.status(404).json(apiResponse(false, undefined, 'Plan not found'));
        return;
      }
      res.json(apiResponse(true, plan, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Delete plan
  'DELETE /api/v1/plans/:id': async (req: Request, res: Response) => {
    try {
      const deleted = pricingPlans.deletePlan(req.params.id);
      if (!deleted) {
        res.status(404).json(apiResponse(false, undefined, 'Plan not found'));
        return;
      }
      res.json(apiResponse(true, { deleted: true }, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Initialize default plans
  'POST /api/v1/plans/:serviceId/defaults': async (req: Request, res: Response) => {
    try {
      const basePrice = Number(req.body.basePrice) || 0;
      const plans = pricingPlans.initializeDefaultPlans(req.params.serviceId, basePrice);
      res.status(201).json(apiResponse(true, plans, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// ============================================================================
// Order Routes
// ============================================================================

export const orderRoutes = {
  // Create order
  'POST /api/v1/orders': async (req: Request, res: Response) => {
    try {
      const validation = orderService.validateOrder(req.body);
      if (!validation.valid) {
        res.status(400).json(apiResponse(false, undefined, validation.errors.join(', ')));
        return;
      }

      const order = await orderService.createOrder(req.body);
      res.status(201).json(apiResponse(true, order, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get order by ID
  'GET /api/v1/orders/:id': async (req: Request, res: Response) => {
    try {
      const order = orderService.getOrder(req.params.id);
      if (!order) {
        res.status(404).json(apiResponse(false, undefined, 'Order not found'));
        return;
      }
      res.json(apiResponse(true, order, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get orders by user
  'GET /api/v1/orders/user/:userId': async (req: Request, res: Response) => {
    try {
      const result = orderService.getOrdersByUser(req.params.userId, {
        status: req.query.status as any,
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });
      res.json(apiResponse(true, result, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Update order
  'PUT /api/v1/orders/:id': async (req: Request, res: Response) => {
    try {
      const order = orderService.updateOrder(req.params.id, req.body);
      if (!order) {
        res.status(404).json(apiResponse(false, undefined, 'Order not found'));
        return;
      }
      res.json(apiResponse(true, order, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Cancel order
  'POST /api/v1/orders/:id/cancel': async (req: Request, res: Response) => {
    try {
      const order = await orderService.cancelOrder(req.params.id, req.body.reason);
      if (!order) {
        res.status(404).json(apiResponse(false, undefined, 'Order not found'));
        return;
      }
      res.json(apiResponse(true, order, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get all orders (admin)
  'GET /api/v1/orders': async (req: Request, res: Response) => {
    try {
      const result = orderService.getAllOrders({
        status: req.query.status as any,
        paymentStatus: req.query.paymentStatus as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: Number(req.query.limit) || 100,
        offset: Number(req.query.offset) || 0,
      });
      res.json(apiResponse(true, result, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// ============================================================================
// Payment Routes
// ============================================================================

export const paymentRoutes = {
  // Process payment
  'POST /api/v1/orders/:id/pay': async (req: Request, res: Response) => {
    try {
      const { userId, method, provider, metadata } = req.body;
      if (!userId || !method) {
        res.status(400).json(apiResponse(false, undefined, 'userId and method are required'));
        return;
      }

      const result = await paymentService.processPayment({
        orderId: req.params.id,
        userId,
        method,
        provider,
        metadata,
      });

      if (result.success) {
        res.json(apiResponse(true, result.payment, undefined, (req as any).requestId));
      } else {
        res.status(400).json(apiResponse(false, undefined, result.error));
      }
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get payment by ID
  'GET /api/v1/payments/:id': async (req: Request, res: Response) => {
    try {
      const payment = paymentService.getPayment(req.params.id);
      if (!payment) {
        res.status(404).json(apiResponse(false, undefined, 'Payment not found'));
        return;
      }
      res.json(apiResponse(true, payment, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get payments for order
  'GET /api/v1/orders/:id/payments': async (req: Request, res: Response) => {
    try {
      const payments = paymentService.getPaymentsForOrder(req.params.id);
      res.json(apiResponse(true, payments, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get payments by user
  'GET /api/v1/payments/user/:userId': async (req: Request, res: Response) => {
    try {
      const result = paymentService.getPaymentsByUser(req.params.userId, {
        status: req.query.status as any,
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });
      res.json(apiResponse(true, result, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Process refund
  'POST /api/v1/payments/:id/refund': async (req: Request, res: Response) => {
    try {
      const { amount, reason } = req.body;
      if (!reason) {
        res.status(400).json(apiResponse(false, undefined, 'reason is required'));
        return;
      }

      const result = await paymentService.processRefund({
        paymentId: req.params.id,
        amount,
        reason,
      });

      if (result.success) {
        res.json(apiResponse(true, result.payment, undefined, (req as any).requestId));
      } else {
        res.status(400).json(apiResponse(false, undefined, result.error));
      }
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get available payment methods
  'GET /api/v1/payment-methods': async (req: Request, res: Response) => {
    try {
      const methods = paymentService.getAvailablePaymentMethods();
      res.json(apiResponse(true, methods, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// ============================================================================
// Subscription Routes
// ============================================================================

export const subscriptionRoutes = {
  // Create subscription
  'POST /api/v1/subscriptions': async (req: Request, res: Response) => {
    try {
      const validation = subscriptionService.validateSubscription(req.body);
      if (!validation.valid) {
        res.status(400).json(apiResponse(false, undefined, validation.errors.join(', ')));
        return;
      }

      const result = await subscriptionService.createSubscription(req.body);
      if (result.success) {
        res.status(201).json(apiResponse(true, result.subscription, undefined, (req as any).requestId));
      } else {
        res.status(400).json(apiResponse(false, undefined, result.error));
      }
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get subscription by ID
  'GET /api/v1/subscriptions/:id': async (req: Request, res: Response) => {
    try {
      const subscription = subscriptionService.getSubscription(req.params.id);
      if (!subscription) {
        res.status(404).json(apiResponse(false, undefined, 'Subscription not found'));
        return;
      }
      res.json(apiResponse(true, subscription, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get subscriptions by user
  'GET /api/v1/subscriptions/user/:userId': async (req: Request, res: Response) => {
    try {
      const result = subscriptionService.getSubscriptionsByUser(req.params.userId, {
        status: req.query.status as any,
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });
      res.json(apiResponse(true, result, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Cancel subscription
  'POST /api/v1/subscriptions/:id/cancel': async (req: Request, res: Response) => {
    try {
      const immediate = req.body.immediate || false;
      const result = await subscriptionService.cancelSubscription(req.params.id, immediate);
      if (result.success) {
        res.json(apiResponse(true, result.subscription, undefined, (req as any).requestId));
      } else {
        res.status(400).json(apiResponse(false, undefined, result.error));
      }
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Pause subscription
  'POST /api/v1/subscriptions/:id/pause': async (req: Request, res: Response) => {
    try {
      const subscription = subscriptionService.pauseSubscription(req.params.id, req.body.pauseUntil);
      if (!subscription) {
        res.status(404).json(apiResponse(false, undefined, 'Subscription not found'));
        return;
      }
      res.json(apiResponse(true, subscription, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Resume subscription
  'POST /api/v1/subscriptions/:id/resume': async (req: Request, res: Response) => {
    try {
      const result = await subscriptionService.resumeSubscription(req.params.id);
      if (result.success) {
        res.json(apiResponse(true, result.subscription, undefined, (req as any).requestId));
      } else {
        res.status(400).json(apiResponse(false, undefined, result.error));
      }
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Change plan
  'POST /api/v1/subscriptions/:id/change-plan': async (req: Request, res: Response) => {
    try {
      const { newPlanId } = req.body;
      if (!newPlanId) {
        res.status(400).json(apiResponse(false, undefined, 'newPlanId is required'));
        return;
      }

      const result = await subscriptionService.changePlan(req.params.id, newPlanId);
      if (result.success) {
        res.json(apiResponse(true, result.subscription, undefined, (req as any).requestId));
      } else {
        res.status(400).json(apiResponse(false, undefined, result.error));
      }
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get subscription statistics
  'GET /api/v1/subscriptions/stats': async (req: Request, res: Response) => {
    try {
      const stats = subscriptionService.getSubscriptionStatistics({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      res.json(apiResponse(true, stats, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// ============================================================================
// Favorites Routes
// ============================================================================

export const favoritesRoutes = {
  // Get favorites for user
  'GET /api/v1/favorites/:userId': async (req: Request, res: Response) => {
    try {
      const result = favoritesService.getFavorites(req.params.userId, {
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });
      res.json(apiResponse(true, result, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Add to favorites
  'POST /api/v1/favorites': async (req: Request, res: Response) => {
    try {
      const { userId, serviceId, notes } = req.body;
      if (!userId || !serviceId) {
        res.status(400).json(apiResponse(false, undefined, 'userId and serviceId are required'));
        return;
      }

      const result = favoritesService.addFavorite(userId, serviceId, notes);
      if (result.success) {
        res.status(201).json(apiResponse(true, result.favorite, undefined, (req as any).requestId));
      } else {
        res.status(400).json(apiResponse(false, undefined, result.error));
      }
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Remove from favorites
  'DELETE /api/v1/favorites/:userId/:serviceId': async (req: Request, res: Response) => {
    try {
      const deleted = favoritesService.removeFavorite(req.params.userId, req.params.serviceId);
      if (deleted) {
        res.json(apiResponse(true, { deleted: true }, undefined, (req as any).requestId));
      } else {
        res.status(404).json(apiResponse(false, undefined, 'Favorite not found'));
      }
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Check if favorited
  'GET /api/v1/favorites/:userId/:serviceId/check': async (req: Request, res: Response) => {
    try {
      const isFavorited = favoritesService.isFavorited(req.params.userId, req.params.serviceId);
      res.json(apiResponse(true, { isFavorited }, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get favorite services with details
  'GET /api/v1/favorites/:userId/services': async (req: Request, res: Response) => {
    try {
      const result = favoritesService.getFavoriteServices(req.params.userId, {
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });
      res.json(apiResponse(true, result, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// ============================================================================
// Recommendation Routes
// ============================================================================

export const recommendationRoutes = {
  // Get personalized recommendations
  'GET /api/v1/recommendations/:userId': async (req: Request, res: Response) => {
    try {
      const result = recommendationService.getRecommendations(req.params.userId, {
        limit: Number(req.query.limit) || 20,
        offset: Number(req.query.offset) || 0,
        categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      });
      res.json(apiResponse(true, result, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get trending recommendations
  'GET /api/v1/recommendations/trending': async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const recommendations = recommendationService.getTrendingRecommendations(limit);
      res.json(apiResponse(true, recommendations, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get category recommendations
  'GET /api/v1/recommendations/category/:categoryId': async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const recommendations = recommendationService.getCategoryRecommendations(req.params.categoryId, limit);
      res.json(apiResponse(true, recommendations, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get frequently bought together
  'GET /api/v1/recommendations/frequently-bought/:serviceId': async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 5;
      const recommendations = recommendationService.getFrequentlyBoughtTogether(req.params.serviceId, limit);
      res.json(apiResponse(true, recommendations, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get homepage feed
  'GET /api/v1/recommendations/homepage': async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const limit = Number(req.query.limit) || 20;
      const feed = recommendationService.getHomepageFeed(userId, limit);
      res.json(apiResponse(true, feed, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Track recommendation view
  'POST /api/v1/recommendations/:id/view': async (req: Request, res: Response) => {
    try {
      recommendationService.trackView(req.params.id);
      res.json(apiResponse(true, { tracked: true }, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Track recommendation click
  'POST /api/v1/recommendations/:id/click': async (req: Request, res: Response) => {
    try {
      recommendationService.trackClick(req.params.id);
      res.json(apiResponse(true, { tracked: true }, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// ============================================================================
// Analytics Routes
// ============================================================================

export const analyticsRoutes = {
  // Get marketplace analytics
  'GET /api/v1/analytics': async (req: Request, res: Response) => {
    try {
      const analytics = analyticsService.getMarketplaceAnalytics({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        period: req.query.period as any,
      });
      res.json(apiResponse(true, analytics, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get revenue analytics
  'GET /api/v1/analytics/revenue': async (req: Request, res: Response) => {
    try {
      const analytics = analyticsService.getRevenueAnalytics({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        period: req.query.period as any,
      });
      res.json(apiResponse(true, analytics, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get order analytics
  'GET /api/v1/analytics/orders': async (req: Request, res: Response) => {
    try {
      const analytics = analyticsService.getOrderAnalytics({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        period: req.query.period as any,
      });
      res.json(apiResponse(true, analytics, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get user analytics
  'GET /api/v1/analytics/users': async (req: Request, res: Response) => {
    try {
      const analytics = analyticsService.getUserAnalytics({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        period: req.query.period as any,
      });
      res.json(apiResponse(true, analytics, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Export analytics to CSV
  'GET /api/v1/analytics/export': async (req: Request, res: Response) => {
    try {
      const analytics = analyticsService.getMarketplaceAnalytics({
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      const csv = analyticsService.exportToCSV(analytics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// ============================================================================
// Economy OS Integration Routes
// ============================================================================

export const economyRoutes = {
  // Get user balance
  'GET /api/v1/economy/balance/:userId': async (req: Request, res: Response) => {
    try {
      const balance = await economyOS.getBalance(req.params.userId);
      res.json(apiResponse(true, balance, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Get user transactions
  'GET /api/v1/economy/transactions/:userId': async (req: Request, res: Response) => {
    try {
      const result = await economyOS.getTransactions(req.params.userId, {
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
        type: req.query.type as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      res.json(apiResponse(true, result, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },

  // Check Economy OS health
  'GET /api/v1/economy/health': async (req: Request, res: Response) => {
    try {
      const health = await economyOS.healthCheck();
      res.json(apiResponse(true, health, undefined, (req as any).requestId));
    } catch (error) {
      res.status(500).json(apiResponse(false, undefined, String(error)));
    }
  },
};

// Export all routes
export const allRoutes = {
  ...serviceRoutes,
  ...reviewRoutes,
  ...categoryRoutes,
  ...planRoutes,
  ...orderRoutes,
  ...paymentRoutes,
  ...subscriptionRoutes,
  ...favoritesRoutes,
  ...recommendationRoutes,
  ...analyticsRoutes,
  ...economyRoutes,
};
