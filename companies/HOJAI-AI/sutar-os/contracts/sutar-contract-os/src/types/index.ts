// ============================================================================
// SUTAR Contract OS - Type Definitions
// ============================================================================

// Core Types
export type ContractStatus = 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'disputed' | 'archived';
export type ContractType = 'service' | 'nda' | 'partnership' | 'employment' | 'licensing' | 'vendor' | 'customer' | 'consulting' | 'lease' | 'freelance';
export type SignatureStatus = 'pending' | 'signed' | 'rejected' | 'expired';
export type WorkflowStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
export type WorkflowStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
export type AmendmentStatus = 'pending' | 'approved' | 'rejected' | 'applied';
export type SLAMetricType = 'uptime' | 'response_time' | 'delivery' | 'quality' | 'support';
export type SLAMetricUnit = 'percentage' | 'hours' | 'days' | 'count';

// Contract Interface
export interface Contract {
  id: string;
  type: ContractType;
  title: string;
  description?: string;
  parties: Party[];
  terms: string;
  clauses: Clause[];
  startDate: string;
  endDate: string;
  value?: number;
  currency?: string;
  paymentTerms?: PaymentTerms;
  status: ContractStatus;
  signatures: Signature[];
  metadata?: Record<string, any>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  workflowId?: string;
  slaId?: string;
  parentContractId?: string;
  renewalCount?: number;
  autoRenew?: boolean;
  renewalNoticeDays?: number;
}

// Party Interface
export interface Party {
  id: string;
  name: string;
  email: string;
  role: string;
  entityType?: 'individual' | 'company' | 'government';
  address?: Address;
  phone?: string;
  taxId?: string;
  signed: boolean;
  signedAt?: string;
  signatoryName?: string;
  verificationStatus?: 'verified' | 'pending' | 'failed';
  trustEngineId?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Clause Interface
export interface Clause {
  id: string;
  title: string;
  content: string;
  required: boolean;
  category: string;
  order: number;
  variables?: ClauseVariable[];
  version?: number;
}

export interface ClauseVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'percentage';
  defaultValue?: string;
  description?: string;
}

// Signature Interface
export interface Signature {
  id: string;
  partyId: string;
  partyName: string;
  signature: string;
  signatureType: 'electronic' | 'digital' | 'wet';
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
  status: SignatureStatus;
  hash?: string;
  certificate?: string;
  expiresAt?: string;
}

// Payment Terms
export interface PaymentTerms {
  method: 'bank_transfer' | 'credit_card' | 'check' | 'crypto' | 'upi';
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'annually';
  netDays: number;
  advancePercentage?: number;
  lateFeePercentage?: number;
  currency: string;
}

// Template Interface
export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  type: ContractType;
  category: string;
  terms: string;
  clauses: Clause[];
  variables: TemplateVariable[];
  metadata?: Record<string, any>;
  usageCount: number;
  rating?: number;
  tags: string[];
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  defaultValue?: string;
  options?: string[];
  description?: string;
  placeholder?: string;
}

// Clause Library Interface
export interface ClauseLibraryItem {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  jurisdiction?: string;
  isStandard: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
  effectiveFrom?: string;
  effectiveTo?: string;
  version: number;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Workflow Interfaces
export interface Workflow {
  id: string;
  contractId: string;
  name: string;
  type: 'sequential' | 'parallel' | 'conditional';
  steps: WorkflowStep[];
  currentStepIndex: number;
  status: WorkflowStatus;
  startedAt: string;
  completedAt?: string;
  deadline?: string;
  notifications: WorkflowNotification[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  approverRole: string;
  approverId?: string;
  approverEmail?: string;
  status: WorkflowStepStatus;
  order: number;
  requiredApprovals: number;
  currentApprovals: number;
  approvers: WorkflowApprover[];
  deadline?: string;
  completedAt?: string;
  comments?: string;
  condition?: WorkflowCondition;
}

export interface WorkflowApprover {
  id: string;
  name: string;
  email: string;
  role: string;
  status: WorkflowStepStatus;
  approvedAt?: string;
  comments?: string;
}

export interface WorkflowCondition {
  type: 'value_threshold' | 'party_count' | 'clause_count' | 'always';
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value?: number;
}

export interface WorkflowNotification {
  id: string;
  type: 'email' | 'push' | 'sms';
  recipient: string;
  template: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed';
}

// Version Control Interfaces
export interface ContractVersion {
  id: string;
  contractId: string;
  version: number;
  versionLabel: string;
  terms: string;
  clauses: Clause[];
  parties: Party[];
  status: ContractStatus;
  changeDescription: string;
  createdAt: string;
  createdBy?: string;
  checksum: string;
  isLocked: boolean;
}

export interface VersionDiff {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
}

// Amendment Interfaces
export interface Amendment {
  id: string;
  contractId: string;
  version: number;
  title: string;
  description: string;
  changes: AmendmentChange[];
  status: AmendmentStatus;
  proposedBy: string;
  proposedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  effectiveDate?: string;
  reason?: string;
}

export interface AmendmentChange {
  field: string;
  path: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
}

// SLA Interfaces
export interface SLA {
  id: string;
  contractId: string;
  name: string;
  description: string;
  metrics: SLAMetric[];
  reportingPeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  breachNotifications: boolean;
  penalties?: SLAPenalty[];
  bonuses?: SLABonus[];
  createdAt: string;
  updatedAt: string;
}

export interface SLAMetric {
  id: string;
  name: string;
  type: SLAMetricType;
  target: number;
  unit: SLAMetricUnit;
  threshold: number;
  weight: number;
  description?: string;
}

export interface SLAPenalty {
  id: string;
  metricId: string;
  condition: 'below_threshold' | 'breach_count';
  threshold: number;
  amount: number;
  currency: string;
  type: 'fixed' | 'percentage';
  description: string;
}

export interface SLABonus {
  id: string;
  metricId: string;
  condition: 'above_target' | 'perfect_score';
  amount: number;
  currency: string;
  type: 'fixed' | 'percentage';
  description: string;
}

export interface SLAMeasurement {
  id: string;
  slaId: string;
  metricId: string;
  value: number;
  recordedAt: string;
  periodStart: string;
  periodEnd: string;
  isCompliant: boolean;
  notes?: string;
}

// Analytics Interfaces
export interface ContractAnalytics {
  totalContracts: number;
  activeContracts: number;
  expiredContracts: number;
  pendingContracts: number;
  totalValue: number;
  averageContractValue: number;
  contractsByType: Record<ContractType, number>;
  contractsByStatus: Record<ContractStatus, number>;
  topParties: { partyName: string; count: number; totalValue: number }[];
  upcomingRenewals: number;
  expiringThisMonth: number;
  averageDuration: number;
  completionRate: number;
  mostUsedTemplates: { templateId: string; name: string; usageCount: number }[];
  clauseUsageStats: { clauseTitle: string; usageCount: number }[];
  monthlyTrend: { month: string; created: number; completed: number; value: number }[];
  slaComplianceRate: number;
}

// Renewal Management Interfaces
export interface RenewalSchedule {
  id: string;
  contractId: string;
  renewalDate: string;
  noticeDate: string;
  status: 'scheduled' | 'notice_sent' | 'renewed' | 'expired' | 'cancelled';
  newEndDate?: string;
  newValue?: number;
  termsChanged: boolean;
  createdAt: string;
  sentNotifications: NotificationRecord[];
}

export interface NotificationRecord {
  id: string;
  type: 'email' | 'sms' | 'push';
  recipient: string;
  sentAt: string;
  template: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Trust Engine Integration
export interface TrustEngineVerification {
  partyId: string;
  verificationId: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  verifiedAt?: string;
  documents?: VerificationDocument[];
  riskScore?: number;
  kycStatus?: 'pending' | 'approved' | 'rejected';
}

export interface VerificationDocument {
  type: string;
  documentId: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  verifiedAt?: string;
}

// Economy OS Integration
export interface PaymentRecord {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  type: 'invoice' | 'milestone' | 'recurring' | 'penalty' | 'bonus';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  dueDate: string;
  paidAt?: string;
  description: string;
  createdAt: string;
  economyPaymentId?: string;
}

// Config Interface
export interface Config {
  port: number;
  environment: string;
  economyOsUrl: string;
  trustEngineUrl: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  signatureExpiryDays: number;
  renewalNoticeDays: number;
  defaultCurrency: string;
}

// Health Response
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  dependencies?: Record<string, DependencyHealth>;
}

export interface DependencyHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  error?: string;
}
