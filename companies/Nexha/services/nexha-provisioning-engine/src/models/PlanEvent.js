import mongoose from 'mongoose';

/**
 * PlanEvent — immutable log of state transitions + orchestrator callbacks.
 * Used for audit trail and reconciliation.
 */

const planEventSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: true,
      index: true,
      match: /^pln_[a-f0-9]{16}$/,
    },
    tenantId: { type: String, required: true, index: true, maxlength: 100 },
    type: {
      type: String,
      enum: [
        'plan.created',
        'plan.transition',
        'plan.resource.applied',
        'plan.resource.failed',
        'plan.output.recorded',
        'plan.drift.detected',
        'plan.destroyed',
        'plan.cancelled',
      ],
      required: true,
    },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    resourceName: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    actor: { type: String, default: 'system', maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'provisioning_plan_events' }
);

planEventSchema.index({ planId: 1, createdAt: 1 });
planEventSchema.index({ tenantId: 1, type: 1, createdAt: -1 });

export const PlanEvent = mongoose.model('PlanEvent', planEventSchema);
