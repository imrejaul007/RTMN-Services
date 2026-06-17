import mongoose, { Document, Schema } from 'mongoose';

export interface IMention extends Document {
  mentionId: string;
  brandId: string;
  source: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'news' | 'blog' | 'forum' | 'review' | 'other';
  platformId?: string;
  author: {
    name: string;
    handle?: string;
    followers?: number;
    verified?: boolean;
  };
  content: string;
  url?: string;
  sentiment: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  };
  engagement: {
    likes?: number;
    shares?: number;
    comments?: number;
    reach?: number;
  };
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
  language: string;
  isReply: boolean;
  isRetweet: boolean;
  isCrisis: boolean;
  tags: string[];
  publishedAt: Date;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MentionSchema = new Schema<IMention>(
  {
    mentionId: { type: String, required: true, unique: true, index: true },
    brandId: { type: String, required: true, index: true },
    source: {
      type: String,
      enum: ['twitter', 'facebook', 'instagram', 'linkedin', 'news', 'blog', 'forum', 'review', 'other'],
      required: true,
      index: true
    },
    platformId: String,
    author: {
      name: { type: String, required: true },
      handle: String,
      followers: Number,
      verified: { type: Boolean, default: false }
    },
    content: { type: String, required: true },
    url: String,
    sentiment: {
      score: { type: Number, default: 0 },
      label: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
      confidence: { type: Number, default: 0 }
    },
    engagement: {
      likes: Number,
      shares: Number,
      comments: Number,
      reach: Number
    },
    location: {
      country: String,
      city: String,
      coordinates: [Number, Number]
    },
    language: { type: String, default: 'en' },
    isReply: { type: Boolean, default: false },
    isRetweet: { type: Boolean, default: false },
    isCrisis: { type: Boolean, default: false, index: true },
    tags: [String],
    publishedAt: { type: Date, required: true, index: true },
    processedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Indexes for analytics queries
MentionSchema.index({ brandId: 1, source: 1 });
MentionSchema.index({ brandId: 1, publishedAt: -1 });
MentionSchema.index({ brandId: 1, 'sentiment.label': 1 });
MentionSchema.index({ brandId: 1, isCrisis: 1 });
MentionSchema.index({ brandId: 1, 'author.followers': -1 });

export const Mention = mongoose.model<IMention>('Mention', MentionSchema);
