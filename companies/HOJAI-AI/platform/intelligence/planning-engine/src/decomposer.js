// Task decomposer - breaks down goals into executable sub-tasks
// Simulates LLM-based decomposition using heuristics + template patterns

/**
 * Node types supported by the planner
 */
export const NODE_TYPES = ['task', 'decision', 'merge', 'parallel', 'condition', 'output'];

/**
 * Decompose a goal description into a DAG of tasks
 * @param {string} goal - Natural language goal description
 * @param {Object} [options]
 * @returns {{ nodes: Object[], edges: Object[], rootId: string }}
 */
export function decomposeGoal(goal, options = {}) {
  const { maxDepth = 3, parallel = false } = options;
  const nodes = [];
  const edges = [];
  let nodeId = 0;

  function mkNode(type, description, metadata = {}) {
    const id = `n${nodeId++}`;
    nodes.push({ id, type, description, metadata, status: 'pending', result: null });
    return id;
  }

  function mkEdge(from, to) {
    edges.push({ from, to });
  }

  // Root node
  const rootId = mkNode('task', goal, { isRoot: true, depth: 0 });

  // Decompose based on goal type
  const goalLower = goal.toLowerCase();

  // 1. Multi-step sequences (contains "and then", "after", "then")
  if (/\b(and then|after|then|followed by|next step)\b/i.test(goal)) {
    const parts = goal.split(/\b(and then|after|then|followed by|next step)\b/i).filter(Boolean).map(s => s.trim()).filter(s => s.length > 2);
    if (parts.length > 1) {
      let prevId = rootId;
      parts.forEach((part, i) => {
        const subId = mkNode('task', part, { depth: 1, stepIndex: i });
        mkEdge(prevId, subId);
        prevId = subId;
      });
    }
  }

  // 2. Multi-branch (contains "or", "either", "if/else")
  else if (/\b(or|either|if |if\/else)\b/i.test(goal)) {
    const branches = goal.split(/\b(or|either)\b/i).filter(Boolean).map(s => s.trim()).filter(s => s.length > 2);
    if (branches.length > 1) {
      // Create parallel branches
      branches.forEach((branch, i) => {
        if (i === 0) {
          // First part becomes the branch
          nodes.find(n => n.id === rootId).description = branches[0];
          nodes.find(n => n.id === rootId).metadata.branchRoot = true;
        } else {
          const branchId = mkNode('task', branch, { depth: 1, branchIndex: i });
          mkEdge(rootId, branchId);
        }
      });
      // Merge point
      const mergeId = mkNode('merge', 'Merge branches', { depth: 1 });
      nodes.filter(n => n.metadata.branchIndex !== undefined).forEach(n => mkEdge(n.id, mergeId));
    }
  }

  // 3. Decompose into sub-tasks (generic — creates 2-4 sub-nodes)
  else {
    const subTasks = generateSubTasks(goal);
    const subTaskNodes = subTasks.map((task, i) => {
      const id = mkNode('task', task, { depth: 1, stepIndex: i, parentId: rootId });
      mkEdge(rootId, id);
      return { id, task };
    });

    // Try to group independent tasks for parallel execution
    if (parallel && subTaskNodes.length > 1) {
      const parallelId = mkNode('parallel', `Parallel execution (${subTaskNodes.length} tasks)`, { depth: 0.5 });
      // Insert parallel grouping node
      edges.forEach(e => {
        if (e.from === rootId) e.from = parallelId;
      });
      edges.push({ from: rootId, to: parallelId });
    }
  }

  // 4. Add output node
  const outputId = mkNode('output', `Output: ${goal.substring(0, 50)}`, { isOutput: true });
  const taskNodes = nodes.filter(n => n.type === 'task' && n.id !== rootId);
  if (taskNodes.length > 0) {
    taskNodes.forEach(t => mkEdge(t.id, outputId));
  } else {
    mkEdge(rootId, outputId);
  }

  return { nodes, edges, rootId };
}

/**
 * Generate sub-tasks heuristically based on goal content
 */
function generateSubTasks(goal) {
  const lower = goal.toLowerCase();
  const tasks = [];

  // Research tasks
  if (/\b(research|analyze|investigate|find|search|lookup)\b/i.test(goal)) {
    tasks.push('Gather information and data');
    tasks.push('Analyze and synthesize findings');
  }

  // Build/create tasks
  if (/\b(build|create|make|develop|implement|design)\b/i.test(goal)) {
    tasks.push('Plan implementation approach');
    tasks.push('Execute build steps');
    tasks.push('Validate output');
  }

  // Review/approval tasks
  if (/\b(review|check|verify|validate|approve|assess)\b/i.test(goal)) {
    tasks.push('Review against criteria');
    tasks.push('Document findings');
  }

  // Communication tasks
  if (/\b(notify|inform|email|send|communicate|tell)\b/i.test(goal)) {
    tasks.push('Prepare message content');
    tasks.push('Send and track delivery');
  }

  // Report tasks
  if (/\b(report|summary|document|write|prepare)\b/i.test(goal)) {
    tasks.push('Collect relevant data');
    tasks.push('Format and write report');
    tasks.push('Review and finalize');
  }

  // Default: break into 3 generic phases
  if (tasks.length === 0) {
    tasks.push('Prepare and plan');
    tasks.push('Execute core action');
    tasks.push('Verify and complete');
  }

  return tasks;
}

/**
 * Suggest optimal execution strategy
 */
export function suggestStrategy(nodes, edges) {
  const nodeCount = nodes.length;
  const taskCount = nodes.filter(n => n.type === 'task').length;
  const hasParallel = nodes.some(n => n.type === 'parallel');
  const hasDecision = nodes.some(n => n.type === 'decision');

  // Structural fan-out: a node with 2+ outgoing edges (parallel branches)
  const outDegree = new Map(nodes.map(n => [n.id, 0]));
  edges.forEach(e => outDegree.set(e.from, (outDegree.get(e.from) || 0) + 1));
  const hasFanOut = Array.from(outDegree.values()).some(d => d >= 2);

  if (hasDecision) return 'sequential_with_conditionals';
  if (hasFanOut || (hasParallel && taskCount > 3)) return 'parallel_fan_out';
  if (taskCount > 5) return 'staged_pipeline';
  return 'sequential';
}
