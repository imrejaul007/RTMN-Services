import mongoose, { Schema, Document } from 'mongoose';
import {
  BotStatusEnum,
  ChannelTypeEnum,
  VariableTypeEnum,
  NodeTypeEnum
} from '../types';

export interface IBot extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  tenantId: string;
  userId: string;
  status: typeof BotStatusEnum.enum[number];
  flows: IFlow[];
  defaultFlowId?: string;
  channels: typeof ChannelTypeEnum.enum[number][];
  variables: IVariable[];
  settings: IBotSettings;
  analytics: IBotAnalytics;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFlow extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  nodes: INode[];
  entryNodeId?: string;
  variables?: IVariable[];
}

export interface INode extends Document {
  _id: mongoose.Types.ObjectId;
  id: string;
  type: typeof NodeTypeEnum.enum[number];
  label: string;
  position: { x: number; y: number };
  config: INodeConfig;
  nextNodeId?: string;
  errorNodeId?: string;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    icon?: string;
  };
}

export interface INodeConfig {
  delay?: IDelayConfig;
  handoff?: IHandoffConfig;
  message?: IMessageContent;
  aiResponse?: IAIResponseConfig;
  branches?: IConditionBranch[];
  defaultBranchNextNodeId?: string;
  actions?: IActionConfig[];
  webhook?: IWebhookConfig;
  trigger?: ITriggerConfig;
  media?: IMediaContent;
}

export interface IVariable {
  name: string;
  type: typeof VariableTypeEnum.enum[number];
  defaultValue?: string | number | boolean | null;
  description?: string;
}

export interface IBotSettings {
  language: string;
  timezone: string;
  startTypingIndicator: boolean;
  readReceipts: boolean;
  blockAfterHours: boolean;
  afterHoursMessage?: string;
  offDays?: string[];
  offHoursStart?: string;
  offHoursEnd?: string;
}

export interface IBotAnalytics {
  totalConversations: number;
  activeConversations: number;
  completedConversations: number;
  averageResponseTime: number;
  satisfactionScore?: number;
  lastUpdated?: Date;
}

export interface IDelayConfig {
  type: 'fixed' | 'random' | 'scheduled';
  value?: number;
  unit?: 'seconds' | 'minutes' | 'hours' | 'days';
  sendAt?: string;
  timezone?: string;
}

export interface IHandoffConfig {
  department?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  customFields?: Record<string, string>;
  summaryPrompt?: string;
  silenceTimeout?: number;
  silenceTimeoutAction?: 'close' | 'extend' | 'transfer';
}

export interface IMessageContent {
  text?: string;
  media?: IMediaContent;
  quickReplies?: IQuickReplyOption[];
  buttons?: IButton[];
}

export interface IMediaContent {
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  url: string;
  caption?: string;
  filename?: string;
}

export interface IQuickReplyOption {
  id: string;
  text: string;
  emoji?: string;
  nextNodeId?: string;
}

export interface IButton {
  id: string;
  text: string;
  type: 'postback' | 'url' | 'phone' | 'copy';
  value: string;
  nextNodeId?: string;
}

export interface IAIResponseConfig {
  model: 'claude-3-5-sonnet' | 'gpt-4o' | 'gpt-4-turbo';
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  variables?: string[];
  knowledgeBaseIds?: string[];
  fallbackMessage?: string;
  silenceTimeout?: number;
  silenceTimeoutMessage?: string;
}

export interface IConditionBranch {
  id: string;
  name?: string;
  conditions: ICondition[];
  nextNodeId: string;
  priority: number;
}

export interface ICondition {
  id: string;
  field: string;
  operator: string;
  value: string | number | boolean | string[];
  logicalOperator?: 'and' | 'or';
}

export interface IActionConfig {
  actionType: string;
  params: Record<string, string | number | boolean | string[]>;
  continueToNext: boolean;
  onFailure?: {
    goToNodeId?: string;
    replyWithMessage?: string;
  };
}

export interface IWebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  bodyTemplate?: Record<string, string | number | boolean>;
  timeout: number;
  retryCount: number;
  retryDelay: number;
  continueToNextOnSuccess: boolean;
  continueToNextOnFailure: boolean;
  successNextNodeId?: string;
  failureNextNodeId?: string;
}

export interface ITriggerConfig {
  type: 'welcome' | 'keyword' | 'webhook' | 'schedule' | 'event' | 'api';
  keyword?: string;
  keywords?: string[];
  keywordMatchType: 'exact' | 'contains' | 'starts_with' | 'any';
  eventType?: string;
  scheduleCron?: string;
  scheduleTimezone?: string;
  apiEndpoint?: string;
  conditions?: ICondition[];
}

// ============ SCHEMAS ============

const VariableSchema = new Schema<IVariable>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: VariableTypeEnum.enum,
      required: true
    },
    defaultValue: { type: Schema.Types.Mixed },
    description: String
  },
  { _id: false }
);

const BotSettingsSchema = new Schema<IBotSettings>(
  {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    startTypingIndicator: { type: Boolean, default: true },
    readReceipts: { type: Boolean, default: true },
    blockAfterHours: { type: Boolean, default: false },
    afterHoursMessage: String,
    offDays: [String],
    offHoursStart: String,
    offHoursEnd: String
  },
  { _id: false }
);

const BotAnalyticsSchema = new Schema<IBotAnalytics>(
  {
    totalConversations: { type: Number, default: 0 },
    activeConversations: { type: Number, default: 0 },
    completedConversations: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    satisfactionScore: Number,
    lastUpdated: Date
  },
  { _id: false }
);

// Main Bot Schema
const BotSchema = new Schema<IBot>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true
    },
    description: {
      type: String,
      maxlength: 1000,
      trim: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: BotStatusEnum.enum,
      default: 'draft'
    },
    flows: [Schema.Types.Mixed],
    defaultFlowId: String,
    channels: {
      type: [String],
      enum: ChannelTypeEnum.enum,
      default: ['whatsapp']
    },
    variables: [VariableSchema],
    settings: {
      type: BotSettingsSchema,
      default: () => ({})
    },
    analytics: {
      type: BotAnalyticsSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    collection: 'studio_bots'
  }
);

// Indexes
BotSchema.index({ tenantId: 1, userId: 1 });
BotSchema.index({ status: 1 });
BotSchema.index({ createdAt: -1 });

// Methods
BotSchema.methods.getActiveFlow = function () {
  if (!this.defaultFlowId) {
    return this.flows[0];
  }
  return this.flows.find((f: any) => f.id === this.defaultFlowId);
};

BotSchema.methods.updateAnalytics = async function (updates: Partial<IBotAnalytics>) {
  this.analytics = { ...this.analytics, ...updates, lastUpdated: new Date() };
  return this.save();
};

export const Bot = mongoose.model<IBot>('Bot', BotSchema);
