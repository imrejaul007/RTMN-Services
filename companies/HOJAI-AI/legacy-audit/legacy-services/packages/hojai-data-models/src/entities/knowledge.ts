/**
 * Hojai Data Models - Knowledge Entity (Graph Model)
 * Version: 1.0.0 | Date: May 30, 2026
 *
 * Knowledge Graph Model:
 * - KnowledgeNode: Individual knowledge units
 * - KnowledgeEdge: Relationships between nodes
 * - KnowledgeSource: Origin of knowledge
 */

import { z } from 'zod';

// ============================================
// KNOWLEDGE NODE TYPES
// ============================================

/**
 * Knowledge node types
 */
export type KnowledgeNodeType = 'concept' | 'entity' | 'fact' | 'rule' | 'faq' | 'sop' | 'policy';

/**
 * Knowledge status
 */
export type KnowledgeStatus = 'draft' | 'active' | 'archived' | 'pending_review';

/**
 * Knowledge source type
 */
export type KnowledgeSourceType = 'manual' | 'imported' | 'ai_generated' | 'extracted' | 'api';

/**
 * Knowledge node - individual knowledge unit
 */
export interface KnowledgeNode {
  // Core identification
  id: string;
  tenant_id: string;

  // Type and classification
  type: KnowledgeNodeType;
  category: string;
  subcategory?: string;
  tags: string[];

  // Content
  title: string;
  content: string;
  summary?: string;

  // Format
  format: 'text' | 'markdown' | 'html' | 'structured' | 'faq';

  // Metadata
  metadata: Record<string, unknown>;

  // Source tracking
  source_type: KnowledgeSourceType;
  source_id?: string;
  source_url?: string;

  // AI features
  embedding?: number[]; // Vector embedding for semantic search
  embedding_model?: string;

  // Quality metrics
  quality_score?: number; // 0-100
  verified: boolean;
  verified_by?: string;
  verified_at?: string;

  // Usage tracking
  usage_count: number;
  helpful_count: number;
  not_helpful_count: number;

  // Status
  status: KnowledgeStatus;
  is_published: boolean;

  // Scheduling
  effective_from?: string;
  expires_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

/**
 * Knowledge edge - relationship between nodes
 */
export interface KnowledgeEdge {
  // Core identification
  id: string;
  tenant_id: string;

  // Edge definition
  source_id: string;
  target_id: string;
  relationship: KnowledgeRelationship;

  // Edge properties
  confidence: number; // 0-1
  bidirectional: boolean;
  weight?: number;

  // Context
  context?: string;

  // Usage
  usage_count: number;

  // Status
  status: 'active' | 'archived';

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Knowledge relationship types
 */
export type KnowledgeRelationship =
  | 'is_a'           // Cat is_a Animal
  | 'part_of'        // Wheel part_of Car
  | 'related_to'     // Coffee related_to Tea
  | 'causes'         // Smoking causes Cancer
  | 'enables'        // Training enables Growth
  | 'conflicts_with' // This conflicts_with That
  | 'depends_on'      // B depends_on A
  | 'synonym_of'      // Big synonym_of Large
  | 'antonym_of'     // Hot antonym_of Cold
  | 'example_of'     // Einstein example_of Scientist
  | 'owned_by'       // Car owned_by Person
  | 'located_in'      // Mumbai located_in India;

/**
 * Knowledge source - origin of knowledge
 */
export interface KnowledgeSource {
  id: string;
  tenant_id: string;

  // Source info
  name: string;
  type: 'document' | 'website' | 'api' | 'manual' | 'ai' | 'database';
  url?: string;

  // Sync status
  last_synced_at?: string;
  sync_status: 'active' | 'syncing' | 'error' | 'paused';

  // Statistics
  total_nodes: number;
  last_node_count: number;

  // Auth (for protected sources)
  auth_type?: 'none' | 'api_key' | 'oauth' | 'basic';

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Knowledge collection - group of related knowledge
 */
export interface KnowledgeCollection {
  id: string;
  tenant_id: string;

  name: string;
  description?: string;
  icon?: string;
  color?: string;

  // Nodes in this collection
  node_ids: string[];

  // Access control
  is_public: boolean;
  allowed_roles: string[];

  // Stats
  node_count: number;

  // Status
  status: 'active' | 'archived';

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================
// ZOD SCHEMAS
// ============================================

export const KnowledgeNodeCreateSchema = z.object({
  type: z.enum(['concept', 'entity', 'fact', 'rule', 'faq', 'sop', 'policy']),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).default([]),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  format: z.enum(['text', 'markdown', 'html', 'structured', 'faq']).default('text'),
  source_type: z.enum(['manual', 'imported', 'ai_generated', 'extracted', 'api']).default('manual'),
  source_id: z.string().optional(),
  source_url: z.string().url().optional(),
  is_published: z.boolean().default(false),
  effective_from: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
});

export const KnowledgeNodeUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'active', 'archived', 'pending_review']).optional(),
  is_published: z.boolean().optional(),
  quality_score: z.number().min(0).max(100).optional(),
});

export const KnowledgeEdgeCreateSchema = z.object({
  source_id: z.string().min(1),
  target_id: z.string().min(1),
  relationship: z.enum([
    'is_a', 'part_of', 'related_to', 'causes', 'enables',
    'conflicts_with', 'depends_on', 'synonym_of', 'antonym_of',
    'example_of', 'owned_by', 'located_in'
  ]),
  confidence: z.number().min(0).max(1).default(1),
  bidirectional: z.boolean().default(false),
  weight: z.number().optional(),
  context: z.string().optional(),
});

export const KnowledgeCollectionCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_public: z.boolean().default(true),
  allowed_roles: z.array(z.string()).default(['admin', 'manager']),
});

// ============================================
// KNOWLEDGE RELATIONSHIP LABELS
// ============================================

export const KNOWLEDGE_RELATIONSHIP_LABELS: Record<KnowledgeRelationship, string> = {
  is_a: 'is a type of',
  part_of: 'is part of',
  related_to: 'is related to',
  causes: 'causes',
  enables: 'enables',
  conflicts_with: 'conflicts with',
  depends_on: 'depends on',
  synonym_of: 'is a synonym of',
  antonym_of: 'is an antonym of',
  example_of: 'is an example of',
  owned_by: 'is owned by',
  located_in: 'is located in',
};

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a knowledge node
 */
export function createKnowledgeNode(
  tenantId: string,
  data: z.infer<typeof KnowledgeNodeCreateSchema>
): KnowledgeNode {
  const now = new Date().toISOString();

  return {
    id: `knode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    type: data.type,
    category: data.category,
    subcategory: data.subcategory,
    tags: data.tags,
    title: data.title,
    content: data.content,
    format: data.format,
    metadata: {},
    source_type: data.source_type,
    source_id: data.source_id,
    source_url: data.source_url,
    verified: false,
    usage_count: 0,
    helpful_count: 0,
    not_helpful_count: 0,
    status: 'draft',
    is_published: data.is_published,
    effective_from: data.effective_from,
    expires_at: data.expires_at,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Create a knowledge edge
 */
export function createKnowledgeEdge(
  tenantId: string,
  data: z.infer<typeof KnowledgeEdgeCreateSchema>
): KnowledgeEdge {
  const now = new Date().toISOString();

  return {
    id: `kedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    source_id: data.source_id,
    target_id: data.target_id,
    relationship: data.relationship,
    confidence: data.confidence,
    bidirectional: data.bidirectional,
    weight: data.weight,
    context: data.context,
    usage_count: 0,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Create a knowledge collection
 */
export function createKnowledgeCollection(
  tenantId: string,
  data: z.infer<typeof KnowledgeCollectionCreateSchema>
): KnowledgeCollection {
  const now = new Date().toISOString();

  return {
    id: `kcol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    name: data.name,
    description: data.description,
    icon: data.icon,
    color: data.color,
    node_ids: [],
    is_public: data.is_public,
    allowed_roles: data.allowed_roles,
    node_count: 0,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Mark node as helpful
 */
export function markNodeHelpful(node: KnowledgeNode): KnowledgeNode {
  return {
    ...node,
    helpful_count: node.helpful_count + 1,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Mark node as not helpful
 */
export function markNodeNotHelpful(node: KnowledgeNode): KnowledgeNode {
  return {
    ...node,
    not_helpful_count: node.not_helpful_count + 1,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Update node quality score
 */
export function updateNodeQualityScore(
  node: KnowledgeNode,
  helpfulRate: number
): KnowledgeNode {
  const total = node.helpful_count + node.not_helpful_count;
  const score = total > 0 ? helpfulRate : 50;

  return {
    ...node,
    quality_score: score,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Verify a knowledge node
 */
export function verifyNode(node: KnowledgeNode, verifiedBy: string): KnowledgeNode {
  const now = new Date().toISOString();

  return {
    ...node,
    verified: true,
    verified_by: verifiedBy,
    verified_at: now,
    status: node.status === 'pending_review' ? 'active' : node.status,
    updated_at: now,
  };
}

/**
 * Increment node usage
 */
export function incrementNodeUsage(node: KnowledgeNode): KnowledgeNode {
  return {
    ...node,
    usage_count: node.usage_count + 1,
    last_used_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Archive a node
 */
export function archiveNode(node: KnowledgeNode): KnowledgeNode {
  return {
    ...node,
    status: 'archived',
    is_published: false,
    updated_at: new Date().toISOString(),
  };
}

// ============================================
// GRAPH UTILITIES
// ============================================

/**
 * Find connected nodes within N hops
 */
export function findConnectedNodes(
  edges: KnowledgeEdge[],
  nodeId: string,
  maxHops: number = 2
): { nodeId: string; hops: number; relationship: KnowledgeRelationship }[] {
  const visited = new Set<string>();
  const results: { nodeId: string; hops: number; relationship: KnowledgeRelationship }[] = [];

  function traverse(currentId: string, hops: number) {
    if (hops > maxHops || visited.has(currentId)) return;
    visited.add(currentId);

    for (const edge of edges) {
      if (edge.status !== 'active') continue;

      let nextNode: string | null = null;
      let relationship: KnowledgeRelationship | null = null;

      if (edge.source_id === currentId) {
        nextNode = edge.target_id;
        relationship = edge.relationship;
      } else if (edge.bidirectional && edge.target_id === currentId) {
        nextNode = edge.source_id;
        relationship = edge.relationship;
      }

      if (nextNode && !visited.has(nextNode)) {
        results.push({
          nodeId: nextNode,
          hops: hops + 1,
          relationship: relationship!,
        });
        traverse(nextNode, hops + 1);
      }
    }
  }

  traverse(nodeId, 0);
  return results;
}

/**
 * Build adjacency list from edges
 */
export function buildAdjacencyList(
  edges: KnowledgeEdge[]
): Map<string, { nodeId: string; relationship: KnowledgeRelationship; bidirectional: boolean }[]> {
  const adjacency = new Map<string, { nodeId: string; relationship: KnowledgeRelationship; bidirectional: boolean }[]>();

  for (const edge of edges) {
    if (edge.status !== 'active') continue;

    // Add forward direction
    if (!adjacency.has(edge.source_id)) {
      adjacency.set(edge.source_id, []);
    }
    adjacency.get(edge.source_id)!.push({
      nodeId: edge.target_id,
      relationship: edge.relationship,
      bidirectional: edge.bidirectional,
    });

    // Add backward direction if bidirectional
    if (edge.bidirectional) {
      if (!adjacency.has(edge.target_id)) {
        adjacency.set(edge.target_id, []);
      }
      adjacency.get(edge.target_id)!.push({
        nodeId: edge.source_id,
        relationship: edge.relationship,
        bidirectional: true,
      });
    }
  }

  return adjacency;
}

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeSource,
  KnowledgeCollection,
};

export {
  KnowledgeNodeCreateSchema,
  KnowledgeNodeUpdateSchema,
  KnowledgeEdgeCreateSchema,
  KnowledgeCollectionCreateSchema,
  KNOWLEDGE_RELATIONSHIP_LABELS,
  createKnowledgeNode,
  createKnowledgeEdge,
  createKnowledgeCollection,
  markNodeHelpful,
  markNodeNotHelpful,
  updateNodeQualityScore,
  verifyNode,
  incrementNodeUsage,
  archiveNode,
  findConnectedNodes,
  buildAdjacencyList,
};
