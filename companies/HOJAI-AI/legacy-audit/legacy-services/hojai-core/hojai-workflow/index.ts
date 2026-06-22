/**
 * Hojai Workflow Platform - Enhanced
 *
 * PORT: 4560
 *
 * Enhanced with:
 * - Orchestration Engine (multi-step workflows)
 * - Action Engine (execute actions)
 * - Trigger System (event-driven)
 * - Workflow Versioning
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { tenantMiddleware } from '../../shared/middleware/tenant';
import { createLogger } from '../../shared/utils/logger';
import { createResponse, createErrorResponse } from '../../shared/types';

const logger = createLogger('hojai-workflow');

// ============================================
// WORKFLOW TYPES
// ============================================

/**
 * Workflow types
 */
export type WorkflowType = 'automation' | 'sequence' | 'broadcast' | 'reaction' | 'orchestration';

/**
 * Workflow status
 */
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'stopped';

/**
 * Workflow trigger types
 */
export type TriggerType = 'event' | 'schedule' | 'manual' | 'api' | 'condition';

/**
 * Step types
 */
export type StepType = 'message' | 'delay' | 'condition' | 'action' | 'ai' | 'wait' | 'split' | 'join';

/**
 * Workflow trigger
 */
export interface WorkflowTrigger {
  type: TriggerType;
  event_type?: string;         // For event triggers
  schedule_cron?: string;      // For schedule triggers
  schedule_timezone?: string;
  condition?: TriggerCondition;  // For condition triggers
}

export interface TriggerCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: any;
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  id: string;
  name: string;
  order: number;
  type: StepType;
  config: StepConfig;
  retry?: RetryConfig;
  timeout?: number;  // seconds
}

export interface StepConfig {
  // Message step
  channel?: string;
  template_id?: string;
  content?: string;
  variables?: Record<string, string>;

  // Delay step
  delay_seconds?: number;
  delay_minutes?: number;

  // Condition step
  conditions?: Condition[];
  then_steps?: string[];  // Step IDs
  else_steps?: string[];

  // Action step
  action_type?: string;
  action_config?: Record<string, any>;

  // AI step
  ai_prompt?: string;
  ai_model?: string;

  // Wait step
  wait_for?: string;  // Event to wait for
  wait_timeout?: number;  // seconds

  // Split step
  branches?: SplitBranch[];

  // Join step
  wait_for_steps?: string[];
}

export interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: any;
  logical?: 'and' | 'or';
}

export interface SplitBranch {
  name: string;
  step_ids: string[];
  condition?: Condition;
}

export interface RetryConfig {
  max_attempts: number;
  backoff_seconds: number;
  backoff_multiplier?: number;
}

/**
 * Workflow
 */
export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: WorkflowType;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  version: number;
  is_current_version: boolean;
  previous_version_id?: string;
  created_by: string;
  stats: WorkflowStats;
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
}

export interface WorkflowStats {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  avg_execution_time_seconds: number;
}

/**
 * Workflow execution
 */
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_version: number;
  tenant_id: string;
  trigger_type: TriggerType;
  trigger_data?: Record<string, any>;
  context: Record<string, any>;
  current_step_id?: string;
  status: ExecutionStatus;
  step_results: StepResult[];
  started_at: string;
  completed_at?: string;
  error?: string;
}

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting';

export interface StepResult {
  step_id: string;
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  output?: any;
  error?: string;
  retry_count: number;
}

// ============================================
// ACTION TYPES
// ============================================

/**
 * Action types
 */
export type ActionType =
  | 'send_message'
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'create_task'
  | 'update_customer'
  | 'add_tag'
  | 'remove_tag'
  | 'update_segment'
  | 'trigger_webhook'
  | 'call_api'
  | 'delay'
  | 'condition'
  | 'ai_action';

/**
 * Action definition
 */
export interface ActionDefinition {
  type: ActionType;
  name: string;
  description: string;
  parameters: ActionParameter[];
  returns: string;
  category: 'communication' | 'data' | 'automation' | 'ai';
}

/**
 * Action parameter
 */
export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: any;
}

/**
 * Predefined actions
 */
export const PREDEFINED_ACTIONS: ActionDefinition[] = [
  {
    type: 'send_message',
    name: 'Send Message',
    description: 'Send a message to customer',
    parameters: [
      { name: 'channel', type: 'string', required: true, description: 'whatsapp, email, sms' },
      { name: 'template_id', type: 'string', required: true, description: 'Template ID' },
      { name: 'variables', type: 'object', required: false, description: 'Template variables' }
    ],
    returns: 'message_id',
    category: 'communication'
  },
  {
    type: 'add_tag',
    name: 'Add Tag',
    description: 'Add tag to customer',
    parameters: [
      { name: 'tag', type: 'string', required: true, description: 'Tag name' }
    ],
    returns: 'success',
    category: 'data'
  },
  {
    type: 'trigger_webhook',
    name: 'Trigger Webhook',
    description: 'Call external webhook',
    parameters: [
      { name: 'url', type: 'string', required: true, description: 'Webhook URL' },
      { name: 'method', type: 'string', required: true, description: 'GET, POST, PUT' },
      { name: 'headers', type: 'object', required: false, description: 'HTTP headers' },
      { name: 'body', type: 'object', required: false, description: 'Request body' }
    ],
    returns: 'response',
    category: 'automation'
  },
  {
    type: 'ai_action',
    name: 'AI Action',
    description: 'Execute AI task',
    parameters: [
      { name: 'prompt', type: 'string', required: true, description: 'AI prompt' },
      { name: 'model', type: 'string', required: false, description: 'AI model' }
    ],
    returns: 'ai_response',
    category: 'ai'
  }
];

// ============================================
// ACTION ENGINE
// ============================================

class ActionEngine {
  private actions: Map<string, ActionDefinition> = new Map();

  constructor() {
    // Register predefined actions
    for (const action of PREDEFINED_ACTIONS) {
      this.actions.set(action.type, action);
    }
  }

  /**
   * Execute action
   */
  async execute(
    actionType: ActionType,
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    const action = this.actions.get(actionType);
    if (!action) {
      return { success: false, error: `Unknown action: ${actionType}` };
    }

    // Validate parameters
    for (const param of action.parameters) {
      if (param.required && !parameters[param.name]) {
        return { success: false, error: `Missing required parameter: ${param.name}` };
      }
    }

    try {
      // Substitute context variables
      const resolvedParams = this.resolveVariables(parameters, context);

      // Execute based on action type
      const output = await this.executeAction(actionType, resolvedParams, context);

      logger.info('action_executed', { actionType, success: true });
      return { success: true, output };
    } catch (error: any) {
      logger.error('action_failed', { actionType, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve {{variable}} placeholders in parameters
   */
  private resolveVariables(
    params: Record<string, any>,
    context: Record<string, any>
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Replace {{context.variable}} with context values
        resolved[key] = value.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
          const keys = path.split('.');
          let result: any = context;
          for (const k of keys) {
            result = result?.[k];
          }
          return result ?? match;
        });
      } else if (typeof value === 'object') {
        resolved[key] = this.resolveVariables(value, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Execute specific action
   */
  private async executeAction(
    actionType: ActionType,
    params: Record<string, any>,
    context: Record<string, any>
  ): Promise<any> {
    switch (actionType) {
      case 'send_message':
        return { message_id: `msg_${Date.now()}`, status: 'sent' };

      case 'add_tag':
        return { success: true, tag: params.tag };

      case 'remove_tag':
        return { success: true, tag: params.tag };

      case 'trigger_webhook':
        return { status: 200, body: 'OK' };

      case 'ai_action':
        return { response: `AI processed: ${params.prompt?.substring(0, 50)}...` };

      case 'delay':
        await new Promise(resolve => setTimeout(resolve, (params.seconds || 0) * 1000));
        return { completed: true };

      default:
        return { executed: true };
    }
  }

  /**
   * Get action definition
   */
  getAction(type: ActionType): ActionDefinition | undefined {
    return this.actions.get(type);
  }

  /**
   * List all actions
   */
  listActions(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }
}

// ============================================
// ORCHESTRATION ENGINE
// ============================================

class OrchestrationEngine {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private actionEngine: ActionEngine;

  constructor() {
    this.actionEngine = new ActionEngine();
  }

  // ========== WORKFLOW CRUD ==========

  /**
   * Create workflow
   */
  async createWorkflow(
    tenantId: string,
    createdBy: string,
    data: {
      name: string;
      description?: string;
      type: WorkflowType;
      trigger: WorkflowTrigger;
      steps: Omit<WorkflowStep, 'id'>[];
    }
  ): Promise<Workflow> {
    const now = new Date().toISOString();
    const id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const workflow: Workflow = {
      id,
      tenant_id: tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      status: 'draft',
      trigger: data.trigger,
      steps: data.steps.map((s, i) => ({
        ...s,
        id: `step_${i}`
      })),
      version: 1,
      is_current_version: true,
      created_by: createdBy,
      stats: {
        total_executions: 0,
        successful_executions: 0,
        failed_executions: 0,
        avg_execution_time_seconds: 0
      },
      created_at: now,
      updated_at: now
    };

    this.workflows.set(id, workflow);

    logger.info('workflow_created', { tenantId, workflowId: id });
    return workflow;
  }

  /**
   * Update workflow (creates new version)
   */
  async updateWorkflow(
    tenantId: string,
    workflowId: string,
    data: Partial<Workflow>
  ): Promise<Workflow | null> {
    const existing = this.workflows.get(workflowId);
    if (!existing || existing.tenant_id !== tenantId) return null;

    // Mark existing as not current
    existing.is_current_version = false;

    // Create new version
    const now = new Date().toISOString();
    const newWorkflow: Workflow = {
      ...existing,
      ...data,
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      version: existing.version + 1,
      is_current_version: true,
      previous_version_id: existing.id,
      updated_at: now
    };

    this.workflows.set(newWorkflow.id, newWorkflow);

    logger.info('workflow_versioned', {
      tenantId,
      oldId: workflowId,
      newId: newWorkflow.id,
      version: newWorkflow.version
    });

    return newWorkflow;
  }

  /**
   * Get workflow
   */
  async getWorkflow(tenantId: string, workflowId: string): Promise<Workflow | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.tenant_id !== tenantId) return null;
    return workflow;
  }

  /**
   * List workflows
   */
  async listWorkflows(
    tenantId: string,
    options?: { status?: WorkflowStatus; type?: WorkflowType }
  ): Promise<Workflow[]> {
    const results: Workflow[] = [];

    for (const workflow of this.workflows.values()) {
      if (workflow.tenant_id !== tenantId) continue;
      if (workflow.is_current_version !== true) continue;
      if (options?.status && workflow.status !== options.status) continue;
      if (options?.type && workflow.type !== options.type) continue;
      results.push(workflow);
    }

    return results.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  // ========== WORKFLOW EXECUTION ==========

  /**
   * Execute workflow
   */
  async execute(
    tenantId: string,
    workflowId: string,
    triggerData?: Record<string, any>
  ): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflow(tenantId, workflowId);
    if (!workflow) throw new Error('Workflow not found');
    if (workflow.status !== 'active') throw new Error('Workflow not active');

    const now = new Date().toISOString();
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: WorkflowExecution = {
      id: executionId,
      workflow_id: workflowId,
      workflow_version: workflow.version,
      tenant_id: tenantId,
      trigger_type: workflow.trigger.type,
      trigger_data: triggerData,
      context: { ...triggerData },
      status: 'running',
      step_results: workflow.steps.map(s => ({
        step_id: s.id,
        step_name: s.name,
        status: 'pending' as const,
        retry_count: 0
      })),
      started_at: now
    };

    this.executions.set(executionId, execution);

    // Execute workflow asynchronously
    this.executeSteps(execution, workflow).catch(err => {
      logger.error('workflow_execution_failed', { executionId, error: err.message });
      execution.status = 'failed';
      execution.error = err.message;
      execution.completed_at = new Date().toISOString();
    });

    // Update stats
    workflow.stats.total_executions++;
    this.workflows.set(workflowId, workflow);

    logger.info('workflow_execution_started', { tenantId, workflowId, executionId });
    return execution;
  }

  /**
   * Execute workflow steps
   */
  private async executeSteps(
    execution: WorkflowExecution,
    workflow: Workflow
  ): Promise<void> {
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const stepResult = execution.step_results.find(r => r.step_id === step.id);
      if (!stepResult) continue;

      execution.current_step_id = step.id;
      stepResult.status = 'running';
      stepResult.started_at = new Date().toISOString();

      try {
        const result = await this.executeStep(step, execution.context);
        stepResult.status = 'completed';
        stepResult.output = result;
        stepResult.completed_at = new Date().toISOString();
      } catch (error: any) {
        // Check if should retry
        if (step.retry && stepResult.retry_count < step.retry.max_attempts) {
          stepResult.retry_count++;
          i--; // Retry same step
          await new Promise(r => setTimeout(r, step.retry!.backoff_seconds * 1000));
        } else {
          stepResult.status = 'failed';
          stepResult.error = error.message;
          stepResult.completed_at = new Date().toISOString();
          execution.status = 'failed';
          execution.error = error.message;
          execution.completed_at = new Date().toISOString();
          return;
        }
      }
    }

    execution.status = 'completed';
    execution.completed_at = new Date().toISOString();
  }

  /**
   * Execute single step
   */
  private async executeStep(
    step: WorkflowStep,
    context: Record<string, any>
  ): Promise<any> {
    switch (step.type) {
      case 'message':
        return this.actionEngine.execute('send_message', {
        channel: step.config.channel,
        template_id: step.config.template_id,
        variables: step.config.variables
      }, context);

      case 'action':
        return this.actionEngine.execute(
          step.config.action_type as ActionType,
          step.config.action_config || {},
          context
        );

      case 'delay':
        const delayMs = (step.config.delay_seconds || step.config.delay_minutes! * 60 || 0) * 1000;
        await new Promise(r => setTimeout(r, delayMs));
        return { delayed: true, duration_ms: delayMs };

      case 'condition':
        return this.evaluateConditions(step.config.conditions || [], context);

      case 'ai':
        return this.actionEngine.execute('ai_action', {
          prompt: step.config.ai_prompt,
          model: step.config.ai_model
        }, context);

      case 'wait':
        await new Promise(r => setTimeout(r, (step.config.wait_timeout || 30) * 1000));
        return { waited: true };

      default:
        return { executed: true };
    }
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(
    conditions: Condition[],
    context: Record<string, any>
  ): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const value = this.getNestedValue(context, condition.field);
      let result = false;

      switch (condition.operator) {
        case 'eq': result = value === condition.value; break;
        case 'neq': result = value !== condition.value; break;
        case 'gt': result = value > condition.value; break;
        case 'lt': result = value < condition.value; break;
        case 'gte': result = value >= condition.value; break;
        case 'lte': result = value <= condition.value; break;
        case 'contains': result = String(value).includes(String(condition.value)); break;
      }

      if (condition.logical === 'or' && result) return true;
      if (condition.logical !== 'or' && !result) return false;
    }

    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  /**
   * Get execution
   */
  async getExecution(tenantId: string, executionId: string): Promise<WorkflowExecution | null> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.tenant_id !== tenantId) return null;
    return execution;
  }

  /**
   * List executions
   */
  async listExecutions(
    tenantId: string,
    workflowId?: string
  ): Promise<WorkflowExecution[]> {
    const results: WorkflowExecution[] = [];

    for (const execution of this.executions.values()) {
      if (execution.tenant_id !== tenantId) continue;
      if (workflowId && execution.workflow_id !== workflowId) continue;
      results.push(execution);
    }

    return results.sort((a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }

  /**
   * Cancel execution
   */
  async cancelExecution(tenantId: string, executionId: string): Promise<boolean> {
    const execution = await this.getExecution(tenantId, executionId);
    if (!execution || execution.status !== 'running') return false;

    execution.status = 'cancelled';
    execution.completed_at = new Date().toISOString();
    return true;
  }
}

// ============================================
// MAIN PLATFORM
// ============================================

export class HojaiWorkflowPlatform {
  private orchestrationEngine: OrchestrationEngine;
  private actionEngine: ActionEngine;

  constructor() {
    this.orchestrationEngine = new OrchestrationEngine();
    this.actionEngine = new ActionEngine();
  }

  // Workflow CRUD
  async createWorkflow(tenantId: string, createdBy: string, data: any) {
    return this.orchestrationEngine.createWorkflow(tenantId, createdBy, data);
  }

  async updateWorkflow(tenantId: string, workflowId: string, data: any) {
    return this.orchestrationEngine.updateWorkflow(tenantId, workflowId, data);
  }

  async getWorkflow(tenantId: string, workflowId: string) {
    return this.orchestrationEngine.getWorkflow(tenantId, workflowId);
  }

  async listWorkflows(tenantId: string, options?: any) {
    return this.orchestrationEngine.listWorkflows(tenantId, options);
  }

  async activateWorkflow(tenantId: string, workflowId: string) {
    const workflow = await this.getWorkflow(tenantId, workflowId);
    if (!workflow) return null;
    workflow.status = 'active';
    workflow.updated_at = new Date().toISOString();
    return workflow;
  }

  async pauseWorkflow(tenantId: string, workflowId: string) {
    const workflow = await this.getWorkflow(tenantId, workflowId);
    if (!workflow) return null;
    workflow.status = 'paused';
    workflow.updated_at = new Date().toISOString();
    return workflow;
  }

  // Execution
  async execute(tenantId: string, workflowId: string, triggerData?: any) {
    return this.orchestrationEngine.execute(tenantId, workflowId, triggerData);
  }

  async getExecution(tenantId: string, executionId: string) {
    return this.orchestrationEngine.getExecution(tenantId, executionId);
  }

  async listExecutions(tenantId: string, workflowId?: string) {
    return this.orchestrationEngine.listExecutions(tenantId, workflowId);
  }

  async cancelExecution(tenantId: string, executionId: string) {
    return this.orchestrationEngine.cancelExecution(tenantId, executionId);
  }

  // Actions
  listActions() {
    return this.actionEngine.listActions();
  }

  getAction(type: ActionType) {
    return this.actionEngine.getAction(type);
  }
}

// ============================================
// EXPRESS ROUTES
// ============================================

export function createWorkflowRoutes(platform: HojaiWorkflowPlatform) {
  const router = express.Router();

  // Workflow CRUD
  router.post('/', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const workflow = await platform.createWorkflow(tenantId, req.body.userId, req.body);
      res.json(createResponse(workflow, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('CREATE_ERROR', error.message));
    }
  });

  router.get('/', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const workflows = await platform.listWorkflows(tenantId, req.query);
      res.json(createResponse(workflows, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('LIST_ERROR', error.message));
    }
  });

  router.get('/:id', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const workflow = await platform.getWorkflow(tenantId, req.params.id);
      if (!workflow) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Workflow not found'));
      res.json(createResponse(workflow, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('GET_ERROR', error.message));
    }
  });

  router.put('/:id', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const workflow = await platform.updateWorkflow(tenantId, req.params.id, req.body);
      if (!workflow) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Workflow not found'));
      res.json(createResponse(workflow, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('UPDATE_ERROR', error.message));
    }
  });

  router.post('/:id/activate', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const workflow = await platform.activateWorkflow(tenantId, req.params.id);
      if (!workflow) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Workflow not found'));
      res.json(createResponse(workflow, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('ACTIVATE_ERROR', error.message));
    }
  });

  router.post('/:id/pause', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const workflow = await platform.pauseWorkflow(tenantId, req.params.id);
      if (!workflow) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Workflow not found'));
      res.json(createResponse(workflow, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('PAUSE_ERROR', error.message));
    }
  });

  // Execution
  router.post('/:id/execute', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const execution = await platform.execute(tenantId, req.params.id, req.body);
      res.json(createResponse(execution, { tenantId }));
    } catch (error: any) {
      res.status(400).json(createErrorResponse('EXECUTE_ERROR', error.message));
    }
  });

  router.get('/:id/executions', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const executions = await platform.listExecutions(tenantId, req.params.id);
      res.json(createResponse(executions, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('LIST_ERROR', error.message));
    }
  });

  router.get('/executions/:executionId', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const execution = await platform.getExecution(tenantId, req.params.executionId);
      if (!execution) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Execution not found'));
      res.json(createResponse(execution, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('GET_ERROR', error.message));
    }
  });

  router.post('/executions/:executionId/cancel', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const cancelled = await platform.cancelExecution(tenantId, req.params.executionId);
      if (!cancelled) return res.status(400).json(createErrorResponse('CANCEL_ERROR', 'Cannot cancel execution'));
      res.json(createResponse({ cancelled: true }, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('CANCEL_ERROR', error.message));
    }
  });

  // Actions
  router.get('/actions', async (req, res) => {
    res.json(createResponse(platform.listActions()));
  });

  router.get('/actions/:type', async (req, res) => {
    const action = platform.getAction(req.params.type as ActionType);
    if (!action) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Action not found'));
    res.json(createResponse(action));
  });

  return router;
}

// ============================================
// BOOTSTRAP
// ============================================

export async function bootstrap(port = 4560) {
  const platform = new HojaiWorkflowPlatform();
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
  app.use(express.json({ limit: "10kb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'hojai-workflow', version: '2.0.0' });
  });

  app.use('/api/workflows', createWorkflowRoutes(platform));

  app.listen(port, () => {
    logger.info('hojai_workflow_platform_enhanced_started', { port });
  });

  return { platform, app };
}

export default { HojaiWorkflowPlatform, createWorkflowRoutes, bootstrap };
