import mongoose, { Schema, Document } from 'mongoose';
import { RCSProviderEnum, RCSStatusEnum } from '../types';

export interface IRCSMessage extends Document {
  _id: mongoose.Types.ObjectId;
  messageId: string;
  tenantId: string;
  provider: string;
  recipient: string;
  type: string;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaCaption?: string;
  card?: any;
  carousel?: any;
  suggestions?: any[];
  location?: any;
  brandId?: string;
  brandName?: string;
  status: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  providerMessageId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const RCSMessageSchema = new Schema<IRCSMessage>(
  {
    messageId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    provider: { type: String, enum: RCSProviderEnum.enum, required: true },
    recipient: { type: String, required: true, index: true },
    type: { type: String, required: true },
    text: String,
    mediaUrl: String,
    mediaMimeType: String,
    mediaCaption: String,
    card: Schema.Types.Mixed,
    carousel: Schema.Types.Mixed,
    suggestions: [Schema.Types.Mixed],
    location: Schema.Types.Mixed,
    brandId: String,
    brandName: String,
    status: { type: String, enum: RCSStatusEnum.enum, default: 'pending', index: true },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    failedAt: Date,
    errorMessage: String,
    providerMessageId: String,
    metadata: { type: Map, of: Schema.Types.Mixed }
  },
  { timestamps: true, collection: 'rcs_messages' }
);

RCSMessageSchema.index({ tenantId: 1, status: 1 });
RCSMessageSchema.index({ tenantId: 1, createdAt: -1 });

export const RCSMessage = mongoose.model<IRCSMessage>('RCSMessage', RCSMessageSchema);

export interface IRCSBrand extends Document {
  _id: mongoose.Types.ObjectId;
  brandId: string;
  tenantId: string;
  name: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  website?: string;
  vertical: string;
  verified: boolean;
  verifiedAt?: Date;
  providerBrandIds?: Record<string, string>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RCSBrandSchema = new Schema<IRCSBrand>(
  {
    brandId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    logoUrl: String,
    coverImageUrl: String,
    description: String,
    website: String,
    vertical: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    providerBrandIds: { type: Map, of: String },
    enabled: { type: Boolean, default: true }
  },
  { timestamps: true, collection: 'rcs_brands' }
);

RCSBrandSchema.index({ tenantId: 1, verified: 1 });

export const RCSBrand = mongoose.model<IRCSBrand>('RCSBrand', RCSBrandSchema);

export interface IRCSCampaign extends Document {
  _id: mongoose.Types.ObjectId;
  campaignId: string;
  tenantId: string;
  name: string;
  description?: string;
  content: any;
  segmentIds: string[];
  recipientCount: number;
  brandId: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: string;
  stats: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    clicked: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RCSCampaignSchema = new Schema<IRCSCampaign>(
  {
    campaignId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    content: Schema.Types.Mixed,
    segmentIds: [String],
    recipientCount: { type: Number, default: 0 },
    brandId: { type: String, required: true },
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
    status: { type: String, enum: ['draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled'], default: 'draft' },
    stats: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 }
    }
  },
  { timestamps: true, collection: 'rcs_campaigns' }
);

RCSCampaignSchema.index({ tenantId: 1, status: 1 });

export const RCSCampaign = mongoose.model<IRCSCampaign>('RCSCampaign', RCSCampaignSchema);
