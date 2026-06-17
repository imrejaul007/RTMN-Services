import cron from 'node-cron';
import { generateBriefing } from './briefingGenerator';
import { Briefing } from '../models/Briefing';
import { Alert } from '../models/Alert';
import { Metric } from '../models/Metric';
import winston from 'winston';

/**
 * Schedule daily briefing generation
 * Runs every day at 6:00 AM
 */
export function scheduleBriefingGeneration(logger: winston.Logger): void {
  // Schedule for 6 AM daily
  cron.schedule('0 6 * * *', async () => {
    logger.info('Starting scheduled daily briefing generation...');

    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if briefing already exists
      const existing = await Briefing.findOne({ date: today });

      if (existing) {
        logger.info(`Briefing already exists for ${today}, skipping generation.`);
        return;
      }

      // Generate new briefing
      const briefing = await generateBriefing(today);

      logger.info(`Daily briefing generated successfully for ${today}`, {
        briefingId: briefing.id,
        summaryLength: briefing.summary.length,
        sectionsCount: briefing.sections.length,
        risksCount: briefing.risks.length,
        opportunitiesCount: briefing.opportunities.length
      });

      // Send notification (in production, integrate with notification service)
      await sendBriefingNotification(briefing, logger);

    } catch (error) {
      const err = error as Error;
      logger.error('Failed to generate scheduled briefing:', err);
    }
  }, {
    timezone: 'America/New_York' // Adjust timezone as needed
  });

  logger.info('Scheduled daily briefing generation for 6:00 AM');
}

/**
 * Schedule periodic metric updates
 * Runs every hour to refresh metrics
 */
export function scheduleMetricUpdates(logger: winston.Logger): void {
  // Schedule for every hour
  cron.schedule('0 * * * *', async () => {
    logger.debug('Starting scheduled metric update...');

    try {
      // In production, this would fetch real metrics from various services
      // For now, we'll simulate metric updates
      await updateMetrics(logger);

      logger.debug('Metric update completed');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to update metrics:', err);
    }
  });

  logger.info('Scheduled hourly metric updates');
}

/**
 * Schedule alert cleanup
 * Runs daily at midnight to clean old alerts
 */
export function scheduleAlertCleanup(logger: winston.Logger): void {
  // Schedule for midnight daily
  cron.schedule('0 0 * * *', async () => {
    logger.info('Starting scheduled alert cleanup...');

    try {
      // Delete alerts older than 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await Alert.deleteMany({
        acknowledged: true,
        timestamp: { $lt: ninetyDaysAgo }
      });

      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} old acknowledged alerts`);
      }

    } catch (error) {
      const err = error as Error;
      logger.error('Failed to clean up alerts:', err);
    }
  });

  logger.info('Scheduled daily alert cleanup at midnight');
}

/**
 * Schedule weekly briefing summary
 * Runs every Monday at 7 AM
 */
export function scheduleWeeklySummary(logger: winston.Logger): void {
  cron.schedule('0 7 * * 1', async () => {
    logger.info('Generating weekly executive summary...');

    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const startDate = weekAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      // Get all briefings from the past week
      const briefings = await Briefing.find({
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: -1 }).exec();

      if (briefings.length === 0) {
        logger.warn('No briefings found for weekly summary');
        return;
      }

      // Generate weekly summary (in production, this would create a formal report)
      const summary = {
        week: `${startDate} to ${endDate}`,
        briefingsCount: briefings.length,
        averageRevenue: calculateAverageRevenue(briefings),
        topRisks: extractTopRisks(briefings),
        topOpportunities: extractTopOpportunities(briefings),
        generatedAt: new Date()
      };

      logger.info('Weekly summary generated', {
        week: summary.week,
        briefingsCount: summary.briefingsCount,
        averageRevenue: summary.averageRevenue
      });

      // In production, this would send the summary via email or notification

    } catch (error) {
      const err = error as Error;
      logger.error('Failed to generate weekly summary:', err);
    }
  });

  logger.info('Scheduled weekly summary generation for Monday 7:00 AM');
}

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduler(logger: winston.Logger): void {
  scheduleBriefingGeneration(logger);
  scheduleMetricUpdates(logger);
  scheduleAlertCleanup(logger);
  scheduleWeeklySummary(logger);

  logger.info('All scheduled tasks initialized');
}

/**
 * Update metrics (placeholder for production integration)
 */
async function updateMetrics(logger: winston.Logger): Promise<void> {
  // In production, this would:
  // 1. Fetch metrics from various services (CRM, Analytics, ERP, etc.)
  // 2. Aggregate and normalize the data
  // 3. Update the Metric collection

  try {
    // Get existing metrics
    const existingMetrics = await Metric.find().exec();

    // Simulate metric updates
    for (const metric of existingMetrics) {
      // Apply small random changes to simulate live data
      const changePercent = (Math.random() - 0.5) * 2; // -1% to +1%
      const newValue = metric.value * (1 + changePercent / 100);

      await metric.updateValue(newValue);
    }

    logger.debug(`Updated ${existingMetrics.length} metrics`);
  } catch (error) {
    logger.error('Error updating metrics:', error);
  }
}

/**
 * Send briefing notification
 */
async function sendBriefingNotification(briefing: any, logger: winston.Logger): Promise<void> {
  // In production, this would integrate with:
  // - Email service (SendGrid, Resend, etc.)
  // - Push notifications
  // - Slack/Teams webhooks
  // - SMS service

  const notification = {
    type: 'daily_briefing',
    title: briefing.title,
    summary: briefing.summary.substring(0, 200) + '...',
    priorityItems: briefing.sections.filter((s: any) => s.priority === 'high').length,
    risksCount: briefing.risks.length,
    opportunitiesCount: briefing.opportunities.length,
    generatedAt: briefing.generatedAt
  };

  logger.info('Briefing notification prepared', {
    title: notification.title,
    priorityItems: notification.priorityItems
  });

  // In production, send the notification
  // await notificationService.send(notification);
}

/**
 * Calculate average revenue from briefings
 */
function calculateAverageRevenue(briefings: any[]): number {
  const revenues = briefings
    .filter(b => b.metrics?.revenue)
    .map(b => b.metrics.revenue);

  if (revenues.length === 0) return 0;
  return revenues.reduce((sum, r) => sum + r, 0) / revenues.length;
}

/**
 * Extract top risks from briefings
 */
function extractTopRisks(briefings: any[]): string[] {
  const allRisks = briefings.flatMap(b => b.risks || []);
  const critical = allRisks
    .filter(r => r.severity === 'critical' || r.severity === 'high')
    .map(r => r.title);

  return [...new Set(critical)].slice(0, 5);
}

/**
 * Extract top opportunities from briefings
 */
function extractTopOpportunities(briefings: any[]): string[] {
  const allOpportunities = briefings.flatMap(b => b.opportunities || []);
  const high = allOpportunities
    .filter(o => o.potential === 'high')
    .map(o => o.title);

  return [...new Set(high)].slice(0, 5);
}

/**
 * Manually trigger briefing generation
 */
export async function triggerBriefingGeneration(
  date: string,
  logger: winston.Logger
): Promise<void> {
  logger.info(`Manually triggering briefing generation for ${date}`);

  try {
    const briefing = await generateBriefing(date);
    logger.info(`Briefing generated successfully`, {
      briefingId: briefing.id,
      date
    });
  } catch (error) {
    logger.error('Manual briefing generation failed:', error);
    throw error;
  }
}
