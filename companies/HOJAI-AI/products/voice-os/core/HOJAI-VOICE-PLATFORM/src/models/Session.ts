// ============================================================================
// HOJAI VOICE PLATFORM - Session Model
// ============================================================================

import mongoose, { Schema, Document } from 'mongoose';
import {
  Session as ISession,
  SessionStatus,
  Message,
  SessionContext,
  SentimentScore,
  SupportedLanguage,
} from '../types';

export interface SessionDocument extends Omit<ISession, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const SentimentScoreSchema = new Schema({
  label: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    required: true,
  },
  score: { type: Number, required: true, min: -1, max: 1 },
  confidence: { type: Number, required: true, min: 0, max: 1 },
}, { _id: false });

const MessageSchema = new Schema({
  id: { type: String, required: true },
  sessionId: { type: String, required: true, index: true },
  role: {
    type: String,
    required: true,
    enum: ['user', 'agent', 'system'],
  },
  content: { type: String, required: true },
  audioUrl: { type: String, default: null },
  transcriptId: { type: String, default: null },
  intent: { type: String, default: null },
  confidence: { type: Number, default: null, min: 0, max: 1 },
  entities: [{
    entity: { type: String, required: true },
    type: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    startIndex: { type: Number, required: true },
    endIndex: { type: Number, required: true },
  }],
  sentiment: SentimentScoreSchema,
  timestamp: { type: Date, required: true, default: Date.now },
}, { _id: false });

const SessionContextSchema = new Schema({
  customerName: { type: String, default: null },
  customerEmail: { type: String, default: null },
  previousInteractions: { type: Number, default: 0 },
  preferences: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
  customData: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {},
  },
}, { _id: false });

const SessionSchema = new Schema<SessionDocument>(
  {
    agentId: {
      type: String,
      required: [true, 'Agent ID is required'],
      index: true,
    },
    organizationId: {
      type: String,
      required: [true, 'Organization ID is required'],
      index: true,
    },
    callId: {
      type: String,
      default: null,
      index: true,
    },
    customerId: {
      type: String,
      default: null,
      index: true,
    },
    customerPhone: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'expired', 'error'] as SessionStatus[],
      default: 'active',
      index: true,
    },
    language: {
      type: String,
      required: true,
      enum: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN'] as SupportedLanguage[],
      default: 'en-IN',
    },
    context: {
      type: SessionContextSchema,
      default: () => ({}),
    },
    messageHistory: {
      type: [MessageSchema],
      default: [],
    },
    currentIntent: {
      type: String,
      default: null,
    },
    currentParameters: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    sentimentHistory: {
      type: [SentimentScoreSchema],
      default: [],
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    lastActivityTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
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
SessionSchema.index({ organizationId: 1, status: 1 });
SessionSchema.index({ organizationId: 1, createdAt: -1 });
SessionSchema.index({ customerId: 1, createdAt: -1 });
SessionSchema.index({ agentId: 1, status: 1 });
SessionSchema.index({ lastActivityTime: -1 }); // For TTL/expiration checks

// Virtual for calculating session duration
SessionSchema.virtual('duration').get(function () {
  if (this.startTime) {
    const endTime = this.endTime || new Date();
    return Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000);
  }
  return 0;
});

// Virtual for getting recent messages (for context window)
SessionSchema.virtual('recentMessages').get(function (this: SessionDocument) {
  const contextWindow = 10;
  return this.messageHistory.slice(-contextWindow);
});

// Pre-save middleware to update lastActivityTime
SessionSchema.pre('save', function (next) {
  this.lastActivityTime = new Date();
  next();
});

// Static methods
SessionSchema.statics.findByOrganization = function (organizationId: string, options?: {
  status?: SessionStatus;
  limit?: number;
  skip?: number;
}) {
  const query: Record<string, unknown> = { organizationId };

  if (options?.status) {
    query.status = options.status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(options?.skip || 0)
    .limit(options?.limit || 50);
};

SessionSchema.statics.findActiveByOrganization = function (organizationId: string) {
  return this.find({ organizationId, status: 'active' }).sort({ createdAt: -1 });
};

SessionSchema.statics.findByCustomer = function (customerId: string, options?: {
  limit?: number;
  skip?: number;
}) {
  return this.find({ customerId })
    .sort({ createdAt: -1 })
    .skip(options?.skip || 0)
    .limit(options?.limit || 50);
};

SessionSchema.statics.expireInactiveSessions = async function (maxIdleTimeMs: number = 300000) {
  const cutoffTime = new Date(Date.now() - maxIdleTimeMs);

  const result = await this.updateMany(
    {
      status: 'active',
      lastActivityTime: { $lt: cutoffTime },
    },
    {
      $set: {
        status: 'expired',
        endTime: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

// Instance methods
SessionSchema.methods.addMessage = function (message: Message) {
  this.messageHistory.push(message);
  this.lastActivityTime = new Date();

  if (message.sentiment) {
    this.sentimentHistory.push(message.sentiment);
  }

  return this.save();
};

SessionSchema.methods.setCurrentIntent = function (intent: string, parameters: Record<string, unknown> = {}) {
  this.currentIntent = intent;
  this.currentParameters = new Map(Object.entries(parameters));
  this.lastActivityTime = new Date();
  return this.save();
};

SessionSchema.methods.complete = function () {
  this.status = 'completed';
  this.endTime = new Date();
  this.lastActivityTime = new Date();
  return this.save();
};

SessionSchema.methods.getAverageSentiment = function () {
  if (this.sentimentHistory.length === 0) {
    return null;
  }

  const sum = this.sentimentHistory.reduce((acc, s) => acc + s.score, 0);
  return sum / this.sentimentHistory.length;
};

export const SessionModel = mongoose.model<SessionDocument>('Session', SessionSchema);
