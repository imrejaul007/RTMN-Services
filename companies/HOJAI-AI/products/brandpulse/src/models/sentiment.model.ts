import mongoose, { Schema, Model, Document } from 'mongoose';

// ============================================================================
// SENTIMENT RECORD INTERFACE
// ============================================================================

export interface ISentimentRecord extends Document {
  _id: mongoose.Types.ObjectId;

  // Identity
  brandId: string;
  tenantId: string;

  // Time bucket
  period: 'hour' | 'day' | 'week' | 'month';
  date: Date;

  // Aggregated counts
  total: number;
  positive: number;
  neutral: number;
  negative: number;

  // Ratings distribution
  ratings: {
    one: number;
    two: number;
    three: number;
    four: number;
    five: number;
  };

  // Sentiment score (weighted average)
  score: number;

  // Source breakdown
  sources: {
    google: number;
    yelp: number;
    tripadvisor: number;
    facebook: number;
    direct: number;
    internal: number;
  };

  // Top aspects mentioned
  topAspects: {
    name: string;
    count: number;
    avgScore: number;
  }[];

  // Engagement totals
  engagement: {
    total: number;
    helpful: number;
    shares: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SENTIMENT RECORD SCHEMA
// ============================================================================

const SentimentRecordSchema = new Schema<ISentimentRecord>({
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
  period: {
    type: String,
    enum: ['hour', 'day', 'week', 'month'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  total: { type: Number, default: 0 },
  positive: { type: Number, default: 0 },
  neutral: { type: Number, default: 0 },
  negative: { type: Number, default: 0 },
  ratings: {
    one: { type: Number, default: 0 },
    two: { type: Number, default: 0 },
    three: { type: Number, default: 0 },
    four: { type: Number, default: 0 },
    five: { type: Number, default: 0 }
  },
  score: { type: Number, default: 0 },
  sources: {
    google: { type: Number, default: 0 },
    yelp: { type: Number, default: 0 },
    tripadvisor: { type: Number, default: 0 },
    facebook: { type: Number, default: 0 },
    direct: { type: Number, default: 0 },
    internal: { type: Number, default: 0 }
  },
  topAspects: [{
    name: String,
    count: Number,
    avgScore: Number
  }],
  engagement: {
    total: { type: Number, default: 0 },
    helpful: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Compound indexes for time-series queries
SentimentRecordSchema.index({ brandId: 1, period: 1, date: -1 });
SentimentRecordSchema.index({ tenantId: 1, period: 1, date: -1 });
SentimentRecordSchema.index({ brandId: 1, date: -1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL

// Virtual for id
SentimentRecordSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
SentimentRecordSchema.set('toJSON', { virtuals: true });
SentimentRecordSchema.set('toObject', { virtuals: true });

export const SentimentRecord = mongoose.model<ISentimentRecord>('SentimentRecord', SentimentRecordSchema);

// ============================================================================
// ALERT INTERFACE
// ============================================================================

export interface IAlert extends Document {
  _id: mongoose.Types.ObjectId;

  // Identity
  brandId: string;
  tenantId: string;

  // Alert details
  type: 'negative_spike' | 'low_rating' | 'negative_review' | 'competitor_mention' | 'trend_change';
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Content
  title: string;
  message: string;
  data?: Record<string, any>;

  // Review reference (if applicable)
  reviewId?: string;

  // Status
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;

  // Notification
  notified: {
    email: boolean;
    sms: boolean;
    slack: boolean;
    webhook: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ALERT SCHEMA
// ============================================================================

const AlertSchema = new Schema<IAlert>({
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
  type: {
    type: String,
    enum: ['negative_spike', 'low_rating', 'negative_review', 'competitor_mention', 'trend_change'],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: Schema.Types.Mixed,
  reviewId: String,
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
    default: 'active',
    index: true
  },
  acknowledgedAt: Date,
  acknowledgedBy: String,
  resolvedAt: Date,
  resolvedBy: String,
  notified: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    slack: { type: Boolean, default: false },
    webhook: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Indexes
AlertSchema.index({ brandId: 1, status: 1, createdAt: -1 });
AlertSchema.index({ tenantId: 1, status: 1 });

// Virtual for id
AlertSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
AlertSchema.set('toJSON', { virtuals: true });
AlertSchema.set('toObject', { virtuals: true });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);

// ============================================================================
// COMPETITOR INTERFACE
// ============================================================================

export interface ICompetitor extends Document {
  _id: mongoose.Types.ObjectId;

  brandId: string;
  tenantId: string;

  name: string;
  slug: string;
  website?: string;

  // Mentions tracking
  mentions: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    lastMention?: Date;
  };

  // Keywords to track
  keywords: string[];

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorSchema = new Schema<ICompetitor>({
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
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true
  },
  website: String,
  mentions: {
    total: { type: Number, default: 0 },
    positive: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    negative: { type: Number, default: 0 },
    lastMention: Date
  },
  keywords: [String],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

CompetitorSchema.index({ brandId: 1, name: 1 }, { unique: true });

// Virtual for id
CompetitorSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
CompetitorSchema.set('toJSON', { virtuals: true });
CompetitorSchema.set('toObject', { virtuals: true });

export const Competitor = mongoose.model<ICompetitor>('Competitor', CompetitorSchema);
