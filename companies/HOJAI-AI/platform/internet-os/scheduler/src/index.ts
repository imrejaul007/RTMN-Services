/**
 * HOJAI InternetOS Scheduler
 *
 * Cron-based scheduler for research agents
 * REUSES: Research Agents + MemoryOS for schedule persistence
 */

import { researchDepartment, ResearchAgent } from '@hojai/research-agents';
import axios from 'axios';

const INTERNET_OS_URL = process.env.INTERNET_OS_URL || 'http://localhost:4595';
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';

export interface ScheduleConfig {
  id: string;
  agentType: string;        // market, competitor, procurement
  cron: string;             // Standard cron expression
  input: Record<string, any>;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount?: number;
}

export class Scheduler {
  private schedules: Map<string, ScheduleConfig> = new Map();
  private intervalIds: Map<string, NodeJS.Timeout> = new Map();
  private token: string;
  private isRunning: boolean = false;
  private checkIntervalMs: number = 60000; // Check every minute

  constructor(token?: string) {
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'scheduler';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Add a schedule
   */
  addSchedule(config: ScheduleConfig): ScheduleConfig {
    if (!config.id) {
      throw new Error('Schedule id is required');
    }
    if (!config.cron) {
      throw new Error('Cron expression is required');
    }
    if (!config.agentType) {
      throw new Error('Agent type is required');
    }

    this.schedules.set(config.id, {
      ...config,
      enabled: config.enabled ?? true,
      runCount: config.runCount || 0,
    });

    return config;
  }

  /**
   * Remove a schedule
   */
  removeSchedule(id: string): boolean {
    const interval = this.intervalIds.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervalIds.delete(id);
    }
    return this.schedules.delete(id);
  }

  /**
   * Get a schedule
   */
  getSchedule(id: string): ScheduleConfig | undefined {
    return this.schedules.get(id);
  }

  /**
   * List all schedules
   */
  listSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Enable/disable a schedule
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;
    schedule.enabled = enabled;
    return true;
  }

  /**
   * Convert cron expression to milliseconds interval
   * Supports simple cron: "* * * * *" (minute hour day month weekday)
   * Returns interval in milliseconds
   */
  private cronToInterval(cron: string): number {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression (need 5 parts)');
    }

    const [minute, hour, , , ] = parts;

    // For simplicity, handle common patterns
    // Every minute: * * * * *
    if (minute === '*' && hour === '*') {
      return 60 * 1000; // 1 minute
    }

    // Every N minutes: */N * * * *
    if (minute.startsWith('*/')) {
      const n = parseInt(minute.slice(2));
      return n * 60 * 1000;
    }

    // Every hour at minute N: N * * * *
    if (minute.match(/^\d+$/) && hour === '*') {
      return 60 * 60 * 1000; // 1 hour
    }

    // Daily at HH:MM
    if (minute.match(/^\d+$/) && hour.match(/^\d+$/)) {
      return 24 * 60 * 60 * 1000; // Daily
    }

    // Default to hourly
    return 60 * 60 * 1000;
  }

  /**
   * Execute a scheduled task
   */
  async executeSchedule(schedule: ScheduleConfig): Promise<any> {
    if (!schedule.enabled) return null;

    try {
      console.log(`[Scheduler] Running ${schedule.id} (${schedule.agentType})...`);

      const report = await researchDepartment.runResearch(
        schedule.agentType,
        schedule.input
      );

      schedule.lastRun = new Date().toISOString();
      schedule.runCount = (schedule.runCount || 0) + 1;

      console.log(`[Scheduler] ${schedule.id} completed: ${report.reportId}`);

      return report;
    } catch (error) {
      console.error(`[Scheduler] ${schedule.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Start all schedules
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }
    this.isRunning = true;

    console.log(`[Scheduler] Starting ${this.schedules.size} schedules`);

    for (const [id, schedule] of this.schedules) {
      const interval = this.cronToInterval(schedule.cron);
      const intervalId = setInterval(() => {
        this.executeSchedule(schedule).catch(err =>
          console.error(`Scheduled error for ${id}:`, err)
        );
      }, interval);
      this.intervalIds.set(id, intervalId);
    }

    console.log('[Scheduler] Running');
  }

  /**
   * Stop all schedules
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('[Scheduler] Stopping');
    for (const [id, intervalId] of this.intervalIds) {
      clearInterval(intervalId);
    }
    this.intervalIds.clear();
    this.isRunning = false;
    console.log('[Scheduler] Stopped');
  }

  /**
   * Run a schedule immediately
   */
  async runNow(id: string): Promise<any> {
    const schedule = this.schedules.get(id);
    if (!schedule) throw new Error(`Schedule ${id} not found`);
    return this.executeSchedule(schedule);
  }

  /**
   * Get scheduler stats
   */
  getStats() {
    const all = Array.from(this.schedules.values());
    return {
      totalSchedules: all.length,
      enabled: all.filter(s => s.enabled).length,
      disabled: all.filter(s => !s.enabled).length,
      totalRuns: all.reduce((sum, s) => sum + (s.runCount || 0), 0),
      isRunning: this.isRunning,
    };
  }

  /**
   * Create default schedules for all agents
   */
  createDefaultSchedules(): ScheduleConfig[] {
    const defaults: ScheduleConfig[] = [
      {
        id: 'market-daily',
        agentType: 'market',
        cron: '0 8 * * *', // Daily at 8 AM
        input: { industry: 'technology', includeNews: true, includeTrends: true, includeSocial: true },
        enabled: true,
      },
      {
        id: 'competitor-hourly',
        agentType: 'competitor',
        cron: '0 * * * *', // Every hour
        input: { competitor: 'OpenAI', includeNews: true, includeSocial: true },
        enabled: true,
      },
      {
        id: 'procurement-daily',
        agentType: 'procurement',
        cron: '0 9 * * *', // Daily at 9 AM
        input: { category: 'restaurant supplies', minRating: 4 },
        enabled: true,
      },
    ];

    for (const config of defaults) {
      this.addSchedule(config);
    }

    return defaults;
  }
}

// Singleton instance
export const scheduler = new Scheduler();

// Auto-create default schedules
scheduler.createDefaultSchedules();

export default scheduler;