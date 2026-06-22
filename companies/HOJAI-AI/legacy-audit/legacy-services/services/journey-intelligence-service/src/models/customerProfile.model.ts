/**
 * Customer Profile Model
 * Aggregated customer data across all RTNM businesses
 */

import mongoose, { Document, Schema } from 'mongoose';
import { BusinessDomain } from './journeyEvent.model';

// Engagement levels
export enum EngagementLevel {
  UNKNOWN = 'unknown',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VIP = 'vip',
}

// Customer segment classification
export enum CustomerSegment {
  NEW = 'new',
  ACTIVE = 'active',
  ENGAGED = 'engaged',
  AT_RISK = 'at_risk',
  CHURNED = 'churned',
  DORMANT = 'dormant',
  REACTIVATING = 'reactivating',
}

// Domain-specific metrics per business
export interface IDomainMetrics {
  domain: BusinessDomain;
  totalEvents: number;
  totalTransactions: number;
  totalSpent: number;
  lastActiveDate: Date;
  firstSeenDate: Date;
  conversionRate: number;
  averageOrderValue: number;
}

// Customer Profile Interface
export interface ICustomerProfile extends Document {
  customerId: string;
  email?: string;
  phone?: string;

  // Cross-domain data
  activeDomains: BusinessDomain[];
  domainMetrics: IDomainMetrics[];

  // Engagement & Value
  engagementLevel: EngagementLevel;
  customerSegment: CustomerSegment;
  lifetimeValue: number;
  predictedLTV: number;

  // Churn & Risk
  churnScore: number;
  churnRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  daysSinceLastActivity: number;

  // Journey Stats
  totalEvents: number;
  totalTransactions: number;
  averageSessionDuration: number;
  conversionFunnelStage: string;

  // Computed fields
  lastCalculatedAt: Date;
  firstEventDate: Date;
  lastEventDate: Date;

  createdAt: Date;
  updatedAt: Date;
}

// Customer Profile Schema
const CustomerProfileSchema = new Schema<ICustomerProfile>(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },

    activeDomains: {
      type: [String],
      enum: Object.values(BusinessDomain),
      default: [],
    },
    domainMetrics: {
      type: [
        {
          domain: { type: String, enum: Object.values(BusinessDomain) },
          totalEvents: { type: Number, default: 0 },
          totalTransactions: { type: Number, default: 0 },
          totalSpent: { type: Number, default: 0 },
          lastActiveDate: { type: Date },
          firstSeenDate: { type: Date },
          conversionRate: { type: Number, default: 0 },
          averageOrderValue: { type: Number, default: 0 },
        },
      ],
      default: [],
    },

    engagementLevel: {
      type: String,
      enum: Object.values(EngagementLevel),
      default: EngagementLevel.UNKNOWN,
    },
    customerSegment: {
      type: String,
      enum: Object.values(CustomerSegment),
      default: CustomerSegment.NEW,
    },
    lifetimeValue: {
      type: Number,
      default: 0,
    },
    predictedLTV: {
      type: Number,
      default: 0,
    },

    churnScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    churnRiskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    daysSinceLastActivity: {
      type: Number,
      default: 0,
    },

    totalEvents: {
      type: Number,
      default: 0,
    },
    totalTransactions: {
      type: Number,
      default: 0,
    },
    averageSessionDuration: {
      type: Number,
      default: 0,
    },
    conversionFunnelStage: {
      type: String,
      default: 'unknown',
    },

    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
    firstEventDate: {
      type: Date,
    },
    lastEventDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'customer_profiles',
  }
);

// Indexes for efficient queries
CustomerProfileSchema.index({ customerId: 1 }, { unique: true });
CustomerProfileSchema.index({ engagementLevel: 1, churnRiskLevel: 1 });
CustomerProfileSchema.index({ customerSegment: 1 });
CustomerProfileSchema.index({ lifetimeValue: -1 });
CustomerProfileSchema.index({ churnScore: -1 });
CustomerProfileSchema.index({ lastEventDate: -1 });
CustomerProfileSchema.index({ lastCalculatedAt: 1 });

export const CustomerProfile = mongoose.model<ICustomerProfile>('CustomerProfile', CustomerProfileSchema);
