import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { planGeneratorService } from './planGeneratorService';
import { templateService } from './templateService';
import { ResolutionPlan, ResolutionHistory, Issue, IssueStatus, ResolutionStatus } from '../models/resolution';
import type {
  IResolutionPlan,
  IResolutionStep,
  IActionItem,
  ISuccessCriteria,
  IResolutionTemplate,
  IssueCategory,
  IssuePriority
} from '../models/resolution';

interface ResolutionContext {
  customerId: string;
  agentId?: string;
  customerTier?: 'free' | 'basic' | 'premium' | 'enterprise';
  product?: string;
  previousIssues?: number;
  slaTier?: 'standard' | 'priority' | 'premium';
}

interface IssueInput {
  issueId: string;
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
  customerId: string;
  agentId?: string;
  context?: ResolutionContext;
}

interface TemplateMatch {
  template: IResolutionTemplate;
  similarityScore: number;
}

class ResolutionEngine {
  async processIssue(input: IssueInput): Promise<IResolutionPlan> {
    logger.info('Processing issue through resolution engine', {
      issueId: input.issueId,
      category: input.category,
      priority: input.priority
    });

    try {
      // Step 1: Check for similar past resolutions
      const similarTemplates = await this.matchTemplate({
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority
      });

      // Step 2: Create or fetch issue record
      let issue = await Issue.findOne({ issueId: input.issueId });
      if (!issue) {
        issue = await Issue.create({
          issueId: input.issueId,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          status: IssueStatus.OPEN,
          customerId: input.customerId,
          agentId: input.agentId,
          context: input.context || { customerId: input.customerId },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Step 3: Generate resolution plan
      let plan: IResolutionPlan;

      if (similarTemplates.length > 0 && similarTemplates[0].similarityScore > 0.8) {
        // Use template with high similarity
        logger.info('Using template for resolution', {
          templateId: similarTemplates[0].template.templateId,
          similarity: similarTemplates[0].similarityScore
        });

        plan = await this.applyTemplate(similarTemplates[0].template, {
          ...input,
          context: input.context as ResolutionContext | undefined
        });

        // Update template usage
        await templateService.updateTemplate(similarTemplates[0].template.templateId, {
          used: true,
          success: undefined
        });
      } else {
        // Generate new plan
        logger.info('Generating new resolution plan');

        const generatedPlan = await planGeneratorService.generatePlan(
          {
            title: input.title,
            description: input.description,
            category: input.category,
            priority: input.priority,
            issueId: input.issueId
          },
          input.context
        );

        plan = {
          planId: `plan_${uuidv4()}`,
          issueId: input.issueId,
          customerId: input.customerId,
          category: input.category,
          priority: input.priority,
          steps: generatedPlan.steps,
          actionItems: generatedPlan.actionItems,
          successCriteria: generatedPlan.successCriteria,
          estimatedTotalTime: generatedPlan.estimatedTotalTime,
          status: ResolutionStatus.PENDING,
          escalationLevel: generatedPlan.escalationLevel,
          escalationReason: generatedPlan.escalationReason,
          assignedAgentId: input.agentId,
          confidence: generatedPlan.confidence,
          metadata: generatedPlan.metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      // Step 4: Save the plan
      const savedPlan = await ResolutionPlan.create(plan);

      // Step 5: Update issue with plan reference
      await Issue.findOneAndUpdate(
        { issueId: input.issueId },
        {
          status: IssueStatus.IN_PROGRESS,
          updatedAt: new Date()
        }
      );

      logger.info('Issue processing completed', {
        issueId: input.issueId,
        planId: savedPlan.planId,
        stepCount: savedPlan.steps.length
      });

      return savedPlan.toObject() as IResolutionPlan;
    } catch (error) {
      logger.error('Issue processing failed', {
        error,
        issueId: input.issueId
      });
      throw error;
    }
  }

  async matchTemplate(issue: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
  }): Promise<TemplateMatch[]> {
    logger.debug('Matching templates for issue', { category: issue.category });

    try {
      // Find templates by category and priority
      const templates = await templateService.findSimilarTemplate(issue);

      // Score each template
      const scoredTemplates: TemplateMatch[] = templates.map(template => {
        const similarityScore = this.calculateSimilarity(issue, template);
        return { template, similarityScore };
      });

      // Sort by similarity
      scoredTemplates.sort((a, b) => b.similarityScore - a.similarityScore);

      return scoredTemplates.slice(0, 5); // Return top 5 matches
    } catch (error) {
      logger.error('Template matching failed', { error });
      return [];
    }
  }

  private calculateSimilarity(
    issue: { title: string; description: string; category: IssueCategory; priority: IssuePriority },
    template: IResolutionTemplate
  ): number {
    let score = 0;
    let maxScore = 0;

    // Category match (highest weight)
    maxScore += 30;
    if (template.applicableCategories.includes(issue.category)) {
      score += 30;
    }

    // Priority match
    maxScore += 20;
    if (template.applicablePriorities.includes(issue.priority)) {
      score += 20;
    }

    // Title similarity (simple keyword matching)
    maxScore += 25;
    const issueWords = this.tokenize(issue.title + ' ' + issue.description);
    const templateNameWords = this.tokenize(template.name + ' ' + template.description);
    const titleOverlap = this.calculateWordOverlap(issueWords, templateNameWords);
    score += titleOverlap * 25;

    // Success rate
    maxScore += 15;
    score += template.successRate * 15;

    // Usage count (popular templates are better)
    maxScore += 10;
    const usageScore = Math.min(template.usageCount / 100, 1) * 10;
    score += usageScore;

    return score / maxScore;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private calculateWordOverlap(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  async applyTemplate(
    template: IResolutionTemplate,
    context: IssueInput
  ): Promise<IResolutionPlan> {
    logger.info('Applying template', { templateId: template.templateId });

    // Clone and adapt steps from template
    const adaptedSteps: IResolutionStep[] = template.steps.map((step, index) => ({
      ...step,
      _id: undefined,
      stepNumber: index + 1,
      order: index + 1,
      status: step.status,
      completedAt: undefined,
      completedBy: undefined,
      agentAction: step.agentAction
        ? {
            ...step.agentAction,
            id: uuidv4()
          }
        : undefined,
      customerAction: step.customerAction
        ? {
            ...step.customerAction,
            id: uuidv4()
          }
        : undefined
    }));

    // Create action items from adapted steps
    const actionItems: IActionItem[] = adaptedSteps.flatMap(step => {
      const items: IActionItem[] = [];

      if (step.agentAction) {
        items.push({
          id: uuidv4(),
          title: `Agent: ${step.agentAction.action}`,
          description: step.agentAction.description,
          type: 'agent',
          assignee: context.agentId || 'agent',
          priority: context.priority,
          status: 'pending'
        });
      }

      if (step.customerAction) {
        items.push({
          id: uuidv4(),
          title: `Customer: ${step.customerAction.action}`,
          description: step.customerAction.description,
          type: 'customer',
          assignee: context.customerId,
          priority: context.priority,
          status: 'pending'
        });
      }

      return items;
    });

    // Clone success criteria
    const successCriteria: ISuccessCriteria[] = template.successCriteria.map(criteria => ({
      ...criteria,
      isMet: false,
      currentValue: undefined
    }));

    return {
      planId: `plan_${uuidv4()}`,
      issueId: context.issueId,
      customerId: context.customerId,
      category: context.category,
      priority: context.priority,
      steps: adaptedSteps,
      actionItems,
      successCriteria,
      estimatedTotalTime: template.averageResolutionTime,
      status: ResolutionStatus.PENDING,
      escalationLevel: undefined,
      escalationReason: undefined,
      assignedAgentId: context.agentId,
      templateId: template.templateId,
      confidence: template.successRate,
      metadata: {
        adaptedFrom: template.templateId,
        adaptedAt: new Date().toISOString()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async trackProgress(planId: string): Promise<{
    progress: number;
    completedSteps: number;
    totalSteps: number;
    pendingActions: number;
    estimatedTimeRemaining: number;
  }> {
    const plan = await ResolutionPlan.findOne({ planId });
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const totalSteps = plan.steps.length;
    const completedSteps = plan.steps.filter(
      s => s.status === 'completed' || s.status === 'skipped'
    ).length;

    const pendingActions = plan.actionItems.filter(a => a.status === 'pending').length;

    const completedTime = plan.steps
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + s.estimatedTime, 0);

    const estimatedTimeRemaining = plan.estimatedTotalTime - completedTime;

    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return {
      progress: Math.round(progress * 100) / 100,
      completedSteps,
      totalSteps,
      pendingActions,
      estimatedTimeRemaining: Math.max(0, estimatedTimeRemaining)
    };
  }

  async completeResolution(
    planId: string,
    outcome: 'resolved' | 'escalated' | 'closed' = 'resolved',
    feedback?: {
      rating: number;
      comment?: string;
    }
  ): Promise<IResolutionPlan> {
    logger.info('Completing resolution', { planId, outcome });

    const plan = await ResolutionPlan.findOne({ planId });
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    // Calculate actual resolution time
    const startTime = plan.createdAt.getTime();
    const endTime = Date.now();
    const actualTime = Math.round((endTime - startTime) / (1000 * 60));

    // Update plan status
    plan.status = outcome === 'resolved' ? ResolutionStatus.COMPLETED : ResolutionStatus.FAILED;
    plan.actualTime = actualTime;
    plan.completedAt = new Date();
    plan.updatedAt = new Date();

    // Mark all pending action items as completed
    plan.actionItems.forEach(item => {
      if (item.status === 'pending') {
        item.status = outcome === 'resolved' ? 'completed' : 'cancelled';
      }
    });

    // Mark all pending steps as completed or skipped
    plan.steps.forEach(step => {
      if (step.status === 'pending' || step.status === 'in_progress') {
        step.status = outcome === 'resolved' ? 'completed' : 'skipped';
      }
    });

    // Update all success criteria as met (for resolved outcomes)
    if (outcome === 'resolved') {
      plan.successCriteria.forEach(criteria => {
        criteria.isMet = true;
        criteria.currentValue = criteria.targetValue;
      });
    }

    await plan.save();

    // Update issue status
    await Issue.findOneAndUpdate(
      { issueId: plan.issueId },
      {
        status: outcome === 'resolved' ? IssueStatus.RESOLVED : IssueStatus.ESCALATED,
        resolvedAt: new Date(),
        updatedAt: new Date()
      }
    );

    // Archive to history
    await this.archiveResolution(plan, outcome, feedback);

    logger.info('Resolution completed', {
      planId,
      actualTime,
      outcome
    });

    return plan.toObject() as IResolutionPlan;
  }

  async archiveResolution(
    plan: IResolutionPlan,
    outcome: 'resolved' | 'escalated' | 'closed' | 'cancelled',
    feedback?: {
      rating?: number;
      comment?: string;
    }
  ): Promise<void> {
    logger.info('Archiving resolution', { planId: plan.planId });

    const historyEntry = {
      historyId: `hist_${uuidv4()}`,
      planId: plan.planId,
      issueId: plan.issueId,
      customerId: plan.customerId,
      category: plan.category,
      priority: plan.priority,
      resolution: {
        steps: plan.steps,
        actionItems: plan.actionItems,
        successCriteria: plan.successCriteria,
        totalTime: plan.actualTime || 0,
        outcome,
        customerFeedback: feedback?.rating
          ? {
              rating: feedback.rating,
              comment: feedback.comment,
              resolvedAt: new Date()
            }
          : undefined
      },
      lessonsLearned: this.extractLessonsLearned(plan),
      createdAt: new Date()
    };

    await ResolutionHistory.create(historyEntry);

    // Update template success rate if applicable
    if (plan.templateId) {
      await this.updateTemplateSuccessRate(plan.templateId, outcome);
    }
  }

  private extractLessonsLearned(plan: IResolutionPlan): string[] {
    const lessons: string[] = [];

    // Extract lessons from failed steps
    const failedSteps = plan.steps.filter(s => s.status === 'failed');
    if (failedSteps.length > 0) {
      lessons.push(`Consider improving steps: ${failedSteps.map(s => s.title).join(', ')}`);
    }

    // Add general lessons
    if (plan.actualTime && plan.actualTime > plan.estimatedTotalTime * 1.5) {
      lessons.push('Resolution took longer than expected - consider adjusting time estimates');
    }

    if (plan.confidence < 0.6) {
      lessons.push('Low confidence in initial plan - more context might improve resolution');
    }

    return lessons;
  }

  private async updateTemplateSuccessRate(
    templateId: string,
    outcome: string
  ): Promise<void> {
    const recentResolutions = await ResolutionHistory.find({
      'resolution.outcome': { $in: ['resolved', 'escalated'] }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const resolvedCount = recentResolutions.filter(r => r.resolution.outcome === 'resolved').length;
    const successRate = recentResolutions.length > 0 ? resolvedCount / recentResolutions.length : 0;

    await templateService.updateTemplate(templateId, {
      success: outcome === 'resolved',
      usageCount: recentResolutions.length,
      averageResolutionTime: Math.round(
        recentResolutions.reduce((sum, r) => sum + r.resolution.totalTime, 0) /
          (recentResolutions.length || 1)
      )
    });
  }

  async updateStepStatus(
    planId: string,
    stepOrder: number,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed',
    notes?: string
  ): Promise<IResolutionPlan> {
    const plan = await ResolutionPlan.findOne({ planId });
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const step = plan.steps.find(s => s.order === stepOrder);
    if (!step) {
      throw new Error(`Step not found: order ${stepOrder}`);
    }

    step.status = status;
    if (status === 'completed') {
      step.completedAt = new Date();
    }
    if (notes) {
      step.notes = notes;
    }

    plan.updatedAt = new Date();
    await plan.save();

    logger.info('Step status updated', { planId, stepOrder, status });

    return plan.toObject() as IResolutionPlan;
  }

  async updateActionItemStatus(
    planId: string,
    actionItemId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
    completedBy?: string
  ): Promise<IResolutionPlan> {
    const plan = await ResolutionPlan.findOne({ planId });
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const actionItem = plan.actionItems.find(a => a.id === actionItemId);
    if (!actionItem) {
      throw new Error(`Action item not found: ${actionItemId}`);
    }

    actionItem.status = status;
    if (status === 'completed') {
      actionItem.completedAt = new Date();
      actionItem.completedBy = completedBy;
    }

    plan.updatedAt = new Date();
    await plan.save();

    logger.info('Action item status updated', { planId, actionItemId, status });

    return plan.toObject() as IResolutionPlan;
  }

  async getResolutionStats(): Promise<{
    totalResolutions: number;
    averageResolutionTime: number;
    successRate: number;
    byCategory: Record<string, { count: number; avgTime: number; successRate: number }>;
    byPriority: Record<string, { count: number; avgTime: number; successRate: number }>;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentHistory = await ResolutionHistory.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).lean();

    const totalResolutions = recentHistory.length;
    const resolvedCount = recentHistory.filter(h => h.resolution.outcome === 'resolved').length;

    const avgTime =
      totalResolutions > 0
        ? recentHistory.reduce((sum, h) => sum + h.resolution.totalTime, 0) / totalResolutions
        : 0;

    const byCategory: Record<string, { count: number; avgTime: number; successRate: number }> = {};
    const byPriority: Record<string, { count: number; avgTime: number; successRate: number }> = {};

    recentHistory.forEach(h => {
      // By category
      if (!byCategory[h.category]) {
        byCategory[h.category] = { count: 0, avgTime: 0, successRate: 0 };
      }
      byCategory[h.category].count++;
      byCategory[h.category].avgTime += h.resolution.totalTime;

      // By priority
      if (!byPriority[h.priority]) {
        byPriority[h.priority] = { count: 0, avgTime: 0, successRate: 0 };
      }
      byPriority[h.priority].count++;
      byPriority[h.priority].avgTime += h.resolution.totalTime;
    });

    // Calculate averages and success rates
    Object.keys(byCategory).forEach(cat => {
      const data = byCategory[cat];
      data.avgTime = Math.round(data.avgTime / data.count);
      const resolvedInCategory = recentHistory.filter(
        h => h.category === cat && h.resolution.outcome === 'resolved'
      ).length;
      data.successRate = data.count > 0 ? resolvedInCategory / data.count : 0;
    });

    Object.keys(byPriority).forEach(pri => {
      const data = byPriority[pri];
      data.avgTime = Math.round(data.avgTime / data.count);
      const resolvedInPriority = recentHistory.filter(
        h => h.priority === pri && h.resolution.outcome === 'resolved'
      ).length;
      data.successRate = data.count > 0 ? resolvedInPriority / data.count : 0;
    });

    return {
      totalResolutions,
      averageResolutionTime: Math.round(avgTime),
      successRate: totalResolutions > 0 ? resolvedCount / totalResolutions : 0,
      byCategory,
      byPriority
    };
  }
}

export const resolutionEngine = new ResolutionEngine();
export { ResolutionEngine };
