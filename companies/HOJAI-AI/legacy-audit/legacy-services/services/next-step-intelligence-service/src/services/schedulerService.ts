import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { NextStepModel, StepStatus, ReminderChannel, IStepSchedule, ReminderFrequency } from '../models/nextStep';
import { logger } from '../utils/logger';
import { reminderService } from './reminderService';

// ============================================
// TYPES
// ============================================

export interface ScheduledJob {
  jobId: string;
  stepId: string;
  cronExpression: string;
  task: cron.ScheduledTask;
  createdAt: Date;
}

export interface ReminderSchedule {
  nextReminderAt: Date;
  scheduleType: ReminderFrequency;
  message?: string;
}

// ============================================
// SCHEDULER SERVICE
// ============================================

export class SchedulerService {
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private cronJobs: cron.ScheduledTask[] = [];
  private isRunning: boolean = false;
  private readonly BATCH_SIZE = 100;
  private readonly OVERDUE_CHECK_INTERVAL = '*/5 * * * *'; // Every 5 minutes

  constructor() {
    this.initializeCronJobs();
  }

  /**
   * Schedule a reminder for a step
   */
  async scheduleReminder(step: {
    stepId: string;
    customerId: string;
    title: string;
    dueDate?: Date;
    nextReminderAt?: Date;
    schedule: IStepSchedule;
    reminderSettings: {
      channels: Array<{ channel: ReminderChannel; enabled: boolean }>;
    };
  }): Promise<{ success: boolean; nextReminderAt?: Date; error?: string }> {
    try {
      // Calculate the next reminder time
      const nextReminderTime = this.calculateNextReminder(step);

      if (!nextReminderTime) {
        return { success: false, error: 'No valid reminder time could be calculated' };
      }

      // Update the step with the next reminder time
      await NextStepModel.updateOne(
        { stepId: step.stepId },
        {
          $set: {
            nextReminderAt: nextReminderTime,
            'schedule.endDate': step.schedule.endDate
          }
        }
      );

      logger.info('Scheduled reminder', {
        stepId: step.stepId,
        customerId: step.customerId,
        nextReminderAt: nextReminderTime
      });

      return { success: true, nextReminderAt: nextReminderTime };
    } catch (error) {
      logger.error('Error scheduling reminder', { error, stepId: step.stepId });
      return { success: false, error: 'Failed to schedule reminder' };
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  async cancelReminder(stepId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove from our in-memory job tracking
      const existingJob = this.scheduledJobs.get(stepId);
      if (existingJob) {
        existingJob.task.stop();
        this.scheduledJobs.delete(stepId);
      }

      // Update the step to clear reminder time
      await NextStepModel.updateOne(
        { stepId },
        { $unset: { nextReminderAt: 1 } }
      );

      logger.info('Cancelled reminder', { stepId });
      return { success: true };
    } catch (error) {
      logger.error('Error cancelling reminder', { error, stepId });
      return { success: false, error: 'Failed to cancel reminder' };
    }
  }

  /**
   * Snooze a reminder to a new time
   */
  async snoozeReminder(
    stepId: string,
    newTime: Date,
    reason?: string
  ): Promise<{ success: boolean; newReminderAt?: Date; error?: string }> {
    try {
      const step = await NextStepModel.findOne({ stepId });
      if (!step) {
        return { success: false, error: 'Step not found' };
      }

      if (!step.canSnooze()) {
        return { success: false, error: 'Step cannot be snoozed in current status' };
      }

      // Record snooze history
      await NextStepModel.updateOne(
        { stepId },
        {
          $push: {
            snoozeHistory: {
              snoozedAt: new Date(),
              originalDueDate: step.dueDate || step.nextReminderAt,
              newDueDate: newTime,
              reason
            }
          },
          $set: {
            nextReminderAt: newTime,
            dueDate: newTime
          }
        }
      );

      logger.info('Snoozed reminder', { stepId, newTime, reason });

      return { success: true, newReminderAt: newTime };
    } catch (error) {
      logger.error('Error snoozing reminder', { error, stepId });
      return { success: false, error: 'Failed to snooze reminder' };
    }
  }

  /**
   * Get upcoming reminders for a customer
   */
  async getUpcomingReminders(
    customerId: string,
    hoursAhead: number = 24
  ): Promise<Array<{ stepId: string; title: string; reminderAt: Date; priority: string }>> {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

      const steps = await NextStepModel.find({
        customerId,
        status: { $in: [StepStatus.PENDING, StepStatus.IN_PROGRESS, StepStatus.OVERDUE] },
        nextReminderAt: { $gte: now, $lte: futureDate }
      })
        .select('stepId title nextReminderAt priority')
        .sort({ nextReminderAt: 1 });

      return steps.map(step => ({
        stepId: step.stepId,
        title: step.title,
        reminderAt: step.nextReminderAt!,
        priority: step.priority
      }));
    } catch (error) {
      logger.error('Error getting upcoming reminders', { error, customerId });
      return [];
    }
  }

  /**
   * Get overdue reminders
   */
  async getOverdueReminders(
    customerId?: string
  ): Promise<Array<{ stepId: string; title: string; dueDate: Date; customerId: string }>> {
    try {
      const query: Record<string, unknown> = {
        status: { $in: [StepStatus.PENDING, StepStatus.OVERDUE] },
        dueDate: { $lt: new Date() }
      };

      if (customerId) {
        query.customerId = customerId;
      }

      const steps = await NextStepModel.find(query)
        .select('stepId title dueDate customerId')
        .sort({ dueDate: 1 })
        .limit(100);

      return steps.map(step => ({
        stepId: step.stepId,
        title: step.title,
        dueDate: step.dueDate!,
        customerId: step.customerId
      }));
    } catch (error) {
      logger.error('Error getting overdue reminders', { error, customerId });
      return [];
    }
  }

  /**
   * Trigger a reminder manually
   */
  async triggerReminder(stepId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const step = await NextStepModel.findOne({ stepId });
      if (!step) {
        return { success: false, error: 'Step not found' };
      }

      if (step.status === StepStatus.COMPLETED || step.status === StepStatus.SKIPPED) {
        return { success: false, error: 'Step is already completed or skipped' };
      }

      // Send reminders through all enabled channels
      const enabledChannels = step.reminderSettings.channels.filter(c => c.enabled);

      for (const channelConfig of enabledChannels) {
        await reminderService.sendReminder(step, channelConfig.channel);
      }

      // Update last reminder timestamp and notification count
      await NextStepModel.updateOne(
        { stepId },
        {
          $set: { lastReminderAt: new Date() },
          $inc: {
            'reminderSettings.channels.$[elem].notificationCount': 1,
            'reminderSettings.channels.$[elem].lastNotifiedAt': new Date()
          }
        },
        {
          arrayFilters: [{ 'elem.enabled': true }]
        }
      );

      logger.info('Triggered reminder', { stepId, channels: enabledChannels.map(c => c.channel) });

      return { success: true };
    } catch (error) {
      logger.error('Error triggering reminder', { error, stepId });
      return { success: false, error: 'Failed to trigger reminder' };
    }
  }

  /**
   * Schedule batch reminders for multiple steps
   */
  async scheduleBatchReminders(stepIds: string[]): Promise<{
    scheduled: number;
    failed: number;
    results: Array<{ stepId: string; success: boolean; nextReminderAt?: Date; error?: string }>;
  }> {
    const results: Array<{
      stepId: string;
      success: boolean;
      nextReminderAt?: Date;
      error?: string;
    }> = [];

    let scheduled = 0;
    let failed = 0;

    for (const stepId of stepIds) {
      const step = await NextStepModel.findOne({ stepId });
      if (!step) {
        results.push({ stepId, success: false, error: 'Step not found' });
        failed++;
        continue;
      }

      const result = await this.scheduleReminder(step);
      results.push({ stepId, ...result });

      if (result.success) {
        scheduled++;
      } else {
        failed++;
      }
    }

    logger.info('Batch reminder scheduling completed', { scheduled, failed, total: stepIds.length });

    return { scheduled, failed, results };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private initializeCronJobs(): void {
    // Process due reminders every minute
    const processRemindersJob = cron.schedule('* * * * *', async () => {
      if (this.isRunning) return;
      this.isRunning = true;

      try {
        await this.processDueReminders();
      } finally {
        this.isRunning = false;
      }
    });

    // Check for overdue steps every 5 minutes
    const checkOverdueJob = cron.schedule(this.OVERDUE_CHECK_INTERVAL, async () => {
      try {
        await this.checkOverdueSteps();
      } catch (error) {
        logger.error('Error checking overdue steps', { error });
      }
    });

    // Reschedule reminders daily at midnight
    const dailyRescheduleJob = cron.schedule('0 0 * * *', async () => {
      try {
        await this.rescheduleDailyReminders();
      } catch (error) {
        logger.error('Error rescheduling daily reminders', { error });
      }
    });

    this.cronJobs.push(processRemindersJob, checkOverdueJob, dailyRescheduleJob);

    logger.info('Cron jobs initialized', {
      reminderProcessing: 'every minute',
      overdueCheck: this.OVERDUE_CHECK_INTERVAL,
      dailyReschedule: '0 0 * * *'
    });
  }

  private async processDueReminders(): Promise<void> {
    try {
      const dueSteps = await NextStepModel.getDueForReminder(this.BATCH_SIZE);

      if (dueSteps.length === 0) {
        return;
      }

      logger.info(`Processing ${dueSteps.length} due reminders`);

      for (const step of dueSteps) {
        try {
          // Skip completed or cancelled steps
          if (step.status === StepStatus.COMPLETED ||
              step.status === StepStatus.SKIPPED ||
              step.status === StepStatus.CANCELLED) {
            continue;
          }

          // Send reminders
          const enabledChannels = step.reminderSettings.channels.filter(c => c.enabled);

          for (const channelConfig of enabledChannels) {
            await reminderService.sendReminder(step, channelConfig.channel);
          }

          // Update last reminder time
          await NextStepModel.updateOne(
            { stepId: step.stepId },
            {
              $set: {
                lastReminderAt: new Date(),
                status: step.dueDate && step.dueDate < new Date()
                  ? StepStatus.OVERDUE
                  : step.status
              }
            }
          );

          // Schedule next reminder if recurring
          if (step.schedule.type !== ReminderFrequency.ONCE) {
            await this.scheduleReminder(step);
          }
        } catch (error) {
          logger.error('Error processing reminder for step', { error, stepId: step.stepId });
        }
      }
    } catch (error) {
      logger.error('Error in processDueReminders', { error });
    }
  }

  private async checkOverdueSteps(): Promise<void> {
    try {
      const now = new Date();

      // Mark pending steps with past due dates as overdue
      const result = await NextStepModel.updateMany(
        {
          status: StepStatus.PENDING,
          dueDate: { $lt: now }
        },
        {
          $set: { status: StepStatus.OVERDUE }
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Marked ${result.modifiedCount} steps as overdue`);
      }
    } catch (error) {
      logger.error('Error checking overdue steps', { error });
    }
  }

  private async rescheduleDailyReminders(): Promise<void> {
    try {
      const now = new Date();

      // Find steps that need daily reminders recalculated
      const dailySteps = await NextStepModel.find({
        status: { $in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
        'schedule.type': ReminderFrequency.DAILY,
        'schedule.endDate': { $gte: now }
      });

      for (const step of dailySteps) {
        await this.scheduleReminder(step);
      }

      logger.info(`Rescheduled ${dailySteps.length} daily reminders`);
    } catch (error) {
      logger.error('Error rescheduling daily reminders', { error });
    }
  }

  private calculateNextReminder(step: {
    schedule: IStepSchedule;
    dueDate?: Date;
    nextReminderAt?: Date;
  }): Date | null {
    const now = new Date();
    const { schedule } = step;

    // For one-time reminders
    if (schedule.type === ReminderFrequency.ONCE) {
      // If there's a due date, use that
      if (step.dueDate) {
        const reminderTime = new Date(step.dueDate.getTime() - (schedule.snoozeDuration || 30) * 60 * 1000);
        return reminderTime > now ? reminderTime : step.dueDate;
      }
      // Otherwise use the next scheduled time
      return this.getNextScheduledTime(schedule.time, schedule.timezone, schedule.startDate);
    }

    // For recurring reminders
    switch (schedule.type) {
      case ReminderFrequency.DAILY:
        return this.getNextDailyTime(schedule.time, schedule.timezone, schedule.endDate);

      case ReminderFrequency.WEEKLY:
        return this.getNextWeeklyTime(
          schedule.time,
          schedule.timezone,
          schedule.customDays || [1], // Default to Monday
          schedule.endDate
        );

      case ReminderFrequency.MONTHLY:
        return this.getNextMonthlyTime(schedule.time, schedule.timezone, schedule.endDate);

      case ReminderFrequency.CUSTOM:
        if (schedule.customInterval) {
          const intervalMs = schedule.customInterval * 60 * 60 * 1000;
          const lastReminder = step.nextReminderAt || now;
          const nextReminder = new Date(lastReminder.getTime() + intervalMs);
          return nextReminder;
        }
        return null;

      default:
        return step.dueDate || this.getNextScheduledTime(schedule.time, schedule.timezone, schedule.startDate);
    }
  }

  private getNextScheduledTime(time: string, timezone: string, startDate?: Date): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);

    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    if (startDate && next < startDate) {
      next.setTime(startDate.getTime());
    }

    return next;
  }

  private getNextDailyTime(time: string, timezone: string, endDate?: Date): Date {
    const next = this.getNextScheduledTime(time, timezone);
    if (endDate && next > endDate) {
      return endDate;
    }
    return next;
  }

  private getNextWeeklyTime(
    time: string,
    timezone: string,
    days: number[],
    endDate?: Date
  ): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);

    // Find the next valid day
    for (let i = 0; i <= 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + i);
      checkDate.setHours(hours, minutes, 0, 0);

      if (days.includes(checkDate.getDay()) && checkDate > now) {
        if (!endDate || checkDate <= endDate) {
          return checkDate;
        }
      }
    }

    // If no valid date found this week, return first valid day next week
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + 7);
    nextDate.setHours(hours, minutes, 0, 0);

    return nextDate;
  }

  private getNextMonthlyTime(time: string, timezone: string, endDate?: Date): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);

    // Simple monthly: same day next month
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    next.setHours(hours, minutes, 0, 0);

    if (endDate && next > endDate) {
      return endDate;
    }

    return next;
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    for (const job of this.cronJobs) {
      job.stop();
    }
    for (const scheduledJob of this.scheduledJobs.values()) {
      scheduledJob.task.stop();
    }
    this.scheduledJobs.clear();
    this.cronJobs = [];
    logger.info('Scheduler stopped');
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
