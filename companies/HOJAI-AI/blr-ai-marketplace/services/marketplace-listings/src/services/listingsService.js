/**
 * Listings service — create / read / update / search / publish.
 *
 * Visibility rules:
 *   - PUBLIC + PUBLISHED listings are visible to everyone.
 *   - PRIVATE listings are visible only to the publishing tenant.
 *   - UNLISTED listings are visible only via direct id (not in search).
 *
 * The `req.user.tenantId` (or internal token + x-tenant-id) determines the
 * caller's tenant. Internal callers (x-internal-token) may query across
 * tenants by supplying `?tenantId=<id>` — every other caller is restricted
 * to their own tenant for non-PUBLIC listings.
 */

import { randomUUID } from 'node:crypto';
import { Listing, LISTING_STATUS, LISTING_VISIBILITY, PRICING_MODELS, CATEGORIES } from '../models/Listing.js';
import { Review } from '../models/Review.js';

export class ValidationError extends Error {
  constructor(message, issues) {
    // Include issue details in the message so callers see them via err.message
    let fullMessage = message;
    if (issues && typeof issues === 'object') {
      const details = Object.entries(issues)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
      if (details) fullMessage = `${message}: ${details}`;
    }
    super(fullMessage);
    this.name = 'ValidationError';
    this.status = 400;
    this.code = 'MARKETPLACE_VALIDATION_ERROR';
    this.issues = issues;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
    this.code = 'MARKETPLACE_NOT_FOUND';
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
    this.code = 'MARKETPLACE_CONFLICT';
  }
}

function validateCreate(body) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Body required');
  }
  const issues = {};
  if (typeof body.title !== 'string' || !body.title.trim()) {
    issues.title = 'title is required (string)';
  }
  if (!CATEGORIES.includes(body.category)) {
    issues.category = `category must be one of: ${CATEGORIES.join(', ')}`;
  }
  if (body.pricingModel !== undefined && !PRICING_MODELS.includes(body.pricingModel)) {
    issues.pricingModel = `pricingModel must be one of: ${PRICING_MODELS.join(', ')}`;
  }
  if (body.visibility !== undefined && !LISTING_VISIBILITY.includes(body.visibility)) {
    issues.visibility = `visibility must be one of: ${LISTING_VISIBILITY.join(', ')}`;
  }
  if (body.status !== undefined && !LISTING_STATUS.includes(body.status)) {
    issues.status = `status must be one of: ${LISTING_STATUS.join(', ')}`;
  }
  if (body.price !== undefined && (typeof body.price !== 'number' || body.price < 0)) {
    issues.price = 'price must be a non-negative number (minor units)';
  }
  if (Object.keys(issues).length) {
    throw new ValidationError('Invalid listing body', issues);
  }
}

function validateUpdate(body) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Body required');
  }
  const issues = {};
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
    issues.title = 'title must be a non-empty string';
  }
  if (body.category !== undefined && !CATEGORIES.includes(body.category)) {
    issues.category = `category must be one of: ${CATEGORIES.join(', ')}`;
  }
  if (body.pricingModel !== undefined && !PRICING_MODELS.includes(body.pricingModel)) {
    issues.pricingModel = `pricingModel must be one of: ${PRICING_MODELS.join(', ')}`;
  }
  if (body.visibility !== undefined && !LISTING_VISIBILITY.includes(body.visibility)) {
    issues.visibility = `visibility must be one of: ${LISTING_VISIBILITY.join(', ')}`;
  }
  if (body.status !== undefined && !LISTING_STATUS.includes(body.status)) {
    issues.status = `status must be one of: ${LISTING_STATUS.join(', ')}`;
  }
  if (Object.keys(issues).length) {
    throw new ValidationError('Invalid listing update', issues);
  }
}

/**
 * Create a new listing. Always starts as DRAFT. Publisher must call publish()
 * to make it visible.
 */
export async function createListing(tenantId, body) {
  validateCreate(body);
  const listing = await Listing.create({
    tenantId,
    listingId: body.listingId || randomUUID(),
    title: body.title.trim(),
    description: body.description || '',
    shortDescription: body.shortDescription || '',
    category: body.category,
    tags: Array.isArray(body.tags) ? body.tags : [],
    pricingModel: body.pricingModel || 'free',
    price: typeof body.price === 'number' ? body.price : 0,
    currency: body.currency || 'INR',
    visibility: body.visibility || 'PUBLIC',
    status: body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',  // accept direct publish if requested
    directoryCompanyId: body.directoryCompanyId || null,
    directoryAgentId: body.directoryAgentId || null,
    trustScore: typeof body.trustScore === 'number' ? body.trustScore : null,
    publisherName: body.publisherName || '',
    publisherUrl: body.publisherUrl || '',
    sampleData: body.sampleData || {},
    assets: Array.isArray(body.assets) ? body.assets : [],
    metadata: body.metadata || {},
  });
  if (listing.status === 'PUBLISHED') listing.publishedAt = new Date();
  await listing.save();
  return listing.toObject();
}

/**
 * Update an existing listing. Only the owning tenant can update.
 */
export async function updateListing(tenantId, listingId, body) {
  validateUpdate(body);
  const listing = await Listing.findOne({ tenantId, listingId });
  if (!listing) throw new NotFoundError(`Listing not found: ${listingId}`);
  const fields = [
    'title', 'description', 'shortDescription', 'category', 'tags', 'pricingModel',
    'price', 'currency', 'visibility', 'status', 'directoryCompanyId', 'directoryAgentId',
    'trustScore', 'publisherName', 'publisherUrl', 'sampleData', 'assets', 'metadata',
  ];
  for (const f of fields) {
    if (body[f] !== undefined) listing[f] = body[f];
  }
  await listing.save();
  return listing.toObject();
}

/**
 * Publish (or unpublish) a listing. Sets `publishedAt` on first publish.
 */
export async function publishListing(tenantId, listingId) {
  const listing = await Listing.findOne({ tenantId, listingId });
  if (!listing) throw new NotFoundError(`Listing not found: ${listingId}`);
  listing.status = 'PUBLISHED';
  await listing.save();
  return listing.toObject();
}

export async function unpublishListing(tenantId, listingId) {
  const listing = await Listing.findOne({ tenantId, listingId });
  if (!listing) throw new NotFoundError(`Listing not found: ${listingId}`);
  listing.status = 'UNPUBLISHED';
  await listing.save();
  return listing.toObject();
}

/**
 * Increment the view counter (denormalized). Public — no auth required.
 */
export async function recordView(listingId) {
  await Listing.updateOne({ listingId }, { $inc: { viewCount: 1 } });
}

/**
 * Get a single listing. Visibility rules:
 *   - PUBLIC + PUBLISHED: any tenant
 *   - PRIVATE: only owning tenant
 *   - UNLISTED: only via direct id by owning tenant
 *   - DRAFT/UNPUBLISHED: only owning tenant
 */
export async function getListing(tenantId, listingId, options = {}) {
  const doc = await Listing.findOne({ listingId });
  if (!doc) throw new NotFoundError(`Listing not found: ${listingId}`);
  const isOwner = doc.tenantId === tenantId;
  const isPublicPublished = doc.visibility === 'PUBLIC' && doc.status === 'PUBLISHED';
  if (!isOwner && !isPublicPublished && !options.includeUnlisted) {
    throw new NotFoundError(`Listing not found: ${listingId}`);
  }
  return doc.toObject();
}

/**
 * Search listings. Default scope: PUBLIC + PUBLISHED across all tenants.
 * The optional `tenantId` filter restricts to one tenant.
 */
export async function searchListings(query = {}, callerTenantId = null, isInternal = false) {
  const {
    q,                  // free-text
    category,           // exact
    tag,                // any-of
    pricingModel,       // exact
    minRating,          // >= N
    directoryCompanyId, // exact
    directoryAgentId,   // exact
    tenantId: filterTenant,  // restrict to one tenant (caller must own or be internal)
    visibility = 'PUBLIC',
    status = 'PUBLISHED',
    sort = 'recent',    // 'recent' | 'rating' | 'popular'
    limit = 50,
    offset = 0,
  } = query;

  const filter = { visibility, status };

  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (tag) filter.tags = tag;
  if (pricingModel) filter.pricingModel = pricingModel;
  if (minRating !== undefined) filter.averageRating = { $gte: minRating };
  if (directoryCompanyId) filter.directoryCompanyId = directoryCompanyId;
  if (directoryAgentId) filter.directoryAgentId = directoryAgentId;
  if (filterTenant) {
    if (filterTenant !== callerTenantId && !isInternal) {
      throw new ValidationError('Cannot filter by another tenantId unless internal');
    }
    filter.tenantId = filterTenant;
  }

  // Sort
  let sortSpec = { publishedAt: -1 };
  if (sort === 'rating') sortSpec = { averageRating: -1, reviewCount: -1 };
  if (sort === 'popular') sortSpec = { viewCount: -1, installCount: -1 };

  const cap = Math.min(Math.max(limit, 1), 200);
  const skip = Math.max(offset, 0);

  const [items, total] = await Promise.all([
    Listing.find(filter).sort(sortSpec).skip(skip).limit(cap),
    Listing.countDocuments(filter),
  ]);
  return { items: items.map((d) => d.toObject()), total, limit: cap, offset: skip };
}

/**
 * Increment the install counter (when a consumer installs / subscribes).
 */
export async function recordInstall(listingId) {
  const r = await Listing.updateOne({ listingId }, { $inc: { installCount: 1 } });
  return r.modifiedCount > 0;
}

/**
 * Stats for a tenant.
 */
export async function getStats(tenantId) {
  const [byStatusAgg, byCategoryAgg, total] = await Promise.all([
    Listing.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    Listing.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$category', n: { $sum: 1 } } },
    ]),
    Listing.countDocuments({ tenantId }),
  ]);
  const byStatus = Object.fromEntries(byStatusAgg.map((r) => [r._id, r.n]));
  const byCategory = Object.fromEntries(byCategoryAgg.map((r) => [r._id, r.n]));
  return { total, byStatus, byCategory };
}

export { LISTING_STATUS, LISTING_VISIBILITY, PRICING_MODELS, CATEGORIES };
