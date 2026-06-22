/**
 * GENIE Memory Review Service - Models
 */
import mongoose, { Schema, Document } from 'mongoose';

export interface IMemoryReview extends Document {
  user_id: string; review_type: 'daily' | 'weekly' | 'monthly' | 'milestone';
  date: Date; summary: string; key_memories: string[]; learned_preferences: string[];
  insights: string[]; mood_trend?: 'improving' | 'stable' | 'declining';
  engagement_score: number; memory_count_start: number; memory_count_end: number;
  duration_minutes: number; status: 'pending' | 'in_progress' | 'completed';
  tenant_id: string; completed_at?: Date;
}
const MemoryReviewSchema = new Schema<IMemoryReview>({
  user_id: { type: String, required: true, index: true },
  review_type: { type: String, enum: ['daily', 'weekly', 'monthly', 'milestone'], required: true },
  date: { type: Date, required: true, index: true },
  summary: { type: String, required: true },
  key_memories: [String],
  learned_preferences: [String],
  insights: [String],
  mood_trend: { type: String, enum: ['improving', 'stable', 'declining'] },
  engagement_score: { type: Number, min: 0, max: 100, default: 50 },
  memory_count_start: Number,
  memory_count_end: Number,
  duration_minutes: Number,
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  tenant_id: { type: String, required: true, index: true },
  completed_at: Date,
}, { timestamps: true });
MemoryReviewSchema.index({ tenant_id: 1, user_id: 1, date: -1 });
MemoryReviewSchema.index({ tenant_id: 1, user_id: 1, review_type: 1 });
export const MemoryReview = mongoose.model<IMemoryReview>('MemoryReview', MemoryReviewSchema);

export interface IMemoryPattern extends Document {
  user_id: string; pattern_type: 'recurring' | 'trend' | 'anomaly' | 'preference';
  description: string; evidence: string[]; frequency?: number;
  first_seen: Date; last_seen: Date; confidence: number; tenant_id: string;
}
const MemoryPatternSchema = new Schema<IMemoryPattern>({
  user_id: { type: String, required: true, index: true },
  pattern_type: { type: String, enum: ['recurring', 'trend', 'anomaly', 'preference'], required: true },
  description: { type: String, required: true },
  evidence: [String],
  frequency: Number,
  first_seen: { type: Date, required: true },
  last_seen: { type: Date, required: true },
  confidence: { type: Number, min: 0, max: 1, default: 0.5 },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });
MemoryPatternSchema.index({ tenant_id: 1, user_id: 1, pattern_type: 1 });
MemoryPatternSchema.index({ tenant_id: 1, user_id: 1, last_seen: -1 });
export const MemoryPattern = mongoose.model<IMemoryPattern>('MemoryPattern', MemoryPatternSchema);

export interface IMemoryInsight extends Document {
  user_id: string; insight_type: 'growth' | 'relationship' | 'preference' | 'behavior' | 'opportunity';
  title: string; description: string; evidence: string[]; action_suggestion?: string;
  generated_at: Date; tenant_id: string;
}
const MemoryInsightSchema = new Schema<IMemoryInsight>({
  user_id: { type: String, required: true, index: true },
  insight_type: { type: String, enum: ['growth', 'relationship', 'preference', 'behavior', 'opportunity'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  evidence: [String],
  action_suggestion: String,
  generated_at: { type: Date, default: Date.now },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });
MemoryInsightSchema.index({ tenant_id: 1, user_id: 1, insight_type: 1 });
MemoryInsightSchema.index({ tenant_id: 1, user_id: 1, generated_at: -1 });
export const MemoryInsight = mongoose.model<IMemoryInsight>('MemoryInsight', MemoryInsightSchema);

export interface IScheduledReview extends Document {
  user_id: string; review_type: 'daily' | 'weekly' | 'monthly';
  scheduled_time: string; scheduled_days?: number[]; is_active: boolean;
  last_run?: Date; next_run: Date; tenant_id: string;
}
const ScheduledReviewSchema = new Schema<IScheduledReview>({
  user_id: { type: String, required: true, index: true },
  review_type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  scheduled_time: { type: String, required: true },
  scheduled_days: [Number],
  is_active: { type: Boolean, default: true },
  last_run: Date,
  next_run: { type: Date, required: true, index: true },
  tenant_id: { type: String, required: true, index: true },
}, { timestamps: true });
ScheduledReviewSchema.index({ tenant_id: 1, user_id: 1 }, { unique: true });
ScheduledReviewSchema.index({ tenant_id: 1, is_active: 1, next_run: 1 });
export const ScheduledReview = mongoose.model<IScheduledReview>('ScheduledReview', ScheduledReviewSchema);
