import cron from 'node-cron';
import { BriefingModel } from '../models/Briefing';
import { BriefingGenerator } from './generator';
import { Notifier } from './notifier';
import { NotificationChannel } from '../types';

interface ScheduleConfig {
  enabled: boolean;
  time: string; // HH:mm format
  timezone: string;
  channels: NotificationChannel[];
}

interface ScheduledTask {
  cronExpression: string;
  task: cron.ScheduledTask;
}

export class BriefingScheduler {
  private static instance: BriefingScheduler;
  private schedules: Map<string, ScheduleConfig> = new Map();
  private tasks: Map<string, ScheduledTask> = new Map();
  private generator: BriefingGenerator;
  private notifier: Notifier;

  private constructor() {
    this.generator = new BriefingGenerator();
    this.notifier = new Notifier();
    this.loadSchedules();
  }

  public static getInstance(): BriefingScheduler {
    if (!BriefingScheduler.instance) {
      BriefingScheduler.instance = new BriefingScheduler();
    }
    return BriefingScheduler.instance;
  }

  private async loadSchedules(): Promise<void> {
    // Load schedules from database or configuration
    // For now, use environment-based defaults
    const defaultConfig: ScheduleConfig = {
      enabled: true,
      time: process.env.BRIEFING_SCHEDULE_HOUR
        ? `${process.env.BRIEFING_SCHEDULE_HOUR}:${process.env.BRIEFING_SCHEDULE_MINUTE || '0'}`
        : '06:00',
      timezone: 'UTC',
      channels: [
        { type: 'email', enabled: true },
        { type: 'slack', enabled: false },
        { type: 'whatsapp', enabled: false }
      ]
    };

    // Set default tenant schedule
    const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
    this.updateSchedule(defaultTenantId, defaultConfig);
  }

  public getSchedule(tenantId: string): ScheduleConfig {
    return this.schedules.get(tenantId) || {
      enabled: false,
      time: '06:00',
      timezone: 'UTC',
      channels: [{ type: 'email', enabled: true }]
    };
  }

  public getAllSchedules(): Record<string, {
    enabled: boolean;
    time: string;
    timezone: string;
    channels: NotificationChannel[];
    nextRun: Date | null;
  }> {
    const result: Record<string, {
      enabled: boolean;
      time: string;
      timezone: string;
      channels: NotificationChannel[];
      nextRun: Date | null;
    }> = {};

    for (const [tenantId, config] of this.schedules.entries()) {
      result[tenantId] = {
        ...config,
        nextRun: this.getNextRun(tenantId)
      };
    }

    return result;
  }

  public updateSchedule(tenantId: string, config: Partial<ScheduleConfig>): void {
    const currentSchedule = this.getSchedule(tenantId);
    const newSchedule: ScheduleConfig = {
      ...currentSchedule,
      ...config
    };

    this.schedules.set(tenantId, newSchedule);

    // Update or create cron task
    this.updateCronTask(tenantId, newSchedule);
  }

  public removeSchedule(tenantId: string): void {
    const task = this.tasks.get(tenantId);
    if (task) {
      task.task.stop();
      this.tasks.delete(tenantId);
    }
    this.schedules.delete(tenantId);
  }

  public getNextRun(tenantId: string): Date | null {
    const schedule = this.getSchedule(tenantId);
    if (!schedule.enabled) return null;

    const [hours, minutes] = schedule.time.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  private updateCronTask(tenantId: string, config: ScheduleConfig): void {
    // Stop existing task if any
    const existingTask = this.tasks.get(tenantId);
    if (existingTask) {
      existingTask.task.stop();
      this.tasks.delete(tenantId);
    }

    if (!config.enabled) return;

    // Create cron expression: minute hour * * *
    const [hours, minutes] = config.time.split(':');
    const cronExpression = `${minutes} ${hours} * * *`;

    const task = cron.schedule(cronExpression, async () => {
      await this.executeBriefing(tenantId);
    }, {
      timezone: config.timezone
    });

    this.tasks.set(tenantId, { cronExpression, task });
    console.log(`Scheduled briefing for tenant ${tenantId} at ${config.time} (${config.timezone})`);
  }

  private async executeBriefing(tenantId: string): Promise<void> {
    console.log(`Executing scheduled briefing for tenant ${tenantId}`);

    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Check if briefing already exists for today
      const existing = await BriefingModel.findOne({
        tenantId,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      if (existing && existing.status === 'completed') {
        console.log(`Briefing for ${tenantId} on ${today.toDateString()} already exists, sending...`);
        await this.sendScheduledBriefing(existing.id, tenantId);
        return;
      }

      // Generate new briefing
      const briefingId = `scheduled-${tenantId}-${Date.now()}`;
      const newBriefing = new BriefingModel({
        id: briefingId,
        tenantId,
        date: today,
        generatedAt: new Date(),
        status: 'generating',
        summary: { headline: '', keyHighlights: [], executiveSummary: '', quickWins: [] },
        riskAnalysis: { overallRiskScore: 0, riskLevel: 'low', risks: [], trendingRisks: [] },
        opportunities: { totalOpportunities: 0, opportunities: [], topPriority: [] },
        recommendations: [],
        pendingApprovals: [],
        alerts: [],
        metrics: {
          revenue: { value: 0, change: 0, trend: 'stable' },
          customers: { value: 0, change: 0, trend: 'stable' },
          operations: { value: 0, change: 0, trend: 'stable' },
          market: { value: 0, change: 0, trend: 'stable' }
        },
        deliveryStatus: [],
        metadata: { dataSources: [], confidence: 0, processingTime: 0, version: '1.0.0' }
      });

      await newBriefing.save();

      // Generate briefing
      const result = await this.generator.generate(tenantId, briefingId, today);

      // Update and send
      await BriefingModel.findOneAndUpdate(
        { id: briefingId },
        { ...result, status: 'completed' }
      );

      await this.sendScheduledBriefing(briefingId, tenantId);

    } catch (error) {
      console.error(`Error executing scheduled briefing for ${tenantId}:`, error);
    }
  }

  private async sendScheduledBriefing(briefingId: string, tenantId: string): Promise<void> {
    try {
      const briefing = await BriefingModel.findOne({ id: briefingId });
      if (!briefing) {
        console.error(`Briefing ${briefingId} not found`);
        return;
      }

      const schedule = this.getSchedule(tenantId);
      const channels = schedule.channels.filter(c => c.enabled).map(c => c.type);

      const results = await this.notifier.sendBriefing(
        briefing as any,
        channels as any,
        undefined
      );

      await BriefingModel.findOneAndUpdate(
        { id: briefingId },
        {
          deliveryStatus: results,
          status: 'sent'
        }
      );

      console.log(`Scheduled briefing ${briefingId} sent successfully via ${channels.join(', ')}`);

    } catch (error) {
      console.error(`Error sending scheduled briefing ${briefingId}:`, error);
    }
  }

  public async sendTestNotification(
    tenantId: string,
    channels?: string[],
    testMessage?: string
  ): Promise<{ channel: string; success: boolean; error?: string }[]> {
    const schedule = this.getSchedule(tenantId);
    const testChannels = channels || schedule.channels.filter(c => c.enabled).map(c => c.type);

    const results: { channel: string; success: boolean; error?: string }[] = [];

    for (const channel of testChannels) {
      try {
        const message = testMessage || 'This is a test briefing notification from AI Briefing Service.';
        await this.notifier.sendTest(channel as any, message, tenantId);
        results.push({ channel, success: true });
      } catch (error) {
        results.push({
          channel,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  public stopAll(): void {
    for (const [tenantId, task] of this.tasks.entries()) {
      task.task.stop();
      console.log(`Stopped scheduled briefing for tenant ${tenantId}`);
    }
    this.tasks.clear();
  }
}
