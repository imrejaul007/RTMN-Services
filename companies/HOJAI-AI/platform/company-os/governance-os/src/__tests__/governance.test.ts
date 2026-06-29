/**
 * GovernanceOS Tests
 */

import { describe, it, expect } from 'vitest';
import { governanceOS } from '../governance-os';

describe('GovernanceOS', () => {
  it('should create policy', () => {
    const policy = governanceOS.createPolicy({
      companyId: 'company_test',
      name: 'Financial Approval',
      description: 'All expenses require approval',
      type: 'financial',
      rules: [
        { type: 'auto_approve', maxAmount: 5000 },
        { type: 'approval_required', maxAmount: 100000, approvers: ['manager'] },
      ],
      appliesTo: ['user', 'agent'],
      isActive: true,
    });
    expect(policy.id).toBeDefined();
  });

  it('should check if approval required', () => {
    const result = governanceOS.requiresApproval({
      companyId: 'company_test',
      action: 'expense',
      entityType: 'agent',
      amount: 100000,
    });
    expect(result.required).toBe(true);
  });

  it('should get authority levels', () => {
    const levels = governanceOS.getAuthorityLevels('company_test');
    expect(levels.length).toBe(5);
    expect(levels[0].name).toBe('Employee');
  });

  it('should log audit', () => {
    const log = governanceOS.logAudit({
      companyId: 'company_test',
      entityType: 'agent',
      entityId: 'ai-cfo',
      action: 'expense_approved',
      details: { amount: 5000 },
    });
    expect(log.id).toBeDefined();
  });

  it('should get compliance status', () => {
    governanceOS.addCompliance({
      companyId: 'company_test',
      type: 'gst',
      description: 'Monthly GST filing',
      frequency: 'monthly',
      nextDueDate: '2026-07-20',
      status: 'compliant',
    });
    const status = governanceOS.getComplianceStatus('company_test');
    expect(status.total).toBe(1);
    expect(status.compliant).toBe(1);
  });
});
