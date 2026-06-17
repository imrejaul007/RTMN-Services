import { GraphNode, IGraphNode } from '../models/Node';
import { GraphEdge, IGraphEdge } from '../models/Edge';
import { EdgeType, TraversalResult, PathResult } from '../types';

interface TraversalParams {
  startNodeId: string;
  maxDepth?: number;
  edgeTypes?: EdgeType[];
  direction?: 'outgoing' | 'incoming' | 'both';
  includeProperties?: boolean;
}

interface PathParams {
  sourceNodeId: string;
  targetNodeId: string;
  maxDepth?: number;
  edgeTypes?: EdgeType[];
  includeWeights?: boolean;
}

export class TraversalService {
  /**
   * BFS traversal from a starting node
   */
  async breadthFirstTraversal(params: TraversalParams): Promise<TraversalResult> {
    const {
      startNodeId,
      maxDepth = 3,
      edgeTypes,
      direction = 'outgoing',
    } = params;

    const visited = new Set<string>([startNodeId]);
    const queue: { nodeId: string; depth: number }[] = [{ nodeId: startNodeId, depth: 0 }];
    const resultNodes: IGraphNode[] = [];
    const resultEdges: IGraphEdge[] = [];

    // Get starting node
    const startNode = await GraphNode.findOne({ nodeId: startNodeId });
    if (startNode) {
      resultNodes.push(startNode);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= maxDepth) continue;

      // Build edge filter
      const edgeFilter: Record<string, unknown> = {};

      if (direction === 'outgoing') {
        edgeFilter.sourceNodeId = current.nodeId;
      } else if (direction === 'incoming') {
        edgeFilter.targetNodeId = current.nodeId;
      } else {
        edgeFilter.$or = [
          { sourceNodeId: current.nodeId },
          { targetNodeId: current.nodeId },
        ];
      }

      if (edgeTypes && edgeTypes.length > 0) {
        edgeFilter.edgeType = { $in: edgeTypes };
      }

      const edges = await GraphEdge.find(edgeFilter);

      for (const edge of edges) {
        if (!resultEdges.find(e => e.edgeId === edge.edgeId)) {
          resultEdges.push(edge);
        }

        const neighborId = edge.sourceNodeId === current.nodeId
          ? edge.targetNodeId
          : edge.sourceNodeId;

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ nodeId: neighborId, depth: current.depth + 1 });

          const neighborNode = await GraphNode.findOne({ nodeId: neighborId });
          if (neighborNode && !resultNodes.find(n => n.nodeId === neighborNode.nodeId)) {
            resultNodes.push(neighborNode);
          }
        }
      }
    }

    return {
      nodes: resultNodes,
      edges: resultEdges,
      visited: visited.size,
      depth: maxDepth,
    };
  }

  /**
   * Find shortest path between two nodes using BFS
   */
  async findShortestPath(params: PathParams): Promise<PathResult | null> {
    const {
      sourceNodeId,
      targetNodeId,
      maxDepth = 5,
      edgeTypes,
      includeWeights = true,
    } = params;

    if (sourceNodeId === targetNodeId) {
      const node = await GraphNode.findOne({ nodeId: sourceNodeId });
      if (node) {
        return {
          path: [this.nodeToGraphNode(node)],
          edges: [],
          totalWeight: 0,
          depth: 0,
        };
      }
      return null;
    }

    const visited = new Map<string, string>(); // nodeId -> parentNodeId
    const edgeParent = new Map<string, IGraphEdge>(); // nodeId -> edge used to reach it
    const queue: string[] = [sourceNodeId];
    visited.set(sourceNodeId, '');

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = this.getDepth(visited, current);

      if (currentDepth >= maxDepth) continue;

      // Get outgoing edges
      const edgeFilter: Record<string, unknown> = { sourceNodeId: current };

      if (edgeTypes && edgeTypes.length > 0) {
        edgeFilter.edgeType = { $in: edgeTypes };
      }

      const edges = await GraphEdge.find(edgeFilter);

      for (const edge of edges) {
        const neighborId = edge.targetNodeId;

        if (!visited.has(neighborId)) {
          visited.set(neighborId, current);
          edgeParent.set(neighborId, edge);
          queue.push(neighborId);

          if (neighborId === targetNodeId) {
            // Found path - reconstruct it
            return this.reconstructPath(visited, edgeParent, sourceNodeId, targetNodeId, includeWeights);
          }
        }
      }

      // Also check incoming edges if we want bidirectional
      const incomingEdges = await GraphEdge.find({ targetNodeId: current });
      for (const edge of incomingEdges) {
        const neighborId = edge.sourceNodeId;

        if (!visited.has(neighborId)) {
          visited.set(neighborId, current);
          edgeParent.set(neighborId, edge);
          queue.push(neighborId);

          if (neighborId === targetNodeId) {
            return this.reconstructPath(visited, edgeParent, sourceNodeId, targetNodeId, includeWeights);
          }
        }
      }
    }

    return null; // No path found
  }

  /**
   * Find all paths between two nodes (limited)
   */
  async findAllPaths(params: PathParams & { limit?: number }): Promise<PathResult[]> {
    const {
      sourceNodeId,
      targetNodeId,
      maxDepth = 5,
      edgeTypes,
      limit = 10,
    } = params;

    const allPaths: PathResult[] = [];
    const visited = new Set<string>();

    const dfs = async (current: string, path: string[], edges: IGraphEdge[]): Promise<void> => {
      if (allPaths.length >= limit) return;

      if (current === targetNodeId) {
        const nodes = await Promise.all(path.map(id => GraphNode.findOne({ nodeId: id })));
        const validNodes = nodes.filter(Boolean) as IGraphNode[];

        allPaths.push({
          path: validNodes.map(n => this.nodeToGraphNode(n)),
          edges: edges.map(e => this.edgeToGraphEdge(e)),
          totalWeight: edges.reduce((sum, e) => sum + e.weight, 0),
          depth: path.length - 1,
        });
        return;
      }

      if (path.length >= maxDepth) return;

      const edgeFilter: Record<string, unknown> = { sourceNodeId: current };
      if (edgeTypes && edgeTypes.length > 0) {
        edgeFilter.edgeType = { $in: edgeTypes };
      }

      const outgoingEdges = await GraphEdge.find(edgeFilter);

      for (const edge of outgoingEdges) {
        const neighborId = edge.targetNodeId;

        if (!visited.has(neighborId) && !path.includes(neighborId)) {
          visited.add(neighborId);
          path.push(neighborId);
          edges.push(edge);

          await dfs(neighborId, path, edges);

          path.pop();
          edges.pop();
          visited.delete(neighborId);
        }
      }
    };

    visited.add(sourceNodeId);
    await dfs(sourceNodeId, [sourceNodeId], []);

    // Sort by weight (lower is better)
    allPaths.sort((a, b) => a.totalWeight - b.totalWeight);

    return allPaths.slice(0, limit);
  }

  /**
   * Find all nodes reachable from a source
   */
  async findReachableNodes(params: {
    sourceNodeId: string;
    maxDepth?: number;
    edgeTypes?: EdgeType[];
  }): Promise<IGraphNode[]> {
    const { sourceNodeId, maxDepth = 5, edgeTypes } = params;

    const result = await this.breadthFirstTraversal({
      startNodeId: sourceNodeId,
      maxDepth,
      edgeTypes,
      direction: 'outgoing',
    });

    // Remove the starting node
    return result.nodes.filter(n => n.nodeId !== sourceNodeId);
  }

  /**
   * Check if two nodes are connected
   */
  async areConnected(sourceNodeId: string, targetNodeId: string, maxDepth: number = 5): Promise<boolean> {
    const path = await this.findShortestPath({
      sourceNodeId,
      targetNodeId,
      maxDepth,
    });

    return path !== null;
  }

  /**
   * Find shortest weighted path (Dijkstra-like)
   */
  async findWeightedPath(params: PathParams): Promise<PathResult | null> {
    const {
      sourceNodeId,
      targetNodeId,
      maxDepth = 5,
      edgeTypes,
    } = params;

    if (sourceNodeId === targetNodeId) {
      const node = await GraphNode.findOne({ nodeId: sourceNodeId });
      if (node) {
        return {
          path: [this.nodeToGraphNode(node)],
          edges: [],
          totalWeight: 0,
          depth: 0,
        };
      }
      return null;
    }

    // Use a priority queue (simple array for small graphs)
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();
    const previousEdge = new Map<string, IGraphEdge>();
    const visited = new Set<string>();

    distances.set(sourceNodeId, 0);

    while (distances.size > 0) {
      // Find minimum distance node
      let minNode: string | null = null;
      let minDist = Infinity;

      for (const [nodeId, dist] of distances.entries()) {
        if (!visited.has(nodeId) && dist < minDist) {
          minNode = nodeId;
          minDist = dist;
        }
      }

      if (!minNode) break;
      if (minNode === targetNodeId) break;

      visited.add(minNode);
      distances.delete(minNode);

      const currentDist = this.getDistance(distances, previous, minNode);

      if (currentDist > maxDepth) continue;

      // Get neighbors
      const outgoingEdges = await GraphEdge.find({ sourceNodeId: minNode });
      const incomingEdges = await GraphEdge.find({ targetNodeId: minNode });

      for (const edge of [...outgoingEdges, ...incomingEdges]) {
        if (edgeTypes && edgeTypes.length > 0 && !edgeTypes.includes(edge.edgeType)) {
          continue;
        }

        const neighborId = edge.sourceNodeId === minNode ? edge.targetNodeId : edge.sourceNodeId;
        const weight = 1 - edge.weight; // Convert to cost (lower weight = lower cost)
        const newDist = currentDist + weight;

        if (!visited.has(neighborId)) {
          const currentNeighborDist = this.getDistance(distances, previous, neighborId);
          if (newDist < currentNeighborDist) {
            distances.set(neighborId, newDist);
            previous.set(neighborId, minNode);
            previousEdge.set(neighborId, edge);
          }
        }
      }
    }

    // Reconstruct path
    if (!visited.has(targetNodeId)) {
      return null;
    }

    const path: string[] = [];
    const edges: IGraphEdge[] = [];
    let current = targetNodeId;

    while (current) {
      path.unshift(current);
      const edge = previousEdge.get(current);
      if (edge) {
        edges.unshift(edge);
      }
      current = previous.get(current)!;
    }

    const nodes = await Promise.all(path.map(id => GraphNode.findOne({ nodeId: id })));
    const validNodes = nodes.filter(Boolean) as IGraphNode[];

    return {
      path: validNodes.map(n => this.nodeToGraphNode(n)),
      edges: edges.map(e => this.edgeToGraphEdge(e)),
      totalWeight: this.getDistance(distances, previous, targetNodeId),
      depth: path.length - 1,
    };
  }

  // Helper methods
  private getDepth(visited: Map<string, string>, nodeId: string): number {
    let depth = 0;
    let current = nodeId;
    while (visited.has(current) && visited.get(current)) {
      depth++;
      current = visited.get(current)!;
    }
    return depth;
  }

  private getDistance(distances: Map<string, number>, previous: Map<string, string>, nodeId: string): number {
    if (distances.has(nodeId)) {
      return distances.get(nodeId)!;
    }
    return Infinity;
  }

  private async reconstructPath(
    visited: Map<string, string>,
    edgeParent: Map<string, IGraphEdge>,
    sourceNodeId: string,
    targetNodeId: string,
    includeWeights: boolean
  ): Promise<PathResult> {
    const path: string[] = [];
    const edges: IGraphEdge[] = [];
    let current = targetNodeId;

    while (current && current !== sourceNodeId) {
      path.unshift(current);
      const edge = edgeParent.get(current);
      if (edge) {
        edges.unshift(edge);
      }
      current = visited.get(current)!;
    }

    path.unshift(sourceNodeId);

    const nodes = await Promise.all(path.map(id => GraphNode.findOne({ nodeId: id })));
    const validNodes = nodes.filter(Boolean) as IGraphNode[];

    return {
      path: validNodes.map(n => this.nodeToGraphNode(n)),
      edges: edges.map(e => this.edgeToGraphEdge(e)),
      totalWeight: includeWeights ? edges.reduce((sum, e) => sum + e.weight, 0) : edges.length,
      depth: path.length - 1,
    };
  }

  private nodeToGraphNode(node: IGraphNode) {
    return {
      id: node.nodeId,
      entityType: node.entityType,
      entityId: node.entityId,
      name: node.name,
      properties: node.properties,
      metadata: node.metadata,
      labels: node.labels,
    };
  }

  private edgeToGraphEdge(edge: IGraphEdge) {
    return {
      id: edge.edgeId,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      edgeType: edge.edgeType,
      properties: edge.properties,
      weight: edge.weight,
      metadata: edge.metadata,
    };
  }
}
