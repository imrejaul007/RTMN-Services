/**
 * GENIE Memory Review Service - Cron Scheduler
 */
import cron from 'node-cron';
import { getMemoryReviewService } from './memoryReviewService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('scheduler');

export class ReviewScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  start(): void {
    if (this.isRunning) return;

    // Run every minute to check for pending reviews
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.runPendingReviews();
    });

    this.isRunning = true;
    logger.info('scheduler_started');
  }

  stop(): void {
    this.cronJob?.stop();
    this.isRunning = false;
    logger.info('scheduler_stopped');
  }

  private async runPendingReviews(): Promise<void> {
    const service = getMemoryReviewService();

    try {
      const pending = await service.getPendingReviews();

      for (const schedule of pending) {
        try {
          if (schedule.review_type === 'daily') {
            await service.generateDailyReview(schedule.tenant_id, schedule.user_id);
          } else if (schedule.review_type === 'weekly') {
            await service.generateWeeklyReview(schedule.tenant_id, schedule.user_id);
          } else if (schedule.review_type === 'monthly') {
            await service.generateMonthlyReview(schedule.tenant_id, schedule.user_id);
          }

          // Update next run time
          schedule.last_run = new Date();
          const nextRun = new Date();
          if (schedule.review_type === 'daily') {
            nextRun.setDate(nextRun.getDate() + 1);
          } else if (schedule.review_type === 'weekly') {
            nextRun.setDate(nextRun.getDate() + 7);
          }
          schedule.next_run = nextRun;
          await schedule.save();

          logger.info('review_completed', { tenantId: schedule.tenant_id, userId: schedule.user_id, type: schedule.review_type });
        } catch (error) {
          logger.error('review_failed', { tenantId: schedule.tenant_id, userId: schedule.user_id, error });
        }
      }
    } catch (error) {
      logger.error('scheduler_error', { error });
    }
  }
}

let schedulerInstance: ReviewScheduler | null = null;
export function getReviewScheduler(): ReviewScheduler {
  if (!schedulerInstance) schedulerInstance = new ReviewScheduler();
  return schedulerInstance;
}
