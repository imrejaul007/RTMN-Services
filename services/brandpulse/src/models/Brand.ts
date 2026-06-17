import mongoose, { Document, Schema } from 'mongoose';

export interface IBrand extends Document {
  brandId: string;
  name: string;
  slug: string;
  industry: string;
  website?: string;
  socialProfiles: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  keywords: string[];
  competitors: string[];
  trackingSince: Date;
  ownerId?: string;
  settings: {
    sentimentThresholdNegative: number;
    sentimentThresholdPositive: number;
    crisisVolumeThreshold: number;
    alertEnabled: boolean;
  };
  currentHealth: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    lastUpdated: Date;
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    brandId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    industry: { type: String, required: true },
    website: { type: String },
    socialProfiles: {
      twitter: String,
      facebook: String,
      instagram: String,
      linkedin: String,
      youtube: String,
      tiktok: String
    },
    keywords: { type: [String], default: [] },
    competitors: { type: [String], default: [] },
    trackingSince: { type: Date, default: Date.now },
    ownerId: { type: String },
    settings: {
      sentimentThresholdNegative: { type: Number, default: -0.3 },
      sentimentThresholdPositive: { type: Number, default: 0.3 },
      crisisVolumeThreshold: { type: Number, default: 100 },
      alertEnabled: { type: Boolean, default: true }
    },
    currentHealth: {
      score: { type: Number, default: 70 },
      trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
      lastUpdated: { type: Date, default: Date.now }
    },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

// Indexes
BrandSchema.index({ name: 'text', keywords: 'text' });
BrandSchema.index({ industry: 1 });
BrandSchema.index({ 'currentHealth.score': -1 });

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema);
