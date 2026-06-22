// ============================================================================
// HOJAI VOICE PLATFORM - Analytics Model
// ============================================================================

import mongoose, { Schema, Document } from 'mongoose';
import {
  AnalyticsSummary,
  IntentCount,
  HourlyCount,
  SentimentTrend,
} from '../types';

export interface AnalyticsDocument extends Document {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  summary: {
    totalCalls: number;
    completedCalls: number;
    averageDuration: number;
    averageSentiment: number;
    completionRate: number;
    transferRate: number;
    abandonmentRate: number;
  };
  topIntents: IntentCount[];
  callsByHour: HourlyCount[];
  sentimentTrend: SentimentTrend[];
  createdAt: Date;
  updatedAt: Date;
}

const IntentCountSchema = new Schema({
  intent: { type: String, required: true },
  count: { type: Number, required: true, min: 0 },
  percentage: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });

const HourlyCountSchema = new Schema({
  hour: { type: Number, required: true, min: 0, max: 23 },
  count: { type: Number, required: true, min: 0 },
}, { _id: false });

const SentimentTrendSchema = new Schema({
  date: { type: String, required: true },
  averageSentiment: { type: Number, required: true },
  totalCalls: { type: Number, required: true, min: 0 },
}, { _id: false });

const AnalyticsSchema = new Schema<AnalyticsDocument>(
  {
    organizationId: {
      type: String,
      required: [true, 'Organization ID is required'],
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    summary: {
      totalCalls: { type: Number, required: true, default: 0, min: 0 },
      completedCalls: { type: Number, required: true, default: 0, min: 0 },
      averageDuration: { type: Number, required: true, default: 0, min: 0 },
      averageSentiment: { type: Number, required: true, default: 0, min: -1, max: 1 },
      completionRate: { type: Number, required: true, default: 0, min: 0, max: 100 },
      transferRate: { type: Number, required: true, default: 0, min: 0, max: 100 },
      abandonmentRate: { type: Number, required: true, default: 0, min: 0, max: 100 },
    },
    topIntents: {
      type: [IntentCountSchema],
      default: [],
    },
    callsByHour: {
      type: [HourlyCountSchema],
      default: [],
    },
    sentimentTrend: {
      type: [SentimentTrendSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
AnalyticsSchema.index({ organizationId: 1, periodStart: -1 });
AnalyticsSchema.index({ organizationId: 1, periodEnd: 1 }, { unique: true });

// Static methods
AnalyticsSchema.statics.findByOrganizationAndPeriod = function (
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
) {
  return this.findOne({ organizationId, periodStart, periodEnd });
};

AnalyticsSchema.statics.getLatest = function (organizationId: string) {
  return this.findOne({ organizationId }).sort({ periodEnd: -1 });
};

AnalyticsSchema.statics.getTrend = function (
  organizationId: string,
  days: number = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    organizationId,
    periodEnd: { $gte: startDate },
  }).sort({ periodEnd: 1 });
};

// Instance methods
AnalyticsSchema.methods.toSummary = function (): AnalyticsSummary {
  return {
    totalCalls: this.summary.totalCalls,
    completedCalls: this.summary.completedCalls,
    averageDuration: this.summary.averageDuration,
    averageSentiment: this.summary.averageSentiment,
    topIntents: this.topIntents,
    callsByHour: this.callsByHour,
    sentimentTrend: this.sentimentTrend,
    completionRate: this.summary.completionRate,
    transferRate: this.summary.transferRate,
    abandonmentRate: this.summary.abandonmentRate,
  };
};

// ============================================================================
// Real-time Analytics Model (for live tracking)
// ============================================================================

export interface LiveAnalyticsDocument extends Document {
  organizationId: string;
  agentId: string;
  callId: string;
  sessionId: string;
  currentIntent: string | null;
  sentiment: number;
  turnCount: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LiveAnalyticsSchema = new Schema<LiveAnalyticsDocument>(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    agentId: {
      type: String,
      required: true,
      index: true,
    },
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    currentIntent: {
      type: String,
      default: null,
    },
    sentiment: {
      type: Number,
      default: 0,
      min: -1,
      max: 1,
    },
    turnCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastActivity: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
LiveAnalyticsSchema.index({ organizationId: 1, agentId: 1 });
LiveAnalyticsSchema.index({ lastActivity: -1 }); // For cleanup

// Static methods
LiveAnalyticsSchema.statics.findByCall = function (callId: string) {
  return this.findOne({ callId });
};

LiveAnalyticsSchema.statics.findActiveByOrganization = function (organizationId: string) {
  return this.find({ organizationId }).sort({ lastActivity: -1 });
};

LiveAnalyticsSchema.statics.incrementTurn = function (callId: string) {
  return this.findOneAndUpdate(
    { callId },
    {
      $inc: { turnCount: 1 },
      $set: { lastActivity: new Date() },
    },
    { new: true }
  );
};

LiveAnalyticsSchema.statics.updateSentiment = function (callId: string, sentiment: number) {
  return this.findOneAndUpdate(
    { callId },
    {
      $set: { sentiment, lastActivity: new Date() },
    },
    { new: true }
  );
};

LiveAnalyticsSchema.statics.updateIntent = function (callId: string, intent: string | null) {
  return this.findOneAndUpdate(
    { callId },
    {
      $set: { currentIntent: intent, lastActivity: new Date() },
    },
    { new: true }
  );
};

export const LiveAnalyticsModel = mongoose.model<LiveAnalyticsDocument>('LiveAnalytics', LiveAnalyticsSchema);

export const AnalyticsModel = mongoose.model<AnalyticsDocument>('Analytics', AnalyticsSchema);
