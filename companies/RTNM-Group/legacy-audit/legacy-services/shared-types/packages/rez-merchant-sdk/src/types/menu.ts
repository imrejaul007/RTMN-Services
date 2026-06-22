/**
 * Menu types for Merchant SDK
 */

export interface MenuProductImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

export interface MenuProductPricing {
  original: number;
  selling: number;
  discount?: number;
  currency: string;
  gst?: {
    rate: number;
    included: boolean;
  };
}

export interface MenuProductInventory {
  stock: number;
  isAvailable: boolean;
  lowStockThreshold?: number;
  unlimited?: boolean;
}

export interface MenuProduct {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  images: MenuProductImage[];
  pricing: MenuProductPricing;
  inventory: MenuProductInventory;
  isVeg?: boolean;
  tags?: string[];
  preparationTime?: number;
  itemType?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  products: MenuProduct[];
}

export interface MenuStoreInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  category: string;
  operationalInfo?: {
    hours?: Record<string, { open: string; close: string }>;
    dineIn?: boolean;
    delivery?: boolean;
    takeaway?: boolean;
  };
}

export interface Menu {
  store: MenuStoreInfo;
  categories: MenuCategory[];
  totalProducts: number;
}

export interface MenuResponse {
  success: boolean;
  data: Menu;
  meta?: {
    qrType?: string;
    scannedAt?: string;
  };
}

export interface MenuProductResponse {
  success: boolean;
  data: MenuProduct;
}

export interface MenuCategoryResponse {
  success: boolean;
  data: MenuCategory;
}
