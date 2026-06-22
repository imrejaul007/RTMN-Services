/**
 * GENIE Memory Service - MongoDB Models
 * Version: 1.0.0 | Date: May 31, 2026
 * Purpose: Mongoose models for memory storage
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  MemoryCategory,
  ImportanceLevel,
  EmotionalTone,
  MemorySource
} from '../types.js';

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Memory Schema
 */
export interface IMemoryDocument extends Document {
  id: string;
  user_id: string;
  content: string;
  summary?: string;
  category: MemoryCategory;
  tags: string[];
  entities: string[];
  importance: ImportanceLevel;
  emotional_tone?: EmotionalTone;
  source: MemorySource;
  context?: string;
  related_memory_ids: string[];
  recall_count: number;
  last_recalled?: Date;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
}

const MemorySchema = new Schema<IMemoryDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 10000 },
    summary: { type: String, maxlength: 500 },
    category: {
      type: String,
      required: true,
      enum: [
        'conversation',
        'fact',
        'preference',
        'event',
        'decision',
        'idea',
        'learning',
        'personal',
        'work',
        'social'
      ],
      index: true
    },
    tags: { type: [String], default: [], index: true },
    entities: { type: [String], default: [] },
    importance: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true
    },
    emotional_tone: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'mixed']
    },
    source: {
      type: String,
      enum: ['user_input', 'conversation', 'extraction', 'import', 'ai_generated'],
      default: 'user_input'
    },
    context: { type: String, maxlength: 1000 },
    related_memory_ids: { type: [String], default: [] },
    recall_count: { type: Number, default: 0 },
    last_recalled: { type: Date },
    expires_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'memories',
  }
);

// Compound indexes for efficient queries
MemorySchema.index({ user_id: 1, created_at: -1 });
MemorySchema.index({ user_id: 1, category: 1, created_at: -1 });
MemorySchema.index({ user_id: 1, importance: 1 });
MemorySchema.index({ user_id: 1, tags: 1 });
MemorySchema.index({ user_id: 1, expires_at: 1 });

// Text index for full-text search
MemorySchema.index({ content: 'text', summary: 'text' }, { weights: { content: 10, summary: 5 } });

// ============================================================================
// Model Export
// ============================================================================

let MemoryModel: Model<IMemoryDocument>;

try {
  MemoryModel = mongoose.model<IMemoryDocument>('Memory');
} catch {
  MemoryModel = mongoose.model<IMemoryDocument>('Memory', MemorySchema);
}

export { MemoryModel };

export default MemoryModel;
