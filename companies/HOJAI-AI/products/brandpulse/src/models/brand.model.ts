import mongoose, { Schema, Model, Document } from 'mongoose';

// ============================================================================
// BRAND INTERFACE
// ============================================================================

export interface IBrand extends Document {
  _id: mongoose.Types.ObjectId;

  // Identity
  brandId: string;           // External/tenant brand ID
  tenantId: string;           // RTNM tenant
  name: string;
  slug: string;

  // Profile
  logo?: string;
  website?: string;
  description?: string;
  industry?: string;
  category?: string;

  // Contact
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };

  // Settings
  settings: {
    sentimentThreshold: number;      // Score below which triggers alert
    autoModerate: boolean;           // Auto-moderate reviews
    alertChannels: string[];          // Email, SMS, Slack, etc.
    responseTemplates: {
      positive: string;
      neutral: string;
      negative: string;
    };
  };

  // Stats (denormalized for performance)
  stats: {
    totalReviews: number;
    averageRating: number;
    sentimentScore: number;          // -1 to 1
    positivePercent: number;
    neutralPercent: number;
    negativePercent: number;
    lastUpdated: Date;
  };

  // Integration
  integrations: {
    google: { enabled: boolean; apiKey?: string };
    yelp: { enabled: boolean; businessId?: string };
    tripadvisor: { enabled: boolean; propertyId?: string };
    facebook: { enabled: boolean; pageId?: string };
  };

  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// BRAND SCHEMA
// ============================================================================

const BrandSchema = new Schema<IBrand>({
  brandId: {
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
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  logo: String,
  website: String,
  description: String,
  industry: String,
  category: String,
  contactEmail: String,
  contactPhone: String,
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  },
  settings: {
    sentimentThreshold: { type: Number, default: -0.3 },
    autoModerate: { type: Boolean, default: false },
    alertChannels: [{ type: String }],
    responseTemplates: {
      positive: { type: String, default: 'Thank you for your wonderful review!' },
      neutral: { type: String, default: 'Thank you for your feedback.' },
      negative: { type: String, default: 'We\'re sorry to hear about your experience.' }
    }
  },
  stats: {
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    sentimentScore: { type: Number, default: 0 },
    positivePercent: { type: Number, default: 0 },
    neutralPercent: { type: Number, default: 0 },
    negativePercent: { type: Number, default: 0 },
    lastUpdated: Date
  },
  integrations: {
    google: {
      enabled: { type: Boolean, default: false },
      apiKey: String
    },
    yelp: {
      enabled: { type: Boolean, default: false },
      businessId: String
    },
    tripadvisor: {
      enabled: { type: Boolean, default: false },
      propertyId: String
    },
    facebook: {
      enabled: { type: Boolean, default: false },
      pageId: String
    }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Indexes
BrandSchema.index({ brandId: 1, tenantId: 1 });
BrandSchema.index({ slug: 1 }, { unique: true });
BrandSchema.index({ 'stats.sentimentScore': -1 });

// Virtual for id
BrandSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
BrandSchema.set('toJSON', { virtuals: true });
BrandSchema.set('toObject', { virtuals: true });

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema);
