/**
 * HOJAI Flow Builder - Flow Runtime Service
 * Executes flows and manages flow runs
 */

import { createClient, createFlow, FlowOS } from '@hojai/flows';

export interface FlowExecution {
  id: string;
  flowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger: string;
  input: any;
  output?: any;
  error?: string;
  startedAt: string;
  completedAt?: string;
  steps: FlowStepExecution[];
}

export interface FlowStepExecution {
  stepId: string;
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: any;
  output?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

class FlowRuntimeService {
  private client: any;
  private executions: Map<string, FlowExecution> = new Map();
  private flowOS: FlowOS | null = null;

  constructor() {
    // Initialize client
    this.client = createClient({
      apiKey: process.env.HOJAI_API_KEY,
    });
  }

  // Execute a flow
  async execute(flowId: string, trigger: string, input: any): Promise<FlowExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: FlowExecution = {
      id: executionId,
      flowId,
      status: 'pending',
      trigger,
      input,
      startedAt: new Date().toISOString(),
      steps: [],
    };

    this.executions.set(executionId, execution);

    // Start execution asynchronously
    this.runExecution(executionId).catch((error) => {
      const exec = this.executions.get(executionId);
      if (exec) {
        exec.status = 'failed';
        exec.error = error.message;
        exec.completedAt = new Date().toISOString();
      }
    });

    return execution;
  }

  // Run execution loop
  private async runExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'running';

    try {
      // Get flow definition
      const flow = await this.getFlowDefinition(execution.flowId);

      // Find trigger nodes
      const triggerNodes = flow.nodes.filter((n: any) => n.type === 'trigger');

      // Execute from trigger
      for (const triggerNode of triggerNodes) {
        const step = this.createStep(triggerNode, execution);
        execution.steps.push(step);

        await this.executeStep(execution, step, execution.input);
      }

      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date().toISOString();
    }
  }

  // Execute a single step
  private async executeStep(
    execution: FlowExecution,
    step: FlowStepExecution,
    input: any
  ): Promise<any> {
    step.status = 'running';
    step.startedAt = new Date().toISOString();
    step.input = input;

    try {
      // Get node from flow
      const flow = await this.getFlowDefinition(execution.flowId);
      const node = flow.nodes.find((n: any) => n.id === step.nodeId);

      if (!node) {
        throw new Error(`Node not found: ${step.nodeId}`);
      }

      // Execute based on node type
      let output: any;

      switch (node.type) {
        case 'trigger':
          output = input;
          break;

        case 'action':
          output = await this.executeAction(node, input);
          break;

        case 'ai_agent':
          output = await this.executeAgent(node, input);
          break;

        case 'condition':
          output = await this.evaluateCondition(node, input);
          break;

        case 'filter':
          output = await this.executeFilter(node, input);
          break;

        case 'transform':
          output = await this.executeTransform(node, input);
          break;

        case 'approval':
          output = await this.requestApproval(node, input);
          break;

        case 'memory':
          output = await this.executeMemory(node, input);
          break;

        case 'twin':
          output = await this.executeTwin(node, input);
          break;

        case 'email':
          output = await this.executeEmail(node, input);
          break;

        case 'sms':
          output = await this.executeSMS(node, input);
          break;

        case 'slack':
          output = await this.executeSlack(node, input);
          break;

        case 'calendar':
          output = await this.executeCalendar(node, input);
          break;

        case 'document':
          output = await this.executeDocument(node, input);
          break;

        case 'webhook':
          output = await this.executeWebhook(node, input);
          break;

        case 'actor':
          output = await this.executeActor(node, input);
          break;

        case 'end':
          output = input;
          break;

        default:
          output = input;
      }

      step.status = 'completed';
      step.output = output;
      step.completedAt = new Date().toISOString();
      step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();

      // Update execution output
      execution.output = output;

      // Execute next steps
      const connections = flow.connections.filter((c: any) => c.source === step.nodeId);

      for (const conn of connections) {
        // Check condition if exists
        if (conn.condition) {
          const shouldProceed = this.evaluateConnectionCondition(conn.condition, output);
          if (!shouldProceed) continue;
        }

        const nextStep = this.createStep(
          flow.nodes.find((n: any) => n.id === conn.target),
          execution
        );
        execution.steps.push(nextStep);

        await this.executeStep(execution, nextStep, output);
      }

      return output;
    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : 'Unknown error';
      step.completedAt = new Date().toISOString();
      step.duration = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();
      throw error;
    }
  }

  // Node execution methods
  private async executeAction(node: any, input: any): Promise<any> {
    // Call HOJAI API
    return this.client.request('POST', `/flows/${node.id}/execute`, {
      input,
      config: node.data.config,
    });
  }

  private async executeAgent(node: any, input: any): Promise<any> {
    const agentId = node.data.config?.agent || node.data.config?.agent_id;

    if (!agentId) {
      throw new Error('No agent specified');
    }

    // Call agent API
    return this.client.request('POST', `/agents/${agentId}/execute`, {
      input,
      config: node.data.config,
    });
  }

  private evaluateCondition(node: any, input: any): any {
    const { field, operator, value } = node.data.config;

    // Get field value from input
    const fieldValue = this.getNestedValue(input, field);

    // Evaluate condition
    switch (operator) {
      case '==': return fieldValue === value;
      case '!=': return fieldValue !== value;
      case '>': return fieldValue > value;
      case '>=': return fieldValue >= value;
      case '<': return fieldValue < value;
      case '<=': return fieldValue <= value;
      case 'contains': return String(fieldValue).includes(value);
      default: return true;
    }
  }

  private evaluateConnectionCondition(condition: string, input: any): boolean {
    try {
      const fn = new Function('input', `with (input) { return ${condition} }`);
      return fn(input);
    } catch {
      return true;
    }
  }

  private async executeFilter(node: any, input: any): Promise<any> {
    const { conditions } = node.data.config;

    if (!conditions || conditions.length === 0) {
      return input;
    }

    // Filter based on conditions
    if (Array.isArray(input)) {
      return input.filter((item) =>
        conditions.every((cond: any) => {
          const value = this.getNestedValue(item, cond.field);
          return this.evaluateConditionValue(value, cond.operator, cond.value);
        })
      );
    }

    return input;
  }

  private evaluateConditionValue(value: any, operator: string, target: any): boolean {
    switch (operator) {
      case '==': return value === target;
      case '!=': return value !== target;
      case '>': return value > target;
      case '>=': return value >= target;
      case '<': return value < target;
      case '<=': return value <= target;
      case 'contains': return String(value).includes(target);
      default: return true;
    }
  }

  private async executeTransform(node: any, input: any): Promise<any> {
    const { mapping } = node.data.config;

    if (!mapping) return input;

    // Apply transformation
    const result: any = {};
    for (const [key, path] of Object.entries(mapping)) {
      result[key] = this.getNestedValue(input, path as string);
    }

    return result;
  }

  private async requestApproval(node: any, input: any): Promise<any> {
    const { approvers, timeout } = node.data.config;

    // Create approval request
    const approval = await this.client.request('POST', '/approvals/request', {
      workflowId: node.flowId,
      nodeId: node.id,
      approvers,
      timeout: timeout || 24,
      data: input,
    });

    // Wait for approval (with timeout)
    // In production, this would use webhooks or polling
    return {
      approved: true,
      approvalId: approval.id,
      ...input,
    };
  }

  private async executeMemory(node: any, input: any): Promise<any> {
    const { action, memory_type } = node.data.config;

    switch (action) {
      case 'save':
        return this.client.request('POST', '/memory/save', {
          type: memory_type,
          data: input,
        });

      case 'load':
        return this.client.request('POST', '/memory/load', {
          type: memory_type,
          query: input,
        });

      case 'search':
        return this.client.request('POST', '/memory/search', {
          type: memory_type,
          query: input,
        });

      default:
        return input;
    }
  }

  private async executeTwin(node: any, input: any): Promise<any> {
    const { action, twin } = node.data.config;

    switch (action) {
      case 'create':
      case 'update':
        return this.client.request('POST', `/twins/${twin}`, {
          action,
          data: input,
        });

      case 'load':
        return this.client.request('GET', `/twins/${twin}/${input.id}`);

      default:
        return input;
    }
  }

  private async executeEmail(node: any, input: any): Promise<any> {
    return this.client.request('POST', '/email/send', {
      ...node.data.config,
      to: input.email || node.data.config.to,
      data: input,
    });
  }

  private async executeSMS(node: any, input: any): Promise<any> {
    return this.client.request('POST', '/sms/send', {
      ...node.data.config,
      to: input.phone || node.data.config.to,
      data: input,
    });
  }

  private async executeSlack(node: any, input: any): Promise<any> {
    return this.client.request('POST', '/slack/send', {
      ...node.data.config,
      data: input,
    });
  }

  private async executeCalendar(node: any, input: any): Promise<any> {
    return this.client.request('POST', '/calendar/event', {
      ...node.data.config,
      data: input,
    });
  }

  private async executeDocument(node: any, input: any): Promise<any> {
    return this.client.request('POST', '/document/generate', {
      ...node.data.config,
      data: input,
    });
  }

  private async executeWebhook(node: any, input: any): Promise<any> {
    const { url, method } = node.data.config;

    return this.client.request(method || 'POST', url, input);
  }

  private async executeActor(node: any, input: any): Promise<any> {
    const { actor, filters } = node.data.config;

    return this.client.request('POST', `/actors/${actor}/scrape`, {
      filters,
      data: input,
    });
  }

  // Helper methods
  private createStep(node: any, execution: FlowExecution): FlowStepExecution {
    return {
      stepId: `step_${execution.steps.length + 1}`,
      nodeId: node.id,
      nodeType: node.type,
      status: 'pending',
    };
  }

  private async getFlowDefinition(flowId: string): Promise<any> {
    // TODO: Fetch from API or cache
    return {
      id: flowId,
      nodes: [],
      connections: [],
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  // Public API
  getExecution(executionId: string): FlowExecution | undefined {
    return this.executions.get(executionId);
  }

  listExecutions(flowId?: string): FlowExecution[] {
    const executions = Array.from(this.executions.values());
    if (flowId) {
      return executions.filter((e) => e.flowId === flowId);
    }
    return executions;
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.completedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  // Trigger webhook endpoint
  async handleWebhook(flowId: string, payload: any): Promise<FlowExecution> {
    return this.execute(flowId, 'webhook', payload);
  }

  // Test flow in sandbox
  async testFlow(flowId: string, testInput: any): Promise<FlowExecution> {
    const execution = await this.execute(flowId, 'test', testInput);

    // Wait for completion (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();

    while (execution.status === 'running' && Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 1000));
    }

    return execution;
  }
}

export const flowRuntime = new FlowRuntimeService();
export default flowRuntime;
