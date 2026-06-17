/**
 * Offers Routes
 * Endpoints for cross-service offer management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { offerGenerator } from '../services/offerGenerator';
import { EcosystemProfile } from '../models/EcosystemProfile';
import { CrossServiceLink } from '../models/CrossServiceLink';
import mongoose from 'mongoose';

const router = Router();

// Validation schemas
const createOfferSchema = z.object({
  tenantId: z.string().min(1),
  offerType: z.enum(['discount', 'voucher', 'upgrade', 'cashback', 'points', 'service']),
  category: z.enum(['hotel', 'restaurant', 'retail', 'healthcare', 'entertainment', 'cross-service']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  value: z.object({
    amount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    percentage: z.number().min(0).max(100).optional(),
    points: z.number().positive().optional(),
    serviceType: z.string().optional(),
    serviceDetails: z.record(z.unknown()).optional(),
  }),
  targeting: z.object({
    profileIds: z.array(z.string()).optional(),
    serviceIds: z.array(z.string()).optional(),
    segments: z.array(z.string()).optional(),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'contains']),
      value: z.unknown(),
    })).optional(),
  }).optional(),
  validFrom: z.string().datetime().or(z.date()),
  validUntil: z.string().datetime().or(z.date()),
  maxRedemptions: z.number().positive().optional(),
});

const generateOfferSchema = z.object({
  tenantId: z.string().min(1),
  profileId: z.string().min(1),
  context: z.object({
    trigger: z.enum(['purchase', 'refund', 'loyalty', 'birthday', 'inactivity', 'cross_sell']),
    relatedService: z.string().optional(),
    originalAmount: z.number().positive().optional(),
    originalService: z.string().optional(),
  }),
  preferences: z.object({
    maxValue: z.number().positive().optional(),
    categories: z.array(z.string()).optional(),
    excludeServices: z.array(z.string()).optional(),
  }).optional(),
});

const redeemOfferSchema = z.object({
  tenantId: z.string().min(1),
  profileId: z.string().min(1),
  offerId: z.string().min(1),
  service: z.string().min(1),
  entityId: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

// Helper function for API responses
const sendResponse = <T>(res: Response, status: number, data?: T, error?: { code: string; message: string }) => {
  const response = {
    success: error ? false : true,
    data: error ? undefined : data,
    error: error,
  };
  res.status(status).json(response);
};

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

// Offer schema for MongoDB
const OfferSchema = new mongoose.Schema({
  offerId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  offerType: { type: String, enum: ['discount', 'voucher', 'upgrade', 'cashback', 'points', 'service'], required: true },
  category: { type: String, enum: ['hotel', 'restaurant', 'retail', 'healthcare', 'entertainment', 'cross-service'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  value: {
    amount: Number,
    currency: String,
    percentage: Number,
    points: Number,
    serviceType: String,
    serviceDetails: mongoose.Schema.Types.Mixed,
  },
  targeting: {
    profileIds: [String],
    serviceIds: [String],
    segments: [String],
    conditions: [{
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed,
    }],
  },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  maxRedemptions: Number,
  redemptions: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'paused', 'expired', 'exhausted'], default: 'active' },
  analytics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },
}, { timestamps: true });

// Redemption schema
const RedemptionSchema = new mongoose.Schema({
  redemptionId: { type: String, required: true, unique: true },
  offerId: { type: String, required: true, index: true },
  profileId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true },
  service: { type: String, required: true },
  entityId: { type: String, required: true },
  value: {
    amount: Number,
    currency: String,
    points: Number,
  },
  status: { type: String, enum: ['pending', 'completed', 'cancelled', 'refunded'], default: 'completed' },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const Offer = mongoose.models.Offer || mongoose.model('Offer', OfferSchema);
const Redemption = mongoose.models.Redemption || mongoose.model('Redemption', RedemptionSchema);

/**
 * GET /api/offers
 * List offers with optional filtering
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = String(req.query.tenantId || req.headers['x-tenant-id'] || 'rtmn');
  const { category, status, type, limit = 20, offset = 0 } = req.query;

  const query: Record<string, unknown> = {
    tenantId,
    validUntil: { $gte: new Date() },
  };

  if (category) query.category = category;
  if (status) query.status = status;
  if (type) query.offerType = type;

  const [offers, total] = await Promise.all([
    Offer.find(query)
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Offer.countDocuments(query),
  ]);

  sendResponse(res, 200, offers);
  res.setHeader('X-Total-Count', String(total));
}));

/**
 * POST /api/offers
 * Create a new cross-service offer
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const validated = createOfferSchema.parse(req.body);

  const {
    tenantId,
    offerType,
    category,
    title,
    description,
    value,
    targeting,
    validFrom,
    validUntil,
    maxRedemptions,
  } = validated;

  const offer = await Offer.create({
    offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    offerType,
    category,
    title,
    description,
    value,
    targeting: targeting || {},
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
    maxRedemptions,
    redemptions: 0,
    status: 'active',
    analytics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    },
  });

  sendResponse(res, 201, offer);
}));

/**
 * GET /api/offers/:offerId
 * Get a specific offer
 */
router.get('/:offerId', asyncHandler(async (req: Request, res: Response) => {
  const { offerId } = req.params;
  const tenantId = String(req.query.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const offer = await Offer.findOne({ offerId, tenantId });

  if (!offer) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Offer not found' });
  }

  sendResponse(res, 200, offer);
}));

/**
 * POST /api/offers/generate
 * Generate contextual offers for a profile
 */
router.post('/generate', asyncHandler(async (req: Request, res: Response) => {
  const validated = generateOfferSchema.parse(req.body);

  const { tenantId, profileId, context, preferences } = validated;

  const profile = await EcosystemProfile.findOne({ profileId, tenantId });

  if (!profile) {
    return sendResponse(res, 404, undefined, { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });
  }

  // Generate contextual offers
  const offers = await offerGenerator.generateOffers(
    profile,
    context,
    preferences
  );

  // Track impressions
  for (const offer of offers) {
    await Offer.findOneAndUpdate(
      { offerId: offer.offerId },
      { $inc: { 'analytics.impressions': 1 } }
    );
  }

  sendResponse(res, 200, {
    offers,
    context,
    generatedAt: new Date().toISOString(),
  });
}));

/**
 * POST /api/offers/:offerId/click
 * Track offer click
 */
router.post('/:offerId/click', asyncHandler(async (req: Request, res: Response) => {
  const { offerId } = req.params;
  const { profileId } = req.body;

  const offer = await Offer.findOneAndUpdate(
    { offerId },
    { $inc: { 'analytics.clicks': 1 } },
    { new: true }
  );

  if (!offer) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Offer not found' });
  }

  sendResponse(res, 200, { tracked: true, clicks: offer.analytics.clicks });
}));

/**
 * POST /api/offers/:offerId/redeem
 * Redeem an offer
 */
router.post('/:offerId/redeem', asyncHandler(async (req: Request, res: Response) => {
  const validated = redeemOfferSchema.parse(req.body);

  const { tenantId, profileId, offerId, service, entityId, metadata } = validated;

  const [offer, profile] = await Promise.all([
    Offer.findOne({ offerId, tenantId }),
    EcosystemProfile.findOne({ profileId, tenantId }),
  ]);

  if (!offer) {
    return sendResponse(res, 404, undefined, { code: 'OFFER_NOT_FOUND', message: 'Offer not found' });
  }

  if (!profile) {
    return sendResponse(res, 404, undefined, { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });
  }

  // Validate offer
  if (offer.status !== 'active') {
    return sendResponse(res, 400, undefined, { code: 'OFFER_NOT_ACTIVE', message: 'Offer is not active' });
  }

  if (new Date() > offer.validUntil) {
    return sendResponse(res, 400, undefined, { code: 'OFFER_EXPIRED', message: 'Offer has expired' });
  }

  if (offer.maxRedemptions && offer.redemptions >= offer.maxRedemptions) {
    await Offer.findOneAndUpdate({ offerId }, { status: 'exhausted' });
    return sendResponse(res, 400, undefined, { code: 'OFFER_EXHAUSTED', message: 'Offer has been fully redeemed' });
  }

  // Create redemption
  const redemption = await Redemption.create({
    redemptionId: `RED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    offerId,
    profileId,
    tenantId,
    service,
    entityId,
    value: {
      amount: offer.value.amount,
      currency: offer.value.currency,
      points: offer.value.points,
    },
    status: 'completed',
    metadata,
  });

  // Update offer redemption count and analytics
  const update: Record<string, unknown> = {
    $inc: {
      redemptions: 1,
      'analytics.conversions': 1,
      'analytics.revenue': offer.value.amount || 0,
    },
  };

  if (offer.maxRedemptions && offer.redemptions + 1 >= offer.maxRedemptions) {
    (update.$set as Record<string, unknown>) = { status: 'exhausted' };
  }

  await Offer.findOneAndUpdate({ offerId }, update);

  sendResponse(res, 200, {
    redemption,
    offer: await Offer.findOne({ offerId }),
  });
}));

/**
 * GET /api/offers/:offerId/redemptions
 * Get all redemptions for an offer
 */
router.get('/:offerId/redemptions', asyncHandler(async (req: Request, res: Response) => {
  const { offerId } = req.params;
  const tenantId = String(req.query.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const redemptions = await Redemption.find({ offerId, tenantId })
    .sort({ createdAt: -1 });

  const offer = await Offer.findOne({ offerId, tenantId });

  sendResponse(res, 200, {
    redemptions,
    summary: {
      total: redemptions.length,
      totalValue: redemptions.reduce((sum, r) => sum + (r.value.amount || 0), 0),
      offerAnalytics: offer?.analytics,
    },
  });
}));

/**
 * POST /api/offers/:offerId/pause
 * Pause an offer
 */
router.post('/:offerId/pause', asyncHandler(async (req: Request, res: Response) => {
  const { offerId } = req.params;
  const tenantId = String(req.body.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const offer = await Offer.findOneAndUpdate(
    { offerId, tenantId },
    { status: 'paused' },
    { new: true }
  );

  if (!offer) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Offer not found' });
  }

  sendResponse(res, 200, offer);
}));

/**
 * POST /api/offers/:offerId/resume
 * Resume a paused offer
 */
router.post('/:offerId/resume', asyncHandler(async (req: Request, res: Response) => {
  const { offerId } = req.params;
  const tenantId = String(req.body.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const offer = await Offer.findOneAndUpdate(
    { offerId, tenantId, status: 'paused' },
    { status: 'active' },
    { new: true }
  );

  if (!offer) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Offer not found or not paused' });
  }

  sendResponse(res, 200, offer);
}));

/**
 * GET /api/offers/categories
 * Get available offer categories
 */
router.get('/meta/categories', (req: Request, res: Response) => {
  sendResponse(res, 200, {
    categories: [
      { id: 'hotel', name: 'Hotel Stay', icon: '🏨', services: ['stayown', 'hotel-os'] },
      { id: 'restaurant', name: 'Restaurant', icon: '🍽️', services: ['restaurant-os', 'rez-merchant'] },
      { id: 'retail', name: 'Retail', icon: '🛍️', services: ['retail-os', 'rez-pos'] },
      { id: 'healthcare', name: 'Healthcare', icon: '🏥', services: ['healthcare-os'] },
      { id: 'entertainment', name: 'Entertainment', icon: '🎬', services: ['adbazaar'] },
      { id: 'cross-service', name: 'Cross-Service', icon: '🔗', services: ['all'] },
    ],
    offerTypes: [
      { id: 'voucher', name: 'Voucher', description: 'Redeemable voucher' },
      { id: 'discount', name: 'Discount', description: 'Percentage or fixed discount' },
      { id: 'upgrade', name: 'Upgrade', description: 'Service upgrade' },
      { id: 'cashback', name: 'Cashback', description: 'Money back on purchase' },
      { id: 'points', name: 'Bonus Points', description: 'Loyalty points bonus' },
      { id: 'service', name: 'Free Service', description: 'Complimentary service' },
    ],
  });
});

/**
 * POST /api/offers/cross-service-contextual
 * Generate contextual cross-service offers (e.g., hotel voucher for refund)
 */
router.post('/cross-service-contextual', asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, profileId, triggerType, originalAmount, originalService, excludeServices } = req.body;

  if (!tenantId || !profileId || !triggerType) {
    return sendResponse(res, 400, undefined, {
      code: 'VALIDATION_ERROR',
      message: 'tenantId, profileId, and triggerType are required',
    });
  }

  const profile = await EcosystemProfile.findOne({ profileId, tenantId });

  if (!profile) {
    return sendResponse(res, 404, undefined, { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });
  }

  // Generate contextual cross-service offers
  const offers = await offerGenerator.generateContextualCrossServiceOffer(
    profile,
    triggerType,
    originalAmount,
    originalService,
    excludeServices
  );

  sendResponse(res, 200, {
    offers,
    triggerType,
    originalService,
    originalAmount,
  });
}));

export default router;
