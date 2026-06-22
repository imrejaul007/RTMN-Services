/**
 * HOJAI Merchant Bridge - Inventory Service
 * Inventory management
 */
import axios from 'axios';
import type { InventoryItem } from './types.js';

const INVENTORY_API_URL = process.env.REZ_INVENTORY_URL || 'http://localhost:4007';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

export class InventoryBridgeService {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl || INVENTORY_API_URL;
    this.token = token || INTERNAL_TOKEN || '';
  }

  private headers() {
    return {
      'X-Internal-Token': this.token,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get inventory items
   */
  async getItems(merchantId: string): Promise<InventoryItem[]> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/inventory/${merchantId}`,
        { headers: this.headers() }
      );
      return res.data.items || [];
    } catch (error) {
      console.error('[InventoryBridge] Failed to get items:', error);
      return [];
    }
  }

  /**
   * Get low stock items
   */
  async getLowStock(merchantId: string): Promise<InventoryItem[]> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/inventory/${merchantId}/low-stock`,
        { headers: this.headers() }
      );
      return res.data.items || [];
    } catch (error) {
      console.error('[InventoryBridge] Failed to get low stock:', error);
      return [];
    }
  }

  /**
   * Check item availability
   */
  async checkAvailability(merchantId: string, itemId: string, quantity: number): Promise<boolean> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/inventory/${merchantId}/check/${itemId}?qty=${quantity}`,
        { headers: this.headers() }
      );
      return res.data.available || false;
    } catch (error) {
      console.error('[InventoryBridge] Failed to check availability:', error);
      return true;
    }
  }

  /**
   * Update stock
   */
  async updateStock(merchantId: string, itemId: string, quantity: number): Promise<boolean> {
    try {
      await axios.patch(
        `${this.baseUrl}/api/inventory/${merchantId}/${itemId}`,
        { quantity },
        { headers: this.headers() }
      );
      return true;
    } catch (error) {
      console.error('[InventoryBridge] Failed to update stock:', error);
      return false;
    }
  }

  /**
   * Deduct from stock (for orders)
   */
  async deductStock(merchantId: string, itemId: string, quantity: number): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/api/inventory/${merchantId}/${itemId}/deduct`,
        { quantity },
        { headers: this.headers() }
      );
      return true;
    } catch (error) {
      console.error('[InventoryBridge] Failed to deduct stock:', error);
      return false;
    }
  }
}

export const inventoryBridge = new InventoryBridgeService();
