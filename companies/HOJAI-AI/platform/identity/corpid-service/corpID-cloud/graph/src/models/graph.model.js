/**
 * CorpID Cloud - Identity Graph
 * Network of relationships between all identity types
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const nodes = new Map(); // nodeId -> Node
export const edges = new Map(); // edgeId -> Edge
export const nodeIndex = new Map(); // entityId+type -> nodeId
export const edgeIndex = new Map(); // sourceNodeId -> [edgeIds]

// ============ NODE TYPES ============

export const NODE_TYPES = {
  USER: 'user',
  ORGANIZATION: 'organization',
  DEPARTMENT: 'department',
  TEAM: 'team',
  CONSUMER: 'consumer',
  MERCHANT: 'merchant',
  BRANCH: 'branch',
  AGENT: 'agent',
  DEVICE: 'device',
  API_KEY: 'api_key',
  TWIN: 'twin'
};

// ============ EDGE TYPES (RELATIONSHIPS) ============

export const EDGE_TYPES = {
  OWNS: 'owns',
  MEMBER_OF: 'member_of',
  MANAGES: 'manages',
  REPORTS_TO: 'reports_to',
  PARTNER_OF: 'partner_of',
  SUPPLIES_TO: 'supplies_to',
  PARENT_OF: 'parent_of',
  CHILD_OF: 'child_of',
  LINKED_TO: 'linked_to',
  CREATED: 'created',
  USES: 'uses',
  TRUSTS: 'trusts',
  MANAGES_DEPARTMENT: 'manages_department',
  MEMBER_OF_TEAM: 'member_of_team',
  OWNS_BRANCH: 'owns_branch',
  OWNS_MERCHANT: 'owns_merchant',
  OWNS_AGENT: 'owns_agent',
  FOLLOWS: 'follows',
  CONNECTED_TO: 'connected_to'
};

// ============ NODE FACTORY ============

/**
 * Create or get a node
 */
export function getOrCreateNode(entityType, entityId, properties = {}) {
  const indexKey = `${entityType}:${entityId}`;
  let nodeId = nodeIndex.get(indexKey);

  if (!nodeId) {
    nodeId = `node-${uuidv4().slice(0, 12)}`;
    const node = {
      id: nodeId,
      entityType,
      entityId,
      properties: {
        name: properties.name || null,
        avatar: properties.avatar || null,
        status: properties.status || 'active',
        ...properties
      },
      metrics: {
        degree: 0,          // Number of connections
        centrality: 0,      // Importance in graph
        firstSeen: new Date().toISOString(),
        lastActive: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    };

    nodes.set(nodeId, node);
    nodeIndex.set(indexKey, nodeId);
  } else {
    // Update properties if provided
    const node = nodes.get(nodeId);
    node.properties = { ...node.properties, ...properties };
    node.metrics.lastActive = new Date().toISOString();
    nodes.set(nodeId, node);
  }

  return nodes.get(nodeId);
}

/**
 * Get node by ID
 */
export function getNodeById(nodeId) {
  return nodes.get(nodeId) || null;
}

/**
 * Get node by entity
 */
export function getNodeByEntity(entityType, entityId) {
  const indexKey = `${entityType}:${entityId}`;
  const nodeId = nodeIndex.get(indexKey);
  return nodeId ? nodes.get(nodeId) : null;
}

// ============ EDGE FACTORY ============

/**
 * Create an edge (relationship)
 */
export function createEdge(sourceNodeId, targetNodeId, type, properties = {}) {
  // Check for existing edge
  const sourceEdges = edgeIndex.get(sourceNodeId) || [];
  for (const edgeId of sourceEdges) {
    const existing = edges.get(edgeId);
    if (existing && existing.targetNodeId === targetNodeId && existing.type === type) {
      // Update properties
      existing.properties = { ...existing.properties, ...properties };
      existing.updatedAt = new Date().toISOString();
      edges.set(edgeId, existing);
      return existing;
    }
  }

  const edgeId = `edge-${uuidv4().slice(0, 12)}`;
  const edge = {
    id: edgeId,
    sourceNodeId,
    targetNodeId,
    type,
    properties: {
      since: properties.since || new Date().toISOString(),
      role: properties.role || null,
      verified: properties.verified ?? false,
      strength: properties.strength || 50, // 0-100
      metadata: properties.metadata || {},
      ...properties
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  edges.set(edgeId, edge);

  // Update indices
  const sourceList = edgeIndex.get(sourceNodeId) || [];
  sourceList.push(edgeId);
  edgeIndex.set(sourceNodeId, sourceList);

  // Update node metrics
  updateNodeDegree(sourceNodeId);
  updateNodeDegree(targetNodeId);

  return edge;
}

/**
 * Update node degree
 */
function updateNodeDegree(nodeId) {
  const node = nodes.get(nodeId);
  if (!node) return;

  const outgoing = (edgeIndex.get(nodeId) || []).length;
  let incoming = 0;

  for (const [sourceId, edgeList] of edgeIndex.entries()) {
    for (const edgeId of edgeList) {
      const edge = edges.get(edgeId);
      if (edge.targetNodeId === nodeId) incoming++;
    }
  }

  node.metrics.degree = outgoing + incoming;
  nodes.set(nodeId, node);
}

// ============ QUERY FUNCTIONS ============

/**
 * Get all edges for a node
 */
export function getNodeEdges(nodeId, direction = 'all') {
  const result = [];

  // Outgoing
  if (direction === 'all' || direction === 'outgoing') {
    const outgoing = edgeIndex.get(nodeId) || [];
    for (const edgeId of outgoing) {
      const edge = edges.get(edgeId);
      if (edge) result.push({ ...edge, direction: 'outgoing' });
    }
  }

  // Incoming
  if (direction === 'all' || direction === 'incoming') {
    for (const [sourceId, edgeList] of edgeIndex.entries()) {
      for (const edgeId of edgeList) {
        const edge = edges.get(edgeId);
        if (edge && edge.targetNodeId === nodeId) {
          result.push({ ...edge, direction: 'incoming' });
        }
      }
    }
  }

  return result;
}

/**
 * Get related nodes
 */
export function getRelatedNodes(nodeId, edgeType = null, depth = 1) {
  const visited = new Set();
  const result = new Set();
  const queue = [{ nodeId, currentDepth: 0 }];

  while (queue.length > 0) {
    const { nodeId: currentId, currentDepth } = queue.shift();

    if (visited.has(currentId) || currentDepth > depth) continue;
    visited.add(currentId);

    if (currentDepth > 0) {
      result.add(currentId);
    }

    if (currentDepth < depth) {
      const edges = getNodeEdges(currentId);
      for (const edge of edges) {
        const nextId = edge.direction === 'outgoing' ? edge.targetNodeId : edge.sourceNodeId;
        if (!visited.has(nextId) && (!edgeType || edge.type === edgeType)) {
          queue.push({ nodeId: nextId, currentDepth: currentDepth + 1 });
        }
      }
    }
  }

  return Array.from(result).map(id => nodes.get(id)).filter(Boolean);
}

/**
 * Get shortest path between two nodes (BFS)
 */
export function getShortestPath(sourceNodeId, targetNodeId) {
  if (sourceNodeId === targetNodeId) return [nodes.get(sourceNodeId)];

  const visited = new Set();
  const queue = [[sourceNodeId]];

  while (queue.length > 0) {
    const path = queue.shift();
    const lastNode = path[path.length - 1];

    if (visited.has(lastNode)) continue;
    visited.add(lastNode);

    if (lastNode === targetNodeId) {
      return path.map(id => nodes.get(id));
    }

    const edges = getNodeEdges(lastNode);
    for (const edge of edges) {
      const nextId = edge.direction === 'outgoing' ? edge.targetNodeId : edge.sourceNodeId;
      if (!visited.has(nextId)) {
        queue.push([...path, nextId]);
      }
    }
  }

  return null;
}

/**
 * Get graph statistics
 */
export function getGraphStats() {
  const nodeList = Array.from(nodes.values());
  const edgeList = Array.from(edges.values());

  const byType = {};
  for (const node of nodeList) {
    byType[node.entityType] = (byType[node.entityType] || 0) + 1;
  }

  const edgeByType = {};
  for (const edge of edgeList) {
    edgeByType[edge.type] = (edgeByType[edge.type] || 0) + 1;
  }

  return {
    totalNodes: nodeList.length,
    totalEdges: edgeList.length,
    nodesByType: byType,
    edgesByType: edgeByType,
    averageDegree: nodeList.length > 0
      ? Math.round(nodeList.reduce((sum, n) => sum + n.metrics.degree, 0) / nodeList.length)
      : 0,
    density: nodeList.length > 1
      ? (edgeList.length / (nodeList.length * (nodeList.length - 1))).toFixed(4)
      : 0
  };
}

/**
 * Find common connections between two nodes
 */
export function findCommonConnections(nodeId1, nodeId2) {
  const connections1 = new Set(getRelatedNodes(nodeId1, null, 1).map(n => n.id));
  const connections2 = new Set(getRelatedNodes(nodeId2, null, 1).map(n => n.id));

  const common = new Set();
  for (const id of connections1) {
    if (connections2.has(id) && id !== nodeId1 && id !== nodeId2) {
      common.add(id);
    }
  }

  return Array.from(common).map(id => nodes.get(id));
}

// ============ DELETE ============

/**
 * Delete edge
 */
export function deleteEdge(edgeId) {
  const edge = edges.get(edgeId);
  if (!edge) return false;

  edges.delete(edgeId);

  // Update source index
  const sourceList = edgeIndex.get(edge.sourceNodeId) || [];
  const updated = sourceList.filter(id => id !== edgeId);
  edgeIndex.set(edge.sourceNodeId, updated);

  // Update metrics
  updateNodeDegree(edge.sourceNodeId);
  updateNodeDegree(edge.targetNodeId);

  return true;
}
