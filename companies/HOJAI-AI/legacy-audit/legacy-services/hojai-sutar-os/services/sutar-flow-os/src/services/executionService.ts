/**
 * SUTAR Flow OS - Execution Service
 * Handles flow execution, step processing, and state management
 */

import { v4 as uuid } from 'uuid';
import { FlowRunModel, FlowStepModel, FlowDefinitionModel } from '../models/index.js';
import { IFlowDefinition, IFlowRun, IFlowStep } from '../models/index.js';
import { RunStatus, StepStatus, FlowStepType } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('execution-service');

// ============================================================================
// EXECUTION ENGINE
// ============================================================================

interface ExecutionContext {
  [key: string]: unknown;
}

interface StepResult {
  success: boolean;
  output?: unknown;
  error?: string;
  nextSteps: string[];
}

export const executionService = {
  /**
   * Start a new flow run
   */
  async startRun(
    tenantId: string,
    flowId: string,
    context: ExecutionContext = {},
    triggeredBy: string = 'manual',
    triggeredById?: string
  ): Promise<IFlowRun> {
    const flow = await FlowDefinitionModel.findOne({ id: flowId, tenantId });
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    // Initialize context with flow variables
    const initialContext = { ...context };
    for (const variable of flow.variables) {
      if (initialContext[variable.name] === undefined && variable.defaultValue !== undefined) {
        initialContext[variable.name] = variable.defaultValue;
      }
    }

    const run = new FlowRunModel({
      id: uuid(),
      tenantId,
      flowId,
      status: RunStatus.PENDING,
      context: initialContext,
      triggeredBy,
      triggeredById,
      startedAt: new Date()
    });

    await run.save();
    logger.info('flow_run_started', { runId: run.id, flowId, tenantId, triggeredBy });

    // Start execution asynchronously
    this.executeFlow(run.id, tenantId, flow).catch(error => {
      logger.error('flow_execution_error', { runId: run.id, error: error.message });
    });

    return run.toObject();
  },

  /**
   * Execute a flow asynchronously
   */
  async executeFlow(runId: string, tenantId: string, flow: IFlowDefinition): Promise<void> {
    let run = await FlowRunModel.findOne({ id: runId, tenantId });
    if (!run) return;

    try {
      run.status = RunStatus.RUNNING;
      await run.save();

      const stepMap = new Map(flow.steps.map(s => [s.id, s]));
      const executionContext = { ...run.context };
      let currentStepId: string | undefined = flow.steps[0]?.id;

      while (currentStepId) {
        const step = stepMap.get(currentStepId);
        if (!step) break;

        run.currentStepId = currentStepId;
        await run.save();

        const result = await this.executeStep(tenantId, runId, flow.id, step, executionContext);

        if (!result.success) {
          run.status = RunStatus.FAILED;
          run.error = result.error;
          run.completedAt = new Date();
          await run.save();
          logger.error('flow_run_failed', { runId, stepId: currentStepId, error: result.error });
          return;
        }

        // Update context with step output
        if (result.output !== undefined) {
          executionContext[`step_${currentStepId}_output`] = result.output;
        }

        // Determine next step
        if (result.nextSteps.length > 0) {
          currentStepId = result.nextSteps[0];
        } else if (step.nextSteps.length > 0) {
          currentStepId = step.nextSteps[0];
        } else {
          currentStepId = undefined;
        }
      }

      run.status = RunStatus.COMPLETED;
      run.completedAt = new Date();
      run.context = executionContext;
      await run.save();
      logger.info('flow_run_completed', { runId, flowId: flow.id });
    } catch (error) {
      run.status = RunStatus.FAILED;
      run.error = (error as Error).message;
      run.completedAt = new Date();
      await run.save();
      logger.error('flow_execution_error', { runId, error: (error as Error).message });
    }
  },

  /**
   * Execute a single step
   */
  async executeStep(
    tenantId: string,
    runId: string,
    flowId: string,
    step: IFlowDefinition['steps'][0],
    context: ExecutionContext
  ): Promise<StepResult> {
    const stepExecution = new FlowStepModel({
      id: uuid(),
      tenantId,
      runId,
      flowId,
      stepId: step.id,
      stepName: step.name,
      status: StepStatus.RUNNING,
      input: context,
      startedAt: new Date(),
      retryCount: 0
    });

    await stepExecution.save();

    try {
      let output: unknown;
      const maxRetries = step.retryPolicy?.maxRetries ?? 3;
      let retries = 0;

      while (retries <= maxRetries) {
        try {
          output = await this.processStep(step, context);
          break;
        } catch (error) {
          retries++;
          stepExecution.retryCount = retries;

          if (retries > maxRetries) {
            throw error;
          }

          // Wait before retry with backoff
          const delay = step.retryPolicy?.backoff === 'exponential'
            ? (step.retryPolicy.retryDelay || 1000) * Math.pow(2, retries - 1)
            : (step.retryPolicy?.retryDelay || 1000) * retries;

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      stepExecution.status = StepStatus.COMPLETED;
      stepExecution.output = output;
      stepExecution.completedAt = new Date();
      await stepExecution.save();

      return { success: true, output, nextSteps: step.nextSteps };
    } catch (error) {
      stepExecution.status = StepStatus.FAILED;
      stepExecution.error = (error as Error).message;
      stepExecution.completedAt = new Date();
      await stepExecution.save();

      return { success: false, error: (error as Error).message, nextSteps: [] };
    }
  },

  /**
   * Process a step based on its type
   */
  async processStep(step: IFlowDefinition['steps'][0], context: ExecutionContext): Promise<unknown> {
    switch (step.type) {
      case FlowStepType.ACTION:
        return this.processActionStep(step, context);
      case FlowStepType.CONDITION:
        return this.processConditionStep(step, context);
      case FlowStepType.WAIT:
        return this.processWaitStep(step, context);
      case FlowStepType.NOTIFY:
        return this.processNotifyStep(step, context);
      case FlowStepType.TRANSFORM:
        return this.processTransformStep(step, context);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  },

  /**
   * Process action step - HTTP requests, API calls, etc.
   */
  async processActionStep(step: IFlowDefinition['steps'][0], context: ExecutionContext): Promise<unknown> {
    const config = step.config as {
      action?: string;
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: unknown;
    };

    // For built-in actions
    if (config.action === 'log') {
      logger.info('flow_action_log', { stepName: step.name, context });
      return { logged: true, context };
    }

    // For HTTP requests
    if (config.url) {
      const response = await fetch(config.url, {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: config.body ? JSON.stringify(config.body) : undefined
      });

      const data = await response.json();
      return { status: response.status, data };
    }

    return { action: config.action || 'default', executed: true };
  },

  /**
   * Process condition step - evaluate conditions and branch
   */
  async processConditionStep(step: IFlowDefinition['steps'][0], context: ExecutionContext): Promise<unknown> {
    const config = step.config as {
      condition?: string;
      operator?: string;
      value?: unknown;
    };

    if (!config.condition) {
      return { evaluated: true, result: true };
    }

    // Simple condition evaluation
    const contextValue = this.getNestedValue(context, config.condition);
    const targetValue = config.value;

    let result = false;
    switch (config.operator) {
      case 'eq':
        result = contextValue === targetValue;
        break;
      case 'neq':
        result = contextValue !== targetValue;
        break;
      case 'gt':
        result = (contextValue as number) > (targetValue as number);
        break;
      case 'gte':
        result = (contextValue as number) >= (targetValue as number);
        break;
      case 'lt':
        result = (contextValue as number) < (targetValue as number);
        break;
      case 'lte':
        result = (contextValue as number) <= (targetValue as number);
        break;
      case 'contains':
        result = String(contextValue).includes(String(targetValue));
        break;
      case 'in':
        result = Array.isArray(targetValue) && targetValue.includes(contextValue);
        break;
      default:
        result = Boolean(contextValue);
    }

    return { evaluated: true, result, contextValue, targetValue };
  },

  /**
   * Process wait step - pause execution for a duration
   */
  async processWaitStep(step: IFlowDefinition['steps'][0], context: ExecutionContext): Promise<unknown> {
    const config = step.config as { duration?: number };
    const duration = config.duration || 1000;

    await new Promise(resolve => setTimeout(resolve, duration));
    return { waited: true, duration, context };
  },

  /**
   * Process notify step - send notifications
   */
  async processNotifyStep(step: IFlowDefinition['steps'][0], context: ExecutionContext): Promise<unknown> {
    const config = step.config as {
      template?: string;
      recipients?: string[];
      channel?: string;
    };

    logger.info('flow_notification', {
      stepName: step.name,
      channel: config.channel || 'email',
      recipients: config.recipients?.length || 0
    });

    return {
      notified: true,
      channel: config.channel || 'email',
      recipientCount: config.recipients?.length || 0
    };
  },

  /**
   * Process transform step - transform data
   */
  async processTransformStep(step: IFlowDefinition['steps'][0], context: ExecutionContext): Promise<unknown> {
    const config = step.config as { transform?: Record<string, unknown> };

    if (config.transform) {
      return { ...context, ...config.transform };
    }

    return { transformed: true, originalContext: context };
  },

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  },

  /**
   * Get run by ID
   */
  async getRun(tenantId: string, runId: string): Promise<IFlowRun | null> {
    const run = await FlowRunModel.findOne({ id: runId, tenantId }).lean();
    return run as unknown as IFlowRun | null;
  },

  /**
   * List runs for a flow
   */
  async listRuns(
    tenantId: string,
    flowId: string,
    options: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ runs: IFlowRun[]; total: number }> {
    const { page = 1, limit = 20, status } = options;
    const query: Record<string, unknown> = { tenantId, flowId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [runs, total] = await Promise.all([
      FlowRunModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      FlowRunModel.countDocuments(query)
    ]);

    return { runs: runs as unknown as IFlowRun[], total };
  },

  /**
   * List all runs across flows
   */
  async listAllRuns(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      flowId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ runs: IFlowRun[]; total: number }> {
    const { page = 1, limit = 20, flowId, status, startDate, endDate } = options;
    const query: Record<string, unknown> = { tenantId };

    if (flowId) query.flowId = flowId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, Date>).$gte = startDate;
      if (endDate) (query.createdAt as Record<string, Date>).$lte = endDate;
    }

    const skip = (page - 1) * limit;
    const [runs, total] = await Promise.all([
      FlowRunModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      FlowRunModel.countDocuments(query)
    ]);

    return { runs: runs as unknown as IFlowRun[], total };
  },

  /**
   * Cancel a run
   */
  async cancelRun(tenantId: string, runId: string): Promise<IFlowRun | null> {
    const run = await FlowRunModel.findOne({ id: runId, tenantId });
    if (!run) return null;

    if (run.status === RunStatus.RUNNING || run.status === RunStatus.PENDING) {
      run.status = RunStatus.CANCELLED;
      run.completedAt = new Date();
      await run.save();
      logger.info('flow_run_cancelled', { runId, tenantId });
    }

    return run.toObject();
  },

  /**
   * Get step executions for a run
   */
  async getStepExecutions(tenantId: string, runId: string): Promise<IFlowStep[]> {
    const steps = await FlowStepModel.find({ runId, tenantId })
      .sort({ startedAt: 1 })
      .lean();
    return steps as unknown as IFlowStep[];
  }
};

export default executionService;
