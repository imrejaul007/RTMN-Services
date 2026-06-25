/**
 * HTTP routes for marketplace-listings service.
 *
 * All routes are tenant-scoped (req.user.tenantId or X-Tenant-Id header) and
 * respect per-tenant data isolation. Public discovery routes (GET) accept
 * either authenticated users OR x-internal-token, so the Nexha Hub / cross-
 * tenant discovery API can read public listings.
 *
 * Endpoints:
 *   GET    /health                                     - service health
 *   GET    /                                           - redirects to /health
 *   GET    /ready                                      - readiness probe
 *   POST   /api/validate                               - lint a listing payload (no persist)
 *   POST   /api/listings                               - create a new listing (auth)
 *   GET    /api/listings                               - search + filter + sort
 *   GET    /api/listings/:listingId                    - get one (visibility-checked)
 *   PATCH  /api/listings/:listingId                    - update (owner only)
 *   POST   /api/listings/:listingId/publish            - publish (owner only)
 *   POST   /api/listings/:listingId/unpublish          - unpublish (owner only)
 *   POST   /api/listings/:listingId/view               - record a view (no auth required)
 *   POST   /api/listings/:listingId/install            - record an install
 *   GET    /api/listings/:listingId/reviews            - list reviews
 *   PUT    /api/listings/:listingId/reviews            - add or update my review (auth)
 *   DELETE /api/reviews/:reviewId                      - hide a review
 *   GET    /api/my-reviews?listingId=                  - get my review for a listing
 *   GET    /api/stats                                  - per-tenant stats
 */

import express from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth, tenantFrom } from '../middleware/auth.js';
import * as listings from '../services/listingsService.js';
import * as reviews from '../services/reviewsService.js';

const router = express.Router();

// -----------------------------------------------------------------------------
// Zod schemas
// -----------------------------------------------------------------------------

const VISIBILITY = ['PUBLIC', 'PRIVATE', 'UNLISTED'];
const STATUS = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'SUSPENDED', 'ARCHIVED'];
const PRICING_MODEL = ['free', 'one-time', 'subscription', 'usage-based', 'quote-only'];

// BAM Category taxonomy (35+ categories from spec)
const CATEGORY = [
  // Core AI Categories
  'agent',              // AI Agents (individual specialists)
  'ai-employee',        // AI Employees (virtual workers - killer feature)
  'ai-team',            // AI Teams (multi-agent teams)
  'skill',              // Skills (reusable capabilities)
  'memory-pack',        // Memory Packs (domain knowledge)
  'twin',               // Twin Packs (digital twins)

  // Business Structure
  'department-os',      // Department OS (complete departments)
  'industry-os',         // Industry OS (vertical solutions)
  'business-capability-pack', // Business Capability Packs (killer feature)
  'company-blueprint',   // Company Blueprints (pre-built companies)

  // Workflows & Automation
  'workflow',            // Workflows (multi-step processes)
  'automation',         // Automation packs
  'policy-pack',        // Policy Packs (compliance)

  // Content & Design
  'ui-kit',             // UI Component Packs
  'theme',              // Visual themes
  'widget',             // Widgets (embeddable components)
  'mobile-app',         // Mobile apps
  'prompt-pack',        // Prompt Packs (tested prompts)
  'knowledge-pack',     // Knowledge Packs (knowledge bases)

  // Integrations & APIs
  'integration',        // Integration Connectors
  'api',                // APIs (exposed services)
  'mcp-server',        // MCP Servers (Model Context Protocol)
  'sdk-extension',      // SDK Extensions

  // Specialized
  'data',               // Data Connectors
  'simulation',        // Simulation Packs
  'analytics',          // Analytics Packs
  'ai-model',          // AI Models (vertical-specific)

  // Commerce
  'service',            // Services (general services)
  'consulting',        // Consulting services
  'training',          // Training services
  'starter-kit',        // Starter Kits (pre-built projects)
  'autonomous-network', // Autonomous Networks (Nexha extensions)
  'marketplace-blueprint', // Marketplace Blueprints
  'business-playbook', // Business Playbooks
];

const REVIEW_STATUS = ['published', 'hidden', 'flagged', 'removed'];

const createListingSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(0).max(5000).default(''),
  shortDescription: z.string().max(500).default(''),
  category: z.enum(CATEGORY),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  pricingModel: z.enum(PRICING_MODEL).default('free'),
  price: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  visibility: z.enum(VISIBILITY).default('PUBLIC'),
  status: z.enum(STATUS).optional(),
  directoryCompanyId: z.string().max(200).optional(),
  directoryAgentId: z.string().max(200).optional(),
  trustScore: z.number().min(0).max(100).optional(),
  publisherName: z.string().min(1).max(200),
  publisherUrl: z.string().url().optional(),
  sampleData: z.record(z.any()).default({}),
  assets: z.array(z.string().url()).max(20).default([]),
  metadata: z.record(z.any()).default({}),
}).refine(
  (data) => {
    if (['one-time', 'subscription', 'usage-based'].includes(data.pricingModel)) {
      return typeof data.price === 'number' && data.price >= 0;
    }
    return true;
  },
  { message: 'price (number) is required for one-time, subscription, and usage-based listings', path: ['price'] },
);

const updateListingSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(0).max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  category: z.enum(CATEGORY).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  pricingModel: z.enum(PRICING_MODEL).optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  visibility: z.enum(VISIBILITY).optional(),
  status: z.enum(STATUS).optional(),
  directoryCompanyId: z.string().max(200).nullable().optional(),
  directoryAgentId: z.string().max(200).nullable().optional(),
  trustScore: z.number().min(0).max(100).nullable().optional(),
  publisherName: z.string().min(1).max(200).optional(),
  publisherUrl: z.string().url().optional(),
  sampleData: z.record(z.any()).optional(),
  assets: z.array(z.string().url()).max(20).optional(),
  metadata: z.record(z.any()).optional(),
});

const searchListingsSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.enum(CATEGORY).optional(),
  tag: z.string().max(50).optional(),
  pricingModel: z.enum(PRICING_MODEL).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  directoryCompanyId: z.string().max(200).optional(),
  directoryAgentId: z.string().max(200).optional(),
  publisherName: z.string().max(200).optional(),
  tenantId: z.string().max(200).optional(),
  visibility: z.enum(VISIBILITY).optional(),
  status: z.enum(STATUS).optional(),
  sort: z.enum(['recent', 'rating', 'popular']).default('recent'),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(0).max(200).default(''),
  body: z.string().min(0).max(5000).default(''),
  dimensions: z.object({
    easeOfUse: z.coerce.number().int().min(1).max(5).optional(),
    documentation: z.coerce.number().int().min(1).max(5).optional(),
    support: z.coerce.number().int().min(1).max(5).optional(),
    valueForMoney: z.coerce.number().int().min(1).max(5).optional(),
  }).default({}),
});

const listReviewsSchema = z.object({
  status: z.enum(REVIEW_STATUS).default('published'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function badRequest(res, payload) {
  return res.status(400).json({
    error: payload.message || 'validation error',
    code: payload.code || 'MARKETPLACE_VALIDATION_ERROR',
    issues: payload.issues || undefined,
  });
}

function handleServiceError(res, err) {
  if (err.code === 'MARKETPLACE_VALIDATION_ERROR' || err.name === 'ValidationError') {
    return res.status(err.status || 400).json({ error: err.message, code: err.code, issues: err.issues });
  }
  if (err.code === 'MARKETPLACE_NOT_FOUND' || err.name === 'NotFoundError') {
    return res.status(err.status || 404).json({ error: err.message, code: err.code });
  }
  if (err.code === 'MARKETPLACE_CONFLICT' || err.name === 'ConflictError') {
    return res.status(err.status || 409).json({ error: err.message, code: err.code });
  }
  // eslint-disable-next-line no-console
  console.error('[marketplace-listings] unhandled error:', err);
  return res.status(500).json({ error: err.message || 'internal error' });
}

// -----------------------------------------------------------------------------
// Health + meta
// -----------------------------------------------------------------------------

router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'marketplace-listings',
    version: '1.0.0',
    capabilities: [
      'listings-create',
      'listings-update',
      'listings-publish',
      'listings-search',
      'listings-get',
      'listings-view',
      'listings-install',
      'reviews-add',
      'reviews-list',
      'reviews-hide',
      'stats',
    ],
  });
});

router.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

router.get('/', (_req, res) => res.redirect('/health'));

// -----------------------------------------------------------------------------
// Validation (no persist)
// -----------------------------------------------------------------------------

router.post('/api/validate', optionalAuth, (req, res) => {
  const parsed = createListingSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, {
      message: 'invalid listing payload',
      code: 'MARKETPLACE_VALIDATION_ERROR',
      issues: parsed.error.issues,
    });
  }
  return res.json({ valid: true, listing: parsed.data });
});

// -----------------------------------------------------------------------------
// Listings — CRUD
// -----------------------------------------------------------------------------

router.post('/api/listings', requireAuth, async (req, res) => {
  const parsed = createListingSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid listing payload', code: 'MARKETPLACE_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const listing = await listings.createListing(tenantId, parsed.data);
    return res.status(201).json(listing);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.get('/api/listings', optionalAuth, async (req, res) => {
  const parsed = searchListingsSchema.safeParse(req.query || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid search query', code: 'MARKETPLACE_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  const isInternal = !!(req.user && req.user.internal);
  try {
    const result = await listings.searchListings(parsed.data, tenantId, isInternal);
    return res.json(result);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.get('/api/listings/:listingId', optionalAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const listing = await listings.getListing(tenantId, req.params.listingId, {
      includeUnlisted: !!(req.user && req.user.internal),
    });
    return res.json(listing);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.patch('/api/listings/:listingId', requireAuth, async (req, res) => {
  const parsed = updateListingSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid update payload', code: 'MARKETPLACE_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const listing = await listings.updateListing(tenantId, req.params.listingId, parsed.data);
    return res.json(listing);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/listings/:listingId/publish', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const listing = await listings.publishListing(tenantId, req.params.listingId);
    return res.json(listing);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/listings/:listingId/unpublish', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const listing = await listings.unpublishListing(tenantId, req.params.listingId);
    return res.json(listing);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// -----------------------------------------------------------------------------
// Engagement signals
// -----------------------------------------------------------------------------

router.post('/api/listings/:listingId/view', optionalAuth, async (req, res) => {
  try {
    await listings.recordView(req.params.listingId);
    return res.json({ ok: true });
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.post('/api/listings/:listingId/install', optionalAuth, async (req, res) => {
  try {
    const ok = await listings.recordInstall(req.params.listingId);
    if (!ok) return res.status(404).json({ error: 'listing not found' });
    return res.status(201).json({ ok: true });
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// -----------------------------------------------------------------------------
// Reviews
// -----------------------------------------------------------------------------

router.get('/api/listings/:listingId/reviews', optionalAuth, async (req, res) => {
  const parsed = listReviewsSchema.safeParse(req.query || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid list query', code: 'MARKETPLACE_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  try {
    const result = await reviews.listReviews(req.params.listingId, parsed.data);
    return res.json(result);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.put('/api/listings/:listingId/reviews', requireAuth, async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return badRequest(res, { message: 'invalid review payload', code: 'MARKETPLACE_VALIDATION_ERROR', issues: parsed.error.issues });
  }
  const tenantId = tenantFrom(req);
  try {
    const result = await reviews.addOrUpdateReview(tenantId, req.params.listingId, {
      ...parsed.data,
      reviewerId: req.user?.sub,
      reviewerName: req.user?.name || req.user?.email || 'anonymous',
    });
    return res.status(201).json(result);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.delete('/api/reviews/:reviewId', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const result = await reviews.hideReview(tenantId, req.params.reviewId);
    return res.json(result);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

router.get('/api/my-reviews', requireAuth, async (req, res) => {
  const listingId = String(req.query.listingId || '').trim();
  if (!listingId) {
    return badRequest(res, { message: 'listingId query param required', code: 'MARKETPLACE_VALIDATION_ERROR' });
  }
  const tenantId = tenantFrom(req);
  try {
    const review = await reviews.getMyReview(tenantId, listingId);
    return res.json({ review: review || null });
  } catch (err) {
    return handleServiceError(res, err);
  }
});

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

router.get('/api/stats', requireAuth, async (req, res) => {
  const tenantId = tenantFrom(req);
  try {
    const stats = await listings.getStats(tenantId);
    return res.json(stats);
  } catch (err) {
    return handleServiceError(res, err);
  }
});

export default router;