/**
 * Workflow Builder - In-memory store for DAG workflows
 */

import { v4 as uuidv4 } from 'uuid';

// Node types
export const NodeType = {
  LLM: 'llm',
  AGENT: 'agent',
  TWIN: 'twin',
  RAG: 'rag',
  CODE: 'code',
  CONDITIONAL: 'conditional',
  WAIT: 'wait',
  OUTPUT: 'output',
  TRIGGER: 'trigger',
  TRANSFORM: 'transform'
};

// Workflow status
export const WorkflowStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived'
};

// In-memory stores
const workflows = new Map();
const executions = new Map();

// Seed with sample workflows
function seedData() {
  const sampleWorkflows = [
    {
      id: 'wf-lead-capture',
      name: 'Lead Capture Workflow',
      description: 'Capture leads from multiple sources, qualify them, and route to CRM',
      status: WorkflowStatus.ACTIVE,
      nodes: [
        { id: 'trigger', type: NodeType.TRIGGER, label: 'Form Submit', config: { source: 'form' }, position: { x: 100, y: 200 } },
        { id: 'validate', type: NodeType.CODE, label: 'Validate', config: { code: 'validateLead(data)' }, position: { x: 300, y: 200 } },
        { id: 'qualify', type: NodeType.LLM, label: 'Qualify Lead', config: { prompt: 'Is this a qualified lead?', model: 'gpt-4' }, position: { x: 500, y: 200 } },
        { id: 'condition', type: NodeType.CONDITIONAL, label: 'Hot Lead?', config: { condition: 'score > 70' }, position: { x: 700, y: 200 } },
        { id: 'crm-hot', type: NodeType.OUTPUT, label: 'Add to CRM (Hot)', config: { action: 'create-lead', priority: 'high' }, position: { x: 900, y: 100 } },
        { id: 'crm-warm', type: NodeType.OUTPUT, label: 'Add to CRM (Warm)', config: { action: 'create-lead', priority: 'medium' }, position: { x: 900, y: 200 } },
        { id: 'nurture', type: NodeType.OUTPUT, label: 'Nurture Sequence', config: { action: 'add-to-sequence' }, position: { x: 900, y: 300 } }
      ],
      edges: [
        { from: 'trigger', to: 'validate' },
        { from: 'validate', to: 'qualify' },
        { from: 'qualify', to: 'condition' },
        { from: 'condition', to: 'crm-hot', condition: 'hot' },
        { from: 'condition', to: 'crm-warm', condition: 'warm' },
        { from: 'condition', to: 'nurture', condition: 'cold' }
      ],
      variables: [
        { name: 'leadScore', type: 'number', default: 0 },
        { name: 'leadSource', type: 'string', default: '' }
      ],
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-06-01T14:30:00Z'
    },
    {
      id: 'wf-order-fulfillment',
      name: 'Order Fulfillment',
      description: 'Process orders from checkout to delivery',
      status: WorkflowStatus.ACTIVE,
      nodes: [
        { id: 'trigger', type: NodeType.TRIGGER, label: 'New Order', config: { source: 'checkout' }, position: { x: 100, y: 200 } },
        { id: 'validate-order', type: NodeType.CODE, label: 'Validate Order', config: { code: 'validateOrder(data)' }, position: { x: 300, y: 200 } },
        { id: 'payment', type: NodeType.OUTPUT, label: 'Process Payment', config: { action: 'charge' }, position: { x: 500, y: 200 } },
        { id: 'inventory', type: NodeType.RAG, label: 'Check Inventory', config: { collection: 'inventory' }, position: { x: 700, y: 200 } },
        { id: 'fulfill', type: NodeType.AGENT, label: 'Fulfillment Agent', config: { agent: 'logistics' }, position: { x: 900, y: 200 } }
      ],
      edges: [
        { from: 'trigger', to: 'validate-order' },
        { from: 'validate-order', to: 'payment' },
        { from: 'payment', to: 'inventory' },
        { from: 'inventory', to: 'fulfill' }
      ],
      variables: [
        { name: 'orderId', type: 'string', default: '' },
        { name: 'total', type: 'number', default: 0 }
      ],
      createdAt: '2026-02-20T09:00:00Z',
      updatedAt: '2026-05-15T11:00:00Z'
    },
    {
      id: 'wf-customer-support',
      name: 'Customer Support Flow',
      description: 'AI-powered customer support ticket handling',
      status: WorkflowStatus.ACTIVE,
      nodes: [
        { id: 'trigger', type: NodeType.TRIGGER, label: 'New Ticket', config: { source: 'support' }, position: { x: 100, y: 200 } },
        { id: 'classify', type: NodeType.LLM, label: 'Classify Issue', config: { prompt: 'Classify the customer issue' }, position: { x: 300, y: 200 } },
        { id: 'condition', type: NodeType.CONDITIONAL, label: 'Type?', config: { field: 'issueType' }, position: { x: 500, y: 200 } },
        { id: 'refund', type: NodeType.OUTPUT, label: 'Process Refund', config: { action: 'refund' }, position: { x: 700, y: 100 } },
        { id: 'escalate', type: NodeType.AGENT, label: 'Escalate to Agent', config: { agent: 'support' }, position: { x: 700, y: 200 } },
        { id: 'faq', type: NodeType.OUTPUT, label: 'Send FAQ', config: { action: 'send-message' }, position: { x: 700, y: 300 } }
      ],
      edges: [
        { from: 'trigger', to: 'classify' },
        { from: 'classify', to: 'condition' },
        { from: 'condition', to: 'refund', condition: 'refund' },
        { from: 'condition', to: 'escalate', condition: 'complex' },
        { from: 'condition', to: 'faq', condition: 'simple' }
      ],
      variables: [
        { name: 'ticketId', type: 'string', default: '' },
        { name: 'issueType', type: 'string', default: '' }
      ],
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-06-05T09:00:00Z'
    }
  ];

  for (const wf of sampleWorkflows) {
    workflows.set(wf.id, wf);
  }
}

seedData();

// ── Workflows ─────────────────────────────────────────────────────────────────

export function createWorkflow(data) {
  const id = data.id || uuidv4();
  const workflow = {
    id,
    name: data.name || 'Untitled Workflow',
    description: data.description || '',
    status: data.status || WorkflowStatus.DRAFT,
    nodes: data.nodes || [],
    edges: data.edges || [],
    variables: data.variables || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  workflows.set(id, workflow);
  return workflow;
}

export function getWorkflow(id) {
  return workflows.get(id) || null;
}

export function updateWorkflow(id, updates) {
  const workflow = workflows.get(id);
  if (!workflow) return null;

  const updated = {
    ...workflow,
    ...updates,
    id: workflow.id,
    updatedAt: new Date().toISOString()
  };

  workflows.set(id, updated);
  return updated;
}

export function deleteWorkflow(id) {
  return workflows.delete(id);
}

export function listWorkflows({ status, search } = {}) {
  let results = Array.from(workflows.values());

  if (status) {
    results = results.filter(w => w.status === status);
  }

  if (search) {
    const s = search.toLowerCase();
    results = results.filter(w =>
      w.name.toLowerCase().includes(s) ||
      w.description.toLowerCase().includes(s)
    );
  }

  return results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getActiveWorkflows() {
  return Array.from(workflows.values()).filter(w => w.status === WorkflowStatus.ACTIVE);
}

// ── Node Operations ─────────────────────────────────────────────────────────────

export function addNode(workflowId, node) {
  const workflow = workflows.get(workflowId);
  if (!workflow) return null;

  const newNode = {
    id: node.id || uuidv4(),
    type: node.type,
    label: node.label || node.type,
    config: node.config || {},
    position: node.position || { x: 0, y: 0 }
  };

  workflow.nodes.push(newNode);
  workflow.updatedAt = new Date().toISOString();
  workflows.set(workflowId, workflow);

  return newNode;
}

export function updateNode(workflowId, nodeId, updates) {
  const workflow = workflows.get(workflowId);
  if (!workflow) return null;

  const nodeIndex = workflow.nodes.findIndex(n => n.id === nodeId);
  if (nodeIndex === -1) return null;

  workflow.nodes[nodeIndex] = { ...workflow.nodes[nodeIndex], ...updates };
  workflow.updatedAt = new Date().toISOString();
  workflows.set(workflowId, workflow);

  return workflow.nodes[nodeIndex];
}

export function deleteNode(workflowId, nodeId) {
  const workflow = workflows.get(workflowId);
  if (!workflow) return null;

  workflow.nodes = workflow.nodes.filter(n => n.id !== nodeId);
  workflow.edges = workflow.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
  workflow.updatedAt = new Date().toISOString();
  workflows.set(workflowId, workflow);

  return true;
}

export function addEdge(workflowId, edge) {
  const workflow = workflows.get(workflowId);
  if (!workflow) return null;

  const newEdge = {
    from: edge.from,
    to: edge.to,
    condition: edge.condition || null,
    label: edge.label || ''
  };

  workflow.edges.push(newEdge);
  workflow.updatedAt = new Date().toISOString();
  workflows.set(workflowId, workflow);

  return newEdge;
}

export function deleteEdge(workflowId, fromId, toId) {
  const workflow = workflows.get(workflowId);
  if (!workflow) return null;

  workflow.edges = workflow.edges.filter(e =>
    !(e.from === fromId && e.to === toId)
  );
  workflow.updatedAt = new Date().toISOString();
  workflows.set(workflowId, workflow);

  return true;
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validateWorkflow(id) {
  const workflow = workflows.get(id);
  if (!workflow) return { valid: false, errors: ['Workflow not found'] };

  const errors = [];

  // Check for trigger node
  const hasTrigger = workflow.nodes.some(n => n.type === NodeType.TRIGGER);
  if (!hasTrigger) {
    errors.push('Workflow must have at least one trigger node');
  }

  // Check for output node
  const hasOutput = workflow.nodes.some(n => n.type === NodeType.OUTPUT);
  if (!hasOutput) {
    errors.push('Workflow must have at least one output node');
  }

  // Check for cycles
  if (hasCycle(workflow.nodes, workflow.edges)) {
    errors.push('Workflow contains a cycle');
  }

  // Check all edges reference valid nodes
  for (const edge of workflow.edges) {
    const fromExists = workflow.nodes.some(n => n.id === edge.from);
    const toExists = workflow.nodes.some(n => n.id === edge.to);
    if (!fromExists) errors.push(`Edge references non-existent node: ${edge.from}`);
    if (!toExists) errors.push(`Edge references non-existent node: ${edge.to}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function hasCycle(nodes, edges) {
  const visited = new Set();
  const recStack = new Set();

  function dfs(nodeId) {
    visited.add(nodeId);
    recStack.add(nodeId);

    const outgoing = edges.filter(e => e.from === nodeId);
    for (const edge of outgoing) {
      if (!visited.has(edge.to)) {
        if (dfs(edge.to)) return true;
      } else if (recStack.has(edge.to)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}

// ── Executions ───────────────────────────────────────────────────────────────

export function createExecution(workflowId, input) {
  const id = uuidv4();
  const execution = {
    id,
    workflowId,
    status: 'running',
    input,
    output: null,
    error: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    steps: []
  };

  executions.set(id, execution);
  return execution;
}

export function getExecution(id) {
  return executions.get(id) || null;
}

export function updateExecution(id, updates) {
  const execution = executions.get(id);
  if (!execution) return null;

  Object.assign(execution, updates);
  executions.set(id, execution);
  return execution;
}

export function listExecutions({ workflowId, status, limit = 50 } = {}) {
  let results = Array.from(executions.values());

  if (workflowId) {
    results = results.filter(e => e.workflowId === workflowId);
  }

  if (status) {
    results = results.filter(e => e.status === status);
  }

  return results
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, limit);
}

// ── Stats ───────────────────────────────────────────────────────────────────

export function getStats() {
  const workflowList = Array.from(workflows.values());
  const executionList = Array.from(executions.values());

  return {
    totalWorkflows: workflowList.length,
    activeWorkflows: workflowList.filter(w => w.status === WorkflowStatus.ACTIVE).length,
    draftWorkflows: workflowList.filter(w => w.status === WorkflowStatus.DRAFT).length,
    totalExecutions: executionList.length,
    runningExecutions: executionList.filter(e => e.status === 'running').length,
    completedExecutions: executionList.filter(e => e.status === 'completed').length,
    failedExecutions: executionList.filter(e => e.status === 'failed').length
  };
}
