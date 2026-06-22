/**
 * HOJAI Visual Workflow Builder
 * Drag-drop nodes: Prompt, Tool, Retriever, Agent, Decision
 * Port: 4600
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4600;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ============================================
// TYPES
// ============================================

interface WorkflowNode {
  id: string;
  type: 'input' | 'prompt' | 'tool' | 'retriever' | 'llm' | 'decision' | 'condition' | 'loop' | 'output' | 'agent';
  name: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  inputs: string[];
  outputs: string[];
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: 'default' | 'success' | 'failure';
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  category: 'support' | 'sales' | 'restaurant' | 'salon' | 'clinic' | 'hotel' | 'generic';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version: number;
  status: 'draft' | 'testing' | 'production';
  variables: Variable[];
  createdAt: Date;
  updatedAt: Date;
}

interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: string;
  description?: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'running' | 'success' | 'failed';
  steps: ExecutionStep[];
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  input: unknown;
  output?: unknown;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  latency: number;
  error?: string;
}

// Node Templates
const NODE_TEMPLATES = {
  input: {
    type: 'input',
    name: 'Input',
    description: 'Workflow input parameters',
    icon: '📥',
    config: ['name', 'type', 'required', 'description'],
    inputs: [],
    outputs: ['output']
  },
  prompt: {
    type: 'prompt',
    name: 'Prompt',
    description: 'LLM prompt',
    icon: '💬',
    config: ['template', 'model', 'temperature', 'maxTokens'],
    inputs: ['input'],
    outputs: ['output']
  },
  tool: {
    type: 'tool',
    name: 'Tool',
    description: 'External tool call',
    icon: '🔧',
    config: ['toolName', 'parameters', 'retryCount'],
    inputs: ['input'],
    outputs: ['success', 'failure']
  },
  retriever: {
    type: 'retriever',
    name: 'Retriever',
    description: 'Knowledge base retrieval',
    icon: '📚',
    config: ['collection', 'topK', 'similarityThreshold'],
    inputs: ['query'],
    outputs: ['documents', 'no-results']
  },
  llm: {
    type: 'llm',
    name: 'LLM',
    description: 'Language model',
    icon: '🧠',
    config: ['model', 'temperature', 'systemPrompt'],
    inputs: ['input'],
    outputs: ['output']
  },
  decision: {
    type: 'decision',
    name: 'Decision',
    description: 'Conditional branch',
    icon: '🔀',
    config: ['condition', 'operator', 'value'],
    inputs: ['input'],
    outputs: ['true', 'false']
  },
  condition: {
    type: 'condition',
    name: 'Condition',
    description: 'If/else condition',
    icon: '⚡',
    config: ['if', 'then', 'else'],
    inputs: ['condition'],
    outputs: ['true', 'false']
  },
  loop: {
    type: 'loop',
    name: 'Loop',
    description: 'Iterate over items',
    icon: '🔄',
    config: ['items', 'maxIterations'],
    inputs: ['items'],
    outputs: ['item', 'done']
  },
  agent: {
    type: 'agent',
    name: 'Agent',
    description: 'AI Agent with tools',
    icon: '🤖',
    config: ['agentId', 'tools', 'maxSteps'],
    inputs: ['input'],
    outputs: ['output']
  },
  output: {
    type: 'output',
    name: 'Output',
    description: 'Workflow output',
    icon: '📤',
    config: ['response'],
    inputs: ['input'],
    outputs: []
  }
};

const workflows = new Map();
const executions = new Map();

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-visual-workflow',
  status: 'healthy',
  port: PORT,
  tagline: 'Drag-drop workflow builder'
}));

// Node templates
app.get('/api/templates', (_, res) => res.json({
  success: true,
  data: Object.entries(NODE_TEMPLATES).map(([key, template]) => ({
    type: key,
    ...template
  }))
}));

// Create workflow
app.post('/api/workflows', (req, res) => {
  const { name, description, category } = req.body;

  const workflow: Workflow = {
    id: uuidv4().slice(0, 8),
    name,
    description,
    category: category || 'generic',
    nodes: [],
    edges: [],
    version: 1,
    status: 'draft',
    variables: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  workflows.set(workflow.id, workflow);

  res.status(201).json({ success: true, data: workflow });
});

// Add node to workflow
app.post('/api/workflows/:id/nodes', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const { type, name, position, config } = req.body;

  if (!NODE_TEMPLATES[type as keyof typeof NODE_TEMPLATES]) {
    return res.status(400).json({ error: 'Invalid node type' });
  }

  const template = NODE_TEMPLATES[type as keyof typeof NODE_TEMPLATES];

  const node: WorkflowNode = {
    id: uuidv4().slice(0, 8),
    type,
    name: name || template.name,
    position: position || { x: 0, y: 0 },
    config: config || {},
    inputs: template.inputs,
    outputs: template.outputs
  };

  workflow.nodes.push(node);
  workflow.updatedAt = new Date();
  workflows.set(workflow.id, workflow);

  res.status(201).json({ success: true, data: node });
});

// Add edge
app.post('/api/workflows/:id/edges', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const { source, target, sourceHandle, targetHandle, type } = req.body;

  const edge: WorkflowEdge = {
    id: uuidv4().slice(0, 8),
    source,
    target,
    sourceHandle,
    targetHandle,
    type: type || 'default'
  };

  workflow.edges.push(edge);
  workflow.updatedAt = new Date();
  workflows.set(workflow.id, workflow);

  res.status(201).json({ success: true, data: edge });
});

// Get workflow
app.get('/api/workflows/:id', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json({ success: true, data: workflow });
});

// List workflows
app.get('/api/workflows', (req, res) => {
  const { category, status } = req.query;
  let result = Array.from(workflows.values());

  if (category) result = result.filter(w => w.category === category);
  if (status) result = result.filter(w => w.status === status);

  result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  res.json({ success: true, data: result });
});

// Update node
app.patch('/api/workflows/:workflowId/nodes/:nodeId', (req, res) => {
  const workflow = workflows.get(req.params.workflowId);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const node = workflow.nodes.find(n => n.id === req.params.nodeId);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  Object.assign(node, req.body);
  workflow.updatedAt = new Date();
  workflows.set(workflow.id, workflow);

  res.json({ success: true, data: node });
});

// Delete node
app.delete('/api/workflows/:workflowId/nodes/:nodeId', (req, res) => {
  const workflow = workflows.get(req.params.workflowId);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  workflow.nodes = workflow.nodes.filter(n => n.id !== req.params.nodeId);
  workflow.edges = workflow.edges.filter(e => e.source !== req.params.nodeId && e.target !== req.params.nodeId);
  workflow.updatedAt = new Date();
  workflows.set(workflow.id, workflow);

  res.json({ success: true, message: 'Node deleted' });
});

// Test workflow
app.post('/api/workflows/:id/test', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const { input } = req.body;

  const execution: WorkflowExecution = {
    id: uuidv4().slice(0, 8),
    workflowId: workflow.id,
    input,
    status: 'running',
    steps: [],
    startedAt: new Date()
  };

  executions.set(execution.id, execution);

  // Simulate execution
  simulateExecution(execution, workflow, input);

  res.status(201).json({ success: true, data: execution });
});

async function simulateExecution(execution: WorkflowExecution, workflow: Workflow, input: Record<string, unknown>) {
  const startTime = Date.now();

  for (const node of workflow.nodes) {
    const step: ExecutionStep = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      input,
      status: 'running',
      latency: 0
    };

    execution.steps.push(step);

    // Simulate node execution
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const success = Math.random() > 0.1;

    step.status = success ? 'success' : 'failed';
    step.latency = Date.now() - startTime;

    if (!success) {
      step.error = 'Simulated error';
      execution.status = 'failed';
      execution.output = { error: step.error };
      break;
    }

    step.output = `Output from ${node.name}`;
    input[node.name] = step.output;
  }

  if (execution.status === 'running') {
    execution.status = 'success';
    execution.output = input;
  }

  execution.completedAt = new Date();
  execution.duration = Date.now() - startTime;

  executions.set(execution.id, execution);
}

// Get execution
app.get('/api/executions/:id', (req, res) => {
  const execution = executions.get(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json({ success: true, data: execution });
});

// List executions
app.get('/api/executions', (req, res) => {
  const { workflowId, status } = req.query;
  let result = Array.from(executions.values());

  if (workflowId) result = result.filter(e => e.workflowId === workflowId);
  if (status) result = result.filter(e => e.status === status);

  result.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  res.json({ success: true, data: result });
});

// Deploy workflow
app.post('/api/workflows/:id/deploy', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  workflow.status = 'production';
  workflow.updatedAt = new Date();
  workflows.set(workflow.id, workflow);

  res.json({ success: true, data: { workflowId: workflow.id, status: 'production', endpoint: `/api/workflows/${workflow.id}/run` } });
});

// Run workflow (production)
app.post('/api/workflows/:id/run', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  if (workflow.status !== 'production') {
    return res.status(400).json({ error: 'Workflow must be deployed first' });
  }

  const { input } = req.body;

  const execution: WorkflowExecution = {
    id: uuidv4().slice(0, 8),
    workflowId: workflow.id,
    input,
    status: 'running',
    steps: [],
    startedAt: new Date()
  };

  executions.set(execution.id, execution);

  // Run async
  simulateExecution(execution, workflow, input);

  res.json({ success: true, data: { executionId: execution.id, status: 'running' } });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI VISUAL WORKFLOW                     ║
║   Drag-drop workflow builder                ║
║   Port: ${PORT}                               ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
