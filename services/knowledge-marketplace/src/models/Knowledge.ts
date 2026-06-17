import mongoose, { Schema, model } from 'mongoose';
import { KnowledgeDocument, KnowledgeType, Industry, ContentSection, Citation, Review } from '../types';

const ContentSectionSchema = new Schema<ContentSection>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  order: { type: Number, required: true }
}, { _id: false });

const ContentSchema = new Schema({
  summary: { type: String, required: true },
  sections: [ContentSectionSchema]
}, { _id: false });

const CitationSchema = new Schema<Citation>({
  source: { type: String, required: true },
  url: { type: String },
  description: { type: String, required: true },
  date: { type: String }
}, { _id: false });

const ReviewSchema = new Schema<Review>({
  userId: { type: String },
  userName: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const KnowledgeSchema = new Schema<KnowledgeDocument>({
  knowledgeId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, index: 'text' },
  description: { type: String, required: true },
  industry: {
    type: String,
    required: true,
    enum: [
      'hospitality', 'healthcare', 'retail', 'hotel', 'legal',
      'education', 'agriculture', 'automotive', 'beauty', 'fashion',
      'fitness', 'gaming', 'government', 'home-services', 'manufacturing',
      'non-profit', 'professional', 'sports', 'travel', 'entertainment',
      'construction', 'financial', 'real-estate', 'transport'
    ],
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['sop', 'compliance', 'training', 'manual', 'guide'],
    index: true
  },
  content: { type: ContentSchema, required: true },
  citations: [CitationSchema],
  reviews: [ReviewSchema],
  installs: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  tags: [{ type: String }],
  author: { type: String, required: true },
  version: { type: String, default: '1.0.0' },
  isPublished: { type: Boolean, default: true },
  isPremium: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Compound indexes for common queries
KnowledgeSchema.index({ industry: 1, type: 1 });
KnowledgeSchema.index({ tags: 1 });
KnowledgeSchema.index({ installs: -1 });
KnowledgeSchema.index({ rating: -1 });
KnowledgeSchema.index({ title: 'text', description: 'text', 'content.summary': 'text' });

// Virtual for full-text search
KnowledgeSchema.virtual('searchText').get(function() {
  return `${this.title} ${this.description} ${this.content?.summary || ''} ${this.tags?.join(' ') || ''}`;
});

export const Knowledge = model<KnowledgeDocument>('Knowledge', KnowledgeSchema);
