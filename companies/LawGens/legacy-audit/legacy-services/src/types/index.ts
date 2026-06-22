/**
 * LawGens - Legal AI Platform Types
 * Complete type definitions for legal domain
 */

// Contract Types
export type ContractType = 'service' | 'purchase' | 'rental' | 'subscription' | 'partnership' | 'nda' | 'license' | 'employment' | 'lease' | 'consulting';
export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'executed' | 'expired' | 'terminated' | 'disputed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Legal Research Types
export interface LegalQuery {
  queryId: string;
  queryText: string;
  jurisdiction?: string;
  practiceArea?: PracticeArea;
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  createdAt: Date;
}

export interface CaseLaw {
  caseId: string;
  caseName: string;
  citation: string;
  court: string;
  jurisdiction: string;
  decisionDate: Date;
  practiceArea: PracticeArea;
  summary: string;
  holding: string;
  reasoning: string;
  outcome: CaseOutcome;
  precedents: string[];
  citedBy: string[];
  keyNotes: string[];
  relevanceScore: number;
}

export type PracticeArea =
  | 'corporate'
  | 'criminal'
  | 'civil'
  | 'intellectual_property'
  | 'labor_employment'
  | 'real_estate'
  | 'tax'
  | 'bankruptcy'
  | 'environmental'
  | 'securities'
  | 'antitrust'
  | 'family'
  | 'immigration'
  | 'international';

export type CaseOutcome = 'plaintiff_wins' | 'defendant_wins' | 'mixed' | 'settled' | 'dismissed' | 'appeal_pending';

// Contract Analysis Types
export interface ContractAnalysis {
  analysisId: string;
  contractId: string;
  overallRiskScore: number;
  riskLevel: RiskLevel;
  clauses: ClauseAnalysis[];
  complianceIssues: ComplianceIssue[];
  recommendations: Recommendation[];
  summary: string;
  analyzedAt: Date;
}

export interface ClauseAnalysis {
  clauseId: string;
  clauseType: ClauseType;
  originalText: string;
  summary: string;
  riskScore: number;
  riskLevel: RiskLevel;
  issues: string[];
  suggestions: string[];
  obligations: Obligation[];
  rights: Right[];
  remedies: string[];
}

export type ClauseType =
  | 'indemnification'
  | 'limitation_of_liability'
  | 'termination'
  | 'confidentiality'
  | 'non_compete'
  | 'non_solicitation'
  | 'force_majeure'
  | 'dispute_resolution'
  | 'governing_law'
  | 'assignment'
  | 'warranty'
  | 'intellectual_property'
  | 'data_protection'
  | 'payment'
  | 'delivery'
  | 'penalty'
  | 'renewal';

export interface Obligation {
  party: string;
  type: 'must' | 'should' | 'may';
  description: string;
  deadline?: Date;
  penalty?: string;
}

export interface Right {
  party: string;
  type: 'exclusive' | 'non-exclusive' | 'limited';
  description: string;
  scope?: string;
}

export interface ComplianceIssue {
  regulation: Regulation;
  severity: 'warning' | 'violation' | 'critical';
  clause: string;
  description: string;
  remediation: string;
  fine?: number;
  penalty?: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  action: string;
  impact: string;
}

// Compliance Types
export type Regulation = 'gdpr' | 'soc2' | 'sebi' | 'hipaa' | 'pci_dss' | 'iso27001' | 'sox' | 'ccpa' | 'lgpd' | 'pdpa';

export interface ComplianceCheck {
  checkId: string;
  regulation: Regulation;
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'not_applicable' | 'needs_review';
  evidence?: string;
  findings: string[];
  remediationSteps: string[];
  deadline?: Date;
  assignee?: string;
}

export interface ComplianceReport {
  reportId: string;
  organizationId: string;
  regulations: Regulation[];
  overallScore: number;
  checks: ComplianceCheck[];
  criticalIssues: ComplianceIssue[];
  summary: string;
  generatedAt: Date;
  nextAuditDate?: Date;
}

// Court Intelligence Types
export interface CourtCase {
  caseId: string;
  caseNumber: string;
  court: string;
  jurisdiction: string;
  caseType: CaseType;
  parties: Party[];
  filedDate: Date;
  status: CourtStatus;
  judge?: string;
  attorneys: Attorney[];
  docket: DocketEntry[];
  filings: Filing[];
  hearings: Hearing[];
  judgment?: Judgment;
  nextHearing?: Date;
}

export type CaseType = 'civil' | 'criminal' | 'family' | 'bankruptcy' | 'administrative' | 'appellate';
export type CourtStatus = 'pending' | 'active' | 'closed' | 'dismissed' | 'appeal_filed' | 'settled';

export interface Party {
  name: string;
  type: 'plaintiff' | 'defendant' | 'petitioner' | 'respondent' | 'appellant' | 'appellee';
  representation?: Attorney;
}

export interface Attorney {
  name: string;
  barNumber: string;
  firm: string;
  phone?: string;
  email?: string;
}

export interface DocketEntry {
  entryId: string;
  date: Date;
  description: string;
  documentType: string;
  filedBy?: string;
  docketNumber?: number;
}

export interface Filing {
  filingId: string;
  type: string;
  title: string;
  filedDate: Date;
  filedBy: string;
  status: 'pending' | 'accepted' | 'rejected';
  content?: string;
  attachments?: string[];
}

export interface Hearing {
  hearingId: string;
  date: Date;
  type: string;
  judge: string;
  courtroom: string;
  outcome?: string;
  notes?: string;
}

export interface Judgment {
  judgmentId: string;
  date: Date;
  judge: string;
  type: 'final' | 'interlocutory' | 'default';
  disposition: string;
  reasoning: string;
  remedies: string[];
  appealDeadline?: Date;
}

// Document Drafting Types
export interface DocumentTemplate {
  templateId: string;
  name: string;
  type: DocumentType;
  category: string;
  description: string;
  jurisdiction?: string;
  variables: TemplateVariable[];
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentType =
  | 'contract'
  | 'agreement'
  | 'letter'
  | 'memorandum'
  | 'motion'
  | 'brief'
  | 'affidavit'
  | 'notice'
  | 'policy'
  | 'resolution';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'date' | 'number' | 'boolean' | 'party' | 'amount';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: string;
}

export interface DraftedDocument {
  documentId: string;
  templateId?: string;
  type: DocumentType;
  title: string;
  content: string;
  parties: Party[];
  jurisdiction: string;
  effectiveDate?: Date;
  createdAt: Date;
  status: 'draft' | 'finalized' | 'signed';
  metadata?: Record<string, any>;
}

// e-Discovery Types
export interface DiscoveryMatter {
  matterId: string;
  caseId?: string;
  name: string;
  description: string;
  custodians: string[];
  dataSources: DataSource[];
  collectedDocuments: number;
  processedDocuments: number;
  reviewedDocuments: number;
  privilegeLogs: PrivilegeLogEntry[];
  status: MatterStatus;
  createdAt: Date;
}

export type MatterStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface DataSource {
  type: 'email' | 'file_share' | 'database' | 'cloud' | 'social_media';
  name: string;
  format: string;
  size: number;
  collectedAt?: Date;
}

export interface PrivilegeLogEntry {
  entryId: string;
  documentId: string;
  documentType: string;
  author: string;
  date: Date;
  privilege: 'attorney_client' | 'attorney_work_product' | 'common_law';
  basis: string;
  redactedVersion?: string;
}

// Legal Research Result
export interface ResearchResult {
  resultId: string;
  query: string;
  cases: CaseLaw[];
  statutes: Statute[];
  regulations: string[];
  articles: string[];
  totalResults: number;
  searchTime: number;
  filters: SearchFilters;
}

export interface Statute {
  statuteId: string;
  title: string;
  citation: string;
  jurisdiction: string;
  effectiveDate: Date;
  text: string;
  sections: string[];
  amendments: Amendment[];
}

export interface Amendment {
  date: Date;
  description: string;
  affectedSections: string[];
}

export interface SearchFilters {
  practiceArea?: PracticeArea;
  jurisdiction?: string;
  dateRange?: { start: Date; end: Date };
  outcome?: CaseOutcome;
  courtLevel?: 'trial' | 'appellate' | 'supreme';
}

// API Request/Response Types
export interface LegalResearchRequest {
  query: string;
  jurisdiction?: string;
  practiceArea?: PracticeArea;
  dateRange?: { start: string; end: string };
  filters?: SearchFilters;
}

export interface ContractAnalysisRequest {
  contractText: string;
  contractType: ContractType;
  jurisdiction?: string;
  analyzeRisk?: boolean;
  checkCompliance?: Regulation[];
}

export interface ComplianceCheckRequest {
  organizationId: string;
  regulations: Regulation[];
  evidence?: Record<string, string>;
}

export interface CourtDocketRequest {
  court: string;
  caseNumber?: string;
  partyName?: string;
  dateRange?: { start: string; end: string };
}

export interface DocumentDraftRequest {
  type: DocumentType;
  templateId?: string;
  parties: Party[];
  variables: Record<string, any>;
  jurisdiction: string;
  effectiveDate?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// HOJAI AI Integration Types
export interface HojaiAnalysisRequest {
  service: 'legal_research' | 'contract_analysis' | 'compliance_check' | 'court_intelligence';
  prompt: string;
  context?: Record<string, any>;
  options?: Record<string, any>;
}

export interface HojaiAnalysisResponse {
  analysis: string;
  confidence: number;
  recommendations: string[];
  sources?: string[];
  metadata?: Record<string, any>;
}