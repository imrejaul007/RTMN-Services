/**
 * HOJAI Visual Workflow Builder
 *
 * A drag-drop canvas for building workflow templates.
 * Matches the HOJAI template schema from platform/hojai-templates/
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// Import AI Agent integration
import {
  AI_AGENTS,
  executeAgent,
  registerAgent,
  unregisterAgent,
  getAgent,
  listAgents,
  getAgentCategories,
} from './agent-integration.js';

const app = express();
const PORT = process.env.PORT || 4600;

app.use(express.json({ limit: '10mb' }));

// =============================================================================
// NODE TYPES — Matches HOJAI template schema
// =============================================================================

const NODE_TYPES = {
  // Trigger nodes
  trigger: {
    name: 'Trigger',
    icon: '⚡',
    color: '#10b981',
    description: 'Starts the workflow',
    props: ['type', 'source', 'event']
  },

  // Memory nodes (unique to HOJAI)
  memory: {
    name: 'Memory',
    icon: '🧠',
    color: '#8b5cf6',
    description: 'Load or save memory',
    props: ['action', 'memory_type']
  },

  // Twin nodes (unique to HOJAI)
  twin: {
    name: 'Twin',
    icon: '👥',
    color: '#06b6d4',
    description: 'Create or update digital twin',
    props: ['entity', 'operation']
  },

  // AI Agent nodes
  ai_agent: {
    name: 'AI Agent',
    icon: '🤖',
    color: '#3b82f6',
    description: 'AI worker that performs tasks',
    props: ['agent', 'task', 'model']
  },

  // Intelligence nodes
  intelligence: {
    name: 'Intelligence',
    icon: '📊',
    color: '#f59e0b',
    description: 'Analytics and scoring',
    props: ['type', 'model']
  },

  // SUTAR nodes (unique to HOJAI)
  sutar: {
    name: 'SUTAR',
    icon: '🤝',
    color: '#ec4899',
    description: 'Commerce and negotiation',
    props: ['action', 'entity']
  },

  // Condition nodes
  condition: {
    name: 'Condition',
    icon: '🔀',
    color: '#6366f1',
    description: 'Branch based on condition',
    props: ['field', 'operator', 'value']
  },

  // Action nodes
  action: {
    name: 'Action',
    icon: '⚙️',
    color: '#64748b',
    description: 'Perform an action',
    props: ['action', 'target']
  },

  // Human nodes
  human: {
    name: 'Human',
    icon: '👤',
    color: '#f97316',
    description: 'Human approval or input',
    props: ['type', 'approver']
  },

  // Integration nodes
  integration: {
    name: 'Integration',
    icon: '🔌',
    color: '#84cc16',
    description: 'Connect to external service',
    props: ['provider', 'operation']
  },

  // Notification nodes
  notification: {
    name: 'Notification',
    icon: '📧',
    color: '#14b8a6',
    description: 'Send notification',
    props: ['channel', 'template']
  },

  // CRM nodes
  crm: {
    name: 'CRM',
    icon: '📋',
    color: '#a855f7',
    description: 'CRM operations',
    props: ['action', 'entity']
  }
};

// =============================================================================
// TEMPLATE SCHEMA — Matches platform/hojai-templates/
// =============================================================================

const workflows = new Map();
const templates = new Map();
const workflowHistory = new Map(); // undo/redo stacks
const MAX_HISTORY = 50;

// Helper to save history state
function saveHistory(workflowId) {
  const workflow = workflows.get(workflowId);
  if (!workflow) return;

  if (!workflowHistory.has(workflowId)) {
    workflowHistory.set(workflowId, { past: [], future: [] });
  }

  const history = workflowHistory.get(workflowId);
  history.past.push(JSON.stringify({ nodes: workflow.nodes, connections: workflow.connections }));

  // Limit history size
  if (history.past.length > MAX_HISTORY) {
    history.past.shift();
  }

  // Clear future on new action
  history.future = [];
}

// Undo action
function undo(workflowId) {
  const history = workflowHistory.get(workflowId);
  if (!history || history.past.length === 0) return null;

  const workflow = workflows.get(workflowId);
  if (!workflow) return null;

  // Save current state to future
  history.future.push(JSON.stringify({ nodes: workflow.nodes, connections: workflow.connections }));

  // Restore previous state
  const previous = JSON.parse(history.past.pop());
  workflow.nodes = previous.nodes;
  workflow.connections = previous.connections;

  return workflow;
}

// Redo action
function redo(workflowId) {
  const history = workflowHistory.get(workflowId);
  if (!history || history.future.length === 0) return null;

  const workflow = workflows.get(workflowId);
  if (!workflow) return null;

  // Save current state to past
  history.past.push(JSON.stringify({ nodes: workflow.nodes, connections: workflow.connections }));

  // Restore future state
  const next = JSON.parse(history.future.pop());
  workflow.nodes = next.nodes;
  workflow.connections = next.connections;

  return workflow;
}

// Initialize with sample templates from hojai-templates
const sampleTemplates = [
  {
    id: 'sales-lead-qualification',
    name: 'Lead Qualification Pipeline',
    category: 'sales',
    description: 'Automatically qualify leads from website forms, enrich data, score them, and route to SDR',
    version: '1.0.0',
    triggers: [
      { type: 'webhook', source: 'website_form', event: 'lead.created' }
    ],
    nodes: [
      { id: '1', type: 'trigger', name: 'Lead Created', config: { source: 'website' } },
      { id: '2', type: 'enrichment', name: 'Enrich Lead Data', config: { provider: 'clearbit' } },
      { id: '3', type: 'ai_agent', name: 'Qualify Lead', config: { agent: 'sdr_agent' } },
      { id: '4', type: 'condition', name: 'Score Check', config: { field: 'lead.score', operator: '>=', value: 70 } },
      { id: '5a', type: 'action', name: 'Route to SDR', config: { action: 'assign_sdr', priority: 'high' } },
      { id: '5b', type: 'action', name: 'Add to Nurture', config: { action: 'add_to_sequence' } },
      { id: '6', type: 'crm', name: 'Update CRM', config: { action: 'create_contact' } },
      { id: '7', type: 'notification', name: 'Notify SDR', config: { channel: 'slack', template: 'new_lead_alert' } }
    ],
    connections: [
      { from: '1', to: '2' },
      { from: '2', to: '3' },
      { from: '3', to: '4' },
      { from: '4', to: '5a', condition: 'score >= 70' },
      { from: '4', to: '5b', condition: 'score < 70' },
      { from: '5a', to: '6' },
      { from: '5b', to: '6' },
      { from: '6', to: '7' }
    ]
  },
  {
    id: 'hr-employee-onboarding',
    name: 'Employee Onboarding',
    category: 'hr',
    description: 'Automated employee onboarding workflow',
    nodes: [
      { id: '1', type: 'trigger', name: 'New Employee', config: { type: 'webhook' } },
      { id: '2', type: 'twin', name: 'Create Employee Twin', config: { entity: 'employee', operation: 'create' } },
      { id: '3', type: 'ai_agent', name: 'Generate Offer Letter', config: { agent: 'hr_agent', task: 'generate_offer' } },
      { id: '4', type: 'action', name: 'Send Documents', config: { action: 'email_documents' } },
      { id: '5', type: 'condition', name: 'Docs Signed?', config: { field: 'docs.signed', operator: '==', value: true } },
      { id: '6', type: 'action', name: 'Setup Account', config: { action: 'create_accounts' } },
      { id: '7', type: 'action', name: 'Schedule Orientation', config: { action: 'schedule_meeting' } },
      { id: '8', type: 'memory', name: 'Save Onboarding', config: { action: 'remember', memory_type: 'onboarding' } }
    ]
  }
];

// Load sample templates
sampleTemplates.forEach(t => templates.set(t.id, t));

// =============================================================================
// API ROUTES
// =============================================================================

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'visual-builder', version: '1.0.0' });
});

// Get all node types
app.get('/api/node-types', (req, res) => {
  res.json({ nodeTypes: NODE_TYPES });
});

// Get workflow templates
app.get('/api/templates', (req, res) => {
  const { category } = req.query;
  let result = Array.from(templates.values());
  if (category) {
    result = result.filter(t => t.category === category);
  }
  res.json({ templates: result });
});

// Get single template
app.get('/api/templates/:id', (req, res) => {
  const template = templates.get(req.params.id);
  template ? res.json(template) : res.status(404).json({ error: 'Template not found' });
});

// Create new workflow from template
app.post('/api/workflows', (req, res) => {
  const { templateId, name, projectId } = req.body;

  const template = templateId ? templates.get(templateId) : null;

  const workflow = {
    id: uuidv4(),
    name: name || 'Untitled Workflow',
    projectId,
    templateId,
    nodes: template?.nodes || [],
    connections: template?.connections || [],
    variables: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  workflows.set(workflow.id, workflow);
  res.json(workflow);
});

// Get all workflows
app.get('/api/workflows', (req, res) => {
  const { projectId } = req.query;
  let result = Array.from(workflows.values());
  if (projectId) {
    result = result.filter(w => w.projectId === projectId);
  }
  res.json({ workflows: result });
});

// Get single workflow
app.get('/api/workflows/:id', (req, res) => {
  const workflow = workflows.get(req.params.id);
  workflow ? res.json(workflow) : res.status(404).json({ error: 'Workflow not found' });
});

// Update workflow
app.put('/api/workflows/:id', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const { nodes, connections, variables, name } = req.body;

  if (nodes) workflow.nodes = nodes;
  if (connections) workflow.connections = connections;
  if (variables) workflow.variables = variables;
  if (name) workflow.name = name;
  workflow.updatedAt = new Date().toISOString();

  workflows.set(workflow.id, workflow);
  res.json(workflow);
});

// Add node to workflow
app.post('/api/workflows/:id/nodes', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const { type, position, config } = req.body;
  const nodeType = NODE_TYPES[type];

  if (!nodeType) return res.status(400).json({ error: `Unknown node type: ${type}` });

  const node = {
    id: uuidv4(),
    type,
    name: config?.name || `${nodeType.name} Node`,
    position: position || { x: 100, y: 100 },
    config: config || {}
  };

  workflow.nodes.push(node);
  workflow.updatedAt = new Date().toISOString();

  workflows.set(workflow.id, workflow);
  res.json(node);
});

// Update node
app.put('/api/workflows/:id/nodes/:nodeId', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const nodeIndex = workflow.nodes.findIndex(n => n.id === req.params.nodeId);
  if (nodeIndex === -1) return res.status(404).json({ error: 'Node not found' });

  workflow.nodes[nodeIndex] = { ...workflow.nodes[nodeIndex], ...req.body };
  workflow.updatedAt = new Date().toISOString();

  workflows.set(workflow.id, workflow);
  res.json(workflow.nodes[nodeIndex]);
});

// Delete node
app.delete('/api/workflows/:id/nodes/:nodeId', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  workflow.nodes = workflow.nodes.filter(n => n.id !== req.params.nodeId);
  // Also remove connections to/from this node
  workflow.connections = workflow.connections.filter(
    c => c.from !== req.params.nodeId && c.to !== req.params.nodeId
  );
  workflow.updatedAt = new Date().toISOString();

  workflows.set(workflow.id, workflow);
  res.json({ success: true });
});

// Add connection
app.post('/api/workflows/:id/connections', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const { from, to, condition } = req.body;

  // Validate nodes exist
  const fromNode = workflow.nodes.find(n => n.id === from);
  const toNode = workflow.nodes.find(n => n.id === to);

  if (!fromNode || !toNode) {
    return res.status(400).json({ error: 'Invalid node IDs' });
  }

  const connection = { from, to, condition };
  workflow.connections.push(connection);
  workflow.updatedAt = new Date().toISOString();

  workflows.set(workflow.id, workflow);
  res.json(connection);
});

// Delete connection
app.delete('/api/workflows/:id/connections/:connectionId', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const [from, to] = req.params.connectionId.split('-to-');
  workflow.connections = workflow.connections.filter(
    c => !(c.from === from && c.to === to)
  );
  workflow.updatedAt = new Date().toISOString();

  workflows.set(workflow.id, workflow);
  res.json({ success: true });
});

// Undo
app.post('/api/workflows/:id/undo', (req, res) => {
  const workflow = undo(req.params.id);
  if (!workflow) {
    return res.status(400).json({ error: 'Nothing to undo' });
  }
  workflows.set(req.params.id, workflow);
  res.json({ workflow, action: 'undo' });
});

// Redo
app.post('/api/workflows/:id/redo', (req, res) => {
  const workflow = redo(req.params.id);
  if (!workflow) {
    return res.status(400).json({ error: 'Nothing to redo' });
  }
  workflows.set(req.params.id, workflow);
  res.json({ workflow, action: 'redo' });
});

// History status
app.get('/api/workflows/:id/history', (req, res) => {
  const history = workflowHistory.get(req.params.id);
  if (!history) {
    return res.json({ canUndo: false, canRedo: false });
  }
  res.json({
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undoCount: history.past.length,
    redoCount: history.future.length
  });
});

// Export workflow as template JSON
app.get('/api/workflows/:id/export', (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const template = {
    id: workflow.id,
    name: workflow.name,
    category: req.query.category || 'custom',
    description: `Exported from ${workflow.name}`,
    version: '1.0.0',
    triggers: workflow.nodes
      .filter(n => n.type === 'trigger')
      .map(n => ({ type: n.config.type, source: n.config.source, event: n.config.event })),
    nodes: workflow.nodes.map(n => ({
      id: n.id,
      type: n.type,
      name: n.name,
      config: n.config
    })),
    connections: workflow.connections.map(c => ({
      from: c.from,
      to: c.to,
      condition: c.condition
    }))
  };

  res.json(template);
});

// Delete workflow
app.delete('/api/workflows/:id', (req, res) => {
  workflows.delete(req.params.id);
  res.json({ success: true });
});

// =============================================================================
// AI AGENT INTEGRATION
// =============================================================================

// Get all agents
app.get('/api/agents', (req, res) => {
  const { category } = req.query;
  const agents = category ? listAgents(category) : listAgents();
  res.json({ agents, categories: getAgentCategories() });
});

// Get agent by ID
app.get('/api/agents/:id', (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// Get agents by category
app.get('/api/agents/category/:category', (req, res) => {
  const agents = listAgents(req.params.category);
  res.json({ agents, category: req.params.category });
});

// Execute agent
app.post('/api/agents/:id/execute', async (req, res) => {
  const { task, data, workflowId, nodeId } = req.body;

  if (!task) {
    return res.status(400).json({ error: 'task is required' });
  }

  try {
    const result = await executeAgent(req.params.id, { task, data }, workflowId, nodeId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute agent with full context
app.post('/api/agents/execute', async (req, res) => {
  const { agentId, context, workflowId, nodeId } = req.body;

  if (!agentId || !context) {
    return res.status(400).json({ error: 'agentId and context are required' });
  }

  try {
    const result = await executeAgent(agentId, context, workflowId, nodeId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register custom agent
app.post('/api/agents', (req, res) => {
  const { id, name, category, description, skills, config, memory, twins } = req.body;

  if (!id || !name || !category) {
    return res.status(400).json({ error: 'id, name, and category are required' });
  }

  try {
    const agent = registerAgent({ id, name, category, description, skills, config, memory, twins });
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unregister agent
app.delete('/api/agents/:id', (req, res) => {
  const success = unregisterAgent(req.params.id);
  if (!success) return res.status(404).json({ error: 'Agent not found' });
  res.json({ success: true });
});

// Execute workflow node (connects workflow to agent)
app.post('/api/workflows/:id/nodes/:nodeId/execute', async (req, res) => {
  const workflow = workflows.get(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const node = workflow.nodes.find(n => n.id === req.params.nodeId);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  if (node.type !== 'ai_agent') {
    return res.status(400).json({ error: 'Node is not an AI agent' });
  }

  const { agentId, task, data } = req.body;
  const targetAgent = agentId || node.config?.agent;

  if (!targetAgent) {
    return res.status(400).json({ error: 'No agent specified' });
  }

  try {
    const result = await executeAgent(targetAgent, { task, data }, req.params.id, req.params.nodeId);
    res.json({ success: true, result, nodeId: node.id, agentId: targetAgent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STATIC FILE SERVER (for the React UI)
// =============================================================================

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticPath = join(__dirname, 'public');

// Serve React build if it exists
const indexPath = join(staticPath, 'index.html');
if (existsSync(indexPath)) {
  app.use(express.static(staticPath));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(indexPath);
  });
}

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`🎨 Visual Workflow Builder running on port ${PORT}`);
  console.log(`   - API: http://localhost:${PORT}/api`);
  console.log(`   - Node Types: ${Object.keys(NODE_TYPES).length}`);
  console.log(`   - Templates: ${templates.size}`);
});

export default app;
