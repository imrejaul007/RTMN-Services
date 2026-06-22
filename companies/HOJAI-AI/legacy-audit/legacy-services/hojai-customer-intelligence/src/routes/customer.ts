/**
 * HOJAI Customer Intelligence - Customer Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { customer360Service } from '../services/customer360Service.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateProfileSchema = z.object({
  identity: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    name: z.string().optional(),
    avatar: z.string().url().optional()
  }).optional(),
  demographics: z.object({
    age: z.number().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    location: z.object({
      city: z.string().optional(),
      state: z.string().optional()
    }).optional()
  }).optional(),
  preferences: z.object({
    categories: z.array(z.string()).optional(),
    brands: z.array(z.string()).optional(),
    communicationChannel: z.enum(['email', 'sms', 'whatsapp', 'push']).optional(),
    notificationsEnabled: z.boolean().optional()
  }).optional()
});

const InteractionSchema = z.object({
  type: z.enum(['page_view', 'product_view', 'add_to_cart', 'purchase', 'cart_abandon', 'wishlist_add', 'review', 'support_ticket', 'email_open', 'email_click', 'sms_sent', 'push_sent', 'app_open', 'login', 'signup']),
  data: z.record(z.any()).optional(),
  context: z.object({
    page: z.string().optional(),
    productId: z.string().optional(),
    orderId: z.string().optional(),
    campaignId: z.string().optional(),
    category: z.string().optional(),
    device: z.string().optional()
  }).optional()
});

// ============================================================================
// PROFILE ROUTES
// ============================================================================

/**
 * GET /api/customers/:customerId/profile
 */
router.get('/:customerId/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { customerId } = req.params;
    const profile = await customer360Service.getProfile(tenantId, customerId);
    res.json(createResponse({ profile }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/customers/:customerId/profile
 */
router.put('/:customerId/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { customerId } = req.params;
    const validation = UpdateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues }));
    }
    const profile = await customer360Service.updateProfile(tenantId, customerId, validation.data);
    res.json(createResponse({ profile }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/:customerId/health
 */
router.get('/:customerId/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { customerId } = req.params;
    const health = await customer360Service.getHealthScore(tenantId, customerId);
    res.json(createResponse({ health }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INTERACTION ROUTES
// ============================================================================

/**
 * POST /api/customers/:customerId/interactions
 */
router.post('/:customerId/interactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { customerId } = req.params;
    const validation = InteractionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues }));
    }
    const interaction = await customer360Service.recordInteraction(tenantId, customerId, validation.data.type, validation.data.data, validation.data.context);
    res.json(createResponse({ interaction }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/customers/:customerId/timeline
 */
router.get('/:customerId/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { customerId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const timeline = await customer360Service.getTimeline(tenantId, customerId, limit);
    res.json(createResponse({ timeline }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INSIGHTS ROUTES
// ============================================================================

/**
 * GET /api/customers/:customerId/insights
 */
router.get('/:customerId/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { customerId } = req.params;
    const insights = await customer360Service.getInsights(tenantId, customerId);
    res.json(createResponse({ insights }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;
