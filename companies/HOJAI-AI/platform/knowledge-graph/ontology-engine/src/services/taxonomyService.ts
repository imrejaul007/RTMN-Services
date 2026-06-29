/**
 * Taxonomy Service - Hierarchical category management
 *
 * Implements:
 * 1. Hierarchical categories with parent-child relationships
 * 2. Traversal algorithms (DFS, BFS)
 * 3. Ancestor/descendant queries
 * 4. Path computation
 */

import { query } from '../db/database.js';
import type {
  TaxonomyNode,
  TaxonomyNodeRow,
  TraversalOptions,
  TaxonomyCreateRequest,
  TaxonomyUpdateRequest
} from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';

export class TaxonomyService {
  /**
   * Create a new taxonomy node
   */
  async create(data: TaxonomyCreateRequest): Promise<TaxonomyNode> {
    const id = uuidv4();
    const slug = data.slug || this.generateSlug(data.name);

    // Calculate depth based on parent
    let depth = 0;
    let path = id;

    if (data.parentId) {
      const parent = await this.getById(data.parentId);
      if (parent) {
        depth = parent.depth + 1;
        path = `${parent.path}.${id}`;
      }
    }

    const result = await query<TaxonomyNodeRow>(
      `INSERT INTO taxonomy_nodes (id, name, slug, parent_id, class_id, depth, path, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, data.name, slug, data.parentId || null, data.classId || null, depth, path, data.metadata || {}]
    );

    return this.mapRowToNode(result.rows[0]);
  }

  /**
   * Get a taxonomy node by ID
   */
  async getById(id: string): Promise<TaxonomyNode | null> {
    const result = await query<TaxonomyNodeRow>(
      'SELECT * FROM taxonomy_nodes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToNode(result.rows[0]);
  }

  /**
   * Get a taxonomy node by slug
   */
  async getBySlug(slug: string): Promise<TaxonomyNode | null> {
    const result = await query<TaxonomyNodeRow>(
      'SELECT * FROM taxonomy_nodes WHERE slug = $1',
      [slug]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToNode(result.rows[0]);
  }

  /**
   * Get all taxonomy nodes
   */
  async getAll(): Promise<TaxonomyNode[]> {
    const result = await query<TaxonomyNodeRow>(
      'SELECT * FROM taxonomy_nodes ORDER BY depth, name'
    );

    return result.rows.map(row => this.mapRowToNode(row));
  }

  /**
   * Get root nodes (nodes without parents)
   */
  async getRootNodes(): Promise<TaxonomyNode[]> {
    const result = await query<TaxonomyNodeRow>(
      'SELECT * FROM taxonomy_nodes WHERE parent_id IS NULL ORDER BY name'
    );

    return result.rows.map(row => this.mapRowToNode(row));
  }

  /**
   * Get children of a node
   */
  async getChildren(parentId: string): Promise<TaxonomyNode[]> {
    const result = await query<TaxonomyNodeRow>(
      'SELECT * FROM taxonomy_nodes WHERE parent_id = $1 ORDER BY name',
      [parentId]
    );

    return result.rows.map(row => this.mapRowToNode(row));
  }

  /**
   * Update a taxonomy node
   */
  async update(id: string, data: TaxonomyUpdateRequest): Promise<TaxonomyNode | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
      // Also update slug if not explicitly set
      if (!data.slug) {
        updates.push(`slug = $${paramIndex++}`);
        values.push(this.generateSlug(data.name));
      }
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(data.slug);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(data.metadata);
    }

    // Handle parent change (move in hierarchy)
    if (data.parentId !== undefined) {
      await this.moveNode(id, data.parentId);
      return this.getById(id);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const result = await query<TaxonomyNodeRow>(
      `UPDATE taxonomy_nodes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToNode(result.rows[0]);
  }

  /**
   * Move a node to a new parent
   */
  private async moveNode(nodeId: string, newParentId: string | null): Promise<void> {
    // Get the node
    const node = await this.getById(nodeId);
    if (!node) throw new Error('Node not found');

    // Prevent moving a node under itself or its descendants
    if (newParentId) {
      const descendants = await this.getDescendants(nodeId);
      if (descendants.some(d => d.id === newParentId)) {
        throw new Error('Cannot move a node under its own descendant');
      }
    }

    // Calculate new depth and path
    let depth = 0;
    let path = nodeId;

    if (newParentId) {
      const parent = await this.getById(newParentId);
      if (parent) {
        depth = parent.depth + 1;
        path = `${parent.path}.${nodeId}`;
      }
    }

    // Update the node
    await query(
      'UPDATE taxonomy_nodes SET parent_id = $1, depth = $2, path = $3 WHERE id = $4',
      [newParentId, depth, path, nodeId]
    );

    // Update all descendants' paths and depths
    await this.updateDescendantPaths(nodeId, path, depth + 1);
  }

  /**
   * Update paths and depths for all descendants
   */
  private async updateDescendantPaths(nodeId: string, parentPath: string, startDepth: number): Promise<void> {
    const descendants = await this.getDescendants(nodeId);

    for (const descendant of descendants) {
      const newPath = `${parentPath}.${descendant.id}`;
      const depthDiff = startDepth + this.getRelativeDepth(descendant, nodeId) - descendant.depth;

      await query(
        'UPDATE taxonomy_nodes SET path = $1, depth = depth + $2 WHERE id = $3',
        [newPath, depthDiff, descendant.id]
      );
    }
  }

  /**
   * Get relative depth of a node from an ancestor
   */
  private getRelativeDepth(node: TaxonomyNode, ancestorId: string): number {
    // Simple calculation based on path
    const nodeParts = node.path.split('.');
    const ancestorIndex = nodeParts.indexOf(ancestorId);
    return ancestorIndex >= 0 ? nodeParts.length - ancestorIndex - 1 : 0;
  }

  /**
   * Delete a taxonomy node
   */
  async delete(id: string): Promise<boolean> {
    // First, move children to the deleted node's parent
    const node = await this.getById(id);
    if (!node) return false;

    const children = await this.getChildren(id);
    for (const child of children) {
      await query(
        'UPDATE taxonomy_nodes SET parent_id = $1 WHERE id = $2',
        [node.parentId, child.id]
      );
    }

    const result = await query(
      'DELETE FROM taxonomy_nodes WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rowCount > 0;
  }

  /**
   * Get all ancestors of a node (breadcrumb path)
   */
  async getAncestors(id: string): Promise<TaxonomyNode[]> {
    const result = await query<TaxonomyNodeRow>(
      `WITH RECURSIVE ancestors AS (
        SELECT tn.*, 0 as level
        FROM taxonomy_nodes tn
        WHERE tn.id = $1
        UNION ALL
        SELECT tn.*, a.level + 1
        FROM taxonomy_nodes tn
        INNER JOIN ancestors a ON tn.id = a.parent_id
      )
      SELECT * FROM ancestors WHERE id != $1 ORDER BY level`,
      [id]
    );

    return result.rows.map(row => this.mapRowToNode(row));
  }

  /**
   * Get all descendants of a node
   */
  async getDescendants(id: string): Promise<TaxonomyNode[]> {
    const result = await query<TaxonomyNodeRow>(
      `WITH RECURSIVE descendants AS (
        SELECT tn.*, 0 as level
        FROM taxonomy_nodes tn
        WHERE tn.parent_id = $1
        UNION ALL
        SELECT tn.*, d.level + 1
        FROM taxonomy_nodes tn
        INNER JOIN descendants d ON tn.parent_id = d.id
      )
      SELECT * FROM descendants ORDER BY level, name`,
      [id]
    );

    return result.rows.map(row => this.mapRowToNode(row));
  }

  /**
   * Get subtree rooted at a node
   */
  async getSubtree(id: string, options?: TraversalOptions): Promise<TaxonomyNode> {
    const node = await this.getById(id);
    if (!node) throw new Error('Node not found');

    const maxDepth = options?.maxDepth ?? Infinity;
    node.children = await this.buildSubtree(id, 0, maxDepth, options?.filter);

    return node;
  }

  /**
   * Build subtree recursively
   */
  private async buildSubtree(
    nodeId: string,
    currentDepth: number,
    maxDepth: number,
    filter?: (node: TaxonomyNode) => boolean
  ): Promise<TaxonomyNode[]> {
    if (currentDepth >= maxDepth) return [];

    const children = await this.getChildren(nodeId);
    const filtered = filter ? children.filter(filter) : children;

    const result: TaxonomyNode[] = [];
    for (const child of filtered) {
      child.children = await this.buildSubtree(child.id, currentDepth + 1, maxDepth, filter);
      result.push(child);
    }

    return result;
  }

  /**
   * Traverse the taxonomy tree
   */
  async traverse(options?: TraversalOptions): Promise<TaxonomyNode[]> {
    const direction = options?.direction ?? 'down';
    const maxDepth = options?.maxDepth ?? Infinity;

    if (direction === 'up') {
      // BFS upward from roots
      return this.traverseUpwards(maxDepth, options?.filter);
    } else if (direction === 'both') {
      // Get all nodes
      const all = await this.getAll();
      return options?.filter ? all.filter(options.filter) : all;
    } else {
      // BFS downward from roots
      return this.traverseDownwards(maxDepth, options?.filter);
    }
  }

  /**
   * BFS traversal downward from root nodes
   */
  private async traverseDownwards(
    maxDepth: number,
    filter?: (node: TaxonomyNode) => boolean
  ): Promise<TaxonomyNode[]> {
    const result: TaxonomyNode[] = [];
    const roots = await this.getRootNodes();

    const queue: Array<{ node: TaxonomyNode; depth: number }> = roots.map(n => ({ node: n, depth: 0 }));

    while (queue.length > 0) {
      const { node, depth } = queue.shift()!;

      if (depth > maxDepth) continue;
      if (filter && !filter(node)) continue;

      result.push(node);

      const children = await this.getChildren(node.id);
      for (const child of children) {
        queue.push({ node: child, depth: depth + 1 });
      }
    }

    return result;
  }

  /**
   * BFS traversal upward from leaf nodes
   */
  private async traverseUpwards(
    maxDepth: number,
    filter?: (node: TaxonomyNode) => boolean
  ): Promise<TaxonomyNode[]> {
    // Get all nodes and filter to leaves
    const all = await this.getAll();
    const leaves = all.filter(n => !all.some(other => other.parentId === n.id));
    const visited = new Set<string>();
    const result: TaxonomyNode[] = [];

    const queue: Array<{ node: TaxonomyNode; depth: number }> = leaves.map(n => ({ node: n, depth: 0 }));

    while (queue.length > 0) {
      const { node, depth } = queue.shift()!;

      if (visited.has(node.id)) continue;
      if (depth > maxDepth) continue;

      visited.add(node.id);
      if (filter && !filter(node)) continue;

      result.push(node);

      if (node.parentId) {
        const parent = await this.getById(node.parentId);
        if (parent) {
          queue.push({ node: parent, depth: depth + 1 });
        }
      }
    }

    return result;
  }

  /**
   * Find nodes matching a predicate
   */
  async find(predicate: (node: TaxonomyNode) => boolean): Promise<TaxonomyNode[]> {
    const all = await this.getAll();
    return all.filter(predicate);
  }

  /**
   * Get nodes at a specific depth
   */
  async getByDepth(depth: number): Promise<TaxonomyNode[]> {
    const result = await query<TaxonomyNodeRow>(
      'SELECT * FROM taxonomy_nodes WHERE depth = $1 ORDER BY name',
      [depth]
    );

    return result.rows.map(row => this.mapRowToNode(row));
  }

  /**
   * Get the path from root to a node
   */
  async getPath(id: string): Promise<string[]> {
    const ancestors = await this.getAncestors(id);
    return [id, ...ancestors.map(a => a.id)].reverse();
  }

  /**
   * Check if a node is an ancestor of another
   */
  async isAncestorOf(ancestorId: string, nodeId: string): Promise<boolean> {
    const ancestors = await this.getAncestors(nodeId);
    return ancestors.some(a => a.id === ancestorId);
  }

  /**
   * Check if a node is a descendant of another
   */
  async isDescendantOf(nodeId: string, ancestorId: string): Promise<boolean> {
    return this.isAncestorOf(ancestorId, nodeId);
  }

  /**
   * Get siblings of a node
   */
  async getSiblings(id: string): Promise<TaxonomyNode[]> {
    const node = await this.getById(id);
    if (!node || !node.parentId) return [];

    const siblings = await this.getChildren(node.parentId);
    return siblings.filter(s => s.id !== id);
  }

  /**
   * Get the nearest common ancestor of two nodes
   */
  async getCommonAncestor(id1: string, id2: string): Promise<TaxonomyNode | null> {
    const ancestors1 = await this.getAncestors(id1);
    const ancestors2 = await this.getAncestors(id2);

    const set1 = new Set(ancestors1.map(a => a.id));

    for (const ancestor of ancestors2) {
      if (set1.has(ancestor.id)) {
        return ancestor;
      }
    }

    return null;
  }

  /**
   * Get distance between two nodes in the tree
   */
  async getDistance(id1: string, id2: string): Promise<number> {
    const ancestors1 = [{ id: id1 }, ...await this.getAncestors(id1)];
    const ancestors2 = [{ id: id2 }, ...await this.getAncestors(id2)];

    const set1 = new Set(ancestors1.map(a => a.id));

    for (let i = 0; i < ancestors2.length; i++) {
      if (set1.has(ancestors2[i].id)) {
        return i + ancestors1.findIndex(a => a.id === ancestors2[i].id);
      }
    }

    return -1; // No common ancestor (should not happen in a tree)
  }

  /**
   * Get statistics about the taxonomy
   */
  async getStats(): Promise<{
    totalNodes: number;
    maxDepth: number;
    avgDepth: number;
    nodesPerDepth: Record<number, number>;
  }> {
    const all = await this.getAll();

    const nodesPerDepth: Record<number, number> = {};
    let maxDepth = 0;
    let totalDepth = 0;

    for (const node of all) {
      nodesPerDepth[node.depth] = (nodesPerDepth[node.depth] || 0) + 1;
      maxDepth = Math.max(maxDepth, node.depth);
      totalDepth += node.depth;
    }

    return {
      totalNodes: all.length,
      maxDepth,
      avgDepth: all.length > 0 ? totalDepth / all.length : 0,
      nodesPerDepth
    };
  }

  /**
   * Generate a URL-safe slug from a name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Map database row to TaxonomyNode
   */
  private mapRowToNode(row: TaxonomyNodeRow): TaxonomyNode {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parent_id || undefined,
      classId: row.class_id || undefined,
      depth: row.depth,
      path: row.path,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const taxonomyService = new TaxonomyService();
export default taxonomyService;
