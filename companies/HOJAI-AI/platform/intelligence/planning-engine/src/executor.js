// Plan executor - runs DAGs in topological order
import { topologicalSort, getExecutionLevels } from './validator.js';

/**
 * Execution states
 */
export const EXEC_STATES = ['pending', 'running', 'done', 'failed', 'skipped'];

/**
 * Execute a plan DAG
 * @param {Object} plan - { nodes, edges }
 * @param {Object} [context] - execution context (inputs)
 * @param {Function} [nodeExecutor] - async (node, context) => result
 * @returns {{ executionId, planId, order, results, completedAt }}
 */
export async function executePlan(plan, context = {}, nodeExecutor = defaultNodeExecutor) {
  const order = topologicalSort(plan.nodes, plan.edges);
  const levels = getExecutionLevels(plan.nodes, plan.edges);
  const nodeMap = new Map(plan.nodes.map(n => [n.id, { ...n }]));
  const results = {};
  const startTime = Date.now();

  // Track which nodes have completed (for fan-in)
  const completed = new Set();
  const pendingDeps = new Map(plan.nodes.map(n => [n.id, new Set()]));

  // Count incoming edges per node
  const inDegree = new Map(plan.nodes.map(n => [n.id, 0]));
  plan.edges.forEach(e => inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1));

  // Initialize pending deps for each node
  plan.edges.forEach(e => pendingDeps.get(e.to).add(e.from));

  // Nodes ready to execute (no incoming edges)
  const ready = order.filter(id => inDegree.get(id) === 0);

  // Execute nodes level by level
  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    const deps = Array.from(pendingDeps.get(nodeId));

    // Wait for dependencies
    const depsDone = deps.every(d => completed.has(d));
    if (!depsDone) {
      node.status = 'skipped';
      continue;
    }

    // Build node context from dependencies
    const nodeContext = {
      ...context,
      dependencies: deps.map(d => ({ id: d, result: results[d] })),
      level: levels.get(nodeId),
    };

    node.status = 'running';
    node.startedAt = new Date().toISOString();

    try {
      const result = await nodeExecutor(node, nodeContext);
      node.status = 'done';
      node.result = result;
      node.completedAt = new Date().toISOString();
      node.durationMs = new Date(node.completedAt) - new Date(node.startedAt);
      results[nodeId] = result;
    } catch (err) {
      node.status = 'failed';
      node.error = err.message;
      node.completedAt = new Date().toISOString();
      results[nodeId] = { error: err.message };
      // Continue executing independent nodes (fail-fast: can be overridden)
    }

    completed.add(nodeId);

    // Remove this node from pending deps of successors
    plan.edges.forEach(e => {
      if (e.from === nodeId) {
        pendingDeps.get(e.to)?.delete(nodeId);
      }
    });
  }

  return {
    executionId: `exec-${Date.now()}`,
    planId: plan.id,
    order,
    results,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    summary: {
      total: plan.nodes.length,
      done: Array.from(nodeMap.values()).filter(n => n.status === 'done').length,
      failed: Array.from(nodeMap.values()).filter(n => n.status === 'failed').length,
      skipped: Array.from(nodeMap.values()).filter(n => n.status === 'skipped').length,
    },
  };
}

/**
 * Default node executor — simulates task execution
 */
async function defaultNodeExecutor(node, context) {
  // Simulate work
  await new Promise(r => setTimeout(r, 10));

  switch (node.type) {
    case 'task':
      return { description: node.description, status: 'executed', context: { input: context.input || null } };
    case 'decision':
      return { description: node.description, status: 'decided', choice: 'proceed' };
    case 'merge':
      return { description: node.description, status: 'merged', inputs: context.dependencies.map(d => d.id) };
    case 'parallel':
      return { description: node.description, status: 'parallel_complete', branches: context.dependencies?.length || 0 };
    case 'condition':
      return { description: node.description, status: 'evaluated', result: true };
    case 'output':
      return { description: node.description, status: 'output_generated', data: context };
    default:
      return { description: node.description, status: 'executed' };
  }
}

/**
 * Cancel a running execution (mark all pending as skipped)
 */
export function cancelExecution(execution) {
  execution.nodes?.forEach(n => {
    if (n.status === 'pending' || n.status === 'running') {
      n.status = 'skipped';
    }
  });
  execution.cancelledAt = new Date().toISOString();
  return execution;
}
