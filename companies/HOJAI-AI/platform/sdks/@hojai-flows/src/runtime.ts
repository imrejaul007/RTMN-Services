/**
 * HOJAI Flow Runtime
 */

import { Workflow, FlowDefinition } from './workflow';
import { Node, NodeConfig } from './node';
import { Client } from '@hojai/core';

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  trigger: string;
  data: any;
  state: Record<string, any>;
  startedAt: number;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: any;
  output?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export class FlowRuntime {
  private client: Client;
  private workflow: Workflow;
  private executions = new Map<string, ExecutionContext>();

  constructor(client: Client, workflow: Workflow | FlowDefinition) {
    this.client = client;
    this.workflow = workflow instanceof Workflow ? workflow : new Workflow(workflow);
  }

  async execute(trigger: string, data: any): Promise<ExecutionContext> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const context: ExecutionContext = {
      executionId,
      workflowId: this.workflow.id,
      trigger,
      data,
      state: {},
      startedAt: Date.now(),
      logs: [],
    };

    this.executions.set(executionId, context);

    try {
      // Find starting nodes
      const startNodes = this.workflow.triggers
        .filter(t => t.id === trigger)
        .flatMap(t => this.workflow.getNextNodes('trigger'));

      // Execute flow
      for (const node of startNodes) {
        await this.executeNode(context, node);
      }

      context.logs.push({
        nodeId: 'completed',
        status: 'completed',
        completedAt: Date.now(),
      });

      return context;
    } catch (error) {
      context.logs.push({
        nodeId: 'error',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: Date.now(),
      });
      throw error;
    }
  }

  private async executeNode(context: ExecutionContext, node: Node): Promise<any> {
    context.logs.push({
      nodeId: node.id,
      status: 'running',
      startedAt: Date.now(),
    });

    try {
      // Execute based on node type
      const output = await this.executeNodeLogic(context, node);

      context.logs.push({
        nodeId: node.id,
        status: 'completed',
        output,
        completedAt: Date.now(),
      });

      // Update state
      context.state[node.id] = output;

      // Execute next nodes
      const connections = this.workflow.getConnections(node.id);
      for (const conn of connections) {
        const nextNode = this.workflow.getNode(conn.to);
        if (nextNode && this.shouldProceed(conn.condition, context)) {
          await this.executeNode(context, nextNode);
        }
      }

      return output;
    } catch (error) {
      if (node.onError === 'continue') {
        context.logs.push({
          nodeId: node.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: Date.now(),
        });
        return undefined;
      } else if (node.onError === 'retry' && node.retry) {
        // Retry logic
        return this.retryNode(context, node, node.retry);
      } else {
        context.logs.push({
          nodeId: node.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: Date.now(),
        });
        throw error;
      }
    }
  }

  private async executeNodeLogic(context: ExecutionContext, node: Node): Promise<any> {
    switch (node.type) {
      case 'action':
        return this.executeAction(node, context);
      case 'ai_agent':
        return this.executeAgent(node, context);
      case 'condition':
        return this.evaluateCondition(node, context);
      case 'memory':
        return this.executeMemory(node, context);
      case 'twin':
        return this.executeTwin(node, context);
      case 'approval':
        return this.requestApproval(node, context);
      default:
        return context.state;
    }
  }

  private async executeAction(node: Node, context: ExecutionContext): Promise<any> {
    // Execute action via API
    return this.client.request('POST', `/flows/${this.workflow.id}/nodes/${node.id}/execute`, {
      executionId: context.executionId,
      input: context.state,
      config: node.config,
    });
  }

  private async executeAgent(node: Node, context: ExecutionContext): Promise<any> {
    const agentId = node.config.agent;
    return this.client.request('POST', `/agents/${agentId}/execute`, {
      input: context.state,
      workflowContext: {
        workflowId: this.workflow.id,
        executionId: context.executionId,
      },
    });
  }

  private evaluateCondition(node: Node, context: ExecutionContext): any {
    const { field, operator, value } = node.config;
    const fieldValue = this.getNestedValue(context.state, field);

    switch (operator) {
      case '==': return fieldValue === value;
      case '!=': return fieldValue !== value;
      case '>': return fieldValue > value;
      case '>=': return fieldValue >= value;
      case '<': return fieldValue < value;
      case '<=': return fieldValue <= value;
      default: return true;
    }
  }

  private async executeMemory(node: Node, context: ExecutionContext): Promise<any> {
    const action = node.config.action || 'load';
    return this.client.request('POST', '/memory/execute', {
      action,
      memoryType: node.config.memory_type,
      data: context.state,
    });
  }

  private async executeTwin(node: Node, context: ExecutionContext): Promise<any> {
    const action = node.config.action || 'load';
    return this.client.request('POST', '/twins/execute', {
      action,
      twin: node.config.twin,
      data: context.state,
    });
  }

  private async requestApproval(node: Node, context: ExecutionContext): Promise<any> {
    return this.client.request('POST', '/approvals/request', {
      workflowId: this.workflow.id,
      executionId: context.executionId,
      nodeId: node.id,
      approvers: node.config.approvers,
      timeout: node.config.timeout,
      data: context.state,
    });
  }

  private async retryNode(context: ExecutionContext, node: Node, retry: { maxAttempts: number; backoff?: string; delay?: number }): Promise<any> {
    let lastError: Error;
    for (let i = 0; i < retry.maxAttempts; i++) {
      try {
        return await this.executeNodeLogic(context, node);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (retry.delay) {
          await new Promise(r => setTimeout(r, retry.delay! * (retry.backoff === 'exponential' ? Math.pow(2, i) : 1)));
        }
      }
    }
    throw lastError!;
  }

  private shouldProceed(condition: string | undefined, context: ExecutionContext): boolean {
    if (!condition) return true;
    // Simple condition evaluation
    try {
      const fn = new Function('state', `return ${condition}`);
      return fn(context.state);
    } catch {
      return true;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  getExecution(executionId: string): ExecutionContext | undefined {
    return this.executions.get(executionId);
  }

  listExecutions(): ExecutionContext[] {
    return Array.from(this.executions.values());
  }
}
