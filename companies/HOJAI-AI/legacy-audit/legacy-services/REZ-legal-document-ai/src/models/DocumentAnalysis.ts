import mongoose, { Document, Schema } from 'mongoose';

export interface IClause {
  id: string;
  type: 'confidentiality' | 'termination' | 'liability' | 'indemnification' | 'payment' | 'intellectual_property' | 'warranty' | 'force_majeure' | 'dispute_resolution' | 'governing_law' | 'assignment' | 'amendment' | 'notice' | 'severability' | 'entire_agreement' | 'other';
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
  risk: 'low' | 'medium' | 'high';
  riskScore: number;
  riskFactors: string[];
  recommendations: string[];
  complianceMappings: {
    framework: string;
    status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
    details?: string;
  }[];
}

export interface IComplianceCheck {
  framework: string;
  status: 'compliant' | 'non_compliant' | 'partial';
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface IEntity {
  parties: string[];
  dates: string[];
  amounts: string[];
  currencies: string[];
  jurisdictions: string[];
  contracts: string[];
  penalties: string[];
}

export interface IDocumentAnalysis {
  documentId: string;
  summary: string;
  keyParties: string[];
  effectiveDate?: string;
  expirationDate?: string;
  clauses: IClause[];
  riskScore: number;
  complianceChecks: IComplianceCheck[];
  entities: IEntity;
  confidence: number;
  analyzedAt: Date;
  analysisDuration: number;
  modelVersion: string;
}

export interface IDocumentAnalysisDocument extends IDocumentAnalysis, Document {}

const ClauseSchema = new Schema<IClause>({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['confidentiality', 'termination', 'liability', 'indemnification', 'payment',
           'intellectual_property', 'warranty', 'force_majeure', 'dispute_resolution',
           'governing_law', 'assignment', 'amendment', 'notice', 'severability',
           'entire_agreement', 'other'],
    required: true
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },
  risk: { type: String, enum: ['low', 'medium', 'high'], required: true },
  riskScore: { type: Number, required: true },
  riskFactors: [{ type: String }],
  recommendations: [{ type: String }],
  complianceMappings: [{
    framework: String,
    status: { type: String, enum: ['compliant', 'non_compliant', 'partial', 'not_applicable'] },
    details: String
  }]
}, { _id: false });

const ComplianceCheckSchema = new Schema<IComplianceCheck>({
  framework: { type: String, required: true },
  status: { type: String, enum: ['compliant', 'non_compliant', 'partial'], required: true },
  score: { type: Number, required: true },
  issues: [{ type: String }],
  recommendations: [{ type: String }]
}, { _id: false });

const EntitySchema = new Schema<IEntity>({
  parties: [{ type: String }],
  dates: [{ type: String }],
  amounts: [{ type: String }],
  currencies: [{ type: String }],
  jurisdictions: [{ type: String }],
  contracts: [{ type: String }],
  penalties: [{ type: String }]
}, { _id: false });

const DocumentAnalysisSchema = new Schema<IDocumentAnalysisDocument>({
  documentId: { type: String, required: true, unique: true, index: true },
  summary: { type: String, required: true },
  keyParties: [{ type: String }],
  effectiveDate: { type: String },
  expirationDate: { type: String },
  clauses: [ClauseSchema],
  riskScore: { type: Number, required: true },
  complianceChecks: [ComplianceCheckSchema],
  entities: EntitySchema,
  confidence: { type: Number, required: true, min: 0, max: 1 },
  analyzedAt: { type: Date, required: true },
  analysisDuration: { type: Number, required: true },
  modelVersion: { type: String, required: true }
}, { timestamps: true });

export const DocumentAnalysisModel = mongoose.model<IDocumentAnalysisDocument>(
  'DocumentAnalysis',
  DocumentAnalysisSchema
);
