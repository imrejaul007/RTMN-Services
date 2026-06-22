// ============================================================================
// HOJAI VOICE PLATFORM - Transcript Model
// ============================================================================

import mongoose, { Schema, Document } from 'mongoose';
import {
  Transcript as ITranscript,
  TranscriptMessage,
  SupportedLanguage,
  STTEngine,
} from '../types';

export interface TranscriptDocument extends Omit<ITranscript, 'createdAt'>, Document {
  createdAt: Date;
}

const WordTimingSchema = new Schema({
  word: { type: String, required: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
}, { _id: false });

const TranscriptMessageSchema = new Schema({
  id: { type: String, required: true },
  speaker: {
    type: String,
    required: true,
    enum: ['customer', 'agent', 'unknown'],
  },
  text: { type: String, required: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  words: [WordTimingSchema],
}, { _id: false });

const TranscriptSchema = new Schema<TranscriptDocument>(
  {
    callId: {
      type: String,
      required: [true, 'Call ID is required'],
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
      index: true,
    },
    organizationId: {
      type: String,
      required: [true, 'Organization ID is required'],
      index: true,
    },
    messages: {
      type: [TranscriptMessageSchema],
      default: [],
    },
    language: {
      type: String,
      required: true,
      enum: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN'] as SupportedLanguage[],
      default: 'en-IN',
    },
    engine: {
      type: String,
      required: true,
      enum: ['whisper', 'sarvam', 'google'] as STTEngine[],
      default: 'whisper',
    },
    totalDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
TranscriptSchema.index({ organizationId: 1, createdAt: -1 });
TranscriptSchema.index({ callId: 1, createdAt: -1 });

// Pre-save middleware to calculate totalDuration and wordCount
TranscriptSchema.pre('save', function (next) {
  if (this.messages.length > 0) {
    // Calculate total duration from the last message
    const lastMessage = this.messages[this.messages.length - 1];
    this.totalDuration = lastMessage.endTime;

    // Calculate word count
    this.wordCount = this.messages.reduce((count, msg) => {
      return count + (msg.text.split(/\s+/).filter(Boolean).length);
    }, 0);
  }
  next();
});

// Static methods
TranscriptSchema.statics.findByCall = function (callId: string) {
  return this.findOne({ callId }).sort({ createdAt: -1 });
};

TranscriptSchema.statics.findBySession = function (sessionId: string) {
  return this.findOne({ sessionId }).sort({ createdAt: -1 });
};

TranscriptSchema.statics.findByOrganization = function (organizationId: string, options?: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}) {
  const query: Record<string, unknown> = { organizationId };

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

// Instance methods
TranscriptSchema.methods.addMessage = function (message: Omit<TranscriptMessage, 'id'>) {
  const id = `msg_${Date.now()}_${this.messages.length}`;
  this.messages.push({ ...message, id });
  return this.save();
};

TranscriptSchema.methods.getFullText = function (separator: string = '\n'): string {
  return this.messages
    .map(msg => `${msg.speaker}: ${msg.text}`)
    .join(separator);
};

TranscriptSchema.methods.getSpeakerSummary = function () {
  const summary: Record<string, { messageCount: number; wordCount: number; duration: number }> = {};

  for (const msg of this.messages) {
    if (!summary[msg.speaker]) {
      summary[msg.speaker] = {
        messageCount: 0,
        wordCount: 0,
        duration: 0,
      };
    }
    summary[msg.speaker].messageCount++;
    summary[msg.speaker].wordCount += msg.text.split(/\s+/).filter(Boolean).length;
    summary[msg.speaker].duration += msg.endTime - msg.startTime;
  }

  return summary;
};

export const TranscriptModel = mongoose.model<TranscriptDocument>('Transcript', TranscriptSchema);
