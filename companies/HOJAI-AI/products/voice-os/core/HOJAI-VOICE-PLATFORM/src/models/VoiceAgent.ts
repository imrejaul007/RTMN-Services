// ============================================================================
// HOJAI VOICE PLATFORM - Voice Agent Model
// ============================================================================

import mongoose, { Schema, Document } from 'mongoose';
import {
  VoiceAgent as IVoiceAgent,
  IntentDefinition,
  EntityDefinition,
  VoiceConfig,
  AgentType,
  AgentStatus,
} from '../types';

export interface VoiceAgentDocument extends Omit<IVoiceAgent, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const ParameterValidationSchema = new Schema({
  min: { type: Number },
  max: { type: Number },
  pattern: { type: String },
  allowedValues: [{ type: String }],
}, { _id: false });

const ParameterDefinitionSchema = new Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['string', 'number', 'date', 'time', 'boolean', 'enum'],
    required: true,
  },
  description: { type: String, required: true },
  defaultValue: { type: Schema.Types.Mixed },
  validation: ParameterValidationSchema,
}, { _id: false });

const IntentDefinitionSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  examples: [{ type: String, required: true }],
  action: { type: String, required: true },
  parameters: {
    type: Map,
    of: ParameterDefinitionSchema,
    default: {},
  },
  requiredParameters: [{ type: String }],
  followUp: { type: String },
  escalationThreshold: { type: Number },
}, { _id: false });

const EntityDefinitionSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['regex', 'list', 'builtin'],
    required: true,
  },
  values: [{ type: String }],
  patterns: [{ type: String }],
  builtinType: {
    type: String,
    enum: ['date', 'time', 'number', 'phone', 'email'],
  },
}, { _id: false });

const VoiceConfigSchema = new Schema({
  language: {
    type: String,
    required: true,
    enum: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN'],
    default: 'en-IN',
  },
  voiceId: {
    type: String,
    default: '预设-indian-female-1',
  },
  ttsEngine: {
    type: String,
    enum: ['elevenlabs', 'cartesia', 'sarvam'],
    default: 'elevenlabs',
  },
  sttEngine: {
    type: String,
    enum: ['whisper', 'sarvam', 'google'],
    default: 'whisper',
  },
  speed: { type: Number, min: 0.5, max: 2.0, default: 1.0 },
  pitch: { type: Number, min: 0.5, max: 2.0, default: 1.0 },
  volume: { type: Number, min: 0, max: 1, default: 1.0 },
}, { _id: false });

const VoiceAgentSchema = new Schema<VoiceAgentDocument>(
  {
    name: {
      type: String,
      required: [true, 'Agent name is required'],
      trim: true,
      maxlength: [100, 'Agent name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    type: {
      type: String,
      required: [true, 'Agent type is required'],
      enum: ['customer-service', 'voice-commerce', 'voice-search', 'appointment'] as AgentType[],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'training', 'error'] as AgentStatus[],
      default: 'active',
    },
    language: {
      type: String,
      required: true,
      enum: ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN', 'pa-IN'],
      default: 'en-IN',
    },
    voiceConfig: {
      type: VoiceConfigSchema,
      required: true,
      default: () => ({
        language: 'en-IN',
        voiceId: '预设-indian-female-1',
        ttsEngine: 'elevenlabs',
        sttEngine: 'whisper',
        speed: 1.0,
        pitch: 1.0,
        volume: 1.0,
      }),
    },
    greeting: {
      type: String,
      default: 'Namaste! How can I help you today?',
      maxlength: [500, 'Greeting cannot exceed 500 characters'],
    },
    farewell: {
      type: String,
      default: 'Thank you for calling. Have a great day!',
      maxlength: [500, 'Farewell cannot exceed 500 characters'],
    },
    intents: {
      type: [IntentDefinitionSchema],
      default: [],
    },
    entities: {
      type: [EntityDefinitionSchema],
      default: [],
    },
    contextWindow: {
      type: Number,
      default: 10,
      min: [1, 'Context window must be at least 1'],
      max: [50, 'Context window cannot exceed 50'],
    },
    escalationNumber: {
      type: String,
      default: null,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
VoiceAgentSchema.index({ organizationId: 1, status: 1 });
VoiceAgentSchema.index({ organizationId: 1, type: 1 });
VoiceAgentSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware to add IDs to intents and entities if missing
VoiceAgentSchema.pre('save', function (next) {
  if (this.isModified('intents')) {
    this.intents = this.intents.map((intent, idx) => ({
      ...intent.toObject ? intent.toObject() : intent,
      id: intent.id || `intent_${Date.now()}_${idx}`,
    }));
  }
  if (this.isModified('entities')) {
    this.entities = this.entities.map((entity, idx) => ({
      ...entity.toObject ? entity.toObject() : entity,
      id: entity.id || `entity_${Date.now()}_${idx}`,
    }));
  }
  next();
});

// Static methods
VoiceAgentSchema.statics.findByOrganization = function (organizationId: string) {
  return this.find({ organizationId }).sort({ createdAt: -1 });
};

VoiceAgentSchema.statics.findActiveByOrganization = function (organizationId: string) {
  return this.find({ organizationId, status: 'active' }).sort({ createdAt: -1 });
};

// Instance methods
VoiceAgentSchema.methods.toPublicJSON = function () {
  const obj = this.toJSON();
  return obj;
};

export const VoiceAgentModel = mongoose.model<VoiceAgentDocument>('VoiceAgent', VoiceAgentSchema);
