import mongoose, { Document, Schema } from 'mongoose';
import {
  Memory,
  MemoryType,
  MemoryTier,
  TimelineEvent,
  Context,
  Profile,
  ConversationMessage
} from '../types/index.js';

// ============================================================================
// MEMORY MODEL
// ============================================================================

const MemorySchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  entityType: { type: String, enum: ['user', 'merchant', 'product', 'session'], required: true },
  entityId: { type: String, required: true, index: true },
  type: { type: String, enum: Object.values(MemoryType), required: true },
  tier: { type: String, enum: Object.values(MemoryTier), default: 'l4_semantic' },
  content: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  importance: { type: Number, default: 5 },
  confidence: { type: Number, default: 0.7 },
  source: String,
  eventId: String,
  context: {
    channel: String,
    location: String,
    time: String,
    tags: [String]
  },
  validFrom: Date,
  validUntil: Date,
  isPrivate: Boolean,
  sharedWith: [String],
  lastAccessedAt: Date,
  accessCount: { type: Number, default: 0 }
}, { timestamps: true });

MemorySchema.index({ tenantId: 1, userId: 1, tier: 1 });
MemorySchema.index({ tenantId: 1, userId: 1, type: 1 });

export interface MemoryDocument extends Omit<Memory, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

export const MemoryModel = mongoose.model<MemoryDocument>('Memory', MemorySchema);

// ============================================================================
// TIMELINE EVENT MODEL
// ============================================================================

const TimelineEventSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  category: { type: String, required: true },
  timestamp: { type: Date, required: true },
  title: { type: String, required: true },
  description: String,
  data: mongoose.Schema.Types.Mixed,
  entityType: String,
  entityId: String,
  impact: { type: String, enum: ['positive', 'negative', 'neutral'] },
  value: Number,
  memoryIds: [String]
}, { timestamps: true });

TimelineEventSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });

export interface TimelineEventDocument extends Omit<TimelineEvent, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

export const TimelineEventModel = mongoose.model<TimelineEventDocument>('TimelineEvent', TimelineEventSchema);

// ============================================================================
// CONTEXT MODEL
// ============================================================================

const ContextSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, index: true },
  type: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  expiresAt: Date
}, { timestamps: true });

ContextSchema.index({ tenantId: 1, userId: 1, sessionId: 1 });

export interface ContextDocument extends Omit<Context, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

export const ContextModel = mongoose.model<ContextDocument>('Context', ContextSchema);

// ============================================================================
// PROFILE MODEL
// ============================================================================

const ProfileSchema = new Schema({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, sparse: true, index: true },
  email: { type: String, sparse: true, index: true },
  phone: { type: String, sparse: true, index: true },
  name: String,
  computed: {
    lifetimeValue: { type: Number, default: 0 },
    visitFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'rarely'], default: 'monthly' },
    loyaltyTier: String,
    preferredChannel: String,
    lastActiveAt: Date,
    firstSeenAt: Date
  }
}, { timestamps: true });

ProfileSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
ProfileSchema.index({ tenantId: 1, email: 1 });
ProfileSchema.index({ tenantId: 1, phone: 1 });

export interface ProfileDocument extends Omit<Profile, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

export const ProfileModel = mongoose.model<ProfileDocument>('Profile', ProfileSchema);

// ============================================================================
// CONVERSATION MODEL
// ============================================================================

const ConversationSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  messages: [{
    id: String,
    role: String,
    content: String,
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: Date
  }],
  lastMessageAt: Date
}, { timestamps: true });

ConversationSchema.index({ tenantId: 1, userId: 1, status: 1 });

export interface ConversationDocument extends Document {
  tenantId: string;
  userId: string;
  type: string;
  status: string;
  messages: ConversationMessage[];
  lastMessageAt: Date;
}

export const ConversationModel = mongoose.model<ConversationDocument>('Conversation', ConversationSchema);
