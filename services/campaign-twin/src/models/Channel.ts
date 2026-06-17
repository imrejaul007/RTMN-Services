import mongoose, { Document, Schema } from 'mongoose';

// Channel configuration document interface
export interface IChannel extends Document {
  channelId: string;
  tenantId: string;
  name: string;
  type: 'email' | 'sms' | 'social' | 'ads' | 'seo' | 'content' | 'influencer' | 'display' | 'video';
  provider?: string;
  config: {
    apiKey?: string;
    accountId?: string;
    audienceSize?: number;
    reach?: number;
    frequency?: number;
    avgCpc?: number;
    avgCpm?: number;
    dailyBudget?: number;
    lifetimeBudget?: number;
    biddingStrategy?: string;
    targetingOptions?: Record<string, any>;
  };
  credentials?: {
    encrypted: boolean;
    lastUpdated?: Date;
  };
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  isEnabled: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Channel schema
const ChannelSchema = new Schema<IChannel>({
  channelId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'social', 'ads', 'seo', 'content', 'influencer', 'display', 'video'],
    required: true
  },
  provider: {
    type: String,
    trim: true
  },
  config: {
    type: Schema.Types.Mixed,
    default: {}
  },
  credentials: {
    encrypted: { type: Boolean, default: true },
    lastUpdated: { type: Date }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes
ChannelSchema.index({ tenantId: 1, type: 1 });
ChannelSchema.index({ tenantId: 1, status: 1 });
ChannelSchema.index({ type: 1, status: 1 });

// Virtual for channel type details
ChannelSchema.virtual('typeDetails').get(function() {
  const typeDetails: Record<string, { category: string; description: string }> = {
    email: { category: 'Direct', description: 'Email marketing campaigns' },
    sms: { category: 'Direct', description: 'SMS text message campaigns' },
    social: { category: 'Social', description: 'Social media advertising' },
    ads: { category: 'Paid', description: 'Paid advertising campaigns' },
    seo: { category: 'Organic', description: 'Search engine optimization' },
    content: { category: 'Organic', description: 'Content marketing' },
    influencer: { category: 'Partnership', description: 'Influencer marketing' },
    display: { category: 'Paid', description: 'Display advertising' },
    video: { category: 'Paid', description: 'Video advertising' }
  };
  return typeDetails[this.type] || { category: 'Other', description: 'Other channel type' };
});

export const Channel = mongoose.model<IChannel>('Channel', ChannelSchema);
