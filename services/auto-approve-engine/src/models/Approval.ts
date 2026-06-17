export interface ApprovalRecord {
  id: string;
  requestId: string;
  requestType: ApprovalRequestType;
  entityId: string;
  entityType: string;
  applicantId: string;
  applicantName: string;
  amount?: number;
  trustScore?: number;
  vipTier?: VIPTier;
  status: ApprovalStatus;
  decision: ApprovalDecision;
  decisionReason: string;
  reviewedBy?: string;
  escalatedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export type ApprovalRequestType =
  | 'TRANSACTION'
  | 'REFUND'
  | 'CREDIT_INCREASE'
  | 'ACCOUNT_UPGRADE'
  | 'LOAN_APPLICATION'
  | 'PAYMENT_PLAN'
  | 'SERVICE_ACCESS';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'CANCELLED';

export type ApprovalDecision = 'AUTO_APPROVED' | 'AUTO_REJECTED' | 'MANUAL_REVIEW' | 'ESCALATED';

export type VIPTier = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface ApprovalRequest {
  requestId: string;
  requestType: ApprovalRequestType;
  entityId: string;
  entityType: string;
  applicantId: string;
  applicantName: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface ApprovalResponse {
  record: ApprovalRecord;
  decision: ApprovalDecision;
  autoApprove: boolean;
  requiresManualReview: boolean;
  estimatedReviewTime?: string;
}

export interface TrustScoreData {
  score: number;
  tier: VIPTier;
  factors: {
    paymentHistory: number;
    accountAge: number;
    transactionVolume: number;
    disputeRate: number;
  };
  lastUpdated: Date;
}

export interface ApprovalRule {
  id: string;
  name: string;
  description: string;
  requestType: ApprovalRequestType;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'APPROVE' | 'REJECT' | 'ESCALATE' | 'MODIFY_AMOUNT';
  targetField?: string;
  targetValue?: any;
  reason: string;
}

// In-memory storage (replace with database in production)
class ApprovalStore {
  private records: Map<string, ApprovalRecord> = new Map();

  create(record: ApprovalRecord): ApprovalRecord {
    this.records.set(record.id, record);
    return record;
  }

  get(id: string): ApprovalRecord | undefined {
    return this.records.get(id);
  }

  getByRequestId(requestId: string): ApprovalRecord | undefined {
    return Array.from(this.records.values()).find(r => r.requestId === requestId);
  }

  getByApplicant(applicantId: string): ApprovalRecord[] {
    return Array.from(this.records.values()).filter(r => r.applicantId === applicantId);
  }

  getAll(): ApprovalRecord[] {
    return Array.from(this.records.values());
  }

  update(id: string, updates: Partial<ApprovalRecord>): ApprovalRecord | undefined {
    const existing = this.records.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.records.delete(id);
  }

  list(filters?: {
    status?: ApprovalStatus;
    requestType?: ApprovalRequestType;
    startDate?: Date;
    endDate?: Date;
  }): ApprovalRecord[] {
    let results = Array.from(this.records.values());

    if (filters?.status) {
      results = results.filter(r => r.status === filters.status);
    }
    if (filters?.requestType) {
      results = results.filter(r => r.requestType === filters.requestType);
    }
    if (filters?.startDate) {
      results = results.filter(r => r.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      results = results.filter(r => r.createdAt <= filters.endDate!);
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const approvalStore = new ApprovalStore();
