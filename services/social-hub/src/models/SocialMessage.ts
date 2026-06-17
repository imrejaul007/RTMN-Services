import mongoose, { Document, Schema } from 'mongoose';
import { Platform } from './Channel';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' | 'contact';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'received' | 'processing' | 'processed' | 'failed' | 'sent' | 'delivered' | 'read';

export interface ISocialMessage extends Document {
  platform: Platform;
  platformMessageId: string;
  senderId: string;
  senderName?: string;
  senderProfilePicture?: string;
  recipientId?: string;
  channelId: mongoose.Types.ObjectId;
  content: {
    type: MessageType;
    text?: string;
    mediaUrl?: string;
    mediaId?: string;
    caption?: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    metadata?: Record<string, unknown>;
  };
  threadId: string;
  customerId?: string;
  direction: MessageDirection;
  status: MessageStatus;
  processed: boolean;
  processedAt?: Date;
  autoReplied: boolean;
  replyToMessageId?: string;
  attachments: {
    type: string;
    url: string;
    thumbnailUrl?: string;
    size?: number;
  }[];
  metadata: {
    platformData?: Record<string, unknown>;
    source?: string;
    tags?: string[];
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SocialMessageSchema = new Schema<ISocialMessage>(
  {
    platform: {
      type: String,
      required: true,
      enum: ['instagram', 'telegram', 'facebook', 'twitter']
    },
    platformMessageId: {
      type: String,
      required: true
    },
    senderId: {
      type: String,
      required: true,
      index: true
    },
    senderName: {
      type: String,
      default: null
    },
    senderProfilePicture: {
      type: String,
      default: null
    },
    recipientId: {
      type: String,
      default: null
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true
    },
    content: {
      type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'sticker', 'contact'],
        default: 'text'
      },
      text: {
        type: String,
        default: null
      },
      mediaUrl: {
        type: String,
        default: null
      },
      mediaId: {
        type: String,
        default: null
      },
      caption: {
        type: String,
        default: null
      },
      location: {
        latitude: Number,
        longitude: Number,
        address: String
      },
      metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },
    threadId: {
      type: String,
      required: true,
      index: true
    },
    customerId: {
      type: String,
      default: null,
      index: true
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'inbound'
    },
    status: {
      type: String,
      enum: ['received', 'processing', 'processed', 'failed', 'sent', 'delivered', 'read'],
      default: 'received'
    },
    processed: {
      type: Boolean,
      default: false
    },
    processedAt: {
      type: Date,
      default: null
    },
    autoReplied: {
      type: Boolean,
      default: false
    },
    replyToMessageId: {
      type: String,
      default: null
    },
    attachments: [
      {
        type: {
          type: String,
          required: true
        },
        url: {
          type: String,
          required: true
        },
        thumbnailUrl: {
          type: String,
          default: null
        },
        size: {
          type: Number,
          default: null
        }
      }
    ],
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
SocialMessageSchema.index({ platform: 1, createdAt: -1 });
SocialMessageSchema.index({ threadId: 1, createdAt: -1 });
SocialMessageSchema.index({ customerId: 1, createdAt: -1 });
SocialMessageSchema.index({ channelId: 1, createdAt: -1 });
SocialMessageSchema.index({ processed: 1, status: 1 });
SocialMessageSchema.index({ platform: 1, senderId: 1 });

// Virtual for unified inbox thread
SocialMessageSchema.virtual('isUnread').get(function() {
  return this.direction === 'inbound' && this.status !== 'read';
});

// Static method to find or create thread
SocialMessageSchema.statics.findOrCreateThread = async function(
  platform: Platform,
  senderId: string,
  channelId: mongoose.Types.ObjectId
): Promise<string> {
  const existingMessage = await this.findOne({
    platform,
    senderId,
    channelId
  }).sort({ createdAt: -1 });

  if (existingMessage) {
    return existingMessage.threadId;
  }

  // Create new thread ID
  return `${platform}-${channelId.toString()}-${senderId}-${Date.now()}`;
};

// Static method to mark all messages in thread as read
SocialMessageSchema.statics.markThreadAsRead = async function(threadId: string): Promise<void> {
  await this.updateMany(
    { threadId, direction: 'inbound', status: { $ne: 'read' } },
    { status: 'read' }
  );
};

export const SocialMessage = mongoose.model<ISocialMessage>('SocialMessage', SocialMessageSchema);
export default SocialMessage;