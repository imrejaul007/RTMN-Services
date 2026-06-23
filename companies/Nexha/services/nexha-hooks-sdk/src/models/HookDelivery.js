import mongoose from 'mongoose';

/**
 * HookDelivery — log of every attempt to deliver an event to a subscription.
 * One event → N subscriptions × M retry attempts = N*M deliveries.
 *
 * Status state machine:
 *   PENDING → SUCCESS
 *   PENDING → FAILED (terminal, after maxAttempts exhausted)
 *   PENDING → RETRYING (intermediate, will retry)
 */

const DELIVERY_STATUS = ['PENDING', 'RETRYING', 'SUCCESS', 'FAILED'];

const hookDeliverySchema = new mongoose.Schema(
  {
    deliveryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^dlv_[a-f0-9]{16}$/,
    },
    subscriptionId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true, maxlength: 100 },
    url: { type: String, required: true, maxlength: 500 },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: DELIVERY_STATUS, default: 'PENDING', index: true },
    attempt: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 6 },
    nextAttemptAt: { type: Date, default: null, index: true },
    lastResponseStatus: { type: Number, default: null },
    lastResponseBody: { type: String, default: null },
    lastError: { type: String, default: null },
    deliveredAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true, collection: 'hook_deliveries' }
);

hookDeliverySchema.index({ tenantId: 1, status: 1, createdAt: -1 });
hookDeliverySchema.index({ subscriptionId: 1, createdAt: -1 });
hookDeliverySchema.index({ status: 1, nextAttemptAt: 1 });

export const HookDelivery = mongoose.model('HookDelivery', hookDeliverySchema);

export const HOOK_DELIVERY_STATUS = DELIVERY_STATUS;
