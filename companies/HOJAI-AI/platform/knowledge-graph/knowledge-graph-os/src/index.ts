import { requireAuth } from '@rtmn/shared/auth';
/**
 * KnowledgeGraphOS - Production-Ready Knowledge Graph Service
 * ===========================================================
 * A comprehensive knowledge graph with:
 * - Nodes (entities) with types, properties, and temporal versioning
 * - Edges (relationships) with weights and metadata
 * - Graph traversal algorithms (BFS, DFS, Dijkstra, A*)
 * - Cypher-like query language
 * - Entity resolution and deduplication
 * - Community detection (Louvain algorithm)
 * - Path finding (shortest path, all paths)
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// ============================================
// TYPES AND INTERFACES
// ============================================

interface NodeVersion {
  id: string;
  nodeId: string;
  version: number;
  properties: Record<string, unknown>;
  timestamp: string;
  createdBy: string;
}

interface GraphNode {
  id: string;
  type: string;
  labels: string[];
  properties: Record<string, unknown>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
    createdBy: string;
    deprecated: boolean;
    deprecatedAt?: string;
  };
  embeddings?: number[];
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  properties: Record<string, unknown>;
  weight: number;
  bidirectional: boolean;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  };
}

interface TraversalResult {
  nodeId: string;
  depth: number;
  path: string[];
  relationships: { type: string; nodeId: string }[];
}

interface PathResult {
  found: boolean;
  path: string[];
  edges: GraphEdge[];
  length: number;
  totalWeight: number;
}

interface Community {
  id: number;
  nodes: string[];
  modularity: number;
}

interface QueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    executionTime: number;
  };
}

// ============================================
// KNOWLEDGE GRAPH STORE
// ============================================

class KnowledgeGraphStore {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacency: Map<string, Map<string, Set<string>>> = new Map();
  private nodeVersions: Map<string, NodeVersion[]> = new Map();
  private edgeIndex: Map<string, Set<string>> = new Map();
  private typeIndex: Map<string, Set<string>> = new Map();
  private labelIndex: Map<string, Set<string>> = new Map();

  // Statistics
  private stats = {
    totalNodesCreated: 0,
    totalEdgesCreated: 0,
    totalQueries: 0,
    totalTraversals: 0,
    lastCompact: new Date().toISOString()
  };

  // ============================================
  // NODE OPERATIONS
  // ============================================

  createNode(input: {
    id?: string;
    type: string;
    labels?: string[];
    properties?: Record<string, unknown>;
    metadata?: Partial<GraphNode['metadata']>;
    embeddings?: number[];
  }): GraphNode {
    const id = input.id || `node_${uuidv4()}`;
    const now = new Date().toISOString();

    if (this.nodes.has(id)) {
      throw new Error(`Node with id ${id} already exists`);
    }

    const node: GraphNode = {
      id,
      type: input.type,
      labels: input.labels || [input.type],
      properties: input.properties || {},
      metadata: {
        createdAt: now,
        updatedAt: now,
        version: 1,
        createdBy: input.metadata?.createdBy || 'system',
        deprecated: false,
        ...input.metadata
      },
      embeddings: input.embeddings
    };

    this.nodes.set(id, node);
    this.stats.totalNodesCreated++;

    // Update indexes
    this.updateTypeIndex(node);
    this.updateLabelIndex(node);

    // Store initial version
    this.storeVersion(node, 'create');

    return node;
  }

  getNode(id: string): GraphNode | undefined {
    const node = this.nodes.get(id);
    if (node && node.metadata.deprecated) {
      return undefined;
    }
    return node;
  }

  updateNode(
    id: string,
    updates: {
      properties?: Record<string, unknown>;
      labels?: string[];
      type?: string;
      deprecated?: boolean;
    },
    userId = 'system'
  ): GraphNode | undefined {
    const node = this.nodes.get(id);
    if (!node) return undefined;

    if (updates.properties) {
      node.properties = { ...node.properties, ...updates.properties };
    }
    if (updates.labels) {
      node.labels = updates.labels;
      this.updateLabelIndex(node);
    }
    if (updates.type) {
      node.type = updates.type;
      this.updateTypeIndex(node);
    }
    if (updates.deprecated !== undefined) {
      node.metadata.deprecated = updates.deprecated;
      node.metadata.deprecatedAt = updates.deprecated ? new Date().toISOString() : undefined;
    }

    node.metadata.updatedAt = new Date().toISOString();
    node.metadata.version++;

    this.storeVersion(node, 'update', userId);
    return node;
  }

  deleteNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Delete all edges involving this node
    for (const [edgeId, edge] of this.edges) {
      if (edge.from === id || edge.to === id) {
        this.edges.delete(edgeId);
      }
    }

    // Update adjacency
    this.adjacency.delete(id);
    for (const adj of this.adjacency.values()) {
      for (const types of adj.values()) {
        types.delete(id);
      }
    }

    // Remove from indexes
    this.typeIndex.get(node.type)?.delete(id);
    this.labelIndex.get(node.type)?.delete(id);

    this.nodes.delete(id);
    return true;
  }

  findNodes(query: {
    type?: string;
    labels?: string[];
    properties?: Record<string, unknown>;
    propertyFilter?: { key: string; operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains'; value: unknown }[];
    limit?: number;
    offset?: number;
    deprecated?: boolean;
  }): GraphNode[] {
    let results = Array.from(this.nodes.values());

    if (!query.deprecated) {
      results = results.filter(n => !n.metadata.deprecated);
    }
    if (query.type) {
      results = results.filter(n => n.type === query.type);
    }
    if (query.labels && query.labels.length > 0) {
      results = results.filter(n => query.labels!.every(l => n.labels.includes(l)));
    }
    if (query.properties) {
      results = results.filter(n => {
        for (const [key, value] of Object.entries(query.properties!)) {
          if (n.properties[key] !== value) return false;
        }
        return true;
      });
    }
    if (query.propertyFilter && query.propertyFilter.length > 0) {
      results = results.filter(n => {
        return query.propertyFilter!.every(filter => {
          const propValue = n.properties[filter.key];
          switch (filter.operator) {
            case 'eq': return propValue === filter.value;
            case 'ne': return propValue !== filter.value;
            case 'gt': return typeof propValue === 'number' && propValue > filter.value;
            case 'lt': return typeof propValue === 'number' && propValue < filter.value;
            case 'gte': return typeof propValue === 'number' && propValue >= filter.value;
            case 'lte': return typeof propValue === 'number' && propValue <= filter.value;
            case 'contains': return String(propValue).includes(String(filter.value));
            default: return true;
          }
        });
      });
    }

    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return results.slice(offset, offset + limit);
  }

  // ============================================
  // EDGE OPERATIONS
  // ============================================

  createEdge(input: {
    from: string;
    to: string;
    type: string;
    properties?: Record<string, unknown>;
    weight?: number;
    bidirectional?: boolean;
    createdBy?: string;
  }): GraphEdge | undefined {
    // Verify nodes exist
    if (!this.nodes.has(input.from) || !this.nodes.has(input.to)) {
      throw new Error('Source or target node not found');
    }

    const id = `edge_${uuidv4()}`;
    const now = new Date().toISOString();

    const edge: GraphEdge = {
      id,
      from: input.from,
      to: input.to,
      type: input.type,
      properties: input.properties || {},
      weight: input.weight ?? 1,
      bidirectional: input.bidirectional || false,
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy || 'system'
      }
    };

    this.edges.set(id, edge);
    this.stats.totalEdgesCreated++;

    // Update adjacency lists
    this.updateAdjacency(edge);

    // Update edge index
    this.updateEdgeIndex(edge);

    // Bidirectional edge: create reverse adjacency
    if (edge.bidirectional) {
      this.updateAdjacency({
        ...edge,
        id: `edge_${uuidv4()}_rev`,
        from: edge.to,
        to: edge.from
      });
    }

    return edge;
  }

  getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  getEdges(query?: { from?: string; to?: string; type?: string; limit?: number }): GraphEdge[] {
    let results = Array.from(this.edges.values());

    if (query?.from) {
      results = results.filter(e => e.from === query.from || e.to === query.from);
    }
    if (query?.to) {
      results = results.filter(e => e.from === query.to || e.to === query.to);
    }
    if (query?.type) {
      results = results.filter(e => e.type === query.type);
    }

    const limit = query?.limit || 100;
    return results.slice(0, limit);
  }

  deleteEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;

    // Remove from adjacency
    const adj = this.adjacency.get(edge.from);
    if (adj) {
      adj.get(edge.type)?.delete(edge.to);
    }

    this.edges.delete(id);
    return true;
  }

  // ============================================
  // TRAVERSAL ALGORITHMS
  // ============================================

  /**
   * Breadth-First Search traversal
   */
  bfs(
    startId: string,
    options: {
      maxDepth?: number;
      direction?: 'outbound' | 'inbound' | 'both';
      types?: string[];
      limit?: number;
    } = {}
  ): TraversalResult[] {
    const { maxDepth = 10, direction = 'both', types = [], limit = 1000 } = options;
    const visited = new Map<string, { depth: number; path: string[]; relationships: { type: string; nodeId: string }[] }>();
    const queue: { id: string; depth: number; path: string[]; relationships: { type: string; nodeId: string }[] }[] = [];

    visited.set(startId, { depth: 0, path: [startId], relationships: [] });
    queue.push({ id: startId, depth: 0, path: [startId], relationships: [] });

    while (queue.length > 0 && visited.size < limit) {
      const current = queue.shift()!;

      if (current.depth >= maxDepth) continue;

      const neighbors = this.getNeighbors(current.id, direction);

      for (const neighbor of neighbors) {
        if (types.length > 0 && !types.includes(neighbor.edgeType)) continue;

        if (!visited.has(neighbor.nodeId)) {
          visited.set(neighbor.nodeId, {
            depth: current.depth + 1,
            path: [...current.path, neighbor.nodeId],
            relationships: [...current.relationships, { type: neighbor.edgeType, nodeId: neighbor.nodeId }]
          });

          queue.push({
            id: neighbor.nodeId,
            depth: current.depth + 1,
            path: visited.get(neighbor.nodeId)!.path,
            relationships: visited.get(neighbor.nodeId)!.relationships
          });
        }
      }
    }

    this.stats.totalTraversals++;

    return Array.from(visited.entries())
      .filter(([id]) => id !== startId)
      .map(([id, data]) => ({ nodeId: id, ...data }));
  }

  /**
   * Depth-First Search traversal
   */
  dfs(
    startId: string,
    options: {
      maxDepth?: number;
      direction?: 'outbound' | 'inbound' | 'both';
      types?: string[];
      limit?: number;
    } = {}
  ): TraversalResult[] {
    const { maxDepth = 10, direction = 'both', types = [], limit = 1000 } = options;
    const visited = new Set<string>();
    const results: TraversalResult[] = [];

    const dfsRecursive = (
      nodeId: string,
      depth: number,
      path: string[],
      relationships: { type: string; nodeId: string }[]
    ) => {
      if (depth > maxDepth || results.length >= limit) return;

      const neighbors = this.getNeighbors(nodeId, direction);

      for (const neighbor of neighbors) {
        if (types.length > 0 && !types.includes(neighbor.edgeType)) continue;

        if (!visited.has(neighbor.nodeId)) {
          visited.add(neighbor.nodeId);
          const newPath = [...path, neighbor.nodeId];
          const newRelationships = [...relationships, { type: neighbor.edgeType, nodeId: neighbor.nodeId }];

          results.push({
            nodeId: neighbor.nodeId,
            depth: depth + 1,
            path: newPath,
            relationships: newRelationships
          });

          dfsRecursive(neighbor.nodeId, depth + 1, newPath, newRelationships);
        }
      }
    };

    visited.add(startId);
    dfsRecursive(startId, 0, [startId], []);

    this.stats.totalTraversals++;

    return results;
  }

  /**
   * Dijkstra's shortest path algorithm
   */
  dijkstra(
    fromId: string,
    toId: string,
    options: {
      edgeTypes?: string[];
      direction?: 'outbound' | 'inbound' | 'both';
      maxWeight?: number;
    } = {}
  ): PathResult {
    const { edgeTypes = [], direction = 'outbound', maxWeight = Infinity } = options;

    const distances = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edge: GraphEdge } | null>();
    const visited = new Set<string>();

    distances.set(fromId, 0);
    previous.set(fromId, null);

    const pq: { nodeId: string; distance: number }[] = [{ nodeId: fromId, distance: 0 }];

    while (pq.length > 0) {
      // Get minimum distance node
      pq.sort((a, b) => a.distance - b.distance);
      const current = pq.shift()!;

      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      if (current.nodeId === toId) break;

      const neighbors = this.getNeighbors(current.nodeId, direction);

      for (const neighbor of neighbors) {
        if (edgeTypes.length > 0 && !edgeTypes.includes(neighbor.edgeType)) continue;
        if (visited.has(neighbor.nodeId)) continue;

        const edge = this.edges.get(neighbor.edgeId);
        if (!edge) continue;

        const newDist = distances.get(current.nodeId)! + edge.weight;

        if (newDist < (distances.get(neighbor.nodeId) ?? Infinity) && newDist <= maxWeight) {
          distances.set(neighbor.nodeId, newDist);
          previous.set(neighbor.nodeId, { nodeId: current.nodeId, edge });
          pq.push({ nodeId: neighbor.nodeId, distance: newDist });
        }
      }
    }

    // Reconstruct path
    if (!distances.has(toId)) {
      return { found: false, path: [], edges: [], length: -1, totalWeight: -1 };
    }

    const path: string[] = [];
    const pathEdges: GraphEdge[] = [];
    let current: string | null = toId;

    while (current !== null) {
      path.unshift(current);
      const prev = previous.get(current);
      if (prev) {
        pathEdges.unshift(prev.edge);
      }
      current = prev?.nodeId || null;
    }

    return {
      found: true,
      path,
      edges: pathEdges,
      length: path.length - 1,
      totalWeight: distances.get(toId)!
    };
  }

  /**
   * A* pathfinding algorithm
   */
  astar(
    fromId: string,
    toId: string,
    heuristic: (nodeId: string) => number,
    options: {
      edgeTypes?: string[];
      direction?: 'outbound' | 'inbound' | 'both';
    } = {}
  ): PathResult {
    const { edgeTypes = [], direction = 'outbound' } = options;

    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edge: GraphEdge } | null>();
    const visited = new Set<string>();

    gScore.set(fromId, 0);
    fScore.set(fromId, heuristic(fromId));
    previous.set(fromId, null);

    const openSet: { nodeId: string; f: number }[] = [{ nodeId: fromId, f: fScore.get(fromId)! }];

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.nodeId === toId) {
        // Reconstruct path
        const path: string[] = [];
        const pathEdges: GraphEdge[] = [];
        let curr: string | null = toId;

        while (curr !== null) {
          path.unshift(curr);
          const prev = previous.get(curr);
          if (prev) pathEdges.unshift(prev.edge);
          curr = prev?.nodeId || null;
        }

        return {
          found: true,
          path,
          edges: pathEdges,
          length: path.length - 1,
          totalWeight: gScore.get(toId)!
        };
      }

      visited.add(current.nodeId);

      const neighbors = this.getNeighbors(current.nodeId, direction);

      for (const neighbor of neighbors) {
        if (edgeTypes.length > 0 && !edgeTypes.includes(neighbor.edgeType)) continue;
        if (visited.has(neighbor.nodeId)) continue;

        const edge = this.edges.get(neighbor.edgeId);
        if (!edge) continue;

        const tentativeG = gScore.get(current.nodeId)! + edge.weight;

        if (tentativeG < (gScore.get(neighbor.nodeId) ?? Infinity)) {
          previous.set(neighbor.nodeId, { nodeId: current.nodeId, edge });
          gScore.set(neighbor.nodeId, tentativeG);
          const f = tentativeG + heuristic(neighbor.nodeId);
          fScore.set(neighbor.nodeId, f);

          if (!openSet.find(n => n.nodeId === neighbor.nodeId)) {
            openSet.push({ nodeId: neighbor.nodeId, f });
          }
        }
      }
    }

    return { found: false, path: [], edges: [], length: -1, totalWeight: -1 };
  }

  /**
   * Find all simple paths between two nodes
   */
  findAllPaths(
    fromId: string,
    toId: string,
    options: {
      maxDepth?: number;
      maxPaths?: number;
      edgeTypes?: string[];
    } = {}
  ): PathResult[] {
    const { maxDepth = 10, maxPaths = 100, edgeTypes = [] } = options;
    const paths: PathResult[] = [];

    const dfsPaths = (
      current: string,
      path: string[],
      edges: GraphEdge[],
      visited: Set<string>
    ) => {
      if (paths.length >= maxPaths) return;
      if (path.length > maxDepth) return;

      if (current === toId) {
        paths.push({
          found: true,
          path: [...path],
          edges: [...edges],
          length: path.length - 1,
          totalWeight: edges.reduce((sum, e) => sum + e.weight, 0)
        });
        return;
      }

      const neighbors = this.getNeighbors(current, 'outbound');

      for (const neighbor of neighbors) {
        if (edgeTypes.length > 0 && !edgeTypes.includes(neighbor.edgeType)) continue;

        const edge = this.edges.get(neighbor.edgeId);
        if (!edge) continue;

        if (!visited.has(neighbor.nodeId)) {
          visited.add(neighbor.nodeId);
          dfsPaths(neighbor.nodeId, [...path, neighbor.nodeId], [...edges, edge], visited);
          visited.delete(neighbor.nodeId);
        }
      }
    };

    const visited = new Set<string>([fromId]);
    dfsPaths(fromId, [fromId], [], visited);

    return paths;
  }

  /**
   * Louvain community detection algorithm
   */
  detectCommunities(options: {
    resolution?: number;
    maxIterations?: number;
  } = {}): Community[] {
    const { resolution = 1, maxIterations = 100 } = options;

    // Initialize: each node is its own community
    const nodeCommunities = new Map<string, number>();
    const communityNodes = new Map<number, Set<string>>();
    let communityId = 0;

    for (const nodeId of this.nodes.keys()) {
      nodeCommunities.set(nodeId, communityId);
      communityNodes.set(communityId, new Set([nodeId]));
      communityId++;
    }

    let totalWeight = 0;
    const edgeWeights = new Map<string, number>();

    for (const edge of this.edges.values()) {
      totalWeight += edge.weight;
      edgeWeights.set(edge.id, edge.weight);
    }

    const m2 = totalWeight * 2;
    let improved = true;
    let iteration = 0;

    while (improved && iteration < maxIterations) {
      improved = false;
      iteration++;

      for (const nodeId of this.nodes.keys()) {
        const currentCommunity = nodeCommunities.get(nodeId)!;
        const neighbors = this.getNeighbors(nodeId, 'both');

        // Calculate weights for each neighboring community
        const communityWeights = new Map<number, number>();

        for (const neighbor of neighbors) {
          const neighborCommunity = nodeCommunities.get(neighbor.nodeId)!;
          const edge = this.edges.get(neighbor.edgeId);
          if (!edge) continue;

          const currentWeight = communityWeights.get(neighborCommunity) || 0;
          communityWeights.set(neighborCommunity, currentWeight + edge.weight);
        }

        // Calculate self-weight (loops)
        let selfWeight = 0;
        for (const edge of this.edges.values()) {
          if (edge.from === nodeId && edge.to === nodeId) {
            selfWeight += edge.weight;
          }
        }

        // Find best community to move to
        let bestCommunity = currentCommunity;
        let bestGain = 0;

        for (const [community, weight] of communityWeights) {
          if (community === currentCommunity) continue;

          const ki = this.getNodeDegree(nodeId);
          const sigmaTot = this.getCommunityTotalWeight(community, communityNodes);

          const deltaQ = weight - (ki * sigmaTot * resolution) / m2;

          if (deltaQ > bestGain) {
            bestGain = deltaQ;
            bestCommunity = community;
          }
        }

        // Move node if there's a gain
        if (bestCommunity !== currentCommunity && bestGain > 0) {
          // Remove from old community
          communityNodes.get(currentCommunity)!.delete(nodeId);

          // Add to new community
          nodeCommunities.set(nodeId, bestCommunity);
          if (!communityNodes.has(bestCommunity)) {
            communityNodes.set(bestCommunity, new Set());
          }
          communityNodes.get(bestCommunity)!.add(nodeId);

          improved = true;
        }
      }
    }

    // Calculate modularity for each community
    const communities: Community[] = [];

    for (const [commId, nodes] of communityNodes) {
      if (nodes.size > 0) {
        const modularity = this.calculateModularity(commId, nodes, m2, resolution);
        communities.push({
          id: commId,
          nodes: Array.from(nodes),
          modularity
        });
      }
    }

    return communities.sort((a, b) => b.modularity - a.modularity);
  }

  // ============================================
  // CYPHER-LIKE QUERY LANGUAGE
  // ============================================

  executeQuery(query: string): QueryResult {
    const startTime = Date.now();
    this.stats.totalQueries++;

    // Parse simple Cypher-like patterns
    // Supported patterns:
    // - MATCH (n:Type) - find nodes by type
    // - MATCH (n) WHERE n.property = 'value'
    // - MATCH (n)-[r:REL_TYPE]->(m)
    // - RETURN n, m

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Simple pattern: MATCH (n:Type)
    const nodeTypeMatch = query.match(/MATCH\s*\(\s*(\w+)(?::(\w+))?\)/gi);
    if (nodeTypeMatch) {
      const typeMatch = query.match(/MATCH\s*\(\s*\w+:(\w+)\)/i);
      if (typeMatch) {
        const found = this.findNodes({ type: typeMatch[1], limit: 1000 });
        nodes.push(...found);
      }
    }

    // Pattern: MATCH (n)-[r:REL]->(m)
    const edgePatternMatch = query.match(/\(\s*(\w+)\s*\)-?\[?\s*(\w*):?(\w*)\]?->?\(\s*(\w+)\s*\)/gi);
    if (edgePatternMatch) {
      for (const match of edgePatternMatch) {
        const patternMatch = match.match(/\(\s*(\w+)\s*\)-?\[?\s*(\w*):?(\w*)\]?->?\(\s*(\w+)\s*\)/i);
        if (patternMatch) {
          const [, from, , relType, to] = patternMatch;
          const found = this.getEdges({ type: relType, limit: 1000 });
          edges.push(...found.filter(e =>
            e.type === relType &&
            this.nodes.has(e.from) &&
            this.nodes.has(e.to)
          ));
        }
      }
    }

    // WHERE clause
    const whereMatch = query.match(/WHERE\s+(\w+)\.(\w+)\s*(=|!=|>|<|>=|<=|CONTAINS)\s*['"]?([^'"]+)['"]?/gi);
    if (whereMatch && nodes.length > 0) {
      for (const where of whereMatch) {
        const whereMatch2 = where.match(/WHERE\s+(\w+)\.(\w+)\s*(=|!=|>|<|>=|<=|CONTAINS)\s*['"]?([^'"]+)['"]?/i);
        if (whereMatch2) {
          const [, alias, property, operator, value] = whereMatch2;
          const actualValue = isNaN(Number(value)) ? value : Number(value);

          nodes.forEach(node => {
            const propValue = node.properties[property];
            switch (operator) {
              case '=': return propValue === actualValue;
              case '!=': return propValue !== actualValue;
              case '>': return propValue > actualValue;
              case '<': return propValue < actualValue;
              case '>=': return propValue >= actualValue;
              case '<=': return propValue <= actualValue;
              case 'CONTAINS': return String(propValue).includes(value);
            }
          });
        }
      }
    }

    return {
      nodes,
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        executionTime: Date.now() - startTime
      }
    };
  }

  // ============================================
  // ENTITY RESOLUTION
  // ============================================

  resolveEntities(
    candidateIds: string[],
    options: {
      matchThreshold?: number;
      matchProperties?: string[];
    } = {}
  ): { canonicalId: string; mergedIds: string[]; confidence: number }[] {
    const { matchThreshold = 0.8, matchProperties = ['name', 'email'] } = options;

    const resolved: Map<string, { canonicalId: string; mergedIds: string[]; scores: number[] }> = new Map();

    for (const id of candidateIds) {
      const node = this.nodes.get(id);
      if (!node) continue;

      let bestMatch: { id: string; score: number } | null = null;

      // Compare with existing resolved entities
      for (const [canonicalId, data] of resolved) {
        const canonicalNode = this.nodes.get(canonicalId);
        if (!canonicalNode) continue;

        const score = this.calculateEntitySimilarity(node, canonicalNode, matchProperties);

        if (score >= matchThreshold && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: canonicalId, score };
        }
      }

      if (bestMatch) {
        const data = resolved.get(bestMatch.id)!;
        data.mergedIds.push(id);
        data.scores.push(bestMatch.score);
      } else {
        resolved.set(id, { canonicalId: id, mergedIds: [id], scores: [1.0] });
      }
    }

    return Array.from(resolved.values()).map(data => ({
      canonicalId: data.canonicalId,
      mergedIds: data.mergedIds,
      confidence: data.scores.reduce((a, b) => a + b, 0) / data.scores.length
    }));
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getNeighbors(nodeId: string, direction: 'outbound' | 'inbound' | 'both') {
    const neighbors: { nodeId: string; edgeId: string; edgeType: string }[] = [];

    for (const edge of this.edges.values()) {
      if (direction === 'outbound' || direction === 'both') {
        if (edge.from === nodeId) {
          neighbors.push({ nodeId: edge.to, edgeId: edge.id, edgeType: edge.type });
        }
      }
      if (direction === 'inbound' || direction === 'both') {
        if (edge.to === nodeId) {
          neighbors.push({ nodeId: edge.from, edgeId: edge.id, edgeType: edge.type });
        }
      }
    }

    return neighbors;
  }

  private updateAdjacency(edge: GraphEdge): void {
    if (!this.adjacency.has(edge.from)) {
      this.adjacency.set(edge.from, new Map());
    }
    const fromAdj = this.adjacency.get(edge.from)!;
    if (!fromAdj.has(edge.type)) {
      fromAdj.set(edge.type, new Set());
    }
    fromAdj.get(edge.type)!.add(edge.to);
  }

  private updateTypeIndex(node: GraphNode): void {
    if (!this.typeIndex.has(node.type)) {
      this.typeIndex.set(node.type, new Set());
    }
    this.typeIndex.get(node.type)!.add(node.id);
  }

  private updateLabelIndex(node: GraphNode): void {
    for (const label of node.labels) {
      if (!this.labelIndex.has(label)) {
        this.labelIndex.set(label, new Set());
      }
      this.labelIndex.get(label)!.add(node.id);
    }
  }

  private updateEdgeIndex(edge: GraphEdge): void {
    if (!this.edgeIndex.has(edge.type)) {
      this.edgeIndex.set(edge.type, new Set());
    }
    this.edgeIndex.get(edge.type)!.add(edge.id);
  }

  private storeVersion(node: GraphNode, action: string, userId = 'system'): void {
    if (!this.nodeVersions.has(node.id)) {
      this.nodeVersions.set(node.id, []);
    }

    const version: NodeVersion = {
      id: `version_${uuidv4()}`,
      nodeId: node.id,
      version: node.metadata.version,
      properties: { ...node.properties },
      timestamp: new Date().toISOString(),
      createdBy: userId
    };

    this.nodeVersions.get(node.id)!.push(version);
  }

  getNodeHistory(nodeId: string): NodeVersion[] {
    return this.nodeVersions.get(nodeId) || [];
  }

  private getNodeDegree(nodeId: string): number {
    let degree = 0;
    for (const edge of this.edges.values()) {
      if (edge.from === nodeId || edge.to === nodeId) {
        degree += edge.weight;
      }
    }
    return degree;
  }

  private getCommunityTotalWeight(communityId: number, communityNodes: Map<number, Set<string>>): number {
    let total = 0;
    const nodes = communityNodes.get(communityId);
    if (!nodes) return 0;

    for (const edge of this.edges.values()) {
      if (nodes.has(edge.from) && nodes.has(edge.to)) {
        total += edge.weight;
      }
    }
    return total;
  }

  private calculateModularity(
    communityId: number,
    nodes: Set<string>,
    m2: number,
    resolution: number
  ): number {
    let sum = 0;

    for (const edge of this.edges.values()) {
      if (nodes.has(edge.from) && nodes.has(edge.to)) {
        const ki = this.getNodeDegree(edge.from);
        const kj = this.getNodeDegree(edge.to);
        sum += edge.weight - (ki * kj * resolution) / m2;
      }
    }

    return sum / m2;
  }

  private calculateEntitySimilarity(
    node1: GraphNode,
    node2: GraphNode,
    properties: string[]
  ): number {
    let totalScore = 0;
    let comparedCount = 0;

    for (const prop of properties) {
      const val1 = node1.properties[prop];
      const val2 = node2.properties[prop];

      if (val1 !== undefined && val2 !== undefined) {
        if (val1 === val2) {
          totalScore += 1;
        } else if (typeof val1 === 'string' && typeof val2 === 'string') {
          // Levenshtein-like similarity
          totalScore += this.stringSimilarity(val1.toLowerCase(), val2.toLowerCase());
        } else if (typeof val1 === 'number' && typeof val2 === 'number') {
          const max = Math.max(Math.abs(val1), Math.abs(val2));
          totalScore += max > 0 ? 1 - Math.abs(val1 - val2) / max : 1;
        }
        comparedCount++;
      }
    }

    return comparedCount > 0 ? totalScore / comparedCount : 0;
  }

  private stringSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    const longerLength = longer.length;
    return (longerLength - this.editDistance(longer, shorter)) / longerLength;
  }

  private editDistance(s1: string, s2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      costs[i] = i;
    }
    for (let j = 0; j <= s2.length; j++) {
      if (j === 0) continue;
      for (let i = 0; i <= s1.length; i++) {
        costs[i] = i === 0 ? j : Math.min(
          costs[i] + 1,
          costs[i - 1] + 1,
          s1[i - 1] === s2[j - 1] ? costs[i - 1] : costs[i - 1] + 1
        );
      }
    }
    return costs[s1.length];
  }

  // ============================================
  // STATISTICS
  // ============================================

  getStats() {
    const nodeTypes: Record<string, number> = {};
    const edgeTypes: Record<string, number> = {};

    for (const node of this.nodes.values()) {
      if (!node.metadata.deprecated) {
        nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
      }
    }

    for (const edge of this.edges.values()) {
      edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
    }

    const nodeCount = Array.from(this.nodes.values()).filter(n => !n.metadata.deprecated).length;

    return {
      nodes: {
        total: nodeCount,
        byType: nodeTypes
      },
      edges: {
        total: this.edges.size,
        byType: edgeTypes
      },
      density: nodeCount > 1
        ? this.edges.size / (nodeCount * (nodeCount - 1))
        : 0,
      stats: this.stats
    };
  }

  // ============================================
  // SEED DATA
  // ============================================

  seed(): void {
    // RTMN Ecosystem entities
    const corpIds = [
      { id: 'CORP-IND-00001', type: 'INDIVIDUAL', labels: ['Human', 'User'], props: { name: 'John Doe', email: 'john.doe@example.com', role: 'CEO' } },
      { id: 'CORP-IND-00002', type: 'INDIVIDUAL', labels: ['Human', 'User'], props: { name: 'Jane Smith', email: 'jane.smith@example.com', role: 'CTO' } },
      { id: 'CORP-BIZ-00001', type: 'BUSINESS', labels: ['Business', 'Company'], props: { name: 'Acme Corporation', industry: 'Technology', founded: '2020' } },
      { id: 'CORP-MER-00001', type: 'MERCHANT', labels: ['Merchant', 'Store'], props: { name: 'Acme Store', tier: 'Gold' } },
      { id: 'CORP-MER-00002', type: 'MERCHANT', labels: ['Merchant', 'Store'], props: { name: 'Global Mart', tier: 'Platinum' } },
      { id: 'CORP-SUP-00001', type: 'SUPPLIER', labels: ['Supplier', 'Vendor'], props: { name: 'Global Supplies Inc', rating: 4.5 } },
      { id: 'CORP-SUP-00002', type: 'SUPPLIER', labels: ['Supplier', 'Vendor'], props: { name: 'Fast Logistics', rating: 4.8 } },
    ];

    const products = [
      { id: 'PROD-001', type: 'PRODUCT', labels: ['Product', 'SKU'], props: { name: 'Widget A', price: 99.99, category: 'Electronics' } },
      { id: 'PROD-002', type: 'PRODUCT', labels: ['Product', 'SKU'], props: { name: 'Widget B', price: 149.99, category: 'Electronics' } },
      { id: 'PROD-003', type: 'PRODUCT', labels: ['Product', 'SKU'], props: { name: 'Gadget Pro', price: 299.99, category: 'Electronics' } },
      { id: 'PROD-004', type: 'SERVICE', labels: ['Service'], props: { name: 'Premium Support', price: 49.99, billing: 'monthly' } },
    ];

    // Create nodes
    for (const c of [...corpIds, ...products]) {
      this.createNode({ id: c.id, type: c.type, labels: c.labels, properties: c.props });
    }

    // Create relationships
    const relationships = [
      { from: 'CORP-IND-00001', to: 'CORP-BIZ-00001', type: 'WORKS_AT', props: { role: 'CEO', since: '2020-01-15' } },
      { from: 'CORP-IND-00002', to: 'CORP-BIZ-00001', type: 'WORKS_AT', props: { role: 'CTO', since: '2021-03-01' } },
      { from: 'CORP-BIZ-00001', to: 'CORP-MER-00001', type: 'OWNS', props: {} },
      { from: 'CORP-BIZ-00001', to: 'CORP-MER-00002', type: 'OWNS', props: {} },
      { from: 'CORP-SUP-00001', to: 'CORP-BIZ-00001', type: 'SUPPLIES', props: { since: '2020-06-01', contractValue: 500000 } },
      { from: 'CORP-SUP-00002', to: 'CORP-BIZ-00001', type: 'SUPPLIES', props: { since: '2021-01-01', contractValue: 750000 } },
      { from: 'CORP-MER-00001', to: 'PROD-001', type: 'SELLS', props: { price: 99.99, margin: 0.25 } },
      { from: 'CORP-MER-00001', to: 'PROD-002', type: 'SELLS', props: { price: 149.99, margin: 0.22 } },
      { from: 'CORP-MER-00002', to: 'PROD-002', type: 'SELLS', props: { price: 144.99, margin: 0.20 } },
      { from: 'CORP-MER-00002', to: 'PROD-003', type: 'SELLS', props: { price: 289.99, margin: 0.18 } },
      { from: 'CORP-MER-00001', to: 'PROD-004', type: 'SELLS', props: { price: 49.99, margin: 0.40 } },
      { from: 'CORP-SUP-00001', to: 'PROD-001', type: 'PRODUCES', props: { cost: 45.00, leadTime: 7 } },
      { from: 'CORP-SUP-00001', to: 'PROD-002', type: 'PRODUCES', props: { cost: 75.00, leadTime: 10 } },
      { from: 'CORP-SUP-00002', to: 'PROD-003', type: 'PRODUCES', props: { cost: 150.00, leadTime: 14 } },
      { from: 'CORP-IND-00001', to: 'CORP-IND-00002', type: 'REPORTS_TO', props: { since: '2021-03-01' } },
    ];

    for (const rel of relationships) {
      try {
        this.createEdge(rel as Parameters<typeof this.createEdge>[0]);
      } catch (e) {
        // Ignore duplicate edge errors during seeding
      }
    }

    console.log('[KnowledgeGraphOS] Seeded with RTMN entities');
  }
}

// ============================================
// EXPRESS APP SETUP
// ============================================

const app: Express = express();
const PORT = process.env.PORT || 4501;

// Middleware
app.use(express.json({ limit: '10mb' }));

// In-memory store
const graph = new KnowledgeGraphStore();
graph.seed();

// Validation schemas
const nodeSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  labels: z.array(z.string()).optional(),
  properties: z.record(z.unknown()).optional(),
  embeddings: z.array(z.number()).optional()
});

const edgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.string().min(1),
  properties: z.record(z.unknown()).optional(),
  weight: z.number().min(0).optional(),
  bidirectional: z.boolean().optional()
});

const traversalSchema = z.object({
  startId: z.string().min(1),
  depth: z.number().min(1).max(100).optional().default(3),
  direction: z.enum(['outbound', 'inbound', 'both']).optional().default('both'),
  types: z.array(z.string()).optional()
});

// ============================================
// HEALTH & STATUS ENDPOINTS
// ============================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'knowledge-graph-os',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/api/stats', (_req, res) => {
  res.json(graph.getStats());
});

// ============================================
// NODE ENDPOINTS
// ============================================

app.post('/api/nodes',requireAuth,  (req: Request, res: Response) => {
  try {
    const input = nodeSchema.parse(req.body);
    const node = graph.createNode(input);
    res.status(201).json(node);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else if (error instanceof Error) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get('/api/nodes', (req: Request, res: Response) => {
  const { type, labels, limit = '100', offset = '0' } = req.query;

  const nodes = graph.findNodes({
    type: type as string,
    labels: labels ? (Array.isArray(labels) ? labels as string[] : [labels as string]) : undefined,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });

  res.json({ nodes, total: nodes.length });
});

app.get('/api/nodes/:id', (req: Request, res: Response) => {
  const node = graph.getNode(req.params.id);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  res.json(node);
});

app.put('/api/nodes/:id',requireAuth,  (req: Request, res: Response) => {
  try {
    const { properties, labels, type, deprecated } = req.body;
    const node = graph.updateNode(req.params.id, { properties, labels, type, deprecated });
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/nodes/:id',requireAuth,  (req: Request, res: Response) => {
  const node = graph.updateNode(req.params.id, req.body);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  res.json(node);
});

app.delete('/api/nodes/:id',requireAuth,  (req: Request, res: Response) => {
  const deleted = graph.deleteNode(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Node not found' });
  }
  res.json({ success: true, message: 'Node deleted' });
});

app.get('/api/nodes/:id/history', (req: Request, res: Response) => {
  const history = graph.getNodeHistory(req.params.id);
  res.json({ nodeId: req.params.id, history });
});

// ============================================
// EDGE ENDPOINTS
// ============================================

app.post('/api/edges',requireAuth,  (req: Request, res: Response) => {
  try {
    const input = edgeSchema.parse(req.body);
    const edge = graph.createEdge(input);
    res.status(201).json(edge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get('/api/edges', (req: Request, res: Response) => {
  const { from, to, type, limit = '100' } = req.query;
  const edges = graph.getEdges({
    from: from as string,
    to: to as string,
    type: type as string,
    limit: parseInt(limit as string)
  });
  res.json({ edges, total: edges.length });
});

app.get('/api/edges/:id', (req: Request, res: Response) => {
  const edge = graph.getEdge(req.params.id);
  if (!edge) {
    return res.status(404).json({ error: 'Edge not found' });
  }
  res.json(edge);
});

app.delete('/api/edges/:id',requireAuth,  (req: Request, res: Response) => {
  const deleted = graph.deleteEdge(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Edge not found' });
  }
  res.json({ success: true, message: 'Edge deleted' });
});

app.get('/api/nodes/:id/edges', (req: Request, res: Response) => {
  const { direction = 'both' } = req.query;
  const edges = graph.getEdges({
    from: direction === 'outbound' ? req.params.id : undefined,
    to: direction === 'inbound' ? req.params.id : undefined
  });
  res.json({ edges, total: edges.length });
});

// ============================================
// TRAVERSAL ENDPOINTS
// ============================================

app.post('/api/graph/traverse',requireAuth,  (req: Request, res: Response) => {
  try {
    const { startId, depth, direction, types, algorithm = 'bfs' } = traversalSchema.parse(req.body);

    let results: TraversalResult[];
    if (algorithm === 'dfs') {
      results = graph.dfs(startId, { maxDepth: depth, direction, types });
    } else {
      results = graph.bfs(startId, { maxDepth: depth, direction, types });
    }

    res.json({ startId, algorithm, results, total: results.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.post('/api/graph/path',requireAuth,  (req: Request, res: Response) => {
  const { from, to, algorithm = 'dijkstra', edgeTypes, maxDepth, maxWeight } = req.body;

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required' });
  }

  let result: PathResult;

  if (algorithm === 'astar') {
    // A* requires a heuristic function
    // Using Euclidean distance based on random coordinates or simple hop count
    result = graph.astar(from, to, () => 1, { edgeTypes });
  } else if (algorithm === 'all-paths') {
    const paths = graph.findAllPaths(from, to, { maxDepth, edgeTypes });
    res.json({ from, to, paths, totalPaths: paths.length });
    return;
  } else {
    result = graph.dijkstra(from, to, { edgeTypes, maxWeight });
  }

  res.json({ from, to, algorithm, ...result });
});

app.get('/api/graph/path/:from/:to', (req: Request, res: Response) => {
  const { from, to } = req.params;
  const { edgeTypes, maxWeight } = req.query;

  const result = graph.dijkstra(from, to, {
    edgeTypes: edgeTypes ? (Array.isArray(edgeTypes) ? edgeTypes as string[] : [edgeTypes as string]) : undefined,
    maxWeight: maxWeight ? parseFloat(maxWeight as string) : undefined
  });

  res.json({ from, to, ...result });
});

app.post('/api/graph/communities',requireAuth,  (req: Request, res: Response) => {
  const { resolution, maxIterations } = req.body;
  const communities = graph.detectCommunities({ resolution, maxIterations });
  res.json({ communities, totalCommunities: communities.length });
});

// ============================================
// QUERY ENDPOINT
// ============================================

app.post('/api/graph/query',requireAuth,  (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const result = graph.executeQuery(query);
  res.json(result);
});

app.get('/api/search', (req: Request, res: Response) => {
  const { q, type } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const nodes = graph.findNodes({ type: type as string });
  const matched = nodes.filter(n => {
    const searchStr = JSON.stringify(n).toLowerCase();
    return searchStr.includes((q as string).toLowerCase());
  });

  res.json({ query: q, nodes: matched, total: matched.length });
});

// ============================================
// ENTITY RESOLUTION ENDPOINT
// ============================================

app.post('/api/resolve',requireAuth,  (req: Request, res: Response) => {
  const { candidateIds, matchThreshold, matchProperties } = req.body;

  if (!candidateIds || !Array.isArray(candidateIds)) {
    return res.status(400).json({ error: 'candidateIds array is required' });
  }

  const resolved = graph.resolveEntities(candidateIds, { matchThreshold, matchProperties });
  res.json({ resolved, totalClusters: resolved.length });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[KnowledgeGraphOS Error]', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ============================================
// SERVER STARTUP
// ============================================

if (process.env.NODE_ENV !== 'test' && process.env.KG_SKIP_AUTO_LISTEN !== 'true') {
  app.listen(PORT, () => {
    console.log(`[KnowledgeGraphOS] Running on port ${PORT}`);
    console.log(`[KnowledgeGraphOS] Nodes: ${graph.getStats().nodes.total}, Edges: ${graph.getStats().edges.total}`);
  });
}

export { app, graph, KnowledgeGraphStore };
export default app;
