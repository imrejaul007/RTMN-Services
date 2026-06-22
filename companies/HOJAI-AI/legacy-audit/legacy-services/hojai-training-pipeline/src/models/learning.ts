/**
 * HOJAI Training Pipeline - Learning Models
 * MongoDB models for storing learned patterns
 */

import mongoose, { Schema, Document } from 'mongoose';
import {
  LearningSource,
  LearningType,
  LearningStage,
  LearningStatus
} from '../types/index.js';

// ============================================================================
// Learned Pattern Model
// ============================================================================

export interface ILearnedPattern extends Document {
  _id: mongoose.Types.ObjectId;
  patternId: string;
  tenantId?: string;
  userId?: string;
  source: LearningSource;
  type: LearningType;
  stage: LearningStage;
  status: LearningStatus;
  content: Record<string, unknown>;
  confidence: number;
  frequency: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  lastUpdated: Date;
  expiresAt?: Date;
}

const LearnedPatternSchema = new Schema<ILearnedPattern>(
  {
    patternId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tenantId: {
      type: String,
      index: true,
      sparse: true
    },
    userId: {
      type: String,
      index: true,
      sparse: true
    },
    source: {
      type: String,
      enum: Object.values(LearningSource),
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(LearningType),
      required: true,
      index: true
    },
    stage: {
      type: String,
      enum: Object.values(LearningStage),
      required: true,
      default: LearningStage.SHORT_TERM
    },
    status: {
      type: String,
      enum: Object.values(LearningStatus),
      required: true,
      default: LearningStatus.CAPTURED,
      index: true
    },
    content: {
      type: Schema.Types.Mixed,
      required: true
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.5
    },
    frequency: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 }
    }
  },
  {
    timestamps: true,
    collection: 'learned_patterns'
  }
);

// Compound indexes for common queries
LearnedPatternSchema.index({ tenantId: 1, type: 1, status: 1 });
LearnedPatternSchema.index({ userId: 1, type: 1, status: 1 });
LearnedPatternSchema.index({ source: 1, stage: 1, status: 1 });
LearnedPatternSchema.index({ confidence: 1, frequency: 1 });

// TTL index for short-term patterns
LearnedPatternSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export const LearnedPattern = mongoose.model<ILearnedPattern>(
  'LearnedPattern',
  LearnedPatternSchema
);

// ============================================================================
// Learning Event Model (Audit Log)
// ============================================================================

export interface ILearningEvent extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: string;
  tenantId?: string;
  userId?: string;
  source: LearningSource;
  sourceId: string;
  type: LearningType;
  rawContent: Record<string, unknown>;
  processed: boolean;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
}

const LearningEventSchema = new Schema<ILearningEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tenantId: {
      type: String,
      index: true,
      sparse: true
    },
    userId: {
      type: String,
      index: true,
      sparse: true
    },
    source: {
      type: String,
      enum: Object.values(LearningSource),
      required: true
    },
    sourceId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: Object.values(LearningType),
      required: true
    },
    rawContent: {
      type: Schema.Types.Mixed,
      required: true
    },
    processed: {
      type: Boolean,
      default: false,
      index: true
    },
    error: {
      type: String
    },
    processedAt: {
      type: Date
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'learning_events'
  }
);

LearningEventSchema.index({ tenantId: 1, processed: 1, createdAt: -1 });
LearningEventSchema.index({ createdAt: -1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // 7 days TTL

export const LearningEvent = mongoose.model<ILearningEvent>(
  'LearningEvent',
  LearningEventSchema
);

// ============================================================================
// Training Batch Model
// ============================================================================

export interface ITrainingBatch extends Document {
  _id: mongoose.Types.ObjectId;
  batchId: string;
  tenantId?: string;
  patterns: string[];
  statistics: {
    totalPatterns: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    highConfidenceCount: number;
    archivedCount: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

const TrainingBatchSchema = new Schema<ITrainingBatch>(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tenantId: {
      type: String,
      index: true,
      sparse: true
    },
    patterns: [
      {
        type: String,
        ref: 'LearnedPattern'
      }
    ],
    statistics: {
      totalPatterns: { type: Number, default: 0 },
      byType: { type: Schema.Types.Mixed, default: {} },
      bySource: { type: Schema.Types.Mixed, default: {} },
      highConfidenceCount: { type: Number, default: 0 },
      archivedCount: { type: Number, default: 0 }
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    error: {
      type: String
    },
    startedAt: {
      type: Date,
      required: true
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'training_batches'
  }
);

export const TrainingBatch = mongoose.model<ITrainingBatch>(
  'TrainingBatch',
  TrainingBatchSchema
);

// ============================================================================
// Model Export Helper
// ============================================================================

export async function connectDatabase(uri?: string): Promise<typeof mongoose> {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-training';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);
  }

  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}
