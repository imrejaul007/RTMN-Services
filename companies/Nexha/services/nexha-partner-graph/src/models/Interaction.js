/**
 * Interaction — a single event that contributes to a Partnership.
 *
 * Per ADR-0010 Phase 7 (2026-06-22): the source of truth for the partner
 * graph. Each event (transaction, negotiation, completed mission, contract,
 * review) records both sides, the value, and any rating.
 *
 * Interaction types:
 *   - 'transaction'      → real money changed hands (GMV)
 *   - 'negotiation'      → ACP messaging completed (any outcome)
 *   - 'mission'          → nexha-mission-planner subtask completed
 *   - 'contract'         → SUTAR contract signed
 *   - 'review'           → marketplace listing review
 *   - 'inquiry'          → looked at each other (low-signal)
 *
 * On `recordInteraction`, the service:
 *   1. Saves the Interaction document
 *   2. Updates (or creates) the (tenantA → tenantB) Partnership
 *   3. Updates (or creates) the (tenantB → tenantA) Partnership
 *   4. Recomputes `strength` on both sides
 */

import mongoose from 'mongoose';

export const INTERACTION_TYPES = [
  'transaction',
  'negotiation',
  'mission',
  'contract',
  'review',
  'inquiry',
];

const InteractionSchema = new mongoose.Schema(
  {
    tenantId:        { type: String, required: true, index: true },
    partnerRef:      { type: String, required: true, index: true },
    type:            { type: String, enum: INTERACTION_TYPES, required: true, index: true },
    // Direction: 'outgoing' (I did something to them) or 'incoming' (they did something to me)
    direction:       { type: String, enum: ['outgoing', 'incoming'], required: true },
    // Value in USD-equivalent (0 for non-monetary interactions)
    value:           { type: Number, default: 0 },
    currency:        { type: String, default: 'USD', uppercase: true, minlength: 3, maxlength: 3 },
    // Optional 1-5 rating from a marketplace review
    rating:          { type: Number, default: null, min: 0, max: 5 },
    // Cross-reference to source service
    source:          { type: String, default: null },  // e.g., 'nexha-acp-messaging', 'nexha-mission-planner'
    sourceRef:       { type: String, default: null },  // e.g., negotiationId, missionId
    // Optional relationship type hint from the source
    relationshipType:{ type: String, default: null },
    // Tags for filtering
    tags:            { type: [String], default: [] },
    metadata:        { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt:      { type: Date, default: Date.now, index: true },
    createdAt:       { type: Date, default: Date.now },
  },
  { versionKey: false, minimize: false },
);

InteractionSchema.index({ tenantId: 1, partnerRef: 1, occurredAt: -1 });
InteractionSchema.index({ tenantId: 1, type: 1, occurredAt: -1 });

export const Interaction = mongoose.model('NexhaInteraction', InteractionSchema);
export default Interaction;