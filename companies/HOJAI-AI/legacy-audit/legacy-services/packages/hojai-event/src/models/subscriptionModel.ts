import mongoose, { Schema, Model } from 'mongoose';
import { Subscription, SubscriptionProtocol } from '../types/index.js';

interface SubscriptionDocument extends Subscription {}

const SubscriptionSchema = new Schema<SubscriptionDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,

    // Event filters
    eventTypes: [{ type: String }],
    eventCategories: [{ type: String }],
    userId: { type: String },

    // Destination
    protocol: {
      type: String,
      enum: Object.values(SubscriptionProtocol),
      required: true
    },
    endpoint: { type: String, required: true },

    // Auth
    auth: {
      type: { type: String },
      token: String,
      apiKey: String,
      username: String,
      password: String
    },

    // Configuration
    enabled: { type: Boolean, default: true },
    retryOnFailure: { type: Boolean, default: true },
    maxRetries: { type: Number, default: 3 },
    retryDelayMs: { type: Number, default: 1000 },

    // Filtering
    filter: { type: Map, of: Schema.Types.Mixed },

    // Stats
    lastTriggeredAt: Date,
    triggerCount: { type: Number, default: 0 }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'subscriptions'
  }
);

// Indexes
SubscriptionSchema.index({ tenantId: 1, enabled: 1 });
SubscriptionSchema.index({ tenantId: 1, eventTypes: 1 });

export const SubscriptionModel: Model<SubscriptionDocument> = mongoose.model<SubscriptionDocument>(
  'Subscription',
  SubscriptionSchema
);
