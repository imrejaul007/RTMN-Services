/**
 * LawGens MongoDB Models
 * Database schemas for legal platform
 */

import mongoose, { Document, Schema } from 'mongoose';
import {
  ContractType,
  ContractStatus,
  PracticeArea,
  CaseOutcome,
  ClauseType,
  RiskLevel,
  Regulation,
  CaseType,
  CourtStatus,
  MatterStatus,
  DocumentType,
} from '../types';

// ============================================================================
// Contract Analysis Models
// ============================================================================

export interface IContractAnalysis {
  analysisId: string;
  contractId: string;
  contractText: string;
  contractType: ContractType;
  overallRiskScore: number;
  riskLevel: RiskLevel;
  clauses: {
    clauseId: string;
    clauseType: ClauseType;
    originalText: string;
    summary: string;
    riskScore: number;
    riskLevel: RiskLevel;
    issues: string[];
    suggestions: string[];
  }[];
  complianceIssues: {
    regulation: Regulation;
    severity: 'warning' | 'violation' | 'critical';
    clause: string;
    description: string;
    remediation: string;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    action: string;
  }[];
  summary: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClauseAnalysisSchema = new Schema({
  clauseId: { type: String, required: true },
  clauseType: {
    type: String,
    enum: Object.values([
      'indemnification', 'limitation_of_liability', 'termination', 'confidentiality',
      'non_compete', 'non_solicitation', 'force_majeure', 'dispute_resolution',
      'governing_law', 'assignment', 'warranty', 'intellectual_property',
      'data_protection', 'payment', 'delivery', 'penalty', 'renewal',
    ]),
    required: true,
  },
  originalText: { type: String, required: true },
  summary: { type: String },
  riskScore: { type: Number, min: 0, max: 100 },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  issues: [{ type: String }],
  suggestions: [{ type: String }],
}, { _id: false });

const ComplianceIssueSchema = new Schema({
  regulation: {
    type: String,
    enum: ['gdpr', 'soc2', 'sebi', 'hipaa', 'pci_dss', 'iso27001', 'sox', 'ccpa', 'lgpd', 'pdpa'],
    required: true,
  },
  severity: { type: String, enum: ['warning', 'violation', 'critical'] },
  clause: { type: String },
  description: { type: String },
  remediation: { type: String },
}, { _id: false });

const RecommendationSchema = new Schema({
  priority: { type: String, enum: ['high', 'medium', 'low'] },
  category: { type: String },
  title: { type: String },
  description: { type: String },
  action: { type: String },
}, { _id: false });

const ContractAnalysisSchema = new Schema<IContractAnalysis>(
  {
    analysisId: { type: String, required: true, unique: true, index: true },
    contractId: { type: String, index: true },
    contractText: { type: String, required: true },
    contractType: {
      type: String,
      enum: ['service', 'purchase', 'rental', 'subscription', 'partnership', 'nda', 'license', 'employment', 'lease', 'consulting'],
      required: true,
    },
    overallRiskScore: { type: Number, min: 0, max: 100, required: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    clauses: [ClauseAnalysisSchema],
    complianceIssues: [ComplianceIssueSchema],
    recommendations: [RecommendationSchema],
    summary: { type: String },
  },
  { timestamps: true, collection: 'contract_analyses' }
);

ContractAnalysisSchema.index({ contractId: 1 });
ContractAnalysisSchema.index({ riskLevel: 1 });
ContractAnalysisSchema.index({ contractType: 1 });
ContractAnalysisSchema.index({ createdAt: -1 });

// ============================================================================
// Legal Research Models
// ============================================================================

export interface ILegalResearch {
  researchId: string;
  query: string;
  jurisdiction?: string;
  practiceArea?: PracticeArea;
  results: {
    cases: {
      caseId: string;
      caseName: string;
      citation: string;
      court: string;
      decisionDate: Date;
      summary: string;
      relevanceScore: number;
    }[];
    statutes: {
      statuteId: string;
      title: string;
      citation: string;
      text: string;
    }[];
  };
  totalResults: number;
  searchTime: number;
  createdAt: Date;
}

const CaseResultSchema = new Schema({
  caseId: { type: String, required: true },
  caseName: { type: String, required: true },
  citation: { type: String },
  court: { type: String },
  decisionDate: { type: Date },
  summary: { type: String },
  relevanceScore: { type: Number },
}, { _id: false });

const StatuteResultSchema = new Schema({
  statuteId: { type: String, required: true },
  title: { type: String, required: true },
  citation: { type: String },
  text: { type: String },
}, { _id: false });

const LegalResearchSchema = new Schema<ILegalResearch>(
  {
    researchId: { type: String, required: true, unique: true, index: true },
    query: { type: String, required: true },
    jurisdiction: { type: String },
    practiceArea: { type: String },
    results: {
      cases: [CaseResultSchema],
      statutes: [StatuteResultSchema],
    },
    totalResults: { type: Number },
    searchTime: { type: Number },
  },
  { timestamps: true, collection: 'legal_researches' }
);

LegalResearchSchema.index({ query: 'text' });
LegalResearchSchema.index({ practiceArea: 1 });
LegalResearchSchema.index({ createdAt: -1 });

// ============================================================================
// Compliance Models
// ============================================================================

export interface IComplianceCheck {
  checkId: string;
  organizationId: string;
  regulation: Regulation;
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'not_applicable' | 'needs_review';
  evidence?: string;
  findings: string[];
  remediationSteps: string[];
  deadline?: Date;
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceCheckSchema = new Schema<IComplianceCheck>(
  {
    checkId: { type: String, required: true, unique: true, index: true },
    organizationId: { type: String, required: true, index: true },
    regulation: {
      type: String,
      enum: ['gdpr', 'soc2', 'sebi', 'hipaa', 'pci_dss', 'iso27001', 'sox', 'ccpa', 'lgpd', 'pdpa'],
      required: true,
    },
    requirement: { type: String, required: true },
    status: {
      type: String,
      enum: ['compliant', 'non_compliant', 'not_applicable', 'needs_review'],
      default: 'needs_review',
    },
    evidence: { type: String },
    findings: [{ type: String }],
    remediationSteps: [{ type: String }],
    deadline: { type: Date },
    assignee: { type: String },
  },
  { timestamps: true, collection: 'compliance_checks' }
);

ComplianceCheckSchema.index({ organizationId: 1, regulation: 1 });
ComplianceCheckSchema.index({ status: 1 });

// ============================================================================
// Court Case Models
// ============================================================================

export interface ICourtCase {
  caseId: string;
  caseNumber: string;
  court: string;
  jurisdiction: string;
  caseType: CaseType;
  parties: {
    name: string;
    type: 'plaintiff' | 'defendant' | 'petitioner' | 'respondent' | 'appellant' | 'appellee';
  }[];
  filedDate: Date;
  status: CourtStatus;
  judge?: string;
  docket: {
    entryId: string;
    date: Date;
    description: string;
    documentType: string;
  }[];
  filings: {
    filingId: string;
    type: string;
    title: string;
    filedDate: Date;
    status: 'pending' | 'accepted' | 'rejected';
  }[];
  nextHearing?: Date;
  lastUpdated: Date;
}

const PartySchema = new Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['plaintiff', 'defendant', 'petitioner', 'respondent', 'appellant', 'appellee'],
    required: true,
  },
}, { _id: false });

const DocketEntrySchema = new Schema({
  entryId: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  documentType: { type: String },
}, { _id: false });

const FilingSchema = new Schema({
  filingId: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  filedDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
}, { _id: false });

const CourtCaseSchema = new Schema<ICourtCase>(
  {
    caseId: { type: String, required: true, unique: true, index: true },
    caseNumber: { type: String, required: true, index: true },
    court: { type: String, required: true },
    jurisdiction: { type: String, required: true },
    caseType: {
      type: String,
      enum: ['civil', 'criminal', 'family', 'bankruptcy', 'administrative', 'appellate'],
      required: true,
    },
    parties: [PartySchema],
    filedDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'closed', 'dismissed', 'appeal_filed', 'settled'],
      default: 'pending',
    },
    judge: { type: String },
    docket: [DocketEntrySchema],
    filings: [FilingSchema],
    nextHearing: { type: Date },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'court_cases' }
);

CourtCaseSchema.index({ caseNumber: 1, court: 1 });
CourtCaseSchema.index({ status: 1 });
CourtCaseSchema.index({ 'parties.name': 1 });
CourtCaseSchema.index({ nextHearing: 1 });

// ============================================================================
// Document Template Models
// ============================================================================

export interface IDocumentTemplate {
  templateId: string;
  name: string;
  type: DocumentType;
  category: string;
  description: string;
  jurisdiction?: string;
  variables: {
    name: string;
    type: 'string' | 'date' | 'number' | 'boolean' | 'party' | 'amount';
    required: boolean;
    description: string;
    defaultValue?: any;
  }[];
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateVariableSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['string', 'date', 'number', 'boolean', 'party', 'amount'], required: true },
  required: { type: Boolean, default: true },
  description: { type: String },
  defaultValue: { type: Schema.Types.Mixed },
}, { _id: false });

const DocumentTemplateSchema = new Schema<IDocumentTemplate>(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['contract', 'agreement', 'letter', 'memorandum', 'motion', 'brief', 'affidavit', 'notice', 'policy', 'resolution'],
      required: true,
    },
    category: { type: String, required: true },
    description: { type: String },
    jurisdiction: { type: String },
    variables: [TemplateVariableSchema],
    content: { type: String, required: true },
  },
  { timestamps: true, collection: 'document_templates' }
);

DocumentTemplateSchema.index({ type: 1, category: 1 });
DocumentTemplateSchema.index({ name: 'text' });

// ============================================================================
// Drafted Document Models
// ============================================================================

export interface IDraftedDocument {
  documentId: string;
  templateId?: string;
  type: DocumentType;
  title: string;
  content: string;
  parties: {
    name: string;
    type: string;
  }[];
  jurisdiction: string;
  effectiveDate?: Date;
  status: 'draft' | 'finalized' | 'signed';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DraftedDocumentSchema = new Schema<IDraftedDocument>(
  {
    documentId: { type: String, required: true, unique: true, index: true },
    templateId: { type: String, index: true },
    type: {
      type: String,
      enum: ['contract', 'agreement', 'letter', 'memorandum', 'motion', 'brief', 'affidavit', 'notice', 'policy', 'resolution'],
      required: true,
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    parties: [PartySchema],
    jurisdiction: { type: String, required: true },
    effectiveDate: { type: Date },
    status: { type: String, enum: ['draft', 'finalized', 'signed'], default: 'draft' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'drafted_documents' }
);

DraftedDocumentSchema.index({ templateId: 1 });
DraftedDocumentSchema.index({ status: 1 });
DraftedDocumentSchema.index({ createdAt: -1 });

// ============================================================================
// e-Discovery Matter Models
// ============================================================================

export interface IDiscoveryMatter {
  matterId: string;
  caseId?: string;
  name: string;
  description: string;
  custodians: string[];
  dataSources: {
    type: 'email' | 'file_share' | 'database' | 'cloud' | 'social_media';
    name: string;
    format: string;
    size: number;
    collectedAt?: Date;
  }[];
  collectedDocuments: number;
  processedDocuments: number;
  reviewedDocuments: number;
  status: MatterStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DataSourceSchema = new Schema({
  type: { type: String, enum: ['email', 'file_share', 'database', 'cloud', 'social_media'], required: true },
  name: { type: String, required: true },
  format: { type: String },
  size: { type: Number },
  collectedAt: { type: Date },
}, { _id: false });

const DiscoveryMatterSchema = new Schema<IDiscoveryMatter>(
  {
    matterId: { type: String, required: true, unique: true, index: true },
    caseId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    custodians: [{ type: String }],
    dataSources: [DataSourceSchema],
    collectedDocuments: { type: Number, default: 0 },
    processedDocuments: { type: Number, default: 0 },
    reviewedDocuments: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'on_hold', 'completed', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true, collection: 'discovery_matters' }
);

DiscoveryMatterSchema.index({ caseId: 1 });
DiscoveryMatterSchema.index({ status: 1 });

// ============================================================================
// Export Models
// ============================================================================

export const ContractAnalysis = mongoose.model<IContractAnalysis>('ContractAnalysis', ContractAnalysisSchema);
export const LegalResearch = mongoose.model<ILegalResearch>('LegalResearch', LegalResearchSchema);
export const ComplianceCheck = mongoose.model<IComplianceCheck>('ComplianceCheck', ComplianceCheckSchema);
export const CourtCase = mongoose.model<ICourtCase>('CourtCase', CourtCaseSchema);
export const DocumentTemplate = mongoose.model<IDocumentTemplate>('DocumentTemplate', DocumentTemplateSchema);
export const DraftedDocument = mongoose.model<IDraftedDocument>('DraftedDocument', DraftedDocumentSchema);
export const DiscoveryMatter = mongoose.model<IDiscoveryMatter>('DiscoveryMatter', DiscoveryMatterSchema);

// MongoDB Document type alias
type DocumentSchema = mongoose.Document;

export default {
  ContractAnalysis,
  LegalResearch,
  ComplianceCheck,
  CourtCase,
  DocumentTemplate,
  DraftedDocument,
  DiscoveryMatter,
};
