/**
 * ComplianceOS - Shared Types and Interfaces
 * Production-ready compliance management for SUTAR
 */

// Framework Types
export type ComplianceFramework =
  | 'SOC2_TYPE2'
  | 'ISO27001'
  | 'GDPR'
  | 'HIPAA'
  | 'PCI_DSS'
  | 'UAE_AI'
  | 'SAUDI_PDPL';

export type ControlStatus =
  | 'implemented'
  | 'partially_implemented'
  | 'not_implemented'
  | 'not_applicable'
  | 'in_progress';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type EvidenceStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type PolicyType =
  | 'data_retention'
  | 'access_control'
  | 'encryption'
  | 'audit_requirements'
  | 'incident_response'
  | 'vendor_management';

// Control Definition
export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  controlNumber: string;
  title: string;
  description: string;
  status: ControlStatus;
  riskLevel: RiskLevel;
  category: string;
  subcategory?: string;
  implementation?: string;
  evidence?: Evidence[];
  owner?: string;
  lastReviewed?: Date;
  nextReview?: Date;
  findings?: Finding[];
  remediation?: Remediation[];
  testProcedures?: TestProcedure[];
  dependencies?: string[];
  automationLevel: 'manual' | 'semi_automated' | 'fully_automated';
  lastAssessmentDate?: Date;
  effectivenessScore?: number;
}

export interface Evidence {
  id: string;
  controlId: string;
  type: EvidenceType;
  source: string;
  content: string | object;
  collectedAt: Date;
  collectedBy: string;
  status: EvidenceStatus;
  approvedBy?: string;
  approvedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  hash?: string;
  signature?: string;
}

export type EvidenceType =
  | 'system_log'
  | 'access_record'
  | 'config_snapshot'
  | 'screen_recording'
  | 'network_traffic'
  | 'certificate'
  | 'policy_document'
  | 'training_record'
  | 'incident_report'
  | 'configuration_evidence'
  | 'automated_check';

// Audit Trail
export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  action: string;
  resource: string;
  resourceId?: string;
  previousState?: object;
  newState?: object;
  metadata?: Record<string, any>;
  hash: string;
  previousHash?: string;
  signature?: string;
  chainValid?: boolean;
}

export type AuditEventType =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'configuration_change'
  | 'system_access'
  | 'policy_violation'
  | 'incident'
  | 'remediation'
  | 'compliance_check'
  | 'evidence_collection'
  | 'report_generation';

export interface AuditSearchParams {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  severity?: AuditSeverity;
  userId?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export interface AuditChainIntegrity {
  valid: boolean;
  brokenAt?: string;
  totalEvents: number;
  verifiedEvents: number;
  lastVerified?: Date;
}

// Evidence Collection
export interface EvidenceCollectionJob {
  id: string;
  controlId: string;
  evidenceType: EvidenceType;
  source: string;
  scheduledAt: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: Evidence;
  error?: string;
  retries: number;
}

export interface EvidenceCollector {
  type: EvidenceType;
  collect(controlId: string): Promise<Partial<Evidence>>;
  validate?(evidence: Partial<Evidence>): Promise<boolean>;
}

// Reports
export interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  type: ReportType;
  generatedAt: Date;
  generatedBy: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: ReportSummary;
  controls: ControlSummary[];
  findings: Finding[];
  riskAssessment: RiskAssessment;
  recommendations: Recommendation[];
  evidenceCoverage: EvidenceCoverage;
  complianceScore: number;
  status: 'draft' | 'review' | 'approved' | 'archived';
  approvedBy?: string;
  approvedAt?: Date;
  downloadUrl?: string;
}

export type ReportType =
  | 'gap_analysis'
  | 'risk_assessment'
  | 'control_effectiveness'
  | 'incident_summary'
  | 'remediation_plan'
  | 'executive_summary'
  | 'audit_readiness';

export interface ReportSummary {
  totalControls: number;
  implemented: number;
  partiallyImplemented: number;
  notImplemented: number;
  notApplicable: number;
  overallScore: number;
  riskExposure: number;
  complianceTrend: 'improving' | 'stable' | 'declining';
}

export interface ControlSummary {
  controlId: string;
  controlNumber: string;
  title: string;
  status: ControlStatus;
  evidenceCount: number;
  lastEvidenceDate?: Date;
  riskLevel: RiskLevel;
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  riskMatrix: RiskMatrixEntry[];
  trendAnalysis: TrendAnalysis;
}

export interface RiskMatrixEntry {
  controlId: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: RiskLevel;
  mitigatingControls?: string[];
}

export interface TrendAnalysis {
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  periodDays: number;
}

export interface Recommendation {
  id: string;
  controlId?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedEffort: 'days' | 'weeks' | 'months';
  estimatedCost?: number;
  owner?: string;
  deadline?: Date;
  status: 'open' | 'in_progress' | 'completed' | 'deferred';
}

export interface EvidenceCoverage {
  totalEvidenceRequired: number;
  evidenceCollected: number;
  pendingEvidence: number;
  expiredEvidence: number;
  coveragePercent: number;
  gaps: EvidenceGap[];
}

export interface EvidenceGap {
  controlId: string;
  evidenceType: EvidenceType;
  reason: string;
  riskLevel: RiskLevel;
}

// Findings
export interface Finding {
  id: string;
  controlId: string;
  title: string;
  description: string;
  severity: AuditSeverity;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted' | 'false_positive';
  detectedAt: Date;
  detectedBy: string;
  affectedSystems?: string[];
  remediation?: Remediation;
  evidence?: string[];
  notes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface Remediation {
  id: string;
  findingId?: string;
  controlId?: string;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'deferred';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  evidence?: string[];
  cost?: number;
}

export interface TestProcedure {
  id: string;
  controlId: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  lastExecuted?: Date;
  lastResult?: 'pass' | 'fail' | 'error';
  automated: boolean;
}

// Policy Engine
export interface Policy {
  id: string;
  name: string;
  type: PolicyType;
  description: string;
  rules: PolicyRule[];
  enforcement: 'strict' | 'advisory' | 'monitoring';
  applicableFrameworks: ComplianceFramework[];
  owner: string;
  version: string;
  effectiveDate: Date;
  reviewDate?: Date;
  status: 'active' | 'draft' | 'archived';
  lastEvaluated?: Date;
  violations?: PolicyViolation[];
}

export interface PolicyRule {
  id: string;
  condition: PolicyCondition;
  action: PolicyAction;
  metadata?: Record<string, any>;
}

export interface PolicyCondition {
  type: 'attribute' | 'behavior' | 'temporal' | 'composite';
  attribute?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
  };
  behavior?: {
    pattern: string;
    threshold?: number;
    window?: number;
  };
  temporal?: {
    start?: string;
    end?: string;
    days?: string[];
  };
  composite?: {
    operator: 'AND' | 'OR' | 'NOT';
    conditions: PolicyCondition[];
  };
}

export interface PolicyAction {
  type: 'allow' | 'deny' | 'alert' | 'require_approval' | 'quarantine' | 'notify';
  severity?: AuditSeverity;
  message?: string;
  notifyUsers?: string[];
  remediationSteps?: string[];
}

export interface PolicyViolation {
  id: string;
  policyId: string;
  ruleId: string;
  resource: string;
  resourceId: string;
  userId?: string;
  detectedAt: Date;
  severity: AuditSeverity;
  details: object;
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface PolicyEvaluationRequest {
  resourceType: string;
  resourceId: string;
  action: string;
  userId?: string;
  context?: Record<string, any>;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  policyId?: string;
  ruleId?: string;
  action: PolicyAction;
  reasons: string[];
  metadata?: Record<string, any>;
}

// Framework Mappings
export interface FrameworkMapping {
  framework: ComplianceFramework;
  name: string;
  description: string;
  controlCount: number;
  categories: FrameworkCategory[];
  version?: string;
  lastUpdated: Date;
  certifyingBody?: string;
  geographicScope?: string[];
}

export interface FrameworkCategory {
  id: string;
  name: string;
  controlCount: number;
  controls: string[];
}

// Retention Policies
export interface RetentionPolicy {
  id: string;
  dataType: string;
  retentionPeriod: number;
  retentionUnit: 'days' | 'months' | 'years';
  storageLocation: string;
  disposalMethod: 'delete' | 'anonymize' | 'archive';
  legalHold?: boolean;
  framework?: ComplianceFramework;
}

// Pagination
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Export Formats
export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf' | 'xml';

// Stats
export interface ComplianceStats {
  framework: ComplianceFramework;
  totalControls: number;
  implemented: number;
  partiallyImplemented: number;
  notImplemented: number;
  notApplicable: number;
  complianceScore: number;
  lastAssessment?: Date;
  nextAssessment?: Date;
  trend: 'improving' | 'stable' | 'declining';
}
