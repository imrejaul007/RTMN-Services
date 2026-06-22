// ============================================================================
// SUTAR GoalOS - Decomposition Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  Goal,
  GoalCategory,
  Priority,
  DecomposeGoalRequest,
  DecompositionResult,
} from '../types/index.js';
import { GoalStatus as GoalStatusEnum, GoalCategory as GoalCategoryEnum, Priority as PriorityEnum } from '../types/index.js';
import { GoalService } from './goalService.js';
import { IntegrationService } from './integrationService.js';

interface DecompositionStrategy {
  name: string;
  description: string;
  subGoalTemplates: Array<{
    title: string;
    description: string;
    category: GoalCategory;
    priority: Priority;
  }>;
}

export class DecompositionService {
  private goalService: GoalService;
  private integrationService: IntegrationService;

  // Predefined decomposition strategies
  private strategies: Map<string, DecompositionStrategy> = new Map([
    ['growth', {
      name: 'growth',
      description: 'Growth-oriented goal decomposition',
      subGoalTemplates: [
        { title: 'Market Research', description: 'Conduct market research and analysis', category: GoalCategoryEnum.GROWTH, priority: PriorityEnum.HIGH },
        { title: 'Product Development', description: 'Develop or improve product offerings', category: GoalCategoryEnum.GROWTH, priority: PriorityEnum.HIGH },
        { title: 'Customer Acquisition', description: 'Acquire new customers', category: GoalCategoryEnum.CUSTOMER, priority: PriorityEnum.MEDIUM },
        { title: 'Retention Strategy', description: 'Retain existing customers', category: GoalCategoryEnum.CUSTOMER, priority: PriorityEnum.MEDIUM },
        { title: 'Revenue Optimization', description: 'Optimize revenue streams', category: GoalCategoryEnum.FINANCIAL, priority: PriorityEnum.HIGH },
      ],
    }],
    ['operational', {
      name: 'operational',
      description: 'Operational efficiency goal decomposition',
      subGoalTemplates: [
        { title: 'Process Audit', description: 'Audit current processes', category: GoalCategoryEnum.OPERATIONAL, priority: PriorityEnum.HIGH },
        { title: 'Workflow Optimization', description: 'Optimize workflows', category: GoalCategoryEnum.OPERATIONAL, priority: PriorityEnum.HIGH },
        { title: 'Automation Implementation', description: 'Implement automation', category: GoalCategoryEnum.OPERATIONAL, priority: PriorityEnum.MEDIUM },
        { title: 'Training & Development', description: 'Train team members', category: GoalCategoryEnum.INTERNAL, priority: PriorityEnum.MEDIUM },
        { title: 'Performance Monitoring', description: 'Monitor performance metrics', category: GoalCategoryEnum.OPERATIONAL, priority: PriorityEnum.LOW },
      ],
    }],
    ['financial', {
      name: 'financial',
      description: 'Financial goal decomposition',
      subGoalTemplates: [
        { title: 'Cost Analysis', description: 'Analyze current costs', category: GoalCategoryEnum.FINANCIAL, priority: PriorityEnum.HIGH },
        { title: 'Revenue Planning', description: 'Plan revenue strategies', category: GoalCategoryEnum.FINANCIAL, priority: PriorityEnum.HIGH },
        { title: 'Budget Optimization', description: 'Optimize budget allocation', category: GoalCategoryEnum.FINANCIAL, priority: PriorityEnum.MEDIUM },
        { title: 'Investment Planning', description: 'Plan investments', category: GoalCategoryEnum.FINANCIAL, priority: PriorityEnum.MEDIUM },
        { title: 'Financial Reporting', description: 'Set up financial reporting', category: GoalCategoryEnum.FINANCIAL, priority: PriorityEnum.LOW },
      ],
    }],
    ['innovation', {
      name: 'innovation',
      description: 'Innovation goal decomposition',
      subGoalTemplates: [
        { title: 'Idea Generation', description: 'Generate new ideas', category: GoalCategoryEnum.INNOVATION, priority: PriorityEnum.HIGH },
        { title: 'Concept Development', description: 'Develop concepts', category: GoalCategoryEnum.INNOVATION, priority: PriorityEnum.HIGH },
        { title: 'Prototype Creation', description: 'Create prototypes', category: GoalCategoryEnum.INNOVATION, priority: PriorityEnum.MEDIUM },
        { title: 'Testing & Validation', description: 'Test and validate', category: GoalCategoryEnum.INNOVATION, priority: PriorityEnum.MEDIUM },
        { title: 'Launch Planning', description: 'Plan launch', category: GoalCategoryEnum.INNOVATION, priority: PriorityEnum.LOW },
      ],
    }],
    ['default', {
      name: 'default',
      description: 'Generic goal decomposition',
      subGoalTemplates: [
        { title: 'Research & Analysis', description: 'Research and analyze requirements', category: GoalCategoryEnum.OTHER, priority: PriorityEnum.HIGH },
        { title: 'Planning', description: 'Create detailed plan', category: GoalCategoryEnum.OTHER, priority: PriorityEnum.HIGH },
        { title: 'Execution', description: 'Execute the plan', category: GoalCategoryEnum.OTHER, priority: PriorityEnum.MEDIUM },
        { title: 'Monitoring', description: 'Monitor progress', category: GoalCategoryEnum.OTHER, priority: PriorityEnum.MEDIUM },
        { title: 'Review & Iterate', description: 'Review and iterate', category: GoalCategoryEnum.OTHER, priority: PriorityEnum.LOW },
      ],
    }],
  ]);

  constructor(goalService: GoalService, integrationService: IntegrationService) {
    this.goalService = goalService;
    this.integrationService = integrationService;
  }

  /**
   * Decompose a goal into sub-goals
   */
  async decompose(parentGoal: Goal, request: DecomposeGoalRequest): Promise<DecompositionResult> {
    const maxSubGoals = request.maxSubGoals || 5;
    const depth = request.depth || 2;

    // Determine strategy based on goal category
    const strategy = this.getStrategyForCategory(parentGoal.category, request.strategy || 'auto');

    // Generate sub-goals from strategy
    const templates = strategy.subGoalTemplates.slice(0, maxSubGoals);
    const subGoals: Goal[] = [];

    for (const template of templates) {
      const subGoal = await this.goalService.create({
        title: `${parentGoal.title}: ${template.title}`,
        description: template.description,
        category: template.category,
        priority: template.priority,
        parentGoalId: parentGoal.id,
        deadline: this.calculateSubGoalDeadline(parentGoal.deadline, subGoals.length, templates.length),
      });

      subGoals.push(subGoal);
    }

    // Try to get recommendations from Decision Engine
    let recommendations: string[] = [];
    try {
      const decisionResult = await this.integrationService.getRecommendations(parentGoal);
      if (decisionResult) {
        recommendations.push(...decisionResult);
      }
    } catch (error) {
      console.log('[DECOMPOSITION] Could not get recommendations from Decision Engine:', error);
    }

    // If depth > 1, recursively decompose some sub-goals
    if (depth > 1 && subGoals.length > 0) {
      const subGoalsToDecompose = subGoals.slice(0, Math.min(2, subGoals.length));

      for (const subGoal of subGoalsToDecompose) {
        const childResult = await this.decompose(subGoal, {
          ...request,
          depth: depth - 1,
          maxSubGoals: Math.floor(maxSubGoals / 2),
        });
        subGoals.push(...childResult.subGoals);
      }
    }

    return {
      parentGoal,
      subGoals,
      recommendations,
    };
  }

  /**
   * Get strategy for a goal category
   */
  private getStrategyForCategory(category: GoalCategory, strategyType: 'auto' | 'manual'): DecompositionStrategy {
    if (strategyType === 'manual') {
      return this.strategies.get('default')!;
    }

    const categoryStrategyMap: Record<GoalCategory, string> = {
      [GoalCategoryEnum.GROWTH]: 'growth',
      [GoalCategoryEnum.OPERATIONAL]: 'operational',
      [GoalCategoryEnum.FINANCIAL]: 'financial',
      [GoalCategoryEnum.INNOVATION]: 'innovation',
      [GoalCategoryEnum.CUSTOMER]: 'growth',
      [GoalCategoryEnum.INTERNAL]: 'operational',
      [GoalCategoryEnum.COMPLIANCE]: 'operational',
      [GoalCategoryEnum.OTHER]: 'default',
    };

    const strategyName = categoryStrategyMap[category] || 'default';
    return this.strategies.get(strategyName)!;
  }

  /**
   * Calculate deadline for a sub-goal based on parent deadline
   */
  private calculateSubGoalDeadline(parentDeadline: string | undefined, index: number, total: number): string | undefined {
    if (!parentDeadline) return undefined;

    const parentDate = new Date(parentDeadline);
    const now = new Date();
    const totalDays = Math.floor((parentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (totalDays <= 0) return parentDeadline;

    // Distribute deadlines evenly with some overlap
    const subGoalDays = Math.floor(totalDays * 0.8); // 80% of total time
    const startDate = new Date(now.getTime() + (totalDays * 0.1) * 24 * 60 * 60 * 1000); // Start at 10% into period
    const subGoalDeadline = new Date(startDate.getTime() + (index + 1) * (subGoalDays / total) * 24 * 60 * 60 * 1000);

    return subGoalDeadline.toISOString();
  }

  /**
   * Get available strategies
   */
  getStrategies(): Array<{ name: string; description: string }> {
    return Array.from(this.strategies.values()).map(s => ({
      name: s.name,
      description: s.description,
    }));
  }

  /**
   * Analyze goal complexity for decomposition
   */
  analyzeComplexity(goal: Goal): {
    complexity: 'low' | 'medium' | 'high';
    estimatedSubGoals: number;
    estimatedDuration: number;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    let complexityScore = 0;

    // Title length
    if (goal.title.length > 100) complexityScore += 2;
    else if (goal.title.length > 50) complexityScore += 1;

    // Description presence
    if (goal.description && goal.description.length > 500) complexityScore += 2;
    else if (goal.description && goal.description.length > 100) complexityScore += 1;

    // Has deadline
    if (goal.deadline) {
      const daysUntilDeadline = Math.floor(
        (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDeadline < 30) complexityScore += 2;
      else if (daysUntilDeadline < 90) complexityScore += 1;
    }

    // Priority
    if (goal.priority === 'CRITICAL') complexityScore += 2;
    else if (goal.priority === 'HIGH') complexityScore += 1;

    // Determine complexity
    let complexity: 'low' | 'medium' | 'high';
    if (complexityScore <= 2) complexity = 'low';
    else if (complexityScore <= 5) complexity = 'medium';
    else complexity = 'high';

    // Estimate sub-goals
    const estimatedSubGoals = Math.min(10, Math.max(2, Math.ceil(complexityScore)));

    // Estimate duration (in days)
    let estimatedDuration = 30;
    if (goal.deadline) {
      estimatedDuration = Math.floor(
        (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }

    // Risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (complexity === 'high' || estimatedDuration < 30) riskLevel = 'high';
    else if (complexity === 'medium' || estimatedDuration < 60) riskLevel = 'medium';

    return {
      complexity,
      estimatedSubGoals,
      estimatedDuration: Math.max(1, estimatedDuration),
      riskLevel,
    };
  }
}