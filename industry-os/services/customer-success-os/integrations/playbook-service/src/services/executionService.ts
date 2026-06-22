/**
 * Execution Service - Playbook execution management
 */

import { ExecutionModel, IExecution } from '../models/execution';
import { TriggerModel } from '../models/trigger';
import { PlaybookModel } from '../models/playbook';
import { logger } from '../utils/logger';
import { playbookExecutionsCounter, executionDuration } from '../utils/metrics';
import axios from 'axios';

export class ExecutionService {
  /**
   * Execute a playbook
   */
  async executePlaybook(triggerId: string): Promise<IExecution> {
    const trigger = await TriggerModel.findById(triggerId);
    if (!trigger) {
      throw new Error('Trigger not found');
    }

    const playbook = await PlaybookModel.findById(trigger.playbookId);
    if (!playbook) {
      throw new Error('Playbook not found');
    }

    logger.info(`Executing playbook ${playbook._id} for customer ${trigger.customerId}`);

    // Create execution record
    const execution = await ExecutionModel.create({
      playbookId: playbook._id.toString(),
      customerId: trigger.customerId,
      triggerId: trigger._id.toString(),
      status: 'running',
      actionsExecuted: playbook.actions.map(a => ({
        actionOrder: a.order,
        actionType: a.type,
        status: 'pending' as const,
      })),
      startedAt: new Date(),
      triggeredBy: trigger.triggeredBy as any,
      context: trigger.triggerData,
    });

    // Update trigger with execution ID
    trigger.executionId = execution._id.toString();
    trigger.status = 'processing';
    await trigger.save();

    // Execute actions
    try {
      for (const action of playbook.actions.sort((a, b) => a.order - b.order)) {
        // Check if action has conditions
        if (action.conditions && action.conditions.length > 0) {
          const conditionsMet = this.evaluateActionConditions(action.conditions, trigger.triggerData);
          if (!conditionsMet) {
            const actionExec = execution.actionsExecuted.find(a => a.actionOrder === action.order);
            if (actionExec) {
              actionExec.status = 'skipped';
            }
            continue;
          }
        }

        // Handle delay
        if (action.type === 'delay' && action.config.delayMinutes) {
          await new Promise(resolve => setTimeout(resolve, action.config.delayMinutes * 60 * 1000));
          const actionExec = execution.actionsExecuted.find(a => a.actionOrder === action.order);
          if (actionExec) {
            actionExec.status = 'completed';
            actionExec.completedAt = new Date();
          }
          continue;
        }

        // Execute action
        const result = await this.executeAction(action, trigger.customerId, trigger.triggerData);

        const actionExec = execution.actionsExecuted.find(a => a.actionOrder === action.order);
        if (actionExec) {
          actionExec.status = result.success ? 'completed' : 'failed';
          actionExec.result = result;
          actionExec.startedAt = new Date();
          actionExec.completedAt = new Date();
          actionExec.duration = result.duration;
        }
      }

      // Mark execution as completed
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      trigger.status = 'executed';
      trigger.executedAt = new Date();
      await trigger.save();

      playbookExecutionsCounter.inc({ playbook_id: playbook._id.toString(), status: 'completed' });
      executionDuration.observe({ playbook_id: playbook._id.toString() }, execution.duration / 1000);

      logger.info(`Playbook execution completed: ${execution._id}`);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      trigger.status = 'failed';
      trigger.error = execution.error;
      await trigger.save();

      playbookExecutionsCounter.inc({ playbook_id: playbook._id.toString(), status: 'failed' });

      logger.error(`Playbook execution failed: ${execution._id}`, { error });
    }

    await execution.save();
    return execution;
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: any, customerId: string, context: any): Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      switch (action.type) {
        case 'email':
          // Would integrate with email service
          logger.info(`Executing email action for customer ${customerId}`);
          return {
            success: true,
            message: 'Email sent successfully',
            duration: Date.now() - startTime,
          };

        case 'notification':
          // Would integrate with notification service
          logger.info(`Executing notification action for customer ${customerId}`);
          return {
            success: true,
            message: 'Notification sent',
            duration: Date.now() - startTime,
          };

        case 'task':
          // Would create a task in task management system
          logger.info(`Creating task for customer ${customerId}`);
          return {
            success: true,
            message: 'Task created',
            data: { taskId: `task-${Date.now()}` },
            duration: Date.now() - startTime,
          };

        case 'webhook':
          if (action.config.webhookUrl) {
            const response = await axios.post(action.config.webhookUrl, {
              customerId,
              action: action.type,
              context,
              timestamp: new Date().toISOString(),
            });
            return {
              success: response.status >= 200 && response.status < 300,
              message: `Webhook response: ${response.status}`,
              data: response.data,
              duration: Date.now() - startTime,
            };
          }
          return { success: false, message: 'No webhook URL configured', duration: Date.now() - startTime };

        case 'alert':
          // Would send alert to monitoring system
          logger.info(`Alert triggered for customer ${customerId}`);
          return {
            success: true,
            message: 'Alert sent',
            duration: Date.now() - startTime,
          };

        default:
          return { success: false, message: `Unknown action type: ${action.type}`, duration: Date.now() - startTime };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Action execution failed',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate action conditions
   */
  private evaluateActionConditions(conditions: any[], context: any): boolean {
    return conditions.every(condition => {
      const value = (context as any)[condition.field];
      switch (condition.operator) {
        case 'eq':
          return value === condition.value;
        case 'gt':
          return value > condition.value;
        case 'lt':
          return value < condition.value;
        case 'gte':
          return value >= condition.value;
        case 'lte':
          return value <= condition.value;
        default:
          return true;
      }
    });
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<IExecution | null> {
    return ExecutionModel.findById(executionId).lean();
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<IExecution | null> {
    const execution = await ExecutionModel.findByIdAndUpdate(
      executionId,
      {
        status: 'cancelled',
        completedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (execution) {
      logger.info(`Execution ${executionId} cancelled`);
    }

    return execution;
  }

  /**
   * Get executions for a customer
   */
  async getCustomerExecutions(customerId: string, limit: number = 20): Promise<IExecution[]> {
    return ExecutionModel.find({ customerId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get execution analytics
   */
  async getAnalytics(days: number = 30): Promise<{
    totalExecutions: number;
    completed: number;
    failed: number;
    avgDuration: number;
    byPlaybook: Record<string, { total: number; completed: number; failed: number }>;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const executions = await ExecutionModel.find({
      startedAt: { $gte: startDate },
    }).lean();

    const byPlaybook: Record<string, { total: number; completed: number; failed: number }> = {};

    let completed = 0;
    let failed = 0;
    let totalDuration = 0;

    executions.forEach(exec => {
      byPlaybook[exec.playbookId] = byPlaybook[exec.playbookId] || { total: 0, completed: 0, failed: 0 };
      byPlaybook[exec.playbookId].total++;

      if (exec.status === 'completed') completed++;
      else if (exec.status === 'failed') failed++;

      if (exec.duration) totalDuration += exec.duration;
    });

    return {
      totalExecutions: executions.length,
      completed,
      failed,
      avgDuration: executions.length > 0 ? Math.round(totalDuration / executions.length) : 0,
      byPlaybook,
    };
  }
}

export const executionService = new ExecutionService();