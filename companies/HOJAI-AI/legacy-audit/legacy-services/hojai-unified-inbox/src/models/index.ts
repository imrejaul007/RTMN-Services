import mongoose, { Schema, Document } from 'mongoose';
import {
  ChannelEnum,
  ConversationStatusEnum,
  PriorityEnum,
  AgentStatusEnum,
  MessageTypeEnum,
  MessageDirectionEnum
} from '../types';

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: string;
  channel: typeof ChannelEnum.enum[number];
  status: typeof ConversationStatusEnum.enum[number];
  priority: typeof PriorityEnum.enum[number];
  tenantId: string;

  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    avatar?: string;
    metadata?: Record<string, any>;
  };

  assignedAgentId?: string;
  assignedTeam?: string;

  subject?: string;
  lastMessage?: string;
  lastMessageAt?: Date;

  tags: string[];
  labels: string[];

  messageCount: number;
  aiHandled: boolean;
  resolutionTime?: number;

  context?: {
    source?: string;
    campaign?: string;
    botId?: string;
    flowId?: string;
    pageUrl?: string;
    userAgent?: string;
  };

  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    conversationId: { type: String, required: true, unique: true, index: true },
    channel: { type: String, required: true, enum: ChannelEnum.enum },
    status: {
      type: String,
      enum: ConversationStatusEnum.enum,
      default: 'new',
      index: true
    },
    priority: {
      type: String,
      enum: PriorityEnum.enum,
      default: 'normal'
    },
    tenantId: { type: String, required: true, index: true },

    customer: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      phone: String,
      email: String,
      avatar: String,
      metadata: { type: Map, of: Schema.Types.Mixed }
    },

    assignedAgentId: { type: String, index: true },
    assignedTeam: String,

    subject: String,
    lastMessage: String,
    lastMessageAt: Date,

    tags: [String],
    labels: [String],

    messageCount: { type: Number, default: 0 },
    aiHandled: { type: Boolean, default: false },
    resolutionTime: Number,

    context: {
      source: String,
      campaign: String,
      botId: String,
      flowId: String,
      pageUrl: String,
      userAgent: String
    }
  },
  {
    timestamps: true,
    collection: 'inbox_conversations'
  }
);

ConversationSchema.index({ tenantId: 1, status: 1 });
ConversationSchema.index({ assignedAgentId: 1, status: 1 });
ConversationSchema.index({ priority: 1, createdAt: -1 });
ConversationSchema.index({ channel: 1, createdAt: -1 });
ConversationSchema.index({ 'customer.id': 1 });

// Methods
ConversationSchema.methods.assignToAgent = function (agentId: string) {
  this.assignedAgentId = agentId;
  this.status = 'assigned';
  this.assignedAt = new Date();
  return this.save();
};

ConversationSchema.methods.resolve = function () {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolutionTime = this.resolvedAt.getTime() - this.createdAt.getTime();
  return this.save();
};

ConversationSchema.methods.close = function () {
  this.status = 'closed';
  this.closedAt = new Date();
  return this.save();
};

ConversationSchema.methods.transfer = function (agentId: string, team?: string) {
  this.assignedAgentId = agentId;
  if (team) this.assignedTeam = team;
  this.status = 'transferred';
  this.assignedAt = new Date();
  return this.save();
};

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  messageId: string;
  conversationId: mongoose.Types.ObjectId;
  channel: typeof ChannelEnum.enum[number];
  type: typeof MessageTypeEnum.enum[number];
  direction: typeof MessageDirectionEnum.enum[number];

  content: {
    text?: string;
    mediaUrl?: string;
    mediaType?: string;
    caption?: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    templateId?: string;
    templateData?: Record<string, any>;
  };

  sender: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    avatar?: string;
  };

  metadata?: {
    messageId?: string;
    deliveryStatus?: 'sent' | 'delivered' | 'read' | 'failed';
    error?: string;
    agentId?: string;
    aiGenerated?: boolean;
  };

  timestamp: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    messageId: { type: String, required: true, unique: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    channel: { type: String, required: true, enum: ChannelEnum.enum },
    type: { type: String, required: true, enum: MessageTypeEnum.enum },
    direction: { type: String, required: true, enum: MessageDirectionEnum.enum },

    content: {
      text: String,
      mediaUrl: String,
      mediaType: String,
      caption: String,
      location: {
        latitude: Number,
        longitude: Number,
        address: String
      },
      templateId: String,
      templateData: { type: Map, of: Schema.Types.Mixed }
    },

    sender: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      phone: String,
      email: String,
      avatar: String
    },

    metadata: {
      messageId: String,
      deliveryStatus: String,
      error: String,
      agentId: String,
      aiGenerated: Boolean
    },

    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    timestamps: false,
    collection: 'inbox_messages'
  }
);

MessageSchema.index({ conversationId: 1, timestamp: -1 });
MessageSchema.index({ direction: 1, timestamp: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

export interface IAgent extends Document {
  _id: mongoose.Types.ObjectId;
  agentId: string;
  tenantId: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'agent' | 'supervisor' | 'admin';
  status: typeof AgentStatusEnum.enum[number];
  teams: string[];
  skills: string[];
  languages: string[];
  maxConcurrentChats: number;
  workingHours?: {
    start: string;
    end: string;
    timezone: string;
    days?: number[];
  };
  settings?: {
    autoAccept: boolean;
    soundNotifications: boolean;
    desktopNotifications: boolean;
    greeting?: string;
  };
  stats: {
    totalConversations: number;
    resolvedConversations: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    csat?: number;
    lastActiveAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    agentId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String,
    role: { type: String, enum: ['agent', 'supervisor', 'admin'], default: 'agent' },
    status: { type: String, enum: AgentStatusEnum.enum, default: 'offline' },
    teams: [String],
    skills: [String],
    languages: [String],
    maxConcurrentChats: { type: Number, default: 5 },
    workingHours: {
      start: String,
      end: String,
      timezone: String,
      days: [Number]
    },
    settings: {
      autoAccept: Boolean,
      soundNotifications: Boolean,
      desktopNotifications: Boolean,
      greeting: String
    },
    stats: {
      totalConversations: { type: Number, default: 0 },
      resolvedConversations: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 },
      avgResolutionTime: { type: Number, default: 0 },
      csat: Number,
      lastActiveAt: Date
    }
  },
  {
    timestamps: true,
    collection: 'inbox_agents'
  }
);

AgentSchema.index({ tenantId: 1, status: 1 });
AgentSchema.index({ tenantId: 1, teams: 1 });
AgentSchema.index({ status: 1, skills: 1 });

AgentSchema.methods.setStatus = function (status: string) {
  this.status = status;
  this.stats.lastActiveAt = new Date();
  return this.save();
};

AgentSchema.methods.incrementStats = function (type: 'total' | 'resolved', responseTime?: number, resolutionTime?: number) {
  if (type === 'total') this.stats.totalConversations++;
  if (type === 'resolved') this.stats.resolvedConversations++;
  if (responseTime) this.stats.avgResponseTime = (this.stats.avgResponseTime + responseTime) / 2;
  if (resolutionTime) this.stats.avgResolutionTime = (this.stats.avgResolutionTime + resolutionTime) / 2;
  this.stats.lastActiveAt = new Date();
  return this.save();
};

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

export interface ITeam extends Document {
  _id: mongoose.Types.ObjectId;
  teamId: string;
  tenantId: string;
  name: string;
  description?: string;
  channels: typeof ChannelEnum.enum[number][];
  skills: string[];
  autoAssign: boolean;
  maxQueueSize: number;
  routingRule: 'round_robin' | 'least_busy' | 'skills_based' | 'weighted';
  supervisorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    teamId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    channels: [{ type: String, enum: ChannelEnum.enum }],
    skills: [String],
    autoAssign: { type: Boolean, default: true },
    maxQueueSize: { type: Number, default: 50 },
    routingRule: {
      type: String,
      enum: ['round_robin', 'least_busy', 'skills_based', 'weighted'],
      default: 'round_robin'
    },
    supervisorId: String
  },
  {
    timestamps: true,
    collection: 'inbox_teams'
  }
);

export const Team = mongoose.model<ITeam>('Team', TeamSchema);

export interface ICannedResponse extends Document {
  _id: mongoose.Types.ObjectId;
  responseId: string;
  tenantId: string;
  agentId?: string;
  teamId?: string;
  shortcut: string;
  content: string;
  description?: string;
  channel?: typeof ChannelEnum.enum[number];
  category?: string;
  tags: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CannedResponseSchema = new Schema<ICannedResponse>(
  {
    responseId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    agentId: String,
    teamId: String,
    shortcut: { type: String, required: true },
    content: { type: String, required: true },
    description: String,
    channel: String,
    category: String,
    tags: [String],
    usageCount: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    collection: 'inbox_canned_responses'
  }
);

CannedResponseSchema.index({ tenantId: 1, shortcut: 1 });
CannedResponseSchema.index({ tenantId: 1, category: 1 });

export const CannedResponse = mongoose.model<ICannedResponse>('CannedResponse', CannedResponseSchema);
