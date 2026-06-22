/**
 * Waitron → Nexha Procurement Connector
 *
 * Connects Waitron's inventory alerts to NexhaBizz's reorder engine
 * Enables automatic procurement when stock levels are low
 *
 * Flow: Inventory Alert → Waitron → NexhaBizz → RFQ → Suppliers → PO
 *
 * @module waitron-nexha-procurement-connector
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

export interface InventoryItem {
  itemId: string;
  name: string;
  currentStock: number;
  reorderPoint: number;
  unit: string;
  category?: string;
  costPerUnit?: number;
  suppliers?: string[];
  lastOrderDate?: string;
  avgDailyUsage?: number;
}

export interface InventoryAlert {
  item: InventoryItem;
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  hoursUntilStockout?: number;
}

export interface Supplier {
  id: string;
  name: string;
  rating: number;
  isVerified: boolean;
  categories: string[];
  deliveryDays?: number;
  minOrderValue?: number;
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  sku?: string;
  unit: string;
  price: number;
  moq: number;
  bulkPricing?: Array<{
    minQty: number;
    price: number;
  }>;
  deliveryDays?: number;
  matchScore?: number;
}

export interface ProcurementOrder {
  id: string;
  merchantId: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    estimatedPrice?: number;
  }>;
  supplierId?: string;
  supplierName?: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'rfq_sent' | 'quote_received' | 'confirmed' | 'ordered' | 'delivered';
  createdAt: string;
  estimatedDelivery?: string;
  totalEstimatedCost?: number;
}

export interface ReorderSignal {
  id: string;
  signalId: string;
  merchantId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  suggestedQty: number;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'matched' | 'po_created' | 'dismissed';
  matchedSuppliers?: number;
  matchConfidence?: number;
  createdAt: string;
}

export interface ProcurementResult {
  success: boolean;
  alerts: InventoryAlert[];
  matchedSignals: ReorderSignal[];
  suggestedOrders: Array<{
    item: string;
    quantity: number;
    urgency: string;
    suppliers: SupplierProduct[];
    estimatedCost: number;
  }>;
  actions: string[];
  timestamp: string;
}

export class NexhaProcurementConnector {
  private client: AxiosInstance;
  private nextaBizzClient: AxiosInstance;

  // Service URLs
  private nexhaUrl: string;
  private nextaBizzUrl: string;

  // Cache
  private supplierCache: Map<string, { suppliers: Supplier[]; expiry: number }> = new Map();

  constructor(config?: {
    nexhaUrl?: string;
    nextaBizzUrl?: string;
    apiKey?: string;
    logger?: winston.Logger;
  }) {
    this.nexhaUrl = config?.nexhaUrl || process.env.NEXHA_URL || 'http://localhost:4399';
    this.nextaBizzUrl = config?.nextaBizzUrl || process.env.NEXTABIZZ_URL || 'http://localhost:3000';

    this.client = axios.create({
      baseURL: this.nexhaUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.nextaBizzClient = axios.create({
      baseURL: this.nextaBizzUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (config?.logger) {
      logger = config.logger;
    }

    logger.info('NexhaProcurementConnector initialized', {
      nexhaUrl: this.nexhaUrl,
      nextaBizzUrl: this.nextaBizzUrl
    });
  }

  /**
   * Send inventory signal to NexhaBizz
   * This creates a reorder signal that triggers the reorder engine
   */
  async sendInventorySignal(params: {
    merchantId: string;
    item: InventoryItem;
    severity: 'low' | 'medium' | 'high' | 'critical';
    signalType: 'low_stock' | 'out_of_stock' | 'expiring' | 'overstock';
  }): Promise<ReorderSignal | null> {
    try {
      logger.info('Sending inventory signal to NexhaBizz', {
        merchantId: params.merchantId,
        item: params.item.name,
        severity: params.severity
      });

      // Create inventory signal via NexhaBizz webhook
      const response = await this.nextaBizzClient.post('/api/inventory-signals', {
        merchant_id: params.merchantId,
        source: 'waitron',
        source_product_id: params.item.itemId,
        product_name: params.item.name,
        current_stock: params.item.currentStock,
        threshold: params.item.reorderPoint,
        unit: params.item.unit,
        category: params.item.category,
        severity: params.severity,
        signal_type: params.signalType,
        metadata: {
          cost_per_unit: params.item.costPerUnit,
          suppliers: params.item.suppliers,
          last_order_date: params.item.lastOrderDate,
          avg_daily_usage: params.item.avgDailyUsage
        }
      });

      if (response.data?.id) {
        logger.info('Inventory signal created', {
          signalId: response.data.id,
          merchantId: params.merchantId
        });

        return {
          id: response.data.id,
          signalId: response.data.signal_id,
          merchantId: params.merchantId,
          productName: params.item.name,
          currentStock: params.item.currentStock,
          threshold: params.item.reorderPoint,
          suggestedQty: response.data.suggested_qty || Math.max(0, params.item.reorderPoint * 2 - params.item.currentStock),
          urgency: this.determineUrgency(params.severity, params.item),
          severity: params.severity,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
      }

      return null;
    } catch (error: any) {
      logger.error('Failed to send inventory signal', {
        error: error.message,
        merchantId: params.merchantId,
        item: params.item.name
      });

      // Try alternative: send via Nexha ecosystem connector
      return this.sendSignalViaNexha(params);
    }
  }

  /**
   * Alternative method to send signal via Nexha ecosystem connector
   */
  private async sendSignalViaNexha(params: {
    merchantId: string;
    item: InventoryItem;
    severity: 'low' | 'medium' | 'high' | 'critical';
    signalType: 'low_stock' | 'out_of_stock' | 'expiring' | 'overstock';
  }): Promise<ReorderSignal | null> {
    try {
      const response = await this.client.post('/api/events/demand', {
        merchantId: params.merchantId,
        productName: params.item.name,
        quantity: Math.max(0, params.item.reorderPoint * 2 - params.item.currentStock),
        urgency: this.determineUrgency(params.severity, params.item),
        source: 'waitron',
        metadata: {
          currentStock: params.item.currentStock,
          reorderPoint: params.item.reorderPoint,
          unit: params.item.unit,
          category: params.item.category
        }
      });

      if (response.data?.id) {
        return {
          id: response.data.id,
          signalId: response.data.id,
          merchantId: params.merchantId,
          productName: params.item.name,
          currentStock: params.item.currentStock,
          threshold: params.item.reorderPoint,
          suggestedQty: Math.max(0, params.item.reorderPoint * 2 - params.item.currentStock),
          urgency: this.determineUrgency(params.severity, params.item),
          severity: params.severity,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
      }

      return null;
    } catch (error: any) {
      logger.error('Nexha signal also failed', { error: error.message });
      return null;
    }
  }

  /**
   * Search for suppliers for specific products
   */
  async searchSuppliers(params: {
    query: string;
    categories?: string[];
    location?: string;
    limit?: number;
  }): Promise<Supplier[]> {
    const cacheKey = `suppliers:${params.query}:${params.categories?.join(',') || ''}`;

    // Check cache
    const cached = this.supplierCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.suppliers;
    }

    try {
      logger.info('Searching suppliers', { query: params.query });

      const response = await this.client.get('/api/suppliers/search', {
        params: {
          query: params.query,
          categories: params.categories?.join(','),
          location: params.location,
          limit: params.limit || 10
        }
      });

      const suppliers: Supplier[] = (response.data.suppliers || response.data || []).map((s: any) => ({
        id: s.id || s.supplier_id,
        name: s.name || s.business_name,
        rating: s.rating || 3,
        isVerified: s.is_verified || s.isVerified || false,
        categories: s.categories || [],
        deliveryDays: s.delivery_days || s.deliveryDays,
        minOrderValue: s.min_order_value || s.minOrderValue,
        priceRange: s.price_range || s.priceRange
      }));

      // Cache for 30 minutes
      this.supplierCache.set(cacheKey, {
        suppliers,
        expiry: Date.now() + 30 * 60 * 1000
      });

      logger.info('Suppliers found', { query: params.query, count: suppliers.length });

      return suppliers;
    } catch (error: any) {
      logger.error('Supplier search failed', { error: error.message, query: params.query });
      return [];
    }
  }

  /**
   * Search for products from suppliers
   */
  async searchProducts(params: {
    productName: string;
    supplierIds?: string[];
    limit?: number;
  }): Promise<SupplierProduct[]> {
    try {
      logger.info('Searching products', { productName: params.productName });

      // Try NexhaBizz reorder engine first
      try {
        const response = await this.nextaBizzClient.get('/api/products/search', {
          params: {
            q: params.productName,
            limit: params.limit || 5
          }
        });

        if (response.data?.products) {
          return this.parseSupplierProducts(response.data.products);
        }
      } catch (e) {
        // NexhaBizz products endpoint not available, try Nexha
      }

      // Fallback to Nexha suppliers search
      const response = await this.client.get('/api/suppliers', {
        params: {
          category: 'food',
          location: 'Bangalore',
          limit: params.limit || 10
        }
      });

      const products: SupplierProduct[] = [];

      for (const supplier of (response.data.suppliers || response.data || [])) {
        const productsList = supplier.products || supplier.product_list || [];

        for (const product of productsList) {
          if (product.name?.toLowerCase().includes(params.productName.toLowerCase())) {
            products.push({
              id: product.id,
              supplierId: supplier.id,
              supplierName: supplier.name,
              name: product.name,
              sku: product.sku,
              unit: product.unit || 'kg',
              price: product.price || product.unit_price || 0,
              moq: product.moq || 1,
              bulkPricing: product.bulk_pricing || product.bulkPricing,
              deliveryDays: supplier.delivery_days,
              matchScore: this.calculateMatchScore(product, params.productName)
            });
          }
        }
      }

      // Sort by match score
      products.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      return products.slice(0, params.limit || 5);
    } catch (error: any) {
      logger.error('Product search failed', { error: error.message, productName: params.productName });
      return [];
    }
  }

  /**
   * Create a procurement order/RFQ
   */
  async createProcurementOrder(params: {
    merchantId: string;
    items: Array<{
      productName: string;
      quantity: number;
      unit: string;
    }>;
    supplierId?: string;
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
  }): Promise<ProcurementOrder | null> {
    try {
      logger.info('Creating procurement order', {
        merchantId: params.merchantId,
        itemCount: params.items.length,
        urgency: params.urgency
      });

      // Try NexhaBizz first
      try {
        const response = await this.nextaBizzClient.post('/api/purchase-orders', {
          merchant_id: params.merchantId,
          items: params.items.map(i => ({
            product_name: i.productName,
            quantity: i.quantity,
            unit: i.unit
          })),
          supplier_id: params.supplierId,
          urgency: params.urgency || 'medium',
          notes: params.notes,
          source: 'waitron'
        });

        if (response.data?.id) {
          logger.info('Procurement order created via NexhaBizz', { orderId: response.data.id });

          return {
            id: response.data.id,
            merchantId: params.merchantId,
            items: params.items,
            supplierId: params.supplierId,
            urgency: params.urgency || 'medium',
            status: 'draft',
            createdAt: new Date().toISOString(),
            totalEstimatedCost: response.data.total_cost
          };
        }
      } catch (e) {
        // NexhaBizz PO endpoint not available
      }

      // Fallback: send demand signal to Nexha
      const response = await this.client.post('/api/events/demand', {
        merchantId: params.merchantId,
        productName: params.items[0]?.productName,
        quantity: params.items[0]?.quantity,
        urgency: params.urgency || 'medium',
        source: 'waitron'
      });

      logger.info('Demand signal sent to Nexha', {
        merchantId: params.merchantId,
        signalId: response.data?.id
      });

      return {
        id: response.data?.id || `PO-${Date.now()}`,
        merchantId: params.merchantId,
        items: params.items,
        supplierId: params.supplierId,
        urgency: params.urgency || 'medium',
        status: 'rfq_sent',
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Procurement order creation failed', {
        error: error.message,
        merchantId: params.merchantId
      });
      return null;
    }
  }

  /**
   * Process inventory alerts from Waitron
   * Analyzes alerts and suggests procurement actions
   */
  async processInventoryAlerts(params: {
    merchantId: string;
    alerts: InventoryAlert[];
  }): Promise<ProcurementResult> {
    const result: ProcurementResult = {
      success: true,
      alerts: params.alerts,
      matchedSignals: [],
      suggestedOrders: [],
      actions: [],
      timestamp: new Date().toISOString()
    };

    logger.info('Processing inventory alerts', {
      merchantId: params.merchantId,
      alertCount: params.alerts.length
    });

    // Group alerts by severity
    const criticalAlerts = params.alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
    const mediumAlerts = params.alerts.filter(a => a.severity === 'medium');
    const lowAlerts = params.alerts.filter(a => a.severity === 'low');

    // Process critical alerts immediately
    for (const alert of criticalAlerts) {
      try {
        // Send inventory signal
        const signal = await this.sendInventorySignal({
          merchantId: params.merchantId,
          item: alert.item,
          severity: alert.severity,
          signalType: alert.item.currentStock <= 0 ? 'out_of_stock' : 'low_stock'
        });

        if (signal) {
          result.matchedSignals.push(signal);
        }

        // Search for suppliers
        const products = await this.searchProducts({
          productName: alert.item.name,
          limit: 3
        });

        if (products.length > 0) {
          result.suggestedOrders.push({
            item: alert.item.name,
            quantity: Math.max(alert.item.reorderPoint * 2 - alert.item.currentStock, alert.item.reorderPoint),
            urgency: alert.urgency,
            suppliers: products,
            estimatedCost: products[0].price * Math.max(alert.item.reorderPoint * 2 - alert.item.currentStock, alert.item.reorderPoint)
          });

          result.actions.push(`Order ${alert.item.name} (${alert.urgency} urgency)`);
        }
      } catch (error: any) {
        logger.error('Failed to process alert', { item: alert.item.name, error: error.message });
      }
    }

    // Process medium alerts (batch)
    if (mediumAlerts.length > 0) {
      const batchItems = mediumAlerts.map(a => ({
        productName: a.item.name,
        quantity: Math.max(a.item.reorderPoint * 2 - a.item.currentStock, a.item.reorderPoint),
        unit: a.item.unit
      }));

      // Create batch order
      await this.createProcurementOrder({
        merchantId: params.merchantId,
        items: batchItems,
        urgency: 'medium'
      });

      result.actions.push(`Batch order created for ${mediumAlerts.length} items`);
    }

    // Low alerts - just log
    if (lowAlerts.length > 0) {
      result.actions.push(`${lowAlerts.length} items at low stock - monitor only`);
    }

    logger.info('Inventory alerts processed', {
      merchantId: params.merchantId,
      signalsCreated: result.matchedSignals.length,
      ordersSuggested: result.suggestedOrders.length
    });

    return result;
  }

  /**
   * Get reorder signals for a merchant
   */
  async getReorderSignals(merchantId: string): Promise<ReorderSignal[]> {
    try {
      const response = await this.nextaBizzClient.get('/api/reorder-signals', {
        params: { merchant_id: merchantId }
      });

      return (response.data.signals || response.data || []).map((s: any) => ({
        id: s.id,
        signalId: s.inventory_signal_id,
        merchantId: s.merchant_id,
        productName: s.product_name,
        currentStock: s.current_stock,
        threshold: s.threshold,
        suggestedQty: s.suggested_qty,
        urgency: s.urgency,
        severity: s.severity || 'medium',
        status: s.status,
        matchedSuppliers: s.matched_suppliers,
        matchConfidence: s.match_confidence,
        createdAt: s.created_at
      }));
    } catch (error: any) {
      logger.error('Failed to get reorder signals', { error: error.message, merchantId });
      return [];
    }
  }

  /**
   * Create RFQ for suppliers
   */
  async createRFQ(params: {
    merchantId: string;
    items: Array<{
      productName: string;
      quantity: number;
      unit: string;
    }>;
    suppliers?: string[];
    validUntil?: string;
  }): Promise<{ rfqId: string; status: string } | null> {
    try {
      logger.info('Creating RFQ', {
        merchantId: params.merchantId,
        itemCount: params.items.length
      });

      const response = await this.nextaBizzClient.post('/api/rfqs', {
        merchant_id: params.merchantId,
        items: params.items,
        supplier_ids: params.suppliers,
        valid_until: params.validUntil,
        source: 'waitron'
      });

      if (response.data?.id) {
        logger.info('RFQ created', { rfqId: response.data.id });
        return {
          rfqId: response.data.id,
          status: 'sent'
        };
      }

      return null;
    } catch (error: any) {
      logger.error('RFQ creation failed', { error: error.message });
      return null;
    }
  }

  /**
   * Helper: Determine urgency based on severity and item
   */
  private determineUrgency(
    severity: 'low' | 'medium' | 'high' | 'critical',
    item: InventoryItem
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (severity === 'critical') {
      return item.currentStock < item.reorderPoint * 0.5 ? 'urgent' : 'high';
    }
    return severity as 'low' | 'medium' | 'high' | 'urgent';
  }

  /**
   * Helper: Calculate match score for products
   */
  private calculateMatchScore(product: any, searchTerm: string): number {
    let score = 50;

    const productName = (product.name || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    // Exact match
    if (productName === search) score += 40;
    // Partial match
    else if (productName.includes(search)) score += 20;

    // Active bonus
    if (product.is_active || product.isActive) score += 10;

    return Math.min(100, score);
  }

  /**
   * Helper: Parse supplier products from various formats
   */
  private parseSupplierProducts(data: any[]): SupplierProduct[] {
    return (data || []).map((p: any) => ({
      id: p.id || p.product_id,
      supplierId: p.supplier_id || p.supplierId,
      supplierName: p.supplier_name || p.supplierName || 'Unknown',
      name: p.name || p.product_name,
      sku: p.sku,
      unit: p.unit || 'unit',
      price: p.price || p.unit_price || 0,
      moq: p.moq || p.min_order_quantity || 1,
      bulkPricing: p.bulk_pricing || p.bulkPricing,
      deliveryDays: p.delivery_days || p.deliveryDays,
      matchScore: p.match_score || p.matchScore || 50
    }));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    nexha: boolean;
    nextaBizz: boolean;
  }> {
    const [nexhaHealth, nextaBizzHealth] = await Promise.all([
      this.client.get('/health').then(() => true).catch(() => false),
      this.nextaBizzClient.get('/health').then(() => true).catch(() => false)
    ]);

    return {
      healthy: nexhaHealth || nextaBizzHealth,
      nexha: nexhaHealth,
      nextaBizz: nextaBizzHealth
    };
  }

  /**
   * Clear supplier cache
   */
  clearCache(): void {
    this.supplierCache.clear();
    logger.info('Supplier cache cleared');
  }
}

// Export singleton instance
export const nexhaProcurementConnector = new NexhaProcurementConnector();

export default NexhaProcurementConnector;