/**
 * HOJAI Memory MCP Server
 *
 * Model Context Protocol server for universal AI memory access.
 * Enables Claude, ChatGPT, and any MCP-compatible AI to access HOJAI Memory.
 *
 * Port: 4890
 *
 * MCP Protocol:
 * - Tools: memory_search, memory_store, memory_context, memory_forget
 * - Resources: memory://{twinId}, context://{deptId}
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.MCP_PORT || 4890;

// Memory stores (in production, these would connect to MemoryOS services)
const memories = new Map();
const contextStore = new Map();
const toolRegistry = new Map();

// =============================================================================
// MCP PROTOCOL TYPES
// =============================================================================

/**
 * MCP Request format:
 * {
 *   jsonrpc: "2.0",
 *   id: string,
 *   method: string,
 *   params: {
 *     name: string,
 *     arguments: object
 *   }
 * }
 */

/**
 * MCP Response format:
 * {
 *   jsonrpc: "2.0",
 *   id: string,
 *   result: object | null,
 *   error: { code: number, message: string } | null
 * }
 */

// =============================================================================
// MCP TOOLS REGISTRY
// =============================================================================

// Initialize standard MCP tools
const MCP_TOOLS = {
  // Memory Tools
  memory_search: {
    description: 'Search memories for a user or context',
    inputSchema: {
      type: 'object',
      properties: {
        twinId: { type: 'string', description: 'User/twin identifier' },
        query: { type: 'string', description: 'Search query' },
        mode: { type: 'string', enum: ['keyword', 'semantic', 'hybrid'], default: 'hybrid' },
        limit: { type: 'number', default: 10 }
      },
      required: ['twinId', 'query']
    }
  },

  memory_store: {
    description: 'Store a new memory',
    inputSchema: {
      type: 'object',
      properties: {
        twinId: { type: 'string', description: 'User/twin identifier' },
        content: { type: 'string', description: 'Memory content' },
        type: { type: 'string', description: 'Memory type (knowledge, decision, etc.)' },
        importance: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low', 'Temporary'] },
        tags: { type: 'array', items: { type: 'string' } },
        department: { type: 'string', description: 'Department context' },
        metadata: { type: 'object' }
      },
      required: ['twinId', 'content']
    }
  },

  memory_context: {
    description: 'Get context for a user across all memory levels',
    inputSchema: {
      type: 'object',
      properties: {
        twinId: { type: 'string', description: 'User/twin identifier' },
        department: { type: 'string', description: 'Department context' },
        project: { type: 'string', description: 'Project context' },
        includeWorking: { type: 'boolean', default: true }
      },
      required: ['twinId']
    }
  },

  memory_forget: {
    description: 'Delete a memory (GDPR compliance)',
    inputSchema: {
      type: 'object',
      properties: {
        twinId: { type: 'string', description: 'User/twin identifier' },
        memoryId: { type: 'string', description: 'Memory ID to delete' },
        reason: { type: 'string', description: 'Reason for deletion' }
      },
      required: ['twinId', 'memoryId']
    }
  },

  memory_recall: {
    description: 'Recall specific memories by type or tags',
    inputSchema: {
      type: 'object',
      properties: {
        twinId: { type: 'string', description: 'User/twin identifier' },
        type: { type: 'string', description: 'Memory type filter' },
        tags: { type: 'array', items: { type: 'string' } },
        limit: { type: 'number', default: 10 }
      },
      required: ['twinId']
    }
  },

  memory_learn: {
    description: 'Learn from an interaction and update related memories',
    inputSchema: {
      type: 'object',
      properties: {
        twinId: { type: 'string', description: 'User/twin identifier' },
        interaction: { type: 'string', description: 'What happened' },
        outcome: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
        score: { type: 'number', minimum: 0, maximum: 1 },
        importance: { type: 'string' }
      },
      required: ['twinId', 'interaction', 'outcome']
    }
  },

  // Knowledge Graph Tools
  knowledge_query: {
    description: 'Query the knowledge graph for relationships',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'Entity to query' },
        depth: { type: 'number', default: 2 },
        relationship: { type: 'string', description: 'Filter by relationship type' }
      },
      required: ['entity']
    }
  },

  knowledge_link: {
    description: 'Create a link between two entities',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Source entity' },
        to: { type: 'string', description: 'Target entity' },
        relationship: { type: 'string', description: 'Relationship type' },
        weight: { type: 'number', default: 1 }
      },
      required: ['from', 'to', 'relationship']
    }
  }
};

// =============================================================================
// MCP ENDPOINTS
// =============================================================================

app.use(cors());
app.use(helmet());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'memory-mcp-server',
    port: PORT,
    version: '1.0.0',
    capabilities: {
      tools: Object.keys(MCP_TOOLS).length,
      resources: 2
    }
  });
});

// MCP Protocol: List available tools
app.post('/api/mcp/tools/list', (req, res) => {
  const tools = Object.entries(MCP_TOOLS).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }));

  res.json({
    jsonrpc: '2.0',
    id: req.body?.id || uuidv4(),
    result: { tools }
  });
});

// MCP Protocol: Execute a tool
app.post('/api/mcp/tools/execute', async (req, res) => {
  const { name, arguments: args = {} } = req.body || {};
  const id = req.body?.id || uuidv4();

  if (!name) {
    return res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32600, message: 'Tool name required' }
    });
  }

  const tool = MCP_TOOLS[name];
  if (!tool) {
    return res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Unknown tool: ${name}` }
    });
  }

  try {
    let result;

    switch (name) {
      case 'memory_search':
        result = await executeMemorySearch(args);
        break;
      case 'memory_store':
        result = await executeMemoryStore(args);
        break;
      case 'memory_context':
        result = await executeMemoryContext(args);
        break;
      case 'memory_forget':
        result = await executeMemoryForget(args);
        break;
      case 'memory_recall':
        result = await executeMemoryRecall(args);
        break;
      case 'memory_learn':
        result = await executeMemoryLearn(args);
        break;
      case 'knowledge_query':
        result = await executeKnowledgeQuery(args);
        break;
      case 'knowledge_link':
        result = await executeKnowledgeLink(args);
        break;
      default:
        result = { error: 'Tool not implemented' };
    }

    res.json({
      jsonrpc: '2.0',
      id,
      result
    });
  } catch (error) {
    res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: error.message }
    });
  }
});

// MCP Protocol: Batch execute multiple tools
app.post('/api/mcp/tools/batch', async (req, res) => {
  const { calls = [] } = req.body || {};
  const results = [];

  for (const call of calls) {
    try {
      const result = await executeTool(call.name, call.arguments || {});
      results.push({ id: call.id, result, error: null });
    } catch (error) {
      results.push({ id: call.id, result: null, error: { code: -32603, message: error.message } });
    }
  }

  res.json({
    jsonrpc: '2.0',
    id: req.body?.id || uuidv4(),
    result: { results }
  });
});

// =============================================================================
// MCP RESOURCES
// =============================================================================

// Get memory resource
app.get('/api/mcp/resources/memory/:twinId', (req, res) => {
  const { twinId } = req.params;
  const userMemories = Array.from(memories.values())
    .filter(m => m.twinId === twinId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    uri: `memory://${twinId}`,
    twinId,
    count: userMemories.length,
    memories: userMemories.slice(0, 50)
  });
});

// Get context resource
app.get('/api/mcp/resources/context/:scope/:id', (req, res) => {
  const { scope, id } = req.params;
  const key = `${scope}:${id}`;
  const context = contextStore.get(key);

  res.json({
    uri: `context://${scope}/${id}`,
    scope,
    id,
    context: context || null
  });
});

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

async function executeMemorySearch(args) {
  const { twinId, query, mode = 'hybrid', limit = 10 } = args;

  // In production, this would call MemoryOS search endpoint
  const results = Array.from(memories.values())
    .filter(m => m.twinId === twinId)
    .filter(m =>
      m.content.toLowerCase().includes(query.toLowerCase()) ||
      (m.tags || []).some(t => t.toLowerCase().includes(query.toLowerCase()))
    )
    .slice(0, limit)
    .map(m => ({
      id: m.id,
      content: m.content,
      type: m.type,
      importance: m.importance,
      score: m.content.toLowerCase().includes(query.toLowerCase()) ? 1 : 0.5
    }));

  return {
    twinId,
    query,
    mode,
    count: results.length,
    results
  };
}

async function executeMemoryStore(args) {
  const { twinId, content, type = 'knowledge', importance = 'Medium', tags = [], department, metadata = {} } = args;

  const memory = {
    id: uuidv4(),
    twinId,
    content,
    type,
    importance,
    tags,
    department: department || null,
    metadata,
    confidence: 0.5,
    accessCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  memories.set(memory.id, memory);

  // Also add to context
  const contextKey = `user:${twinId}`;
  if (!contextStore.has(contextKey)) {
    contextStore.set(contextKey, { twinId, memories: [] });
  }
  const ctx = contextStore.get(contextKey);
  ctx.memories.push(memory.id);

  return {
    success: true,
    memoryId: memory.id,
    memory
  };
}

async function executeMemoryContext(args) {
  const { twinId, department, project, includeWorking = true } = args;

  const context = {
    user: null,
    department: null,
    project: null,
    company: null
  };

  // Get user context
  const userCtx = contextStore.get(`user:${twinId}`);
  if (userCtx) {
    context.user = {
      twinId,
      memoryCount: userCtx.memories?.length || 0,
      recentMemories: userCtx.memories?.slice(-5).map(id => memories.get(id)).filter(Boolean) || []
    };
  }

  // Get department context
  if (department) {
    const deptCtx = contextStore.get(`department:${department}`);
    if (deptCtx) context.department = deptCtx;
  }

  // Get project context
  if (project) {
    const projCtx = contextStore.get(`project:${project}`);
    if (projCtx) context.project = projCtx;
  }

  return context;
}

async function executeMemoryForget(args) {
  const { twinId, memoryId, reason = 'user_request' } = args;

  const memory = memories.get(memoryId);
  if (!memory || memory.twinId !== twinId) {
    return { success: false, error: 'Memory not found or access denied' };
  }

  memories.delete(memoryId);

  // Remove from context
  const ctx = contextStore.get(`user:${twinId}`);
  if (ctx && ctx.memories) {
    ctx.memories = ctx.memories.filter(id => id !== memoryId);
  }

  return {
    success: true,
    deleted: memoryId,
    reason
  };
}

async function executeMemoryRecall(args) {
  const { twinId, type, tags, limit = 10 } = args;

  let results = Array.from(memories.values())
    .filter(m => m.twinId === twinId);

  if (type) {
    results = results.filter(m => m.type === type);
  }

  if (tags && tags.length > 0) {
    results = results.filter(m =>
      (m.tags || []).some(t => tags.includes(t))
    );
  }

  results = results
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  return {
    twinId,
    count: results.length,
    memories: results
  };
}

async function executeMemoryLearn(args) {
  const { twinId, interaction, outcome, score = 0.5, importance = 'Medium' } = args;

  // Create learning memory
  const memory = await executeMemoryStore({
    twinId,
    content: `[${outcome}] ${interaction}`,
    type: 'learning',
    importance,
    tags: [outcome, 'learned']
  });

  // Find and reinforce related memories
  const relatedMemories = Array.from(memories.values())
    .filter(m => m.twinId === twinId)
    .filter(m => m.content.toLowerCase().includes(interaction.toLowerCase().split(' ')[0]))
    .slice(0, 5);

  for (const related of relatedMemories) {
    if (outcome === 'positive') {
      related.confidence = Math.min(1, related.confidence + 0.1);
    } else if (outcome === 'negative') {
      related.confidence = Math.max(0, related.confidence - 0.1);
    }
    related.accessCount = (related.accessCount || 0) + 1;
    memories.set(related.id, related);
  }

  return {
    learned: memory.memoryId,
    relatedReinforced: relatedMemories.length,
    outcome
  };
}

async function executeKnowledgeQuery(args) {
  const { entity, depth = 2, relationship } = args;

  // Simple BFS traversal of knowledge graph
  const visited = new Set();
  const queue = [{ id: entity, level: 0 }];
  const results = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (visited.has(current.id) || current.level > depth) continue;
    visited.add(current.id);

    const ctx = contextStore.get(`entity:${current.id}`);
    if (ctx) {
      results.push({
        id: current.id,
        level: current.level,
        relationships: ctx.links || []
      });

      for (const link of (ctx.links || [])) {
        if (!relationship || link.rel === relationship) {
          queue.push({ id: link.to, level: current.level + 1 });
        }
      }
    }
  }

  return {
    entity,
    depth,
    count: results.length,
    graph: results
  };
}

async function executeKnowledgeLink(args) {
  const { from, to, relationship, weight = 1 } = args;

  const fromKey = `entity:${from}`;
  const fromCtx = contextStore.get(fromKey) || { id: from, links: [] };

  fromCtx.links = fromCtx.links || [];
  fromCtx.links.push({ to, rel: relationship, weight });

  contextStore.set(fromKey, fromCtx);

  return {
    success: true,
    link: { from, to, relationship, weight }
  };
}

async function executeTool(name, args) {
  // Route to appropriate handler
  const handlers = {
    memory_search: executeMemorySearch,
    memory_store: executeMemoryStore,
    memory_context: executeMemoryContext,
    memory_forget: executeMemoryForget,
    memory_recall: executeMemoryRecall,
    memory_learn: executeMemoryLearn,
    knowledge_query: executeKnowledgeQuery,
    knowledge_link: executeKnowledgeLink
  };

  const handler = handlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return await handler(args);
}

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`[MCP Server] HOJAI Memory MCP Server running on port ${PORT}`);
  console.log(`[MCP Server] Available tools: ${Object.keys(MCP_TOOLS).join(', ')}`);
  console.log(`[MCP Server] Protocol: JSON-RPC 2.0`);
});

export default app;
