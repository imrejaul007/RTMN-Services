/**
 * Profile Routes
 * Endpoints for cross-ecosystem profile management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EcosystemProfile } from '../models/EcosystemProfile';
import { profileBuilder } from '../services/profileBuilder';
import { IdentityResolutionRequest, ApiResponse, EcosystemProfile as ProfileType } from '../types';

const router = Router();

// Validation schemas
const createProfileSchema = z.object({
  tenantId: z.string().min(1),
  identifiers: z.object({
    corpidUserId: z.string().optional(),
    hojaiGenieId: z.string().optional(),
    rezConsumerId: z.string().optional(),
    rezMerchantId: z.string().optional(),
    stayownGuestId: z.string().optional(),
    adbazaarProfileId: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one identifier is required',
  }),
  profile: z.object({
    name: z.object({
      first: z.string().optional(),
      last: z.string().optional(),
      full: z.string().optional(),
    }).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    preferences: z.record(z.unknown()).optional(),
  }).optional(),
});

const updateProfileSchema = z.object({
  identifiers: z.object({
    corpidUserId: z.string().optional(),
    hojaiGenieId: z.string().optional(),
    rezConsumerId: z.string().optional(),
    rezMerchantId: z.string().optional(),
    stayownGuestId: z.string().optional(),
    adbazaarProfileId: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
  profile: z.object({
    name: z.object({
      first: z.string().optional(),
      last: z.string().optional(),
      full: z.string().optional(),
    }).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    preferences: z.record(z.unknown()).optional(),
  }).optional(),
});

const identityResolutionSchema = z.object({
  tenantId: z.string().min(1),
  identifiers: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    corpidUserId: z.string().optional(),
    hojaiGenieId: z.string().optional(),
    rezConsumerId: z.string().optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one identifier is required',
  }),
  options: z.object({
    mergeExisting: z.boolean().optional(),
    confidenceThreshold: z.number().min(0).max(100).optional(),
  }).optional(),
});

const searchSchema = z.object({
  tenantId: z.string().min(1),
  query: z.string().optional(),
  services: z.array(z.string()).optional(),
  segments: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

// Helper function for API responses
const sendResponse = <T>(res: Response, status: number, data?: T, error?: { code: string; message: string }) => {
  const response: ApiResponse<T> = {
    success: error ? false : true,
    data: error ? undefined : data,
    error: error,
  };
  res.status(status).json(response);
};

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * GET /api/profiles
 * List profiles with optional filtering
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const validated = searchSchema.parse({
    tenantId: req.query.tenantId || req.headers['x-tenant-id'] || 'rtmn',
    query: req.query.query,
    services: req.query.services ? String(req.query.services).split(',') : undefined,
    segments: req.query.segments ? String(req.query.segments).split(',') : undefined,
    limit: req.query.limit ? parseInt(String(req.query.limit)) : undefined,
    offset: req.query.offset ? parseInt(String(req.query.offset)) : undefined,
  });

  const { tenantId, query, services, segments, limit = 20, offset = 0 } = validated;

  const searchQuery: Record<string, unknown> = { tenantId };

  if (query) {
    searchQuery.$or = [
      { 'profile.name.full': { $regex: query, $options: 'i' } },
      { 'identifiers.email': { $regex: query, $options: 'i' } },
      { 'identifiers.phone': { $regex: query, $options: 'i' } },
    ];
  }

  if (services && services.length > 0) {
    const serviceFilter: Record<string, unknown>[] = [];
    services.forEach(service => {
      const filterKey = `serviceSummaries.${service}`;
      serviceFilter.push({ [filterKey]: { $exists: true, $ne: null } });
    });
    searchQuery.$and = serviceFilter;
  }

  const [profiles, total] = await Promise.all([
    EcosystemProfile.find(searchQuery)
      .skip(offset)
      .limit(limit)
      .sort({ 'engagement.lastActivity': -1 }),
    EcosystemProfile.countDocuments(searchQuery),
  ]);

  sendResponse(res, 200, profiles, undefined);
  res.setHeader('X-Total-Count', String(total));
}));

/**
 * POST /api/profiles
 * Create a new ecosystem profile
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const validated = createProfileSchema.parse(req.body);

  const { tenantId, identifiers, profile } = validated;

  // Check for existing profile
  const existing = await EcosystemProfile.findOne({
    tenantId,
    $or: [
      { 'identifiers.email': identifiers.email },
      { 'identifiers.phone': identifiers.phone },
    ],
  });

  if (existing) {
    return sendResponse(res, 409, existing, { code: 'PROFILE_EXISTS', message: 'Profile already exists with these identifiers' });
  }

  const newProfile = await EcosystemProfile.create({
    profileId: `EP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    identifiers,
    profile: profile || { name: {} },
    engagement: {
      totalInteractions: 0,
      lastActivity: new Date(),
      activityFrequency: 'rare',
      preferredServices: [],
      engagementScore: 0,
    },
    identityResolution: {
      confidence: Object.keys(identifiers).length * 20,
      sources: Object.keys(identifiers).filter(k => identifiers[k as keyof typeof identifiers]),
    },
  });

  sendResponse(res, 201, newProfile);
}));

/**
 * GET /api/profiles/:profileId
 * Get a specific profile by ID
 */
router.get('/:profileId', asyncHandler(async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const tenantId = String(req.query.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const profile = await EcosystemProfile.findOne({ profileId, tenantId });

  if (!profile) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Profile not found' });
  }

  sendResponse(res, 200, profile);
}));

/**
 * PUT /api/profiles/:profileId
 * Update a profile
 */
router.put('/:profileId', asyncHandler(async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const tenantId = String(req.body.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const validated = updateProfileSchema.parse(req.body);

  const profile = await EcosystemProfile.findOne({ profileId, tenantId });

  if (!profile) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Profile not found' });
  }

  // Update identifiers if provided
  if (validated.identifiers) {
    Object.keys(validated.identifiers).forEach(key => {
      const value = validated.identifiers?.[key as keyof typeof validated.identifiers];
      if (value && !profile.identifiers[key as keyof typeof profile.identifiers]) {
        (profile.identifiers as Record<string, string>)[key] = value;
        // Increase confidence for new identifier
        profile.identityResolution.confidence = Math.min(100, profile.identityResolution.confidence + 5);
        if (!profile.identityResolution.sources.includes(key)) {
          profile.identityResolution.sources.push(key);
        }
      }
    });
  }

  // Update profile data if provided
  if (validated.profile) {
    Object.assign(profile.profile, validated.profile);
  }

  profile.version += 1;
  await profile.save();

  sendResponse(res, 200, profile);
}));

/**
 * DELETE /api/profiles/:profileId
 * Delete a profile (soft delete)
 */
router.delete('/:profileId', asyncHandler(async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const tenantId = String(req.query.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const profile = await EcosystemProfile.findOneAndDelete({ profileId, tenantId });

  if (!profile) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Profile not found' });
  }

  sendResponse(res, 200, { deleted: true, profileId });
}));

/**
 * POST /api/profiles/resolve
 * Resolve identity across services
 */
router.post('/resolve', asyncHandler(async (req: Request, res: Response) => {
  const validated = identityResolutionSchema.parse(req.body);

  const { tenantId, identifiers, options } = validated;

  const result = await profileBuilder.resolveIdentity(
    tenantId,
    identifiers,
    options?.mergeExisting,
    options?.confidenceThreshold
  );

  sendResponse(res, 200, result);
}));

/**
 * POST /api/profiles/:profileId/refresh
 * Refresh profile data from all connected services
 */
router.post('/:profileId/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const tenantId = String(req.body.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const profile = await EcosystemProfile.findOne({ profileId, tenantId });

  if (!profile) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Profile not found' });
  }

  // Build unified profile from all connected services
  const refreshedProfile = await profileBuilder.buildUnifiedProfile(profile);

  sendResponse(res, 200, refreshedProfile);
}));

/**
 * GET /api/profiles/:profileId/links
 * Get all service links for a profile
 */
router.get('/:profileId/links', asyncHandler(async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const tenantId = String(req.query.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const profile = await EcosystemProfile.findOne({ profileId, tenantId });

  if (!profile) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Profile not found' });
  }

  // Find all links involving any of this profile's identifiers
  const { CrossServiceLink } = await import('../models/CrossServiceLink');

  const identifierQueries: Record<string, unknown>[] = [];
  Object.entries(profile.identifiers.toObject()).forEach(([key, value]) => {
    if (value) {
      identifierQueries.push({ [`entities.metadata.${key}`]: value });
    }
  });

  const links = await CrossServiceLink.find({
    tenantId,
    $or: identifierQueries.length > 0 ? identifierQueries : [{ linkId: 'none' }],
  });

  sendResponse(res, 200, links);
}));

/**
 * GET /api/profiles/:profileId/engagement
 * Get engagement analytics for a profile
 */
router.get('/:profileId/engagement', asyncHandler(async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const tenantId = String(req.query.tenantId || req.headers['x-tenant-id'] || 'rtmn');

  const profile = await EcosystemProfile.findOne({ profileId, tenantId });

  if (!profile) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Profile not found' });
  }

  const engagement = {
    score: profile.engagement.engagementScore,
    totalInteractions: profile.engagement.totalInteractions,
    lastActivity: profile.engagement.lastActivity,
    activityFrequency: profile.engagement.activityFrequency,
    preferredServices: profile.engagement.preferredServices,
    segment: profile.engagement.engagementScore >= 80 ? 'champion' :
             profile.engagement.engagementScore >= 60 ? 'loyal' :
             profile.engagement.engagementScore >= 40 ? 'at-risk' : 'dormant',
    serviceBreakdown: profile.serviceSummaries,
  };

  sendResponse(res, 200, engagement);
}));

/**
 * POST /api/profiles/:profileId/interactions
 * Record a new interaction
 */
router.post('/:profileId/interactions', asyncHandler(async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const tenantId = String(req.body.tenantId || req.headers['x-tenant-id'] || 'rtmn');
  const { service, type, metadata } = req.body;

  if (!service) {
    return sendResponse(res, 400, undefined, { code: 'VALIDATION_ERROR', message: 'Service is required' });
  }

  const profile = await EcosystemProfile.findOne({ profileId, tenantId });

  if (!profile) {
    return sendResponse(res, 404, undefined, { code: 'NOT_FOUND', message: 'Profile not found' });
  }

  // Record the interaction
  await profile.recordInteraction(service);

  sendResponse(res, 200, {
    interactionRecorded: true,
    newEngagementScore: profile.engagement.engagementScore,
  });
}));

export default router;
