/**
 * GlamAI → Inventory Alert Connector
 *
 * Monitors GlamAI inventory and triggers alerts
 * Connects to procurement when stock is low
 *
 * Flow: Inventory Check → Alert → Procurement Connector → Nexha
 *
 * @module glamai-inventory-connector
 * @version 1.0.0
 */

import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

export interface InventoryItem {
  itemId: string;
  name: string;
  category: 'hair_products' | 'skincare' | 'nail_supplies' | 'color' | 'equipment' | 'linens';
  currentStock: number;
  reorderPoint: number;
  unit: string;
  costPerUnit?: number;
  lastOrderDate?: string;
  avgMonthlyUsage?: number;
}

export interface InventoryAlert {
  item: InventoryItem;
  severity: 'low' | 'medium' | 'high' | 'critical';
  daysUntilStockout: number;
  recommendedOrder: number;
}

export interface StockReport {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  alerts: InventoryAlert[];
  totalValue: number;
  lastUpdated: string;
}

export class SalonInventoryConnector {
  private glamaiUrl: string;
  private inventory: Map<string, InventoryItem>;

  constructor(config?: { glamaiUrl?: string }) {
    this.glamaiUrl = config?.glamaiUrl || process.env.GLAMAI_URL || 'http://localhost:4830';
    this.inventory = new Map();

    // Initialize sample inventory
    this.initializeSampleInventory();

    logger.info('SalonInventoryConnector initialized', { glamaiUrl: this.glamaiUrl });
  }

  /**
   * Check inventory levels and generate alerts
   */
  async checkInventory(salonId: string): Promise<StockReport> {
    try {
      logger.info('Checking inventory', { salonId });

      const alerts: InventoryAlert[] = [];
      let lowStock = 0;
      let outOfStock = 0;
      let expiringSoon = 0;
      let totalValue = 0;

      for (const [itemId, item] of this.inventory) {
        totalValue += item.currentStock * (item.costPerUnit || 0);

        if (item.currentStock === 0) {
          outOfStock++;
          alerts.push({
            item,
            severity: 'critical',
            daysUntilStockout: 0,
            recommendedOrder: item.reorderPoint * 3
          });
        } else if (item.currentStock < item.reorderPoint * 0.5) {
          lowStock++;
          alerts.push({
            item,
            severity: 'high',
            daysUntilStockout: this.calculateDaysUntilStockout(item),
            recommendedOrder: item.reorderPoint * 2 - item.currentStock
          });
        } else if (item.currentStock < item.reorderPoint) {
          lowStock++;
          alerts.push({
            item,
            severity: 'medium',
            daysUntilStockout: this.calculateDaysUntilStockout(item),
            recommendedOrder: item.reorderPoint * 2 - item.currentStock
          });
        }
      }

      return {
        totalItems: this.inventory.size,
        lowStock,
        outOfStock,
        expiringSoon,
        alerts: alerts.sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }),
        totalValue,
        lastUpdated: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Inventory check failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get specific item stock
   */
  async getItemStock(itemId: string): Promise<InventoryItem | null> {
    return this.inventory.get(itemId) || null;
  }

  /**
   * Update item stock
   */
  async updateStock(params: {
    itemId: string;
    quantity: number;
    type: 'add' | 'remove' | 'set';
  }): Promise<{ success: boolean; newStock: number }> {
    const item = this.inventory.get(params.itemId);
    if (!item) return { success: false, newStock: 0 };

    switch (params.type) {
      case 'add':
        item.currentStock += params.quantity;
        break;
      case 'remove':
        item.currentStock = Math.max(0, item.currentStock - params.quantity);
        break;
      case 'set':
        item.currentStock = params.quantity;
        break;
    }

    logger.info('Stock updated', { itemId: params.itemId, newStock: item.currentStock });
    return { success: true, newStock: item.currentStock };
  }

  /**
   * Get items needing reorder
   */
  async getReorderItems(): Promise<InventoryAlert[]> {
    const alerts: InventoryAlert[] = [];

    for (const [itemId, item] of this.inventory) {
      if (item.currentStock <= item.reorderPoint) {
        alerts.push({
          item,
          severity: item.currentStock === 0 ? 'critical' : item.currentStock < item.reorderPoint * 0.5 ? 'high' : 'medium',
          daysUntilStockout: this.calculateDaysUntilStockout(item),
          recommendedOrder: item.reorderPoint * 2 - item.currentStock
        });
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Get low stock items by category
   */
  async getItemsByCategory(category: InventoryItem['category']): Promise<InventoryItem[]> {
    const items: InventoryItem[] = [];
    for (const [, item] of this.inventory) {
      if (item.category === category) items.push(item);
    }
    return items;
  }

  // ============ Private Methods ============

  private calculateDaysUntilStockout(item: InventoryItem): number {
    if (item.currentStock === 0) return 0;
    if (!item.avgMonthlyUsage || item.avgMonthlyUsage === 0) return 30;

    const dailyUsage = item.avgMonthlyUsage / 30;
    return Math.floor(item.currentStock / dailyUsage);
  }

  private initializeSampleInventory(): void {
    const sampleItems: InventoryItem[] = [
      { itemId: 'hair-1', name: 'Shampoo (1L)', category: 'hair_products', currentStock: 15, reorderPoint: 20, unit: 'bottles', costPerUnit: 250, avgMonthlyUsage: 30 },
      { itemId: 'hair-2', name: 'Hair Serum', category: 'hair_products', currentStock: 8, reorderPoint: 15, unit: 'bottles', costPerUnit: 450, avgMonthlyUsage: 20 },
      { itemId: 'color-1', name: 'Hair Color (Black)', category: 'color', currentStock: 25, reorderPoint: 30, unit: 'boxes', costPerUnit: 180, avgMonthlyUsage: 40 },
      { itemId: 'color-2', name: 'Hair Color (Brown)', category: 'color', currentStock: 20, reorderPoint: 25, unit: 'boxes', costPerUnit: 180, avgMonthlyUsage: 35 },
      { itemId: 'color-3', name: 'Hair Bleach', category: 'color', currentStock: 5, reorderPoint: 20, unit: 'packets', costPerUnit: 120, avgMonthlyUsage: 25 },
      { itemId: 'skin-1', name: 'Facial Kit', category: 'skincare', currentStock: 30, reorderPoint: 25, unit: 'kits', costPerUnit: 350, avgMonthlyUsage: 40 },
      { itemId: 'skin-2', name: 'Moisturizer', category: 'skincare', currentStock: 12, reorderPoint: 15, unit: 'tubes', costPerUnit: 280, avgMonthlyUsage: 20 },
      { itemId: 'nail-1', name: 'Nail Polish Set', category: 'nail_supplies', currentStock: 40, reorderPoint: 30, unit: 'sets', costPerUnit: 500, avgMonthlyUsage: 15 },
      { itemId: 'nail-2', name: 'Acrylic Powder', category: 'nail_supplies', currentStock: 3, reorderPoint: 10, unit: 'jars', costPerUnit: 350, avgMonthlyUsage: 12 },
      { itemId: 'equip-1', name: 'Scissor Set', category: 'equipment', currentStock: 10, reorderPoint: 5, unit: 'sets', costPerUnit: 2500, avgMonthlyUsage: 2 },
      { itemId: 'equip-2', name: 'Hair Dryer', category: 'equipment', currentStock: 5, reorderPoint: 3, unit: 'units', costPerUnit: 3500, avgMonthlyUsage: 1 },
      { itemId: 'linen-1', name: 'Cape/Towel Set', category: 'linens', currentStock: 20, reorderPoint: 15, unit: 'sets', costPerUnit: 400, avgMonthlyUsage: 8 }
    ];

    for (const item of sampleItems) {
      this.inventory.set(item.itemId, item);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    return { healthy: true };
  }
}

export const salonInventoryConnector = new SalonInventoryConnector();
