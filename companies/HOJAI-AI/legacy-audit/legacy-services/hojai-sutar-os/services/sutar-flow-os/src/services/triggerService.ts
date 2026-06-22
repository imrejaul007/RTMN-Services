/**
 * SUTAR Flow OS - Trigger Service
 * Handles trigger CRUD and execution
 */

import { v4 as uuid } from 'uuid';
import { FlowTriggerModel, FlowDefinitionModel } from '../models/index.js';
import { IFlowTrigger, IFlowDefinition } from '../models/index.js';
import { TriggerType, CreateTriggerInput, UpdateTriggerInput } from '../types/index.js';
import { createLogger } from '../utils/logger.js';
import { executionService } from './executionService.js';

const logger = createLogger('trigger-service');

// ============================================================================
// CRON SCHEDULER
// ============================================================================

interface ScheduledTask {
  id: string;
  triggerId: string;
  flowId: string;
  tenantId: string;
  interval: NodeJS.Timeout;
}

const scheduledTasks: Map<string, ScheduledTask> = new Map();

// ============================================================================
// TRIGGER SERVICE
// ============================================================================

export const triggerService = {
  /**
   * List triggers for a tenant
   */
  async list(
    tenantId: string,
    options: { flowId?: string; type?: TriggerType; isActive?: boolean } = {}
  ): Promise<IFlowTrigger[]> {
    const query: Record<string, unknown> = { tenantId };
    if (options.flowId) query.flowId = options.flowId;
    if (options.type) query.type = options.type;
    if (options.isActive !== undefined) query.isActive = options.isActive;

    const triggers = await FlowTriggerModel.find(query).sort({ createdAt: -1 }).lean();
    return triggers as unknown as IFlowTrigger[];
  },

  /**
   * Get trigger by ID
   */
  async getById(tenantId: string, triggerId: string): Promise<IFlowTrigger | null> {
    const trigger = await FlowTriggerModel.findOne({ id: triggerId, tenantId }).lean();
    return trigger as unknown as IFlowTrigger | null;
  },

  /**
   * Create a new trigger
   */
  async create(tenantId: string, input: CreateTriggerInput): Promise<IFlowTrigger> {
    // Verify flow exists
    const flow = await FlowDefinitionModel.findOne({ id: input.flowId, tenantId });
    if (!flow) {
      throw new Error(`Flow not found: ${input.flowId}`);
    }

    const trigger = new FlowTriggerModel({
      id: uuid(),
      tenantId,
      flowId: input.flowId,
      type: input.type,
      name: input.name,
      config: input.config,
      isActive: input.isActive
    });

    await trigger.save();
    logger.info('trigger_created', { triggerId: trigger.id, flowId: input.flowId, tenantId });

    // Start scheduler if needed
    if (trigger.isActive && (trigger.type === TriggerType.SCHEDULED || trigger.type === TriggerType.CRON)) {
      this.startScheduler(trigger);
    }

    return trigger.toObject();
  },

  /**
   * Update a trigger
   */
  async update(
    tenantId: string,
    triggerId: string,
    input: UpdateTriggerInput
  ): Promise<IFlowTrigger | null> {
    const trigger = await FlowTriggerModel.findOne({ id: triggerId, tenantId });
    if (!trigger) return null;

    if (input.name !== undefined) trigger.name = input.name;
    if (input.config !== undefined) trigger.config = input.config;
    if (input.isActive !== undefined) {
      trigger.isActive = input.isActive;

      // Handle scheduler
      if (trigger.isActive && (trigger.type === TriggerType.SCHEDULED || trigger.type === TriggerType.CRON)) {
        this.startScheduler(trigger);
      } else {
        this.stopScheduler(triggerId);
      }
    }

    await trigger.save();
    logger.info('trigger_updated', { triggerId, tenantId });

    return trigger.toObject();
  },

  /**
   * Delete a trigger
   */
  async delete(tenantId: string, triggerId: string): Promise<boolean> {
    const trigger = await FlowTriggerModel.findOne({ id: triggerId, tenantId });
    if (!trigger) return false;

    // Stop scheduler if running
    this.stopScheduler(triggerId);

    await FlowTriggerModel.deleteOne({ id: triggerId, tenantId });
    logger.info('trigger_deleted', { triggerId, tenantId });
    return true;
  },

  /**
   * Test a trigger - execute the associated flow
   */
  async testTrigger(tenantId: string, triggerId: string): Promise<{
    success: boolean;
    runId?: string;
    error?: string;
  }> {
    const trigger = await FlowTriggerModel.findOne({ id: triggerId, tenantId });
    if (!trigger) {
      return { success: false, error: 'Trigger not found' };
    }

    try {
      const run = await executionService.startRun(
        tenantId,
        trigger.flowId,
        {},
        'trigger_test',
        triggerId
      );

      trigger.lastTriggeredAt = new Date();
      await trigger.save();

      return { success: true, runId: run.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Fire a trigger by event type
   */
  async fireByEvent(
    tenantId: string,
    eventType: string,
    eventData: Record<string, unknown>
  ): Promise<{ triggered: number; runIds: string[] }> {
    const triggers = await FlowTriggerModel.find({
      tenantId,
      isActive: true,
      type: TriggerType.EVENT,
      'config.eventType': eventType
    }).lean();

    const runIds: string[] = [];
    for (const trigger of triggers as unknown as IFlowTrigger[]) {
      // Check conditions
      const conditions = (trigger.config.conditions || []) as Array<{
        field: string;
        operator: string;
        value: unknown;
      }>;
      const conditionsMet = conditions.every(condition => {
        const value = this.getNestedValue(eventData, condition.field);
        switch (condition.operator) {
          case 'eq': return value === condition.value;
          case 'neq': return value !== condition.value;
          case 'gt': return (value as number) > (condition.value as number);
          case 'gte': return (value as number) >= (condition.value as number);
          case 'lt': return (value as number) < (condition.value as number);
          case 'lte': return (value as number) <= (condition.value as number);
          case 'contains': return String(value).includes(String(condition.value));
          default: return true;
        }
      });

      if (conditionsMet) {
        try {
          const run = await executionService.startRun(
            tenantId,
            trigger.flowId,
            eventData,
            'event',
            trigger.id
          );
          runIds.push(run.id);

          trigger.lastTriggeredAt = new Date();
          await trigger.save();
        } catch (error) {
          logger.error('trigger_execution_error', {
            triggerId: trigger.id,
            error: (error as Error).message
          });
        }
      }
    }

    return { triggered: runIds.length, runIds };
  },

  /**
   * Start scheduler for a trigger
   */
  startScheduler(trigger: IFlowTrigger): void {
    if (scheduledTasks.has(trigger.id)) {
      this.stopScheduler(trigger.id);
    }

    const config = trigger.config as { schedule?: string; cron?: string };
    let intervalMs: number;

    if (config.cron) {
      // Simple cron parsing (basic support)
      // Format: minute hour day month dayOfWeek
      const parts = config.cron.split(' ');
      if (parts.length >= 2) {
        // Default to 1 minute for simplicity
        intervalMs = 60000;
      } else {
        intervalMs = 60000;
      }
    } else if (config.schedule) {
      // Parse simple schedule like "every 5 minutes"
      const match = config.schedule.match(/every\s+(\d+)\s+(second|minute|hour)s?/i);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        switch (unit) {
          case 'second': intervalMs = value * 1000; break;
          case 'minute': intervalMs = value * 60000; break;
          case 'hour': intervalMs = value * 3600000; break;
          default: intervalMs = 60000;
        }
      } else {
        intervalMs = 60000;
      }
    } else {
      intervalMs = 60000;
    }

    const interval = setInterval(async () => {
      try {
        await executionService.startRun(
          trigger.tenantId,
          trigger.flowId,
          {},
          'scheduled',
          trigger.id
        );

        await FlowTriggerModel.updateOne(
          { id: trigger.id },
          { lastTriggeredAt: new Date() }
        );
      } catch (error) {
        logger.error('scheduled_trigger_error', {
          triggerId: trigger.id,
          error: (error as Error).message
        });
      }
    }, intervalMs);

    scheduledTasks.set(trigger.id, {
      id: trigger.id,
      triggerId: trigger.id,
      flowId: trigger.flowId,
      tenantId: trigger.tenantId,
      interval
    });

    logger.info('trigger_scheduler_started', { triggerId: trigger.id, intervalMs });
  },

  /**
   * Stop scheduler for a trigger
   */
  stopScheduler(triggerId: string): void {
    const task = scheduledTasks.get(triggerId);
    if (task) {
      clearInterval(task.interval);
      scheduledTasks.delete(triggerId);
      logger.info('trigger_scheduler_stopped', { triggerId });
    }
  },

  /**
   * Stop all schedulers
   */
  stopAllSchedulers(): void {
    for (const [triggerId] of scheduledTasks) {
      this.stopScheduler(triggerId);
    }
  },

  /**
   * Get nested value from object
   */
  getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }
};

export default triggerService;
