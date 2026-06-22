// ============================================================================
// SUTAR Marketplace - Category Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { storage, COLLECTIONS } from './storage';
import {
  Category,
  CategoryTree,
  CategoryStatus,
  CategorySearchParams,
} from './types';

export class CategoryService {
  // Create a new category
  public createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    image?: string;
    parentId?: string;
    order?: number;
    status?: CategoryStatus;
    metadata?: Record<string, unknown>;
  }): Category {
    const slug = data.slug || this.generateSlug(data.name);

    // Validate parent exists if provided
    if (data.parentId) {
      const parent = this.getCategory(data.parentId);
      if (!parent) {
        throw new Error('Parent category not found');
      }
    }

    const category: Category = {
      id: `cat-${uuidv4()}`,
      name: data.name,
      slug,
      description: data.description || '',
      icon: data.icon || 'folder',
      image: data.image,
      parentId: data.parentId,
      children: [],
      order: data.order || 0,
      status: data.status || 'active',
      serviceCount: 0,
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.create(COLLECTIONS.CATEGORIES, category);
    console.log(`[CATEGORY] Created category: ${category.id} - ${category.name}`);

    // Update parent's children array
    if (data.parentId) {
      const parent = this.getCategory(data.parentId);
      if (parent) {
        const childNode: CategoryTree = { id: category.id, name: category.name, slug: category.slug, icon: category.icon, children: [], serviceCount: 0 };
        this.updateCategory(data.parentId, {
          children: [...parent.children, childNode],
        });
      }
    }

    return category;
  }

  // Get category by ID
  public getCategory(id: string): Category | undefined {
    return storage.get<Category>(COLLECTIONS.CATEGORIES, id);
  }

  // Get category by slug
  public getCategoryBySlug(slug: string): Category | undefined {
    return storage.findOne<Category>(
      COLLECTIONS.CATEGORIES,
      c => c.slug === slug
    );
  }

  // Update category
  public updateCategory(id: string, updates: Partial<Category>): Category | undefined {
    const category = this.getCategory(id);
    if (!category) return undefined;

    // Handle slug update
    if (updates.slug && updates.slug !== category.slug) {
      updates.slug = this.generateSlug(updates.slug);
    }

    const updated: Category = {
      ...category,
      ...updates,
      id: category.id,
      createdAt: category.createdAt,
      updatedAt: new Date().toISOString(),
    };

    storage.update(COLLECTIONS.CATEGORIES, id, updated);
    console.log(`[CATEGORY] Updated category: ${id}`);

    return updated;
  }

  // Delete category
  public deleteCategory(id: string): boolean {
    const category = this.getCategory(id);
    if (!category) return false;

    // Move children to parent or make them root categories
    if (category.children.length > 0) {
      category.children.forEach(child => {
        this.updateCategory(child.id, { parentId: category.parentId });
      });
    }

    // Update parent's children array
    if (category.parentId) {
      const parent = this.getCategory(category.parentId);
      if (parent) {
        const newChildren = parent.children.filter(c => c.id !== id);
        this.updateCategory(category.parentId, { children: newChildren });
      }
    }

    return storage.delete(COLLECTIONS.CATEGORIES, id);
  }

  // Get all categories
  public getAllCategories(params: CategorySearchParams = {}): Category[] {
    const { parentId, status, limit = 100, offset = 0 } = params;
    let categories = storage.getAll<Category>(COLLECTIONS.CATEGORIES);

    if (parentId !== undefined) {
      categories = categories.filter(c => c.parentId === parentId);
    }

    if (status) {
      categories = categories.filter(c => c.status === status);
    }

    // Sort by order
    categories.sort((a, b) => a.order - b.order);

    return categories.slice(offset, offset + limit);
  }

  // Get category tree (hierarchical structure)
  public getCategoryTree(includeHidden = false): CategoryTree[] {
    const allCategories = storage.getAll<Category>(COLLECTIONS.CATEGORIES);
    const filtered = includeHidden
      ? allCategories
      : allCategories.filter(c => c.status === 'active');

    // Build tree structure
    const categoryMap = new Map<string, CategoryTree>();
    const roots: CategoryTree[] = [];

    // First pass: create tree nodes
    filtered.forEach(cat => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        children: [],
        serviceCount: cat.serviceCount,
      });
    });

    // Second pass: build hierarchy
    filtered.forEach(cat => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children.push(node);
      } else if (!cat.parentId) {
        roots.push(node);
      }
    });

    // Sort children by order and name
    const sortChildren = (nodes: CategoryTree[]): void => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortChildren(node.children));
    };
    sortChildren(roots);

    return roots;
  }

  // Get category path (breadcrumb)
  public getCategoryPath(id: string): Category[] {
    const path: Category[] = [];
    let current = this.getCategory(id);

    while (current) {
      path.unshift(current);
      current = current.parentId ? this.getCategory(current.parentId) : undefined;
    }

    return path;
  }

  // Get root categories
  public getRootCategories(): Category[] {
    return storage.find<Category>(
      COLLECTIONS.CATEGORIES,
      c => !c.parentId && c.status === 'active'
    );
  }

  // Get child categories
  public getChildCategories(parentId: string): Category[] {
    return storage.find<Category>(
      COLLECTIONS.CATEGORIES,
      c => c.parentId === parentId && c.status === 'active'
    );
  }

  // Get sibling categories
  public getSiblingCategories(id: string): Category[] {
    const category = this.getCategory(id);
    if (!category) return [];

    return storage.find<Category>(
      COLLECTIONS.CATEGORIES,
      c => c.parentId === category.parentId && c.id !== id && c.status === 'active'
    );
  }

  // Update service count for category
  public updateServiceCount(id: string, delta: number): void {
    const category = this.getCategory(id);
    if (category) {
      this.updateCategory(id, { serviceCount: category.serviceCount + delta });

      // Also update parent
      if (category.parentId) {
        this.updateServiceCount(category.parentId, delta);
      }
    }
  }

  // Move category to new parent
  public moveCategory(id: string, newParentId?: string): Category | undefined {
    const category = this.getCategory(id);
    if (!category) return undefined;

    // Prevent moving to self or descendant
    if (newParentId) {
      const descendants = this.getDescendants(id);
      if (descendants.some(d => d.id === newParentId)) {
        throw new Error('Cannot move category to its own descendant');
      }
    }

    // Remove from old parent
    if (category.parentId) {
      const oldParent = this.getCategory(category.parentId);
      if (oldParent) {
        const newChildren = oldParent.children.filter(c => c.id !== id);
        this.updateCategory(category.parentId!, { children: newChildren });
      }
    }

    // Add to new parent
    if (newParentId) {
      const newParent = this.getCategory(newParentId);
      if (newParent) {
        const newChildren = [
          ...newParent.children,
          { id: category.id, name: category.name, slug: category.slug, icon: category.icon, children: [], serviceCount: category.serviceCount },
        ];
        this.updateCategory(newParentId, { children: newChildren });
      }
    }

    // Update category
    return this.updateCategory(id, { parentId: newParentId });
  }

  // Get all descendants of a category
  public getDescendants(id: string): Category[] {
    const descendants: Category[] = [];
    const children = this.getChildCategories(id);

    children.forEach(child => {
      descendants.push(child);
      descendants.push(...this.getDescendants(child.id));
    });

    return descendants;
  }

  // Get all ancestor IDs of a category
  public getAncestorIds(id: string): string[] {
    const ancestors: string[] = [];
    let category = this.getCategory(id);

    while (category?.parentId) {
      ancestors.push(category.parentId);
      category = this.getCategory(category.parentId);
    }

    return ancestors;
  }

  // Reorder categories
  public reorderCategories(categoryIds: string[]): void {
    categoryIds.forEach((id, index) => {
      this.updateCategory(id, { order: index });
    });
  }

  // Search categories
  public searchCategories(query: string): Category[] {
    const lowerQuery = query.toLowerCase();
    return storage.find<Category>(
      COLLECTIONS.CATEGORIES,
      c =>
        (c.name.toLowerCase().includes(lowerQuery) ||
          c.description.toLowerCase().includes(lowerQuery) ||
          c.slug.toLowerCase().includes(lowerQuery)) &&
        c.status === 'active'
    );
  }

  // Validate category
  public validateCategory(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    if (data.parentId) {
      const parent = this.getCategory(data.parentId);
      if (!parent) {
        errors.push('Parent category not found');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Initialize default categories
  public initializeDefaultCategories(): void {
    const existing = storage.count(COLLECTIONS.CATEGORIES);
    if (existing > 0) return;

    const defaultCategories = [
      { name: 'Development Tools', icon: 'code', order: 1 },
      { name: 'Business & Productivity', icon: 'briefcase', order: 2 },
      { name: 'Design & Creative', icon: 'palette', order: 3 },
      { name: 'Marketing & Analytics', icon: 'chart', order: 4 },
      { name: 'Communication', icon: 'message', order: 5 },
      { name: 'Security & Privacy', icon: 'shield', order: 6 },
      { name: 'Data & Storage', icon: 'database', order: 7 },
      { name: 'AI & Machine Learning', icon: 'brain', order: 8 },
    ];

    defaultCategories.forEach(cat => {
      this.createCategory(cat);
    });

    console.log('[CATEGORY] Initialized default categories');
  }

  // Generate slug from name
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

// Singleton instance
export const categoryService = new CategoryService();