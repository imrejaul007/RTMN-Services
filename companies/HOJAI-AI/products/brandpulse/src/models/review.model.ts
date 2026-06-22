import mongoose, { Schema, Model, Document } from 'mongoose';

// ============================================================================
// REVIEW INTERFACE
// ============================================================================

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;

  // Identity
  reviewId: string;           // External review ID
  brandId: string;            // Reference to Brand
  tenantId: string;

  // Source
  source: 'google' | 'yelp' | 'tripadvisor' | 'facebook' | 'direct' | 'internal';
  sourceId?: string;          // External review ID from source
  sourceUrl?: string;         // Link to original review

  // Content
  title?: string;
  content: string;
  rating: number;             // 1-5

  // Author
  author: {
    name: string;
    avatar?: string;
    isVerified: boolean;
    reviewCount?: number;     // Total reviews by this author
  };

  // Sentiment Analysis
  sentiment: {
    score: number;            // -1 (negative) to 1 (positive)
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;       // 0-1
    aspects: {
      name: string;           // e.g., "service", "food", "ambiance"
      score: number;
      mentions: number;
    }[];
    keywords: string[];
  };

  // Moderation
  moderation: {
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    flagged: boolean;
    flagReason?: string;
    moderatedAt?: Date;
    moderatedBy?: string;
  };

  // Responses
  responses: {
    content: string;
    author: string;
    createdAt: Date;
    sentiment?: string;
  }[];

  // Engagement
  engagement: {
    helpful: number;
    shares: number;
    clicks: number;
  };

  // Metadata
  metadata: {
    location?: string;
    device?: string;
    language?: string;
    verified: boolean;
    sponsored: boolean;
  };

  // Dates
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// REVIEW SCHEMA
// ============================================================================

const ReviewSchema = new Schema<IReview>({
  reviewId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  brandId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  source: {
    type: String,
    enum: ['google', 'yelp', 'tripadvisor', 'facebook', 'direct', 'internal'],
    required: true,
    index: true
  },
  sourceId: String,
  sourceUrl: String,
  title: String,
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  author: {
    name: { type: String, required: true },
    avatar: String,
    isVerified: { type: Boolean, default: false },
    reviewCount: Number
  },
  sentiment: {
    score: { type: Number, default: 0, min: -1, max: 1 },
    label: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    aspects: [{
      name: String,
      score: Number,
      mentions: Number
    }],
    keywords: [String]
  },
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'pending'
    },
    flagged: { type: Boolean, default: false },
    flagReason: String,
    moderatedAt: Date,
    moderatedBy: String
  },
  responses: [{
    content: String,
    author: String,
    createdAt: { type: Date, default: Date.now },
    sentiment: String
  }],
  engagement: {
    helpful: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 }
  },
  metadata: {
    location: String,
    device: String,
    language: String,
    verified: { type: Boolean, default: false },
    sponsored: { type: Boolean, default: false }
  },
  publishedAt: {
    type: Date,
    required: true,
    index: true
  }
}, { timestamps: true });

// Compound indexes
ReviewSchema.index({ brandId: 1, source: 1, publishedAt: -1 });
ReviewSchema.index({ brandId: 1, 'sentiment.label': 1 });
ReviewSchema.index({ brandId: 1, rating: -1 });
ReviewSchema.index({ brandId: 1, 'moderation.status': 1 });
ReviewSchema.index({ tenantId: 1, publishedAt: -1 });

// Virtual for id
ReviewSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
ReviewSchema.set('toJSON', { virtuals: true });
ReviewSchema.set('toObject', { virtuals: true });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
