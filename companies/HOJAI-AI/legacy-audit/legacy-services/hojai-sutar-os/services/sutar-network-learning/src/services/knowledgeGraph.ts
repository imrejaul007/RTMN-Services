// ============================================================================
// SUTAR Network Learning - Knowledge Graph Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  Pattern,
  Strategy
} from './types';

interface GraphQuery {
  nodeTypes?: KnowledgeNode['type'][];
  relationshipTypes?: string[];
  depth?: number;
  startNodeId?: string;
  maxNodes?: number;
}

interface PathResult {
  path: KnowledgeNode[];
  edges: KnowledgeEdge[];
  totalWeight: number;
}

interface SimilarityResult {
  nodeId: string;
  similarity: number;
  commonNeighbors: string[];
}

class KnowledgeGraphService {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, KnowledgeEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();

  // Create a new node
  createNode(params: {
    type: KnowledgeNode['type'];
    name: string;
    description?: string;
    properties?: Record<string, any>;
    embedding?: number[];
  }): KnowledgeNode {
    const nodeId = `node-${uuidv4()}`;

    const node: KnowledgeNode = {
      id: nodeId,
      type: params.type,
      name: params.name,
      description: params.description || '',
      properties: params.properties || {},
      embedding: params.embedding || this.generateEmbedding(params.name),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        version: 1,
        lastModifiedBy: 'system'
      }
    };

    this.nodes.set(nodeId, node);
    this.adjacencyList.set(nodeId, new Set());
    this.reverseAdjacencyList.set(nodeId, new Set());

    console.log(`[KG] Created node: ${node.name} (${nodeId})`);
    return node;
  }

  // Generate embedding from text
  private generateEmbedding(text: string): number[] {
    const dimension = 64;
    const embedding: number[] = [];

    for (let i = 0; i < dimension; i++) {
      let hash = 0;
      for (let j = 0; j < text.length; j++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(j);
        hash = hash & hash;
      }
      embedding.push(Math.sin(hash + i) * 0.5 + 0.5);
    }

    return embedding;
  }

  // Create edge between nodes
  createEdge(params: {
    sourceId: string;
    targetId: string;
    relationship: string;
    weight?: number;
    properties?: Record<string, any>;
  }): KnowledgeEdge | null {
    const sourceNode = this.nodes.get(params.sourceId);
    const targetNode = this.nodes.get(params.targetId);

    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node not found');
    }

    const edgeId = `edge-${uuidv4()}`;

    const edge: KnowledgeEdge = {
      id: edgeId,
      sourceId: params.sourceId,
      targetId: params.targetId,
      relationship: params.relationship,
      weight: params.weight || 1.0,
      properties: params.properties || {},
      createdAt: new Date().toISOString()
    };

    this.edges.set(edgeId, edge);
    this.adjacencyList.get(params.sourceId)!.add(params.targetId);
    this.reverseAdjacencyList.get(params.targetId)!.add(params.sourceId);

    sourceNode.updatedAt = new Date().toISOString();
    targetNode.updatedAt = new Date().toISOString();

    console.log(`[KG] Created edge: ${sourceNode.name} -[${params.relationship}]-> ${targetNode.name}`);
    return edge;
  }

  // Connect nodes (helper for creating relationships)
  connectNodes(sourceId: string, targetId: string, relationship: string, weight?: number): KnowledgeEdge | null {
    return this.createEdge({ sourceId, targetId, relationship, weight });
  }

  // Add pattern to knowledge graph
  addPattern(pattern: Pattern): KnowledgeNode {
    const node = this.createNode({
      type: 'pattern',
      name: pattern.description.substring(0, 100),
      description: `Pattern: ${pattern.type}, Success Rate: ${pattern.successRate}%`,
      properties: {
        patternId: pattern.id,
        type: pattern.type,
        successRate: pattern.successRate,
        confidence: pattern.confidence,
        frequency: pattern.frequency,
        triggers: pattern.triggers,
        outcomes: pattern.outcomes
      }
    });

    pattern.triggers.forEach(trigger => {
      if (!trigger.includes(':')) {
        let triggerNode = this.findNodeByName(trigger);
        if (!triggerNode) {
          triggerNode = this.createNode({
            type: 'action',
            name: trigger,
            description: `Action: ${trigger}`
          });
        }
        this.createEdge({
          sourceId: node.id,
          targetId: triggerNode.id,
          relationship: 'triggers',
          weight: 0.8
        });
      }
    });

    return node;
  }

  // Add strategy to knowledge graph
  addStrategy(strategy: Strategy): KnowledgeNode {
    const node = this.createNode({
      type: 'strategy',
      name: strategy.name,
      description: strategy.description,
      properties: {
        strategyId: strategy.id,
        successRate: strategy.successRate,
        usageCount: strategy.usageCount,
        status: strategy.status,
        actions: strategy.actions,
        conditions: strategy.conditions
      }
    });

    strategy.actions.forEach(action => {
      let actionNode = this.findNodeByName(action);
      if (!actionNode) {
        actionNode = this.createNode({
          type: 'action',
          name: action,
          description: `Action: ${action}`
        });
      }
      this.createEdge({
        sourceId: node.id,
        targetId: actionNode.id,
        relationship: 'includes_action',
        weight: 0.9
      });
    });

    return node;
  }

  // Find node by name
  findNodeByName(name: string): KnowledgeNode | undefined {
    return Array.from(this.nodes.values()).find(
      n => n.name.toLowerCase() === name.toLowerCase()
    );
  }

  // Query graph
  queryGraph(query: GraphQuery): {
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
  } {
    let matchingNodes: KnowledgeNode[] = [];

    if (query.startNodeId) {
      matchingNodes = this.bfsQuery(
        query.startNodeId,
        query.nodeTypes,
        query.depth || 2,
        query.maxNodes || 100
      );
    } else {
      matchingNodes = Array.from(this.nodes.values());

      if (query.nodeTypes && query.nodeTypes.length > 0) {
        matchingNodes = matchingNodes.filter(n => query.nodeTypes!.includes(n.type));
      }
    }

    if (query.maxNodes) {
      matchingNodes = matchingNodes.slice(0, query.maxNodes);
    }

    const nodeIds = new Set(matchingNodes.map(n => n.id));
    const matchingEdges = Array.from(this.edges.values())
      .filter(e => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));

    if (query.relationshipTypes && query.relationshipTypes.length > 0) {
      const filteredEdges = matchingEdges.filter(e =>
        query.relationshipTypes!.includes(e.relationship)
      );
      return { nodes: matchingNodes, edges: filteredEdges };
    }

    return { nodes: matchingNodes, edges: matchingEdges };
  }

  // BFS query from start node
  private bfsQuery(
    startId: string,
    nodeTypes?: KnowledgeNode['type'][],
    depth: number = 2,
    maxNodes: number = 100
  ): KnowledgeNode[] {
    const visited = new Set<string>();
    const result: KnowledgeNode[] = [];
    const queue: { id: string; currentDepth: number }[] = [{ id: startId, currentDepth: 0 }];

    while (queue.length > 0 && result.length < maxNodes) {
      const { id, currentDepth } = queue.shift()!;

      if (visited.has(id)) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (!node) continue;

      if (!nodeTypes || nodeTypes.includes(node.type)) {
        result.push(node);
      }

      if (currentDepth < depth) {
        const neighbors = this.adjacencyList.get(id) || new Set();
        neighbors.forEach(neighborId => {
          if (!visited.has(neighborId)) {
            queue.push({ id: neighborId, currentDepth: currentDepth + 1 });
          }
        });

        const reverseNeighbors = this.reverseAdjacencyList.get(id) || new Set();
        reverseNeighbors.forEach(neighborId => {
          if (!visited.has(neighborId)) {
            queue.push({ id: neighborId, currentDepth: currentDepth + 1 });
          }
        });
      }
    }

    return result;
  }

  // Find shortest path between nodes
  findPath(startId: string, endId: string): PathResult | null {
    const visited = new Set<string>();
    const queue: { id: string; path: KnowledgeNode[]; edges: KnowledgeEdge[]; weight: number }[] = [
      {
        id: startId,
        path: [this.nodes.get(startId)!],
        edges: [],
        weight: 0
      }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.id === endId) {
        return {
          path: current.path,
          edges: current.edges,
          totalWeight: current.weight
        };
      }

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const neighbors = this.adjacencyList.get(current.id) || new Set();
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;

        const neighborNode = this.nodes.get(neighborId);
        if (!neighborNode) continue;

        const edge = this.findEdge(current.id, neighborId);
        queue.push({
          id: neighborId,
          path: [...current.path, neighborNode],
          edges: edge ? [...current.edges, edge] : current.edges,
          weight: current.weight + (edge?.weight || 1)
        });
      }
    }

    return null;
  }

  // Find edge between two nodes
  private findEdge(sourceId: string, targetId: string): KnowledgeEdge | undefined {
    return Array.from(this.edges.values()).find(
      e => e.sourceId === sourceId && e.targetId === targetId
    );
  }

  // Find similar nodes
  findSimilarNodes(nodeId: string, limit: number = 5): SimilarityResult[] {
    const node = this.nodes.get(nodeId);
    if (!node || !node.embedding) return [];

    return Array.from(this.nodes.values())
      .filter(n => n.id !== nodeId && n.embedding)
      .map(n => {
        const similarity = this.cosineSimilarity(node.embedding!, n.embedding!);
        const commonNeighbors = this.findCommonNeighbors(nodeId, n.id);
        return {
          nodeId: n.id,
          similarity,
          commonNeighbors
        };
      })
      .filter(r => r.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Calculate cosine similarity
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  // Find common neighbors
  private findCommonNeighbors(nodeId1: string, nodeId2: string): string[] {
    const neighbors1 = this.adjacencyList.get(nodeId1) || new Set();
    const neighbors2 = this.adjacencyList.get(nodeId2) || new Set();

    return Array.from(neighbors1).filter(id => neighbors2.has(id));
  }

  // Get node by ID
  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  // Get all nodes
  getNodes(filters?: {
    type?: KnowledgeNode['type'];
    search?: string;
  }): KnowledgeNode[] {
    let result = Array.from(this.nodes.values());

    if (filters?.type) {
      result = result.filter(n => n.type === filters.type);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(n =>
        n.name.toLowerCase().includes(searchLower) ||
        n.description.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }

  // Get edges
  getEdges(filters?: {
    relationship?: string;
    sourceId?: string;
    targetId?: string;
  }): KnowledgeEdge[] {
    let result = Array.from(this.edges.values());

    if (filters?.relationship) {
      result = result.filter(e => e.relationship === filters.relationship);
    }
    if (filters?.sourceId) {
      result = result.filter(e => e.sourceId === filters.sourceId);
    }
    if (filters?.targetId) {
      result = result.filter(e => e.targetId === filters.targetId);
    }

    return result;
  }

  // Get full knowledge graph
  getKnowledgeGraph(): KnowledgeGraph {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      metadata: {
        totalNodes: this.nodes.size,
        totalEdges: this.edges.size,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  // Update node
  updateNode(nodeId: string, updates: Partial<KnowledgeNode>): KnowledgeNode | null {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    const updatedNode: KnowledgeNode = {
      ...node,
      ...updates,
      id: node.id,
      createdAt: node.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.nodes.set(nodeId, updatedNode);
    return updatedNode;
  }

  // Delete node
  deleteNode(nodeId: string): boolean {
    if (!this.nodes.has(nodeId)) return false;

    this.adjacencyList.get(nodeId)?.forEach(targetId => {
      this.reverseAdjacencyList.get(targetId)?.delete(nodeId);
    });

    this.reverseAdjacencyList.get(nodeId)?.forEach(sourceId => {
      this.adjacencyList.get(sourceId)?.delete(nodeId);
    });

    this.edges.forEach((edge, edgeId) => {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        this.edges.delete(edgeId);
      }
    });

    this.adjacencyList.delete(nodeId);
    this.reverseAdjacencyList.delete(nodeId);
    this.nodes.delete(nodeId);

    return true;
  }

  // Delete edge
  deleteEdge(edgeId: string): boolean {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;

    this.adjacencyList.get(edge.sourceId)?.delete(edge.targetId);
    this.reverseAdjacencyList.get(edge.targetId)?.delete(edge.sourceId);
    this.edges.delete(edgeId);

    return true;
  }

  // Get statistics
  getStatistics(): {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<KnowledgeNode['type'], number>;
    avgConnectionsPerNode: number;
    mostConnectedNodes: { nodeId: string; name: string; connections: number }[];
    relationshipTypes: string[];
  } {
    const nodesByType: Record<KnowledgeNode['type'], number> = {
      concept: 0,
      strategy: 0,
      pattern: 0,
      outcome: 0,
      action: 0
    };

    this.nodes.forEach(n => nodesByType[n.type]++);

    const connectionCounts: Map<string, number> = new Map();
    this.nodes.forEach((_, nodeId) => {
      const connections =
        (this.adjacencyList.get(nodeId)?.size || 0) +
        (this.reverseAdjacencyList.get(nodeId)?.size || 0);
      connectionCounts.set(nodeId, connections);
    });

    const avgConnections = this.nodes.size > 0
      ? Array.from(connectionCounts.values()).reduce((a, b) => a + b, 0) / this.nodes.size
      : 0;

    const mostConnected = Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nodeId, connections]) => {
        const node = this.nodes.get(nodeId);
        return {
          nodeId,
          name: node?.name || 'Unknown',
          connections
        };
      });

    const relationshipTypes = [...new Set(Array.from(this.edges.values()).map(e => e.relationship))];

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      nodesByType,
      avgConnectionsPerNode: avgConnections,
      mostConnectedNodes: mostConnected,
      relationshipTypes
    };
  }

  // Export graph data
  exportGraph(): {
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
    statistics: ReturnType<KnowledgeGraphService['getStatistics']>;
  } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      statistics: this.getStatistics()
    };
  }

  // Clear all data
  clearData(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
export default knowledgeGraphService;
