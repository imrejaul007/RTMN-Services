import { Types } from 'mongoose';

// Decision Types
export type DecisionType = 'refund' | 'cancel' | 'discount' | 'escalate' | 'policy_exception';

// Decision Outcomes
export type DecisionOutcome = 'approved' | 'denied' | 'escalated' | 'partial' | 'requires_review';

// Risk Levels
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Customer Tiers
export type CustomerTier = 'standard' | 'silver' | 'gold' | 'platinum' | 'vip';

// Approval Routes
export type ApprovalRoute = 'auto' | 'supervisor' | 'manager' | 'director' | 'vp' | 'executive';

// Priority Levels
export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

// Base Factor Interface
export interface DecisionFactor {
  id: string;
  name: string;
  category: 'customer' | 'transaction' | 'history' | 'business' | 'risk' | 'value';
  weight: number; // 0-100
  value: number | string | boolean;
  score?: number; // Calculated score based on weight
  metadata?: Record<string, unknown>;
}

// Customer Context
export interface CustomerContext {
  id: string;
  email?: string;
  phone?: string;
  tier: CustomerTier;
  lifetimeValue: number;
  accountAge: number; // in days
  previousInteractions: number;
  previousRefunds: number;
  previousDisputes: number;
  satisfactionScore?: number;
  tags?: string[];
}

// Transaction Context
export interface TransactionContext {
  id: string;
  amount: number; // in cents
  currency: string;
  type: string;
  date: Date;
  items?: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: number;
    category?: string;
  }>;
  metadata?: Record<string, unknown>;
}

// Request Context
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  channel?: 'web' | 'mobile' | 'phone' | 'in_store' | 'api';
  agentId?: string;
  locale?: string;
  timezone?: string;
}

// Main Decision Request
export interface DecisionRequest {
  tenantId: string;
  type: DecisionType;
  customer: CustomerContext;
  transaction?: TransactionContext;
  reason: string;
  requestedAmount?: number; // For refunds/discounts, in cents
  priority: PriorityLevel;
  factors?: DecisionFactor[];
  context?: RequestContext;
  metadata?: Record<string, unknown>;
}

// Risk Assessment
export interface RiskAssessment {
  score: number; // 0-100
  level: RiskLevel;
  factors: Array<{
    factor: string;
    contribution: number;
    reason: string;
  }>;
  flags: string[];
}

// Value Assessment
export interface ValueAssessment {
  score: number; // 0-100
  tier: CustomerTier;
  ltvScore: number;
  engagementScore: number;
  potentialScore: number;
  factors: Array<{
    factor: string;
    contribution: number;
  }>;
}

// Policy Evaluation Result
export interface PolicyEvaluation {
  policyId: string;
  policyName: string;
  applicable: boolean;
  matched: boolean;
  constraints: Array<{
    name: string;
    satisfied: boolean;
    expected?: string | number;
    actual?: string | number;
  }>;
  outcome: 'allow' | 'deny' | 'conditional' | 'escalate';
  recommendation: DecisionOutcome;
  reasoning: string;
}

// Alternative Options
export interface AlternativeOption {
  type: DecisionType;
  description: string;
  amount?: number;
  conditions?: string[];
  feasibility: 'high' | 'medium' | 'low';
  reasoning: string;
}

// Approval Requirement
export interface ApprovalRequirement {
  required: boolean;
  route: ApprovalRoute;
  level: number; // 1-5
  approverType?: 'human' | 'automated';
  reason: string;
  escalationPath?: ApprovalRoute[];
}

// Decision Explanation
export interface DecisionExplanation {
  summary: string;
  reasoning: string[];
  factors: DecisionFactor[];
  policies: PolicyEvaluation[];
  alternatives?: AlternativeOption[];
  recommendations?: string[];
}

// Main Decision Result
export interface DecisionResult {
  id: string;
  requestId: string;
  tenantId: string;
  type: DecisionType;
  outcome: DecisionOutcome;
  decision: 'approve' | 'deny' | 'partial' | 'escalate';
  amount?: number; // Approved amount in cents
  riskAssessment: RiskAssessment;
  valueAssessment: ValueAssessment;
  policyEvaluations: PolicyEvaluation[];
  alternatives: AlternativeOption[];
  approval: ApprovalRequirement;
  explanation: DecisionExplanation;
  processingTime: number; // in ms
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Policy Definition
export interface Policy {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: DecisionType[];
  priority: number;
  isActive: boolean;
  conditions: PolicyCondition[];
  constraints: PolicyConstraint[];
  outcomes: PolicyOutcome[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'exists';
  value: unknown;
  group?: string;
}

export interface PolicyConstraint {
  name: string;
  type: 'amount' | 'count' | 'time' | 'frequency';
  operator: 'lte' | 'gte' | 'eq' | 'between';
  value: number | [number, number];
  period?: string; // For time-based constraints
}

export interface PolicyOutcome {
  condition: string; // JSONLogic-style condition
  outcome: DecisionOutcome;
  amount?: number | { min: number; max: number };
  reasoning: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Audit Entry
export interface AuditEntry {
  id: string;
  decisionId: string;
  action: 'created' | 'reviewed' | 'overridden' | 'appealed' | 'expired';
  previousState?: Partial<DecisionResult>;
  newState?: Partial<DecisionResult>;
  actor: {
    id: string;
    type: 'system' | 'user' | 'agent';
    name?: string;
  };
  reason?: string;
  timestamp: Date;
}

// Statistics
export interface DecisionStats {
  period: {
    start: Date;
    end: Date;
  };
  totals: {
    decisions: number;
    approved: number;
    denied: number;
    escalated: number;
    partial: number;
  };
  byType: Record<DecisionType, {
    total: number;
    approved: number;
    denied: number;
    averageAmount?: number;
  }>;
  byOutcome: Record<DecisionOutcome, number>;
  averageProcessingTime: number;
  riskDistribution: Record<RiskLevel, number>;
  customerTierDistribution: Record<CustomerTier, number>;
}

// Batch Decision Request
export interface BatchDecisionRequest {
  tenantId: string;
  requests: Omit<DecisionRequest, 'tenantId'>[];
  strategy: 'parallel' | 'sequential';
  failFast?: boolean;
}

export interface BatchDecisionResult {
  batchId: string;
  results: DecisionResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    processingTime: number;
  };
}
