// Universal Business Graph Types

export type EntityType =
  | 'customer'
  | 'order'
  | 'payment'
  | 'product'
  | 'service'
  | 'company'
  | 'employee'
  | 'vendor'
  | 'location'
  | 'campaign'
  | 'transaction'
  | 'subscription'
  | 'review'
  | 'inventory'
  | 'agent'
  | 'goal'
  | 'task'
  | 'document'
  | 'asset'
  | 'event'
  | 'deal'
  | 'lead'
  | 'opportunity'
  | 'invoice'
  | 'shipment';

export type EdgeType =
  | 'owns'
  | 'purchased'
  | 'paid'
  | 'shipped'
  | 'contains'
  | 'references'
  | 'belongs_to'
  | 'managed_by'
  | 'works_at'
  | 'referred_by'
  | 'depends_on'
  | 'related_to'
  | 'similar_to'
  | 'competes_with'
  | 'partners_with'
  | 'invested_in'
  | 'approved'
  | 'rejected'
  | 'created'
  | 'updated'
  | 'deleted';

export interface GraphNode {
  id: string;
  entityType: EntityType;
  entityId: string;
  name: string;
  properties: Record<string, unknown>;
  metadata?: {
    source?: string;
    createdAt?: Date;
    updatedAt?: Date;
    version?: number;
  };
  labels?: string[];
  score?: number;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: EdgeType;
  properties: Record<string, unknown>;
  weight?: number;
  metadata?: {
    createdAt?: Date;
    updatedAt?: Date;
    source?: string;
  };
}

export interface GraphQuery {
  entityType?: EntityType;
  entityId?: string;
  labels?: string[];
  properties?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface PathQuery {
  sourceNodeId: string;
  targetNodeId: string;
  maxDepth?: number;
  edgeTypes?: EdgeType[];
}

export interface PathResult {
  path: GraphNode[];
  edges: GraphEdge[];
  totalWeight: number;
  depth: number;
}

export interface RecommendationQuery {
  nodeId: string;
  types?: EntityType[];
  maxResults?: number;
  minWeight?: number;
}

export interface Recommendation {
  node: GraphNode;
  score: number;
  reason: string;
  path?: GraphNode[];
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<EntityType, number>;
  edgesByType: Record<EdgeType, number>;
  avgDegree: number;
}

export interface TraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  visited: number;
  depth: number;
}

export interface NetworkAnalysis {
  nodeId: string;
  degree: number;
  inDegree: number;
  outDegree: number;
  betweenness?: number;
  closeness?: number;
  clustering?: number;
}

export interface GraphResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: Date;
    count?: number;
    page?: number;
    total?: number;
  };
}
