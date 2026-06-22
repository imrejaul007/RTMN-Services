// ============================================================================
// HOJAI VOICE PLATFORM - Call Model
// ============================================================================

import mongoose, { Schema, Document } from 'mongoose';
import {
  Call as ICall,
  CallStatus,
  CallDirection,
  CallOutcome,
  SentimentScore,
} from '../types';

export interface CallDocument extends Omit<ICall, 'createdAt' | 'updatedAt' | 'sentiment'>, Document {
  sentiment?: SentimentScore;
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

const CallSchema = new Schema<CallDocument>(
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
    direction: {
      type: String,
      required: true,
      enum: ['inbound', 'outbound'] as CallDirection[],
    },
    status: {
      type: String,
      required: true,
      enum: [
        'initiated',
        'ringing',
        'in-progress',
        'completed',
        'failed',
        'busy',
        'no-answer',
        'transferred',
        'voicemail',
      ] as CallStatus[],
      default: 'initiated',
    },
    from: {
      type: String,
      required: [true, 'Caller number is required'],
    },
    to: {
      type: String,
      required: [true, 'Receiver number is required'],
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: null,
      min: 0,
    },
    outcome: {
      type: String,
      enum: ['completed', 'transferred', 'voicemail', 'abandoned', 'failed'] as CallOutcome[],
      default: null,
    },
    transcriptId: {
      type: String,
      default: null,
      index: true,
    },
    sentiment: {
      type: SentimentScoreSchema,
      default: null,
    },
    recordingUrl: {
      type: String,
      default: null,
    },
    transferTo: {
      type: String,
      default: null,
    },
    telecomProvider: {
      type: String,
      enum: ['twilio', 'exotel', 'knowlarity', null],
      default: null,
    },
    telecomCallId: {
      type: String,
      default: null,
      index: true,
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
CallSchema.index({ organizationId: 1, status: 1 });
CallSchema.index({ organizationId: 1, createdAt: -1 });
CallSchema.index({ agentId: 1, createdAt: -1 });
CallSchema.index({ organizationId: 1, direction: 1 });
CallSchema.index({ startTime: -1 });

// Virtual for calculating duration if not set
CallSchema.virtual('calculatedDuration').get(function () {
  if (this.startTime && this.endTime) {
    return Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  }
  return this.duration;
});

// Pre-save middleware to calculate duration
CallSchema.pre('save', function (next) {
  if (this.startTime && this.endTime && !this.duration) {
    this.duration = Math.floor(
      (this.endTime.getTime() - this.startTime.getTime()) / 1000
    );
  }
  next();
});

// Static methods
CallSchema.statics.findByOrganization = function (organizationId: string, options?: {
  status?: CallStatus;
  direction?: CallDirection;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}) {
  const query: Record<string, unknown> = { organizationId };

  if (options?.status) {
    query.status = options.status;
  }
  if (options?.direction) {
    query.direction = options.direction;
  }
  if (options?.startDate || options?.endDate) {
    query.createdAt = {};
    if (options.startDate) {
      (query.createdAt as Record<string, Date>).$gte = options.startDate;
    }
    if (options.endDate) {
      (query.createdAt as Record<string, Date>).$lte = options.endDate;
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(options?.skip || 0)
    .limit(options?.limit || 50);
};

CallSchema.statics.findByAgent = function (agentId: string, options?: {
  limit?: number;
  skip?: number;
}) {
  return this.find({ agentId })
    .sort({ createdAt: -1 })
    .skip(options?.skip || 0)
    .limit(options?.limit || 50);
};

CallSchema.statics.getCallStats = async function (organizationId: string, startDate?: Date, endDate?: Date) {
  const match: Record<string, unknown> = { organizationId };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) {
      (match.createdAt as Record<string, Date>).$gte = startDate;
    }
    if (endDate) {
      (match.createdAt as Record<string, Date>).$lte = endDate;
    }
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        completedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        failedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
        averageDuration: { $avg: { $ifNull: ['$duration', 0] } },
        inboundCalls: {
          $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] },
        },
        outboundCalls: {
          $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] },
        },
        transferredCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] },
        },
      },
    },
  ]);

  return stats[0] || {
    totalCalls: 0,
    completedCalls: 0,
    failedCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
    inboundCalls: 0,
    outboundCalls: 0,
    transferredCalls: 0,
  };
};

export const CallModel = mongoose.model<CallDocument>('Call', CallSchema);
