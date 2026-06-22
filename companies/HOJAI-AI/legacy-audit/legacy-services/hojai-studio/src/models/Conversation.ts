import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  sessionId: string;
  userId: string;
  tenantId: string;
  channel: 'whatsapp' | 'instagram' | 'facebook' | 'webchat' | 'voice' | 'telegram' | 'email';
  botId: mongoose.Types.ObjectId;
  flowId?: string;
  currentNodeId?: string;
  variables: Record<string, any>;
  tags: string[];
  status: 'active' | 'ended' | 'handoff';
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
  endedBy?: 'user' | 'bot' | 'agent' | 'system';
  endedReason?: string;
  assignedAgentId?: string;
  metadata: {
    userPhone?: string;
    userName?: string;
    userEmail?: string;
    platformMessageId?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: {
      country?: string;
      city?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationMetadataSchema = new Schema(
  {
    userPhone: String,
    userName: String,
    userEmail: String,
    platformMessageId: String,
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      city: String
    }
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    channel: {
      type: String,
      required: true,
      enum: ['whatsapp', 'instagram', 'facebook', 'webchat', 'voice', 'telegram', 'email'],
      lowercase: true
    },
    botId: {
      type: Schema.Types.ObjectId,
      ref: 'Bot',
      required: true,
      index: true
    },
    flowId: String,
    currentNodeId: String,
    variables: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => new Map()
    },
    tags: [String],
    status: {
      type: String,
      enum: ['active', 'ended', 'handoff'],
      default: 'active',
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    },
    endedAt: Date,
    endedBy: {
      type: String,
      enum: ['user', 'bot', 'agent', 'system']
    },
    endedReason: String,
    assignedAgentId: String,
    metadata: {
      type: ConversationMetadataSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    collection: 'studio_conversations'
  }
);

// Compound indexes for common queries
ConversationSchema.index({ tenantId: 1, status: 1 });
ConversationSchema.index({ botId: 1, status: 1 });
ConversationSchema.index({ userId: 1, startedAt: -1 });
ConversationSchema.index({ assignedAgentId: 1, status: 1 });
ConversationSchema.index({ lastActivityAt: -1 });

// TTL index - auto-delete ended conversations after 90 days
ConversationSchema.index({ endedAt: 1 }, { expireAfterSeconds: 7776000 });

// Methods
ConversationSchema.methods.updateVariables = function (updates: Record<string, any>) {
  Object.entries(updates).forEach(([key, value]) => {
    this.variables.set(key, value);
  });
  this.lastActivityAt = new Date();
  return this.save();
};

ConversationSchema.methods.setCurrentNode = function (nodeId: string) {
  this.currentNodeId = nodeId;
  this.lastActivityAt = new Date();
  return this.save();
};

ConversationSchema.methods.end = function (endedBy: 'user' | 'bot' | 'agent' | 'system', reason?: string) {
  this.status = 'ended';
  this.endedAt = new Date();
  this.endedBy = endedBy;
  this.endedReason = reason;
  return this.save();
};

ConversationSchema.methods.transferToAgent = function (agentId: string) {
  this.status = 'handoff';
  this.assignedAgentId = agentId;
  this.lastActivityAt = new Date();
  return this.save();
};

// Statics
ConversationSchema.statics.findActiveByUser = function (userId: string, tenantId: string) {
  return this.findOne({ userId, tenantId, status: 'active' })
    .sort({ lastActivityAt: -1 });
};

ConversationSchema.statics.findByAgent = function (agentId: string, status?: string) {
  const query: any = { assignedAgentId: agentId };
  if (status) query.status = status;
  return this.find(query).sort({ lastActivityAt: -1 });
};

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
