/**
 * Workflow executor — runs a workflow DAG step by step.
 * Uses topological sort for execution order.
 */
import { topologicalSort } from '../validator.js';

export class WorkflowExecutor {
  constructor(workflow) {
    this.workflow = workflow;
    this.nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
    this.state = {};
    this.results = new Map();
    this.executionOrder = topologicalSort(workflow.nodes, workflow.edges);
    this.currentStep = 0;
    this.status = 'pending';
  }

  getState() {
    return { ...this.state };
  }

  async execute() {
    this.status = 'running';
    this.startedAt = new Date().toISOString();
    const errors = [];

    for (const nodeId of this.executionOrder) {
      this.currentStep = this.executionOrder.indexOf(nodeId) + 1;
      const node = this.nodeMap.get(nodeId);
      try {
        const result = await this.executeNode(node);
        this.results.set(nodeId, result);
        this.state[nodeId] = result;
        // Propagate to downstream nodes via edges
        for (const edge of this.workflow.edges) {
          if (edge.source === nodeId && result !== undefined) {
            this.state[`__input_${edge.target}__`] = result;
          }
        }
      } catch (err) {
        errors.push({ nodeId, error: err.message });
        if (node.type === 'trigger') {
          // Non-triggering nodes can fail without halting
        }
      }
    }

    this.completedAt = new Date().toISOString();
    this.status = errors.length > 0 ? 'failed' : 'completed';
    return {
      executionId: this.workflow.id,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      totalSteps: this.executionOrder.length,
      results: Object.fromEntries(this.results),
      errors
    };
  }

  async executeNode(node) {
    const { type, data, config } = node;
    const input = this.state[`__input_${node.id}__`] ?? this.state;

    switch (type) {
      case 'trigger':
        return { triggered: true, event: data.event, timestamp: new Date().toISOString() };

      case 'llm-call':
        return {
          type: 'llm-call',
          model: data.model || 'claude-3-5-sonnet',
          prompt: data.prompt || '',
          response: `[Mock LLM response to: ${data.prompt?.substring(0, 50)}...]`,
          simulated: true
        };

      case 'tool':
        return { type: 'tool', toolName: data.toolName, params: data.params || {}, result: `tool:${data.toolName}:ok` };

      case 'condition': {
        const val = this.resolveExpression(data.expression, input);
        return { type: 'condition', expression: data.expression, result: !!val, branches: data.branches };
      }

      case 'loop': {
        const max = data.maxIterations || 5;
        const results = [];
        for (let i = 0; i < max; i++) results.push({ iteration: i + 1, ok: true });
        return { type: 'loop', iterations: max, results };
      }

      case 'transform':
        try {
          const val = this.state[data.inputVar] ?? input;
          return { type: 'transform', inputVar: data.inputVar, output: val, transformed: true };
        } catch { return { type: 'transform', error: 'transform failed' }; }

      case 'memory':
        return { type: 'memory', operation: data.operation, entityId: data.entityId, result: 'ok' };

      case 'twin':
        return { type: 'twin', twinType: data.twinType, operation: data.operation, result: 'ok' };

      case 'api-call':
        return {
          type: 'api-call',
          method: data.method,
          url: data.url,
          status: 200,
          body: data.body,
          response: { simulated: true }
        };

      case 'output':
        return { type: 'output', format: data.format, destination: data.destination, output: input };

      default:
        return { type, error: `unknown node type: ${type}` };
    }
  }

  resolveExpression(expr, state) {
    if (!expr) return true;
    try { return new Function('state', `with(state){return ${expr}}`)(state); }
    catch { return false; }
  }
}
