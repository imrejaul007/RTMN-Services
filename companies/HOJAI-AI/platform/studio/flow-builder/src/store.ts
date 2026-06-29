/**
 * HOJAI Flow Builder - Store
 * State management for flow editor
 */

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

// Node types
export type NodeType =
  | 'trigger'
  | 'action'
  | 'ai_agent'
  | 'condition'
  | 'filter'
  | 'transform'
  | 'approval'
  | 'memory'
  | 'twin'
  | 'crm'
  | 'email'
  | 'sms'
  | 'slack'
  | 'calendar'
  | 'document'
  | 'webhook'
  | 'schedule'
  | 'actor'
  | 'analytics'
  | 'end';

export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  type: NodeType;
  config: Record<string, any>;
  description?: string;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
  width?: number;
  height?: number;
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  condition?: string;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  connections: Connection[];
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface FlowStore {
  // Flow state
  flow: Flow;

  // Selection
  selectedNodeId: string | null;
  selectedConnectionId: string | null;

  // UI state
  isDragging: boolean;
  isConnecting: boolean;
  zoom: number;
  panOffset: Position;

  // Actions
  setFlow: (flow: Flow) => void;
  addNode: (type: NodeType, position: Position) => string;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: Partial<NodeData>) => void;
  moveNode: (nodeId: string, position: Position) => void;

  addConnection: (source: string, target: string, condition?: string) => void;
  removeConnection: (connectionId: string) => void;

  selectNode: (nodeId: string | null) => void;
  selectConnection: (connectionId: string | null) => void;

  setDragging: (isDragging: boolean) => void;
  setConnecting: (isConnecting: boolean) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Position) => void;

  saveFlow: () => Flow;
  loadFlow: (flow: Flow) => void;
  newFlow: () => void;
}

const defaultFlow: Flow = {
  id: uuid(),
  name: 'Untitled Flow',
  nodes: [],
  connections: [],
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useFlowStore = create<FlowStore>((set, get) => ({
  // Initial state
  flow: { ...defaultFlow },
  selectedNodeId: null,
  selectedConnectionId: null,
  isDragging: false,
  isConnecting: false,
  zoom: 1,
  panOffset: { x: 0, y: 0 },

  // Flow actions
  setFlow: (flow) => set({ flow }),

  addNode: (type, position) => {
    const id = uuid();
    const nodeData = getDefaultNodeData(type);

    set((state) => ({
      flow: {
        ...state.flow,
        nodes: [
          ...state.flow.nodes,
          {
            id,
            type,
            position,
            data: nodeData,
          },
        ],
        updatedAt: new Date().toISOString(),
      },
    }));

    return id;
  },

  removeNode: (nodeId) => {
    set((state) => ({
      flow: {
        ...state.flow,
        nodes: state.flow.nodes.filter((n) => n.id !== nodeId),
        connections: state.flow.connections.filter(
          (c) => c.source !== nodeId && c.target !== nodeId
        ),
        updatedAt: new Date().toISOString(),
      },
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
  },

  updateNode: (nodeId, data) => {
    set((state) => ({
      flow: {
        ...state.flow,
        nodes: state.flow.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, ...data } }
            : n
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  moveNode: (nodeId, position) => {
    set((state) => ({
      flow: {
        ...state.flow,
        nodes: state.flow.nodes.map((n) =>
          n.id === nodeId ? { ...n, position } : n
        ),
      },
    }));
  },

  addConnection: (source, target, condition) => {
    // Prevent self-connections
    if (source === target) return;

    // Prevent duplicate connections
    const exists = get().flow.connections.some(
      (c) => c.source === source && c.target === target
    );
    if (exists) return;

    const id = uuid();
    set((state) => ({
      flow: {
        ...state.flow,
        connections: [
          ...state.flow.connections,
          { id, source, target, condition },
        ],
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  removeConnection: (connectionId) => {
    set((state) => ({
      flow: {
        ...state.flow,
        connections: state.flow.connections.filter(
          (c) => c.id !== connectionId
        ),
        updatedAt: new Date().toISOString(),
      },
      selectedConnectionId:
        state.selectedConnectionId === connectionId
          ? null
          : state.selectedConnectionId,
    }));
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedConnectionId: null }),
  selectConnection: (connectionId) => set({ selectedConnectionId: connectionId, selectedNodeId: null }),

  setDragging: (isDragging) => set({ isDragging }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(2, zoom)) }),
  setPanOffset: (panOffset) => set({ panOffset }),

  saveFlow: () => {
    const flow = get().flow;
    // Save to localStorage
    localStorage.setItem(`flow_${flow.id}`, JSON.stringify(flow));
    return flow;
  },

  loadFlow: (flow) => set({ flow, selectedNodeId: null, selectedConnectionId: null }),

  newFlow: () =>
    set({
      flow: {
        ...defaultFlow,
        id: uuid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      selectedNodeId: null,
      selectedConnectionId: null,
    }),
}));

// Helper to get default node data
function getDefaultNodeData(type: NodeType): NodeData {
  const defaults: Record<NodeType, Partial<NodeData>> = {
    trigger: {
      label: 'Trigger',
      description: 'Start of the flow',
      config: { type: 'webhook' },
    },
    action: {
      label: 'Action',
      description: 'Perform an action',
      config: {},
    },
    ai_agent: {
      label: 'AI Agent',
      description: 'Run AI agent',
      config: { agent: '', model: 'claude-3-5-sonnet' },
    },
    condition: {
      label: 'Condition',
      description: 'Branch based on condition',
      config: { field: '', operator: '==', value: '' },
    },
    filter: {
      label: 'Filter',
      description: 'Filter data',
      config: { conditions: [] },
    },
    transform: {
      label: 'Transform',
      description: 'Transform data',
      config: { mapping: {} },
    },
    approval: {
      label: 'Approval',
      description: 'Request human approval',
      config: { approvers: [], timeout: 24 },
    },
    memory: {
      label: 'Memory',
      description: 'Save/load from memory',
      config: { action: 'save', memory_type: '' },
    },
    twin: {
      label: 'Twin',
      description: 'Create/update twin',
      config: { twin: '', action: 'update' },
    },
    crm: {
      label: 'CRM',
      description: 'CRM operations',
      config: { action: 'create_contact', fields: [] },
    },
    email: {
      label: 'Email',
      description: 'Send email',
      config: { provider: 'smtp', template: '' },
    },
    sms: {
      label: 'SMS',
      description: 'Send SMS',
      config: { provider: 'twilio' },
    },
    slack: {
      label: 'Slack',
      description: 'Send Slack message',
      config: { channel: '', template: '' },
    },
    calendar: {
      label: 'Calendar',
      description: 'Calendar operations',
      config: { action: 'create_event' },
    },
    document: {
      label: 'Document',
      description: 'Generate document',
      config: { format: 'pdf', template: '' },
    },
    webhook: {
      label: 'Webhook',
      description: 'Send webhook',
      config: { url: '', method: 'POST' },
    },
    schedule: {
      label: 'Schedule',
      description: 'Scheduled trigger',
      config: { cron: '' },
    },
    actor: {
      label: 'Actor',
      description: 'Web data extraction',
      config: { actor: '', filters: [] },
    },
    analytics: {
      label: 'Analytics',
      description: 'Track analytics',
      config: { event: '', properties: {} },
    },
    end: {
      label: 'End',
      description: 'End of flow',
      config: {},
    },
  };

  return {
    label: defaults[type]?.label || type,
    description: defaults[type]?.description || '',
    type,
    config: defaults[type]?.config || {},
  };
}
