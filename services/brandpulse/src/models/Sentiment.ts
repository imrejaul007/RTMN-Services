import mongoose, { Document, Schema } from 'mongoose';

export interface ISentiment extends Document {
  sentimentId: string;
  brandId: string;
  period: {
    start: Date;
    end: Date;
    type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  };
  aggregate: {
    score: number;
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  bySource: {
    twitter?: { positive: number; neutral: number; negative: number; total: number };
    facebook?: { positive: number; neutral: number; negative: number; total: number };
    instagram?: { positive: number; neutral: number; negative: number; total: number };
    linkedin?: { positive: number; neutral: number; negative: number; total: number };
    news?: { positive: number; neutral: number; negative: number; total: number };
    other?: { positive: number; neutral: number; negative: number; total: number };
  };
  trending: {
    direction: 'improving' | 'declining' | 'stable';
    changePercent: number;
    velocity: number;
  };
  topPositiveKeywords: Array<{ keyword: string; count: number }>;
  topNegativeKeywords: Array<{ keyword: string; count: number }>;
  peakMoments: Array<{ timestamp: Date; score: number; event?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const SentimentSchema = new Schema<ISentiment>(
  {
    sentimentId: { type: String, required: true, unique: true, index: true },
    brandId: { type: String, required: true, index: true },
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      type: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly'],
        required: true
      }
    },
    aggregate: {
      score: { type: Number, default: 0 },
      positive: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    bySource: {
      twitter: new Schema({
        positive: Number,
        neutral: Number,
        negative: Number,
        total: Number
      }, { _id: false }),
      facebook: new Schema({
        positive: Number,
        neutral: Number,
        negative: Number,
        total: Number
      }, { _id: false }),
      instagram: new Schema({
        positive: Number,
        neutral: Number,
        negative: Number,
        total: Number
      }, { _id: false }),
      linkedin: new Schema({
        positive: Number,
        neutral: Number,
        negative: Number,
        total: Number
      }, { _id: false }),
      news: new Schema({
        positive: Number,
        neutral: Number,
        negative: Number,
        total: Number
      }, { _id: false }),
      other: new Schema({
        positive: Number,
        neutral: Number,
        negative: Number,
        total: Number
      }, { _id: false })
    },
    trending: {
      direction: { type: String, enum: ['improving', 'declining', 'stable'], default: 'stable' },
      changePercent: { type: Number, default: 0 },
      velocity: { type: Number, default: 0 }
    },
    topPositiveKeywords: [{
      keyword: String,
      count: Number
    }],
    topNegativeKeywords: [{
      keyword: String,
      count: Number
    }],
    peakMoments: [{
      timestamp: Date,
      score: Number,
      event: String
    }]
  },
  { timestamps: true }
);

// Indexes
SentimentSchema.index({ brandId: 1, 'period.start': -1 });
SentimentSchema.index({ brandId: 1, 'period.type': 1 });
SentimentSchema.index({ brandId: 1, 'trending.direction': 1 });

export const Sentiment = mongoose.model<ISentiment>('Sentiment', SentimentSchema);
