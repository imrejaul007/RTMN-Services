/**
 * Return — post-delivery reverse logistics.
 *
 * State machine:
 *   REQUESTED → APPROVED → IN_TRANSIT → RECEIVED → (COMPLETED|REJECTED)
 *            ↘ REJECTED                              ↘ REFUNDED
 *
 * Reasons: DEFECTIVE, WRONG_ITEM, NOT_AS_DESCRIBED, BUYER_REMORSE, OTHER
 *
 * ADR-0010 Phase 8 (2026-06-22).
 */

import mongoose from 'mongoose';

export const RETURN_STATUSES = [
  'REQUESTED',
  'APPROVED',
  'IN_TRANSIT',
  'RECEIVED',
  'COMPLETED',
  'REJECTED',
  'REFUNDED',
];

export const RETURN_REASONS = [
  'DEFECTIVE',
  'WRONG_ITEM',
  'NOT_AS_DESCRIBED',
  'BUYER_REMORSE',
  'OTHER',
];

const ReturnLineSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, enum: RETURN_REASONS, default: 'OTHER' },
    notes: String,
  },
  { _id: false }
);

const ReturnSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    returnId: { type: String, required: true },
    orderId: { type: String, required: true, index: true },
    buyerRef: { type: String, required: true, index: true },
    sellerRef: { type: String, required: true, index: true },
    status: { type: String, enum: RETURN_STATUSES, default: 'REQUESTED', index: true },
    reason: { type: String, enum: RETURN_REASONS, default: 'OTHER' },
    lines: { type: [ReturnLineSchema], default: [] },
    refundAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    approvedAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ReturnSchema.index({ tenantId: 1, returnId: 1 }, { unique: true });
ReturnSchema.index({ tenantId: 1, orderId: 1 });
ReturnSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export const Return = mongoose.models.Return || mongoose.model('Return', ReturnSchema);