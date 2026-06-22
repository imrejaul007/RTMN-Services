import mongoose, { Document, Schema } from 'mongoose';

export interface IRiskFactor {
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  recommendation: string;
  clauseReference?: string;
}

export interface IRiskClause {
  clauseId: string;
  title: string;
  type: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  riskFactors: IRiskFactor[];
  originalText: string;
  suggestedModification?: string;
}

export interface IRiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface IRiskTrend {
  date: Date;
  score: number;
  category: string;
}

export interface IRiskReport {
  reportId: string;
  documentId: string;
  tenantId: string;
  overallRiskScore: number;
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  riskDistribution: IRiskDistribution;
  highRiskClauses: IRiskClause[];
  mediumRiskClauses: IRiskClause[];
  lowRiskClauses: IRiskClause[];
  riskFactors: IRiskFactor[];
  complianceAlerts: {
    framework: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }[];
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  riskTrends: IRiskTrend[];
  generatedAt: Date;
  modelVersion: string;
  metadata: {
    totalClauses: number;
    analyzedClauses: number;
    confidence: number;
    analysisDuration: number;
  };
}

export interface IRiskReportDocument extends IRiskReport, Document {}

const RiskFactorSchema = new Schema<IRiskFactor>({
  category: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
  impact: { type: String, required: true },
  recommendation: { type: String, required: true },
  clauseReference: String
}, { _id: false });

const RiskClauseSchema = new Schema<IRiskClause>({
  clauseId: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
  riskScore: { type: Number, required: true },
  riskFactors: [RiskFactorSchema],
  originalText: { type: String, required: true },
  suggestedModification: String
}, { _id: false });

const RiskDistributionSchema = new Schema<IRiskDistribution>({
  low: { type: Number, default: 0 },
  medium: { type: Number, default: 0 },
  high: { type: Number, default: 0 },
  critical: { type: Number, default: 0 }
}, { _id: false });

const ComplianceAlertSchema = new Schema({
  framework: { type: String, required: true },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
  description: { type: String, required: true }
}, { _id: false });

const RiskTrendSchema = new Schema<IRiskTrend>({
  date: { type: Date, required: true },
  score: { type: Number, required: true },
  category: { type: String, required: true }
}, { _id: false });

const RiskReportMetadataSchema = new Schema({
  totalClauses: { type: Number, required: true },
  analyzedClauses: { type: Number, required: true },
  confidence: { type: Number, required: true },
  analysisDuration: { type: Number, required: true }
}, { _id: false });

const RiskReportSchema = new Schema<IRiskReportDocument>({
  reportId: { type: String, required: true, unique: true, index: true },
  documentId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  overallRiskScore: { type: Number, required: true },
  riskLevel: {
    type: String,
    enum: ['minimal', 'low', 'moderate', 'high', 'critical'],
    required: true
  },
  riskDistribution: RiskDistributionSchema,
  highRiskClauses: [RiskClauseSchema],
  mediumRiskClauses: [RiskClauseSchema],
  lowRiskClauses: [RiskClauseSchema],
  riskFactors: [RiskFactorSchema],
  complianceAlerts: [ComplianceAlertSchema],
  summary: { type: String, required: true },
  keyFindings: [{ type: String }],
  recommendations: [{ type: String }],
  riskTrends: [RiskTrendSchema],
  generatedAt: { type: Date, required: true },
  modelVersion: { type: String, required: true },
  metadata: RiskReportMetadataSchema
}, { timestamps: true });

RiskReportSchema.index({ documentId: 1, tenantId: 1 });
RiskReportSchema.index({ overallRiskScore: 1 });
RiskReportSchema.index({ 'riskFactors.category': 1 });

export const RiskReportModel = mongoose.model<IRiskReportDocument>(
  'RiskReport',
  RiskReportSchema
);

// Risk score thresholds
export const RISK_THRESHOLDS = {
  minimal: { min: 0, max: 10 },
  low: { min: 11, max: 30 },
  moderate: { min: 31, max: 50 },
  high: { min: 51, max: 75 },
  critical: { min: 76, max: 100 }
};

export function getRiskLevel(score: number): IRiskReport['riskLevel'] {
  if (score <= 10) return 'minimal';
  if (score <= 30) return 'low';
  if (score <= 50) return 'moderate';
  if (score <= 75) return 'high';
  return 'critical';
}
