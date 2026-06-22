/**
 * GENIE Briefing Service - MongoDB Models
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Mongoose models for briefing storage
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { BriefingType, BriefingItem, BriefingSection } from '../types.js';

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Briefing Item Schema
 */
const BriefingItemSchema = new Schema<BriefingItem>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
    completed: { type: Boolean, default: false },
    action_url: { type: String },
  },
  { _id: false }
);

/**
 * Briefing Section Schema
 */
const BriefingSectionSchema = new Schema<BriefingSection>(
  {
    type: {
      type: String,
      required: true,
      enum: ['calendar', 'tasks', 'followups', 'weather', 'insights', 'reminders'],
    },
    title: { type: String, required: true },
    items: [BriefingItemSchema],
  },
  { _id: false }
);

/**
 * Briefing Schema
 */
export interface IBriefingDocument extends Document {
  id: string;
  user_id: string;
  type: BriefingType;
  date: string;
  sections: BriefingSection[];
  summary: string;
  created_at: Date;
  updated_at: Date;
}

const BriefingSchema = new Schema<IBriefingDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['morning', 'evening'],
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    sections: [BriefingSectionSchema],
    summary: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: 'briefings',
  }
);

// Compound indexes for efficient queries
BriefingSchema.index({ user_id: 1, date: 1 });
BriefingSchema.index({ user_id: 1, type: 1, date: 1 });
BriefingSchema.index({ user_id: 1, created_at: -1 });

// ============================================================================
// Model Export
// ============================================================================

let BriefingModel: Model<IBriefingDocument>;

try {
  BriefingModel = mongoose.model<IBriefingDocument>('Briefing');
} catch {
  BriefingModel = mongoose.model<IBriefingDocument>('Briefing', BriefingSchema);
}

export { BriefingModel };

export default BriefingModel;
