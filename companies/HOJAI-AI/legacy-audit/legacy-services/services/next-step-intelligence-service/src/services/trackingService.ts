import { v4 as uuidv4 } from 'uuid';
import {
  NextStepModel,
  StepStatus,
  StepPriority,
  StepType,
  IStepSchedule,
  ICompletionDetails,
  INextStep
} from '../models/nextStep';
import { logger } from '../utils/logger';

// ============================================
// TYPES
// ============================================

export interface CreateStepInput {
  customerId: string;
  tenantId: string;
  title: string;
  description?: string;
  stepType: StepType;
  priority?: StepPriority;
  dueDate?: Date;
  schedule?: Partial<IStepSchedule>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  tags?: string[];
  category?: string;
  sourceService: string;
  confidence?: number;
  reminderChannels?: string[];
}

export interface UpdateStepInput {
  title?: string;
  description?: string;
  stepType?: StepType;
  priority?: StepPriority;
  status?: StepStatus;
  dueDate?: Date;
  tags?: string[];
  category?: string;
}

export interface CompleteStepInput {
  completedBy?: string;
  completionMethod: 'manual' | 'automated' | 'ai_suggested';
  notes?: string;
  attachments?: string[];
  feedback?: {
    rating?: number;
    comment?: string;
  };
}

export interface StepFilters {
  status?: StepStatus[];
  priority?: StepPriority[];
  stepType?: StepType[];
  fromDate?: Date;
  toDate?: Date;
  relatedEntityType?: string;
  tags?: string[];
  limit?: number;
  skip?: number;
  sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface StepAnalytics {
  customerId: string;
  period: { start: Date; end: Date };
  total: number;
  completed: number;
  skipped: number;
  overdue: number;
  pending: number;
  completionRate: number;
  averageCompletionTime: number; // hours
  byPriority: Record<StepPriority, { total: number; completed: number; rate: number }>;
  byType: Record<StepType, { total: number; completed: number; rate: number }>;
  completionByDay: Array<{ date: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
}

// ============================================
// TRACKING SERVICE
// ============================================

export class TrackingService {
  /**
   * Track/create a new step
   */
  async trackStep(input: CreateStepInput): Promise<INextStep> {
    try {
      const stepId = uuidv4();

      const stepData: INextStep = {
        stepId,
        customerId: input.customerId,
        tenantId: input.tenantId,
        title: input.title,
        description: input.description,
        stepType: input.stepType,
        priority: input.priority || StepPriority.MEDIUM,
        status: StepStatus.PENDING,
        dueDate: input.dueDate,
        schedule: {
          type: (input.schedule?.type as any) || 'once',
          time: input.schedule?.time || '09:00',
          timezone: input.schedule?.timezone || 'Asia/Kolkata',
          startDate: input.schedule?.startDate,
          endDate: input.schedule?.endDate,
          customDays: input.schedule?.customDays,
          customInterval: input.schedule?.customInterval,
          snoozeDuration: input.schedule?.snoozeDuration || 30
        },
        reminderSettings: {
          channels: (input.reminderChannels || ['whatsapp', 'push']).map(channel => ({
            channel: channel as any,
            enabled: true
          })),
          leadTimeMinutes: 30
        },
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        tags: input.tags || [],
        category: input.category,
        sourceService: input.sourceService,
        confidence: input.confidence || 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const step = await new NextStepModel(stepData).save();

      logger.info('Step tracked', { stepId, customerId: input.customerId, title: input.title });

      return step;
    } catch (error) {
      logger.error('Error tracking step', { error, customerId: input.customerId });
      throw error;
    }
  }

  /**
   * Update step status
   */
  async updateStepStatus(
    stepId: string,
    status: StepStatus
  ): Promise<{ success: boolean; step?: INextStep; error?: string }> {
    try {
      const step = await NextStepModel.findOne({ stepId });

      if (!step) {
        return { success: false, error: 'Step not found' };
      }

      const validTransitions: Record<StepStatus, StepStatus[]> = {
        [StepStatus.PENDING]: [StepStatus.IN_PROGRESS, StepStatus.COMPLETED, StepStatus.SKIPPED, StepStatus.OVERDUE],
        [StepStatus.IN_PROGRESS]: [StepStatus.COMPLETED, StepStatus.SKIPPED, StepStatus.PENDING, StepStatus.OVERDUE],
        [StepStatus.COMPLETED]: [StepStatus.PENDING], // Can reopen
        [StepStatus.SKIPPED]: [StepStatus.PENDING], // Can reopen
        [StepStatus.OVERDUE]: [StepStatus.PENDING, StepStatus.COMPLETED, StepStatus.SKIPPED],
        [StepStatus.CANCELLED]: []
      };

      if (!validTransitions[step.status as StepStatus]?.includes(status)) {
        return {
          success: false,
          error: `Cannot transition from ${step.status} to ${status}`
        };
      }

      step.status = status;
      step.updatedAt = new Date();

      if (status === StepStatus.COMPLETED) {
        step.completedAt = new Date();
      }

      await step.save();

      logger.info('Step status updated', { stepId, oldStatus: step.status, newStatus: status });

      return { success: true, step };
    } catch (error) {
      logger.error('Error updating step status', { error, stepId });
      return { success: false, error: 'Failed to update step status' };
    }
  }

  /**
   * Complete a step with completion details
   */
  async completeStep(
    stepId: string,
    completion: CompleteStepInput
  ): Promise<{ success: boolean; step?: INextStep; error?: string }> {
    try {
      const step = await NextStepModel.findOne({ stepId });

      if (!step) {
        return { success: false, error: 'Step not found' };
      }

      if (!step.canComplete()) {
        return { success: false, error: 'Step cannot be completed in current status' };
      }

      const completionDetails: ICompletionDetails = {
        completedAt: new Date(),
        completedBy: completion.completedBy,
        completionMethod: completion.completionMethod,
        notes: completion.notes,
        attachments: completion.attachments,
        feedback: completion.feedback
      };

      step.status = StepStatus.COMPLETED;
      step.completion = completionDetails;
      step.completedAt = new Date();
      step.updatedAt = new Date();

      // Clear next reminder since completed
      step.nextReminderAt = undefined;

      await step.save();

      logger.info('Step completed', { stepId, completionMethod: completion.completionMethod });

      return { success: true, step };
    } catch (error) {
      logger.error('Error completing step', { error, stepId });
      return { success: false, error: 'Failed to complete step' };
    }
  }

  /**
   * Get all steps for a customer with filters
   */
  async getCustomerSteps(
    customerId: string,
    filters?: StepFilters
  ): Promise<{ steps: INextStep[]; total: number }> {
    try {
      const query: Record<string, unknown> = { customerId };

      if (filters?.status?.length) {
        query.status = { $in: filters.status };
      }

      if (filters?.priority?.length) {
        query.priority = { $in: filters.priority };
      }

      if (filters?.stepType?.length) {
        query.stepType = { $in: filters.stepType };
      }

      if (filters?.relatedEntityType) {
        query.relatedEntityType = filters.relatedEntityType;
      }

      if (filters?.tags?.length) {
        query.tags = { $in: filters.tags };
      }

      if (filters?.fromDate || filters?.toDate) {
        query.dueDate = {};
        if (filters.fromDate) (query.dueDate as Record<string, Date>).$gte = filters.fromDate;
        if (filters.toDate) (query.dueDate as Record<string, Date>).$lte = filters.toDate;
      }

      const sortField = filters?.sortBy || 'dueDate';
      const sortOrder = filters?.sortOrder || 'asc';
      const sort: Record<string, 1 | -1> = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

      const [steps, total] = await Promise.all([
        NextStepModel.find(query)
          .sort(sort)
          .limit(filters?.limit || 50)
          .skip(filters?.skip || 0),
        NextStepModel.countDocuments(query)
      ]);

      return { steps, total };
    } catch (error) {
      logger.error('Error getting customer steps', { error, customerId });
      throw error;
    }
  }

  /**
   * Get step analytics for a customer
   */
  async getStepAnalytics(
    customerId: string,
    days: number = 30
  ): Promise<StepAnalytics> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Get all steps in the period
      const steps = await NextStepModel.find({
        customerId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Calculate totals
      const total = steps.length;
      const completed = steps.filter(s => s.status === StepStatus.COMPLETED).length;
      const skipped = steps.filter(s => s.status === StepStatus.SKIPPED).length;
      const overdue = steps.filter(s => s.status === StepStatus.OVERDUE).length;
      const pending = steps.filter(s =>
        s.status === StepStatus.PENDING || s.status === StepStatus.IN_PROGRESS
      ).length;

      // Calculate completion rate
      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      // Calculate average completion time
      let totalCompletionTime = 0;
      let completedWithTime = 0;

      for (const step of steps) {
        if (step.completion?.completedAt && step.createdAt) {
          const completionTime = (step.completion.completedAt.getTime() - step.createdAt.getTime()) / (1000 * 60 * 60);
          totalCompletionTime += completionTime;
          completedWithTime++;
        }
      }

      const averageCompletionTime = completedWithTime > 0 ? totalCompletionTime / completedWithTime : 0;

      // Calculate by priority
      const byPriority: Record<StepPriority, { total: number; completed: number; rate: number }> = {
        [StepPriority.URGENT]: { total: 0, completed: 0, rate: 0 },
        [StepPriority.HIGH]: { total: 0, completed: 0, rate: 0 },
        [StepPriority.MEDIUM]: { total: 0, completed: 0, rate: 0 },
        [StepPriority.LOW]: { total: 0, completed: 0, rate: 0 }
      };

      for (const step of steps) {
        byPriority[step.priority as StepPriority].total++;
        if (step.status === StepStatus.COMPLETED) {
          byPriority[step.priority as StepPriority].completed++;
        }
      }

      for (const priority of Object.keys(byPriority)) {
        const p = byPriority[priority as StepPriority];
        p.rate = p.total > 0 ? (p.completed / p.total) * 100 : 0;
      }

      // Calculate by type
      const byType: Record<StepType, { total: number; completed: number; rate: number }> = {} as any;

      for (const stepType of Object.values(StepType)) {
        byType[stepType] = { total: 0, completed: 0, rate: 0 };
      }

      for (const step of steps) {
        if (!byType[step.stepType]) {
          byType[step.stepType] = { total: 0, completed: 0, rate: 0 };
        }
        byType[step.stepType].total++;
        if (step.status === StepStatus.COMPLETED) {
          byType[step.stepType].completed++;
        }
      }

      for (const stepType of Object.keys(byType)) {
        const t = byType[stepType as StepType];
        t.rate = t.total > 0 ? (t.completed / t.total) * 100 : 0;
      }

      // Calculate completion by day
      const completionByDayMap = new Map<string, number>();

      for (const step of steps) {
        if (step.completion?.completedAt) {
          const dateKey = step.completion.completedAt.toISOString().split('T')[0];
          completionByDayMap.set(dateKey, (completionByDayMap.get(dateKey) || 0) + 1);
        }
      }

      const completionByDay = Array.from(completionByDayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate top tags
      const tagCounts = new Map<string, number>();

      for (const step of steps) {
        if (step.tags) {
          for (const tag of step.tags) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        }
      }

      const topTags = Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        customerId,
        period: { start: startDate, end: endDate },
        total,
        completed,
        skipped,
        overdue,
        pending,
        completionRate,
        averageCompletionTime,
        byPriority,
        byType,
        completionByDay,
        topTags
      };
    } catch (error) {
      logger.error('Error getting step analytics', { error, customerId });
      throw error;
    }
  }

  /**
   * Get a specific step by ID
   */
  async getStep(stepId: string): Promise<INextStep | null> {
    try {
      return await NextStepModel.findOne({ stepId });
    } catch (error) {
      logger.error('Error getting step', { error, stepId });
      throw error;
    }
  }

  /**
   * Update a step
   */
  async updateStep(
    stepId: string,
    updates: UpdateStepInput
  ): Promise<{ success: boolean; step?: INextStep; error?: string }> {
    try {
      const step = await NextStepModel.findOne({ stepId });

      if (!step) {
        return { success: false, error: 'Step not found' };
      }

      // Apply updates
      if (updates.title !== undefined) step.title = updates.title;
      if (updates.description !== undefined) step.description = updates.description;
      if (updates.stepType !== undefined) step.stepType = updates.stepType;
      if (updates.priority !== undefined) step.priority = updates.priority;
      if (updates.status !== undefined) step.status = updates.status;
      if (updates.dueDate !== undefined) step.dueDate = updates.dueDate;
      if (updates.tags !== undefined) step.tags = updates.tags;
      if (updates.category !== undefined) step.category = updates.category;

      step.updatedAt = new Date();

      await step.save();

      logger.info('Step updated', { stepId });

      return { success: true, step };
    } catch (error) {
      logger.error('Error updating step', { error, stepId });
      return { success: false, error: 'Failed to update step' };
    }
  }

  /**
   * Delete a step
   */
  async deleteStep(stepId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await NextStepModel.deleteOne({ stepId });

      if (result.deletedCount === 0) {
        return { success: false, error: 'Step not found' };
      }

      logger.info('Step deleted', { stepId });

      return { success: true };
    } catch (error) {
      logger.error('Error deleting step', { error, stepId });
      return { success: false, error: 'Failed to delete step' };
    }
  }

  /**
   * Bulk create steps
   */
  async bulkTrackSteps(
    inputs: CreateStepInput[]
  ): Promise<{ created: number; failed: number; steps: INextStep[] }> {
    const steps: INextStep[] = [];
    let created = 0;
    let failed = 0;

    for (const input of inputs) {
      try {
        const step = await this.trackStep(input);
        steps.push(step);
        created++;
      } catch (error) {
        logger.error('Error in bulk track', { error, customerId: input.customerId });
        failed++;
      }
    }

    return { created, failed, steps };
  }

  /**
   * Get step statistics summary
   */
  async getStepSummary(customerId: string): Promise<{
    total: number;
    pending: number;
    overdue: number;
    completedThisWeek: number;
    completedThisMonth: number;
    upcoming: number;
  }> {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        total,
        pending,
        overdue,
        completedThisWeek,
        completedThisMonth,
        upcoming
      ] = await Promise.all([
        NextStepModel.countDocuments({ customerId }),
        NextStepModel.countDocuments({
          customerId,
          status: { $in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] }
        }),
        NextStepModel.countDocuments({
          customerId,
          status: StepStatus.OVERDUE
        }),
        NextStepModel.countDocuments({
          customerId,
          status: StepStatus.COMPLETED,
          completedAt: { $gte: startOfWeek }
        }),
        NextStepModel.countDocuments({
          customerId,
          status: StepStatus.COMPLETED,
          completedAt: { $gte: startOfMonth }
        }),
        NextStepModel.countDocuments({
          customerId,
          status: { $in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
          dueDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
        })
      ]);

      return {
        total,
        pending,
        overdue,
        completedThisWeek,
        completedThisMonth,
        upcoming
      };
    } catch (error) {
      logger.error('Error getting step summary', { error, customerId });
      throw error;
    }
  }
}

// Export singleton instance
export const trackingService = new TrackingService();
