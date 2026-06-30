/**
 * Visual Builder - API Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock workflow data
interface MockWorkflow {
  id: string;
  name: string;
  nodes: any[];
  connections: any[];
  variables: Record<string, any>;
}

interface MockTemplate {
  id: string;
  name: string;
  category: string;
  nodes: any[];
  connections: any[];
}

describe('Visual Builder - API Logic', () => {
  let workflows: Map<string, MockWorkflow>;
  let templates: Map<string, MockTemplate>;
  let history: Map<string, { past: string[]; future: string[] }>;

  beforeEach(() => {
    workflows = new Map();
    templates = new Map();
    history = new Map();
  });

  // Workflow CRUD
  describe('Workflow CRUD', () => {
    it('should create workflow from template', () => {
      const template: MockTemplate = {
        id: 'tmpl_1',
        name: 'Lead Qualification',
        category: 'sales',
        nodes: [{ id: 'n1', type: 'trigger', name: 'Start' }],
        connections: [],
      };
      templates.set('tmpl_1', template);

      const workflow: MockWorkflow = {
        id: 'wf_new',
        name: 'My Workflow',
        nodes: [...template.nodes],
        connections: [...template.connections],
        variables: {},
      };
      workflows.set(workflow.id, workflow);

      expect(workflows.has('wf_new')).toBe(true);
      expect(workflow.nodes.length).toBe(1);
    });

    it('should update workflow name', () => {
      const workflow: MockWorkflow = {
        id: 'wf_1',
        name: 'Original Name',
        nodes: [],
        connections: [],
        variables: {},
      };
      workflows.set(workflow.id, workflow);

      workflow.name = 'Updated Name';
      workflows.set(workflow.id, workflow);

      expect(workflows.get('wf_1')?.name).toBe('Updated Name');
    });

    it('should delete workflow', () => {
      const workflow: MockWorkflow = {
        id: 'wf_1',
        name: 'To Delete',
        nodes: [],
        connections: [],
        variables: {},
      };
      workflows.set(workflow.id, workflow);

      workflows.delete('wf_1');

      expect(workflows.has('wf_1')).toBe(false);
    });
  });

  // Node operations
  describe('Node Operations', () => {
    let workflow: MockWorkflow;

    beforeEach(() => {
      workflow = {
        id: 'wf_1',
        name: 'Test Workflow',
        nodes: [
          { id: 'node_1', type: 'trigger', name: 'Start', x: 100, y: 100, config: {} },
          { id: 'node_2', type: 'ai_agent', name: 'AI Agent', x: 300, y: 100, config: {} },
        ],
        connections: [{ from: 'node_1', to: 'node_2' }],
        variables: {},
      };
      workflows.set(workflow.id, workflow);
    });

    it('should add node to workflow', () => {
      const newNode = { id: 'node_3', type: 'action', name: 'Action', x: 500, y: 100, config: {} };
      workflow.nodes.push(newNode);

      expect(workflow.nodes.length).toBe(3);
      expect(workflow.nodes.find(n => n.id === 'node_3')).toBeDefined();
    });

    it('should update node position', () => {
      const node = workflow.nodes[0];
      node.x = 200;
      node.y = 300;

      expect(workflow.nodes[0].x).toBe(200);
      expect(workflow.nodes[0].y).toBe(300);
    });

    it('should delete node and its connections', () => {
      const nodeId = 'node_2';
      workflow.nodes = workflow.nodes.filter(n => n.id !== nodeId);
      workflow.connections = workflow.connections.filter(c => c.from !== nodeId && c.to !== nodeId);

      expect(workflow.nodes.length).toBe(1);
      expect(workflow.connections.length).toBe(0);
    });

    it('should not allow self-connection', () => {
      const selfConnection = { from: 'node_1', to: 'node_1' };
      const isValid = selfConnection.from !== selfConnection.to;

      expect(isValid).toBe(false);
    });
  });

  // History / Undo-Redo
  describe('Undo/Redo', () => {
    it('should save history on action', () => {
      const workflow: MockWorkflow = {
        id: 'wf_1',
        name: 'Test',
        nodes: [{ id: 'n1', type: 'trigger', name: 'Start', x: 100, y: 100, config: {} }],
        connections: [],
        variables: {},
      };

      const state = JSON.stringify({ nodes: workflow.nodes, connections: workflow.connections });
      history.set(workflow.id, { past: [state], future: [] });

      expect(history.get(workflow.id)?.past.length).toBe(1);
    });

    it('should undo last action', () => {
      history.set('wf_1', {
        past: [JSON.stringify({ nodes: [{ id: 'n1' }], connections: [] })],
        future: [JSON.stringify({ nodes: [{ id: 'n1' }, { id: 'n2' }], connections: [] })],
      });

      const historyEntry = history.get('wf_1');
      if (historyEntry && historyEntry.past.length > 0) {
        // Save current to future
        historyEntry.future.push(JSON.stringify({ nodes: [{ id: 'n1' }, { id: 'n2' }], connections: [] }));
        // Restore previous
        historyEntry.past.pop();

        expect(historyEntry.past.length).toBe(0);
        expect(historyEntry.future.length).toBe(2);
      }
    });

    it('should redo undone action', () => {
      history.set('wf_1', {
        past: [JSON.stringify({ nodes: [{ id: 'n1' }], connections: [] })],
        future: [JSON.stringify({ nodes: [{ id: 'n1' }, { id: 'n2' }], connections: [] })],
      });

      const historyEntry = history.get('wf_1');
      if (historyEntry && historyEntry.future.length > 0) {
        historyEntry.past.push(JSON.stringify({ nodes: [{ id: 'n1' }], connections: [] }));
        const nextState = JSON.parse(historyEntry.future.pop()!);

        expect(nextState.nodes.length).toBe(2);
      }
    });

    it('should limit history to 50 states', () => {
      const historyEntry = { past: [] as string[], future: [] as string[] };

      for (let i = 0; i < 60; i++) {
        historyEntry.past.push(JSON.stringify({ nodes: [{ id: `n${i}` }], connections: [] }));
        if (historyEntry.past.length > 50) {
          historyEntry.past.shift();
        }
      }

      expect(historyEntry.past.length).toBe(50);
    });
  });

  // Templates
  describe('Templates', () => {
    it('should filter templates by category', () => {
      const allTemplates: MockTemplate[] = [
        { id: 't1', name: 'Sales Flow', category: 'sales', nodes: [], connections: [] },
        { id: 't2', name: 'HR Flow', category: 'hr', nodes: [], connections: [] },
        { id: 't3', name: 'Marketing Flow', category: 'marketing', nodes: [], connections: [] },
      ];

      const salesTemplates = allTemplates.filter(t => t.category === 'sales');

      expect(salesTemplates.length).toBe(1);
      expect(salesTemplates[0].id).toBe('t1');
    });

    it('should export workflow as template', () => {
      const workflow: MockWorkflow = {
        id: 'wf_1',
        name: 'My Workflow',
        nodes: [
          { id: 'n1', type: 'trigger', name: 'Start', config: { type: 'webhook' } },
          { id: 'n2', type: 'ai_agent', name: 'Agent', config: {} },
        ],
        connections: [{ from: 'n1', to: 'n2' }],
        variables: {},
      };

      const template = {
        id: workflow.id,
        name: workflow.name,
        category: 'custom',
        version: '1.0.0',
        triggers: workflow.nodes.filter(n => n.type === 'trigger').map(n => n.config),
        nodes: workflow.nodes.map(n => ({ id: n.id, type: n.type, name: n.name, config: n.config })),
        connections: workflow.connections,
      };

      expect(template.triggers.length).toBe(1);
      expect(template.nodes.length).toBe(2);
      expect(template.connections.length).toBe(1);
    });
  });

  // Validation
  describe('Validation', () => {
    it('should validate workflow has trigger', () => {
      const workflow1 = { nodes: [{ type: 'trigger' }], connections: [] };
      const workflow2 = { nodes: [{ type: 'action' }], connections: [] };

      const hasTrigger1 = workflow1.nodes.some((n: any) => n.type === 'trigger');
      const hasTrigger2 = workflow2.nodes.some((n: any) => n.type === 'trigger');

      expect(hasTrigger1).toBe(true);
      expect(hasTrigger2).toBe(false);
    });

    it('should validate no self-loops', () => {
      const connections = [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n1' },
        { from: 'n1', to: 'n1' }, // self-loop
      ];

      const hasSelfLoop = connections.some(c => c.from === c.to);

      expect(hasSelfLoop).toBe(true);
    });

    it('should validate connections reference existing nodes', () => {
      const nodes = [{ id: 'n1' }, { id: 'n2' }];
      const connections = [{ from: 'n1', to: 'n2' }, { from: 'n1', to: 'n99' }];

      const nodeIds = new Set(nodes.map(n => n.id));
      const invalidConnections = connections.filter(c => !nodeIds.has(c.from) || !nodeIds.has(c.to));

      expect(invalidConnections.length).toBe(1);
      expect(invalidConnections[0].to).toBe('n99');
    });

    it('should validate no duplicate connections', () => {
      const connections = [
        { from: 'n1', to: 'n2' },
        { from: 'n1', to: 'n2' }, // duplicate
        { from: 'n2', to: 'n3' },
      ];

      const seen = new Set<string>();
      const duplicates = connections.filter(c => {
        const key = `${c.from}-${c.to}`;
        if (seen.has(key)) return true;
        seen.add(key);
        return false;
      });

      expect(duplicates.length).toBe(1);
    });
  });

  // Zoom/Pan
  describe('Canvas Controls', () => {
    it('should zoom in and out', () => {
      let zoom = 1;
      zoom = Math.min(zoom + 0.1, 2);
      expect(zoom).toBe(1.1);

      zoom = Math.max(zoom - 0.1, 0.5);
      expect(zoom).toBe(1);
    });

    it('should pan canvas', () => {
      let pan = { x: 0, y: 0 };
      pan = { x: pan.x + 100, y: pan.y + 50 };

      expect(pan.x).toBe(100);
      expect(pan.y).toBe(50);
    });

    it('should clamp zoom between 0.5 and 2', () => {
      let zoom = 1;
      zoom = Math.min(Math.max(zoom, 0.5), 2);
      expect(zoom).toBe(1);

      zoom = 3;
      zoom = Math.min(Math.max(zoom, 0.5), 2);
      expect(zoom).toBe(2);

      zoom = 0.1;
      zoom = Math.min(Math.max(zoom, 0.5), 2);
      expect(zoom).toBe(0.5);
    });
  });
});
