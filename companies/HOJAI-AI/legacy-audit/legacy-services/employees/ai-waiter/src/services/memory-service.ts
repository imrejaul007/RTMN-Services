/**
 * Memory Service Client
 * Connects AI Waiter to HOJAI Memory Service (Port 4520)
 */

import axios, { AxiosInstance } from 'axios';

export interface CustomerSession {
  customerId: string;
  customerName?: string;
  phone?: string;
  email?: string;
  preferences?: {
    dietary?: string[];
    favoriteItems?: string[];
    occasions?: string[];
  };
  lastVisit?: string;
}

export interface Memory {
  id: string;
  guestId: string;
  type: 'stay' | 'service' | 'preference' | 'feedback' | 'interaction';
  data: any;
  metadata?: {
    hotelId?: string;
    roomId?: string;
    staffId?: string;
    source?: string;
  };
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class MemoryService {
  private client: AxiosInstance;

  constructor(memoryUrl: string = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520') {
    this.client = axios.create({
      baseURL: memoryUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || 'dev-token',
      },
    });
  }

  /**
   * Get customer session/memory
   */
  static async getSession(customerId: string): Promise<CustomerSession | null> {
    try {
      const memoryUrl = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
      const client = axios.create({
        baseURL: memoryUrl,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || 'dev-token',
        },
      });

      // Try to get preferences
      const response = await client.get<ApiResponse<any>>(
        `/guests/${customerId}/preferences`
      );

      if (response.data?.success && response.data?.data) {
        const prefs = response.data.data;
        return {
          customerId,
          customerName: prefs.name,
          phone: prefs.phone,
          email: prefs.email,
          preferences: {
            dietary: prefs.preferences?.dietary?.restrictions,
            favoriteItems: prefs.preferences?.food?.likes,
            occasions: prefs.occasion ? [prefs.occasion] : [],
          },
          lastVisit: prefs.lastVisit,
        };
      }
    } catch (error) {
      console.error('MemoryService.getSession error:', error);
    }

    // Return null if not found - AI Waiter will ask for info
    return null;
  }

  /**
   * Store customer memory
   */
  async storeMemory(guestId: string, type: Memory['type'], data: any): Promise<Memory | null> {
    try {
      const response = await this.client.post<ApiResponse<Memory>>(
        `/guests/${guestId}/memory`,
        {
          type,
          data,
          metadata: {
            source: 'ai-waiter',
          },
        }
      );

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('MemoryService.storeMemory error:', this.getErrorMessage(error));
    }
    return null;
  }

  /**
   * Get guest memories
   */
  async getMemories(
    guestId: string,
    type?: Memory['type']
  ): Promise<Memory[]> {
    try {
      const params: any = {};
      if (type) params.type = type;

      const response = await this.client.get<ApiResponse<Memory[]>>(
        `/guests/${guestId}/memory`,
        { params }
      );

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('MemoryService.getMemories error:', this.getErrorMessage(error));
    }
    return [];
  }

  /**
   * Store customer preferences
   */
  async storePreferences(
    guestId: string,
    preferences: {
      name?: string;
      phone?: string;
      email?: string;
      dietary?: string[];
      favoriteItems?: string[];
      occasion?: string;
    }
  ): Promise<boolean> {
    try {
      const response = await this.client.post<ApiResponse<any>>(
        `/guests/${guestId}/preferences`,
        {
          preferences: {
            food: {
              likes: preferences.favoriteItems,
              restrictions: preferences.dietary,
            },
            occasion: preferences.occasion,
          },
          name: preferences.name,
          phone: preferences.phone,
          email: preferences.email,
        }
      );

      return response.data?.success || false;
    } catch (error) {
      console.error('MemoryService.storePreferences error:', this.getErrorMessage(error));
      return false;
    }
  }

  /**
   * Get customer preferences
   */
  async getPreferences(guestId: string): Promise<any | null> {
    try {
      const response = await this.client.get<ApiResponse<any>>(
        `/guests/${guestId}/preferences`
      );

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('MemoryService.getPreferences error:', this.getErrorMessage(error));
    }
    return null;
  }

  /**
   * Search memories
   */
  async searchMemories(guestId: string, query: string): Promise<Memory[]> {
    try {
      const response = await this.client.post<ApiResponse<Memory[]>>(
        '/memory/search',
        {
          guestId,
          query,
        }
      );

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('MemoryService.searchMemories error:', this.getErrorMessage(error));
    }
    return [];
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

export default MemoryService;
