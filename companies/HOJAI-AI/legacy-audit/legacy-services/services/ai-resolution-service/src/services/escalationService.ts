import { logger } from '../utils/logger';
import { IssuePriority, IssueCategory, EscalationLevel, IIssueContext } from '../models/resolution';

interface EscalationEvaluation {
  shouldEscalate: boolean;
  escalationLevel: EscalationLevel;
  escalationReason: string;
  urgencyScore: number; // 1-10
  estimatedWaitTime?: number; // minutes
}

interface AgentCapability {
  agentId: string;
  name: string;
  tier: EscalationLevel;
  specializations: IssueCategory[];
  currentLoad: number;
  maxLoad: number;
  availability: 'available' | 'busy' | 'offline';
}

interface EscalationPath {
  currentLevel: EscalationLevel;
  targetLevel: EscalationLevel;
  steps: EscalationStep[];
  estimatedTime: number;
}

interface EscalationStep {
  level: EscalationLevel;
  action: string;
  description: string;
  estimatedTime: number;
  requiredApprovals?: string[];
}

class EscalationService {
  private readonly MAX_ESCALATION_LEVELS: Record<EscalationLevel, number> = {
    [EscalationLevel.NONE]: 0,
    [EscalationLevel.L1_AGENT]: 1,
    [EscalationLevel.L2_SPECIALIST]: 2,
    [EscalationLevel.L3_EXPERT]: 3,
    [EscalationLevel.MANAGEMENT]: 4,
    [EscalationLevel.LEGAL]: 5
  };

  async evaluateEscalation(issue: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
    context?: IIssueContext;
  }): Promise<EscalationEvaluation> {
    logger.info('Evaluating escalation for issue', {
      title: issue.title,
      category: issue.category,
      priority: issue.priority
    });

    let urgencyScore = 0;
    const escalationReasons: string[] = [];

    // Priority-based escalation
    const priorityScore = this.evaluatePriority(issue.priority);
    urgencyScore += priorityScore.score;
    if (priorityScore.reason) escalationReasons.push(priorityScore.reason);

    // Category-based escalation
    const categoryScore = this.evaluateCategory(issue.category);
    urgencyScore += categoryScore.score;
    if (categoryScore.reason) escalationReasons.push(categoryScore.reason);

    // Context-based escalation
    if (issue.context) {
      const contextScore = this.evaluateContext(issue.context);
      urgencyScore += contextScore.score;
      if (contextScore.reason) escalationReasons.push(contextScore.reason);
    }

    // Complexity-based escalation
    const complexityScore = this.evaluateComplexity(issue.description);
    urgencyScore += complexityScore.score;
    if (complexityScore.reason) escalationReasons.push(complexityScore.reason);

    // Sentiment-based escalation
    const sentimentScore = this.evaluateSentiment(issue.description);
    urgencyScore += sentimentScore.score;
    if (sentimentScore.reason) escalationReasons.push(sentimentScore.reason);

    // Normalize urgency score to 1-10
    urgencyScore = Math.min(Math.max(urgencyScore, 1), 10);

    // Determine if escalation is needed
    const shouldEscalate = urgencyScore >= 4;

    // Determine escalation level
    let escalationLevel = EscalationLevel.NONE;
    if (shouldEscalate) {
      if (urgencyScore >= 9) {
        escalationLevel = EscalationLevel.LEGAL;
      } else if (urgencyScore >= 7) {
        escalationLevel = EscalationLevel.MANAGEMENT;
      } else if (urgencyScore >= 5) {
        escalationLevel = EscalationLevel.L3_EXPERT;
      } else if (urgencyScore >= 4) {
        escalationLevel = EscalationLevel.L2_SPECIALIST;
      }
    }

    // Calculate estimated wait time based on level
    const estimatedWaitTime = this.estimateWaitTime(escalationLevel);

    logger.info('Escalation evaluation completed', {
      shouldEscalate,
      escalationLevel,
      urgencyScore
    });

    return {
      shouldEscalate,
      escalationLevel,
      escalationReason: escalationReasons.length > 0
        ? escalationReasons.join('; ')
        : 'Standard resolution path',
      urgencyScore,
      estimatedWaitTime: shouldEscalate ? estimatedWaitTime : undefined
    };
  }

  async determineEscalationLevel(issue: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
    context?: IIssueContext;
  }): Promise<{
    recommendedLevel: EscalationLevel;
    alternativeLevels: EscalationLevel[];
    reasoning: string[];
  }> {
    const evaluation = await this.evaluateEscalation(issue);

    const reasoning: string[] = [];

    // Build reasoning based on factors
    if (issue.priority === IssuePriority.CRITICAL) {
      reasoning.push('Critical priority requires L2+ handling');
    }

    if ([IssueCategory.COMPLIANCE, IssueCategory.SECURITY].includes(issue.category)) {
      reasoning.push('Compliance/Security issues require specialized handling');
    }

    if (issue.context?.customerTier === 'enterprise') {
      reasoning.push('Enterprise customers get priority escalation');
    }

    if (issue.context?.slaTier === 'premium') {
      reasoning.push('Premium SLA requires expedited escalation path');
    }

    // Generate alternative levels
    const alternativeLevels: EscalationLevel[] = [];
    const currentLevel = evaluation.escalationLevel;

    if (currentLevel !== EscalationLevel.NONE) {
      alternativeLevels.push(EscalationLevel.L1_AGENT);
    }
    if (currentLevel !== EscalationLevel.L1_AGENT && currentLevel !== EscalationLevel.NONE) {
      alternativeLevels.push(EscalationLevel.L2_SPECIALIST);
    }

    return {
      recommendedLevel: evaluation.escalationLevel,
      alternativeLevels: alternativeLevels.filter(
        level => this.MAX_ESCALATION_LEVELS[level] < this.MAX_ESCALATION_LEVELS[currentLevel]
      ),
      reasoning
    };
  }

  async findBestAgent(
    issue: {
      category: IssueCategory;
      priority: IssuePriority;
      context?: IIssueContext;
    },
    level: EscalationLevel
  ): Promise<{
    agentId: string;
    agentName: string;
    tier: EscalationLevel;
    specializations: IssueCategory[];
    estimatedWaitTime: number;
  } | null> {
    logger.info('Finding best agent for escalation', { level, category: issue.category });

    // In a real implementation, this would query an agent management service
    // For now, return a mock agent
    const mockAgents: Record<EscalationLevel, Array<{ agentId: string; agentName: string; specializations: IssueCategory[] }>> = {
      [EscalationLevel.NONE]: [],
      [EscalationLevel.L1_AGENT]: [
        { agentId: 'agent_001', agentName: 'John Doe', specializations: [IssueCategory.GENERAL, IssueCategory.ACCOUNT, IssueCategory.BILLING] },
        { agentId: 'agent_002', agentName: 'Jane Smith', specializations: [IssueCategory.GENERAL, IssueCategory.PRODUCT, IssueCategory.SHIPPING] }
      ],
      [EscalationLevel.L2_SPECIALIST]: [
        { agentId: 'specialist_001', agentName: 'Bob Wilson', specializations: [IssueCategory.TECHNICAL, IssueCategory.PRODUCT, IssueCategory.ACCOUNT] },
        { agentId: 'specialist_002', agentName: 'Alice Brown', specializations: [IssueCategory.BILLING, IssueCategory.REFUND, IssueCategory.TECHNICAL] }
      ],
      [EscalationLevel.L3_EXPERT]: [
        { agentId: 'expert_001', agentName: 'Dr. Sarah Chen', specializations: [IssueCategory.TECHNICAL, IssueCategory.COMPLIANCE, IssueCategory.SECURITY] }
      ],
      [EscalationLevel.MANAGEMENT]: [
        { agentId: 'manager_001', agentName: 'Mike Johnson', specializations: [] }
      ],
      [EscalationLevel.LEGAL]: [
        { agentId: 'legal_001', agentName: 'Legal Team', specializations: [IssueCategory.COMPLIANCE, IssueCategory.SECURITY] }
      ]
    };

    const agents = mockAgents[level] || [];

    // Find an agent specializing in the issue category
    const specializedAgent = agents.find(a =>
      a.specializations.includes(issue.category)
    );

    const selectedAgent = specializedAgent || agents[0];

    if (!selectedAgent) {
      logger.warn('No agent found for level', { level });
      return null;
    }

    const estimatedWaitTime = this.estimateWaitTime(level);

    return {
      agentId: selectedAgent.agentId,
      agentName: selectedAgent.agentName,
      tier: level,
      specializations: selectedAgent.specializations,
      estimatedWaitTime
    };
  }

  async createEscalationPath(issue: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
    context?: IIssueContext;
  }): Promise<EscalationPath> {
    logger.info('Creating escalation path', { title: issue.title });

    const evaluation = await this.evaluateEscalation(issue);
    const currentLevel = EscalationLevel.L1_AGENT;
    const targetLevel = evaluation.escalationLevel;

    const steps: EscalationStep[] = [];
    let totalTime = 0;

    // Build escalation chain
    if (targetLevel !== EscalationLevel.NONE && targetLevel !== EscalationLevel.L1_AGENT) {
      steps.push({
        level: EscalationLevel.L1_AGENT,
        action: 'Initial Assessment',
        description: 'Document the issue and perform initial troubleshooting',
        estimatedTime: 15,
        requiredApprovals: ['supervisor']
      });
      totalTime += 15;
    }

    if ([EscalationLevel.L2_SPECIALIST, EscalationLevel.L3_EXPERT, EscalationLevel.MANAGEMENT, EscalationLevel.LEGAL].includes(targetLevel)) {
      steps.push({
        level: EscalationLevel.L2_SPECIALIST,
        action: 'Technical Review',
        description: 'Detailed technical investigation by specialist',
        estimatedTime: 30,
        requiredApprovals: ['team_lead']
      });
      totalTime += 30;
    }

    if ([EscalationLevel.L3_EXPERT, EscalationLevel.MANAGEMENT, EscalationLevel.LEGAL].includes(targetLevel)) {
      steps.push({
        level: EscalationLevel.L3_EXPERT,
        action: 'Expert Analysis',
        description: 'Deep dive analysis by senior expert',
        estimatedTime: 60,
        requiredApprovals: ['manager']
      });
      totalTime += 60;
    }

    if ([EscalationLevel.MANAGEMENT, EscalationLevel.LEGAL].includes(targetLevel)) {
      steps.push({
        level: EscalationLevel.MANAGEMENT,
        action: 'Management Review',
        description: 'Escalate to management for decision making',
        estimatedTime: 120,
        requiredApprovals: ['director']
      });
      totalTime += 120;
    }

    if (targetLevel === EscalationLevel.LEGAL) {
      steps.push({
        level: EscalationLevel.LEGAL,
        action: 'Legal Review',
        description: 'Involve legal team for compliance review',
        estimatedTime: 240,
        requiredApprovals: ['legal_counsel', 'compliance_officer']
      });
      totalTime += 240;
    }

    // If no escalation needed, create a standard resolution path
    if (steps.length === 0) {
      steps.push({
        level: EscalationLevel.L1_AGENT,
        action: 'Standard Resolution',
        description: 'Handle through standard support process',
        estimatedTime: 30
      });
      totalTime += 30;
    }

    return {
      currentLevel,
      targetLevel,
      steps,
      estimatedTime: totalTime
    };
  }

  async getEscalationHistory(issueId: string): Promise<Array<{
    level: EscalationLevel;
    timestamp: Date;
    reason: string;
    outcome?: string;
  }>> {
    // In a real implementation, this would query an escalation history table
    logger.debug('Getting escalation history', { issueId });
    return [];
  }

  async getEscalationMetrics(): Promise<{
    averageEscalationTime: number;
    escalationRate: number;
    escalationsByLevel: Record<EscalationLevel, number>;
    escalationsByCategory: Record<IssueCategory, number>;
  }> {
    // Mock metrics - in production, calculate from database
    return {
      averageEscalationTime: 45, // minutes
      escalationRate: 0.15, // 15% of issues escalate
      escalationsByLevel: {
        [EscalationLevel.NONE]: 0,
        [EscalationLevel.L1_AGENT]: 0,
        [EscalationLevel.L2_SPECIALIST]: 8,
        [EscalationLevel.L3_EXPERT]: 3,
        [EscalationLevel.MANAGEMENT]: 1,
        [EscalationLevel.LEGAL]: 0
      },
      escalationsByCategory: {
        [IssueCategory.TECHNICAL]: 5,
        [IssueCategory.BILLING]: 2,
        [IssueCategory.ACCOUNT]: 1,
        [IssueCategory.PRODUCT]: 2,
        [IssueCategory.SHIPPING]: 1,
        [IssueCategory.REFUND]: 1,
        [IssueCategory.COMPLAINT]: 0,
        [IssueCategory.GENERAL]: 0,
        [IssueCategory.COMPLIANCE]: 1,
        [IssueCategory.SECURITY]: 0
      }
    };
  }

  private evaluatePriority(priority: IssuePriority): { score: number; reason?: string } {
    switch (priority) {
      case IssuePriority.CRITICAL:
        return { score: 5, reason: 'Critical priority issue' };
      case IssuePriority.HIGH:
        return { score: 3, reason: 'High priority issue' };
      case IssuePriority.MEDIUM:
        return { score: 1 };
      case IssuePriority.LOW:
        return { score: 0 };
      default:
        return { score: 0 };
    }
  }

  private evaluateCategory(category: IssueCategory): { score: number; reason?: string } {
    const escalationCategories: Record<IssueCategory, { score: number; reason: string }> = {
      [IssueCategory.COMPLIANCE]: { score: 4, reason: 'Compliance issue requires specialized handling' },
      [IssueCategory.SECURITY]: { score: 4, reason: 'Security issue requires immediate escalation' },
      [IssueCategory.TECHNICAL]: { score: 2, reason: 'Technical issue may require specialist' },
      [IssueCategory.BILLING]: { score: 1, reason: 'Billing issues may require finance team' },
      [IssueCategory.ACCOUNT]: { score: 0 },
      [IssueCategory.PRODUCT]: { score: 1, reason: 'Product issue may need product team' },
      [IssueCategory.SHIPPING]: { score: 0 },
      [IssueCategory.REFUND]: { score: 0 },
      [IssueCategory.COMPLAINT]: { score: 1, reason: 'Customer complaint may need management' },
      [IssueCategory.GENERAL]: { score: 0 }
    };

    return escalationCategories[category] || { score: 0 };
  }

  private evaluateContext(context: IIssueContext): { score: number; reason?: string } {
    let score = 0;
    const reasons: string[] = [];

    if (context.customerTier === 'enterprise') {
      score += 2;
      reasons.push('Enterprise customer');
    }

    if (context.slaTier === 'premium') {
      score += 2;
      reasons.push('Premium SLA requires elevated response');
    }

    if (context.previousIssues && context.previousIssues > 5) {
      score += 1;
      reasons.push('High volume customer');
    }

    if (context.contractValue && context.contractValue > 100000) {
      score += 1;
      reasons.push('High value contract');
    }

    return {
      score,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined
    };
  }

  private evaluateComplexity(description: string): { score: number; reason?: string } {
    let score = 0;
    const reasons: string[] = [];

    const complexKeywords = [
      'multiple',
      'various',
      'intermittent',
      'recurring',
      'production',
      'database',
      'integration',
      'API',
      'authentication',
      'migration',
      'performance',
      'scalability'
    ];

    const descriptionLower = description.toLowerCase();
    const foundKeywords = complexKeywords.filter(k => descriptionLower.includes(k));

    if (foundKeywords.length >= 2) {
      score += 2;
      reasons.push('Complex technical issue');
    } else if (foundKeywords.length === 1) {
      score += 1;
      reasons.push('Moderate complexity');
    }

    if (description.length > 500) {
      score += 1;
      reasons.push('Detailed issue description');
    }

    return {
      score,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined
    };
  }

  private evaluateSentiment(description: string): { score: number; reason?: string } {
    let score = 0;
    const reasons: string[] = [];

    const urgentKeywords = [
      'urgent',
      'immediately',
      'asap',
      'critical',
      'emergency',
      'immediately',
      'right now'
    ];

    const negativeKeywords = [
      'frustrated',
      'angry',
      'unacceptable',
      'worst',
      'terrible',
      'disappointed',
      'outraged',
      'lawsuit',
      'regulatory',
      'lawyer'
    ];

    const descriptionLower = description.toLowerCase();

    const hasUrgent = urgentKeywords.some(k => descriptionLower.includes(k));
    const hasNegative = negativeKeywords.some(k => descriptionLower.includes(k));

    if (hasUrgent) {
      score += 2;
      reasons.push('Customer indicates urgency');
    }

    if (hasNegative) {
      score += 2;
      reasons.push('Negative sentiment detected');
    }

    return {
      score,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined
    };
  }

  private estimateWaitTime(level: EscalationLevel): number {
    const waitTimes: Record<EscalationLevel, number> = {
      [EscalationLevel.NONE]: 0,
      [EscalationLevel.L1_AGENT]: 5,
      [EscalationLevel.L2_SPECIALIST]: 15,
      [EscalationLevel.L3_EXPERT]: 30,
      [EscalationLevel.MANAGEMENT]: 60,
      [EscalationLevel.LEGAL]: 120
    };

    return waitTimes[level] || 0;
  }
}

export const escalationService = new EscalationService();
export { EscalationService };
