import mongoose, { Schema, Model } from 'mongoose';
import { Event, EventCategory } from '../types/index.js';

interface EventDocument extends Event {}

const EventSchema = new Schema<EventDocument>(
  {
    // Namespace for tenant isolation
    namespace: { type: String, required: true, index: true },

    // Event identification
    type: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: Object.values(EventCategory),
      required: true,
      index: true
    },
    name: { type: String, required: true },

    // Who/What
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    entityType: { type: String },
    entityId: { type: String, index: true },

    // When
    timestamp: { type: Date, required: true, index: true },

    // Where
    source: { type: String },
    sessionId: { type: String },
    channel: { type: String },

    // Location
    location: {
      latitude: Number,
      longitude: Number,
      city: String,
      country: String
    },

    // Event data
    properties: { type: Map, of: Schema.Types.Mixed },
    metrics: { type: Map, of: Number },

    // Context
    context: {
      userAgent: String,
      ip: String,
      deviceType: String,
      browser: String,
      os: String,
      referrer: String
    },

    // Derived
    derivedFrom: String,

    // Processing
    processed: { type: Boolean, default: false },
    processedAt: Date,
    version: { type: String, default: '1.0' }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'events'
  }
);

// Compound indexes for common queries
EventSchema.index({ namespace: 1, type: 1, timestamp: -1 });
EventSchema.index({ namespace: 1, userId: 1, timestamp: -1 });
EventSchema.index({ namespace: 1, entityType: 1, entityId: 1, timestamp: -1 });
EventSchema.index({ namespace: 1, category: 1, timestamp: -1 });

// TTL index - auto-delete events after 2 years
EventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

export const EventModel: Model<EventDocument> = mongoose.model<EventDocument>('Event', EventSchema);
