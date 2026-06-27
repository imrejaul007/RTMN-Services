/**
 * Approval Types for HumanOS Approval Workflow Engine
 */

export enum ApprovalStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum ApprovalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ApprovalLevel {
  SELF = 'SELF',           // Self-approval (amount under threshold)
  MANAGER = 'MANAGER',     // Requires manager approval
  DIRECTOR = 'DIRECTOR',   // Requires director approval
  VP = 'VP',              // Requires VP approval
  CXO = 'CXO',            // Requires CXO approval
  BOARD = 'BOARD',        // Requires board approval
}

export interface ApprovalRule {
  id: string;
  name: string;
  description: string;
  conditions: ApprovalCondition[];
  requiredLevel: ApprovalLevel;
  approvers: string[];     // User IDs or roles
  deadlineHours?: number;
  reminderHours?: number[];
  escalationLevel?: ApprovalLevel;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: string | number | string[] | number[];
}

export interface ApprovalStep {
  stepId: string;
  level: ApprovalLevel;
  approvers: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  assignedTo?: string;
  decidedAt?: Date;
  decidedBy?: string;
  comments?: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  type: string;                    // e.g., 'EXPENSE', 'PURCHASE_ORDER', 'LEAVE', 'BUDGET'
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  department: string;

  // Financial details (for routing rules)
  amount?: number;
  currency?: string;

  // Content data (flexible JSON for different approval types)
  data: Record<string, unknown>;

  // Workflow configuration
  ruleId?: string;
  requiredLevel: ApprovalLevel;
  steps: ApprovalStep[];
  currentStepIndex: number;

  // Status
  status: ApprovalStatus;
  priority: ApprovalPriority;

  // Timing
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
  completedAt?: Date;

  // Attachments
  attachments?: ApprovalAttachment[];

  // Delegation
  delegatedFrom?: string;
  delegatedTo?: string;

  // Audit
  auditLog: ApprovalAuditEntry[];

  // Escalation
  escalatedAt?: Date;
  escalatedTo?: string;
  originalApprover?: string;
}

export interface ApprovalAttachment {
  id: string;
  filename: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ApprovalAuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  performedBy: string;
  performedByName: string;
  details: Record<string, unknown>;
  previousState?: Partial<ApprovalRequest>;
}

export interface ApprovalDelegation {
  id: string;
  delegatorId: string;
  delegatorName: string;
  delegateId: string;
  delegateName: string;
  scope: string[];                // Types of approvals that can be delegated
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  reason?: string;
  createdAt: Date;
}

export interface ApprovalComment {
  id: string;
  approvalId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  isInternal: boolean;           // Internal comments only visible to approvers
}

export interface ApprovalNotification {
  id: string;
  approvalId: string;
  recipientId: string;
  recipientEmail: string;
  type: 'NEW_REQUEST' | 'REMINDER' | 'ESCALATION' | 'COMPLETED' | 'REJECTED';
  channel: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'IN_APP';
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  sentAt?: Date;
  readAt?: Date;
  error?: string;
}

export interface ApprovalStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  avgApprovalTimeHours: number;
  pendingByPriority: Record<ApprovalPriority, number>;
  pendingByType: Record<string, number>;
  overdueRequests: number;
}

export interface CreateApprovalRequest {
  title: string;
  description: string;
  type: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  amount?: number;
  currency?: string;
  data: Record<string, unknown>;
  priority?: ApprovalPriority;
  attachments?: File[];
  delegatedFrom?: string;
}

export interface ApprovalAction {
  approvalId: string;
  action: 'APPROVE' | 'REJECT' | 'ESCALATE' | 'CANCEL' | 'COMMENT';
  performedBy: string;
  performedByName: string;
  comments?: string;
  escalationReason?: string;
  newLevel?: ApprovalLevel;
}

// Notification payload types
export interface ApprovalNotificationPayload {
  approvalId: string;
  title: string;
  type: string;
  requesterName: string;
  amount?: number;
  currency?: string;
  deadline?: Date;
  priority: ApprovalPriority;
  actionUrl: string;
  unsubscribeUrl?: string;
}

// Webhook event types
export interface ApprovalWebhookEvent {
  event: 'approval.created' | 'approval.approved' | 'approval.rejected' | 'approval.escalated' | 'approval.completed';
  timestamp: Date;
  approvalId: string;
  requesterId: string;
  data: Partial<ApprovalRequest>;
}
