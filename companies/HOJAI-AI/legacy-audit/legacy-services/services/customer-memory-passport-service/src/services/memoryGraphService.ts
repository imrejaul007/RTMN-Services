import { v4 as uuidv4 } from 'uuid';
import {
  CustomerMemoryPassportModel,
  IGraphNode,
  IGraphEdge,
  IMemoryGraph,
  GraphNodeType,
  GraphRelationshipType,
  ICustomerMemoryPassport,
} from '../models/passport.js';
import { logger } from '../utils/logger.js';

export interface CreateNodeInput {
  type: GraphNodeType;
  label: string;
  properties?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateEdgeInput {
  sourceId: string;
  targetId: string;
  relationship: GraphRelationshipType;
  properties?: Record<string, unknown>;
  weight?: number;
}

export interface PathResult {
  path: IGraphNode[];
  edges: IGraphEdge[];
  totalWeight: number;
}

export interface HealthScoreResult {
  overall: number;
  factors: {
    interactionFrequency: number;
    sentimentScore: number;
    issueResolutionRate: number;
    engagementLevel: number;
    recencyScore: number;
  };
  recommendations: string[];
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodeTypes: Record<string, number>;
  relationshipTypes: Record<string, number>;
  density: number;
}

class MemoryGraphService {
  async createGraphNode(
    customerId: string,
    nodeInput: CreateNodeInput
  ): Promise<IGraphNode | null> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      logger.warn('Passport not found for graph node creation', { customerId });
      return null;
    }

    const existingNode = passport.graph.nodes.find(
      (n) =>
        n.type === nodeInput.type &&
        (n.properties as Record<string, unknown>).id === nodeInput.properties?.id
    );

    if (existingNode) {
      Object.assign(existingNode, {
        label: nodeInput.label,
        properties: { ...existingNode.properties, ...nodeInput.properties },
        metadata: { ...existingNode.metadata, ...nodeInput.metadata },
        updatedAt: new Date(),
      });
      await passport.save();
      return existingNode;
    }

    const newNode: IGraphNode = {
      id: uuidv4(),
      type: nodeInput.type,
      label: nodeInput.label,
      properties: nodeInput.properties || {},
      metadata: nodeInput.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    passport.graph.nodes.push(newNode);
    passport.graph.lastUpdated = new Date();
    await passport.save();

    logger.info('Graph node created', {
      customerId,
      nodeId: newNode.id,
      nodeType: newNode.type,
    });

    return newNode;
  }

  async connectNodes(
    customerId: string,
    edgeInput: CreateEdgeInput
  ): Promise<IGraphEdge | null> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      logger.warn('Passport not found for graph edge creation', { customerId });
      return null;
    }

    const sourceExists = passport.graph.nodes.some((n) => n.id === edgeInput.sourceId);
    const targetExists = passport.graph.nodes.some((n) => n.id === edgeInput.targetId);

    if (!sourceExists || !targetExists) {
      logger.warn('Source or target node not found', {
        customerId,
        sourceExists,
        targetExists,
      });
      return null;
    }

    const existingEdge = passport.graph.edges.find(
      (e) =>
        e.sourceId === edgeInput.sourceId &&
        e.targetId === edgeInput.targetId &&
        e.relationship === edgeInput.relationship
    );

    if (existingEdge) {
      if (edgeInput.weight !== undefined) {
        existingEdge.weight = edgeInput.weight;
      }
      if (edgeInput.properties) {
        existingEdge.properties = { ...existingEdge.properties, ...edgeInput.properties };
      }
      await passport.save();
      return existingEdge;
    }

    const newEdge: IGraphEdge = {
      id: uuidv4(),
      sourceId: edgeInput.sourceId,
      targetId: edgeInput.targetId,
      relationship: edgeInput.relationship,
      properties: edgeInput.properties,
      weight: edgeInput.weight || 1,
      createdAt: new Date(),
    };

    passport.graph.edges.push(newEdge);
    passport.graph.lastUpdated = new Date();
    await passport.save();

    logger.info('Graph edge created', {
      customerId,
      edgeId: newEdge.id,
      relationship: newEdge.relationship,
    });

    return newEdge;
  }

  async getGraph(customerId: string): Promise<IMemoryGraph | null> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return null;
    }

    return {
      customerId: passport.customerId,
      nodes: passport.graph.nodes,
      edges: passport.graph.edges,
      lastUpdated: passport.graph.lastUpdated,
    };
  }

  async findPath(
    customerId: string,
    startType: GraphNodeType,
    endType: GraphNodeType
  ): Promise<PathResult | null> {
    const graph = await this.getGraph(customerId);
    if (!graph) {
      return null;
    }

    const startNodes = graph.nodes.filter((n) => n.type === startType);
    const endNodes = graph.nodes.filter((n) => n.type === endType);

    if (startNodes.length === 0 || endNodes.length === 0) {
      logger.debug('Start or end nodes not found', {
        customerId,
        startType,
        endType,
        startCount: startNodes.length,
        endCount: endNodes.length,
      });
      return null;
    }

    let bestPath: PathResult | null = null;
    let bestWeight = Infinity;

    for (const startNode of startNodes) {
      for (const endNode of endNodes) {
        const path = this.findShortestPath(graph, startNode.id, endNode.id);
        if (path && path.totalWeight < bestWeight) {
          bestWeight = path.totalWeight;
          bestPath = path;
        }
      }
    }

    return bestPath;
  }

  async getRelatedEntities(
    customerId: string,
    entityId: string,
    depth: number = 1
  ): Promise<IGraphNode[]> {
    const graph = await this.getGraph(customerId);
    if (!graph) {
      return [];
    }

    const related: Set<string> = new Set([entityId]);
    let currentLevel: Set<string> = new Set([entityId]);

    for (let i = 0; i < depth; i++) {
      const nextLevel: Set<string> = new Set();

      for (const nodeId of currentLevel) {
        const connectedIds = graph.edges
          .filter((e) => e.sourceId === nodeId || e.targetId === nodeId)
          .flatMap((e) => [e.sourceId, e.targetId])
          .filter((id) => id !== nodeId);

        for (const id of connectedIds) {
          if (!related.has(id)) {
            nextLevel.add(id);
            related.add(id);
          }
        }
      }

      currentLevel = nextLevel;
      if (currentLevel.size === 0) break;
    }

    return graph.nodes.filter((n) => related.has(n.id));
  }

  async calculateHealthScore(customerId: string): Promise<HealthScoreResult> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      throw new Error(`Passport not found for customer: ${customerId}`);
    }

    const interactionFrequency = this.calculateInteractionFrequency(passport);
    const sentimentScore = this.calculateSentimentScore(passport);
    const issueResolutionRate = this.calculateIssueResolutionRate(passport);
    const engagementLevel = passport.engagementScore;
    const recencyScore = this.calculateRecencyScore(passport);

    const overall =
      interactionFrequency * 0.2 +
      sentimentScore * 0.25 +
      issueResolutionRate * 0.2 +
      engagementLevel * 0.2 +
      recencyScore * 0.15;

    const recommendations: string[] = [];

    if (recencyScore < 30) {
      recommendations.push('Customer has been inactive - consider re-engagement campaign');
    }
    if (sentimentScore < 40) {
      recommendations.push('Negative sentiment trend - prioritize customer satisfaction');
    }
    if (issueResolutionRate < 60) {
      recommendations.push('Improve issue resolution time to boost health score');
    }
    if (engagementLevel < 30) {
      recommendations.push('Low engagement - increase touchpoints through preferred channels');
    }
    if (interactionFrequency < 30) {
      recommendations.push('Infrequent interactions - consider loyalty incentives');
    }

    logger.info('Health score calculated', {
      customerId,
      overall: Math.round(overall),
      factors: {
        interactionFrequency,
        sentimentScore,
        issueResolutionRate,
        engagementLevel,
        recencyScore,
      },
    });

    return {
      overall: Math.round(overall),
      factors: {
        interactionFrequency: Math.round(interactionFrequency),
        sentimentScore: Math.round(sentimentScore),
        issueResolutionRate: Math.round(issueResolutionRate),
        engagementLevel: Math.round(engagementLevel),
        recencyScore: Math.round(recencyScore),
      },
      recommendations,
    };
  }

  async getGraphStats(customerId: string): Promise<GraphStats | null> {
    const graph = await this.getGraph(customerId);
    if (!graph) {
      return null;
    }

    const nodeTypes: Record<string, number> = {};
    const relationshipTypes: Record<string, number> = {};

    for (const node of graph.nodes) {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    }

    for (const edge of graph.edges) {
      relationshipTypes[edge.relationship] = (relationshipTypes[edge.relationship] || 0) + 1;
    }

    const maxPossibleEdges = graph.nodes.length * (graph.nodes.length - 1);
    const density = maxPossibleEdges > 0 ? (graph.edges.length / maxPossibleEdges) * 100 : 0;

    return {
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      nodeTypes,
      relationshipTypes,
      density: Math.round(density * 100) / 100,
    };
  }

  async deleteNode(customerId: string, nodeId: string): Promise<boolean> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return false;
    }

    const nodeIndex = passport.graph.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) {
      return false;
    }

    const customerNode = passport.graph.nodes.find((n) => n.type === GraphNodeType.CUSTOMER);
    if (customerNode && customerNode.id === nodeId) {
      logger.warn('Cannot delete customer root node', { customerId, nodeId });
      return false;
    }

    passport.graph.nodes.splice(nodeIndex, 1);
    passport.graph.edges = passport.graph.edges.filter(
      (e) => e.sourceId !== nodeId && e.targetId !== nodeId
    );
    passport.graph.lastUpdated = new Date();

    await passport.save();
    logger.info('Graph node deleted', { customerId, nodeId });

    return true;
  }

  async deleteEdge(customerId: string, edgeId: string): Promise<boolean> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return false;
    }

    const edgeIndex = passport.graph.edges.findIndex((e) => e.id === edgeId);
    if (edgeIndex === -1) {
      return false;
    }

    passport.graph.edges.splice(edgeIndex, 1);
    passport.graph.lastUpdated = new Date();

    await passport.save();
    logger.info('Graph edge deleted', { customerId, edgeId });

    return true;
  }

  async updateNodeProperties(
    customerId: string,
    nodeId: string,
    properties: Record<string, unknown>
  ): Promise<IGraphNode | null> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return null;
    }

    const node = passport.graph.nodes.find((n) => n.id === nodeId);
    if (!node) {
      return null;
    }

    node.properties = { ...node.properties, ...properties };
    node.updatedAt = new Date();
    passport.graph.lastUpdated = new Date();

    await passport.save();
    logger.info('Graph node properties updated', { customerId, nodeId });

    return node;
  }

  private findShortestPath(
    graph: IMemoryGraph,
    startId: string,
    endId: string
  ): PathResult | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, { node: IGraphNode; edge: IGraphEdge | null }>();
    const visited = new Set<string>();

    for (const node of graph.nodes) {
      distances.set(node.id, Infinity);
    }
    distances.set(startId, 0);

    const queue: Array<{ id: string; distance: number }> = [
      { id: startId, distance: 0 },
    ];

    while (queue.length > 0) {
      queue.sort((a, b) => a.distance - b.distance);
      const current = queue.shift()!;

      if (current.id === endId) {
        break;
      }

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const currentNode = graph.nodes.find((n) => n.id === current.id);
      if (!currentNode) continue;

      const edges = graph.edges.filter(
        (e) => e.sourceId === current.id || e.targetId === current.id
      );

      for (const edge of edges) {
        const neighborId = edge.sourceId === current.id ? edge.targetId : edge.sourceId;
        if (visited.has(neighborId)) continue;

        const weight = edge.weight || 1;
        const newDistance = current.distance + weight;

        if (newDistance < (distances.get(neighborId) || Infinity)) {
          distances.set(neighborId, newDistance);
          const neighborNode = graph.nodes.find((n) => n.id === neighborId);
          if (neighborNode) {
            previous.set(neighborId, { node: neighborNode, edge });
            queue.push({ id: neighborId, distance: newDistance });
          }
        }
      }
    }

    if (!previous.has(endId)) {
      return null;
    }

    const path: IGraphNode[] = [];
    const edges: IGraphEdge[] = [];
    let currentId: string | undefined = endId;
    let totalWeight = 0;

    while (currentId) {
      const prev = previous.get(currentId);
      if (!prev) break;
      path.unshift(prev.node);
      if (prev.edge) {
        edges.unshift(prev.edge);
        totalWeight += prev.edge.weight || 1;
      }
      currentId = graph.edges
        .filter((e) => e.targetId === currentId)
        .find((e) => e.sourceId === path.find((n) => n.id === e.sourceId)?.id)?.sourceId;
    }

    const startNode = graph.nodes.find((n) => n.id === startId);
    if (startNode) {
      path.unshift(startNode);
    }

    return { path, edges, totalWeight };
  }

  private calculateInteractionFrequency(passport: ICustomerMemoryPassport): number {
    if (!passport.lastActivity || !passport.firstActivity) {
      return 50;
    }

    const daysSinceFirst =
      (Date.now() - passport.firstActivity.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceLast =
      (Date.now() - passport.lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceFirst === 0) return 100;

    const avgInteractionsPerDay = passport.totalInteractions / daysSinceFirst;
    const expectedInteractionsPerDay = 0.5;

    let score = (avgInteractionsPerDay / expectedInteractionsPerDay) * 50;
    if (daysSinceLast > 30) {
      score *= 0.5;
    } else if (daysSinceLast > 14) {
      score *= 0.75;
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateSentimentScore(passport: ICustomerMemoryPassport): number {
    const memoriesWithSentiment = passport.memories.filter(
      (m) => !m.isDeleted && m.sentimentScore !== undefined
    );

    if (memoriesWithSentiment.length === 0) {
      return 50;
    }

    const avgSentiment =
      memoriesWithSentiment.reduce((sum, m) => sum + (m.sentimentScore || 0), 0) /
      memoriesWithSentiment.length;

    return ((avgSentiment + 1) / 2) * 100;
  }

  private calculateIssueResolutionRate(passport: ICustomerMemoryPassport): number {
    const complaintMemories = passport.memories.filter(
      (m) => !m.isDeleted && m.type === 'complaint'
    );

    if (complaintMemories.length === 0) {
      return 100;
    }

    const resolvedComplaints = complaintMemories.filter((m) => {
      const metadata = m.metadata as Record<string, unknown> || {};
      return metadata.resolved === true;
    });

    return (resolvedComplaints.length / complaintMemories.length) * 100;
  }

  private calculateRecencyScore(passport: ICustomerMemoryPassport): number {
    if (!passport.lastActivity) {
      return 0;
    }

    const daysSinceLastActivity =
      (Date.now() - passport.lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastActivity <= 1) return 100;
    if (daysSinceLastActivity <= 7) return 90;
    if (daysSinceLastActivity <= 14) return 75;
    if (daysSinceLastActivity <= 30) return 50;
    if (daysSinceLastActivity <= 60) return 25;
    if (daysSinceLastActivity <= 90) return 10;
    return 0;
  }
}

export const memoryGraphService = new MemoryGraphService();
