// DAG Validator - cycle detection, topological sort, node/edge validation

export const NODE_TYPES = ['task', 'decision', 'merge', 'parallel', 'condition', 'output'];

/**
 * Detect cycles using DFS with coloring
 * @param {Object[]} nodes - Array of { id }
 * @param {Object[]} edges - Array of { from, to }
 * @returns {string[]} cycle node IDs if found, empty array if DAG is valid
 */
export function detectCycle(nodes, edges) {
  const adj = new Map();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => { if (adj.has(e.from)) adj.get(e.from).push(e.to); });

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(nodes.map(n => [n.id, WHITE]));
  const path = [];

  function dfs(nodeId) {
    if (color.get(nodeId) === GRAY) {
      const cycleStart = path.indexOf(nodeId);
      return path.slice(cycleStart);
    }
    if (color.get(nodeId) === BLACK) return null;
    color.set(nodeId, GRAY);
    path.push(nodeId);
    for (const neighbor of (adj.get(nodeId) || [])) {
      const cycle = dfs(neighbor);
      if (cycle) return cycle;
    }
    path.pop();
    color.set(nodeId, BLACK);
    return null;
  }

  for (const node of nodes) {
    if (color.get(node.id) === WHITE) {
      const cycle = dfs(node.id);
      if (cycle) return cycle;
    }
  }
  return [];
}

/**
 * Topological sort using Kahn's algorithm
 * @param {Object[]} nodes - Array of { id }
 * @param {Object[]} edges - Array of { from, to }
 * @returns {string[]} ordered node IDs (execution order)
 */
export function topologicalSort(nodes, edges) {
  const inDegree = new Map(nodes.map(n => [n.id, 0]));
  const adj = new Map(nodes.map(n => [n.id, []]));
  edges.forEach(e => {
    if (inDegree.has(e.from) && inDegree.has(e.to)) {
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
      adj.get(e.from).push(e.to);
    }
  });

  const queue = [];
  for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);
  const order = [];
  while (queue.length) {
    const cur = queue.shift();
    order.push(cur);
    for (const neighbor of (adj.get(cur) || [])) {
      const newDeg = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }
  return order;
}

/**
 * Validate a plan structure
 * @param {Object} plan
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePlan(plan) {
  const errors = [];
  if (!plan.name) errors.push('plan.name is required');
  if (!plan.nodes || !Array.isArray(plan.nodes)) errors.push('plan.nodes must be an array');
  if (!plan.edges || !Array.isArray(plan.edges)) errors.push('plan.edges must be an array');
  if (errors.length) return { valid: false, errors };

  const nodeIds = new Set(plan.nodes.map(n => n.id));
  if (nodeIds.size !== plan.nodes.length) errors.push('Duplicate node IDs');

  // Check edges reference valid nodes
  for (const edge of plan.edges) {
    if (!nodeIds.has(edge.from)) errors.push(`Edge references unknown 'from': ${edge.from}`);
    if (!nodeIds.has(edge.to)) errors.push(`Edge references unknown 'to': ${edge.to}`);
  }

  // Must have a root node (no incoming edges)
  const hasIncoming = new Set(plan.edges.map(e => e.to));
  const roots = plan.nodes.filter(n => !hasIncoming.has(n.id));
  if (roots.length === 0 && plan.nodes.length > 0) errors.push('Plan must have at least one root node (no incoming edges)');

  // Cycle detection
  const cycle = detectCycle(plan.nodes, plan.edges);
  if (cycle.length) errors.push(`Cycle detected: ${cycle.join(' → ')}`);

  return { valid: errors.length === 0, errors };
}

/**
 * Get execution levels (nodes grouped by topological depth)
 * @param {Object[]} nodes
 * @param {Object[]} edges
 * @returns {Map} nodeId → level (0 = first to execute)
 */
export function getExecutionLevels(nodes, edges) {
  const order = topologicalSort(nodes, edges);
  const levels = new Map();
  order.forEach((id, idx) => levels.set(id, idx));
  return levels;
}
