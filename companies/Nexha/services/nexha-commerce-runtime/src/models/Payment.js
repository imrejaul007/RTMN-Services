/**
 * Payment — the financial leg of an order.
 *
 * State machine:
 *   PENDING → AUTHORIZED → CAPTURED → (COMPLETED|REFUNDED)
 *           ↘ FAILED                                       ↗
 *           ↘ CANCELLED                                    ↗ (partial)
 *
 * Methods:
 *   CARD, BANK_TRANSFER, WALLET, ESCROW, BNPL, OTHER
 *
 * ADR-0010 Phase 8 (2026-06-22).
 */

import mongoose from 'mongoose';

export const PAYMENT_STATUSES = [
  'PENDING',
  'AUTHORIZED',
  'CAPTURED',
  'COMPLETED',
  'REFUNDED',
  'FAILED',
  'CANCELLED',
];

export const PAYMENT_METHODS = [
  'CARD',
  'BANK_TRANSFER',
  'WALLET',
  'ESCROW',
  'BNPL',
  'OTHER',
];

const PaymentSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    paymentId: { type: String, required: true },
    orderId: { type: String, required: true, index: true },
    buyerRef: { type: String, required: true, index: true },
    sellerRef: { type: String, required: true, index: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING', index: true },
    method: { type: String, enum: PAYMENT_METHODS, default: 'OTHER' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    refundedAmount: { type: Number, default: 0 },
    providerRef: { type: String, default: null },
    authorizedAt: { type: Date, default: null },
    capturedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PaymentSchema.index({ tenantId: 1, paymentId: 1 }, { unique: true });
PaymentSchema.index({ tenantId: 1, orderId: 1 });
PaymentSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);