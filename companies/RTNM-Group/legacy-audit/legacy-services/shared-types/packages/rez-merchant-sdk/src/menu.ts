/**
 * Menu client for Merchant SDK
 */

import { AxiosInstance } from 'axios';
import {
  Menu,
  MenuResponse,
  MenuCategory,
  MenuProduct,
} from './types/menu';

interface MerchantSDKConfig {
  baseUrl: string;
  debug: boolean;
}

export class MenuClient {
  private client: AxiosInstance;
  private config: MerchantSDKConfig;

  constructor(client: AxiosInstance, config: MerchantSDKConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Get full menu for a store (public QR endpoint)
   */
  async get(storeId: string): Promise<Menu> {
    const response = await this.client.get<MenuResponse>(
      `/qr/public/menu/${storeId}`
    );
    return response.data.data;
  }

  /**
   * Get menu categories
   */
  async getCategories(storeId: string): Promise<MenuCategory[]> {
    const menu = await this.get(storeId);
    return menu.categories;
  }

  /**
   * Get products in a specific category
   */
  async getProductsByCategory(storeId: string, categoryName: string): Promise<MenuProduct[]> {
    const menu = await this.get(storeId);
    const category = menu.categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );
    return category?.products || [];
  }

  /**
   * Get featured/popular products
   */
  async getFeaturedProducts(storeId: string, limit = 10): Promise<MenuProduct[]> {
    const menu = await this.get(storeId);
    const allProducts = menu.categories.flatMap((c) => c.products);
    // Sort by some popularity metric if available, or just return first N
    return allProducts.slice(0, limit);
  }

  /**
   * Search products by name
   */
  async searchProducts(storeId: string, query: string): Promise<MenuProduct[]> {
    const menu = await this.get(storeId);
    const lowerQuery = query.toLowerCase();
    const allProducts = menu.categories.flatMap((c) => c.products);
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get product by ID (from cached menu)
   */
  async getProductById(storeId: string, productId: string): Promise<MenuProduct | null> {
    const menu = await this.get(storeId);
    for (const category of menu.categories) {
      const product = category.products.find((p) => p.id === productId);
      if (product) return product;
    }
    return null;
  }
}
