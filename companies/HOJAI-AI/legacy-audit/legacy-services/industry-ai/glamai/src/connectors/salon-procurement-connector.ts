/**
 * GlamAI → Nexha Procurement Connector
 *
 * Connects GlamAI's inventory alerts to NexhaBizz
 * Enables automatic product procurement when stock is low
 *
 * Flow: Inventory Alert → GlamAI → Nexha → Suppliers → Order
 *
 * @module glamai-procurement-connector
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
  category: string;
  currentStock: number;
  reorderPoint: number;
  unit: string;
  costPerUnit?: number;
  suppliers?: string[];
  lastOrderDate?: string;
}

export interface InventoryAlert {
  item: InventoryItem;
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  hoursUntilStockout?: number;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  brand?: string;
  unit: string;
  price: number;
  moq: number;
  deliveryDays?: number;
  rating?: number;
}

export interface ProcurementOrder {
  id: string;
  salonId: string;
  items: Array<{ productName: string; quantity: number; unit: string; estimatedPrice?: number }>;
  supplierId?: string;
  supplierName?: string;
  status: 'draft' | 'rfq_sent' | 'quote_received' | 'confirmed' | 'ordered' | 'delivered';
  totalCost?: number;
  estimatedDelivery?: string;
}

export class SalonProcurementConnector {
  private client: axios.AxiosInstance;
  private nexhaUrl: string;
  private nextaBizzUrl: string;

  constructor(config?: { nexhaUrl?: string; nextaBizzUrl?: string }) {
    this.nexhaUrl = config?.nexhaUrl || process.env.NEXHA_URL || 'http://localhost:4399';
    this.nextaBizzUrl = config?.nextaBizzUrl || process.env.NEXTABIZZ_URL || 'http://localhost:3000';

    this.client = axios.create({
      baseURL: this.nextaBizzUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    logger.info('SalonProcurementConnector initialized', { nexhaUrl: this.nexhaUrl, nextaBizzUrl: this.nextaBizzUrl });
  }

  /**
   * Send inventory alert to Nexha for auto-procurement
   */
  async sendInventorySignal(params: {
    salonId: string;
    item: InventoryItem;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<{ success: boolean; signalId?: string; error?: string }> {
    try {
      logger.info('Sending inventory signal', { salonId: params.salonId, item: params.item.name, severity: params.severity });

      // Categories for salon products
      const categoryMapping: Record<string, string> = {
        'hair products': 'beauty_supplies',
        'skincare': 'beauty_supplies',
        'nail supplies': 'beauty_supplies',
        'color': 'hair_color',
        'shampoo': 'hair_care',
        'styling products': 'hair_care',
        'equipment': 'salon_equipment',
        'linens': 'salon_supplies',
        'default': 'beauty_supplies'
      };

      const category = categoryMapping[params.item.category.toLowerCase()] || 'beauty_supplies';

      // Try NexhaBizz first
      try {
        const response = await this.client.post('/api/inventory-signals', {
          merchant_id: params.salonId,
          source: 'glamai',
          source_product_id: params.item.itemId,
          product_name: params.item.name,
          category,
          current_stock: params.item.currentStock,
          threshold: params.item.reorderPoint,
          unit: params.item.unit,
          severity: params.severity,
          signal_type: params.item.currentStock <= 0 ? 'out_of_stock' : 'low_stock'
        });

        return { success: true, signalId: response.data?.id };
      } catch (e) {
        // Fallback to Nexha
      }

      // Try Nexha direct
      const nexhaClient = axios.create({ baseURL: this.nexhaUrl, timeout: 10000 });
      const response = await nexhaClient.post('/api/events/demand', {
        merchantId: params.salonId,
        productName: params.item.name,
        category,
        quantity: Math.max(params.item.reorderPoint * 2 - params.item.currentStock, params.item.reorderPoint),
        urgency: params.severity === 'critical' ? 'urgent' : params.severity,
        source: 'glamai'
      });

      return { success: true, signalId: response.data?.id };
    } catch (error: any) {
      logger.error('Inventory signal failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for suppliers of salon products
   */
  async searchSuppliers(params: {
    category: string;
    location?: string;
    limit?: number;
  }): Promise<Array<{ id: string; name: string; rating: number; categories: string[] }>> {
    try {
      const client = axios.create({ baseURL: this.nexhaUrl, timeout: 10000 });
      const response = await client.get('/api/suppliers', {
        params: { category: params.category, location: params.location || 'Bangalore', limit: params.limit || 10 }
      });

      return (response.data.suppliers || response.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        rating: s.rating || 3,
        categories: s.categories || []
      }));
    } catch (error: any) {
      logger.error('Supplier search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Search for products from suppliers
   */
  async searchProducts(params: {
    productName: string;
    category?: string;
    limit?: number;
  }): Promise<SupplierProduct[]> {
    try {
      const response = await this.client.get('/api/products/search', {
        params: { q: params.productName, category: params.category, limit: params.limit || 5 }
      });

      if (response.data?.products) {
        return response.data.products.map((p: any) => ({
          id: p.id,
          supplierId: p.supplier_id,
          supplierName: p.supplier_name || 'Unknown',
          name: p.name,
          brand: p.brand,
          unit: p.unit || 'unit',
          price: p.price || 0,
          moq: p.moq || 1,
          deliveryDays: p.delivery_days,
          rating: p.rating
        }));
      }

      return [];
    } catch (error: any) {
      logger.error('Product search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Create procurement order/RFQ
   */
  async createOrder(params: {
    salonId: string;
    items: Array<{ productName: string; quantity: number; unit: string }>;
    supplierId?: string;
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<ProcurementOrder | null> {
    try {
      logger.info('Creating procurement order', { salonId: params.salonId, itemCount: params.items.length });

      const response = await this.client.post('/api/purchase-orders', {
        merchant_id: params.salonId,
        items: params.items.map(i => ({ product_name: i.productName, quantity: i.quantity, unit: i.unit })),
        supplier_id: params.supplierId,
        urgency: params.urgency || 'medium',
        source: 'glamai'
      });

      if (response.data?.id) {
        return {
          id: response.data.id,
          salonId: params.salonId,
          items: params.items,
          supplierId: params.supplierId,
          status: 'draft',
          totalCost: response.data.total_cost
        };
      }

      return null;
    } catch (error: any) {
      logger.error('Order creation failed', { error: error.message });
      return null;
    }
  }

  /**
   * Process all inventory alerts
   */
  async processAlerts(params: {
    salonId: string;
    alerts: InventoryAlert[];
  }): Promise<{ processed: number; orders: ProcurementOrder[] }> {
    const orders: ProcurementOrder[] = [];

    for (const alert of params.alerts) {
      if (alert.severity === 'critical' || alert.severity === 'high') {
        await this.sendInventorySignal({
          salonId: params.salonId,
          item: alert.item,
          severity: alert.severity
        });

        const products = await this.searchProducts({ productName: alert.item.name });
        if (products.length > 0) {
          const order = await this.createOrder({
            salonId: params.salonId,
            items: [{ productName: alert.item.name, quantity: Math.max(alert.item.reorderPoint * 2 - alert.item.currentStock, alert.item.reorderPoint), unit: alert.item.unit }],
            supplierId: products[0].supplierId,
            urgency: alert.urgency
          });
          if (order) orders.push(order);
        }
      }
    }

    return { processed: params.alerts.length, orders };
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    try {
      await this.client.get('/health');
      return { healthy: true };
    } catch { return { healthy: false }; }
  }
}

export const salonProcurementConnector = new SalonProcurementConnector();
