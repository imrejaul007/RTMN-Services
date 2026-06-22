/**
 * Menu Service Client
 * Connects AI Waiter to REZ Menu Service (Port 4030)
 */

import axios, { AxiosInstance } from 'axios';

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
  dietary?: string[];
  imageUrl?: string;
  modifiers?: any[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

export interface Menu {
  id: string;
  restaurantId: string;
  name: string;
  categories: MenuCategory[];
  isActive: boolean;
}

export interface GetMenuResponse {
  success: boolean;
  data: Menu;
}

export interface SearchItemsResponse {
  success: boolean;
  data: MenuItem[];
}

export class MenuService {
  private client: AxiosInstance;
  private menuCache: Menu | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(baseUrl: string = process.env.MENU_SERVICE_URL || 'http://localhost:4030') {
    this.client = axios.create({
      baseURL: `${baseUrl}/api/v1`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor for development
    this.client.interceptors.request.use((config) => {
      const token = process.env.INTERNAL_SERVICE_TOKEN || 'dev-token';
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Get full menu with categories and items
   */
  async getFullMenu(): Promise<{ categories: MenuCategory[] }> {
    // Check cache first
    if (this.menuCache && Date.now() < this.cacheExpiry) {
      return this.menuCache;
    }

    try {
      const response = await this.client.get<GetMenuResponse>('/menus');
      if (response.data?.success && response.data?.data) {
        this.menuCache = response.data.data;
        this.cacheExpiry = Date.now() + this.CACHE_TTL;
        return this.menuCache;
      }
    } catch (error) {
      console.error('MenuService.getFullMenu error:', this.getErrorMessage(error));
    }

    // Return demo menu if service unavailable
    return this.getDemoMenu();
  }

  /**
   * Get menu items filtered by dietary preference
   */
  async getMenuByDietary(dietaryMessage: string): Promise<MenuItem[]> {
    const menu = await this.getFullMenu();
    const lowerMessage = dietaryMessage.toLowerCase();

    const dietaryFilters: string[] = [];
    if (lowerMessage.includes('veg') || lowerMessage.includes('vegetarian')) {
      dietaryFilters.push('vegetarian', 'vegan');
    }
    if (lowerMessage.includes('vegan')) dietaryFilters.push('vegan');
    if (lowerMessage.includes('jain')) dietaryFilters.push('jain');
    if (lowerMessage.includes('gluten')) dietaryFilters.push('gluten-free');
    if (lowerMessage.includes('nut')) dietaryFilters.push('nut-free');

    const items: MenuItem[] = [];
    for (const category of menu.categories) {
      for (const item of category.items) {
        if (dietaryFilters.length === 0) {
          if (item.isVeg !== false) items.push(item);
        } else {
          const itemDietary = item.dietary || [];
          if (dietaryFilters.some(f => itemDietary.includes(f))) {
            items.push(item);
          }
        }
      }
    }
    return items;
  }

  /**
   * Search menu items by name
   */
  async searchItems(query: string): Promise<MenuItem[]> {
    try {
      const response = await this.client.get<SearchItemsResponse>(
        `/menus/default/items/search?q=${encodeURIComponent(query)}`
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('MenuService.searchItems error:', this.getErrorMessage(error));
    }

    // Fallback: search in demo menu
    return this.searchDemoMenu(query);
  }

  /**
   * Get item by ID
   */
  async getItem(itemId: string): Promise<MenuItem | null> {
    try {
      const response = await this.client.get<{ success: boolean; data: MenuItem }>(
        `/items/${itemId}`
      );
      if (response.data?.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('MenuService.getItem error:', this.getErrorMessage(error));
    }
    return null;
  }

  /**
   * Get recommendations for a customer
   */
  async getRecommendations(customerId: string): Promise<MenuItem[]> {
    try {
      const response = await this.client.post<{ success: boolean; data: MenuItem[] }>(
        '/recommendations',
        { customerId }
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('MenuService.getRecommendations error:', this.getErrorMessage(error));
    }
    return [];
  }

  /**
   * Get demo menu for fallback
   */
  private getDemoMenu(): { categories: MenuCategory[] } {
    return {
      categories: [
        {
          id: 'cat-1',
          name: 'South Indian',
          items: [
            { id: 'si-1', name: 'Masala Dosa', price: 120, isVeg: true, dietary: ['vegetarian'] },
            { id: 'si-2', name: 'Rava Idli', price: 80, isVeg: true, dietary: ['vegetarian'] },
            { id: 'si-3', name: 'Pongal', price: 90, isVeg: true, dietary: ['vegetarian', 'jain'] },
            { id: 'si-4', name: 'Uttapam', price: 70, isVeg: true, dietary: ['vegetarian'] },
            { id: 'si-5', name: 'Filter Coffee', price: 40, isVeg: true, dietary: ['vegetarian'] },
          ],
        },
        {
          id: 'cat-2',
          name: 'Main Course',
          items: [
            { id: 'mc-1', name: 'Butter Chicken', price: 280, dietary: ['gluten-free'] },
            { id: 'mc-2', name: 'Dal Makhani', price: 180, isVeg: true, dietary: ['vegetarian', 'gluten-free'] },
            { id: 'mc-3', name: 'Biryani Hyderabadi', price: 250 },
            { id: 'mc-4', name: 'Paneer Butter Masala', price: 220, isVeg: true, dietary: ['vegetarian'] },
            { id: 'mc-5', name: 'Naan', price: 40, isVeg: true, dietary: ['vegetarian'] },
          ],
        },
        {
          id: 'cat-3',
          name: 'Beverages',
          items: [
            { id: 'bev-1', name: 'Cappuccino', price: 150 },
            { id: 'bev-2', name: 'Cold Coffee', price: 120 },
            { id: 'bev-3', name: 'Fresh Lime Soda', price: 80, isVeg: true, dietary: ['vegetarian'] },
            { id: 'bev-4', name: 'Mango Lassi', price: 100, isVeg: true, dietary: ['vegetarian'] },
            { id: 'bev-5', name: 'Green Tea', price: 60, isVeg: true, dietary: ['vegetarian', 'vegan'] },
          ],
        },
        {
          id: 'cat-4',
          name: 'Desserts',
          items: [
            { id: 'des-1', name: 'Gulab Jamun', price: 80, isVeg: true, dietary: ['vegetarian'] },
            { id: 'des-2', name: 'Rasmalai', price: 100, isVeg: true, dietary: ['vegetarian'] },
            { id: 'des-3', name: 'Ice Cream', price: 120, isVeg: true, dietary: ['vegetarian'] },
          ],
        },
      ],
    };
  }

  /**
   * Search in demo menu
   */
  private searchDemoMenu(query: string): MenuItem[] {
    const menu = this.getDemoMenu();
    const lowerQuery = query.toLowerCase();
    const items: MenuItem[] = [];

    for (const category of menu.categories) {
      for (const item of category.items) {
        if (item.name.toLowerCase().includes(lowerQuery)) {
          items.push(item);
        }
      }
    }
    return items;
  }

  /**
   * Get error message from axios error
   */
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }
    return error.message || 'Unknown error';
  }
}

export default MenuService;
