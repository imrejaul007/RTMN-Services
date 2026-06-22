import mongoose, { Schema, Document } from 'mongoose';
import {
  Template
} from '../types';

export interface ITemplate extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  category: typeof Template.category;
  industry: typeof Template.industry;
  flows: any[];
  variables: ITemplateVariable[];
  thumbnail?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITemplateVariable {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  example?: string;
}

const TemplateVariableSchema = new Schema<ITemplateVariable>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    required: { type: Boolean, default: false },
    description: String,
    example: String
  },
  { _id: false }
);

const TemplateSchema = new Schema<ITemplate>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        'welcome',
        'onboarding',
        'support',
        'marketing',
        'order',
        'appointment',
        'feedback',
        'notification',
        'custom'
      ]
    },
    industry: {
      type: String,
      default: 'general',
      enum: [
        'banking',
        'healthcare',
        'restaurant',
        'retail',
        'travel',
        'hr',
        'ecommerce',
        'general'
      ]
    },
    flows: { type: Schema.Types.Mixed, required: true },
    variables: [TemplateVariableSchema],
    thumbnail: String,
    isPublic: { type: Boolean, default: false },
    createdBy: { type: String, required: true, index: true }
  },
  {
    timestamps: true,
    collection: 'studio_templates'
  }
);

// Indexes
TemplateSchema.index({ category: 1, industry: 1 });
TemplateSchema.index({ isPublic: 1 });
TemplateSchema.index({ createdAt: -1 });
TemplateSchema.index({ name: 'text', description: 'text' });

// Static methods
TemplateSchema.statics.findByCategory = function (category: string) {
  return this.find({ category, isPublic: true });
};

TemplateSchema.statics.findByIndustry = function (industry: string) {
  return this.find({ industry, isPublic: true });
};

TemplateSchema.statics.searchTemplates = function (query: string) {
  return this.find(
    {
      isPublic: true,
      $text: { $search: query }
    },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

export const TemplateModel = mongoose.model<ITemplate>('Template', TemplateSchema);
