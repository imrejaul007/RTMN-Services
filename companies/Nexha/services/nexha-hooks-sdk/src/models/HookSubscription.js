import mongoose from 'mongoose';

/**
 * HookSubscription — a tenant's registration of a webhook URL for one or
 * more event types. Receives HMAC-signed POSTs with retry.
 *
 * Status state machine:
 *   ACTIVE      ←→ DISABLED
 *   ACTIVE      → DELETED (terminal)
 *   DISABLED    → ACTIVE
 *   DISABLED    → DELETED (terminal)
 */

const EVENT_TYPES = [
  // Tenant instance lifecycle
  'sutar.tenant.provisioned',
  'sutar.tenant.suspended',
  'sutar.tenant.resumed',
  'sutar.tenant.destroyed',
  'sutar.tenant.failed',
  'industry.tenant.provisioned',
  'industry.tenant.suspended',
  'industry.tenant.resumed',
  'industry.tenant.destroyed',
  'industry.tenant.failed',
  // Provisioning engine
  'provisioning.plan.ready',
  'provisioning.plan.failed',
  'provisioning.plan.destroyed',
  // Usage / limits
  'usage.limit.exceeded',
  'usage.limit.warning',
  // Mission
  'mission.started',
  'mission.completed',
  'mission.failed',
  // Commerce
  'order.placed',
  'order.paid',
  'order.refunded',
  'order.fulfilled',
  // Partner
  'partner.invited',
  'partner.connected',
  'partner.disconnected',
  // Wildcard
  '*',
];

const hookSubscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^sub_[a-f0-9]{16}$/,
    },
    tenantId: { type: String, required: true, index: true, maxlength: 100 },
    url: { type: String, required: true, maxlength: 500 },
    secret: { type: String, required: true, maxlength: 200 },
    eventTypes: {
      type: [String],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'eventTypes must be a non-empty array',
      },
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DISABLED', 'DELETED'],
      default: 'ACTIVE',
      index: true,
    },
    description: { type: String, default: '', maxlength: 500 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastTriggeredAt: { type: Date, default: null },
    lastSuccessAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null },
    totalDeliveries: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'hook_subscriptions' }
);

hookSubscriptionSchema.index({ tenantId: 1, status: 1 });
hookSubscriptionSchema.index({ eventTypes: 1, status: 1 });

export const HookSubscription = mongoose.model('HookSubscription', hookSubscriptionSchema);

export const HOOK_EVENT_TYPES = EVENT_TYPES;
