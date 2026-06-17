import mongoose, { Schema, Document } from 'mongoose';
import { IContent, IContentVariation, IContentPerformance } from '../types';

export interface IContentDocument extends Omit<IContent, 'variations' | 'performance'>, Document {
  variations: IContentVariation[];
  performance?: IContentPerformance;
}

const ContentVariationSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  content: { type: String, required: true },
  element: { type: String, required: true },
  testResult: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    winner: { type: Boolean, default: false }
  }
}, { _id: false });

const ContentPerformanceSchema = new Schema({
  views: { type: Number, default: 0 },
  uniqueViews: { type: Number, default: 0 },
  avgTimeOnPage: { type: Number, default: 0 },
  bounceRate: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0 }
}, { _id: false });

const ContentSchema = new Schema({
  title: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['blog', 'social', 'email', 'video', 'ad', 'landing_page', 'newsletter', 'case_study'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'in_review', 'approved', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  body: { type: String, required: true },
  summary: { type: String },
  targetAudience: [{ type: String }],
  channels: [{ type: String }],
  seoKeywords: [{ type: String }, { index: true }],
  metaDescription: { type: String },
  featuredImage: { type: String },
  createdBy: { type: String, required: true },
  variations: [ContentVariationSchema],
  performance: { type: ContentPerformanceSchema }
}, {
  timestamps: true
});

// Indexes for common queries
ContentSchema.index({ type: 1, status: 1 });
ContentSchema.index({ status: 1, createdAt: -1 });
ContentSchema.index({ seoKeywords: 1 });
ContentSchema.index({ 'performance.engagementScore': -1 });

export const Content = mongoose.model<IContentDocument>('Content', ContentSchema);
