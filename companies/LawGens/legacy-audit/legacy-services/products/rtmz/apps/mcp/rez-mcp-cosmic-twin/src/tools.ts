// Tool definitions for Cosmic Twin MCP Server
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface CreateTwinParams {
  name: string;
  type: 'user' | 'product' | 'system' | 'process';
  attributes: Record<string, unknown>;
}

export interface GetTwinStateParams {
  twinId: string;
}

export interface UpdateTwinParams {
  twinId: string;
  attributes: Record<string, unknown>;
}

export interface GetHistoryParams {
  twinId: string;
  limit?: number;
}

export interface AddRelationshipParams {
  sourceId: string;
  targetId: string;
  type: string;
  strength?: number;
}

export interface RestoreSnapshotParams {
  snapshotId: string;
}

function generateTwinId(): string {
  return `TWIN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateSnapshotId(): string {
  return `SNAP_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateMockTwin(params: CreateTwinParams): {
  id: string;
  name: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships: Array<{ targetId: string; type: string; strength: number }>;
  lastUpdated: string;
  version: number;
} {
  return {
    id: generateTwinId(),
    name: params.name,
    type: params.type,
    attributes: params.attributes,
    relationships: [],
    lastUpdated: new Date().toISOString(),
    version: 1
  };
}

function generateMockTwinState(twinId: string): {
  id: string;
  name: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships: Array<{ targetId: string; type: string; strength: number }>;
  lastUpdated: string;
  version: number;
  metrics?: {
    healthScore?: number;
    activityLevel?: number;
    lastActivity?: string;
  };
} {
  return {
    id: twinId,
    name: `Twin ${twinId.slice(-6)}`,
    type: 'user',
    attributes: {
      email: 'user@example.com',
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      },
      usageStats: {
        totalLogins: 245,
        avgSessionDuration: 1800,
        lastLogin: new Date().toISOString()
      }
    },
    relationships: [
      { targetId: 'TWIN_001', type: 'knows', strength: 0.8 },
      { targetId: 'TWIN_002', type: 'purchased', strength: 0.6 },
      { targetId: 'TWIN_003', type: 'viewed', strength: 0.4 }
    ],
    lastUpdated: new Date().toISOString(),
    version: 15,
    metrics: {
      healthScore: 92,
      activityLevel: 78,
      lastActivity: new Date().toISOString()
    }
  };
}

function generateMockHistory(twinId: string, limit: number = 10): Array<{
  timestamp: string;
  action: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  actor?: string;
}> {
  const actions = [
    'attribute_updated',
    'relationship_added',
    'relationship_removed',
    'snapshot_created',
    'state_changed',
    'profile_updated'
  ];
  
  return Array.from({ length: limit }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    action: actions[i % actions.length],
    previousState: i % 2 === 0 ? { version: i, updatedAt: new Date(Date.now() - (i + 1) * 3600000).toISOString() } : undefined,
    newState: { version: i + 1, updatedAt: new Date(Date.now() - i * 3600000).toISOString() },
    actor: ['system', 'user@example.com', 'api_service'][i % 3]
  }));
}

function generateMockSnapshots(twinId: string): Array<{
  id: string;
  twinId: string;
  state: Record<string, unknown>;
  createdAt: string;
  label?: string;
}> {
  return [
    {
      id: generateSnapshotId(),
      twinId,
      state: generateMockTwinState(twinId),
      createdAt: new Date().toISOString(),
      label: 'Current State'
    },
    {
      id: generateSnapshotId(),
      twinId,
      state: { ...generateMockTwinState(twinId), version: 10 },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      label: 'Daily Backup'
    },
    {
      id: generateSnapshotId(),
      twinId,
      state: { ...generateMockTwinState(twinId), version: 5 },
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      label: 'Weekly Backup'
    }
  ];
}

export const tools: Tool[] = [
  {
    name: "create_twin",
    description: "Create a new digital twin with specified attributes",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the twin"
        },
        type: {
          type: "string",
          enum: ["user", "product", "system", "process"],
          description: "Type of twin"
        },
        attributes: {
          type: "object",
          description: "Initial attributes for the twin"
        }
      },
      required: ["name", "type", "attributes"]
    }
  },
  {
    name: "get_twin_state",
    description: "Get the current state of a digital twin",
    inputSchema: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "ID of the twin"
        }
      },
      required: ["twinId"]
    }
  },
  {
    name: "update_twin",
    description: "Update attributes of an existing digital twin",
    inputSchema: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "ID of the twin to update"
        },
        attributes: {
          type: "object",
          description: "Attributes to update"
        }
      },
      required: ["twinId", "attributes"]
    }
  },
  {
    name: "get_history",
    description: "Get the history of state changes for a twin",
    inputSchema: {
      type: "object",
      properties: {
        twinId: {
          type: "string",
          description: "ID of the twin"
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          description: "Maximum number of history entries to return"
        }
      },
      required: ["twinId"]
    }
  },
  {
    name: "add_relationship",
    description: "Add a relationship between two twins",
    inputSchema: {
      type: "object",
      properties: {
        sourceId: {
          type: "string",
          description: "Source twin ID"
        },
        targetId: {
          type: "string",
          description: "Target twin ID"
        },
        type: {
          type: "string",
          enum: ["knows", "owns", "purchased", "viewed", "depends_on", "parent_of", "related_to"],
          description: "Type of relationship"
        },
        strength: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Relationship strength (0-1)"
        }
      },
      required: ["sourceId", "targetId", "type"]
    }
  },
  {
    name: "restore_snapshot",
    description: "Restore a twin to a previous snapshot state",
    inputSchema: {
      type: "object",
      properties: {
        snapshotId: {
          type: "string",
          description: "ID of the snapshot to restore"
        }
      },
      required: ["snapshotId"]
    }
  }
];

export const toolHandlers: Record<string, (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>> = {
  create_twin: async (params) => {
    const twin = generateMockTwin(params as unknown as CreateTwinParams);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          twin,
          message: `Twin '${twin.name}' created successfully`
        }, null, 2)
      }]
    };
  },

  get_twin_state: async (params) => {
    const { twinId } = params as unknown as GetTwinStateParams;
    const state = generateMockTwinState(twinId);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          state,
          message: 'Twin state retrieved successfully'
        }, null, 2)
      }]
    };
  },

  update_twin: async (params) => {
    const { twinId, attributes } = params as unknown as UpdateTwinParams;
    const state = generateMockTwinState(twinId);
    state.attributes = { ...state.attributes, ...attributes };
    state.lastUpdated = new Date().toISOString();
    state.version += 1;
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          state,
          message: 'Twin updated successfully'
        }, null, 2)
      }]
    };
  },

  get_history: async (params) => {
    const { twinId, limit } = params as unknown as GetHistoryParams;
    const history = generateMockHistory(twinId, limit || 10);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          twinId,
          history,
          summary: {
            totalEntries: history.length,
            oldestEntry: history[history.length - 1]?.timestamp,
            newestEntry: history[0]?.timestamp,
            actionsBreakdown: history.reduce((acc, entry) => {
              acc[entry.action] = (acc[entry.action] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          },
          message: `Retrieved ${history.length} history entries`
        }, null, 2)
      }]
    };
  },

  add_relationship: async (params) => {
    const { sourceId, targetId, type, strength } = params as unknown as AddRelationshipParams;
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          relationship: {
            id: `REL_${Date.now()}`,
            sourceId,
            targetId,
            type,
            strength: strength || 0.5,
            createdAt: new Date().toISOString()
          },
          message: `Relationship '${type}' added between twins`
        }, null, 2)
      }]
    };
  },

  restore_snapshot: async (params) => {
    const { snapshotId } = params as unknown as RestoreSnapshotParams;
    const state = generateMockTwinState('TWIN_RESTORED');
    state.id = snapshotId;
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          restoredState: state,
          snapshotId,
          message: 'Snapshot restored successfully'
        }, null, 2)
      }]
    };
  }
};
