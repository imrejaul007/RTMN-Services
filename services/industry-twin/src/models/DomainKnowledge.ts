import mongoose, { Document, Schema } from 'mongoose';
import { IndustryType } from './IndustryProfile';

// Knowledge categories
export type KnowledgeCategory =
  | 'operations'
  | 'customer_service'
  | 'marketing'
  | 'finance'
  | 'hr'
  | 'technology'
  | 'compliance'
  | 'strategy';

// Domain concept within a knowledge base
export interface DomainConcept {
  term: string;
  definition: string;
  examples: string[];
  relatedTerms: string[];
  importance: 'basic' | 'intermediate' | 'advanced';
}

// Industry-specific terminology
export interface IndustryTerminology {
  term: string;
  industrySpecific: boolean;
  definition: string;
  usage: string;
  synonyms: string[];
}

// Process workflow
export interface ProcessWorkflow {
  name: string;
  description: string;
  steps: {
    order: number;
    name: string;
    description: string;
    duration?: string;
    responsible?: string;
  }[];
  inputs: string[];
  outputs: string[];
  failurePoints: string[];
}

// Industry terminology
export interface IndustryTerm {
  term: string;
  industrySpecific: boolean;
  definition: string;
  usage: string;
  synonyms: string[];
}

// Domain knowledge document
export interface IDomainKnowledge extends Document {
  tenantId: string;
  industryType: IndustryType;
  category: KnowledgeCategory;
  title: string;
  description: string;
  concepts: DomainConcept[];
  terminology: IndustryTerm[];
  workflows: ProcessWorkflow[];
  keyMetrics: {
    name: string;
    description: string;
    targetValue: string;
  }[];
  tools: {
    name: string;
    purpose: string;
    alternatives: string[];
  }[];
  resources: {
    title: string;
    type: 'article' | 'video' | 'course' | 'template';
    url?: string;
    description: string;
  }[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DomainKnowledgeSchema = new Schema<IDomainKnowledge>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    industryType: {
      type: String,
      required: true,
      enum: ['restaurant', 'hotel', 'healthcare', 'retail', 'manufacturing', 'fintech'],
      index: true
    },
    category: {
      type: String,
      required: true,
      enum: ['operations', 'customer_service', 'marketing', 'finance', 'hr', 'technology', 'compliance', 'strategy']
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    concepts: [{
      term: { type: String, required: true },
      definition: { type: String, required: true },
      examples: [{ type: String }],
      relatedTerms: [{ type: String }],
      importance: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced'],
        default: 'basic'
      }
    }],
    terminology: [{
      term: { type: String, required: true },
      industrySpecific: { type: Boolean, default: false },
      definition: { type: String, required: true },
      usage: { type: String },
      synonyms: [{ type: String }]
    }],
    workflows: [{
      name: { type: String, required: true },
      description: { type: String },
      steps: [{
        order: { type: Number, required: true },
        name: { type: String, required: true },
        description: { type: String },
        duration: { type: String },
        responsible: { type: String }
      }],
      inputs: [{ type: String }],
      outputs: [{ type: String }],
      failurePoints: [{ type: String }]
    }],
    keyMetrics: [{
      name: { type: String, required: true },
      description: { type: String },
      targetValue: { type: String }
    }],
    tools: [{
      name: { type: String, required: true },
      purpose: { type: String },
      alternatives: [{ type: String }]
    }],
    resources: [{
      title: { type: String, required: true },
      type: {
        type: String,
        enum: ['article', 'video', 'course', 'template'],
        default: 'article'
      },
      url: { type: String },
      description: { type: String }
    }],
    tags: [{ type: String }]
  },
  {
    timestamps: true,
    collection: 'domain_knowledge'
  }
);

// Indexes
DomainKnowledgeSchema.index({ tenantId: 1, industryType: 1, category: 1 });
DomainKnowledgeSchema.index({ tenantId: 1, tags: 1 });

// Static methods
DomainKnowledgeSchema.statics.findByCategory = function(
  tenantId: string,
  industryType: IndustryType,
  category: KnowledgeCategory
): Promise<IDomainKnowledge[]> {
  return this.find({ tenantId, industryType, category });
};

DomainKnowledgeSchema.statics.searchByTerm = function(
  tenantId: string,
  industryType: IndustryType,
  searchTerm: string
): Promise<IDomainKnowledge[]> {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    tenantId,
    industryType,
    $or: [
      { title: regex },
      { description: regex },
      { 'concepts.term': regex },
      { 'terminology.term': regex },
      { tags: regex }
    ]
  });
};

export const DomainKnowledge = mongoose.model<IDomainKnowledge>('DomainKnowledge', DomainKnowledgeSchema);

export default DomainKnowledge;
