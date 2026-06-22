import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { aiProviderService } from './aiProviderService';
import {
  IssuePriority,
  IssueCategory,
  EscalationLevel,
  StepType,
  StepStatus,
  IResolutionStep,
  IActionItem,
  ISuccessCriteria,
  IIssue,
  IIssueContext
} from '../models/resolution';

interface IssueAnalysis {
  rootCause: string;
  impact: string;
  affectedSystems: string[];
  complexity: 'low' | 'medium' | 'high';
  recommendation: string;
}

interface PlanGenerationContext {
  customerId?: string;
  customerTier?: 'free' | 'basic' | 'premium' | 'enterprise';
  product?: string;
  previousIssues?: number;
  slaTier?: 'standard' | 'priority' | 'premium';
  templates?: Array<{
    steps: IResolutionStep[];
    successRate: number;
  }>;
}

interface GeneratedPlan {
  steps: IResolutionStep[];
  actionItems: IActionItem[];
  successCriteria: ISuccessCriteria[];
  estimatedTotalTime: number;
  confidence: number;
  escalationRecommended: boolean;
  escalationReason?: string;
  escalationLevel?: EscalationLevel;
  metadata: Record<string, unknown>;
}

class PlanGeneratorService {
  private readonly DEFAULT_ESCALATION_LEVELS: Record<string, EscalationLevel> = {
    critical: EscalationLevel.L2_SPECIALIST,
    high: EscalationLevel.L1_AGENT,
    medium: EscalationLevel.L1_AGENT,
    low: EscalationLevel.NONE
  };

  async analyzeIssue(issue: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
    context?: IIssueContext;
  }): Promise<IssueAnalysis> {
    logger.info('Analyzing issue', { issueTitle: issue.title, category: issue.category });

    try {
      // Use AI to analyze the issue
      const analysisPrompt = `Analyze this customer support issue and provide a structured analysis:

Issue Title: ${issue.title}
Issue Description: ${issue.description}
Category: ${issue.category}
Priority: ${issue.priority}
${issue.context ? `Context: ${JSON.stringify(issue.context)}` : ''}

Provide analysis covering:
1. Root cause hypothesis
2. Impact assessment
3. Affected systems/components
4. Complexity level (low/medium/high)
5. Recommended approach

Format as JSON with keys: rootCause, impact, affectedSystems, complexity, recommendation`;

      const response = await aiProviderService.callOpenAI(
        analysisPrompt,
        'You are a customer support expert analyzing issues. Return ONLY valid JSON.'
      );

      try {
        const analysis = JSON.parse(response.content);
        return {
          rootCause: analysis.rootCause || 'Under investigation',
          impact: analysis.impact || 'Customer experience affected',
          affectedSystems: analysis.affectedSystems || [],
          complexity: analysis.complexity || 'medium',
          recommendation: analysis.recommendation || 'Standard resolution process'
        };
      } catch {
        // JSON parsing failed, use fallback analysis
        return this.performFallbackAnalysis(issue);
      }
    } catch (error) {
      logger.error('Issue analysis failed, using fallback', { error });
      return this.performFallbackAnalysis(issue);
    }
  }

  async generatePlan(
    issue: {
      title: string;
      description: string;
      category: IssueCategory;
      priority: IssuePriority;
      issueId: string;
    },
    context?: PlanGenerationContext
  ): Promise<GeneratedPlan> {
    logger.info('Generating resolution plan', {
      issueId: issue.issueId,
      category: issue.category,
      priority: issue.priority
    });

    try {
      // First, analyze the issue
      const analysis = await this.analyzeIssue(issue);

      // Generate plan text using AI
      const planText = await aiProviderService.generatePlanText({
        title: issue.title,
        description: issue.description,
        category: issue.category,
        priority: issue.priority,
        context: {
          analysis,
          ...context
        }
      });

      // Parse steps from the generated text
      const parsedSteps = await aiProviderService.extractSteps(planText);

      // Convert to structured steps
      const steps = this.convertToStructuredSteps(parsedSteps, issue);

      // Generate action items from steps
      const actionItems = this.createActionItems(steps, issue.issueId);

      // Generate success criteria
      const successCriteria = this.generateSuccessCriteria(issue, steps);

      // Calculate total estimated time
      const estimatedTotalTime = steps.reduce((total, step) => total + step.estimatedTime, 0);

      // Determine if escalation is needed
      const escalationRecommended = await this.suggestEscalation({
        ...issue,
        context: context as IIssueContext
      });

      // Calculate confidence based on various factors
      const confidence = this.calculateConfidence(issue, steps, context);

      // Improve plan quality
      const { improvements } = await aiProviderService.improvePlan({
        steps: steps.map(s => ({
          title: s.title,
          description: s.description,
          type: s.type,
          estimatedTime: s.estimatedTime
        })),
        successCriteria: successCriteria.map(s => s.description)
      });

      logger.info('Plan generation completed', {
        issueId: issue.issueId,
        stepCount: steps.length,
        estimatedTime: estimatedTotalTime,
        confidence,
        escalationRecommended
      });

      return {
        steps,
        actionItems,
        successCriteria,
        estimatedTotalTime,
        confidence,
        escalationRecommended,
        escalationReason: escalationRecommended.escalationReason,
        escalationLevel: escalationRecommended.escalationLevel,
        metadata: {
          analysis,
          improvements,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Plan generation failed, using fallback', {
        error,
        issueId: issue.issueId
      });

      // Return a basic fallback plan
      return this.generateFallbackPlan(issue);
    }
  }

  async suggestEscalation(issue: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
    context?: IIssueContext;
  }): Promise<{
    shouldEscalate: boolean;
    escalationLevel: EscalationLevel;
    escalationReason: string;
  }> {
    logger.debug('Evaluating escalation needs', { issueTitle: issue.title });

    const escalationCriteria = {
      priority: this.evaluatePriorityEscalation(issue.priority),
      category: this.evaluateCategoryEscalation(issue.category),
      context: this.evaluateContextEscalation(issue.context),
      complexity: this.evaluateComplexityEscalation(issue.description),
      sentiment: this.evaluateSentimentEscalation(issue.description)
    };

    const shouldEscalate =
      escalationCriteria.priority ||
      escalationCriteria.category ||
      escalationCriteria.context ||
      escalationCriteria.complexity ||
      escalationCriteria.sentiment;

    let escalationLevel = this.DEFAULT_ESCALATION_LEVELS[issue.priority.toLowerCase()];

    // Upgrade escalation level based on multiple factors
    const escalationScore =
      (escalationCriteria.priority ? 2 : 0) +
      (escalationCriteria.category ? 1 : 0) +
      (escalationCriteria.context ? 1 : 0) +
      (escalationCriteria.complexity ? 1 : 0) +
      (escalationCriteria.sentiment ? 1 : 0);

    if (escalationScore >= 3) {
      escalationLevel = EscalationLevel.L3_EXPERT;
    } else if (escalationScore >= 2) {
      escalationLevel = EscalationLevel.L2_SPECIALIST;
    } else if (escalationScore >= 1) {
      escalationLevel = EscalationLevel.L1_AGENT;
    } else {
      escalationLevel = EscalationLevel.NONE;
    }

    const escalationReasons: string[] = [];
    if (escalationCriteria.priority) escalationReasons.push('High/critical priority');
    if (escalationCriteria.category) escalationReasons.push('Complex category');
    if (escalationCriteria.context) escalationReasons.push('VIP or enterprise customer');
    if (escalationCriteria.complexity) escalationReasons.push('Technically complex issue');
    if (escalationCriteria.sentiment) escalationReasons.push('Negative sentiment detected');

    return {
      shouldEscalate,
      escalationLevel,
      escalationReason: escalationReasons.length > 0
        ? escalationReasons.join(', ')
        : 'Standard resolution path'
    };
  }

  estimateResolutionTime(issue: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
    context?: IIssueContext;
  }): {
    optimistic: number;
    realistic: number;
    pessimistic: number;
    confidence: number;
  } {
    // Base time by priority (in minutes)
    const baseTimes: Record<IssuePriority, { optimistic: number; realistic: number; pessimistic: number }> = {
      [IssuePriority.CRITICAL]: { optimistic: 15, realistic: 30, pessimistic: 120 },
      [IssuePriority.HIGH]: { optimistic: 20, realistic: 45, pessimistic: 180 },
      [IssuePriority.MEDIUM]: { optimistic: 30, realistic: 60, pessimistic: 240 },
      [IssuePriority.LOW]: { optimistic: 15, realistic: 30, pessimistic: 120 }
    };

    // Category-specific modifiers
    const categoryModifiers: Record<string, number> = {
      [IssueCategory.TECHNICAL]: 1.5,
      [IssueCategory.COMPLIANCE]: 1.8,
      [IssueCategory.BILLING]: 1.2,
      [IssueCategory.ACCOUNT]: 1.0,
      [IssueCategory.PRODUCT]: 1.3,
      [IssueCategory.SHIPPING]: 1.2,
      [IssueCategory.REFUND]: 1.1,
      [IssueCategory.COMPLAINT]: 1.4,
      [IssueCategory.GENERAL]: 1.0,
      [IssueCategory.SECURITY]: 2.0
    };

    const base = baseTimes[issue.priority];
    const modifier = categoryModifiers[issue.category.toLowerCase()] || 1.0;

    // Apply context modifiers
    let contextMultiplier = 1.0;
    if (issue.context) {
      if (issue.context.customerTier === 'enterprise') contextMultiplier *= 1.2;
      if (issue.context.slaTier === 'premium') contextMultiplier *= 0.8;
      if (issue.context.previousIssues && issue.context.previousIssues > 5) contextMultiplier *= 1.3;
    }

    const optimistic = Math.round(base.optimistic * modifier * contextMultiplier);
    const realistic = Math.round(base.realistic * modifier * contextMultiplier);
    const pessimistic = Math.round(base.pessimistic * modifier * contextMultiplier);

    // Calculate confidence based on available information
    let confidence = 0.5;
    if (issue.context) confidence += 0.2;
    if (issue.description.length > 100) confidence += 0.1;
    if (modifier < 1.5) confidence += 0.2;

    return {
      optimistic,
      realistic,
      pessimistic,
      confidence: Math.min(confidence, 0.95)
    };
  }

  generateSuccessCriteria(issue: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
  }): ISuccessCriteria[] {
    const criteria: ISuccessCriteria[] = [];

    // Common criteria for all issues
    criteria.push({
      description: 'Customer confirms issue is resolved',
      type: 'functional',
      isMet: false
    });

    criteria.push({
      description: 'All affected systems function normally',
      type: 'verifiable',
      isMet: false
    });

    // Category-specific criteria
    switch (issue.category) {
      case IssueCategory.TECHNICAL:
        criteria.push({
          description: 'No error messages in system logs for 24 hours',
          type: 'measurable',
          targetValue: '0 errors',
          currentValue: undefined,
          isMet: false
        });
        criteria.push({
          description: 'All tests pass successfully',
          type: 'verifiable',
          isMet: false
        });
        break;

      case IssueCategory.BILLING:
        criteria.push({
          description: 'Correct billing amount reflected in account',
          type: 'measurable',
          targetValue: undefined,
          currentValue: undefined,
          isMet: false
        });
        criteria.push({
          description: 'No duplicate charges detected',
          type: 'measurable',
          targetValue: '0 duplicates',
          currentValue: undefined,
          isMet: false
        });
        criteria.push({
          description: 'Refund processed if applicable',
          type: 'functional',
          isMet: false
        });
        break;

      case IssueCategory.ACCOUNT:
        criteria.push({
          description: 'Account access restored',
          type: 'functional',
          isMet: false
        });
        criteria.push({
          description: 'All account settings verified',
          type: 'verifiable',
          isMet: false
        });
        criteria.push({
          description: 'Security verification passed',
          type: 'verifiable',
          isMet: false
        });
        break;

      case IssueCategory.SHIPPING:
        criteria.push({
          description: 'Package tracking shows delivery',
          type: 'measurable',
          targetValue: 'Delivered',
          currentValue: undefined,
          isMet: false
        });
        criteria.push({
          description: 'Delivery within promised timeframe',
          type: 'measurable',
          isMet: false
        });
        break;

      case IssueCategory.REFUND:
        criteria.push({
          description: 'Refund amount matches expected',
          type: 'measurable',
          isMet: false
        });
        criteria.push({
          description: 'Refund processed within policy timeframe',
          type: 'measurable',
          targetValue: '7 business days',
          currentValue: undefined,
          isMet: false
        });
        break;

      case IssueCategory.SECURITY:
        criteria.push({
          description: 'Security audit passed',
          type: 'verifiable',
          isMet: false
        });
        criteria.push({
          description: 'All affected accounts secured',
          type: 'functional',
          isMet: false
        });
        criteria.push({
          description: 'No further suspicious activity',
          type: 'measurable',
          targetValue: '0 suspicious activities',
          currentValue: undefined,
          isMet: false
        });
        break;

      default:
        criteria.push({
          description: 'Original functionality restored',
          type: 'functional',
          isMet: false
        });
    }

    // Priority-specific criteria
    if (issue.priority === IssuePriority.CRITICAL) {
      criteria.push({
        description: 'Resolution completed within 1 hour',
        type: 'measurable',
        targetValue: '60 minutes',
        currentValue: undefined,
        isMet: false
      });
      criteria.push({
        description: 'Management notified of resolution',
        type: 'functional',
        isMet: false
      });
    }

    return criteria;
  }

  createActionItems(steps: IResolutionStep[], issueId: string): IActionItem[] {
    const actionItems: IActionItem[] = [];

    steps.forEach((step, index) => {
      if (step.agentAction) {
        actionItems.push({
          id: uuidv4(),
          title: `Agent: ${step.agentAction.action}`,
          description: step.agentAction.description,
          type: 'agent',
          assignee: 'agent',
          priority: this.determineActionPriority(step),
          status: 'pending',
          dueDate: this.calculateDueDate(step.estimatedTime, index, steps.length)
        });
      }

      if (step.customerAction) {
        actionItems.push({
          id: uuidv4(),
          title: `Customer: ${step.customerAction.action}`,
          description: step.customerAction.description,
          type: 'customer',
          assignee: 'customer',
          priority: this.determineActionPriority(step),
          status: 'pending',
          dueDate: this.calculateDueDate(step.customerAction.expectedTime, index, steps.length)
        });
      }
    });

    return actionItems;
  }

  private performFallbackAnalysis(issue: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
    context?: IIssueContext;
  }): IssueAnalysis {
    const complexity = issue.priority === IssuePriority.CRITICAL || issue.priority === IssuePriority.HIGH
      ? 'high'
      : issue.description.length > 500
        ? 'medium'
        : 'low';

    return {
      rootCause: this.inferRootCause(issue.category, issue.description),
      impact: this.assessImpact(issue.priority),
      affectedSystems: this.getAffectedSystems(issue.category),
      complexity,
      recommendation: this.getRecommendation(issue.category, complexity)
    };
  }

  private inferRootCause(category: IssueCategory, description: string): string {
    const keywords = description.toLowerCase();

    const rootCausePatterns: Array<{ keywords: string[]; cause: string }> = [
      { keywords: ['password', 'login', 'authenticate', 'credential'], cause: 'Authentication failure' },
      { keywords: ['payment', 'charge', 'billing', 'invoice'], cause: 'Payment processing issue' },
      { keywords: ['slow', 'loading', 'timeout', 'performance'], cause: 'Performance degradation' },
      { keywords: ['error', 'exception', 'crash', 'bug'], cause: 'Application error' },
      { keywords: ['missing', 'not found', 'empty'], cause: 'Data missing or corrupted' },
      { keywords: ['delay', 'late', 'waiting'], cause: 'Processing delay' },
      { keywords: ['refund', 'money', 'return'], cause: 'Refund request' },
      { keywords: ['access', 'permission', 'denied'], cause: 'Access control issue' }
    ];

    for (const pattern of rootCausePatterns) {
      if (pattern.keywords.some(keyword => keywords.includes(keyword))) {
        return pattern.cause;
      }
    }

    return `${category} issue requiring investigation`;
  }

  private assessImpact(priority: IssuePriority): string {
    const impacts: Record<IssuePriority, string> = {
      [IssuePriority.CRITICAL]: 'Business-critical operations halted',
      [IssuePriority.HIGH]: 'Major functionality impaired',
      [IssuePriority.MEDIUM]: 'Moderate impact on user experience',
      [IssuePriority.LOW]: 'Minor inconvenience'
    };
    return impacts[priority];
  }

  private getAffectedSystems(category: IssueCategory): string[] {
    const systems: Record<IssueCategory, string[]> = {
      [IssueCategory.TECHNICAL]: ['Application', 'Database', 'API'],
      [IssueCategory.BILLING]: ['Payment Gateway', 'Invoice System', 'Accounting'],
      [IssueCategory.ACCOUNT]: ['User Management', 'Authentication'],
      [IssueCategory.PRODUCT]: ['Product Service', 'Inventory'],
      [IssueCategory.SHIPPING]: ['Logistics', 'Warehouse', 'Carrier Integration'],
      [IssueCategory.REFUND]: ['Payment Gateway', 'Accounting'],
      [IssueCategory.COMPLAINT]: ['Customer Relations'],
      [IssueCategory.GENERAL]: ['Multiple Systems'],
      [IssueCategory.COMPLIANCE]: ['Legal', 'Compliance'],
      [IssueCategory.SECURITY]: ['Security Systems', 'Access Control']
    };
    return systems[category] || ['General Systems'];
  }

  private getRecommendation(category: IssueCategory, complexity: string): string {
    const recommendations: Record<string, string> = {
      technical: 'Technical investigation required. Escalate to L2 if complexity is high.',
      billing: 'Review transaction history and payment records.',
      account: 'Verify account status and recent changes.',
      product: 'Check product catalog and inventory systems.',
      shipping: 'Coordinate with logistics partners.',
      refund: 'Verify refund eligibility per policy.',
      complaint: 'Empathetic response with solution-focused resolution.',
      general: 'Standard troubleshooting procedures apply.'
    };

    const base = recommendations[category.toLowerCase()] || recommendations.general;
    return complexity === 'high' ? `${base} Due to complexity, recommend L2 specialist involvement.` : base;
  }

  private convertToStructuredSteps(
    parsedSteps: Array<{
      stepNumber: number;
      type: string;
      title: string;
      description: string;
      estimatedTime: number;
      conditions?: string[];
      agentAction?: {
        action: string;
        description: string;
        instructions: string;
        tools?: string[];
        expectedOutcome: string;
        estimatedTime: number;
        preRequisites?: string[];
      };
      customerAction?: {
        action: string;
        description: string;
        instructions: string[];
        expectedTime: number;
        canSkip: boolean;
      };
    }>,
    issue: { issueId: string; category: IssueCategory }
  ): IResolutionStep[] {
    return parsedSteps.map((step, index) => {
      const stepType = this.determineStepType(step.type);

      const structuredStep: IResolutionStep = {
        stepNumber: step.stepNumber || index + 1,
        type: stepType,
        title: step.title,
        description: step.description,
        estimatedTime: step.estimatedTime || 5,
        status: StepStatus.PENDING,
        order: index + 1,
        conditions: step.conditions
      };

      if (stepType === StepType.AGENT_ACTION || stepType === StepType.SYSTEM_ACTION) {
        structuredStep.agentAction = {
          id: uuidv4(),
          action: step.title,
          description: step.description,
          instructions: step.agentAction?.instructions || step.description,
          tools: step.agentAction?.tools,
          expectedOutcome: step.agentAction?.expectedOutcome || 'Step completed successfully',
          estimatedTime: step.estimatedTime || 5,
          preRequisites: step.agentAction?.preRequisites
        };
      } else if (stepType === StepType.CUSTOMER_ACTION) {
        structuredStep.customerAction = {
          id: uuidv4(),
          action: step.title,
          description: step.description,
          instructions: step.customerAction?.instructions || [step.description],
          expectedTime: step.customerAction?.expectedTime || step.estimatedTime || 5,
          canSkip: step.customerAction?.canSkip ?? false
        };
      }

      return structuredStep;
    });
  }

  private determineStepType(type: string): StepType {
    const typeMap: Record<string, StepType> = {
      agent_action: StepType.AGENT_ACTION,
      customer_action: StepType.CUSTOMER_ACTION,
      system_action: StepType.SYSTEM_ACTION,
      wait: StepType.WAIT,
      condition: StepType.CONDITION,
      escalation: StepType.ESCALATION
    };

    return typeMap[type.toLowerCase()] || StepType.AGENT_ACTION;
  }

  private calculateConfidence(
    issue: { category: IssueCategory; priority: IssuePriority; description: string },
    steps: IResolutionStep[],
    context?: PlanGenerationContext
  ): number {
    let confidence = 0.3; // Base confidence

    // Description length contributes to confidence
    if (issue.description.length > 100) confidence += 0.15;
    if (issue.description.length > 500) confidence += 0.1;

    // Step count indicates thorough planning
    if (steps.length >= 3) confidence += 0.1;
    if (steps.length >= 5) confidence += 0.1;

    // Context availability
    if (context) confidence += 0.15;

    // Template match (if available)
    if (context?.templates && context.templates.length > 0) {
      const avgSuccessRate = context.templates.reduce((sum, t) => sum + t.successRate, 0) / context.templates.length;
      confidence += avgSuccessRate * 0.2;
    }

    return Math.min(confidence, 0.95);
  }

  private generateFallbackPlan(issue: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
    issueId: string;
  }): GeneratedPlan {
    const steps: IResolutionStep[] = [
      {
        stepNumber: 1,
        type: StepType.AGENT_ACTION,
        title: 'Initial Assessment',
        description: 'Review the issue details and gather additional information if needed',
        agentAction: {
          id: uuidv4(),
          action: 'Initial Assessment',
          description: 'Review the issue details and gather additional information if needed',
          instructions: '1. Read the issue description carefully\n2. Check for any related tickets\n3. Gather any missing information',
          expectedOutcome: 'Complete understanding of the issue',
          estimatedTime: 10
        },
        estimatedTime: 10,
        status: StepStatus.PENDING,
        order: 1
      },
      {
        stepNumber: 2,
        type: StepType.AGENT_ACTION,
        title: 'Investigation',
        description: 'Investigate the root cause of the issue',
        agentAction: {
          id: uuidv4(),
          action: 'Investigate Issue',
          description: 'Investigate the root cause of the issue',
          instructions: '1. Check relevant systems and logs\n2. Identify potential causes\n3. Document findings',
          expectedOutcome: 'Root cause identified',
          estimatedTime: 15
        },
        estimatedTime: 15,
        status: StepStatus.PENDING,
        order: 2
      },
      {
        stepNumber: 3,
        type: StepType.AGENT_ACTION,
        title: 'Implement Resolution',
        description: 'Apply the appropriate solution to resolve the issue',
        agentAction: {
          id: uuidv4(),
          action: 'Implement Resolution',
          description: 'Apply the appropriate solution to resolve the issue',
          instructions: '1. Apply the identified solution\n2. Test the fix\n3. Verify functionality',
          expectedOutcome: 'Issue resolved',
          estimatedTime: 20
        },
        estimatedTime: 20,
        status: StepStatus.PENDING,
        order: 3
      },
      {
        stepNumber: 4,
        type: StepType.AGENT_ACTION,
        title: 'Verification & Close',
        description: 'Verify the resolution and close the ticket',
        agentAction: {
          id: uuidv4(),
          action: 'Verify & Close',
          description: 'Verify the resolution and close the ticket',
          instructions: '1. Confirm with customer\n2. Document the resolution\n3. Close the ticket',
          expectedOutcome: 'Customer satisfied, ticket closed',
          estimatedTime: 5
        },
        estimatedTime: 5,
        status: StepStatus.PENDING,
        order: 4
      }
    ];

    return {
      steps,
      actionItems: this.createActionItems(steps, issue.issueId),
      successCriteria: this.generateSuccessCriteria(issue),
      estimatedTotalTime: 50,
      confidence: 0.4,
      escalationRecommended: issue.priority === IssuePriority.CRITICAL,
      escalationReason: issue.priority === IssuePriority.CRITICAL ? 'Critical priority issue' : undefined,
      escalationLevel: issue.priority === IssuePriority.CRITICAL ? EscalationLevel.L2_SPECIALIST : EscalationLevel.NONE,
      metadata: {
        generatedAt: new Date().toISOString(),
        fallbackGeneration: true
      }
    };
  }

  private evaluatePriorityEscalation(priority: IssuePriority): boolean {
    return priority === IssuePriority.CRITICAL || priority === IssuePriority.HIGH;
  }

  private evaluateCategoryEscalation(category: IssueCategory): boolean {
    const escalationCategories = [
      IssueCategory.COMPLIANCE,
      IssueCategory.SECURITY,
      IssueCategory.TECHNICAL
    ];
    return escalationCategories.includes(category);
  }

  private evaluateContextEscalation(context?: IIssueContext): boolean {
    if (!context) return false;
    return context.customerTier === 'enterprise' || context.slaTier === 'premium';
  }

  private evaluateComplexityEscalation(description: string): boolean {
    const complexIndicators = [
      'multiple',
      'various',
      'intermittent',
      'recurring',
      'critical',
      'production',
      'database',
      'integration',
      'API',
      'authentication',
      'security'
    ];

    const descriptionLower = description.toLowerCase();
    return complexIndicators.filter(indicator => descriptionLower.includes(indicator)).length >= 2;
  }

  private evaluateSentimentEscalation(description: string): boolean {
    const negativeIndicators = [
      'frustrated',
      'angry',
      'unacceptable',
      'worst',
      'terrible',
      'disappointed',
      'urgent',
      'immediately',
      'lawsuit',
      'regulatory'
    ];

    const descriptionLower = description.toLowerCase();
    return negativeIndicators.some(indicator => descriptionLower.includes(indicator));
  }

  private determineActionPriority(step: IResolutionStep): IssuePriority {
    if (step.type === StepType.ESCALATION) return IssuePriority.HIGH;
    if (step.type === StepType.SYSTEM_ACTION) return IssuePriority.MEDIUM;
    return IssuePriority.MEDIUM;
  }

  private calculateDueDate(
    estimatedTime: number,
    currentStepIndex: number,
    totalSteps: number
  ): Date {
    const now = new Date();
    // Start timing from step 1, accumulate time for previous steps
    const minutesToAdd = estimatedTime * (currentStepIndex + 1);
    return new Date(now.getTime() + minutesToAdd * 60 * 1000);
  }
}

export const planGeneratorService = new PlanGeneratorService();
export { PlanGeneratorService };
