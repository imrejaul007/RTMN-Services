/**
 * Partner service — record interactions, derive partnerships, recommend.
 *
 * Per ADR-0010 Phase 7 (2026-06-22): the Partner Graph answers:
 *   - "Who have I transacted with?" (list partnerships)
 *   - "Who should I transact with next?" (recommendations)
 *   - "What's my relationship with X?" (get partnership)
 *   - "How strong is my relationship with X?" (strength 0-1)
 *
 * Errors:
 *   - ValidationError (400)
 *   - NotFoundError (404)
 */

import { Partnership, RELATIONSHIP_TYPES } from '../models/Partnership.js';
import { Interaction, INTERACTION_TYPES } from '../models/Interaction.js';

export class ValidationError extends Error {
  constructor(message, issues) {
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
    this.code = 'PARTNER_VALIDATION_ERROR';
    this.issues = issues;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
    this.code = 'PARTNER_NOT_FOUND';
  }
}

// -----------------------------------------------------------------------------
// Strength calculation
// -----------------------------------------------------------------------------
// Strength is a weighted function of:
//   - log(transactionCount)         (more is better, diminishing returns)
//   - recency                        (recent interactions > old ones)
//   - rating                         (0-5, optional)
//   - log(totalGmv + 1)              (bigger transactions count more)
//
// Strength ∈ [0, 1].

function computeStrength(p) {
  const countScore = Math.min(Math.log10(Math.max(p.transactionCount, 1) + 1) / 2, 1);   // 0..1
  const gmvScore = Math.min(Math.log10(Math.max(p.totalGmv, 0) + 1) / 5, 1);            // 0..1
  const ratingScore = p.averageRating != null ? p.averageRating / 5 : 0.5;              // neutral if unknown
  const recencyScore = p.lastInteractionAt
    ? Math.max(0, 1 - (Date.now() - new Date(p.lastInteractionAt).getTime()) / (365 * 24 * 60 * 60 * 1000))   // 1.0 if today, 0.0 if 1y+
    : 0;
  // Weighted: count 30%, gmv 30%, rating 20%, recency 20%
  const strength = (countScore * 0.30) + (gmvScore * 0.30) + (ratingScore * 0.20) + (recencyScore * 0.20);
  return Math.max(0, Math.min(1, Number(strength.toFixed(4))));
}

// -----------------------------------------------------------------------------
// Recording interactions
// -----------------------------------------------------------------------------

/**
 * Record a single interaction between two parties. Updates (or creates)
 * the corresponding Partnership on both sides.
 *
 * Required body fields:
 *   - tenantId:    the calling tenant (also derived from JWT)
 *   - partnerRef:  the other party's stable ref (tenantId, companyId, agentId)
 *   - partnerType: 'tenant' | 'company' | 'agent'
 *   - type:        'transaction' | 'negotiation' | 'mission' | 'contract' | 'review' | 'inquiry'
 *   - direction:   'outgoing' | 'incoming'
 * Optional:
 *   - value, currency, rating, source, sourceRef, relationshipType, tags, metadata, occurredAt
 */
export async function recordInteraction(tenantId, body) {
  if (!body || typeof body !== 'object') throw new ValidationError('Body required');
  const issues = {};
  if (!body.partnerRef || typeof body.partnerRef !== 'string') issues.partnerRef = 'partnerRef is required';
  if (!body.partnerType || !['tenant', 'company', 'agent'].includes(body.partnerType)) {
    issues.partnerType = 'partnerType must be tenant, company, or agent';
  }
  if (!body.type || !INTERACTION_TYPES.includes(body.type)) {
    issues.type = `type must be one of: ${INTERACTION_TYPES.join(', ')}`;
  }
  if (!body.direction || !['outgoing', 'incoming'].includes(body.direction)) {
    issues.direction = 'direction must be outgoing or incoming';
  }
  if (body.value !== undefined && (typeof body.value !== 'number' || body.value < 0)) {
    issues.value = 'value must be a non-negative number';
  }
  if (body.rating !== undefined && body.rating !== null && (typeof body.rating !== 'number' || body.rating < 0 || body.rating > 5)) {
    issues.rating = 'rating must be 0-5';
  }
  if (Object.keys(issues).length) throw new ValidationError('Invalid interaction body', issues);

  const interaction = await Interaction.create({
    tenantId,
    partnerRef: body.partnerRef,
    partnerType: body.partnerType,
    type: body.type,
    direction: body.direction,
    value: body.value || 0,
    currency: (body.currency || 'USD').toUpperCase(),
    rating: body.rating ?? null,
    source: body.source || null,
    sourceRef: body.sourceRef || null,
    relationshipType: body.relationshipType || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    metadata: body.metadata || {},
    occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
  });

  // Update both sides of the partnership.
  // The "calling" side (tenantId) always gets `direction` as supplied;
  // the "other" side gets the inverse.
  const otherSide = {
    tenantId: body.partnerRef,
    partnerRef: tenantId,
    partnerType: 'tenant',
  };
  await updatePartnership(tenantId, body.partnerRef, body.partnerType, interaction, body.relationshipType);
  await updatePartnership(otherSide.tenantId, otherSide.partnerRef, otherSide.partnerType, interaction, body.relationshipType, /* invertedDirection */ true);

  return interaction.toObject();
}

/**
 * Internal helper: update one side of a partnership based on a new interaction.
 */
async function updatePartnership(tenantId, partnerRef, partnerType, interaction, relationshipTypeHint, invertedDirection = false) {
  let partnership = await Partnership.findOne({ tenantId, partnerRef });
  if (!partnership) {
    partnership = new Partnership({
      tenantId,
      partnerRef,
      partnerType,
      partnerName: '',
      relationshipType: relationshipTypeHint && RELATIONSHIP_TYPES.includes(relationshipTypeHint)
        ? relationshipTypeHint
        : 'unknown',
    });
  }
  // Update counters
  partnership.transactionCount += 1;
  partnership.totalGmv = Number((partnership.totalGmv + (interaction.value || 0)).toFixed(4));
  partnership.lastInteractionAt = interaction.occurredAt;

  // Update rating — simple running average if all known ratings are non-null
  const dirRating = invertedDirection ? interaction.rating : interaction.rating;
  if (dirRating != null) {
    const oldRating = partnership.averageRating;
    const oldCount = partnership.transactionCount - 1;
    const newCount = partnership.transactionCount;
    if (oldRating == null && oldCount <= 0) {
      partnership.averageRating = dirRating;
    } else {
      const base = oldRating != null ? oldRating * oldCount : 0;
      partnership.averageRating = Number(((base + dirRating) / newCount).toFixed(2));
    }
  }

  // Hint relationship type if we have one
  if (relationshipTypeHint && RELATIONSHIP_TYPES.includes(relationshipTypeHint)
      && partnership.relationshipType === 'unknown') {
    partnership.relationshipType = relationshipTypeHint;
  }

  // Recompute strength
  partnership.strength = computeStrength(partnership.toObject());

  await partnership.save();
  return partnership.toObject();
}

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

export async function listPartnerships(tenantId, query = {}) {
  const { relationshipType, minStrength, limit = 50, offset = 0, sort = 'strength' } = query;
  const filter = { tenantId };
  if (relationshipType) filter.relationshipType = relationshipType;
  if (minStrength != null) filter.strength = { $gte: Number(minStrength) };

  const sortMap = {
    strength: { strength: -1 },
    recent: { lastInteractionAt: -1 },
    count: { transactionCount: -1 },
    gmv: { totalGmv: -1 },
  };
  const sortObj = sortMap[sort] || sortMap.strength;
  const cap = Math.min(Math.max(limit, 1), 200);

  const [items, total] = await Promise.all([
    Partnership.find(filter).sort(sortObj).skip(Math.max(offset, 0)).limit(cap),
    Partnership.countDocuments(filter),
  ]);
  return {
    items: items.map((d) => d.toObject()),
    total,
    limit: cap,
    offset: Math.max(offset, 0),
  };
}

export async function getPartnership(tenantId, partnerRef) {
  const p = await Partnership.findOne({ tenantId, partnerRef });
  if (!p) throw new NotFoundError(`Partnership not found: ${partnerRef}`);
  return p.toObject();
}

/**
 * "Companies I've transacted with" — same as listPartnerships but with
 * type filter applied (e.g., only `customer` or `supplier`).
 */
export async function listByType(tenantId, relationshipType, query = {}) {
  return listPartnerships(tenantId, { ...query, relationshipType });
}

/**
 * Recommendation engine.
 *
 * Strategy: combine three signals into a 0-1 score:
 *   1. Past partnership strength (0-1) — strong ties are good
 *   2. Recency penalty (-1 per year, capped) — old relationships decay
 *   3. Diversity bonus — favor underrepresented partner types
 *
 * `candidates` is an optional array of `{ partnerRef, partnerType, partnerName, tags, trustScore }`
 * the caller passes in (e.g., from nexha-business-directory). If omitted, the
 * function returns the top-N existing partnerships sorted by strength × recency.
 */
export async function recommendPartners(tenantId, options = {}) {
  const { candidates = null, limit = 10, minStrength = 0 } = options;
  // If candidates supplied: score them based on past interactions
  if (Array.isArray(candidates) && candidates.length > 0) {
    const existing = await Partnership.find({
      tenantId,
      partnerRef: { $in: candidates.map((c) => c.partnerRef) },
    });
    const byRef = new Map(existing.map((p) => [p.partnerRef, p.toObject()]));
    const ranked = candidates.map((c) => {
      const existingP = byRef.get(c.partnerRef);
      const baseStrength = existingP?.strength ?? 0;
      const trustScore = c.trustScore ?? existingP?.trustScore ?? 50;
      const recency = existingP?.lastInteractionAt
        ? Math.max(0, 1 - (Date.now() - new Date(existingP.lastInteractionAt).getTime()) / (180 * 24 * 60 * 60 * 1000))
        : 0;
      // Composite score: 40% existing strength + 30% trust + 30% recency
      const score = (baseStrength * 0.40) + ((trustScore / 100) * 0.30) + (recency * 0.30);
      return {
        partnerRef: c.partnerRef,
        partnerType: c.partnerType || existingP?.partnerType || 'company',
        partnerName: c.partnerName || existingP?.partnerName || c.partnerRef,
        score: Number(score.toFixed(4)),
        existing: !!existingP,
        relationshipType: existingP?.relationshipType || 'unknown',
        trustScore,
      };
    }).filter((r) => r.score >= minStrength)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { items: ranked, total: ranked.length };
  }
  // No candidates → just return top existing partnerships by strength × recency
  const partnerships = await Partnership.find({ tenantId }).sort({ strength: -1 }).limit(limit);
  const now = Date.now();
  const ranked = partnerships
    .map((p) => {
      const obj = p.toObject();
      const recency = obj.lastInteractionAt
        ? Math.max(0, 1 - (now - new Date(obj.lastInteractionAt).getTime()) / (180 * 24 * 60 * 60 * 1000))
        : 0;
      const score = Number(((obj.strength * 0.7) + (recency * 0.3)).toFixed(4));
      return {
        partnerRef: obj.partnerRef,
        partnerType: obj.partnerType,
        partnerName: obj.partnerName || obj.partnerRef,
        score,
        existing: true,
        relationshipType: obj.relationshipType,
        trustScore: obj.trustScore ?? null,
      };
    })
    .filter((r) => r.score >= minStrength);
  return { items: ranked, total: ranked.length };
}

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

export async function getStats(tenantId) {
  const [byType, byPartnerType, totals] = await Promise.all([
    Partnership.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$relationshipType', n: { $sum: 1 } } },
    ]),
    Partnership.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$partnerType', n: { $sum: 1 } } },
    ]),
    Partnership.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: null,
          totalPartners: { $sum: 1 },
          totalGmv: { $sum: '$totalGmv' },
          totalInteractions: { $sum: '$transactionCount' },
          avgStrength: { $avg: '$strength' },
        },
      },
    ]),
  ]);
  const t = totals[0] || { totalPartners: 0, totalGmv: 0, totalInteractions: 0, avgStrength: 0 };
  return {
    totalPartners: t.totalPartners,
    totalInteractions: t.totalInteractions,
    totalGmv: Number((t.totalGmv || 0).toFixed(2)),
    avgStrength: Number((t.avgStrength || 0).toFixed(4)),
    byRelationshipType: Object.fromEntries(byType.map((r) => [r._id, r.n])),
    byPartnerType: Object.fromEntries(byPartnerType.map((r) => [r._id, r.n])),
  };
}

export async function listInteractions(tenantId, query = {}) {
  const { partnerRef, type, limit = 50, offset = 0 } = query;
  const filter = { tenantId };
  if (partnerRef) filter.partnerRef = partnerRef;
  if (type) filter.type = type;
  const cap = Math.min(Math.max(limit, 1), 200);
  const [items, total] = await Promise.all([
    Interaction.find(filter).sort({ occurredAt: -1 }).skip(Math.max(offset, 0)).limit(cap),
    Interaction.countDocuments(filter),
  ]);
  return {
    items: items.map((d) => d.toObject()),
    total,
    limit: cap,
    offset: Math.max(offset, 0),
  };
}

export { INTERACTION_TYPES, RELATIONSHIP_TYPES };