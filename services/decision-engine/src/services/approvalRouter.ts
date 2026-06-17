import {
  DecisionRequest,
  ApprovalRequirement,
  ApprovalRoute,
  RiskLevel,
  CustomerTier,
  RiskAssessment,
  ValueAssessment,
  PolicyEvaluation
} from '../types';
import { logger } from '../utils/logger';

export class ApprovalRouter {
  private tenantId: string;
  private limits: Record<number, number> = {
    1: 5000,      // Tier 1: $50
    2: 25000,    // Tier 2: $250
    3: 100000,   // Tier 3: $1000
    4: 500000,   // Tier 4: $5000
    5: Infinity  // Tier 5: Unlimited
  };

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Determine approval requirements for a decision
   */
  determineApproval(
    request: DecisionRequest,
    riskAssessment: RiskAssessment,
    valueAssessment: ValueAssessment,
    policyEvaluations: PolicyEvaluation[]
  ): ApprovalRequirement {
    const startTime = Date.now();
    logger.info(`Determining approval requirements`, {
      tenantId: this.tenantId,
      type: request.type
    });

    // Calculate approval level based on various factors
    let requiredLevel = this.calculateBaseLevel(request);
    let escalationPath = this.buildEscalationPath(requiredLevel);

    // Adjust based on risk
    requiredLevel = this.adjustForRisk(requiredLevel, riskAssessment);

    // Adjust based on value
    requiredLevel = this.adjustForValue(requiredLevel, valueAssessment);

    // Adjust based on policy evaluations
    requiredLevel = this.adjustForPolicies(requiredLevel, policyEvaluations);

    // Adjust for customer tier
    requiredLevel = this.adjustForCustomerTier(requiredLevel, request.customer.tier);

    // Determine route from level
    const route = this.levelToRoute(requiredLevel);

    // Determine if approval is required
    const required = this.isApprovalRequired(request, route, riskAssessment);

    // Generate reason
    const reason = this.generateReason(request, requiredLevel, route, riskAssessment);

    const processingTime = Date.now() - startTime;

    logger.info(`Approval determination complete`, {
      tenantId: this.tenantId,
      requiredLevel,
      route,
      required,
      processingTime
    });

    return {
      required,
      route: required ? route : 'auto',
      level: requiredLevel,
      approverType: requiredLevel >= 3 ? 'human' : 'automated',
      reason,
      escalationPath
    };
  }

  /**
   * Calculate base approval level from request
   */
  private calculateBaseLevel(request: DecisionRequest): number {
    let level = 1;

    // Amount-based level
    const amount = request.requestedAmount || request.transaction?.amount || 0;

    if (amount >= this.limits[4]) {
      level = 5;
    } else if (amount >= this.limits[3]) {
      level = 4;
    } else if (amount >= this.limits[2]) {
      level = 3;
    } else if (amount >= this.limits[1]) {
      level = 2;
    }

    // Priority adjustment
    switch (request.priority) {
      case 'critical':
        level = Math.min(5, level + 2);
        break;
      case 'urgent':
        level = Math.min(5, level + 1);
        break;
      case 'low':
        level = Math.max(1, level - 1);
        break;
    }

    // Type adjustment
    switch (request.type) {
      case 'policy_exception':
        level = Math.min(5, level + 2);
        break;
      case 'refund':
        // Refunds need slightly higher approval
        level = Math.min(5, level + 1);
        break;
    }

    return level;
  }

  /**
   * Adjust level based on risk assessment
   */
  private adjustForRisk(level: number, risk: RiskAssessment): number {
    let adjustedLevel = level;

    // High/critical risk always needs human approval
    if (risk.level === 'critical') {
      adjustedLevel = Math.max(adjustedLevel, 4);
    } else if (risk.level === 'high') {
      adjustedLevel = Math.max(adjustedLevel, 3);
    }

    // Escalation flags increase level
    if (risk.flags.includes('EXCESSIVE_REFUND_HISTORY')) {
      adjustedLevel = Math.max(adjustedLevel, 3);
    }

    if (risk.flags.includes('PREVIOUS_DISPUTES')) {
      adjustedLevel = Math.max(adjustedLevel, 3);
    }

    if (risk.flags.includes('REFUND_EXCEEDS_TRANSACTION')) {
      adjustedLevel = Math.min(5, adjustedLevel + 1);
    }

    return adjustedLevel;
  }

  /**
   * Adjust level based on value assessment
   */
  private adjustForValue(level: number, value: ValueAssessment): number {
    let adjustedLevel = level;

    // VIP/Platinum customers get lower approval requirements
    if (value.tier === 'vip') {
      adjustedLevel = Math.max(1, adjustedLevel - 2);
    } else if (value.tier === 'platinum') {
      adjustedLevel = Math.max(1, adjustedLevel - 1);
    }

    // High potential customers might warrant escalation for retention
    if (value.potentialScore > 80 && level <= 2) {
      adjustedLevel = Math.max(2, adjustedLevel);
    }

    return adjustedLevel;
  }

  /**
   * Adjust level based on policy evaluations
   */
  private adjustForPolicies(level: number, evaluations: PolicyEvaluation[]): number {
    let adjustedLevel = level;

    for (const evaluation of evaluations) {
      // Policies that deny require review
      if (evaluation.outcome === 'deny' && evaluation.policyId) {
        adjustedLevel = Math.max(adjustedLevel, 2);
      }

      // Conditional policies need human review
      if (evaluation.outcome === 'conditional') {
        adjustedLevel = Math.max(adjustedLevel, 3);
      }

      // Escalate policies require supervisor minimum
      if (evaluation.outcome === 'escalate') {
        adjustedLevel = Math.max(adjustedLevel, 3);
      }
    }

    return adjustedLevel;
  }

  /**
   * Adjust level based on customer tier
   */
  private adjustForCustomerTier(level: number, tier: CustomerTier): number {
    // VIP customers get streamlined approval
    if (tier === 'vip') {
      return Math.max(1, level - 1);
    }
    return level;
  }

  /**
   * Determine if approval is required
   */
  private isApprovalRequired(
    request: DecisionRequest,
    route: ApprovalRoute,
    risk: RiskAssessment
  ): boolean {
    // Critical decisions always require approval
    if (request.priority === 'critical') {
      return true;
    }

    // Policy exceptions always require approval
    if (request.type === 'policy_exception') {
      return true;
    }

    // High/critical risk always requires approval
    if (risk.level === 'critical' || risk.level === 'high') {
      return true;
    }

    // Human routes require approval
    if (route !== 'auto') {
      return true;
    }

    // Check for escalation flags
    if (risk.flags.includes('MULTIPLE_HIGH_RISK_FACTORS')) {
      return true;
    }

    // Large amounts require approval
    const amount = request.requestedAmount || 0;
    if (amount > 50000) {
      return true;
    }

    return false;
  }

  /**
   * Build escalation path from level
   */
  private buildEscalationPath(level: number): ApprovalRoute[] {
    const routes: ApprovalRoute[] = [];

    for (let i = 1; i <= level; i++) {
      routes.push(this.levelToRoute(i));
    }

    return routes;
  }

  /**
   * Convert level number to route
   */
  private levelToRoute(level: number): ApprovalRoute {
    switch (level) {
      case 1:
        return 'auto';
      case 2:
        return 'supervisor';
      case 3:
        return 'manager';
      case 4:
        return 'director';
      case 5:
        return 'vp';
      default:
        return 'executive';
    }
  }

  /**
   * Generate human-readable reason for approval requirement
   */
  private generateReason(
    request: DecisionRequest,
    level: number,
    route: ApprovalRoute,
    risk: RiskAssessment
  ): string {
    const reasons: string[] = [];

    // Amount reason
    const amount = request.requestedAmount || 0;
    if (amount > 0) {
      const formatted = (amount / 100).toFixed(2);
      reasons.push(`Amount: $${formatted}`);
    }

    // Risk reason
    if (risk.level !== 'low') {
      reasons.push(`Risk: ${risk.level} (score: ${risk.score})`);
    }

    // Priority reason
    if (request.priority === 'critical' || request.priority === 'urgent') {
      reasons.push(`Priority: ${request.priority}`);
    }

    // Policy reason
    if (request.type === 'policy_exception') {
      reasons.push('Type: Policy exception');
    }

    // Flags
    if (risk.flags.length > 0) {
      reasons.push(`Flags: ${risk.flags.slice(0, 3).join(', ')}`);
    }

    // Route
    reasons.push(`Route: ${route}`);

    return reasons.join(' | ');
  }

  /**
   * Get approver list for a route
   */
  getApprovers(route: ApprovalRoute): string[] {
    // In production, this would query an org chart or user service
    const approvers: Record<ApprovalRoute, string[]> = {
      auto: [],
      supervisor: ['supervisor@company.com'],
      manager: ['manager@company.com'],
      director: ['director@company.com'],
      vp: ['vp@company.com'],
      executive: ['cxo@company.com']
    };

    return approvers[route] || [];
  }

  /**
   * Set approval limits
   */
  setLimits(limits: Record<number, number>): void {
    this.limits = { ...this.limits, ...limits };
  }
}
