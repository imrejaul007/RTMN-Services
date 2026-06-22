/**
 * Journey Event Model
 * Tracks individual customer journey events across all RTNM businesses
 */

import mongoose, { Document, Schema } from 'mongoose';

// Domain/Business types within RTNM Group
export enum BusinessDomain {
  COMMERCE = 'commerce',       // REZ-Commerce, NeXha
  HEALTHCARE = 'healthcare',   // RisaCare
  MOBILITY = 'mobility',        // KHAIRMOVE
  FINANCE = 'finance',          // RidZa, Razo
  HOSPITALITY = 'hospitality',  // StayOwn
  MEDIA = 'media',              // AdBazaar
  LIFESTYLE = 'lifestyle',      // Axom
  CORPORATE = 'corporate',      // CorpPerks
}

// Event types for customer journey
export enum JourneyEventType {
  // Awareness & Discovery
  AWARENESS = 'awareness',
  DISCOVERY = 'discovery',
  SEARCH = 'search',

  // Engagement
  VIEW = 'view',
  INTERACTION = 'interaction',
  ADD_TO_CART = 'add_to_cart',
  WISHLIST = 'wishlist',
  BOOKING_START = 'booking_start',

  // Conversion
  SIGNUP = 'signup',
  PURCHASE = 'purchase',
  BOOKING = 'booking',
  SUBSCRIPTION = 'subscription',
  LOAN_APPROVED = 'loan_approved',

  // Retention
  RETURN_VISIT = 'return_visit',
  REPEAT_PURCHASE = 'repeat_purchase',
  REFERRAL = 'referral',
  REVIEW = 'review',

  // Churn Signals
  CART_ABANDON = 'cart_abandon',
  BOOKING_CANCEL = 'booking_cancel',
  INACTIVITY = 'inactivity',
  CHURN = 'churn',
}

// Event metadata interface
export interface IEventMetadata {
  source?: string;
  channel?: string;
  campaignId?: string;
  referrer?: string;
  device?: string;
  location?: string;
  productId?: string;
  serviceId?: string;
  amount?: number;
  currency?: string;
  [key: string]: unknown;
}

// Journey Event Interface
export interface IJourneyEvent extends Document {
  customerId: string;
  businessDomain: BusinessDomain;
  businessId: string;
  eventType: JourneyEventType;
  timestamp: Date;
  metadata: IEventMetadata;
  sessionId?: string;
  channel?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Journey Event Schema
const JourneyEventSchema = new Schema<IJourneyEvent>(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    businessDomain: {
      type: String,
      enum: Object.values(BusinessDomain),
      required: true,
      index: true,
    },
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: Object.values(JourneyEventType),
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    sessionId: {
      type: String,
      index: true,
    },
    channel: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'journey_events',
  }
);

// Compound indexes for common queries
JourneyEventSchema.index({ customerId: 1, timestamp: -1 });
JourneyEventSchema.index({ customerId: 1, businessDomain: 1, timestamp: -1 });
JourneyEventSchema.index({ customerId: 1, eventType: 1, timestamp: -1 });
JourneyEventSchema.index({ businessDomain: 1, eventType: 1, timestamp: -1 });

export const JourneyEvent = mongoose.model<IJourneyEvent>('JourneyEvent', JourneyEventSchema);
