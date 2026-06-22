import mongoose, { Schema, Model } from 'mongoose';

export interface IStandardClause {
  _id?: mongoose.Types.ObjectId;
  clauseId: string;
  title: string;
  type: 'confidentiality' | 'termination' | 'liability' | 'indemnification' | 'payment' |
        'intellectual_property' | 'warranty' | 'force_majeure' | 'dispute_resolution' |
        'governing_law' | 'assignment' | 'amendment' | 'notice' | 'severability' |
        'entire_agreement' | 'other';
  content: string;
  summary: string;
  keywords: string[];
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  recommendations: string[];
  complianceMappings: {
    framework: string;
    isCompliant: boolean;
    notes?: string;
  }[];
  usageExamples: string[];
  jurisdiction: string[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  embedding?: number[];
}

export interface IStandardClauseDocument extends IStandardClause {
  _id: mongoose.Types.ObjectId;
}

const ComplianceMappingSchema = new Schema({
  framework: { type: String, required: true },
  isCompliant: { type: Boolean, required: true },
  notes: String
}, { _id: false });

const StandardClauseSchema = new Schema({
  clauseId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['confidentiality', 'termination', 'liability', 'indemnification', 'payment',
           'intellectual_property', 'warranty', 'force_majeure', 'dispute_resolution',
           'governing_law', 'assignment', 'amendment', 'notice', 'severability',
           'entire_agreement', 'other'],
    required: true
  },
  content: { type: String, required: true },
  summary: { type: String, required: true },
  keywords: [{ type: String }],
  riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
  riskFactors: [{ type: String }],
  recommendations: [{ type: String }],
  complianceMappings: [ComplianceMappingSchema],
  usageExamples: [{ type: String }],
  jurisdiction: [{ type: String }],
  version: { type: String, default: '1.0.0' },
  isActive: { type: Boolean, default: true },
  embedding: [{ type: Number }]
}, { timestamps: true });

StandardClauseSchema.index({ type: 1 });
StandardClauseSchema.index({ keywords: 1 });

export const ClauseModel: Model<IStandardClauseDocument> = mongoose.model<IStandardClauseDocument>(
  'StandardClause',
  StandardClauseSchema
);

// Pre-defined clause types for reference
export const CLAUSE_TYPES = [
  'confidentiality',
  'termination',
  'liability',
  'indemnification',
  'payment',
  'intellectual_property',
  'warranty',
  'force_majeure',
  'dispute_resolution',
  'governing_law',
  'assignment',
  'amendment',
  'notice',
  'severability',
  'entire_agreement',
  'other'
] as const;

export const RISK_LEVELS = ['low', 'medium', 'high'] as const;
