import { CarePlan, GoalStatus, GoalType, ICareGoal, Priority } from '../models/carePlan';
import { planService } from './planService';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

export interface ProgressUpdate {
  value: number;
  note?: string;
  updatedBy: string;
  timestamp?: Date;
}

export interface GoalCompletionResult {
  goalId: string;
  completionPercentage: number;
  timeRemaining: number; // days
  requiredRate: number; // percentage per day
  actualRate: number; // percentage per day
  status: 'on_track' | 'ahead' | 'behind' | 'stalled' | 'at_risk';
  projectedCompletion: Date | null;
  recommendation: string;
}

export interface GoalAdjustment {
  goalId: string;
  originalTargetDate: Date;
  suggestedTargetDate: Date;
  reason: string;
  newCompletionPercentage?: number;
  priority?: Priority;
}

export interface OverdueGoal {
  planId: string;
  planTitle: string;
  goal: ICareGoal;
  daysOverdue: number;
  lastProgressUpdate?: Date;
  suggestedAction: string;
}

export class GoalTrackingService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Track goal progress with detailed history
   */
  async trackGoalProgress(
    planId: string,
    goalId: string,
    update: ProgressUpdate
  ): Promise<ICareGoal | null> {
    try {
      logger.info('Tracking goal progress', { planId, goalId, value: update.value });

      // Validate progress value
      if (update.value < 0 || update.value > 100) {
        throw new Error('Progress value must be between 0 and 100');
      }

      // Update through plan service
      const updatedGoal = await planService.updateGoalProgress(
        planId,
        goalId,
        update.value,
        update.updatedBy,
        update.note
      );

      if (updatedGoal) {
        // Check if this is a significant change
        const progressDiff = Math.abs(
          (updatedGoal.progressHistory[updatedGoal.progressHistory.length - 2]?.value || 0) - update.value
        );

        if (progressDiff >= 10) {
          logger.info('Significant progress change detected', {
            planId,
            goalId,
            change: progressDiff,
          });
        }
      }

      return updatedGoal;
    } catch (error) {
      logger.error('Failed to track goal progress', { error, planId, goalId });
      throw error;
    }
  }

  /**
   * Calculate detailed goal completion metrics
   */
  async calculateGoalCompletion(goalId: string): Promise<GoalCompletionResult | null> {
    try {
      logger.debug('Calculating goal completion', { goalId });

      // Find the goal
      const plan = await CarePlan.findOne({ 'goals.goalId': goalId });
      if (!plan) {
        logger.warn('Plan not found for goal completion calculation', { goalId });
        return null;
      }

      const goal = plan.goals.find((g) => g.goalId === goalId);
      if (!goal) {
        logger.warn('Goal not found', { goalId });
        return null;
      }

      const now = new Date();
      const targetDate = new Date(goal.targetDate);
      const startDate = new Date(goal.startDate);

      // Calculate time metrics
      const totalDuration = targetDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      const timeRemaining = Math.max(0, targetDate.getTime() - now.getTime());
      const timeRemainingDays = timeRemaining / (1000 * 60 * 60 * 24);
      const totalDays = totalDuration / (1000 * 60 * 60 * 24);
      const elapsedDays = elapsed / (1000 * 60 * 60 * 24);

      // Calculate rates
      const requiredRate = totalDuration > 0 ? 100 / totalDays : 0;
      const actualRate = elapsedDays > 0 ? goal.completionPercentage / elapsedDays : 0;

      // Determine status
      let status: GoalCompletionResult['status'];
      const progressDiff = goal.completionPercentage - (elapsedDays * requiredRate);

      if (goal.completionPercentage >= 100) {
        status = 'on_track';
      } else if (progressDiff > 10) {
        status = 'ahead';
      } else if (progressDiff < -10) {
        if (timeRemainingDays <= 7) {
          status = 'at_risk';
        } else {
          status = 'behind';
        }
      } else if (goal.progressHistory.length > 0) {
        const lastUpdate = goal.progressHistory[goal.progressHistory.length - 1];
        const daysSinceUpdate =
          (now.getTime() - new Date(lastUpdate.updatedAt).getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceUpdate > 14) {
          status = 'stalled';
        } else {
          status = 'on_track';
        }
      } else {
        status = 'on_track';
      }

      // Calculate projected completion
      let projectedCompletion: Date | null = null;
      if (actualRate > 0 && goal.completionPercentage < 100) {
        const daysToComplete = (100 - goal.completionPercentage) / actualRate;
        projectedCompletion = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
      }

      // Generate recommendation
      let recommendation: string;
      switch (status) {
        case 'ahead':
          recommendation = 'Goal is progressing well. Consider setting a more ambitious target.';
          break;
        case 'behind':
          recommendation = 'Goal is falling behind. Consider additional interventions or adjusting the target date.';
          break;
        case 'stalled':
          recommendation = 'No recent progress detected. Schedule a check-in to identify barriers.';
          break;
        case 'at_risk':
          recommendation = 'Goal is at risk of not being achieved. Immediate action required.';
          break;
        default:
          recommendation = 'Goal is on track. Continue current approach.';
      }

      return {
        goalId,
        completionPercentage: goal.completionPercentage,
        timeRemaining: timeRemainingDays,
        requiredRate,
        actualRate,
        status,
        projectedCompletion,
        recommendation,
      };
    } catch (error) {
      logger.error('Failed to calculate goal completion', { error, goalId });
      throw error;
    }
  }

  /**
   * Get all overdue goals for a patient
   */
  async getOverdueGoals(patientId: string): Promise<OverdueGoal[]> {
    try {
      logger.debug('Fetching overdue goals for patient', { patientId });

      const now = new Date();
      const plans = await CarePlan.find({
        patientId,
        status: { $ne: 'archived' },
      });

      const overdueGoals: OverdueGoal[] = [];

      for (const plan of plans) {
        for (const goal of plan.goals) {
          const targetDate = new Date(goal.targetDate);
          const isOverdue =
            targetDate < now &&
            ![
              GoalStatus.ACHIEVED,
              GoalStatus.PARTIALLY_ACHIEVED,
              GoalStatus.NOT_ACHIEVED,
            ].includes(goal.status);

          if (isOverdue) {
            const daysOverdue = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
            const lastProgressUpdate = goal.progressHistory.length > 0
              ? goal.progressHistory[goal.progressHistory.length - 1].updatedAt
              : undefined;

            let suggestedAction: string;
            if (daysOverdue > 30) {
              suggestedAction = 'Goal is significantly overdue. Consider re-evaluating or archiving.';
            } else if (daysOverdue > 14) {
              suggestedAction = 'Goal requires immediate attention. Schedule a review session.';
            } else {
              suggestedAction = 'Goal is slightly overdue. Monitor closely and adjust if needed.';
            }

            overdueGoals.push({
              planId: plan.planId,
              planTitle: plan.title,
              goal,
              daysOverdue,
              lastProgressUpdate,
              suggestedAction,
            });
          }
        }
      }

      // Sort by days overdue (most overdue first)
      overdueGoals.sort((a, b) => b.daysOverdue - a.daysOverdue);

      logger.info('Found overdue goals', { patientId, count: overdueGoals.length });
      return overdueGoals;
    } catch (error) {
      logger.error('Failed to get overdue goals', { error, patientId });
      throw error;
    }
  }

  /**
   * Auto-adjust goals based on progress patterns (with AI assistance)
   */
  async autoAdjustGoals(planId: string): Promise<GoalAdjustment[]> {
    try {
      logger.info('Auto-adjusting goals for plan', { planId });

      const plan = await CarePlan.findOne({ planId });
      if (!plan) {
        logger.warn('Plan not found for auto-adjustment', { planId });
        return [];
      }

      const adjustments: GoalAdjustment[] = [];
      const now = new Date();

      for (const goal of plan.goals) {
        // Skip completed or archived goals
        if ([GoalStatus.ACHIEVED, GoalStatus.PARTIALLY_ACHIEVED, GoalStatus.NOT_ACHIEVED].includes(goal.status)) {
          continue;
        }

        const completionResult = await this.calculateGoalCompletion(goal.goalId);
        if (!completionResult) continue;

        const targetDate = new Date(goal.targetDate);
        const daysRemaining = Math.max(0, (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Determine if adjustment is needed
        if (completionResult.status === 'at_risk' && daysRemaining <= 14) {
          // Suggest extending deadline
          const suggestedDays = Math.ceil((100 - goal.completionPercentage) / 5); // Allow 5% per day
          const suggestedTargetDate = new Date(now.getTime() + suggestedDays * 24 * 60 * 60 * 1000);

          adjustments.push({
            goalId: goal.goalId,
            originalTargetDate: targetDate,
            suggestedTargetDate,
            reason: `Goal is at risk. Current pace would require ${suggestedDays} additional days.`,
            newCompletionPercentage: goal.completionPercentage,
            priority: Priority.HIGH,
          });
        } else if (completionResult.status === 'stalled') {
          // Suggest breaking into smaller milestones
          adjustments.push({
            goalId: goal.goalId,
            originalTargetDate: targetDate,
            suggestedTargetDate: new Date(targetDate.getTime() + 7 * 24 * 60 * 60 * 1000),
            reason: 'Goal progress has stalled. Suggest breaking into weekly milestones.',
            newCompletionPercentage: goal.completionPercentage,
            priority: Priority.MEDIUM,
          });
        } else if (completionResult.status === 'ahead' && goal.completionPercentage >= 90) {
          // Suggest early completion
          adjustments.push({
            goalId: goal.goalId,
            originalTargetDate: targetDate,
            suggestedTargetDate: now,
            reason: 'Goal is ahead of schedule and nearly complete. Consider marking as achieved.',
            newCompletionPercentage: 100,
            priority: Priority.LOW,
          });
        }
      }

      logger.info('Goal adjustments generated', { planId, count: adjustments.length });
      return adjustments;
    } catch (error) {
      logger.error('Failed to auto-adjust goals', { error, planId });
      throw error;
    }
  }

  /**
   * AI-powered goal adjustment suggestions
   */
  async aiSuggestAdjustments(planId: string): Promise<{
    goalId: string;
    suggestion: string;
    confidence: number;
    reasoning: string;
  }[]> {
    if (!this.openai) {
      logger.warn('OpenAI not configured, falling back to basic suggestions');
      const adjustments = await this.autoAdjustGoals(planId);
      return adjustments.map((adj) => ({
        goalId: adj.goalId,
        suggestion: `Adjust target date to ${adj.suggestedTargetDate.toISOString().split('T')[0]}. ${adj.reason}`,
        confidence: 0.7,
        reasoning: adj.reason,
      }));
    }

    try {
      logger.info('Generating AI suggestions for goal adjustments', { planId });

      const plan = await CarePlan.findOne({ planId });
      if (!plan) {
        return [];
      }

      const goalSummaries = plan.goals
        .filter((g) => ![GoalStatus.ACHIEVED, GoalStatus.NOT_ACHIEVED].includes(g.status))
        .map((g) => ({
          goalId: g.goalId,
          description: g.description,
          status: g.status,
          completionPercentage: g.completionPercentage,
          targetDate: g.targetDate,
          daysUntilTarget: Math.max(
            0,
            (new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          ),
        }));

      if (goalSummaries.length === 0) {
        return [];
      }

      const completionResult = await this.openai!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a healthcare AI assistant specializing in care plan optimization.
Analyze the provided goals and suggest specific adjustments to help patients achieve their health goals.
Consider:
- Current progress rate vs required rate
- Patient adherence patterns
- Resource availability
- Goal difficulty and achievability
Provide actionable, specific suggestions.`,
          },
          {
            role: 'user',
            content: `Analyze these care plan goals and suggest adjustments:

${JSON.stringify(goalSummaries, null, 2)}

For each goal that needs adjustment, provide:
1. goalId
2. A specific suggestion
3. Confidence score (0-1)
4. Brief reasoning

Return as JSON array.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const suggestionsText = completionResult.choices[0]?.message?.content || '[]';
      const suggestions = JSON.parse(suggestionsText);

      logger.info('AI suggestions generated', { planId, count: suggestions.length });
      return suggestions;
    } catch (error) {
      logger.error('Failed to generate AI suggestions', { error, planId });
      // Fallback to basic suggestions
      const adjustments = await this.autoAdjustGoals(planId);
      return adjustments.map((adj) => ({
        goalId: adj.goalId,
        suggestion: `Adjust target date to ${adj.suggestedTargetDate.toISOString().split('T')[0]}. ${adj.reason}`,
        confidence: 0.6,
        reasoning: adj.reason,
      }));
    }
  }

  /**
   * Get goal progress timeline
   */
  async getGoalProgressTimeline(goalId: string): Promise<{
    goalId: string;
    startDate: Date;
    targetDate: Date;
    milestones: { date: Date; percentage: number }[];
    progressHistory: { date: Date; value: number; note?: string }[];
    trend: 'improving' | 'stable' | 'declining';
  } | null> {
    try {
      const plan = await CarePlan.findOne({ 'goals.goalId': goalId });
      if (!plan) return null;

      const goal = plan.goals.find((g) => g.goalId === goalId);
      if (!goal) return null;

      // Build milestones timeline
      const milestones = goal.milestones
        .filter((m) => m.completed)
        .map((m) => ({
          date: m.completedAt || m.targetDate,
          percentage: 100,
        }));

      // Build progress history
      const progressHistory = goal.progressHistory.map((p) => ({
        date: p.updatedAt,
        value: p.value,
        note: p.note,
      }));

      // Determine trend
      let trend: 'improving' | 'stable' | 'declining';
      if (progressHistory.length < 2) {
        trend = 'stable';
      } else {
        const recent = progressHistory.slice(-3);
        const first = recent[0].value;
        const last = recent[recent.length - 1].value;
        const diff = last - first;

        if (diff > 5) {
          trend = 'improving';
        } else if (diff < -5) {
          trend = 'declining';
        } else {
          trend = 'stable';
        }
      }

      return {
        goalId,
        startDate: goal.startDate,
        targetDate: goal.targetDate,
        milestones,
        progressHistory,
        trend,
      };
    } catch (error) {
      logger.error('Failed to get goal progress timeline', { error, goalId });
      throw error;
    }
  }

  /**
   * Bulk update goal statuses (mark overdue goals)
   */
  async updateOverdueGoalStatuses(): Promise<{
    updated: number;
    goals: { goalId: string; planId: string; newStatus: GoalStatus }[];
  }> {
    try {
      const now = new Date();
      logger.info('Updating overdue goal statuses', { asOf: now });

      const plans = await CarePlan.find({
        'goals.targetDate': { $lt: now },
        'goals.status': {
          $nin: [
            GoalStatus.ACHIEVED,
            GoalStatus.PARTIALLY_ACHIEVED,
            GoalStatus.NOT_ACHIEVED,
            GoalStatus.AT_RISK,
          ],
        },
      });

      const updated: { goalId: string; planId: string; newStatus: GoalStatus }[] = [];

      for (const plan of plans) {
        let modified = false;

        for (const goal of plan.goals) {
          const targetDate = new Date(goal.targetDate);
          if (targetDate < now && ![GoalStatus.ACHIEVED, GoalStatus.PARTIALLY_ACHIEVED, GoalStatus.NOT_ACHIEVED, GoalStatus.AT_RISK].includes(goal.status)) {
            goal.status = GoalStatus.AT_RISK;
            goal.updatedAt = now;
            modified = true;
            updated.push({ goalId: goal.goalId, planId: plan.planId, newStatus: GoalStatus.AT_RISK });
          }
        }

        if (modified) {
          await plan.save();
        }
      }

      logger.info('Overdue goal statuses updated', { count: updated.length });
      return { updated: updated.length, goals: updated };
    } catch (error) {
      logger.error('Failed to update overdue goal statuses', { error });
      throw error;
    }
  }

  /**
   * Get goal statistics for a patient
   */
  async getGoalStatistics(patientId: string): Promise<{
    totalGoals: number;
    achievedGoals: number;
    inProgressGoals: number;
    atRiskGoals: number;
    overdueGoals: number;
    averageCompletion: number;
    completionRate: number;
  }> {
    try {
      const plans = await CarePlan.find({
        patientId,
        status: { $ne: 'archived' },
      });

      let totalGoals = 0;
      let achievedGoals = 0;
      let inProgressGoals = 0;
      let atRiskGoals = 0;
      let overdueGoals = 0;
      let totalCompletion = 0;
      const now = new Date();

      for (const plan of plans) {
        for (const goal of plan.goals) {
          totalGoals++;
          totalCompletion += goal.completionPercentage;

          switch (goal.status) {
            case GoalStatus.ACHIEVED:
            case GoalStatus.PARTIALLY_ACHIEVED:
              achievedGoals++;
              break;
            case GoalStatus.IN_PROGRESS:
            case GoalStatus.ON_TRACK:
              inProgressGoals++;
              break;
            case GoalStatus.AT_RISK:
              atRiskGoals++;
              break;
          }

          if (new Date(goal.targetDate) < now && ![GoalStatus.ACHIEVED, GoalStatus.PARTIALLY_ACHIEVED, GoalStatus.NOT_ACHIEVED].includes(goal.status)) {
            overdueGoals++;
          }
        }
      }

      return {
        totalGoals,
        achievedGoals,
        inProgressGoals,
        atRiskGoals,
        overdueGoals,
        averageCompletion: totalGoals > 0 ? totalCompletion / totalGoals : 0,
        completionRate: totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0,
      };
    } catch (error) {
      logger.error('Failed to get goal statistics', { error, patientId });
      throw error;
    }
  }
}

export const goalTrackingService = new GoalTrackingService();
export default goalTrackingService;
