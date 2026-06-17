import { ApprovalRecord, ApprovalResponse, ApprovalDecision, ApprovalStatus } from '../models/Approval';
import { RuleEngine } from './ruleEngine';
import { AuditService } from './audit';
import { CustomerOpsBridge } from './customerOpsBridge';

export class ApproverService {
  private ruleEngine: RuleEngine;
  private auditService: AuditService;
  private customerBridge: CustomerOpsBridge;

  constructor(ruleEngine: RuleEngine) {
    this.ruleEngine = ruleEngine;
    this.auditService = new AuditService();
    this.customerBridge = new CustomerOpsBridge();
  }

  /**
   * Process approval request through the rule engine
   */
  async processApproval(record: ApprovalRecord): Promise<ApprovalResponse> {
    const evaluation = this.ruleEngine.evaluateRecord(record);

    let decision: ApprovalDecision;
    let status: ApprovalStatus;
    let decisionReason: string;
    let escalatedTo: string | undefined;

    if (!evaluation.matchedRule || !evaluation.action) {
      // No matching rule - require manual review
      decision = 'MANUAL_REVIEW';
      status = 'PENDING';
      decisionReason = 'No matching rules found - requires manual review';
    } else {
      decisionReason = evaluation.action.reason;

      switch (evaluation.action.type) {
        case 'APPROVE':
          decision = 'AUTO_APPROVED';
          status = 'APPROVED';
          break;
        case 'REJECT':
          decision = 'AUTO_REJECTED';
          status = 'REJECTED';
          break;
        case 'ESCALATE':
          decision = 'ESCALATED';
          status = 'ESCALATED';
          escalatedTo = await this.determineEscalationTarget(record);
          decisionReason += ` - Escalated to ${escalatedTo}`;
          // Notify manager
          await this.customerBridge.notifyManager(escalatedTo || 'MANAGER', {
            approvalId: record.id,
            requestId: record.requestId,
            applicantId: record.applicantId,
            amount: record.amount,
            reason: decisionReason
          });
          break;
        default:
          decision = 'MANUAL_REVIEW';
          status = 'PENDING';
      }
    }

    // Update record
    record.decision = decision;
    record.status = status;
    record.decisionReason = decisionReason;
    if (escalatedTo) {
      record.escalatedTo = escalatedTo;
    }

    // Audit log
    this.auditService.log({
      action: decision,
      entityId: record.id,
      requestId: record.requestId,
      applicantId: record.applicantId,
      details: {
        requestType: record.requestType,
        trustScore: record.trustScore,
        vipTier: record.vipTier,
        matchedRule: evaluation.matchedRule?.name,
        action: evaluation.action?.type
      },
      timestamp: new Date()
    });

    // Send event to event bus
    await this.publishApprovalEvent(record);

    return {
      record,
      decision,
      autoApprove: decision === 'AUTO_APPROVED',
      requiresManualReview: decision === 'MANUAL_REVIEW' || decision === 'ESCALATED',
      estimatedReviewTime: this.getEstimatedReviewTime(decision)
    };
  }

  /**
   * Determine who to escalate to based on business rules
   */
  private async determineEscalationTarget(record: ApprovalRecord): Promise<string> {
    // VIP-based escalation
    const vipEscalationLevels: Record<string, string> = {
      'DIAMOND': 'SENIOR_MANAGER',
      'PLATINUM': 'ACCOUNT_MANAGER',
      'GOLD': 'TEAM_LEAD',
      'SILVER': 'SENIOR_AGENT',
      'BRONZE': 'AGENT',
      'NONE': 'AGENT'
    };

    // Amount-based escalation
    if (record.amount) {
      if (record.amount > 1000000) {
        return 'DIRECTOR';
      }
      if (record.amount > 500000) {
        return 'VP';
      }
      if (record.amount > 100000) {
        return 'SENIOR_MANAGER';
      }
    }

    // Trust score based escalation
    if (record.trustScore !== undefined) {
      if (record.trustScore < 20) {
        return 'COMPLIANCE_OFFICER';
      }
      if (record.trustScore < 40) {
        return 'RISK_MANAGER';
      }
    }

    // Default escalation based on VIP tier
    return vipEscalationLevels[record.vipTier || 'NONE'] || 'AGENT';
  }

  /**
   * Get estimated review time based on decision type
   */
  private getEstimatedReviewTime(decision: ApprovalDecision): string {
    switch (decision) {
      case 'AUTO_APPROVED':
        return '< 1 minute';
      case 'AUTO_REJECTED':
        return '< 1 minute';
      case 'ESCALATED':
        return '24-48 hours';
      case 'MANUAL_REVIEW':
        return '2-4 hours';
      default:
        return '24 hours';
    }
  }

  /**
   * Publish approval event to event bus
   */
  private async publishApprovalEvent(record: ApprovalRecord): Promise<void> {
    const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';

    try {
      await fetch(`${eventBusUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: `approval.${record.decision.toLowerCase()}`,
          source: 'auto-approve-engine',
          data: {
            approvalId: record.id,
            requestId: record.requestId,
            requestType: record.requestType,
            applicantId: record.applicantId,
            status: record.status,
            decision: record.decision,
            trustScore: record.trustScore,
            vipTier: record.vipTier,
            amount: record.amount
          },
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to publish approval event:', error);
    }
  }

  /**
   * Batch process multiple approvals
   */
  async batchProcess(records: ApprovalRecord[]): Promise<ApprovalResponse[]> {
    const results: ApprovalResponse[] = [];

    for (const record of records) {
      const result = await this.processApproval(record);
      results.push(result);
    }

    return results;
  }

  /**
   * Re-evaluate an existing approval
   */
  async reEvaluate(record: ApprovalRecord): Promise<ApprovalResponse> {
    // Reset to pending
    record.status = 'PENDING';
    record.decision = 'MANUAL_REVIEW';
    record.decisionReason = 'Re-evaluation in progress';

    // Re-process
    return this.processApproval(record);
  }
}
