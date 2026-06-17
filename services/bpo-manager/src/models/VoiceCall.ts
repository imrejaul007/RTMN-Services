import mongoose, { Document, Schema } from 'mongoose';

// Call status enum
export enum CallStatus {
  INITIATED = 'INITIATED',
  RINGING = 'RINGING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  NO_ANSWER = 'NO_ANSWER',
  BUSY = 'BUSY',
  CANCELLED = 'CANCELLED',
}

// Call disposition enum
export enum CallDisposition {
  ANSWERED = 'ANSWERED',
  NO_ANSWER = 'NO_ANSWER',
  BUSY = 'BUSY',
  FAILED = 'FAILED',
  VOICEMAIL = 'VOICEMAIL',
  TRANSFERRED = 'TRANSFERRED',
}

// Voice call document interface
export interface IVoiceCall extends Document {
  tenantId: string;
  callId: string;
  workerId: mongoose.Types.ObjectId;
  workerName: string;
  jobId?: string;
  customerPhone: string;
  customerName?: string;
  twilioCallSid?: string;
  twilioRecordingSid?: string;
  status: CallStatus;
  disposition?: CallDisposition;
  duration: number; // in seconds
  recordingUrl?: string;
  transcript?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Voice call schema
const VoiceCallSchema = new Schema<IVoiceCall>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    callId: {
      type: String,
      required: true,
      unique: true,
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
      index: true,
    },
    workerName: {
      type: String,
      required: true,
    },
    jobId: {
      type: String,
      index: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
    },
    twilioCallSid: {
      type: String,
      index: true,
    },
    twilioRecordingSid: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(CallStatus),
      default: CallStatus.INITIATED,
    },
    disposition: {
      type: String,
      enum: Object.values(CallDisposition),
    },
    duration: {
      type: Number,
      default: 0,
    },
    recordingUrl: {
      type: String,
    },
    transcript: {
      type: String,
    },
    notes: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
VoiceCallSchema.index({ tenantId: 1, callId: 1 });
VoiceCallSchema.index({ tenantId: 1, workerId: 1 });
VoiceCallSchema.index({ tenantId: 1, status: 1 });
VoiceCallSchema.index({ tenantId: 1, createdAt: -1 });
VoiceCallSchema.index({ twilioCallSid: 1 }, { sparse: true });

// Pre-save hook to generate callId
VoiceCallSchema.pre('save', async function (next) {
  if (this.isNew && !this.callId) {
    const count = await mongoose.model('VoiceCall').countDocuments({ tenantId: this.tenantId });
    this.callId = `CALL-${this.tenantId.substring(0, 4).toUpperCase()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Instance methods
VoiceCallSchema.methods.updateStatus = async function (status: CallStatus, data?: Partial<IVoiceCall>) {
  this.status = status;
  if (data) {
    Object.assign(this, data);
  }
  return this.save();
};

VoiceCallSchema.methods.start = async function () {
  this.status = CallStatus.IN_PROGRESS;
  this.startedAt = new Date();
  return this.save();
};

VoiceCallSchema.methods.end = async function (disposition: CallDisposition, duration: number) {
  this.status = CallStatus.COMPLETED;
  this.disposition = disposition;
  this.duration = duration;
  this.endedAt = new Date();
  return this.save();
};

VoiceCallSchema.methods.setRecording = async function (recordingUrl: string, recordingSid?: string) {
  this.recordingUrl = recordingUrl;
  if (recordingSid) {
    this.twilioRecordingSid = recordingSid;
  }
  return this.save();
};

VoiceCallSchema.methods.setTranscript = async function (transcript: string) {
  this.transcript = transcript;
  return this.save();
};

// Static methods
VoiceCallSchema.statics.findWorkerCalls = function (tenantId: string, workerId: string, limit = 50) {
  return this.find({ tenantId, workerId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

VoiceCallSchema.statics.findByTwilioSid = function (twilioCallSid: string) {
  return this.findOne({ twilioCallSid });
};

VoiceCallSchema.statics.getCallStats = async function (tenantId: string, workerId?: string) {
  const match: Record<string, unknown> = { tenantId };
  if (workerId) {
    match.workerId = new mongoose.Types.ObjectId(workerId);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        answeredCalls: {
          $sum: { $cond: [{ $eq: ['$disposition', 'ANSWERED'] }, 1, 0] },
        },
        totalDuration: { $sum: '$duration' },
        averageDuration: { $avg: '$duration' },
      },
    },
  ]);

  return stats[0] || {
    totalCalls: 0,
    answeredCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
  };
};

export const VoiceCall = mongoose.model<IVoiceCall>('VoiceCall', VoiceCallSchema);