/**
 * RTMN Mobile SDK - Customer Twin API
 */

import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'eventemitter3';
import {
  Customer,
  CustomerPreferences,
  Interaction,
  ApiResponse,
  PaginatedResponse,
} from './types';

export interface CustomerUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  metadata?: Record<string, unknown>;
  preferences?: Partial<CustomerPreferences>;
}

export class CustomerTwinAPI extends EventEmitter {
  private client: AxiosInstance;
  private customer: Customer | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor(baseUrl: string) {
    super();
    this.client = axios.create({
      baseURL: `${baseUrl}/api/customer`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Get current customer profile from Customer Twin
   */
  async getProfile(): Promise<Customer> {
    try {
      const response = await this.client.get<ApiResponse<Customer>>('/profile');
      if (response.data.success && response.data.data) {
        this.customer = response.data.data;
        this.emit('profileLoaded', this.customer);
        return this.customer;
      }
      throw new Error(response.data.error?.message || 'Failed to load profile');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Update customer profile
   */
  async updateProfile(data: CustomerUpdateData): Promise<Customer> {
    try {
      const response = await this.client.patch<ApiResponse<Customer>>(
        '/profile',
        data
      );
      if (response.data.success && response.data.data) {
        this.customer = response.data.data;
        this.emit('profileUpdated', this.customer);
        return this.customer;
      }
      throw new Error(response.data.error?.message || 'Failed to update profile');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get customer interaction history
   */
  async getHistory(
    options?: {
      type?: Interaction['type'];
      limit?: number;
      offset?: number;
    }
  ): Promise<Interaction[]> {
    try {
      const params = new URLSearchParams();
      if (options?.type) params.append('type', options.type);
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));

      const response = await this.client.get<ApiResponse<Interaction[]>>(
        `/history?${params.toString()}`
      );
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Failed to load history');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get customer by Twin ID
   */
  async getByTwinId(twinId: string): Promise<Customer> {
    try {
      const response = await this.client.get<ApiResponse<Customer>>(
        `/twin/${twinId}`
      );
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Customer not found');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Sync customer data with remote Twin
   */
  async syncTwins(): Promise<void> {
    try {
      const response = await this.client.post<ApiResponse<void>>('/sync');
      if (response.data.success) {
        await this.getProfile(); // Reload after sync
        this.emit('synced');
      } else {
        throw new Error(response.data.error?.message || 'Sync failed');
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start automatic sync interval
   */
  startAutoSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncInterval = setInterval(() => {
      this.syncTwins().catch(() => {});
    }, intervalMs);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get cached customer (without API call)
   */
  getCached(): Customer | null {
    return this.customer;
  }

  /**
   * Check if customer is loaded
   */
  isLoaded(): boolean {
    return this.customer !== null;
  }
}
