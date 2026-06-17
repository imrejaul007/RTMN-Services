import mongoose, { Document, Schema } from 'mongoose';

// Recording status enum
export enum RecordingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Recording interface
export interface IRecording extends Document {
  recordingId: string;
  callId: string;
  tenantId: string;
  twilioRecordingSid?: string;
  twilioRecordingUrl?: string;
  duration: number;
  status: RecordingStatus;
  transcription?: string;
  sentiment?: string;
  storageUrl?: string;
  fileSize?: number;
  mimeType?: string;
  metadata?: Record<string, any>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Recording schema
const RecordingSchema = new Schema<IRecording>(
  {
    recordingId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    callId: {
      type: String,
      required: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    twilioRecordingSid: {
      type: String,
      sparse: true,
      index: true
    },
    twilioRecordingUrl: {
      type: String
    },
    duration: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(RecordingStatus),
      default: RecordingStatus.PENDING,
      index: true
    },
    transcription: {
      type: String
    },
    sentiment: {
      type: String
    },
    storageUrl: {
      type: String
    },
    fileSize: {
      type: Number
    },
    mimeType: {
      type: String,
      default: 'audio/wav'
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    processedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
RecordingSchema.index({ callId: 1, tenantId: 1 });
RecordingSchema.index({ tenantId: 1, status: 1 });
RecordingSchema.index({ twilioRecordingSid: 1 }, { sparse: true });

// Instance methods
RecordingSchema.methods.markProcessing = function() {
  this.status = RecordingStatus.PROCESSING;
  return this.save();
};

RecordingSchema.methods.markCompleted = function() {
  this.status = RecordingStatus.COMPLETED;
  this.processedAt = new Date();
  return this.save();
};

RecordingSchema.methods.markFailed = function() {
  this.status = RecordingStatus.FAILED;
  this.processedAt = new Date();
  return this.save();
};

RecordingSchema.methods.setTranscription = function(transcription: string) {
  this.transcription = transcription;
  return this.save();
};

RecordingSchema.methods.setSentiment = function(sentiment: string) {
  this.sentiment = sentiment;
  return this.save();
};

RecordingSchema.methods.setStorageUrl = function(storageUrl: string) {
  this.storageUrl = storageUrl;
  return this.save();
};

// Static methods
RecordingSchema.statics.findByCall = function(callId: string) {
  return this.findOne({ callId });
};

RecordingSchema.statics.findByTwilioSid = function(twilioRecordingSid: string) {
  return this.findOne({ twilioRecordingSid });
};

RecordingSchema.statics.findByTenant = function(tenantId: string, options?: any) {
  return this.find({ tenantId }, null, options);
};

RecordingSchema.statics.getPendingRecordings = function(limit: number = 10) {
  return this.find({ status: RecordingStatus.PENDING })
    .sort({ createdAt: 1 })
    .limit(limit);
};

export const Recording = mongoose.model<IRecording>('Recording', RecordingSchema);
export default Recording;
