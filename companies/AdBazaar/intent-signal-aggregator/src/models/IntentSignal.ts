/**
 * Intent Signal Model
 *
 * Mongoose model for storing intent signals.
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// INTERFACES
// ============================================================================

export interface IIntentSignal extends Document {
  signalId: string;
  source: string;
  sourceService: string;
  userId: string;
  eventType: 'search' | 'view' | 'wishlist' | 'cart_add' | 'checkout_start' | 'fulfilled';
  category: 'DINING' | 'TRAVEL' | 'RETAIL' | 'HEALTHCARE' | 'GENERAL';
  intentKey: string;
  intentQuery?: string;
  confidence: number;
  enriched: boolean;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const intentSignalSchema = new Schema<IIntentSignal>(
  {
    signalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    sourceService: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: ['search', 'view', 'wishlist', 'cart_add', 'checkout_start', 'fulfilled'],
      index: true,
    },
    category: {
      type: String,
      required: true,
      uppercase: true,
      enum: ['DINING', 'TRAVEL', 'RETAIL', 'HEALTHCARE', 'GENERAL'],
      index: true,
    },
    intentKey: {
      type: String,
      required: true,
      index: true,
    },
    intentQuery: {
      type: String,
    },
    confidence: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
    enriched: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'intent_signals',
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Compound indexes for common queries
intentSignalSchema.index({ userId: 1, timestamp: -1 });
intentSignalSchema.index({ source: 1, timestamp: -1 });
intentSignalSchema.index({ category: 1, eventType: 1 });
intentSignalSchema.index({ intentKey: 1, category: 1 });
intentSignalSchema.index({ userId: 1, category: 1, timestamp: -1 });

// TTL index - auto-delete old signals after 90 days
intentSignalSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ============================================================================
// STATIC METHODS
// ============================================================================

intentSignalSchema.statics.findBySignalId = function(signalId: string) {
  return this.findOne({ signalId });
};

intentSignalSchema.statics.findByUserId = function(userId: string, limit: number = 100) {
  return this.find({ userId }).sort({ timestamp: -1 }).limit(limit);
};

intentSignalSchema.statics.findBySource = function(source: string, limit: number = 100) {
  return this.find({ source: source.toLowerCase() }).sort({ timestamp: -1 }).limit(limit);
};

intentSignalSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const bySource = await this.aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const byEventType = await this.aggregate([
    { $group: { _id: '$eventType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const byCategory = await this.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    total,
    bySource,
    byEventType,
    byCategory,
  };
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const IntentSignalModel = mongoose.model<IIntentSignal>('IntentSignal', intentSignalSchema);