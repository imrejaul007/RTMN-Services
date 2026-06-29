/**
 * GovernanceOS Types
 *
 * Policies, authority, compliance, and audit.
 */

export type EntityType = 'company' | 'department' | 'user' | 'agent';

export interface Policy {
  id: string;
  companyId: string;
  name: string;
  description: string;
  type: 'financial' | 'hr' | 'operational' | 'compliance';
  rules: PolicyRule[];
  appliesTo: EntityType[];
  isActive: boolean;
  createdAt: string;
}

export interface PolicyRule {
  type: 'approval_required' | 'auto_approve' | 'deny' | 'require_document';
  conditions?: {
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'in' | 'between';
    value: any;
  }[];
  approvers?: string[];  // User/Agent IDs who can approve
  maxAmount?: number;    // For financial rules
  notificationEmails?: string[];
}

export interface AuthorityLevel {
  level: number;         // 1 = lowest, 5 = highest
  name: string;           // "Employee", "Manager", "Director", "CFO", "CEO"
  canApproveUpTo: number; // Amount in INR
  canHire: boolean;
  canFire: boolean;
  canSignContracts: boolean;
  maxContractValue: number;
}

export interface ComplianceRequirement {
  id: string;
  companyId: string;
  type: 'gst' | 'income_tax' | 'pf' | 'esi' | 'prof_tax' | 'custom';
  description: string;
  frequency: 'monthly' | 'quarterly' | 'annually';
  nextDueDate: string;
  status: 'compliant' | 'pending' | 'overdue' | 'na';
}

export interface AuditLog {
  id: string;
  companyId: string;
  timestamp: string;
  entityType: EntityType;
  entityId: string;
  action: string;
  details: Record<string, any>;
  approvedBy?: string;
  ipAddress?: string;
}
