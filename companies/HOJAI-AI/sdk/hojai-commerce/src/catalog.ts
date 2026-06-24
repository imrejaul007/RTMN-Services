/**
 * REZ Catalog Client
 *
 * Wraps rez-catalog-service: product catalog, inventory, categories, search.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  brand?: string;
  price: { amount: number; currency: string };
  images?: string[];
  attributes?: Record<string, unknown>;
  status: 'active' | 'inactive' | 'discontinued';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  brand?: string;
  price: { amount: number; currency: string };
  images?: string[];
  attributes?: Record<string, unknown>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Inventory {
  productId: string;
  sku: string;
  totalQuantity: number;
  available: number;
  reserved: number;
  warehouses: Array<{ warehouseId: string; quantity: number }>;
  lastUpdated: string;
}

export class CatalogClient {
  constructor(private config: HojaiConfig) {}

  // ── Products ──────────────────────────────────────────────
  async listProducts(input: { categoryId?: string; status?: Product['status']; limit?: number; cursor?: string } = {}): Promise<{ products: Product[]; nextCursor?: string }> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request(this.config, 'GET', `/api/products?${params.toString()}`);
  }

  async createProduct(input: ProductInput): Promise<Product> {
    return request<Product>(this.config, 'POST', '/api/products', input);
  }

  async getProduct(id: string): Promise<Product> {
    return request<Product>(this.config, 'GET', `/api/products/${encodeURIComponent(id)}`);
  }

  async updateProduct(id: string, patch: Partial<ProductInput>): Promise<Product> {
    return request<Product>(this.config, 'PUT', `/api/products/${encodeURIComponent(id)}`, patch);
  }

  async deleteProduct(id: string): Promise<{ deleted: boolean }> {
    return request(this.config, 'DELETE', `/api/products/${encodeURIComponent(id)}`);
  }

  // ── Inventory ─────────────────────────────────────────────
  async getInventory(productId: string): Promise<Inventory> {
    return request<Inventory>(this.config, 'GET', `/api/products/${encodeURIComponent(productId)}/inventory`);
  }

  async updateInventory(productId: string, input: { available: number; reserved?: number; warehouseId?: string }): Promise<Inventory> {
    return request<Inventory>(this.config, 'PUT', `/api/products/${encodeURIComponent(productId)}/inventory`, input);
  }

  async syncInventory(input: { warehouseId: string; items: Array<{ sku: string; quantity: number }> }): Promise<{ synced: number; errors: number }> {
    return request(this.config, 'POST', '/api/inventory/sync', input);
  }

  // ── Categories ────────────────────────────────────────────
  async listCategories(input: { parentId?: string } = {}): Promise<Category[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Category[]>(this.config, 'GET', `/api/categories?${params.toString()}`);
  }

  async createCategory(input: { name: string; slug: string; parentId?: string; description?: string }): Promise<Category> {
    return request<Category>(this.config, 'POST', '/api/categories', input);
  }

  async getCategory(id: string): Promise<Category> {
    return request<Category>(this.config, 'GET', `/api/categories/${encodeURIComponent(id)}`);
  }

  // ── Search ────────────────────────────────────────────────
  async search(input: { query: string; categoryId?: string; limit?: number; offset?: number }): Promise<{ products: Product[]; total: number; facets?: Record<string, Array<{ value: string; count: number }>> }> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request(this.config, 'GET', `/api/search?${params.toString()}`);
  }

  async suggestions(input: { query: string; limit?: number }): Promise<string[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<string[]>(this.config, 'GET', `/api/search/suggestions?${params.toString()}`);
  }
}