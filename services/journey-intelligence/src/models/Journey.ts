/**
 * Customer Journey Model
 * Tracks the complete customer journey from first touch to conversion
 */

import mongoose, { Document, Schema } from 'mongoose';
import {
  ICustomerJourney,
  JourneyStage,
  JourneyStageHistory
} from '../types';

export interface CustomerJourneyDocument extends Omit<ICustomerJourney, '_id'>, Document {}

const JourneyStageHistorySchema = new Schema<JourneyStageHistory>(
  {
    stage: {
      type: String,
      enum: Object.values(JourneyStage),
      required: true
    },
    enteredAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    exitedAt: {
      type: Date,
      default: null
    },
    touchpointId: {
      type: String,
      ref: 'Touchpoint'
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const CustomerJourneySchema = new Schema<CustomerJourneyDocument>(
  {
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
    currentStage: {
      type: String,
      enum: Object.values(JourneyStage),
      default: JourneyStage.AWARENESS,
      index: true
    },
    stages: {
      type: [JourneyStageHistorySchema],
      default: []
    },
    touchpoints: [{
      type: Schema.Types.ObjectId,
      ref: 'Touchpoint'
    }],
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    convertedAt: {
      type: Date,
      default: null
    },
    churnedAt: {
      type: Date,
      default: null
    },
    lifetime: {
      type: Number,
      default: 0
    },
    value: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    collection: 'journeys'
  }
);

// Compound indexes for efficient queries
CustomerJourneySchema.index({ tenantId: 1, currentStage: 1 });
CustomerJourneySchema.index({ tenantId: 1, convertedAt: 1 });
CustomerJourneySchema.index({ tenantId: 1, churnedAt: 1 });
CustomerJourneySchema.index({ tenantId: 1, customerId: 1 }, { unique: true });
CustomerJourneySchema.index({ tenantId: 1, createdAt: 1 });

// Static methods
CustomerJourneySchema.statics.findByCustomerAndTenant = function(
  customerId: string,
  tenantId: string
) {
  return this.findOne({ customerId, tenantId });
};

CustomerJourneySchema.statics.findByTenantAndStage = function(
  tenantId: string,
  stage: JourneyStage
) {
  return this.find({ tenantId, currentStage: stage });
};

CustomerJourneySchema.statics.findActiveByTenant = function(tenantId: string) {
  return this.find({
    tenantId,
    churnedAt: null,
    convertedAt: null
  });
};

CustomerJourneySchema.statics.findConvertedByTenant = function(tenantId: string) {
  return this.find({
    tenantId,
    convertedAt: { $ne: null }
  });
};

// Instance methods
CustomerJourneySchema.methods.advanceStage = function(
  newStage: JourneyStage,
  touchpointId?: string,
  metadata?: Record<string, unknown>
) {
  // Close current stage
  const currentStageHistory = this.stages.find(
    s => s.enteredAt && !s.exitedAt
  );
  if (currentStageHistory) {
    currentStageHistory.exitedAt = new Date();
  }

  // Add new stage
  this.stages.push({
    stage: newStage,
    enteredAt: new Date(),
    touchpointId,
    metadata
  });

  this.currentStage = newStage;

  return this.save();
};

CustomerJourneySchema.methods.markConverted = function() {
  this.convertedAt = new Date();
  return this.save();
};

CustomerJourneySchema.methods.markChurned = function() {
  this.churnedAt = new Date();
  return this.save();
};

CustomerJourneySchema.methods.addValue = function(amount: number) {
  this.value += amount;
  return this.save();
};

export const CustomerJourney = mongoose.model<CustomerJourneyDocument>(
  'CustomerJourney',
  CustomerJourneySchema
);
