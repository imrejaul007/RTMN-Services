/**
 * Touchpoint Model
 * Tracks individual interactions in the customer journey
 */

import mongoose, { Document, Schema } from 'mongoose';
import {
  ITouchpoint,
  TouchpointType,
  JourneyStage,
  TouchpointSource,
  TouchpointProperties,
  DeviceInfo,
  GeoLocation
} from '../types';

export interface TouchpointDocument extends Omit<ITouchpoint, '_id'>, Document {}

const TouchpointSourceSchema = new Schema<TouchpointSource>(
  {
    type: {
      type: String,
      enum: Object.values(TouchpointType),
      required: true
    },
    channel: String,
    campaign: String,
    content: String,
    medium: String,
    source: String,
    referrer: String
  },
  { _id: false }
);

const TouchpointPropertiesSchema = new Schema<TouchpointProperties>(
  {
    url: String,
    pageTitle: String,
    searchQuery: String,
    adId: String,
    adGroup: String,
    keyword: String,
    placement: String,
    conversionValue: Number,
    eventType: String,
    elementId: String
  },
  { _id: false }
);

const DeviceInfoSchema = new Schema<DeviceInfo>(
  {
    userAgent: String,
    browser: String,
    os: String,
    device: String,
    screenWidth: Number,
    screenHeight: Number
  },
  { _id: false }
);

const GeoLocationSchema = new Schema<GeoLocation>(
  {
    ip: String,
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  { _id: false }
);

const TouchpointSchema = new Schema<TouchpointDocument>(
  {
    touchpointId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    customerId: {
      type: String,
      required: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
      default: 'public'
    },
    type: {
      type: String,
      enum: Object.values(TouchpointType),
      required: true,
      index: true
    },
    source: {
      type: TouchpointSourceSchema,
      required: true
    },
    journeyId: {
      type: String,
      index: true
    },
    journeyStage: {
      type: String,
      enum: Object.values(JourneyStage),
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    duration: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    properties: {
      type: TouchpointPropertiesSchema,
      default: {}
    },
    sessionId: {
      type: String,
      index: true
    },
    deviceInfo: {
      type: DeviceInfoSchema,
      default: {}
    },
    location: {
      type: GeoLocationSchema,
      default: {}
    },
    converted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'touchpoints'
  }
);

// Compound indexes for efficient queries
TouchpointSchema.index({ tenantId: 1, customerId: 1 });
TouchpointSchema.index({ tenantId: 1, type: 1, timestamp: -1 });
TouchpointSchema.index({ tenantId: 1, journeyStage: 1, timestamp: -1 });
TouchpointSchema.index({ tenantId: 1, sessionId: 1, timestamp: 1 });
TouchpointSchema.index({ tenantId: 1, converted: 1, timestamp: -1 });
TouchpointSchema.index({ tenantId: 1, 'source.channel': 1, timestamp: -1 });
TouchpointSchema.index({ tenantId: 1, 'source.campaign': 1, timestamp: -1 });

// TTL index for automatic cleanup (optional, configurable)
TouchpointSchema.index({ createdAt: 1 }, { expireAfterSeconds: undefined });

// Static methods
TouchpointSchema.statics.findByCustomer = function(
  customerId: string,
  tenantId: string,
  options?: { limit?: number; sort?: string }
) {
  const query = this.find({ customerId, tenantId })
    .sort(options?.sort || '-timestamp');

  if (options?.limit) {
    query.limit(options.limit);
  }

  return query;
};

TouchpointSchema.statics.findBySession = function(
  sessionId: string,
  tenantId: string
) {
  return this.find({ sessionId, tenantId }).sort('timestamp');
};

TouchpointSchema.statics.findByType = function(
  type: TouchpointType,
  tenantId: string,
  dateRange?: { start: Date; end: Date }
) {
  const query: Record<string, unknown> = { type, tenantId };

  if (dateRange) {
    query.timestamp = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }

  return this.find(query).sort('-timestamp');
};

TouchpointSchema.statics.findByChannel = function(
  channel: string,
  tenantId: string,
  dateRange?: { start: Date; end: Date }
) {
  const query: Record<string, unknown> = { tenantId, 'source.channel': channel };

  if (dateRange) {
    query.timestamp = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }

  return this.find(query).sort('-timestamp');
};

TouchpointSchema.statics.getConversionStats = function(tenantId: string) {
  return this.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        conversions: {
          $sum: { $cond: ['$converted', 1, 0] }
        },
        totalRevenue: { $sum: '$revenue' },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        conversions: 1,
        conversionRate: {
          $cond: [
            { $eq: ['$count', 0] },
            0,
            { $divide: ['$conversions', '$count'] }
          ]
        },
        totalRevenue: 1,
        avgDuration: 1
      }
    },
    { $sort: { count: -1 } }
  ]);
};

TouchpointSchema.statics.getChannelAttribution = function(tenantId: string) {
  return this.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: {
          channel: '$source.channel',
          type: '$type'
        },
        touchpoints: { $sum: 1 },
        conversions: {
          $sum: { $cond: ['$converted', 1, 0] }
        },
        revenue: { $sum: '$revenue' }
      }
    },
    {
      $group: {
        _id: '$_id.channel',
        types: {
          $push: {
            type: '$_id.type',
            touchpoints: '$touchpoints',
            conversions: '$conversions',
            revenue: '$revenue'
          }
        },
        totalTouchpoints: { $sum: '$touchpoints' },
        totalConversions: { $sum: '$conversions' },
        totalRevenue: { $sum: '$revenue' }
      }
    },
    { $sort: { totalTouchpoints: -1 } }
  ]);
};

export const Touchpoint = mongoose.model<TouchpointDocument>(
  'Touchpoint',
  TouchpointSchema
);
