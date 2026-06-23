/**
 * Partnership — a directed edge between two tenants (or between a tenant
 * and a specific company/agent in nexha-business-directory).
 *
 * Per ADR-0010 Phase 7 (2026-06-22): the Partner Graph answers
 * "who have I transacted with?" and "who should I transact with next?"
 *
 * Partnerships are derived from Interaction events: when tenant A negotiates
 * with tenant B, the interaction increments the (A→B) and (B→A) edge weights.
 *
 * Edge metadata:
 *   - relationshipType:  'supplier' | 'customer' | 'partner' | 'competitor'
 *   - transactionCount:  how many interactions (transactions, negotiations,
 *                        completed missions, contracts) occurred
 *   - totalGmv:          cumulative value (USD-equivalent) transacted
 *   - averageRating:     average rating given in reviews for this partner
 *   - trustScore:        cached trust score from SADA (0-100)
 *   - lastInteractionAt: timestamp of the most recent interaction
 *   - tags:              free-form labels
 *   - strength:          derived score 0-1 (higher = stronger relationship)
 */

import mongoose from 'mongoose';

export const RELATIONSHIP_TYPES = ['supplier', 'customer', 'partner', 'competitor', 'unknown'];

const PartnershipSchema = new mongoose.Schema(
  {
    tenantId:        { type: String, required: true, index: true },
    // The "other side" of the partnership. May be a tenantId, a directoryCompanyId,
    // or a directoryAgentId — anything stable.
    partnerRef:      { type: String, required: true },
    partnerType:     { type: String, enum: ['tenant', 'company', 'agent'], default: 'tenant' },
    partnerName:     { type: String, default: '' },
    relationshipType:{ type: String, enum: RELATIONSHIP_TYPES, default: 'unknown', index: true },
    transactionCount:{ type: Number, default: 0 },
    totalGmv:        { type: Number, default: 0 },
    averageRating:   { type: Number, default: null, min: 0, max: 5 },
    trustScore:      { type: Number, default: null, min: 0, max: 100 },
    lastInteractionAt:{ type: Date, default: null },
    tags:            { type: [String], default: [] },
    // Strength 0-1: simple weighted function of count + recency + rating + gmv
    strength:        { type: Number, default: 0, min: 0, max: 1, index: true },
    metadata:        { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt:       { type: Date, default: Date.now, index: true },
    updatedAt:       { type: Date, default: Date.now },
  },
  { versionKey: false, minimize: false },
);

PartnershipSchema.index({ tenantId: 1, partnerRef: 1 }, { unique: true });
PartnershipSchema.index({ tenantId: 1, relationshipType: 1, strength: -1 });
PartnershipSchema.index({ tenantId: 1, lastInteractionAt: -1 });

PartnershipSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const Partnership = mongoose.model('NexhaPartnership', PartnershipSchema);
export default Partnership;