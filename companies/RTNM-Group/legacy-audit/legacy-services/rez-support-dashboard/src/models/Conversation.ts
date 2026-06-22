import mongoose, { Schema, Document } from 'mongoose';
import { ChannelType, ConversationStatus, Priority, Message } from '../types/index.js';

export interface IConversation extends Document {
  channel: ChannelType;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAvatar?: string;
  assignedAgent?: string;
  assignedAgentName?: string;
  status: ConversationStatus;
  priority: Priority;
  subject?: string;
  tags: string[];
  messages: Array<{
    id: string;
    content: string;
    sender: 'customer' | 'agent' | 'system' | 'bot';
    senderId?: string;
    senderName?: string;
    timestamp: Date;
    attachments?: Array<{ id: string; type: string; url: string; name: string }>;
    read: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
  slaDeadline?: Date;
  resolvedAt?: Date;
  sourceService: string;
  sourceConversationId: string;
  metadata?: Record<string, unknown>;
}

const MessageSchema = new Schema({
  id: { type: String, required: true },
  content: { type: String, required: true },
  sender: { type: String, enum: ['customer', 'agent', 'system', 'bot'], required: true },
  senderId: String,
  senderName: String,
  timestamp: { type: Date, required: true },
  attachments: [{
    id: String,
    type: String,
    url: String,
    name: String,
  }],
  read: { type: Boolean, default: false },
}, { _id: false });

const ConversationSchema = new Schema<IConversation>({
  channel: { type: String, enum: ['whatsapp', 'email', 'instagram', 'web', 'chat'], required: true, index: true },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerPhone: String,
  customerEmail: String,
  customerAvatar: String,
  assignedAgent: { type: String, index: true },
  assignedAgentName: String,
  status: { type: String, enum: ['open', 'in_progress', 'pending', 'resolved', 'closed'], default: 'open', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
  subject: String,
  tags: [{ type: String }],
  messages: [MessageSchema],
  slaDeadline: { type: Date, index: true },
  resolvedAt: Date,
  sourceService: { type: String, required: true },
  sourceConversationId: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
});

ConversationSchema.index({ channel: 1, status: 1 });
ConversationSchema.index({ assignedAgent: 1, status: 1 });
ConversationSchema.index({ slaDeadline: 1, status: 1 });
ConversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
