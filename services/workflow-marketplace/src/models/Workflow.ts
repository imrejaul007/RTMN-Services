import mongoose, { Schema, Document } from 'mongoose';
import { WorkflowDocument, WorkflowStep, Review } from '../types';

const WorkflowStepSchema = new Schema<WorkflowStep>(
  {
    order: { type: Number, required: true },
    action: { type: String, required: true },
    condition: { type: String },
    assignee: { type: String },
    description: { type: String },
    timeout: { type: Number, default: 300 },
    retryable: { type: Boolean, default: false },
  },
  { _id: false }
);

const ReviewSchema = new Schema<Review>(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    userId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export interface IWorkflow extends WorkflowDocument, Document {}

const WorkflowSchema = new Schema<IWorkflow>(
  {
    workflowId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    industry: {
      type: String,
      required: true,
      enum: [
        'retail',
        'restaurant',
        'hotel',
        'healthcare',
        'insurance',
        'fitness',
        'beauty',
        'automotive',
        'realestate',
        'legal',
        'education',
        'general',
      ],
      index: true,
    },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'refund',
        'cancellation',
        'upgrade',
        'claim',
        'support',
        'onboarding',
        'checkout',
        'feedback',
        'loyalty',
        'compliance',
        'general',
      ],
      index: true,
    },
    steps: { type: [WorkflowStepSchema], required: true },
    reviews: { type: [ReviewSchema], default: [] },
    installs: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    author: { type: String },
    version: { type: String, default: '1.0.0' },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for average rating
WorkflowSchema.virtual('averageRating').get(function () {
  if (this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return (sum / this.reviews.length).toFixed(1);
});

// Indexes for search
WorkflowSchema.index({ name: 'text', description: 'text', tags: 'text' });
WorkflowSchema.index({ industry: 1, category: 1 });

export const Workflow = mongoose.model<IWorkflow>('Workflow', WorkflowSchema);
