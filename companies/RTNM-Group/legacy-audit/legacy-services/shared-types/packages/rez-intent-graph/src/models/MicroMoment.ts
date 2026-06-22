/**
 * MicroMoment Model - MongoDB Schema
 * Spontaa-inspired: captures micro-moment session patterns
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IMicroMoment extends Document {
  userId: string;
  sessionId: string;
  momentType: 'need_now' | 'let_compare' | 'just_checking' | 'ready_to_buy' | 'browsing' | 'returning' | 'idle';
  intentKey: string;
  category: string;
  appType: string;
  triggeredAt: Date;
  signals: string[]; // what triggered this moment type
  durationMs?: number;
  outcome?: 'converted' | 'abandoned' | 'still_open' | 'pending';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

const MicroMomentSchema = new Schema<IMicroMoment>({
  userId: String,
  sessionId: String,
  momentType: {
    type: String,
    enum: ['need_now', 'let_compare', 'just_checking', 'ready_to_buy', 'browsing', 'returning', 'idle'],
    index: true,
  },
  intentKey: String,
  category: String,
  appType: String,
  triggeredAt: { type: Date, default: Date.now, index: true },
  signals: [String],
  durationMs: Number,
  outcome: { type: String, enum: ['converted', 'abandoned', 'still_open', 'pending'] },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  metadata: Schema.Types.Mixed,
});

// TTL: auto-expire micro moments after 24 hours
MicroMomentSchema.index({ triggeredAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const MicroMoment = mongoose.model<IMicroMoment>('MicroMoment', MicroMomentSchema);
