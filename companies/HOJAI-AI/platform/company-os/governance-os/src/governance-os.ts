/**
 * GovernanceOS Service
 *
 * Policies, authority, compliance, and audit.
 */

import { v4 as uuidv4 } from 'uuid';
import { Policy, AuthorityLevel, ComplianceRequirement, AuditLog, EntityType } from './types';

// ============================================
// In-Memory Stores
// ============================================

const policies = new Map<string, Policy>();
const authorityLevels = new Map<string, AuthorityLevel[]>();
const compliance = new Map<string, ComplianceRequirement[]>();
const auditLogs = new Map<string, AuditLog[]>();

// ============================================
// Default Authority Levels
// ============================================

const DEFAULT_AUTHORITY: AuthorityLevel[] = [
  { level: 1, name: 'Employee', canApproveUpTo: 5000, canHire: false, canFire: false, canSignContracts: false, maxContractValue: 0 },
  { level: 2, name: 'Team Lead', canApproveUpTo: 25000, canHire: false, canFire: false, canSignContracts: false, maxContractValue: 0 },
  { level: 3, name: 'Manager', canApproveUpTo: 100000, canHire: true, canFire: false, canSignContracts: false, maxContractValue: 50000 },
  { level: 4, name: 'Director', canApproveUpTo: 500000, canHire: true, canFire: true, canSignContracts: true, maxContractValue: 500000 },
  { level: 5, name: 'CEO/CFO', canApproveUpTo: 10000000, canHire: true, canFire: true, canSignContracts: true, maxContractValue: 10000000 },
];

// ============================================
// GovernanceOS Service
// ============================================

export class GovernanceOS {
  /**
   * Create a policy
   */
  createPolicy(policy: Omit<Policy, 'id' | 'createdAt'>): Policy {
    const newPolicy: Policy = {
      id: `policy_${uuidv4().slice(0, 8)}`,
      ...policy,
      createdAt: new Date().toISOString(),
    };

    policies.set(newPolicy.id, newPolicy);
    return newPolicy;
  }

  /**
   * Get policies for a company
   */
  getPolicies(companyId: string): Policy[] {
    return Array.from(policies.values())
      .filter(p => p.companyId === companyId && p.isActive);
  }

  /**
   * Evaluate if action requires approval
   */
  requiresApproval(params: {
    companyId: string;
    action: string;
    entityType: EntityType;
    amount?: number;
  }): { required: boolean; approvers?: string[]; reason?: string } {
    const companyPolicies = this.getPolicies(params.companyId);

    for (const policy of companyPolicies) {
      if (!policy.appliesTo.includes(params.entityType)) continue;

      for (const rule of policy.rules) {
        if (rule.type === 'approval_required') {
          if (params.amount !== undefined && rule.maxAmount !== undefined) {
            if (params.amount > rule.maxAmount) {
              return {
                required: true,
                approvers: rule.approvers,
                reason: `${params.action} exceeds ₹${rule.maxAmount}`,
              };
            }
          } else {
            return {
              required: true,
              approvers: rule.approvers,
              reason: `${params.action} requires approval`,
            };
          }
        }

        if (rule.type === 'auto_approve') {
          return { required: false };
        }

        if (rule.type === 'deny') {
          return {
            required: true,
            reason: `${params.action} is not permitted`,
          };
        }
      }
    }

    // Default: no approval required
    return { required: false };
  }

  /**
   * Get authority levels for a company
   */
  getAuthorityLevels(companyId: string): AuthorityLevel[] {
    return authorityLevels.get(companyId) || DEFAULT_AUTHORITY;
  }

  /**
   * Set custom authority levels
   */
  setAuthorityLevels(companyId: string, levels: AuthorityLevel[]): void {
    authorityLevels.set(companyId, levels);
  }

  /**
   * Check if entity can perform action
   */
  canPerform(entityId: string, action: string, amount?: number): boolean {
    const levels = this.getAuthorityLevels('default');

    for (const level of levels) {
      if (action === 'approve_transaction' && amount !== undefined) {
        if (amount <= level.canApproveUpTo) return true;
      }
      if (action === 'hire' && level.canHire) return true;
      if (action === 'fire' && level.canFire) return true;
      if (action === 'sign_contract' && level.canSignContracts) {
        if (amount !== undefined && amount <= level.maxContractValue) return true;
      }
    }

    return false;
  }

  /**
   * Add compliance requirement
   */
  addCompliance(req: Omit<ComplianceRequirement, 'id'>): ComplianceRequirement {
    const requirement: ComplianceRequirement = {
      id: `comp_${uuidv4().slice(0, 8)}`,
      ...req,
    };

    const companyReqs = compliance.get(req.companyId) || [];
    companyReqs.push(requirement);
    compliance.set(req.companyId, companyReqs);

    return requirement;
  }

  /**
   * Get compliance status
   */
  getComplianceStatus(companyId: string): {
    total: number;
    compliant: number;
    pending: number;
    overdue: number;
  } {
    const companyReqs = compliance.get(companyId) || [];

    return {
      total: companyReqs.length,
      compliant: companyReqs.filter(r => r.status === 'compliant').length,
      pending: companyReqs.filter(r => r.status === 'pending').length,
      overdue: companyReqs.filter(r => r.status === 'overdue').length,
    };
  }

  /**
   * Record audit log
   */
  logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const auditLog: AuditLog = {
      id: `audit_${uuidv4().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };

    const companyLogs = auditLogs.get(log.companyId) || [];
    companyLogs.push(auditLog);
    auditLogs.set(log.companyId, companyLogs);

    return auditLog;
  }

  /**
   * Get audit logs
   */
  getAuditLogs(companyId: string, filters?: {
    entityType?: EntityType;
    entityId?: string;
    limit?: number;
  }): AuditLog[] {
    let logs = auditLogs.get(companyId) || [];

    if (filters?.entityType) {
      logs = logs.filter(l => l.entityType === filters.entityType);
    }

    if (filters?.entityId) {
      logs = logs.filter(l => l.entityId === filters.entityId);
    }

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * Create default policies for a company
   */
  createDefaultPolicies(companyId: string): Policy[] {
    const defaultPolicies: Policy[] = [
      {
        id: `policy_${uuidv4().slice(0, 8)}`,
        companyId,
        name: 'Financial Approval',
        description: 'Financial transactions require approval',
        type: 'financial',
        rules: [
          { type: 'auto_approve', maxAmount: 5000 },
          { type: 'approval_required', maxAmount: 100000, approvers: ['manager'] },
        ],
        appliesTo: ['user', 'agent'],
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: `policy_${uuidv4().slice(0, 8)}`,
        companyId,
        name: 'Hiring Approval',
        description: 'All hires require manager approval',
        type: 'hr',
        rules: [
          { type: 'approval_required', approvers: ['manager'] },
        ],
        appliesTo: ['agent'],
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    defaultPolicies.forEach(p => policies.set(p.id, p));
    return defaultPolicies;
  }
}

export const governanceOS = new GovernanceOS();