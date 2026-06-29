/**
 * Menu Service
 *
 * Tenant-aware menu management for restaurants.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Menu,
  Category,
  MenuItem,
  ModifierGroup,
  Modifier,
  CreateMenuInput,
  CreateCategoryInput,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  TaxCategory,
} from './types';

// ============================================
// In-Memory Store (Tenant-Scoped)
// ============================================

interface MenuStore {
  menus: Map<string, Menu>;
  categories: Map<string, Category>;
  items: Map<string, MenuItem>;
}

const tenantStores: Map<string, MenuStore> = new Map();

function getStore(tenantId: string): MenuStore {
  if (!tenantStores.has(tenantId)) {
    tenantStores.set(tenantId, {
      menus: new Map(),
      categories: new Map(),
      items: new Map(),
    });
  }
  return tenantStores.get(tenantId)!;
}

// ============================================
// Menu Service
// ============================================

export class MenuService {
  // ========================================
  // Menu Operations
  // ========================================

  createMenu(tenantId: string, input: CreateMenuInput): Menu {
    const store = getStore(tenantId);
    const id = `menu_${uuidv4().slice(0, 8)}`;

    const menu: Menu = {
      id,
      tenantId,
      name: input.name,
      description: input.description,
      categories: [],
      isActive: true,
      availableFrom: input.availableFrom,
      availableUntil: input.availableUntil,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.menus.set(id, menu);
    return menu;
  }

  getMenu(tenantId: string, menuId: string): Menu | null {
    const store = getStore(tenantId);
    const menu = store.menus.get(menuId);

    if (!menu || menu.tenantId !== tenantId) {
      return null;
    }

    // Attach categories and items
    const categories = this.listCategories(tenantId, menuId);
    return { ...menu, categories };
  }

  listMenus(tenantId: string): Menu[] {
    const store = getStore(tenantId);
    return Array.from(store.menus.values())
      .filter(m => m.tenantId === tenantId)
      .map(menu => ({
        ...menu,
        categories: this.listCategories(tenantId, menu.id),
      }));
  }

  updateMenu(tenantId: string, menuId: string, updates: Partial<Menu>): Menu | null {
    const store = getStore(tenantId);
    const menu = store.menus.get(menuId);

    if (!menu || menu.tenantId !== tenantId) {
      return null;
    }

    Object.assign(menu, updates, { updatedAt: new Date().toISOString() });
    return menu;
  }

  deleteMenu(tenantId: string, menuId: string): boolean {
    const store = getStore(tenantId);
    const menu = store.menus.get(menuId);

    if (!menu || menu.tenantId !== tenantId) {
      return false;
    }

    // Delete all categories and items
    const categories = this.listCategories(tenantId, menuId);
    for (const cat of categories) {
      this.deleteCategory(tenantId, cat.id);
    }

    store.menus.delete(menuId);
    return true;
  }

  // ========================================
  // Category Operations
  // ========================================

  createCategory(tenantId: string, input: CreateCategoryInput): Category {
    const store = getStore(tenantId);
    const id = `cat_${uuidv4().slice(0, 8)}`;

    const category: Category = {
      id,
      menuId: input.menuId,
      name: input.name,
      description: input.description,
      sortOrder: input.sortOrder || 0,
      isActive: true,
      items: [],
    };

    store.categories.set(id, category);
    return category;
  }

  listCategories(tenantId: string, menuId: string): Category[] {
    const store = getStore(tenantId);
    return Array.from(store.categories.values())
      .filter(c => c.menuId === menuId && store.menus.get(menuId)?.tenantId === tenantId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(cat => ({
        ...cat,
        items: this.listItems(tenantId, cat.id),
      }));
  }

  getCategory(tenantId: string, categoryId: string): Category | null {
    const store = getStore(tenantId);
    const category = store.categories.get(categoryId);

    if (!category) {
      return null;
    }

    const menu = store.menus.get(category.menuId);
    if (!menu || menu.tenantId !== tenantId) {
      return null;
    }

    return {
      ...category,
      items: this.listItems(tenantId, categoryId),
    };
  }

  updateCategory(tenantId: string, categoryId: string, updates: Partial<Category>): Category | null {
    const store = getStore(tenantId);
    const category = store.categories.get(categoryId);

    if (!category) {
      return null;
    }

    const menu = store.menus.get(category.menuId);
    if (!menu || menu.tenantId !== tenantId) {
      return null;
    }

    Object.assign(category, updates);
    return category;
  }

  deleteCategory(tenantId: string, categoryId: string): boolean {
    const store = getStore(tenantId);
    const category = store.categories.get(categoryId);

    if (!category) {
      return false;
    }

    const menu = store.menus.get(category.menuId);
    if (!menu || menu.tenantId !== tenantId) {
      return false;
    }

    // Delete all items
    const items = this.listItems(tenantId, categoryId);
    for (const item of items) {
      store.items.delete(item.id);
    }

    store.categories.delete(categoryId);
    return true;
  }

  // ========================================
  // Item Operations
  // ========================================

  createItem(tenantId: string, input: CreateMenuItemInput): MenuItem {
    const store = getStore(tenantId);
    const id = `item_${uuidv4().slice(0, 8)}`;

    const item: MenuItem = {
      id,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      price: input.price,
      currency: 'INR',
      image: input.image,
      isAvailable: true,
      preparationTime: input.preparationTime,
      calories: input.calories,
      allergens: input.allergens || [],
      tags: input.tags || [],
      modifierGroups: [],
      taxCategory: input.taxCategory || 'food',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.items.set(id, item);
    return item;
  }

  listItems(tenantId: string, categoryId: string): MenuItem[] {
    const store = getStore(tenantId);
    const category = store.categories.get(categoryId);

    if (!category) {
      return [];
    }

    return Array.from(store.items.values())
      .filter(i => i.categoryId === categoryId);
  }

  getItem(tenantId: string, itemId: string): MenuItem | null {
    const store = getStore(tenantId);
    const item = store.items.get(itemId);

    if (!item) {
      return null;
    }

    const category = store.categories.get(item.categoryId);
    if (!category) {
      return null;
    }

    const menu = store.menus.get(category.menuId);
    if (!menu || menu.tenantId !== tenantId) {
      return null;
    }

    return item;
  }

  updateItem(tenantId: string, itemId: string, updates: UpdateMenuItemInput): MenuItem | null {
    const store = getStore(tenantId);
    const item = store.items.get(itemId);

    if (!item) {
      return null;
    }

    // Validate tenant
    const category = store.categories.get(item.categoryId);
    if (!category) {
      return null;
    }

    const menu = store.menus.get(category.menuId);
    if (!menu || menu.tenantId !== tenantId) {
      return null;
    }

    Object.assign(item, updates, { updatedAt: new Date().toISOString() });
    return item;
  }

  deleteItem(tenantId: string, itemId: string): boolean {
    const store = getStore(tenantId);
    const item = store.items.get(itemId);

    if (!item) {
      return false;
    }

    const category = store.categories.get(item.categoryId);
    if (!category) {
      return false;
    }

    const menu = store.menus.get(category.menuId);
    if (!menu || menu.tenantId !== tenantId) {
      return false;
    }

    store.items.delete(itemId);
    return true;
  }

  // ========================================
  // Availability
  // ========================================

  toggleAvailability(tenantId: string, itemId: string, isAvailable: boolean): MenuItem | null {
    return this.updateItem(tenantId, itemId, { isAvailable });
  }

  getUnavailableItems(tenantId: string): MenuItem[] {
    const store = getStore(tenantId);
    const items: MenuItem[] = [];

    for (const item of store.items.values()) {
      if (!item.isAvailable) {
        const category = store.categories.get(item.categoryId);
        if (category) {
          const menu = store.menus.get(category.menuId);
          if (menu && menu.tenantId === tenantId) {
            items.push(item);
          }
        }
      }
    }

    return items;
  }

  // ========================================
  // Cleanup
  // ========================================

  deleteTenantData(tenantId: string): void {
    tenantStores.delete(tenantId);
  }
}

export const menuService = new MenuService();
