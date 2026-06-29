/**
 * Restaurant Menu Types
 *
 * Vertical types for restaurant menu management.
 */

export interface Menu {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  categories: Category[];
  isActive: boolean;
  availableFrom?: string;
  availableUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  menuId: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
  isAvailable: boolean;
  preparationTime?: number; // minutes
  calories?: number;
  allergens: string[];
  tags: string[];
  modifierGroups: ModifierGroup[];
  taxCategory: TaxCategory;
  createdAt: string;
  updatedAt: string;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  price: number; // additional price
  isDefault: boolean;
  isAvailable: boolean;
}

export type TaxCategory = 'food' | 'beverage' | 'liquor' | 'tobacco';

export interface CreateMenuInput {
  name: string;
  description?: string;
  availableFrom?: string;
  availableUntil?: string;
}

export interface CreateCategoryInput {
  menuId: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface CreateMenuItemInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  preparationTime?: number;
  calories?: number;
  allergens?: string[];
  tags?: string[];
  taxCategory?: TaxCategory;
}

export interface UpdateMenuItemInput {
  name?: string;
  description?: string;
  price?: number;
  image?: string;
  isAvailable?: boolean;
  allergens?: string[];
  tags?: string[];
}

export interface MenuAvailability {
  menuId: string;
  isActive: boolean;
  availableNow: boolean;
  nextChange?: string;
}
