import mongoose, { Document, Schema } from 'mongoose';

export type Platform = 'instagram' | 'telegram' | 'facebook' | 'twitter';

export interface IChannel extends Document {
  name: string;
  platform: Platform;
  credentials: {
    accessToken?: string;
    botToken?: string;
    apiKey?: string;
    apiSecret?: string;
    appSecret?: string;
    verifyToken?: string;
    [key: string]: string | undefined;
  };
  status: 'active' | 'inactive' | 'error' | 'pending';
  webhookUrl?: string;
  settings: {
    autoReply: boolean;
    autoReplyDelay: number;
    notifications: boolean;
    syncInterval: number;
    [key: string]: boolean | number | string;
  };
  metadata: {
    pageId?: string;
    botUsername?: string;
    accountId?: string;
    [key: string]: string | undefined;
  };
  lastSync?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    platform: {
      type: String,
      required: true,
      enum: ['instagram', 'telegram', 'facebook', 'twitter']
    },
    credentials: {
      type: Map,
      of: String,
      default: {}
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'error', 'pending'],
      default: 'pending'
    },
    webhookUrl: {
      type: String,
      default: null
    },
    settings: {
      autoReply: {
        type: Boolean,
        default: false
      },
      autoReplyDelay: {
        type: Number,
        default: 5000
      },
      notifications: {
        type: Boolean,
        default: true
      },
      syncInterval: {
        type: Number,
        default: 60000
      }
    },
    metadata: {
      type: Map,
      of: String,
      default: {}
    },
    lastSync: {
      type: Date,
      default: null
    },
    errorMessage: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ChannelSchema.index({ platform: 1 });
ChannelSchema.index({ status: 1 });
ChannelSchema.index({ 'metadata.pageId': 1 });
ChannelSchema.index({ 'metadata.botUsername': 1 });

// Methods
ChannelSchema.methods.isActive = function(): boolean {
  return this.status === 'active';
};

ChannelSchema.methods.getCredential = function(key: string): string | undefined {
  return this.credentials.get(key);
};

ChannelSchema.methods.setCredential = async function(key: string, value: string): Promise<void> {
  this.credentials.set(key, value);
  await this.save();
};

export const Channel = mongoose.model<IChannel>('Channel', ChannelSchema);
export default Channel;