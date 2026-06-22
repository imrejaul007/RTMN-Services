import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { Conversation, Message, BusinessProfile, KnowledgeBaseItem, AutomationRule } from '../types/index.js';

// Models
const ConversationSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  merchantId: { type: String, required: true, index: true },
  customerId: { type: String, required: true },
  customerName: String,
  customerPhone: { type: String, required: true },
  channel: { type: String, default: 'whatsapp' },
  status: { type: String, enum: ['active', 'waiting', 'resolved', 'escalated'], default: 'active' },
  context: { type: Map, of: Schema.Types.Mixed },
  lastMessageAt: { type: Date, default: Date.now },
  messageCount: { type: Number, default: 0 }
}, { timestamps: true });
ConversationSchema.virtual('id').get(function() { return this._id.toHexString(); });
ConversationSchema.set('toJSON', { virtuals: true });
ConversationSchema.set('toObject', { virtuals: true });

const MessageSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  merchantId: { type: String, required: true, index: true },
  conversationId: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'document', 'audio', 'video', 'template', 'button', 'location'], default: 'text' },
  mediaUrl: String,
  intent: String,
  confidence: Number,
  metadata: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true });
MessageSchema.virtual('id').get(function() { return this._id.toHexString(); });
MessageSchema.set('toJSON', { virtuals: true });
MessageSchema.set('toObject', { virtuals: true });

const BusinessProfileSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  merchantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  category: String,
  address: String,
  email: String,
  website: String,
  timezone: { type: String, default: 'Asia/Kolkata' },
  language: { type: String, default: 'en' },
  features: {
    ordering: { type: Boolean, default: false },
    booking: { type: Boolean, default: false },
    support: { type: Boolean, default: true },
    catalog: { type: Boolean, default: false },
    feedback: { type: Boolean, default: false }
  }
}, { timestamps: true });
BusinessProfileSchema.virtual('id').get(function() { return this._id.toHexString(); });
BusinessProfileSchema.set('toJSON', { virtuals: true });
BusinessProfileSchema.set('toObject', { virtuals: true });

const KnowledgeBaseSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  merchantId: { type: String, required: true, index: true },
  category: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  keywords: [String],
  intents: [String],
  confidence: { type: Number, default: 0.8 },
  usageCount: { type: Number, default: 0 },
  helpfulCount: { type: Number, default: 0 },
  notHelpfulCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
KnowledgeBaseSchema.virtual('id').get(function() { return this._id.toHexString(); });
KnowledgeBaseSchema.set('toJSON', { virtuals: true });
KnowledgeBaseSchema.set('toObject', { virtuals: true });

const AutomationRuleSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  merchantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  trigger: {
    type: { type: String, enum: ['keyword', 'intent', 'time', 'event', 'inactivity'] },
    config: { type: Map, of: Schema.Types.Mixed }
  },
  conditions: [{
    field: String,
    operator: String,
    value: Schema.Types.Mixed
  }],
  actions: [{
    type: { type: String, enum: ['reply', 'template', 'tag', 'assign', 'webhook', 'workflow'] },
    config: { type: Map, of: Schema.Types.Mixed }
  }],
  priority: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  stats: {
    triggers: { type: Number, default: 0 },
    success: { type: Number, default: 0 },
    failures: { type: Number, default: 0 }
  }
}, { timestamps: true });
AutomationRuleSchema.virtual('id').get(function() { return this._id.toHexString(); });
AutomationRuleSchema.set('toJSON', { virtuals: true });
AutomationRuleSchema.set('toObject', { virtuals: true });

export const ConversationModel = mongoose.model('Conversation', ConversationSchema);
export const MessageModel = mongoose.model('Message', MessageSchema);
export const BusinessProfileModel = mongoose.model('BusinessProfile', BusinessProfileSchema);
export const KnowledgeBaseModel = mongoose.model('KnowledgeBase', KnowledgeBaseSchema);
export const AutomationRuleModel = mongoose.model('AutomationRule', AutomationRuleSchema);

// Service
export class ConversationService {
  async getOrCreateConversation(tenantId: string, merchantId: string, customerId: string, customerPhone: string, customerName?: string): Promise<Conversation> {
    let conversation = await ConversationModel.findOne({ merchantId, customerId, status: { $in: ['active', 'waiting'] } });

    if (!conversation) {
      conversation = await ConversationModel.create({
        tenantId, merchantId, customerId, customerPhone, customerName
      });
    }

    const obj = conversation.toObject();
    return {
      id: obj._id?.toString() || '',
      ...obj
    } as unknown as Conversation;
  }

  async addMessage(params: {
    tenantId: string;
    merchantId: string;
    conversationId: string;
    messageId: string;
    direction: 'inbound' | 'outbound';
    role: 'user' | 'assistant' | 'system';
    content: string;
    type?: string;
    intent?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }): Promise<Message> {
    const message = await MessageModel.create(params);

    await ConversationModel.updateOne(
      { _id: params.conversationId },
      {
        lastMessageAt: new Date(),
        $inc: { messageCount: 1 }
      }
    );

    return {
      id: (message.toObject() as any)._id?.toString() || '',
      ...message.toObject()
    } as unknown as Message;
  }

  async getConversationMessages(conversationId: string, limit = 50): Promise<Message[]> {
    const messages = await MessageModel.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit);
    return messages.map(m => ({
      id: (m.toObject() as any)._id?.toString() || '',
      ...m.toObject()
    } as unknown as Message));
  }

  async getHistory(conversationId: string, limit = 10): Promise<Message[]> {
    const messages = await MessageModel.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit);
    return messages.map(m => ({
      id: (m.toObject() as any)._id?.toString() || '',
      ...m.toObject()
    } as unknown as Message)).reverse();
  }

  async resolveConversation(conversationId: string): Promise<void> {
    await ConversationModel.updateOne({ _id: conversationId }, { status: 'resolved' });
  }

  async escalateConversation(conversationId: string): Promise<void> {
    await ConversationModel.updateOne({ _id: conversationId }, { status: 'escalated' });
  }
}

export const conversationService = new ConversationService();
