/**
 * Workflow validator — detects cycles, checks node types, validates required fields.
 */

const VALID_NODE_TYPES = new Set([
  'trigger', 'llm-call', 'tool', 'condition', 'loop',
  'transform', 'memory', 'twin', 'api-call', 'output'
]);

const REQUIRED_BY_TYPE = {
  trigger: ['event'],
  'llm-call': ['model', 'prompt'],
  tool: ['toolName'],
  condition: ['expression'],
  loop: ['maxIterations'],
  transform: ['inputVar', 'transformFn'],
  memory: ['operation'],
  twin: ['twinType', 'operation'],
  'api-call': ['method', 'url'],
  output: ['format'],
};

export function validateWorkflow(workflow) {
  const errors = [];

  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    errors.push('workflow.nodes must be an array');
    return errors;
  }
  if (!workflow.edges || !Array.isArray(workflow.edges)) {
    errors.push('workflow.edges must be an array');
    return errors;
  }

  // Check node IDs are unique
  const nodeIds = new Set();
  for (const node of workflow.nodes) {
    if (!node.id) { errors.push('node missing id'); continue; }
    if (nodeIds.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    nodeIds.add(node.id);

    // Check type
    if (!node.type) {
      errors.push(`node ${node.id} missing type`);
    } else if (!VALID_NODE_TYPES.has(node.type)) {
      errors.push(`invalid node type: ${node.type}`);
    }

    // Check required fields
    if (node.type && REQUIRED_BY_TYPE[node.type]) {
      for (const field of REQUIRED_BY_TYPE[node.type]) {
        if (node.data && node.data[field] === undefined) {
          errors.push(`node ${node.id} (${node.type}) missing required field: ${field}`);
        }
      }
    }
  }

  // Check edge references
  for (const edge of workflow.edges) {
    if (!edge.source) errors.push('edge missing source');
    if (!edge.target) errors.push('edge missing target');
    if (edge.source && !nodeIds.has(edge.source)) errors.push(`edge references unknown source node: ${edge.source}`);
    if (edge.target && !nodeIds.has(edge.target)) errors.push(`edge references unknown target node: ${edge.target}`);
  }

  // Check for cycles using DFS
  const cycleErrors = detectCycles(workflow.nodes, workflow.edges);
  errors.push(...cycleErrors);

  // Check for trigger node (entry point)
  const triggers = workflow.nodes.filter(n => n.type === 'trigger');
  if (triggers.length === 0) errors.push('workflow must have at least one trigger node');
  if (triggers.length > 1) errors.push(`workflow has ${triggers.length} triggers (expected 1)`);

  // Check for output node (exit point)
  const outputs = workflow.nodes.filter(n => n.type === 'output');
  if (outputs.length === 0) errors.push('workflow must have at least one output node');

  return errors;
}

function detectCycles(nodes, edges) {
  const errors = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Build adjacency list
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (adj.has(e.source)) adj.get(e.source).push(e.target);
  }

  // DFS-based cycle detection
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  for (const n of nodes) color.set(n.id, WHITE);

  const cyclePath = [];

  function dfs(nodeId) {
    color.set(nodeId, GRAY);
    cyclePath.push(nodeId);
    for (const neighbor of (adj.get(nodeId) || [])) {
      if (color.get(neighbor) === GRAY) {
        const cycleStart = cyclePath.indexOf(neighbor);
        const cycle = cyclePath.slice(cycleStart).concat(neighbor);
        errors.push(`cycle detected: ${cycle.join(' → ')}`);
      } else if (color.get(neighbor) === WHITE) {
        dfs(neighbor);
      }
    }
    cyclePath.pop();
    color.set(nodeId, BLACK);
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE) dfs(n.id);
  }

  return errors;
}

export function topologicalSort(nodes, edges) {
  const inDegree = new Map();
  const adj = new Map();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source).push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  }

  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted = [];
  while (queue.length) {
    const id = queue.shift();
    sorted.push(id);
    for (const neighbor of (adj.get(id) || [])) {
      const newDeg = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return sorted;
}
