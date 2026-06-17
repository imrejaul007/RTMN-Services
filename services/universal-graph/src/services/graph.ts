import { GraphNode, IGraphNode } from '../models/Node';
import { GraphEdge, IGraphEdge } from '../models/Edge';
import { GraphStats, EntityType, EdgeType, GraphNode as GraphNodeType, GraphEdge as GraphEdgeType, NetworkAnalysis } from '../types';

export class GraphService {
  /**
   * Get comprehensive graph statistics
   */
  async getGraphStats(): Promise<GraphStats> {
    const [nodes, edges] = await Promise.all([
      GraphNode.find(),
      GraphEdge.find(),
    ]);

    // Count by entity type
    const nodesByType: Record<string, number> = {};
    for (const node of nodes) {
      nodesByType[node.entityType] = (nodesByType[node.entityType] || 0) + 1;
    }

    // Count by edge type
    const edgesByType: Record<string, number> = {};
    for (const edge of edges) {
      edgesByType[edge.edgeType] = (edgesByType[edge.edgeType] || 0) + 1;
    }

    // Calculate average degree
    const totalDegree = edges.length * 2; // Each edge contributes to 2 degrees
    const avgDegree = nodes.length > 0 ? totalDegree / nodes.length : 0;

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodesByType: nodesByType as Record<EntityType, number>,
      edgesByType: edgesByType as Record<EdgeType, number>,
      avgDegree,
    };
  }

  /**
   * Get subgraph around a specific node
   */
  async getSubgraph(params: {
    nodeId: string;
    depth: number;
    edgeTypes?: EdgeType[];
  }): Promise<{ nodes: IGraphNode[]; edges: IGraphEdge[] }> {
    const { nodeId, depth, edgeTypes } = params;

    const visitedNodes = new Set<string>([nodeId]);
    const visitedEdges = new Set<string>();
    const resultNodes: IGraphNode[] = [];
    const resultEdges: IGraphEdge[] = [];

    // Get starting node
    const startNode = await GraphNode.findOne({ nodeId });
    if (startNode) {
      resultNodes.push(startNode);
    }

    // BFS to get nodes within depth
    let currentLevel = [nodeId];
    let currentDepth = 0;

    while (currentDepth < depth && currentLevel.length > 0) {
      const nextLevel: string[] = [];
      const edgeFilter: Record<string, unknown> = {
        $or: [
          { sourceNodeId: { $in: currentLevel } },
          { targetNodeId: { $in: currentLevel } },
        ],
      };

      if (edgeTypes && edgeTypes.length > 0) {
        edgeFilter.edgeType = { $in: edgeTypes };
      }

      const levelEdges = await GraphEdge.find(edgeFilter);

      for (const edge of levelEdges) {
        if (!visitedEdges.has(edge.edgeId)) {
          visitedEdges.add(edge.edgeId);
          resultEdges.push(edge);

          const neighborId = edge.sourceNodeId === edge.targetNodeId
            ? edge.sourceNodeId
            : edge.sourceNodeId === edge.targetNodeId
              ? edge.sourceNodeId
              : edge.sourceNodeId === currentLevel[0]
                ? edge.targetNodeId
                : edge.sourceNodeId;

          if (!visitedNodes.has(edge.sourceNodeId)) {
            visitedNodes.add(edge.sourceNodeId);
            nextLevel.push(edge.sourceNodeId);
          }
          if (!visitedNodes.has(edge.targetNodeId)) {
            visitedNodes.add(edge.targetNodeId);
            nextLevel.push(edge.targetNodeId);
          }
        }
      }

      currentLevel = nextLevel;
      currentDepth++;
    }

    // Get all nodes
    const nodes = await GraphNode.find({ nodeId: { $in: Array.from(visitedNodes) } });

    return {
      nodes,
      edges: resultEdges,
    };
  }

  /**
   * Analyze a specific node's network properties
   */
  async analyzeNode(nodeId: string): Promise<NetworkAnalysis> {
    const [outgoingEdges, incomingEdges] = await Promise.all([
      GraphEdge.find({ sourceNodeId: nodeId }),
      GraphEdge.find({ targetNodeId: nodeId }),
    ]);

    const outgoingNeighbors = new Set(outgoingEdges.map(e => e.targetNodeId));
    const incomingNeighbors = new Set(incomingEdges.map(e => e.sourceNodeId));
    const allNeighbors = new Set([...outgoingNeighbors, ...incomingNeighbors]);

    // Calculate betweenness approximation (simplified)
    // In a real implementation, this would involve shortest path calculations
    const degree = outgoingEdges.length + incomingEdges.length;

    // Calculate clustering coefficient (simplified)
    let clustering = 0;
    if (allNeighbors.size > 1) {
      const neighborList = Array.from(allNeighbors);
      let triangles = 0;
      let possibleTriangles = 0;

      for (let i = 0; i < neighborList.length; i++) {
        for (let j = i + 1; j < neighborList.length; j++) {
          possibleTriangles++;
          const edge1 = await GraphEdge.findOne({
            $or: [
              { sourceNodeId: neighborList[i], targetNodeId: neighborList[j] },
              { sourceNodeId: neighborList[j], targetNodeId: neighborList[i] },
            ],
          });
          if (edge1) {
            triangles++;
          }
        }
      }

      clustering = possibleTriangles > 0 ? (triangles * 2) / possibleTriangles : 0;
    }

    return {
      nodeId,
      degree,
      inDegree: incomingEdges.length,
      outDegree: outgoingEdges.length,
      clustering,
    };
  }

  /**
   * Get connections between entity types
   */
  async getEntityTypeConnections(): Promise<Record<string, {
    source: EntityType;
    target: EntityType;
    count: number;
    avgWeight: number;
  }[]>> {
    const edges = await GraphEdge.find();

    // Build source -> target type mappings
    const connectionMap = new Map<string, { count: number; totalWeight: number }>();

    for (const edge of edges) {
      const sourceNode = await GraphNode.findOne({ nodeId: edge.sourceNodeId });
      const targetNode = await GraphNode.findOne({ nodeId: edge.targetNodeId });

      if (sourceNode && targetNode) {
        const key = `${sourceNode.entityType}->${targetNode.entityType}`;
        const existing = connectionMap.get(key) || { count: 0, totalWeight: 0 };
        existing.count++;
        existing.totalWeight += edge.weight;
        connectionMap.set(key, existing);
      }
    }

    const result: Record<string, { source: EntityType; target: EntityType; count: number; avgWeight: number }[]> = {};

    for (const [key, value] of connectionMap.entries()) {
      const [source, target] = key.split('->') as [EntityType, EntityType];
      const connection = {
        source,
        target,
        count: value.count,
        avgWeight: value.totalWeight / value.count,
      };

      if (!result[source]) {
        result[source] = [];
      }
      result[source].push(connection);
    }

    return result;
  }

  /**
   * Get degree distribution for the graph
   */
  async getDegreeDistribution(): Promise<{ degree: number; count: number }[]> {
    const nodes = await GraphNode.find();
    const degreeMap = new Map<number, number>();

    for (const node of nodes) {
      const degree = await GraphEdge.countDocuments({
        $or: [
          { sourceNodeId: node.nodeId },
          { targetNodeId: node.nodeId },
        ],
      });

      degreeMap.set(degree, (degreeMap.get(degree) || 0) + 1);
    }

    return Array.from(degreeMap.entries())
      .map(([degree, count]) => ({ degree, count }))
      .sort((a, b) => a.degree - b.degree);
  }

  /**
   * Find communities (simplified using label propagation)
   */
  async findCommunities(): Promise<string[][]> {
    const nodes = await GraphNode.find();
    const edges = await GraphEdge.find();

    // Initialize all nodes with their own community
    const communities = new Map<string, string>();
    nodes.forEach((node, i) => communities.set(node.nodeId, node.nodeId));

    // Simple label propagation
    for (let iteration = 0; iteration < 10; iteration++) {
      for (const edge of edges) {
        const label1 = communities.get(edge.sourceNodeId);
        const label2 = communities.get(edge.targetNodeId);

        if (label1 && label2 && label1 < label2) {
          communities.set(edge.targetNodeId, label1);
        } else if (label1 && label2 && label2 < label1) {
          communities.set(edge.sourceNodeId, label2);
        }
      }
    }

    // Group by community
    const communityGroups = new Map<string, string[]>();
    for (const [nodeId, label] of communities.entries()) {
      if (!communityGroups.has(label)) {
        communityGroups.set(label, []);
      }
      communityGroups.get(label)!.push(nodeId);
    }

    return Array.from(communityGroups.values()).filter(g => g.length > 1);
  }
}
