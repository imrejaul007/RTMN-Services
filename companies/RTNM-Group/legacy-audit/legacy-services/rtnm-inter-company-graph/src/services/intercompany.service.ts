import { v4 as uuidv4 } from 'uuid';
import { CompanyNode, CompanyEdge, ICompanyNode, ICompanyEdge } from '../models/intercompany.model';
import { logger } from '../utils/logger';

export interface AddCompanyInput {
  corpId: string;
  name: string;
  type: ICompanyNode['type'];
  role: string;
  trustScore?: number;
  monthlyRevenue?: number;
  employees?: number;
  properties?: ICompanyNode['properties'];
  tags?: string[];
}

export interface AddEdgeInput {
  sourceId: string;
  targetId: string;
  relationship: ICompanyEdge['relationship'];
  direction?: ICompanyEdge['direction'];
  properties?: ICompanyEdge['properties'];
}

interface GraphNode {
  corpId: string;
  name: string;
  type: string;
  role: string;
  trustScore: number;
  monthlyRevenue: number;
  employees: number;
  tags: string[];
  status: string;
}

interface GraphEdge {
  edgeId: string;
  sourceId: string;
  targetId: string;
  relationship: string;
  direction: string;
  monthlyVolume?: number;
  paymentTerms?: string;
  creditLimit?: number;
  status: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics: {
    totalCompanies: number;
    totalRelationships: number;
    totalMonthlyVolume: number;
    companiesByType: Record<string, number>;
    relationshipsByType: Record<string, number>;
  };
}

interface MoneyFlow {
  corpId: string;
  name: string;
  totalIncoming: number;
  totalOutgoing: number;
  netFlow: number;
  incoming: Array<{
    fromCorpId: string;
    fromName: string;
    relationship: string;
    volume: number;
  }>;
  outgoing: Array<{
    toCorpId: string;
    toName: string;
    relationship: string;
    volume: number;
  }>;
}

interface PathNode {
  corpId: string;
  name: string;
  relationship: string;
}

interface PathResult {
  exists: boolean;
  path?: PathNode[];
  hops: number;
}

export class IntercompanyService {
  /**
   * Add a new company node to the graph
   */
  async addCompany(company: AddCompanyInput): Promise<ICompanyNode> {
    try {
      const existingCompany = await CompanyNode.findOne({ corpId: company.corpId });
      if (existingCompany) {
        throw new Error(`Company with corpId ${company.corpId} already exists`);
      }

      const newCompany = new CompanyNode({
        corpId: company.corpId,
        name: company.name,
        type: company.type,
        role: company.role,
        trustScore: company.trustScore ?? 50,
        monthlyRevenue: company.monthlyRevenue ?? 0,
        employees: company.employees ?? 0,
        properties: company.properties ?? {},
        tags: company.tags ?? [],
        status: 'active',
      });

      const savedCompany = await newCompany.save();
      logger.info(`Company added: ${company.corpId}`, { corpId: company.corpId });
      return savedCompany;
    } catch (error) {
      logger.error('Error adding company', { error, corpId: company.corpId });
      throw error;
    }
  }

  /**
   * Get a company by corpId
   */
  async getCompany(corpId: string): Promise<ICompanyNode | null> {
    try {
      const company = await CompanyNode.findOne({ corpId });
      if (!company) {
        logger.warn(`Company not found: ${corpId}`);
      }
      return company;
    } catch (error) {
      logger.error('Error getting company', { error, corpId });
      throw error;
    }
  }

  /**
   * List all companies with optional filters
   */
  async listCompanies(filters?: {
    type?: ICompanyNode['type'];
    status?: ICompanyNode['status'];
    tags?: string[];
  }): Promise<ICompanyNode[]> {
    try {
      const query: Record<string, unknown> = {};

      if (filters?.type) {
        query.type = filters.type;
      }
      if (filters?.status) {
        query.status = filters.status;
      }
      if (filters?.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      return await CompanyNode.find(query).sort({ name: 1 });
    } catch (error) {
      logger.error('Error listing companies', { error, filters });
      throw error;
    }
  }

  /**
   * Add a relationship edge between two companies
   */
  async addRelationship(edge: AddEdgeInput): Promise<ICompanyEdge> {
    try {
      // Verify both companies exist
      const [sourceExists, targetExists] = await Promise.all([
        CompanyNode.findOne({ corpId: edge.sourceId }),
        CompanyNode.findOne({ corpId: edge.targetId }),
      ]);

      if (!sourceExists) {
        throw new Error(`Source company ${edge.sourceId} does not exist`);
      }
      if (!targetExists) {
        throw new Error(`Target company ${edge.targetId} does not exist`);
      }

      // Check for existing relationship
      const existingEdge = await CompanyEdge.findOne({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        relationship: edge.relationship,
      });

      if (existingEdge) {
        throw new Error(`Relationship already exists between ${edge.sourceId} and ${edge.targetId}`);
      }

      const newEdge = new CompanyEdge({
        edgeId: uuidv4(),
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        relationship: edge.relationship,
        direction: edge.direction ?? 'unidirectional',
        properties: edge.properties ?? {},
        status: 'active',
      });

      const savedEdge = await newEdge.save();
      logger.info(`Relationship added: ${edge.sourceId} -> ${edge.targetId}`, {
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        relationship: edge.relationship,
      });
      return savedEdge;
    } catch (error) {
      logger.error('Error adding relationship', { error, edge });
      throw error;
    }
  }

  /**
   * Get all relationships for a company
   */
  async getRelationships(corpId: string): Promise<{
    incoming: ICompanyEdge[];
    outgoing: ICompanyEdge[];
    bidirectional: ICompanyEdge[];
  }> {
    try {
      const company = await CompanyNode.findOne({ corpId });
      if (!company) {
        throw new Error(`Company ${corpId} does not exist`);
      }

      const [incoming, outgoing, bidirectional] = await Promise.all([
        CompanyEdge.find({
          targetId: corpId,
          status: 'active',
        }).populate('sourceId', 'name type'),
        CompanyEdge.find({
          sourceId: corpId,
          status: 'active',
        }).populate('targetId', 'name type'),
        CompanyEdge.find({
          $or: [
            { sourceId: corpId, targetId: corpId },
          ],
          direction: 'bidirectional',
          status: 'active',
        }),
      ]);

      return { incoming, outgoing, bidirectional };
    } catch (error) {
      logger.error('Error getting relationships', { error, corpId });
      throw error;
    }
  }

  /**
   * Get money flow for a company (who pays whom, how much)
   */
  async getMoneyFlow(corpId: string): Promise<MoneyFlow> {
    try {
      const company = await CompanyNode.findOne({ corpId });
      if (!company) {
        throw new Error(`Company ${corpId} does not exist`);
      }

      // Get all outgoing payments/receives
      const outgoingEdges = await CompanyEdge.find({
        sourceId: corpId,
        status: 'active',
        relationship: { $in: ['pays', 'provides'] },
      }).populate('targetId', 'name');

      const incomingEdges = await CompanyEdge.find({
        targetId: corpId,
        status: 'active',
        relationship: { $in: ['receives', 'pays'] },
      }).populate('sourceId', 'name');

      let totalIncoming = 0;
      let totalOutgoing = 0;

      const incoming = incomingEdges.map((edge) => {
        const volume = edge.properties?.monthlyVolume ?? 0;
        totalIncoming += volume;
        return {
          fromCorpId: edge.sourceId as unknown as string,
          fromName: (edge.sourceId as unknown as { name: string }).name || edge.sourceId,
          relationship: edge.relationship,
          volume,
        };
      });

      const outgoing = outgoingEdges.map((edge) => {
        const volume = edge.properties?.monthlyVolume ?? 0;
        totalOutgoing += volume;
        return {
          toCorpId: edge.targetId as unknown as string,
          toName: (edge.targetId as unknown as { name: string }).name || edge.targetId,
          relationship: edge.relationship,
          volume,
        };
      });

      return {
        corpId,
        name: company.name,
        totalIncoming,
        totalOutgoing,
        netFlow: totalIncoming - totalOutgoing,
        incoming,
        outgoing,
      };
    } catch (error) {
      logger.error('Error getting money flow', { error, corpId });
      throw error;
    }
  }

  /**
   * Get the full economic network graph
   */
  async getFullGraph(): Promise<GraphData> {
    try {
      const [nodes, edges] = await Promise.all([
        CompanyNode.find({ status: 'active' }),
        CompanyEdge.find({ status: 'active' }),
      ]);

      // Calculate statistics
      const companiesByType: Record<string, number> = {};
      const relationshipsByType: Record<string, number> = {};
      let totalMonthlyVolume = 0;

      nodes.forEach((node) => {
        companiesByType[node.type] = (companiesByType[node.type] || 0) + 1;
      });

      edges.forEach((edge) => {
        relationshipsByType[edge.relationship] = (relationshipsByType[edge.relationship] || 0) + 1;
        totalMonthlyVolume += edge.properties?.monthlyVolume ?? 0;
      });

      const graphNodes: GraphNode[] = nodes.map((node) => ({
        corpId: node.corpId,
        name: node.name,
        type: node.type,
        role: node.role,
        trustScore: node.trustScore,
        monthlyRevenue: node.monthlyRevenue,
        employees: node.employees,
        tags: node.tags,
        status: node.status,
      }));

      const graphEdges: GraphEdge[] = edges.map((edge) => ({
        edgeId: edge.edgeId,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        relationship: edge.relationship,
        direction: edge.direction,
        monthlyVolume: edge.properties?.monthlyVolume,
        paymentTerms: edge.properties?.paymentTerms,
        creditLimit: edge.properties?.creditLimit,
        status: edge.status,
      }));

      logger.info('Full graph retrieved', {
        nodeCount: nodes.length,
        edgeCount: edges.length,
      });

      return {
        nodes: graphNodes,
        edges: graphEdges,
        statistics: {
          totalCompanies: nodes.length,
          totalRelationships: edges.length,
          totalMonthlyVolume,
          companiesByType,
          relationshipsByType,
        },
      };
    } catch (error) {
      logger.error('Error getting full graph', { error });
      throw error;
    }
  }

  /**
   * Find a path between two companies using BFS
   */
  async findPath(fromId: string, toId: string): Promise<PathResult> {
    try {
      const [fromExists, toExists] = await Promise.all([
        CompanyNode.findOne({ corpId: fromId }),
        CompanyNode.findOne({ corpId: toId }),
      ]);

      if (!fromExists) {
        throw new Error(`Source company ${fromId} does not exist`);
      }
      if (!toExists) {
        throw new Error(`Target company ${toId} does not exist`);
      }

      if (fromId === toId) {
        return {
          exists: true,
          path: [{ corpId: fromId, name: fromExists.name, relationship: 'self' }],
          hops: 0,
        };
      }

      // Build adjacency list from edges
      const edges = await CompanyEdge.find({ status: 'active' });
      const adjacencyList = new Map<string, Array<{ targetId: string; relationship: string }>>();

      // Initialize adjacency list
      const allCorpIds = new Set<string>();
      edges.forEach((edge) => {
        allCorpIds.add(edge.sourceId);
        allCorpIds.add(edge.targetId);
      });

      allCorpIds.forEach((corpId) => {
        adjacencyList.set(corpId, []);
      });

      // Populate adjacency list
      edges.forEach((edge) => {
        adjacencyList.get(edge.sourceId)?.push({
          targetId: edge.targetId,
          relationship: edge.relationship,
        });
        // For bidirectional relationships, add reverse edge
        if (edge.direction === 'bidirectional') {
          adjacencyList.get(edge.targetId)?.push({
            targetId: edge.sourceId,
            relationship: edge.relationship,
          });
        }
      });

      // BFS to find shortest path
      const visited = new Set<string>();
      const queue: Array<{ corpId: string; path: PathNode[] }> = [];
      const companyNames = new Map<string, string>();

      nodes: for (const node of await CompanyNode.find()) {
        companyNames.set(node.corpId, node.name);
      }

      queue.push({
        corpId: fromId,
        path: [{ corpId: fromId, name: companyNames.get(fromId) || fromId, relationship: 'start' }],
      });
      visited.add(fromId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adjacencyList.get(current.corpId) || [];

        for (const neighbor of neighbors) {
          if (neighbor.targetId === toId) {
            return {
              exists: true,
              path: [...current.path, {
                corpId: neighbor.targetId,
                name: companyNames.get(neighbor.targetId) || neighbor.targetId,
                relationship: neighbor.relationship,
              }],
              hops: current.path.length,
            };
          }

          if (!visited.has(neighbor.targetId)) {
            visited.add(neighbor.targetId);
            queue.push({
              corpId: neighbor.targetId,
              path: [...current.path, {
                corpId: neighbor.targetId,
                name: companyNames.get(neighbor.targetId) || neighbor.targetId,
                relationship: neighbor.relationship,
              }],
            });
          }
        }
      }

      return {
        exists: false,
        hops: -1,
      };
    } catch (error) {
      logger.error('Error finding path', { error, fromId, toId });
      throw error;
    }
  }

  /**
   * Update a company
   */
  async updateCompany(corpId: string, updates: Partial<AddCompanyInput>): Promise<ICompanyNode | null> {
    try {
      const company = await CompanyNode.findOneAndUpdate(
        { corpId },
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (company) {
        logger.info(`Company updated: ${corpId}`);
      }
      return company;
    } catch (error) {
      logger.error('Error updating company', { error, corpId });
      throw error;
    }
  }

  /**
   * Delete a company and its relationships
   */
  async deleteCompany(corpId: string): Promise<boolean> {
    try {
      const [company, result] = await Promise.all([
        CompanyNode.findOne({ corpId }),
        CompanyNode.deleteOne({ corpId }),
        CompanyEdge.deleteMany({
          $or: [{ sourceId: corpId }, { targetId: corpId }],
        }),
      ]);

      if (result.deletedCount === 0) {
        throw new Error(`Company ${corpId} not found`);
      }

      logger.info(`Company deleted: ${corpId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting company', { error, corpId });
      throw error;
    }
  }

  /**
   * Update a relationship
   */
  async updateRelationship(edgeId: string, updates: Partial<ICompanyEdge>): Promise<ICompanyEdge | null> {
    try {
      const edge = await CompanyEdge.findOneAndUpdate(
        { edgeId },
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (edge) {
        logger.info(`Relationship updated: ${edgeId}`);
      }
      return edge;
    } catch (error) {
      logger.error('Error updating relationship', { error, edgeId });
      throw error;
    }
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(edgeId: string): Promise<boolean> {
    try {
      const result = await CompanyEdge.deleteOne({ edgeId });
      if (result.deletedCount === 0) {
        throw new Error(`Relationship ${edgeId} not found`);
      }
      logger.info(`Relationship deleted: ${edgeId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting relationship', { error, edgeId });
      throw error;
    }
  }
}

export const intercompanyService = new IntercompanyService();
