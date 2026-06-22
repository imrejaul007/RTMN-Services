/**
 * GENIE Meeting Service - MongoDB Models
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: Mongoose models for meeting storage
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  MeetingStatus,
  ActionItemStatus,
  ActionItemPriority,
  ParticipantRole,
} from '../types.js';

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Action Item Schema (embedded)
 */
const ActionItemSchema = new Schema({
  id: { type: String, required: true },
  content: { type: String, required: true, maxlength: 500 },
  assignee: { type: String },
  assignee_email: { type: String },
  due_date: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  completed_at: { type: Date },
  created_at: { type: Date, default: Date.now },
}, { _id: false });

/**
 * Participant Schema (embedded)
 */
const ParticipantSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  role: {
    type: String,
    enum: ['organizer', 'attendee', 'observer'],
    default: 'attendee',
  },
  joined_at: { type: Date },
  left_at: { type: Date },
}, { _id: false });

/**
 * Meeting Document Interface
 */
export interface IMeetingDocument extends Document {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  meeting_url?: string;
  start_time: Date;
  end_time?: Date;
  duration_minutes?: number;
  status: MeetingStatus;
  participants: typeof ParticipantSchema[];
  transcript?: string;
  summary?: string;
  key_points: string[];
  action_items: typeof ActionItemSchema[];
  decisions: string[];
  follow_up_meeting_id?: string;
  source: 'calendar' | 'manual' | 'import';
  created_at: Date;
  updated_at: Date;
}

/**
 * Meeting Schema
 */
const MeetingSchema = new Schema<IMeetingDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 500 },
    description: { type: String, maxlength: 2000 },
    meeting_url: { type: String },
    start_time: { type: Date, required: true, index: true },
    end_time: { type: Date },
    duration_minutes: { type: Number },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    participants: { type: [ParticipantSchema], default: [] },
    transcript: { type: String },
    summary: { type: String, maxlength: 5000 },
    key_points: { type: [String], default: [] },
    action_items: { type: [ActionItemSchema], default: [] },
    decisions: { type: [String], default: [] },
    follow_up_meeting_id: { type: String },
    source: {
      type: String,
      enum: ['calendar', 'manual', 'import'],
      default: 'manual',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'meetings',
  }
);

// Compound indexes for efficient queries
MeetingSchema.index({ user_id: 1, start_time: -1 });
MeetingSchema.index({ user_id: 1, status: 1 });
MeetingSchema.index({ user_id: 1, 'action_items.status': 1 });
MeetingSchema.index({ user_id: 1, created_at: -1 });

// ============================================================================
// Model Export
// ============================================================================

let MeetingModel: Model<IMeetingDocument>;

try {
  MeetingModel = mongoose.model<IMeetingDocument>('Meeting');
} catch {
  MeetingModel = mongoose.model<IMeetingDocument>('Meeting', MeetingSchema);
}

export { MeetingModel };

export default MeetingModel;
