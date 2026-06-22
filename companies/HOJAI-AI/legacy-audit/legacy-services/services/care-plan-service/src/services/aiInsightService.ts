import { CarePlan, GoalStatus, ICareGoal, GoalType } from '../models/carePlan';
import { goalTrackingService } from './goalTrackingService';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

export interface PlanInsight {
  category: 'progress' | 'risk' | 'recommendation' | 'trend' | 'warning';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  recommendations?: string[];
  data?: Record<string, unknown>;
}

export interface GoalSuggestion {
  goalId?: string;
  type: GoalType;
  description: string;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  rationale: string;
  successMetrics: string[];
}

export interface OutcomePrediction {
  goalId: string;
  currentProgress: number;
  predictedCompletion: Date | null;
  confidence: number;
  likelihood: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  factors: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  alternativeTargetDate?: Date;
}

export interface DriftAnalysis {
  goalId: string;
  isDrifting: boolean;
  driftDirection: 'ahead' | 'behind' | 'stable';
  driftMagnitude: number; // percentage points from expected
  confidence: number;
  triggers: string[];
  predictions: string[];
  recommendedActions: string[];
}

export interface FullPlanAnalysis {
  planId: string;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  healthScore: number; // 0-100
  insights: PlanInsight[];
  predictedOutcomes: OutcomePrediction[];
  driftAnalysis: DriftAnalysis[];
  summary: string;
  generatedAt: Date;
}

export class AIInsightService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      logger.info('AI Insight Service initialized with OpenAI');
    } else {
      logger.warn('AI Insight Service initialized without OpenAI - using fallback analysis');
    }
  }

  /**
   * Generate comprehensive insights for a care plan
   */
  async generatePlanInsights(planId: string): Promise<FullPlanAnalysis> {
    try {
      logger.info('Generating plan insights', { planId });

      const plan = await CarePlan.findOne({ planId });
      if (!plan) {
        throw new Error(`Care plan not found: ${planId}`);
      }

      // Gather all insights
      const insights: PlanInsight[] = [];
      const predictedOutcomes: OutcomePrediction[] = [];
      const driftAnalysis: DriftAnalysis[] = [];

      // Analyze each goal
      for (const goal of plan.goals) {
        // Skip archived goals
        if ([GoalStatus.NOT_ACHIEVED, GoalStatus.PARTIALLY_ACHIEVED].includes(goal.status)) {
          continue;
        }

        // Calculate completion metrics
        const completion = await goalTrackingService.calculateGoalCompletion(goal.goalId);
        if (completion) {
          // Generate predictions
          const prediction = await this.predictOutcome(goal.goalId);
          if (prediction) predictedOutcomes.push(prediction);

          // Detect drift
          const drift = await this.detectGoalDrift(goal.goalId);
          if (drift) driftAnalysis.push(drift);
        }

        // Generate goal-specific insights
        const goalInsights = this.analyzeGoal(goal, plan);
        insights.push(...goalInsights);
      }

      // Analyze overall plan progress
      const planProgressInsights = this.analyzePlanProgress(plan);
      insights.push(...planProgressInsights);

      // Analyze intervention status
      const interventionInsights = this.analyzeInterventions(plan);
      insights.push(...interventionInsights);

      // Analyze review schedule
      const reviewInsights = this.analyzeReviewSchedule(plan);
      insights.push(...reviewInsights);

      // Calculate health score
      const healthScore = this.calculateHealthScore(plan, insights);
      const overallHealth = this.getHealthStatus(healthScore);

      // Generate AI summary if available
      let summary = '';
      if (this.openai) {
        summary = await this.generateAISummary(plan, insights, healthScore);
      } else {
        summary = this.generateFallbackSummary(plan, insights, healthScore);
      }

      logger.info('Plan insights generated', { planId, insightCount: insights.length, healthScore });

      return {
        planId,
        overallHealth,
        healthScore,
        insights,
        predictedOutcomes,
        driftAnalysis,
        summary,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to generate plan insights', { error, planId });
      throw error;
    }
  }

  /**
   * Analyze a single goal and generate insights
   */
  private analyzeGoal(goal: ICareGoal, plan: any): PlanInsight[] {
    const insights: PlanInsight[] = [];
    const now = new Date();
    const targetDate = new Date(goal.targetDate);
    const startDate = new Date(goal.startDate);

    // Progress-based insights
    if (goal.completionPercentage >= 90 && goal.status !== GoalStatus.ACHIEVED) {
      insights.push({
        category: 'progress',
        title: 'Goal Near Completion',
        description: `${goal.description} is ${goal.completionPercentage}% complete. Consider marking as achieved.`,
        severity: 'info',
        data: { goalId: goal.goalId, completion: goal.completionPercentage },
      });
    }

    if (goal.completionPercentage === 0 && goal.status === GoalStatus.IN_PROGRESS) {
      insights.push({
        category: 'warning',
        title: 'No Progress Recorded',
        description: `${goal.description} is marked as in progress but has no recorded progress.`,
        severity: 'warning',
        recommendations: ['Schedule a progress review', 'Identify potential barriers'],
        data: { goalId: goal.goalId, daysSinceStart: Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) },
      });
    }

    // Timeline-based insights
    const daysUntilTarget = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
    const progressDiff = goal.completionPercentage - expectedProgress;

    if (daysUntilTarget < 0 && goal.status !== GoalStatus.ACHIEVED) {
      insights.push({
        category: 'risk',
        title: 'Goal Overdue',
        description: `${goal.description} is ${Math.abs(daysUntilTarget)} days overdue.`,
        severity: 'critical',
        recommendations: ['Review goal feasibility', 'Consider extending deadline', 'Identify barriers to progress'],
        data: { goalId: goal.goalId, daysOverdue: Math.abs(daysUntilTarget) },
      });
    } else if (progressDiff < -15 && daysUntilTarget > 0) {
      insights.push({
        category: 'risk',
        title: 'Goal Falling Behind',
        description: `${goal.description} is ${Math.abs(Math.round(progressDiff))}% behind expected progress.`,
        severity: 'warning',
        recommendations: ['Increase intervention frequency', 'Identify and address barriers'],
        data: { goalId: goal.goalId, progressDiff, expectedProgress, actualProgress: goal.completionPercentage },
      });
    } else if (progressDiff > 15) {
      insights.push({
        category: 'trend',
        title: 'Goal Ahead of Schedule',
        description: `${goal.description} is ${Math.round(progressDiff)}% ahead of expected progress.`,
        severity: 'info',
        data: { goalId: goal.goalId, progressDiff },
      });
    }

    // Milestone insights
    const incompleteMilestones = goal.milestones.filter((m) => !m.completed);
    if (incompleteMilestones.length > 0) {
      const upcomingMilestone = incompleteMilestones.find((m) => new Date(m.targetDate) > now);
      if (upcomingMilestone) {
        const daysToMilestone = Math.floor((new Date(upcomingMilestone.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysToMilestone <= 7) {
          insights.push({
            category: 'warning',
            title: 'Upcoming Milestone',
            description: `Milestone "${upcomingMilestone.title}" is due in ${daysToMilestone} days.`,
            severity: 'info',
            data: { goalId: goal.goalId, milestoneTitle: upcomingMilestone.title, daysUntil: daysToMilestone },
          });
        }
      }
    }

    // Barrier analysis
    if (goal.barriers.length > 0) {
      insights.push({
        category: 'warning',
        title: 'Identified Barriers',
        description: `${goal.description} has ${goal.barriers.length} identified barrier(s).`,
        severity: 'warning',
        recommendations: goal.barriers.map((b) => `Address: ${b}`),
        data: { goalId: goal.goalId, barriers: goal.barriers },
      });
    }

    return insights;
  }

  /**
   * Analyze overall plan progress
   */
  private analyzePlanProgress(plan: any): PlanInsight[] {
    const insights: PlanInsight[] = [];
    const activeGoals = plan.goals.filter(
      (g: ICareGoal) => ![GoalStatus.ACHIEVED, GoalStatus.NOT_ACHIEVED].includes(g.status)
    );

    if (activeGoals.length === 0) {
      insights.push({
        category: 'warning',
        title: 'No Active Goals',
        description: 'This care plan has no active goals. Consider adding new goals or archiving the plan.',
        severity: 'warning',
        recommendations: ['Add new goals', 'Archive completed plan'],
        data: { planId: plan.planId },
      });
      return insights;
    }

    const avgProgress = activeGoals.reduce((sum: number, g: ICareGoal) => sum + g.completionPercentage, 0) / activeGoals.length;

    if (avgProgress < 25) {
      insights.push({
        category: 'trend',
        title: 'Slow Overall Progress',
        description: `Plan average progress is ${Math.round(avgProgress)}%. Consider intensifying interventions.`,
        severity: 'warning',
        recommendations: ['Review intervention effectiveness', 'Consider additional resources'],
        data: { planId: plan.planId, averageProgress: avgProgress },
      });
    }

    return insights;
  }

  /**
   * Analyze interventions
   */
  private analyzeInterventions(plan: any): PlanInsight[] {
    const insights: PlanInsight[] = [];

    const pendingInterventions = plan.interventions.filter((i: any) => i.status === 'planned');
    const inProgressInterventions = plan.interventions.filter((i: any) => i.status === 'in_progress');

    if (pendingInterventions.length > 5) {
      insights.push({
        category: 'warning',
        title: 'Many Pending Interventions',
        description: `This plan has ${pendingInterventions.length} planned interventions not yet started.`,
        severity: 'info',
        data: { planId: plan.planId, pendingCount: pendingInterventions.length },
      });
    }

    return insights;
  }

  /**
   * Analyze review schedule
   */
  private analyzeReviewSchedule(plan: any): PlanInsight[] {
    const insights: PlanInsight[] = [];
    const now = new Date();

    if (plan.nextReviewDate) {
      const daysUntilReview = Math.floor((new Date(plan.nextReviewDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilReview < 0) {
        insights.push({
          category: 'critical',
          title: 'Review Overdue',
          description: `Care plan review was due ${Math.abs(daysUntilReview)} days ago.`,
          severity: 'critical',
          recommendations: ['Schedule review immediately', 'Assess overall plan progress'],
          data: { planId: plan.planId, daysOverdue: Math.abs(daysUntilReview) },
        });
      } else if (daysUntilReview <= 3) {
        insights.push({
          category: 'warning',
          title: 'Review Approaching',
          description: `Care plan review is due in ${daysUntilReview} day(s).`,
          severity: 'warning',
          recommendations: ['Prepare review documentation', 'Gather progress data'],
          data: { planId: plan.planId, daysUntil: daysUntilReview },
        });
      }
    } else if (!plan.lastReviewDate) {
      insights.push({
        category: 'warning',
        title: 'No Review Scheduled',
        description: 'This care plan has never been reviewed. Schedule an initial review.',
        severity: 'warning',
        recommendations: ['Schedule initial review', 'Set up recurring reviews'],
        data: { planId: plan.planId },
      });
    }

    return insights;
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(plan: any, insights: PlanInsight[]): number {
    let score = 100;

    // Deduct for critical issues
    const criticalCount = insights.filter((i) => i.severity === 'critical').length;
    score -= criticalCount * 20;

    // Deduct for warnings
    const warningCount = insights.filter((i) => i.severity === 'warning').length;
    score -= warningCount * 5;

    // Factor in goal progress
    const activeGoals = plan.goals.filter(
      (g: ICareGoal) => ![GoalStatus.ACHIEVED, GoalStatus.NOT_ACHIEVED].includes(g.status)
    );
    if (activeGoals.length > 0) {
      const avgProgress = activeGoals.reduce((sum: number, g: ICareGoal) => sum + g.completionPercentage, 0) / activeGoals.length;
      const expectedProgress = this.calculateExpectedProgress(plan);
      const progressDiff = avgProgress - expectedProgress;

      if (progressDiff < -20) {
        score -= 15;
      } else if (progressDiff < -10) {
        score -= 8;
      } else if (progressDiff > 20) {
        score += 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate expected progress percentage
   */
  private calculateExpectedProgress(plan: any): number {
    const now = new Date();
    const startDate = new Date(plan.startDate);
    const endDate = new Date(plan.endDate);

    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();

    if (totalDuration <= 0) return 0;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }

  /**
   * Get health status label
   */
  private getHealthStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 25) return 'poor';
    return 'critical';
  }

  /**
   * Generate AI-powered summary
   */
  private async generateAISummary(
    plan: any,
    insights: PlanInsight[],
    healthScore: number
  ): Promise<string> {
    try {
      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a healthcare AI assistant providing concise summaries of care plan performance.
Provide a brief, actionable summary (2-3 sentences max) focusing on key issues and recommendations.`,
          },
          {
            role: 'user',
            content: `Summarize this care plan status:

Plan: ${plan.title}
Patient: ${plan.patientName}
Health Score: ${healthScore}/100
Active Goals: ${plan.goals.filter((g: ICareGoal) => ![GoalStatus.ACHIEVED, GoalStatus.NOT_ACHIEVED].includes(g.status)).length}

Key Insights:
${insights.slice(0, 5).map((i) => `- ${i.title}: ${i.description}`).join('\n')}

Provide a concise summary.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      return completion.choices[0]?.message?.content || 'Summary generation failed.';
    } catch (error) {
      logger.error('AI summary generation failed', { error });
      return this.generateFallbackSummary(plan, insights, healthScore);
    }
  }

  /**
   * Generate fallback summary without AI
   */
  private generateFallbackSummary(plan: any, insights: PlanInsight[], healthScore: number): string {
    const criticalIssues = insights.filter((i) => i.severity === 'critical').length;
    const warnings = insights.filter((i) => i.severity === 'warning').length;
    const status = this.getHealthStatus(healthScore);

    if (criticalIssues > 0) {
      return `This care plan requires immediate attention. There ${criticalIssues === 1 ? 'is' : 'are'} ${criticalIssues} critical issue(s) that need to be addressed.`;
    }

    if (warnings > 0) {
      return `This care plan is in ${status} condition with ${warnings} warning(s) to monitor. Review recommended interventions.`;
    }

    return `This care plan is on track with a health score of ${healthScore}/100. Continue current approach.`;
  }

  /**
   * Suggest goals based on patient context
   */
  async suggestGoals(context: {
    patientId: string;
    conditions?: string[];
    previousGoals?: string[];
    category?: string;
    constraints?: string[];
  }): Promise<GoalSuggestion[]> {
    try {
      logger.info('Generating goal suggestions', { patientId: context.patientId });

      if (!this.openai) {
        // Return basic suggestions without AI
        return this.generateBasicGoalSuggestions(context);
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a healthcare AI assistant specializing in care planning.
Generate appropriate SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) based on patient context.
Consider evidence-based practices and realistic timelines.

Return as JSON array with fields:
- type: goal type (short_term, long_term, maintenance, preventive, rehabilitation)
- description: specific goal description
- targetDate: suggested target date (ISO format)
- priority: low, medium, or high
- rationale: why this goal is important
- successMetrics: how to measure success (array of strings)`,
          },
          {
            role: 'user',
            content: `Suggest care goals for this patient:

Patient ID: ${context.patientId}
Conditions: ${context.conditions?.join(', ') || 'General wellness'}
Previous Goals: ${context.previousGoals?.join(', ') || 'None'}
Category: ${context.category || 'General'}
Constraints: ${context.constraints?.join(', ') || 'None'}

Generate 3-5 relevant goals. Return as JSON array.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      });

      const content = completion.choices[0]?.message?.content || '[]';
      const suggestions = JSON.parse(content);

      return suggestions.map((s: any) => ({
        ...s,
        targetDate: new Date(s.targetDate),
      }));
    } catch (error) {
      logger.error('Failed to suggest goals', { error, context });
      return this.generateBasicGoalSuggestions(context);
    }
  }

  /**
   * Generate basic goal suggestions without AI
   */
  private generateBasicGoalSuggestions(context: {
    patientId: string;
    conditions?: string[];
    category?: string;
  }): GoalSuggestion[] {
    const suggestions: GoalSuggestion[] = [];
    const now = new Date();

    // Basic wellness goal
    suggestions.push({
      type: GoalType.PREVENTIVE,
      description: 'Improve overall health metrics through regular monitoring and lifestyle modifications',
      targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
      priority: 'medium',
      rationale: 'Foundation for improved health outcomes',
      successMetrics: ['Regular check-ups completed', 'Health metrics within target range'],
    });

    // Condition-specific goals if provided
    if (context.conditions && context.conditions.length > 0) {
      suggestions.push({
        type: GoalType.REHABILITATION,
        description: `Manage ${context.conditions[0]} through prescribed treatment plan`,
        targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days
        priority: 'high',
        rationale: `Address specific health condition: ${context.conditions[0]}`,
        successMetrics: ['Symptom improvement noted', 'Treatment adherence confirmed'],
      });
    }

    return suggestions;
  }

  /**
   * Predict outcome for a specific goal
   */
  async predictOutcome(goalId: string): Promise<OutcomePrediction | null> {
    try {
      logger.debug('Predicting goal outcome', { goalId });

      const plan = await CarePlan.findOne({ 'goals.goalId': goalId });
      if (!plan) return null;

      const goal = plan.goals.find((g: ICareGoal) => g.goalId === goalId);
      if (!goal) return null;

      const completion = await goalTrackingService.calculateGoalCompletion(goalId);
      if (!completion) return null;

      // Calculate confidence and likelihood based on completion data
      let confidence: number;
      let likelihood: OutcomePrediction['likelihood'];

      if (completion.status === 'ahead') {
        confidence = 0.85;
        likelihood = 'very_high';
      } else if (completion.status === 'on_track' && goal.completionPercentage >= 75) {
        confidence = 0.80;
        likelihood = 'high';
      } else if (completion.status === 'on_track') {
        confidence = 0.70;
        likelihood = 'medium';
      } else if (completion.status === 'behind') {
        confidence = 0.60;
        likelihood = 'low';
      } else {
        confidence = 0.50;
        likelihood = 'very_low';
      }

      // Build factors
      const factors: OutcomePrediction['factors'] = {
        positive: [],
        negative: [],
        neutral: [],
      };

      if (goal.facilitators.length > 0) {
        factors.positive.push(...goal.facilitators.slice(0, 2));
      }

      if (goal.barriers.length > 0) {
        factors.negative.push(...goal.barriers.slice(0, 2));
      }

      if (completion.status === 'on_track' || completion.status === 'ahead') {
        factors.positive.push('Current progress rate is sustainable');
      }

      if (goal.milestones.length > 0) {
        const completedMilestones = goal.milestones.filter((m: any) => m.completed).length;
        factors.neutral.push(`${completedMilestones}/${goal.milestones.length} milestones completed`);
      }

      return {
        goalId,
        currentProgress: goal.completionPercentage,
        predictedCompletion: completion.projectedCompletion,
        confidence,
        likelihood,
        factors,
        alternativeTargetDate:
          completion.status === 'behind'
            ? new Date(goal.targetDate.getTime() + Math.ceil(completion.timeRemaining) * 24 * 60 * 60 * 1000)
            : undefined,
      };
    } catch (error) {
      logger.error('Failed to predict outcome', { error, goalId });
      return null;
    }
  }

  /**
   * Detect if a goal is drifting from expected progress
   */
  async detectGoalDrift(goalId: string): Promise<DriftAnalysis | null> {
    try {
      logger.debug('Detecting goal drift', { goalId });

      const plan = await CarePlan.findOne({ 'goals.goalId': goalId });
      if (!plan) return null;

      const goal = plan.goals.find((g: ICareGoal) => g.goalId === goalId);
      if (!goal) return null;

      const completion = await goalTrackingService.calculateGoalCompletion(goalId);
      if (!completion) return null;

      const driftMagnitude = Math.abs(completion.actualRate - completion.requiredRate);
      const isDrifting = Math.abs(driftMagnitude) > 10;

      let driftDirection: DriftAnalysis['driftDirection'];
      if (completion.status === 'ahead') {
        driftDirection = 'ahead';
      } else if (completion.status === 'behind' || completion.status === 'at_risk') {
        driftDirection = 'behind';
      } else {
        driftDirection = 'stable';
      }

      // Build triggers
      const triggers: string[] = [];
      if (goal.progressHistory.length > 0) {
        const recentHistory = goal.progressHistory.slice(-3);
        const avgUpdateInterval =
          recentHistory.length > 1
            ? (new Date(recentHistory[recentHistory.length - 1].updatedAt).getTime() -
                new Date(recentHistory[0].updatedAt).getTime()) /
              (recentHistory.length - 1) /
              (1000 * 60 * 60 * 24)
            : 0;

        if (avgUpdateInterval > 14) {
          triggers.push('Infrequent progress updates (gaps > 2 weeks)');
        }
      }

      if (goal.barriers.length > 0) {
        triggers.push(`Identified barriers: ${goal.barriers[0]}`);
      }

      // Build predictions
      const predictions: string[] = [];
      if (completion.projectedCompletion) {
        predictions.push(`Projected completion: ${completion.projectedCompletion.toISOString().split('T')[0]}`);
      }

      if (driftDirection === 'behind' && driftMagnitude > 20) {
        predictions.push('Goal may not be achieved by target date without intervention');
      } else if (driftDirection === 'ahead') {
        predictions.push('Goal may be achieved ahead of schedule');
      }

      // Build recommended actions
      const recommendedActions: string[] = [];
      if (driftDirection === 'behind') {
        recommendedActions.push('Increase intervention frequency');
        recommendedActions.push('Review and address barriers');
        recommendedActions.push('Consider adjusting target date');
      } else if (driftDirection === 'ahead' && goal.completionPercentage >= 80) {
        recommendedActions.push('Consider marking goal as achieved');
        recommendedActions.push('Plan next phase goals');
      }

      return {
        goalId,
        isDrifting,
        driftDirection,
        driftMagnitude,
        confidence: 0.75,
        triggers,
        predictions,
        recommendedActions,
      };
    } catch (error) {
      logger.error('Failed to detect goal drift', { error, goalId });
      return null;
    }
  }
}

export const aiInsightService = new AIInsightService();
export default aiInsightService;
