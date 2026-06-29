/**
 * HOJAI Flow Runtime
 * Production-ready workflow execution engine
 */

import EventEmitter from 'eventemitter3';
import PQueue from 'p-queue';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

// Types
export interface FlowDefinition {
  id: string;
  name: string;
  version: string;
  trigger: TriggerDefinition;
  nodes: NodeDefinition[];
  connections: ConnectionDefinition[];
  config?: FlowConfig;
}

export interface TriggerDefinition {
  type: 'webhook' | 'schedule' | 'event' | 'manual';
  config: Record<string, any>;
}

export interface NodeDefinition {
  id: string;
  type: NodeType;
  name: string;
  config: Record<string, any>;
  retry?: RetryConfig;
  timeout?: number;
  onError?: 'stop' | 'continue' | 'retry';
}

export type NodeType =
  | 'trigger' | 'action' | 'ai_agent' | 'condition' | 'filter'
  | 'transform' | 'approval' | 'memory' | 'twin' | 'crm'
  | 'email' | 'sms' | 'slack' | 'whatsapp' | 'calendar' | 'document'
  | 'webhook' | 'schedule' | 'actor' | 'analytics' | 'delay' | 'end';

export interface ConnectionDefinition {
  id: string;
  source: string;
  target: string;
  condition?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  backoff: 'exponential' | 'linear';
  initialDelay: number;
  maxDelay?: number;
}

export interface FlowConfig {
  concurrency?: number;
  timeout?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface ExecutionContext {
  id: string;
  flowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: string;
  input: any;
  output?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  steps: StepExecution[];
  state: Record<string, any>;
  metadata: Record<string, any>;
}

export interface StepExecution {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: any;
  output?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  attempts: number;
  logs: StepLog[];
}

export interface StepLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

// Event schemas
export const TriggerPayloadSchema = z.object({
  type: z.enum(['webhook', 'schedule', 'event', 'manual']),
  data: z.any(),
});

export const NodeOutputSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Event emitter for flow events
export type FlowEventType =
  | 'execution.start' | 'execution.complete' | 'execution.fail' | 'execution.cancel'
  | 'step.start' | 'step.complete' | 'step.fail' | 'step.retry'
  | 'approval.required' | 'approval.received'
  | 'error' | 'warning';

export interface FlowEvent {
  executionId: string;
  type: FlowEventType;
  timestamp: Date;
  data: any;
}

// Error classes
export class FlowError extends Error {
  constructor(
    message: string,
    public code: string,
    public nodeId?: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'FlowError';
  }
}

export class NodeError extends Error {
  constructor(
    message: string,
    public nodeId: string,
    public nodeType: NodeType,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'NodeError';
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public nodeId: string,
    public timeout: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Main Flow Runtime class
export class FlowRuntime extends EventEmitter {
  private flows = new Map<string, FlowDefinition>();
  private executions = new Map<string, ExecutionContext>();
  private nodeExecutors = new Map<NodeType, NodeExecutor>();
  private queue: PQueue;
  private cache = new Map<string, { data: any; expiresAt: number }>();

  constructor(config?: { concurrency?: number }) {
    super();
    this.queue = new PQueue({ concurrency: config?.concurrency || 10 });
  }

  // Register a flow
  register(flow: FlowDefinition): void {
    this.validateFlow(flow);
    this.flows.set(flow.id, flow);
    this.emit('flow.registered', { flowId: flow.id });
  }

  // Unregister a flow
  unregister(flowId: string): void {
    this.flows.delete(flowId);
    this.emit('flow.unregistered', { flowId });
  }

  // Get a flow
  getFlow(flowId: string): FlowDefinition | undefined {
    return this.flows.get(flowId);
  }

  // List all flows
  listFlows(): FlowDefinition[] {
    return Array.from(this.flows.values());
  }

  // Execute a flow
  async execute(
    flowId: string,
    trigger: string,
    input: any,
    options?: { executionId?: string; metadata?: Record<string, any> }
  ): Promise<ExecutionContext> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new FlowError(`Flow not found: ${flowId}`, 'FLOW_NOT_FOUND');
    }

    const executionId = options?.executionId || uuid();

    const execution: ExecutionContext = {
      id: executionId,
      flowId,
      status: 'running',
      trigger,
      input,
      startedAt: new Date(),
      steps: [],
      state: { _input: input },
      metadata: options?.metadata || {},
    };

    this.executions.set(executionId, execution);
    this.emit('execution.start', { executionId, flowId, trigger });

    try {
      // Find trigger node
      const triggerNode = flow.nodes.find(n => n.type === 'trigger');
      if (!triggerNode) {
        throw new FlowError('Flow has no trigger node', 'NO_TRIGGER');
      }

      // Execute from trigger
      await this.executeNode(execution, triggerNode);

      // Execute connected nodes
      const connections = flow.connections.filter(c => c.source === triggerNode.id);
      await Promise.all(
        connections.map(conn => {
          const targetNode = flow.nodes.find(n => n.id === conn.target);
          if (targetNode) {
            return this.executeNode(execution, targetNode);
          }
          return Promise.resolve();
        })
      );

      execution.status = 'completed';
      execution.output = execution.state._output;
      execution.completedAt = new Date();
      this.emit('execution.complete', { executionId, output: execution.output });

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
      this.emit('execution.fail', { executionId, error: execution.error });
    }

    return execution;
  }

  // Execute a single node
  private async executeNode(
    execution: ExecutionContext,
    node: NodeDefinition,
    depth: number = 0
  ): Promise<any> {
    // Prevent infinite loops
    if (depth > 100) {
      throw new FlowError('Max flow depth exceeded (100)', 'MAX_DEPTH');
    }

    const stepId = uuid();
    const step: StepExecution = {
      id: stepId,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: 'running',
      attempts: 0,
      logs: [],
      startedAt: new Date(),
    };

    execution.steps.push(step);
    this.log(step, 'info', `Starting node: ${node.name}`);
    this.emit('step.start', { executionId: execution.id, stepId, nodeId: node.id });

    try {
      // Get the executor for this node type
      const executor = this.nodeExecutors.get(node.type);
      if (!executor) {
        throw new NodeError(`No executor for node type: ${node.type}`, node.id, node.type);
      }

      // Check cache
      const cacheKey = `${execution.flowId}:${node.id}:${JSON.stringify(execution.state)}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        if (Date.now() < cached.expiresAt) {
          step.output = cached.data;
          step.status = 'completed';
          step.completedAt = new Date();
          execution.state[node.id] = cached.data;
          this.log(step, 'info', `Using cached output`);
          return cached.data;
        }
      }

      // Apply timeout
      const timeout = node.timeout || 30000;
      const output = await this.withTimeout(
        executor(execution.state, node.config),
        timeout,
        node.id
      );

      step.output = output;
      step.status = 'completed';
      step.completedAt = new Date();
      step.duration = step.completedAt.getTime() - step.startedAt!.getTime();

      // Update execution state
      execution.state[node.id] = output;
      execution.state._output = output;

      // Cache if enabled
      if (execution.flow.config?.cacheEnabled) {
        const ttl = execution.flow.config.cacheTTL || 3600000;
        this.cache.set(cacheKey, { data: output, expiresAt: Date.now() + ttl });
      }

      this.log(step, 'info', `Node completed in ${step.duration}ms`);
      this.emit('step.complete', { executionId: execution.id, stepId, output });

      return output;

    } catch (error) {
      // Handle retry
      const retryConfig = node.retry;
      if (retryConfig && step.attempts < retryConfig.maxAttempts) {
        step.attempts++;
        const delay = this.calculateBackoff(step.attempts, retryConfig);
        this.log(step, 'warn', `Retrying in ${delay}ms (attempt ${step.attempts}/${retryConfig.maxAttempts})`);
        await this.sleep(delay);
        this.emit('step.retry', { executionId: execution.id, stepId, attempt: step.attempts });
        return this.executeNode(execution, node, depth);
      }

      // Handle error
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : 'Unknown error';
      step.completedAt = new Date();
      step.duration = step.completedAt.getTime() - step.startedAt!.getTime();

      this.log(step, 'error', `Node failed: ${step.error}`);
      this.emit('step.fail', { executionId: execution.id, stepId, error: step.error });

      if (node.onError === 'stop' || !node.onError) {
        throw new NodeError(step.error!, node.id, node.type);
      }

      // Continue to next node if onError === 'continue'
      return undefined;
    }
  }

  // Helper methods
  private validateFlow(flow: FlowDefinition): void {
    if (!flow.id || !flow.name) {
      throw new FlowError('Flow must have id and name', 'INVALID_FLOW');
    }
    if (!flow.nodes || flow.nodes.length === 0) {
      throw new FlowError('Flow must have at least one node', 'NO_NODES');
    }
    if (!flow.trigger) {
      throw new FlowError('Flow must have a trigger', 'NO_TRIGGER');
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, nodeId: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new TimeoutError(`Node ${nodeId} timed out after ${ms}ms`, nodeId, ms)), ms)
      ),
    ]);
  }

  private calculateBackoff(attempt: number, config: RetryConfig): number {
    const delay = config.initialDelay * Math.pow(attempt, 2);
    if (config.maxDelay) {
      return Math.min(delay, config.maxDelay);
    }
    return delay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(step: StepExecution, level: StepLog['level'], message: string, data?: any): void {
    step.logs.push({ timestamp: new Date(), level, message, data });
  }

  // Register a node executor
  registerExecutor(type: NodeType, executor: NodeExecutor): void {
    this.nodeExecutors.set(type, executor);
  }

  // Get execution
  getExecution(executionId: string): ExecutionContext | undefined {
    return this.executions.get(executionId);
  }

  // List executions
  listExecutions(flowId?: string): ExecutionContext[] {
    const all = Array.from(this.executions.values());
    if (flowId) {
      return all.filter(e => e.flowId === flowId);
    }
    return all;
  }

  // Cancel execution
  cancel(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      this.emit('execution.cancel', { executionId });
      return true;
    }
    return false;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

// Node executor type
export type NodeExecutor = (
  state: Record<string, any>,
  config: Record<string, any>
) => Promise<any>;

// Built-in executors
export function createBuiltInExecutors(runtime: FlowRuntime): void {
  // Delay node
  runtime.registerExecutor('delay', async (state, config) => {
    const delay = config.delay || config.seconds * 1000 || 1000;
    await new Promise(r => setTimeout(r, delay));
    return state._input;
  });

  // Transform node
  runtime.registerExecutor('transform', async (state, config) => {
    const { mapping } = config;
    const result: any = {};
    for (const [key, path] of Object.entries(mapping || {})) {
      result[key] = getNestedValue(state, path as string);
    }
    return result;
  });

  // Filter node
  runtime.registerExecutor('filter', async (state, config) => {
    const { conditions } = config;
    const input = state._input;

    if (!Array.isArray(input)) return input;

    return input.filter((item: any) => {
      return conditions.every((cond: any) => {
        const value = getNestedValue(item, cond.field);
        return evaluateCondition(value, cond.operator, cond.value);
      });
    });
  });

  // Condition node
  runtime.registerExecutor('condition', async (state, config) => {
    const { field, operator, value } = config;
    const fieldValue = getNestedValue(state, field);
    return {
      _conditionMet: evaluateCondition(fieldValue, operator, value),
      ...state,
    };
  });
}

// Helper functions
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function evaluateCondition(value: any, operator: string, target: any): boolean {
  switch (operator) {
    case '==': return value === target;
    case '!=': return value !== target;
    case '>': return value > target;
    case '>=': return value >= target;
    case '<': return value < target;
    case '<=': return value <= target;
    case 'contains': return String(value).includes(String(target));
    case 'in': return Array.isArray(target) && target.includes(value);
    case 'not_in': return !Array.isArray(target) || !target.includes(value);
    case 'exists': return value !== undefined && value !== null;
    case 'empty': return value === undefined || value === null || value === '';
    default: return true;
  }
}

// Singleton instance
export const flowRuntime = new FlowRuntime();
export default flowRuntime;
