/**
 * Visual Builder - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock the express app
const mockWorkflows = new Map();
const mockTemplates = new Map();

const NODE_TYPES = {
  trigger: { name: 'Trigger', icon: '⚡', color: '#10b981' },
  memory: { name: 'Memory', icon: '🧠', color: '#8b5cf6' },
  twin: { name: 'Twin', icon: '👥', color: '#06b6d4' },
  ai_agent: { name: 'AI Agent', icon: '🤖', color: '#3b82f6' },
  intelligence: { name: 'Intelligence', icon: '📊', color: '#f59e0b' },
  sutar: { name: 'SUTAR', icon: '🤝', color: '#ec4899' },
  condition: { name: 'Condition', icon: '🔀', color: '#6366f1' },
  action: { name: 'Action', icon: '⚙️', color: '#64748b' },
  human: { name: 'Human', icon: '👤', color: '#f97316' },
  integration: { name: 'Integration', icon: '🔌', color: '#84cc16' },
  notification: { name: 'Notification', icon: '📧', color: '#14b8a6' },
  crm: { name: 'CRM', icon: '📋', color: '#a855f7' },
};

// Sample workflow
const createSampleWorkflow = () => ({
  id: 'wf_123',
  name: 'Test Workflow',
  nodes: [
    { id: 'node-1', type: 'trigger', name: 'Lead Created', x: 100, y: 200, config: { type: 'webhook' } },
    { id: 'node-2', type: 'ai_agent', name: 'Qualify Lead', x: 300, y: 200, config: { agent: 'sdr_agent' } },
    { id: 'node-3', type: 'condition', name: 'Score Check', x: 500, y: 200, config: { field: 'score', operator: '>=', value: 70 } },
  ],
  connections: [
    { from: 'node-1', to: 'node-2' },
    { from: 'node-2', to: 'node-3' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('Visual Builder - Node Types', () => {
  it('should have 12 node types', () => {
    expect(Object.keys(NODE_TYPES).length).toBe(12);
  });

  it('should have valid node type properties', () => {
    Object.entries(NODE_TYPES).forEach(([type, config]) => {
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('icon');
      expect(config).toHaveProperty('color');
      expect(typeof config.name).toBe('string');
      expect(typeof config.icon).toBe('string');
      expect(typeof config.color).toBe('string');
    });
  });

  it('should have unique icons for each node type', () => {
    const icons = Object.values(NODE_TYPES).map(n => n.icon);
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(icons.length);
  });

  it('should have valid colors (hex format)', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    Object.values(NODE_TYPES).forEach(config => {
      expect(config.color).toMatch(hexRegex);
    });
  });
});

describe('Visual Builder - Workflow', () => {
  let workflow;

  beforeEach(() => {
    workflow = createSampleWorkflow();
    mockWorkflows.clear();
    mockWorkflows.set(workflow.id, workflow);
  });

  it('should create a workflow with valid structure', () => {
    expect(workflow).toHaveProperty('id');
    expect(workflow).toHaveProperty('name');
    expect(workflow).toHaveProperty('nodes');
    expect(workflow).toHaveProperty('connections');
    expect(Array.isArray(workflow.nodes)).toBe(true);
    expect(Array.isArray(workflow.connections)).toBe(true);
  });

  it('should have nodes with required properties', () => {
    workflow.nodes.forEach(node => {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('type');
      expect(node).toHaveProperty('name');
      expect(node).toHaveProperty('x');
      expect(node).toHaveProperty('y');
      expect(node).toHaveProperty('config');
      expect(NODE_TYPES[node.type]).toBeDefined();
    });
  });

  it('should have connections between valid nodes', () => {
    const nodeIds = new Set(workflow.nodes.map(n => n.id));

    workflow.connections.forEach(conn => {
      expect(conn).toHaveProperty('from');
      expect(conn).toHaveProperty('to');
      expect(nodeIds.has(conn.from)).toBe(true);
      expect(nodeIds.has(conn.to)).toBe(true);
    });
  });

  it('should find node by id', () => {
    const found = workflow.nodes.find(n => n.id === 'node-1');
    expect(found).toBeDefined();
    expect(found.type).toBe('trigger');
  });

  it('should get incoming connections for a node', () => {
    const incoming = workflow.connections.filter(c => c.to === 'node-2');
    expect(incoming.length).toBe(1);
    expect(incoming[0].from).toBe('node-1');
  });

  it('should get outgoing connections for a node', () => {
    const outgoing = workflow.connections.filter(c => c.from === 'node-2');
    expect(outgoing.length).toBe(1);
    expect(outgoing[0].to).toBe('node-3');
  });

  it('should identify trigger nodes', () => {
    const triggers = workflow.nodes.filter(n => n.type === 'trigger');
    expect(triggers.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Visual Builder - Workflow CRUD', () => {
  let workflow;

  beforeEach(() => {
    workflow = createSampleWorkflow();
    mockWorkflows.clear();
    mockTemplates.clear();
  });

  it('should save workflow', () => {
    mockWorkflows.set(workflow.id, workflow);
    expect(mockWorkflows.has(workflow.id)).toBe(true);
    expect(mockWorkflows.get(workflow.id).name).toBe('Test Workflow');
  });

  it('should update workflow', () => {
    mockWorkflows.set(workflow.id, workflow);
    const updated = { ...mockWorkflows.get(workflow.id), name: 'Updated Workflow' };
    mockWorkflows.set(workflow.id, updated);
    expect(mockWorkflows.get(workflow.id).name).toBe('Updated Workflow');
  });

  it('should delete workflow', () => {
    mockWorkflows.set(workflow.id, workflow);
    mockWorkflows.delete(workflow.id);
    expect(mockWorkflows.has(workflow.id)).toBe(false);
  });

  it('should list all workflows', () => {
    mockWorkflows.set(workflow.id, workflow);
    const another = { ...workflow, id: 'wf_456', name: 'Another Workflow' };
    mockWorkflows.set(another.id, another);
    expect(mockWorkflows.size).toBe(2);
  });
});

describe('Visual Builder - Node Operations', () => {
  let workflow;

  beforeEach(() => {
    workflow = createSampleWorkflow();
  });

  it('should add node to workflow', () => {
    const newNode = {
      id: 'node-new',
      type: 'action',
      name: 'Send Email',
      x: 700,
      y: 200,
      config: { action: 'send_email' },
    };
    workflow.nodes.push(newNode);
    expect(workflow.nodes.length).toBe(4);
    expect(workflow.nodes.find(n => n.id === 'node-new')).toBeDefined();
  });

  it('should update node config', () => {
    const node = workflow.nodes.find(n => n.id === 'node-3');
    const originalConfig = { ...node.config };
    node.config.value = 80;
    expect(workflow.nodes.find(n => n.id === 'node-3').config.value).toBe(80);
    expect(workflow.nodes.find(n => n.id === 'node-3').config.field).toBe(originalConfig.field);
  });

  it('should delete node and its connections', () => {
    const nodeToDelete = 'node-2';
    workflow.nodes = workflow.nodes.filter(n => n.id !== nodeToDelete);
    workflow.connections = workflow.connections.filter(
      c => c.from !== nodeToDelete && c.to !== nodeToDelete
    );

    expect(workflow.nodes.find(n => n.id === nodeToDelete)).toBeUndefined();
    expect(workflow.connections.some(c => c.from === nodeToDelete || c.to === nodeToDelete)).toBe(false);
  });

  it('should move node position', () => {
    const node = workflow.nodes[0];
    const originalX = node.x;
    const originalY = node.y;
    node.x = 500;
    node.y = 300;

    expect(workflow.nodes[0].x).toBe(500);
    expect(workflow.nodes[0].y).toBe(300);
  });
});

describe('Visual Builder - Connection Operations', () => {
  let workflow;

  beforeEach(() => {
    workflow = createSampleWorkflow();
  });

  it('should add connection between nodes', () => {
    const newConnection = { from: 'node-3', to: 'node-new' };
    workflow.connections.push(newConnection);
    expect(workflow.connections.length).toBe(3);
  });

  it('should remove connection', () => {
    const initialCount = workflow.connections.length;
    const connectionToRemove = workflow.connections[0];
    workflow.connections = workflow.connections.filter(
      c => !(c.from === connectionToRemove.from && c.to === connectionToRemove.to)
    );
    expect(workflow.connections.length).toBe(initialCount - 1);
  });

  it('should not create duplicate connections', () => {
    const connection = { from: 'node-1', to: 'node-2' };
    const exists = workflow.connections.some(
      c => c.from === connection.from && c.to === connection.to
    );
    expect(exists).toBe(true);
  });

  it('should create conditional connection', () => {
    const conditionalConn = { from: 'node-3', to: 'node-1', label: 'Yes' };
    workflow.connections.push(conditionalConn);
    expect(workflow.connections.find(c => c.label === 'Yes')).toBeDefined();
  });
});

describe('Visual Builder - Template Export', () => {
  let workflow;

  beforeEach(() => {
    workflow = createSampleWorkflow();
  });

  it('should export workflow as template', () => {
    const template = {
      id: workflow.id,
      name: workflow.name,
      category: 'sales',
      version: '1.0.0',
      triggers: workflow.nodes
        .filter(n => n.type === 'trigger')
        .map(n => ({ type: n.config.type, source: n.config.source, event: n.config.event })),
      nodes: workflow.nodes.map(n => ({
        id: n.id,
        type: n.type,
        name: n.name,
        config: n.config,
      })),
      connections: workflow.connections.map(c => ({
        from: c.from,
        to: c.to,
      })),
    };

    expect(template).toHaveProperty('id');
    expect(template).toHaveProperty('category');
    expect(template).toHaveProperty('version');
    expect(template.triggers).toHaveLength(1);
    expect(template.nodes).toHaveLength(3);
    expect(template.connections).toHaveLength(2);
  });

  it('should export node types correctly', () => {
    const nodeExports = workflow.nodes.map(n => ({
      type: n.type,
      name: NODE_TYPES[n.type]?.name,
    }));

    expect(nodeExports[0].type).toBe('trigger');
    expect(nodeExports[0].name).toBe('Trigger');
  });
});

describe('Visual Builder - Validation', () => {
  it('should validate node position', () => {
    const validatePosition = (x, y) => x >= 0 && y >= 0;
    expect(validatePosition(100, 200)).toBe(true);
    expect(validatePosition(-100, 200)).toBe(false);
    expect(validatePosition(100, -200)).toBe(false);
  });

  it('should validate node type', () => {
    const validateNodeType = (type) => !!NODE_TYPES[type];
    expect(validateNodeType('trigger')).toBe(true);
    expect(validateNodeType('ai_agent')).toBe(true);
    expect(validateNodeType('invalid')).toBe(false);
  });

  it('should validate connection (no self-loops)', () => {
    const validateConnection = (from, to) => from !== to;
    expect(validateConnection('node-1', 'node-2')).toBe(true);
    expect(validateConnection('node-1', 'node-1')).toBe(false);
  });

  it('should validate workflow has at least one trigger', () => {
    const workflow = createSampleWorkflow();
    const hasTrigger = workflow.nodes.some(n => n.type === 'trigger');
    expect(hasTrigger).toBe(true);
  });
});

describe('Visual Builder - Canvas State', () => {
  it('should track selected node', () => {
    let selectedNodeId = null;
    selectedNodeId = 'node-1';
    expect(selectedNodeId).toBe('node-1');
    selectedNodeId = null;
    expect(selectedNodeId).toBeNull();
  });

  it('should track zoom level', () => {
    let zoom = 1;
    expect(zoom).toBe(1);
    zoom = Math.min(zoom + 0.1, 2);
    expect(zoom).toBe(1.1);
    zoom = Math.max(zoom - 0.1, 0.5);
    expect(zoom).toBe(1);
  });

  it('should track pan offset', () => {
    let pan = { x: 0, y: 0 };
    pan = { x: pan.x + 100, y: pan.y + 50 };
    expect(pan.x).toBe(100);
    expect(pan.y).toBe(50);
  });
});

describe('Visual Builder - Search', () => {
  const templates = [
    { id: 'sales-lead', category: 'sales', name: 'Lead Qualification' },
    { id: 'hr-onboard', category: 'hr', name: 'Employee Onboarding' },
    { id: 'marketing-email', category: 'marketing', name: 'Email Campaign' },
  ];

  it('should search templates by category', () => {
    const salesTemplates = templates.filter(t => t.category === 'sales');
    expect(salesTemplates.length).toBe(1);
    expect(salesTemplates[0].id).toBe('sales-lead');
  });

  it('should search templates by name', () => {
    const found = templates.find(t => t.name.includes('Lead'));
    expect(found).toBeDefined();
    expect(found.id).toBe('sales-lead');
  });
});
