import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  messageId: string;
  conversationId: mongoose.Types.ObjectId;
  nodeId?: string;
  type: 'user' | 'bot' | 'system' | 'agent';
  content: {
    text?: string;
    media?: {
      type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
      url: string;
      caption?: string;
      filename?: string;
    };
    quickReplies?: Array<{
      id: string;
      text: string;
      emoji?: string;
      nextNodeId?: string;
    }>;
    buttons?: Array<{
      id: string;
      text: string;
      type: 'postback' | 'url' | 'phone' | 'copy';
      value: string;
      nextNodeId?: string;
    }>;
  };
  timestamp: Date;
  metadata?: {
    sessionId?: string;
    platformMessageId?: string;
    deliveryStatus?: 'sent' | 'delivered' | 'read' | 'failed';
    error?: string;
    agentId?: string;
    handoffReason?: string;
  };
  createdAt: Date;
}

const MessageContentSchema = new Schema(
  {
    text: String,
    media: {
      type: {
        type: String,
        enum: ['image', 'video', 'audio', 'document', 'sticker']
      },
      url: String,
      caption: String,
      filename: String
    },
    quickReplies: [
      {
        id: String,
        text: String,
        emoji: String,
        nextNodeId: String
      }
    ],
    buttons: [
      {
        id: String,
        text: String,
        type: String,
        value: String,
        nextNodeId: String
      }
    ]
  },
  { _id: false }
);

const MessageMetadataSchema = new Schema(
  {
    sessionId: String,
    platformMessageId: String,
    deliveryStatus: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed']
    },
    error: String,
    agentId: String,
    handoffReason: String
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    nodeId: String,
    type: {
      type: String,
      required: true,
      enum: ['user', 'bot', 'system', 'agent']
    },
    content: {
      type: MessageContentSchema,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    metadata: {
      type: MessageMetadataSchema,
      default: () => ({})
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'studio_messages'
  }
);

// Indexes
MessageSchema.index({ conversationId: 1, timestamp: -1 });
MessageSchema.index({ type: 1, createdAt: -1 });
MessageSchema.index({ 'metadata.deliveryStatus': 1 });

// Statics
MessageSchema.statics.findByConversation = function (conversationId: string, limit = 50, before?: Date) {
  const query: any = { conversationId };
  if (before) query.createdAt = { $lt: before };
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit);
};

MessageSchema.statics.countByType = function (conversationId: string) {
  return this.aggregate([
    { $match: { conversationId: new mongoose.Types.ObjectId(conversationId) } },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
};

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
