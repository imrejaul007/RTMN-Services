/**
 * Order — the central aggregate of the Commerce Runtime.
 *
 * State machine:
 *   DRAFT → PLACED → PAID → FULFILLING → SHIPPED → DELIVERED → COMPLETED
 *                ↓        ↓           ↓
 *             CANCELLED  REFUNDED   RETURNED → COMPLETED|REFUNDED
 *
 * Status meanings:
 *   DRAFT      — being assembled; not yet submitted
 *   PLACED     — buyer submitted; awaiting payment
 *   PAID       — payment captured (or escrow funded); ready to fulfill
 *   FULFILLING — seller is picking/packing; warehouse engaged
 *   SHIPPED    — carrier picked up; in transit
 *   DELIVERED  — carrier confirmed delivery
 *   COMPLETED  — buyer accepted (auto after return window)
 *   CANCELLED  — terminal (no payment captured)
 *   REFUNDED   — terminal (payment returned)
 *   RETURNED   — buyer returned goods; awaiting refund decision
 *
 * ADR-0010 Phase 8 (2026-06-22).
 */

import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'DRAFT',
  'PLACED',
  'PAID',
  'FULFILLING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'RETURNED',
];

const LineItemSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const FulfillmentSchema = new mongoose.Schema(
  {
    warehouseRef: String,
    carrierRef: String,
    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    buyerRef: { type: String, required: true, index: true },
    sellerRef: { type: String, required: true, index: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'DRAFT', index: true },
    items: { type: [LineItemSchema], default: [] },
    currency: { type: String, default: 'USD' },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentId: { type: String, default: null, index: true },
    fulfillment: { type: FulfillmentSchema, default: null },
    shippingAddress: { type: mongoose.Schema.Types.Mixed, default: null },
    notes: { type: String, default: null },
    placedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    tags: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Per-tenant compound unique indexes
OrderSchema.index({ tenantId: 1, orderId: 1 }, { unique: true });
OrderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ tenantId: 1, buyerRef: 1, createdAt: -1 });
OrderSchema.index({ tenantId: 1, sellerRef: 1, createdAt: -1 });

export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);