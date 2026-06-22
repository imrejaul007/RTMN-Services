/**
 * ACP Negotiation — a multi-round conversation between two agents.
 *
 * State = currentMessageType (the most recent message's type). Terminal
 * states (REJECT) freeze the negotiation.
 *
 * Per ADR-0010 Phase 4 (2026-06-22): per-tenant, with cross-tenant
 * reads only via internal-token path.
 */

import mongoose from 'mongoose';

export const NEGOTIATION_STATUS = [
  'ACTIVE',
  'ACCEPTED',
  'REJECTED',
  'COMPLETED',
  'DISPUTED',
  'EXPIRED',
]

const NegotiationSchema = new mongoose.Schema(
  {
    tenantId:      { type: String, required: true, index: true },
    negotiationId: { type: String, required: true },
    initiator:     { type: String, required: true },  // agent or user id
    responder:     { type: String, required: true },
    intent:        { type: String, default: '' },
    context:       { type: mongoose.Schema.Types.Mixed, default: {} },
    status:        { type: String, enum: NEGOTIATION_STATUS, default: 'ACTIVE', index: true },
    currentType:   { type: String, default: null },     // last message type
    messageCount:  { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    completedAt:   { type: Date, default: null },
    metadata:      { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt:     { type: Date, default: Date.now, index: true },
    updatedAt:     { type: Date, default: Date.now },
  },
  { versionKey: false, minimize: false },
);

NegotiationSchema.index({ tenantId: 1, status: 1, lastActivityAt: -1 });
NegotiationSchema.index({ tenantId: 1, initiator: 1, createdAt: -1 });
NegotiationSchema.index({ tenantId: 1, responder: 1, createdAt: -1 });
NegotiationSchema.index({ tenantId: 1, negotiationId: 1 }, { unique: true });

NegotiationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const Negotiation = mongoose.model('AcpNegotiation', NegotiationSchema);
export default Negotiation;