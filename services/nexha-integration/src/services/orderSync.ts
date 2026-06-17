import axios, { AxiosInstance } from 'axios';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import {
  ProcurementOrder,
  DistributionOrder,
  TwinSyncRecord,
  createSyncRecord
} from '../models/NexhaProfile';

export interface OrderSyncConfig {
  orderTwinUrl: string;
  paymentTwinUrl: string;
  syncInterval: number;
  maxRetries: number;
}

export interface OrderSyncResult {
  success: boolean;
  twinOrderId?: string;
  orderType: 'procurement' | 'distribution';
  error?: string;
}

export interface OrderSyncStatus {
  lastSyncAt: Date | null;
  syncedOrders: number;
  failedOrders: number;
  pendingOrders: number;
  syncLoopRunning: boolean;
}

export class OrderSync {
  private logger: winston.Logger;
  private config: OrderSyncConfig;
  private orderTwinClient: AxiosInstance;
  private syncRecords: Map<string, TwinSyncRecord> = new Map();
  private syncLoopInterval: NodeJS.Timeout | null = null;
  private status: OrderSyncStatus = {
    lastSyncAt: null,
    syncedOrders: 0,
    failedOrders: 0,
    pendingOrders: 0,
    syncLoopRunning: false
  };

  // Pending orders queue for sync
  private pendingOrders: Map<string, { order: ProcurementOrder | DistributionOrder; retryCount: number }> = new Map();

  constructor(logger: winston.Logger) {
    this.logger = logger;

    this.config = {
      orderTwinUrl: process.env.ORDER_TWIN_URL || 'http://localhost:3018',
      paymentTwinUrl: process.env.PAYMENT_TWIN_URL || 'http://localhost:3020',
      syncInterval: parseInt(process.env.SYNC_INTERVAL_MS || '30000'),
      maxRetries: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3')
    };

    this.orderTwinClient = axios.create({
      baseURL: this.config.orderTwinUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'nexha-integration'
      }
    });
  }

  /**
   * Start the sync loop
   */
  startSyncLoop(): void {
    if (this.syncLoopInterval) {
      this.logger.warn('Sync loop already running');
      return;
    }

    this.status.syncLoopRunning = true;
    this.logger.info(`Starting order sync loop (interval: ${this.config.syncInterval}ms)`);

    // Initial sync
    this.processPendingOrders();

    // Set up interval
    this.syncLoopInterval = setInterval(() => {
      this.processPendingOrders();
    }, this.config.syncInterval);
  }

  /**
   * Stop the sync loop
   */
  stopSyncLoop(): void {
    if (this.syncLoopInterval) {
      clearInterval(this.syncLoopInterval);
      this.syncLoopInterval = null;
      this.status.syncLoopRunning = false;
      this.logger.info('Order sync loop stopped');
    }
  }

  /**
   * Process pending orders in the queue
   */
  private async processPendingOrders(): Promise<void> {
    if (this.pendingOrders.size === 0) {
      return;
    }

    this.logger.info(`Processing ${this.pendingOrders.size} pending orders`);

    for (const [orderId, { order, retryCount }] of this.pendingOrders) {
      try {
        if ('sourceWarehouseId' in order) {
          // Distribution order
          await this.syncToOrderTwin(order);
        } else {
          // Procurement order
          await this.syncToOrderTwin(order);
        }

        // Remove from pending on success
        this.pendingOrders.delete(orderId);
        this.status.syncedOrders++;
      } catch (error) {
        if (retryCount >= this.config.maxRetries) {
          this.logger.error(`Order ${orderId} failed after ${retryCount} retries, removing from queue`);
          this.pendingOrders.delete(orderId);
          this.status.failedOrders++;
        } else {
          // Update retry count
          this.pendingOrders.set(orderId, { order, retryCount: retryCount + 1 });
        }
      }
    }

    this.status.lastSyncAt = new Date();
  }

  /**
   * Add order to pending sync queue
   */
  addToPendingQueue(order: ProcurementOrder | DistributionOrder): void {
    const orderId = order.id;
    this.pendingOrders.set(orderId, { order, retryCount: 0 });
    this.status.pendingOrders++;
    this.logger.debug(`Added order ${orderId} to pending sync queue`);
  }

  /**
   * Sync procurement order to Order Twin
   */
  async syncToOrderTwin(order: ProcurementOrder | DistributionOrder): Promise<OrderSyncResult> {
    const syncId = `order-${order.id}`;
    const orderType = 'sourceWarehouseId' in order ? 'distribution' : 'procurement';
    let syncRecord = this.syncRecords.get(syncId) || createSyncRecord(
      orderType === 'procurement' ? 'procurement' : 'distribution',
      order.id,
      'order'
    );

    try {
      const payload = this.transformOrderForTwin(order, orderType);

      const response = await this.orderTwinClient.post('/api/orders', payload);

      syncRecord.twinId = response.data.id;
      syncRecord.status = 'synced';
      syncRecord.lastSyncAt = new Date();
      syncRecord.payload = payload;

      this.syncRecords.set(syncId, syncRecord);
      this.status.syncedOrders++;

      this.logger.info(`Synced ${orderType} order ${order.id} to Order Twin: ${syncRecord.twinId}`);

      return {
        success: true,
        twinOrderId: syncRecord.twinId,
        orderType: orderType as 'procurement' | 'distribution'
      };
    } catch (error) {
      syncRecord.status = 'failed';
      syncRecord.retryCount++;
      syncRecord.error = error instanceof Error ? error.message : 'Unknown error';
      this.syncRecords.set(syncId, syncRecord);

      // Add to pending queue for retry
      this.addToPendingQueue(order);

      this.logger.error(`Failed to sync ${orderType} order ${order.id} to Order Twin:`, error);

      return {
        success: false,
        orderType: orderType as 'procurement' | 'distribution',
        error: syncRecord.error
      };
    }
  }

  /**
   * Sync order status update to Order Twin
   */
  async syncOrderStatus(
    orderId: string,
    status: string,
    twinOrderId?: string
  ): Promise<OrderSyncResult> {
    const syncId = `order-${orderId}`;

    if (!twinOrderId) {
      const record = this.syncRecords.get(syncId);
      if (!record || !record.twinId) {
        return {
          success: false,
          orderType: 'procurement',
          error: 'Twin order ID not found. Please sync the order first.'
        };
      }
      twinOrderId = record.twinId;
    }

    try {
      await this.orderTwinClient.patch(`/api/orders/${twinOrderId}`, {
        status,
        lastUpdatedBy: 'nexha-integration',
        lastUpdatedAt: new Date()
      });

      this.logger.info(`Synced order status update: ${orderId} -> ${status}`);

      return {
        success: true,
        twinOrderId,
        orderType: 'procurement'
      };
    } catch (error) {
      this.logger.error(`Failed to sync order status for ${orderId}:`, error);
      return {
        success: false,
        orderType: 'procurement',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get order sync status
   */
  getSyncStatus(orderId: string): TwinSyncRecord | null {
    const syncId = `order-${orderId}`;
    return this.syncRecords.get(syncId) || null;
  }

  /**
   * Get all sync records
   */
  getAllSyncRecords(): TwinSyncRecord[] {
    return Array.from(this.syncRecords.values());
  }

  /**
   * Get failed orders for manual review
   */
  getFailedOrders(): TwinSyncRecord[] {
    return Array.from(this.syncRecords.values())
      .filter(record => record.status === 'failed');
  }

  /**
   * Get service status
   */
  getStatus(): OrderSyncStatus {
    return {
      ...this.status,
      pendingOrders: this.pendingOrders.size
    };
  }

  /**
   * Transform order data for Order Twin format
   */
  private transformOrderForTwin(
    order: ProcurementOrder | DistributionOrder,
    orderType: 'procurement' | 'distribution'
  ): Record<string, unknown> {
    const baseOrder = {
      externalId: order.id,
      externalOrderNumber: order.orderNumber,
      type: orderType === 'procurement' ? 'procurement' : 'distribution',
      status: this.mapOrderStatus(order.status),
      items: 'lineItems' in order ? order.lineItems : order.items,
      totalAmount: order.totalAmount,
      currency: order.currency,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      source: 'nexha-integration',
      metadata: {
        ...order.metadata,
        lastSyncedAt: new Date(),
        syncService: 'nexha-integration'
      }
    };

    if (orderType === 'procurement') {
      const procurementOrder = order as ProcurementOrder;
      return {
        ...baseOrder,
        supplierId: procurementOrder.supplierId,
        supplierName: procurementOrder.supplierName,
        shippingAddress: procurementOrder.shippingAddress,
        expectedDeliveryDate: procurementOrder.expectedDeliveryDate,
        actualDeliveryDate: procurementOrder.actualDeliveryDate,
        approvedBy: procurementOrder.approvedBy,
        approvedAt: procurementOrder.approvedAt
      };
    } else {
      const distributionOrder = order as DistributionOrder;
      return {
        ...baseOrder,
        sourceWarehouseId: distributionOrder.sourceWarehouseId,
        destinationAddress: distributionOrder.destinationAddress,
        channel: distributionOrder.channel,
        trackingNumber: distributionOrder.trackingNumber,
        carrier: distributionOrder.carrier
      };
    }
  }

  /**
   * Map Nexha order status to standard Order Twin status
   */
  private mapOrderStatus(nexhaStatus: string): string {
    const statusMap: Record<string, string> = {
      // Procurement statuses
      draft: 'draft',
      pending: 'pending',
      approved: 'confirmed',
      confirmed: 'confirmed',
      shipped: 'shipped',
      delivered: 'delivered',
      cancelled: 'cancelled',

      // Distribution statuses
      processing: 'processing',
      packed: 'processing',
      in_transit: 'in_transit',
      failed: 'failed'
    };

    return statusMap[nexhaStatus] || nexhaStatus;
  }

  /**
   * Force immediate sync of all pending orders
   */
  async forceSyncAll(): Promise<{ synced: number; failed: number }> {
    this.logger.info('Forcing immediate sync of all pending orders');

    const pending = Array.from(this.pendingOrders.entries());
    let synced = 0;
    let failed = 0;

    for (const [orderId, { order }] of pending) {
      const result = await this.syncToOrderTwin(order);
      if (result.success) {
        synced++;
        this.pendingOrders.delete(orderId);
      } else {
        failed++;
      }
    }

    this.logger.info(`Force sync complete: ${synced} synced, ${failed} failed`);

    return { synced, failed };
  }

  /**
   * Clear sync records
   */
  clearSyncRecords(): void {
    this.syncRecords.clear();
    this.pendingOrders.clear();
    this.status = {
      lastSyncAt: null,
      syncedOrders: 0,
      failedOrders: 0,
      pendingOrders: 0,
      syncLoopRunning: this.syncLoopInterval !== null
    };
    this.logger.info('Cleared all sync records');
  }
}

export default OrderSync;
