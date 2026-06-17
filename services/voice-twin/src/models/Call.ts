import mongoose, { Document, Schema } from 'mongoose';

// Call status enum
export enum CallStatus {
  RINGING = 'ringing',
  ANSWERED = 'answered',
  COMPLETED = 'completed',
  MISSED = 'missed',
  FAILED = 'failed'
}

// Call direction enum
export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

// Sentiment enum
export enum Sentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative'
}

// Connected to twin reference
export interface IConnectedTo {
  twinId: string;
  serviceType: string;
}

// Call interface
export interface ICall extends Document {
  callId: string;
  tenantId: string;
  customerId: string;
  direction: CallDirection;
  duration: number;
  status: CallStatus;
  twilioSid?: string;
  from: string;
  to: string;
  recordingUrl?: string;
  transcript?: string;
  sentiment?: Sentiment;
  intent?: string;
  summary?: string;
  connectedTo?: IConnectedTo;
  metadata?: Record<string, any>;
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Call schema
const CallSchema = new Schema<ICall>(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    customerId: {
      type: String,
      required: true,
      index: true
    },
    direction: {
      type: String,
      enum: Object.values(CallDirection),
      required: true
    },
    duration: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(CallStatus),
      default: CallStatus.RINGING,
      index: true
    },
    twilioSid: {
      type: String,
      sparse: true,
      index: true
    },
    from: {
      type: String,
      required: true
    },
    to: {
      type: String,
      required: true
    },
    recordingUrl: {
      type: String
    },
    transcript: {
      type: String
    },
    sentiment: {
      type: String,
      enum: Object.values(Sentiment)
    },
    intent: {
      type: String
    },
    summary: {
      type: String
    },
    connectedTo: {
      twinId: { type: String, index: true },
      serviceType: { type: String }
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    startedAt: {
      type: Date
    },
    answeredAt: {
      type: Date
    },
    endedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for common queries
CallSchema.index({ tenantId: 1, customerId: 1 });
CallSchema.index({ tenantId: 1, status: 1 });
CallSchema.index({ tenantId: 1, createdAt: -1 });
CallSchema.index({ customerId: 1, createdAt: -1 });
CallSchema.index({ twilioSid: 1 }, { sparse: true });

// Instance methods
CallSchema.methods.markAnswered = function() {
  this.status = CallStatus.ANSWERED;
  this.answeredAt = new Date();
  return this.save();
};

CallSchema.methods.markCompleted = function(duration: number) {
  this.status = CallStatus.COMPLETED;
  this.duration = duration;
  this.endedAt = new Date();
  return this.save();
};

CallSchema.methods.markMissed = function() {
  this.status = CallStatus.MISSED;
  this.endedAt = new Date();
  return this.save();
};

CallSchema.methods.markFailed = function() {
  this.status = CallStatus.FAILED;
  this.endedAt = new Date();
  return this.save();
};

CallSchema.methods.updateTranscript = function(transcript: string) {
  this.transcript = transcript;
  return this.save();
};

CallSchema.methods.updateSentiment = function(sentiment: Sentiment, intent?: string) {
  this.sentiment = sentiment;
  if (intent) {
    this.intent = intent;
  }
  return this.save();
};

CallSchema.methods.updateSummary = function(summary: string) {
  this.summary = summary;
  return this.save();
};

CallSchema.methods.setRecordingUrl = function(recordingUrl: string) {
  this.recordingUrl = recordingUrl;
  return this.save();
};

// Static methods
CallSchema.statics.findByTenant = function(tenantId: string, options?: any) {
  return this.find({ tenantId }, null, options);
};

CallSchema.statics.findByCustomer = function(customerId: string, options?: any) {
  return this.find({ customerId }, null, options)
    .sort({ createdAt: -1 });
};

CallSchema.statics.findByTwilioSid = function(twilioSid: string) {
  return this.findOne({ twilioSid });
};

CallSchema.statics.getRecentCalls = function(tenantId: string, limit: number = 10) {
  return this.find({ tenantId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

CallSchema.statics.getCallStats = async function(tenantId: string, startDate?: Date, endDate?: Date) {
  const match: any = { tenantId };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);
};

export const Call = mongoose.model<ICall>('Call', CallSchema);
export default Call;
