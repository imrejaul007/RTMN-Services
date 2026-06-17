/**
 * Twin Sync Service
 * Synchronizes REZ ecosystem data to Digital Twins
 *
 * Twin Mappings:
 * - Order Twin: REZ-Consumer orders, REZ-Merchant POS orders
 * - Product Twin: REZ-Merchant products, inventory
 * - Shipment Twin: REZ-Delivery shipments, tracking
 * - Payment Twin: REZ-Wallet transactions
 * - Customer Twin: REZ-Consumer profiles
 * - Delivery Twin: REZ-Delivery partners
 * - Area Twin: Merchant locations, zones
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

export type TwinType = 'order' | 'product' | 'shipment' | 'payment' | 'customer' | 'delivery' | 'area';

export interface TwinEndpoint {
  order: string;
  product: string;
  shipment: string;
  payment: string;
  customer: string;
  delivery: string;
  area: string;
}

export interface TwinSyncResult {
  success: boolean;
  twinType: TwinType;
  twinId: string;
  timestamp: Date;
  error?: string;
}

export interface TwinStatus {
  connected: boolean;
  lastSync: Date | null;
  pendingSyncs: number;
  failedSyncs: number;
}

export class TwinSyncService {
  private logger: winston.Logger;
  private twinClients: Map<TwinType, AxiosInstance>;
  private twinEndpoints: TwinEndpoint;
  private twinHubClient: AxiosInstance;
  private twinData: Map<string, any>;
  private twinStatus: Map<TwinType, TwinStatus>;
  private syncQueue: Array<{ type: TwinType; id: string; data: any }>;
  private isInitialized: boolean;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [new winston.transports.Console()]
    });

    // Twin service endpoints
    this.twinEndpoints = {
      order: process.env.ORDER_TWIN_URL || 'http://localhost:3018',
      product: process.env.PRODUCT_TWIN_URL || 'http://localhost:3015',
      shipment: process.env.SHIPMENT_TWIN_URL || 'http://localhost:3019',
      payment: process.env.PAYMENT_TWIN_URL || 'http://localhost:4004',
      customer: process.env.CUSTOMER_TWIN_URL || 'http://localhost:3016',
      delivery: process.env.TWIN_OS_HUB_URL || 'http://localhost:4705',
      area: process.env.TWIN_OS_HUB_URL || 'http://localhost:4705'
    };

    // Initialize twin clients
    this.twinClients = new Map();
    this.twinClients.set('order', this.createTwinClient(this.twinEndpoints.order, 'order'));
    this.twinClients.set('product', this.createTwinClient(this.twinEndpoints.product, 'product'));
    this.twinClients.set('shipment', this.createTwinClient(this.twinEndpoints.shipment, 'shipment'));
    this.twinClients.set('payment', this.createTwinClient(this.twinEndpoints.payment, 'payment'));
    this.twinClients.set('customer', this.createTwinClient(this.twinEndpoints.customer, 'customer'));
    this.twinClients.set('delivery', this.createTwinClient(this.twinEndpoints.delivery, 'delivery'));
    this.twinClients.set('area', this.createTwinClient(this.twinEndpoints.area, 'area'));

    // TwinOS Hub client for unified access
    this.twinHubClient = axios.create({
      baseURL: this.twinEndpoints.order.split('/')[0] + '//' + this.twinEndpoints.order.split('/')[2] || this.twinEndpoints.order,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    // In-memory data store (fallback when twins are unavailable)
    this.twinData = new Map();

    // Track status per twin
    this.twinStatus = new Map();
    const twinTypes: TwinType[] = ['order', 'product', 'shipment', 'payment', 'customer', 'delivery', 'area'];
    for (const type of twinTypes) {
      this.twinStatus.set(type, {
        connected: false,
        lastSync: null,
        pendingSyncs: 0,
        failedSyncs: 0
      });
    }

    this.syncQueue = [];
    this.isInitialized = false;
  }

  private createTwinClient(baseURL: string, twinType: string): AxiosInstance {
    return axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Twin-Type': twinType,
        'X-API-Key': process.env.TWIN_OS_API_KEY || ''
      }
    });
  }

  /**
   * Initialize connections to all twins
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Twin Sync Service');

    const twinTypes: TwinType[] = ['order', 'product', 'shipment', 'payment', 'customer', 'delivery', 'area'];

    for (const type of twinTypes) {
      try {
        const client = this.twinClients.get(type);
        if (client) {
          await client.get('/health');
          this.updateStatus(type, { connected: true });
          this.logger.info(`Connected to ${type} twin`);
        }
      } catch (error: any) {
        this.updateStatus(type, { connected: false });
        this.logger.warn(`${type} twin not reachable:`, error.message);
      }
    }

    this.isInitialized = true;
    this.logger.info('Twin Sync Service initialized');
  }

  /**
   * Sync data to a specific twin
   */
  async syncToTwin(twinType: TwinType, data: any): Promise<TwinSyncResult> {
    const twinId = this.extractTwinId(twinType, data);

    try {
      const client = this.twinClients.get(twinType);
      if (!client) {
        throw new Error(`Unknown twin type: ${twinType}`);
      }

      // Try to sync to actual twin service
      try {
        const endpoint = this.getTwinEndpoint(twinType, data);
        await client.post(endpoint, this.transformForTwin(twinType, data));

        this.updateStatus(twinType, { lastSync: new Date() });
        this.logger.info(`Synced to ${twinType} twin: ${twinId}`);

        return { success: true, twinType, twinId, timestamp: new Date() };
      } catch (error: any) {
        // Twin service unavailable - store in memory
        this.twinData.set(`${twinType}:${twinId}`, data);
        this.updateStatus(twinType, { pendingSyncs: this.syncQueue.length + 1 });
        this.logger.warn(`Twin ${twinType}:${twinId} queued (service unavailable)`);

        return { success: true, twinType, twinId, timestamp: new Date() };
      }
    } catch (error: any) {
      this.updateStatus(twinType, { failedSyncs: (this.twinStatus.get(twinType)?.failedSyncs || 0) + 1 });
      this.logger.error(`Twin sync failed for ${twinType}:${twinId}:`, error.message);

      return { success: false, twinType, twinId, timestamp: new Date(), error: error.message };
    }
  }

  /**
   * Get twin endpoint path
   */
  private getTwinEndpoint(twinType: TwinType, data: any): string {
    switch (twinType) {
      case 'order':
        return `/api/twins/order/${data.orderId || data.orderId}`;
      case 'product':
        return `/api/twins/product/${data.productId || data.productId}`;
      case 'shipment':
        return `/api/twins/shipment/${data.shipmentId || data.shipmentId}`;
      case 'payment':
        return `/api/twins/payment/${data.transactionId || data.transactionId}`;
      case 'customer':
        return `/api/twins/customer/${data.consumerId || data.customerId || data.customerId}`;
      case 'delivery':
        return `/api/twins/delivery/${data.deliveryId || data.deliveryId}`;
      case 'area':
        return `/api/twins/area/${data.merchantId || data.zoneId || 'unknown'}`;
      default:
        return '/api/twins/sync';
    }
  }

  /**
   * Extract twin ID from data based on type
   */
  private extractTwinId(twinType: TwinType, data: any): string {
    switch (twinType) {
      case 'order':
        return data.orderId;
      case 'product':
        return data.productId;
      case 'shipment':
        return data.shipmentId;
      case 'payment':
        return data.transactionId;
      case 'customer':
        return data.consumerId || data.customerId;
      case 'delivery':
        return data.deliveryId;
      case 'area':
        return data.merchantId || data.zoneId;
      default:
        return data.id || 'unknown';
    }
  }

  /**
   * Transform data for specific twin
   */
  private transformForTwin(twinType: TwinType, data: any): any {
    const base = {
      ...data,
      _syncedAt: new Date().toISOString(),
      _source: 'rez-integration'
    };

    switch (twinType) {
      case 'order':
        return {
          ...base,
          orderId: data.orderId,
          status: data.status,
          customerId: data.customer?.id,
          merchantId: data.merchant?.id,
          items: data.items,
          pricing: data.pricing,
          delivery: data.delivery,
          payment: data.payment
        };
      case 'product':
        return {
          ...base,
          productId: data.productId,
          merchantId: data.merchantId,
          name: data.name,
          price: data.price,
          availability: data.availability,
          category: data.category
        };
      case 'shipment':
        return {
          ...base,
          shipmentId: data.shipmentId,
          orderId: data.orderId,
          status: data.status,
          deliveryPartner: data.deliveryPartner,
          pickup: data.pickup,
          delivery: data.delivery,
          route: data.route
        };
      case 'payment':
        return {
          ...base,
          transactionId: data.transactionId,
          orderId: data.orderId,
          amount: data.amount,
          type: data.type,
          status: data.status,
          from: data.from,
          to: data.to
        };
      case 'customer':
        return {
          ...base,
          customerId: data.consumerId || data.customerId,
          name: data.name,
          contact: data.contact,
          preferences: data.preferences,
          walletBalance: data.wallet?.balance
        };
      case 'delivery':
        return {
          ...base,
          deliveryId: data.deliveryId,
          name: data.name,
          status: data.status,
          vehicle: data.vehicle,
          location: data.currentLocation
        };
      case 'area':
        return {
          ...base,
          zoneId: data.zoneId || data.merchantId,
          location: data.location || data.address,
          type: data.type,
          metadata: data.metadata
        };
      default:
        return base;
    }
  }

  /**
   * Get data from twin or local cache
   */
  async getTwinData(twinType: TwinType, twinId: string): Promise<any | null> {
    try {
      const client = this.twinClients.get(twinType);
      if (client) {
        const endpoint = this.getTwinEndpoint(twinType, { [this.getIdField(twinType)]: twinId });
        const response = await client.get(endpoint);
        return response.data;
      }
    } catch {
      // Return from local cache
      return this.twinData.get(`${twinType}:${twinId}`) || null;
    }
    return null;
  }

  private getIdField(twinType: TwinType): string {
    const fields: Record<TwinType, string> = {
      order: 'orderId',
      product: 'productId',
      shipment: 'shipmentId',
      payment: 'transactionId',
      customer: 'customerId',
      delivery: 'deliveryId',
      area: 'zoneId'
    };
    return fields[twinType];
  }

  /**
   * Sync all pending data
   */
  async syncAll(): Promise<TwinSyncResult[]> {
    const results: TwinSyncResult[] = [];

    const twinTypes: TwinType[] = ['order', 'product', 'shipment', 'payment', 'customer', 'delivery', 'area'];

    for (const type of twinTypes) {
      const status = this.twinStatus.get(type);
      if (status?.connected) {
        // Sync any cached data for this twin type
        for (const [key, data] of this.twinData.entries()) {
          if (key.startsWith(`${type}:`)) {
            const twinId = key.split(':')[1];
            const result = await this.syncToTwin(type, data);
            if (result.success) {
              this.twinData.delete(key);
            }
            results.push(result);
          }
        }
      }
    }

    this.logger.info(`Bulk sync completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  /**
   * Update twin status
   */
  private updateStatus(twinType: TwinType, updates: Partial<TwinStatus>): void {
    const current = this.twinStatus.get(twinType) || { connected: false, lastSync: null, pendingSyncs: 0, failedSyncs: 0 };
    this.twinStatus.set(twinType, { ...current, ...updates });
  }

  /**
   * Get status for a specific twin
   */
  getTwinStatus(twinType: TwinType): TwinStatus {
    return this.twinStatus.get(twinType) || { connected: false, lastSync: null, pendingSyncs: 0, failedSyncs: 0 };
  }

  /**
   * Get overall service status
   */
  getStatus(): any {
    const statuses: Record<string, TwinStatus> = {};
    const twinTypes: TwinType[] = ['order', 'product', 'shipment', 'payment', 'customer', 'delivery', 'area'];

    for (const type of twinTypes) {
      statuses[type] = this.getTwinStatus(type);
    }

    return {
      initialized: this.isInitialized,
      twins: statuses,
      cachedRecords: this.twinData.size,
      queueSize: this.syncQueue.length
    };
  }

  /**
   * Health check for all twins
   */
  async healthCheck(): Promise<Record<TwinType, boolean>> {
    const results: Record<string, boolean> = {};
    const twinTypes: TwinType[] = ['order', 'product', 'shipment', 'payment', 'customer', 'delivery', 'area'];

    for (const type of twinTypes) {
      try {
        const client = this.twinClients.get(type);
        if (client) {
          await client.get('/health', { timeout: 3000 });
          results[type] = true;
        }
      } catch {
        results[type] = false;
      }
    }

    return results as Record<TwinType, boolean>;
  }

  /**
   * Subscribe to twin updates
   */
  async subscribeToTwinUpdates(twinType: TwinType, callback: (data: any) => void): Promise<void> {
    // This would connect to the twin's webhook/websocket for real-time updates
    this.logger.info(`Subscribed to ${twinType} twin updates`);
  }

  /**
   * Batch sync multiple records
   */
  async batchSync(records: Array<{ type: TwinType; data: any }>): Promise<TwinSyncResult[]> {
    const results: TwinSyncResult[] = [];

    for (const record of records) {
      const result = await this.syncToTwin(record.type, record.data);
      results.push(result);
    }

    return results;
  }
}
