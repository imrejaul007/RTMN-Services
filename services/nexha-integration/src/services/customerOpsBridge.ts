import axios, { AxiosInstance } from 'axios';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { Supplier, Warehouse, NexhaEvent, TwinSyncRecord, createSyncRecord } from '../models/NexhaProfile';

export interface TwinConnectionConfig {
  orderTwinUrl: string;
  paymentTwinUrl: string;
  assetTwinUrl: string;
  eventBusUrl: string;
  ecosystemConnectorUrl: string;
}

export interface TwinSyncResult {
  success: boolean;
  twinId?: string;
  twinType: string;
  error?: string;
}

export class CustomerOpsBridge {
  private logger: winston.Logger;
  private config: TwinConnectionConfig;
  private orderTwinClient: AxiosInstance;
  private paymentTwinClient: AxiosInstance;
  private assetTwinClient: AxiosInstance;
  private eventBusClient: AxiosInstance;
  private ecosystemClient: AxiosInstance;
  private syncRecords: Map<string, TwinSyncRecord> = new Map();
  private isInitialized: boolean = false;

  constructor(logger: winston.Logger) {
    this.logger = logger;

    // Initialize configuration
    this.config = {
      orderTwinUrl: process.env.ORDER_TWIN_URL || 'http://localhost:3018',
      paymentTwinUrl: process.env.PAYMENT_TWIN_URL || 'http://localhost:3020',
      assetTwinUrl: process.env.ASSET_TWIN_URL || 'http://localhost:3015',
      eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:4510',
      ecosystemConnectorUrl: process.env.ECOSYSTEM_CONNECTOR_URL || 'http://localhost:4399'
    };

    // Initialize HTTP clients
    this.orderTwinClient = axios.create({
      baseURL: this.config.orderTwinUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.paymentTwinClient = axios.create({
      baseURL: this.config.paymentTwinUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.assetTwinClient = axios.create({
      baseURL: this.config.assetTwinUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.eventBusClient = axios.create({
      baseURL: this.config.eventBusUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.ecosystemClient = axios.create({
      baseURL: this.config.ecosystemConnectorUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Initialize connections to all twins
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing CustomerOpsBridge connections...');

    try {
      // Check connectivity to twins
      await Promise.allSettled([
        this.checkTwinHealth('Order Twin', this.orderTwinClient),
        this.checkTwinHealth('Payment Twin', this.paymentTwinClient),
        this.checkTwinHealth('Asset Twin', this.assetTwinClient),
        this.checkTwinHealth('Event Bus', this.eventBusClient)
      ]);

      // Register with ecosystem connector
      await this.registerWithEcosystem();

      this.isInitialized = true;
      this.logger.info('CustomerOpsBridge initialized successfully');
    } catch (error) {
      this.logger.warn('CustomerOpsBridge initialization completed with some warnings:', error);
      this.isInitialized = true; // Continue anyway for offline mode
    }
  }

  /**
   * Check if a twin service is healthy
   */
  private async checkTwinHealth(name: string, client: AxiosInstance): Promise<void> {
    try {
      const response = await client.get('/health');
      this.logger.info(`${name} is healthy:`, response.data);
    } catch (error) {
      this.logger.warn(`${name} health check failed (service may be offline):`, error);
    }
  }

  /**
   * Register this service with the ecosystem connector
   */
  private async registerWithEcosystem(): Promise<void> {
    try {
      await this.ecosystemClient.post('/api/services', {
        name: 'nexha-integration',
        version: '1.0.0',
        port: process.env.PORT || 4966,
        type: 'integration',
        capabilities: [
          'procurement',
          'distribution',
          'supplier-management',
          'twin-sync'
        ],
        connectedTwins: ['order-twin', 'payment-twin', 'asset-twin']
      });
      this.logger.info('Registered with ecosystem connector');
    } catch (error) {
      this.logger.warn('Failed to register with ecosystem connector:', error);
    }
  }

  /**
   * Sync supplier to Supplier Twin
   */
  async syncToSupplierTwin(supplier: Supplier): Promise<TwinSyncResult> {
    const syncId = `supplier-${supplier.id}`;
    let syncRecord = this.syncRecords.get(syncId) || createSyncRecord('supplier', supplier.id, 'supplier');

    try {
      const payload = this.transformSupplierForTwin(supplier);

      const response = await this.orderTwinClient.post('/api/suppliers', payload);

      syncRecord.twinId = response.data.id;
      syncRecord.status = 'synced';
      syncRecord.lastSyncAt = new Date();
      syncRecord.payload = payload as unknown as Record<string, unknown>;

      this.syncRecords.set(syncId, syncRecord);

      this.logger.info(`Synced supplier ${supplier.companyName} to Supplier Twin: ${syncRecord.twinId}`);

      return {
        success: true,
        twinId: syncRecord.twinId,
        twinType: 'supplier'
      };
    } catch (error) {
      syncRecord.status = 'failed';
      syncRecord.retryCount++;
      syncRecord.error = error instanceof Error ? error.message : 'Unknown error';
      this.syncRecords.set(syncId, syncRecord);

      this.logger.error(`Failed to sync supplier ${supplier.companyName} to Supplier Twin:`, error);

      return {
        success: false,
        twinType: 'supplier',
        error: syncRecord.error
      };
    }
  }

  /**
   * Sync warehouse to Asset Twin
   */
  async syncToAssetTwin(warehouse: Warehouse): Promise<TwinSyncResult> {
    const syncId = `asset-${warehouse.id}`;
    let syncRecord = this.syncRecords.get(syncId) || createSyncRecord('distribution', warehouse.id, 'asset');

    try {
      const payload = this.transformWarehouseForTwin(warehouse);

      const response = await this.assetTwinClient.post('/api/assets', payload);

      syncRecord.twinId = response.data.id;
      syncRecord.status = 'synced';
      syncRecord.lastSyncAt = new Date();
      syncRecord.payload = payload as unknown as Record<string, unknown>;

      this.syncRecords.set(syncId, syncRecord);

      this.logger.info(`Synced warehouse ${warehouse.name} to Asset Twin: ${syncRecord.twinId}`);

      return {
        success: true,
        twinId: syncRecord.twinId,
        twinType: 'asset'
      };
    } catch (error) {
      syncRecord.status = 'failed';
      syncRecord.retryCount++;
      syncRecord.error = error instanceof Error ? error.message : 'Unknown error';
      this.syncRecords.set(syncId, syncRecord);

      this.logger.error(`Failed to sync warehouse ${warehouse.name} to Asset Twin:`, error);

      return {
        success: false,
        twinType: 'asset',
        error: syncRecord.error
      };
    }
  }

  /**
   * Sync payment to Payment Twin
   */
  async syncToPaymentTwin(payment: {
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
  }): Promise<TwinSyncResult> {
    const syncId = `payment-${payment.id}`;
    let syncRecord = this.syncRecords.get(syncId) || createSyncRecord('procurement', payment.id, 'payment');

    try {
      const payload = {
        externalId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        source: 'nexha-integration'
      };

      const response = await this.paymentTwinClient.post('/api/payments', payload);

      syncRecord.twinId = response.data.id;
      syncRecord.status = 'synced';
      syncRecord.lastSyncAt = new Date();
      syncRecord.payload = payload as unknown as Record<string, unknown>;

      this.syncRecords.set(syncId, syncRecord);

      this.logger.info(`Synced payment ${payment.id} to Payment Twin: ${syncRecord.twinId}`);

      return {
        success: true,
        twinId: syncRecord.twinId,
        twinType: 'payment'
      };
    } catch (error) {
      syncRecord.status = 'failed';
      syncRecord.retryCount++;
      syncRecord.error = error instanceof Error ? error.message : 'Unknown error';
      this.syncRecords.set(syncId, syncRecord);

      this.logger.error(`Failed to sync payment ${payment.id} to Payment Twin:`, error);

      return {
        success: false,
        twinType: 'payment',
        error: syncRecord.error
      };
    }
  }

  /**
   * Publish event to Event Bus
   */
  async publishEvent(event: NexhaEvent): Promise<boolean> {
    try {
      const payload = {
        id: event.id || uuidv4(),
        type: event.type,
        source: 'nexha-integration',
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        data: event.data,
        timestamp: event.timestamp || new Date(),
        metadata: {
          service: 'nexha-integration',
          version: '1.0.0'
        }
      };

      await this.eventBusClient.post('/events', payload);

      this.logger.info(`Published event: ${event.type}`, { entityId: event.entityId });

      return true;
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.type}:`, error);
      return false;
    }
  }

  /**
   * Get sync status for an entity
   */
  getSyncStatus(sourceType: string, sourceId: string): TwinSyncRecord | null {
    const syncId = `${sourceType}-${sourceId}`;
    return this.syncRecords.get(syncId) || null;
  }

  /**
   * Get all sync records
   */
  getAllSyncRecords(): TwinSyncRecord[] {
    return Array.from(this.syncRecords.values());
  }

  /**
   * Get failed sync records for retry
   */
  getFailedSyncRecords(): TwinSyncRecord[] {
    return Array.from(this.syncRecords.values())
      .filter(record => record.status === 'failed');
  }

  /**
   * Retry failed sync for a specific record
   */
  async retrySync(syncId: string): Promise<TwinSyncResult> {
    const record = this.syncRecords.get(syncId);
    if (!record) {
      return { success: false, twinType: record?.twinType || 'unknown', error: 'Record not found' };
    }

    if (record.status !== 'failed') {
      return { success: false, twinType: record.twinType, error: 'Record is not in failed state' };
    }

    const maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
    if (record.retryCount >= maxRetries) {
      return { success: false, twinType: record.twinType, error: 'Max retry attempts exceeded' };
    }

    // Retry based on twin type
    switch (record.twinType) {
      case 'order':
        // Would need to fetch the order and retry
        return { success: false, twinType: record.twinType, error: 'Order sync retry not implemented' };
      case 'payment':
        return { success: false, twinType: record.twinType, error: 'Payment sync retry not implemented' };
      case 'asset':
        return { success: false, twinType: record.twinType, error: 'Asset sync retry not implemented' };
      default:
        return { success: false, twinType: record.twinType, error: 'Unknown twin type' };
    }
  }

  /**
   * Transform supplier data for Twin format
   */
  private transformSupplierForTwin(supplier: Supplier): Record<string, unknown> {
    return {
      externalId: supplier.id,
      name: supplier.companyName,
      tradingName: supplier.tradingName,
      type: 'supplier',
      category: supplier.categories[0] || 'General',
      contact: supplier.contacts[0] || {},
      address: supplier.address,
      rating: supplier.rating.average,
      status: supplier.status,
      certifications: supplier.certifications.map(c => c.type),
      metadata: {
        registrationNumber: supplier.registrationNumber,
        taxId: supplier.taxId,
        paymentTerms: supplier.paymentTerms,
        minimumOrderValue: supplier.minimumOrderValue,
        leadTimeDays: supplier.leadTimeDays
      },
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt
    };
  }

  /**
   * Transform warehouse data for Twin format
   */
  private transformWarehouseForTwin(warehouse: Warehouse): Record<string, unknown> {
    return {
      externalId: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      type: 'warehouse',
      category: 'distribution',
      address: warehouse.address,
      capacity: warehouse.capacity,
      currentUtilization: warehouse.currentUtilization,
      utilizationPercent: Math.round((warehouse.currentUtilization / warehouse.capacity) * 100),
      manager: warehouse.manager,
      contactPhone: warehouse.contactPhone,
      status: warehouse.isActive ? 'active' : 'inactive',
      metadata: {
        source: 'nexha-integration'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get bridge health status
   */
  getHealthStatus(): {
    initialized: boolean;
    twins: { name: string; url: string; connected: boolean }[];
    syncStats: {
      total: number;
      synced: number;
      pending: number;
      failed: number;
    };
  } {
    const records = Array.from(this.syncRecords.values());

    return {
      initialized: this.isInitialized,
      twins: [
        { name: 'Order Twin', url: this.config.orderTwinUrl, connected: true },
        { name: 'Payment Twin', url: this.config.paymentTwinUrl, connected: true },
        { name: 'Asset Twin', url: this.config.assetTwinUrl, connected: true },
        { name: 'Event Bus', url: this.config.eventBusUrl, connected: true }
      ],
      syncStats: {
        total: records.length,
        synced: records.filter(r => r.status === 'synced').length,
        pending: records.filter(r => r.status === 'pending').length,
        failed: records.filter(r => r.status === 'failed').length
      }
    };
  }
}

export default CustomerOpsBridge;
