/**
 * Category Service - Business logic for category operations
 */

import { v4 as uuidv4 } from 'uuid';
import { Category, ICategory } from '../models/Category';
import logger from 'utils/logger.js';

export interface CreateCategoryInput {
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  color?: string;
  order?: number;
}

export class CategoryService {
  /**
   * Create a new category
   */
  async createCategory(input: CreateCategoryInput): Promise<ICategory> {
    const slug = this.generateSlug(input.name);

    const categoryData: Partial<ICategory> = {
      categoryId: `CAT-${uuidv4().slice(0, 8).toUpperCase()}`,
      name: input.name,
      slug,
      description: input.description || '',
      parentId: input.parentId,
      icon: input.icon,
      color: input.color,
      order: input.order || 0,
      isActive: true,
      articleCount: 0,
      metadata: {},
    };

    const category = new Category(categoryData);
    await category.save();

    logger.info('Category created', { categoryId: category.categoryId, name: input.name });
    return category;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string): Promise<ICategory | null> {
    return Category.findOne({ categoryId }).exec();
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<ICategory | null> {
    return Category.findOne({ slug }).exec();
  }

  /**
   * Get all categories
   */
  async getCategories(includeInactive = false): Promise<ICategory[]> {
    const query: Record<string, unknown> = {};
    if (!includeInactive) query.isActive = true;
    return Category.find(query).sort({ order: 1, name: 1 }).exec();
  }

  /**
   * Get category tree (hierarchical structure)
   */
  async getCategoryTree(): Promise<ICategory[]> {
    const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 }).exec();

    const categoryMap = new Map<string, ICategory & { children?: ICategory[] }>();
    const roots: (ICategory & { children?: ICategory[] })[] = [];

    categories.forEach(cat => {
      categoryMap.set(cat.categoryId, { ...cat.toObject(), children: [] });
    });

    categories.forEach(cat => {
      const node = categoryMap.get(cat.categoryId)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Update category
   */
  async updateCategory(categoryId: string, updates: Partial<ICategory>): Promise<ICategory | null> {
    const updated = await Category.findOneAndUpdate(
      { categoryId },
      { $set: updates },
      { new: true }
    ).exec();

    if (updated) {
      logger.info('Category updated', { categoryId, updates: Object.keys(updates) });
    }
    return updated;
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
    // Check if category has children
    const hasChildren = await Category.findOne({ parentId: categoryId }).exec();
    if (hasChildren) {
      logger.warn('Cannot delete category with children', { categoryId });
      return false;
    }

    const deleted = await Category.findOneAndDelete({ categoryId }).exec();
    if (deleted) {
      logger.info('Category deleted', { categoryId });
      return true;
    }
    return false;
  }

  /**
   * Reorder categories
   */
  async reorderCategories(orders: Array<{ categoryId: string; order: number }>): Promise<void> {
    const bulkOps = orders.map(item => ({
      updateOne: {
        filter: { categoryId: item.categoryId },
        update: { $set: { order: item.order } },
      },
    }));

    await Category.bulkWrite(bulkOps);
    logger.info('Categories reordered', { count: orders.length });
  }

  /**
   * Generate URL-friendly slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }
}

export const categoryService = new CategoryService();
export default categoryService;