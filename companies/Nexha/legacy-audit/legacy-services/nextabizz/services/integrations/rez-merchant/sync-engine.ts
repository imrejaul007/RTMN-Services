/**
 * REZ Merchant Sync Engine
 *
 * Handles synchronization of data between REZ Merchant and NEXABIZZ
 * Supports inventory, orders, maintenance, and RFQ generation
 */

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  RezMerchantConnection,
  InventoryItem,
  RezOrder,
  MaintenanceRequest,
  SyncResult,
  SyncOptions,
  BulkSupplyRFQRequest,
  GenerateRFQRequest,
} from './types';
import { createRezMerchantClient, mapInventoryItemToNexabizz, mapOrderToNexabizz, mapMaintenanceRequestToServiceRequest } from './client';

// ============================================================================
// Sync Engine
// ============================================================================

export interface SyncEngineConfig {
  supabase: SupabaseClient;
  connection: RezMerchantConnection;
}

export interface SyncProgress {
  phase: 'inventory' | 'orders' | 'maintenance' | 'rfq';
  current: number;
  total: number;
  message: string;
}

type ProgressCallback = (progress: SyncProgress) => void;

/**
 * REZ Merchant Sync Engine
 */
export class RezMerchantSyncEngine {
  private supabase: SupabaseClient;
  private connection: RezMerchantConnection;
  private client = createRezMerchantClient(this.connection);
  private progressCallback?: ProgressCallback;

  constructor(config: SyncEngineConfig) {
    this.supabase = config.supabase;
    this.connection = config.connection;
    this.client = createRezMerchantClient(config.connection);
  }

  /**
   * Set progress callback for sync progress updates
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  private reportProgress(phase: SyncProgress['phase'], current: number, total: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback({ phase, current, total, message });
    }
  }

  // ===========================================================================
  // Inventory Sync
  // ===========================================================================

  /**
   * Sync inventory from REZ Merchant
   */
  async syncInventory(options?: { since?: Date; limit?: number }): Promise<{
    synced: number;
    lowStock: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;
    let lowStock = 0;
    const limit = options?.limit || 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      this.reportProgress('inventory', offset, -1, `Syncing inventory items starting at ${offset}...`);

      const result = await this.client.getInventory({
        since: options?.since,
        limit,
        offset,
      });

      if (!result.success || !result.data) {
        errors.push(`Failed to fetch inventory at offset ${offset}: ${result.error}`);
        break;
      }

      const { items, hasMore: more } = result.data;
      hasMore = more;

      for (const item of items) {
        try {
          // Check if item already exists
          const { data: existing } = await this.supabase
            .from('inventory_signals')
            .select('id, current_stock')
            .eq('source_product_id', item.productId)
            .eq('source', 'rez-merchant')
            .eq('merchant_id', this.connection.merchantId)
            .single();

          const signalData = mapInventoryItemToNexabizz(item, this.connection.id, this.connection.merchantId);

          // Determine severity
          let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
          if (item.currentStock === 0) {
            severity = 'critical';
            lowStock++;
          } else if (item.currentStock <= item.reorderLevel) {
            severity = 'high';
            lowStock++;
          }

          if (existing) {
            // Update existing signal
            const { error } = await this.supabase
              .from('inventory_signals')
              .update({
                current_stock: item.currentStock,
                threshold: item.reorderLevel,
                severity,
                signal_type: item.currentStock === 0 ? 'out_of_stock' : 'low_stock',
                metadata: {
                  ...signalData.metadata,
                  previous_stock: existing.current_stock,
                  updated_at: new Date().toISOString(),
                },
              })
              .eq('id', existing.id);

            if (error) {
              errors.push(`Failed to update inventory ${item.productId}: ${error.message}`);
            }
          } else {
            // Insert new signal
            const { error } = await this.supabase
              .from('inventory_signals')
              .insert({
                merchant_id: this.connection.merchantId,
                source: 'rez-merchant',
                source_merchant_id: item.storeId,
                source_product_id: item.productId,
                product_name: item.name,
                sku: item.sku,
                current_stock: item.currentStock,
                threshold: item.reorderLevel,
                unit: item.unit,
                category: item.category,
                severity,
                signal_type: item.currentStock === 0 ? 'out_of_stock' : 'low_stock',
                metadata: signalData.metadata,
              });

            if (error) {
              errors.push(`Failed to insert inventory ${item.productId}: ${error.message}`);
            }
          }

          synced++;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Error syncing inventory ${item.productId}: ${message}`);
        }
      }

      offset += limit;
    }

    return { synced, lowStock, errors };
  }

  // ===========================================================================
  // Order Sync
  // ===========================================================================

  /**
   * Sync orders from REZ Merchant
   */
  async syncOrders(options?: { since?: Date; limit?: number }): Promise<{
    synced: number;
    createdRFQs: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;
    let createdRFQs = 0;
    const limit = options?.limit || 50;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      this.reportProgress('orders', offset, -1, `Syncing orders starting at ${offset}...`);

      const result = await this.client.getOrders({
        since: options?.since,
        limit,
        offset,
      });

      if (!result.success || !result.data) {
        errors.push(`Failed to fetch orders at offset ${offset}: ${result.error}`);
        break;
      }

      const { orders, hasMore: more } = result.data;
      hasMore = more;

      for (const order of orders) {
        try {
          // Check if order already exists
          const { data: existing } = await this.supabase
            .from('order_sync_records')
            .select('id')
            .eq('source_order_id', order.id)
            .eq('connection_id', this.connection.id)
            .single();

          if (existing) {
            // Update existing order sync record
            const { error } = await this.supabase
              .from('order_sync_records')
              .update({
                status: order.status,
                total: order.total,
                item_count: order.items.length,
                metadata: {
                  updated_at: new Date().toISOString(),
                },
              })
              .eq('id', existing.id);

            if (error) {
              errors.push(`Failed to update order ${order.id}: ${error.message}`);
            }
          } else {
            // Insert new order sync record
            const { error } = await this.supabase
              .from('order_sync_records')
              .insert({
                connection_id: this.connection.id,
                merchant_id: this.connection.merchantId,
                source_order_id: order.id,
                source_order_number: order.orderNumber,
                status: order.status,
                total: order.total,
                item_count: order.items.length,
                customer_name: order.customerName,
                metadata: order.metadata,
                synced_at: new Date().toISOString(),
              });

            if (error) {
              errors.push(`Failed to insert order ${order.id}: ${error.message}`);
            }
          }

          synced++;

          // Check for low stock items and create RFQ if needed
          if (order.status === 'confirmed' || order.status === 'processing') {
            const rfqResult = await this.checkAndCreateRFQForOrder(order);
            if (rfqResult.created) {
              createdRFQs++;
            }
            errors.push(...rfqResult.errors);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Error syncing order ${order.id}: ${message}`);
        }
      }

      offset += limit;
    }

    return { synced, createdRFQs, errors };
  }

  /**
   * Check order for low stock items and create RFQ if needed
   */
  private async checkAndCreateRFQForOrder(order: RezOrder): Promise<{
    created: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Get inventory for order items
      const lowStockItems = await this.client.getLowStockItems();

      if (!lowStockItems.success || !lowStockItems.data) {
        return { created: false, errors: [] };
      }

      // Find matching low stock items in order
      const matchingItems = order.items.filter((item) =>
        lowStockItems.data!.some((lowStock) => lowStock.productId === item.productId)
      );

      if (matchingItems.length === 0) {
        return { created: false, errors: [] };
      }

      // Create RFQ for low stock items
      const rfqRequest: GenerateRFQRequest = {
        merchantId: this.connection.merchantId,
        connectionId: this.connection.id,
        title: `Bulk Supply RFQ - Order ${order.orderNumber}`,
        description: `Auto-generated RFQ for order ${order.orderNumber} with low stock items`,
        category: 'bulk_supplies',
        items: matchingItems.map((item) => ({
          productName: item.name,
          sku: item.sku,
          quantity: item.quantity * 2, // Order double the amount
          unit: 'units',
          targetPrice: item.unitPrice * 0.9, // Target 10% discount
        })),
        priority: 'high',
        deliveryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        notes: `Generated from REZ Merchant order ${order.orderNumber}`,
      };

      const rfqResult = await this.createBulkSupplyRFQ(rfqRequest);
      if (rfqResult.success) {
        return { created: true, errors: [] };
      } else {
        errors.push(rfqResult.message);
        return { created: false, errors };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Error checking order for RFQ: ${message}`);
      return { created: false, errors };
    }
  }

  // ===========================================================================
  // Maintenance Sync
  // ===========================================================================

  /**
   * Sync maintenance requests from REZ Merchant
   */
  async syncMaintenance(options?: { since?: Date; limit?: number }): Promise<{
    synced: number;
    createdRFQs: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;
    let createdRFQs = 0;
    const limit = options?.limit || 50;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      this.reportProgress('maintenance', offset, -1, `Syncing maintenance requests starting at ${offset}...`);

      const result = await this.client.getMaintenanceRequests({
        since: options?.since,
        limit,
        offset,
      });

      if (!result.success || !result.data) {
        errors.push(`Failed to fetch maintenance requests at offset ${offset}: ${result.error}`);
        break;
      }

      const { requests, hasMore: more } = result.data;
      hasMore = more;

      for (const request of requests) {
        try {
          // Check if maintenance request already exists
          const { data: existing } = await this.supabase
            .from('maintenance_sync_records')
            .select('id')
            .eq('source_request_id', request.id)
            .eq('connection_id', this.connection.id)
            .single();

          if (existing) {
            // Update existing record
            const { error } = await this.supabase
              .from('maintenance_sync_records')
              .update({
                status: request.status,
                estimated_cost: request.estimatedCost,
                actual_cost: request.actualCost,
                vendor_id: request.vendorId,
                metadata: {
                  ...request.metadata,
                  updated_at: new Date().toISOString(),
                },
              })
              .eq('id', existing.id);

            if (error) {
              errors.push(`Failed to update maintenance ${request.id}: ${error.message}`);
            }
          } else {
            // Insert new record
            const { error } = await this.supabase
              .from('maintenance_sync_records')
              .insert({
                connection_id: this.connection.id,
                merchant_id: this.connection.merchantId,
                source_request_id: request.id,
                title: request.title,
                description: request.description,
                category: request.category,
                priority: request.priority,
                status: request.status,
                estimated_cost: request.estimatedCost,
                actual_cost: request.actualCost,
                location: request.location,
                room_number: request.roomNumber,
                reported_at: request.reportedAt.toISOString(),
                scheduled_date: request.scheduledDate?.toISOString(),
                completed_at: request.completedAt?.toISOString(),
                vendor_id: request.vendorId,
                metadata: request.metadata,
                synced_at: new Date().toISOString(),
              });

            if (error) {
              errors.push(`Failed to insert maintenance ${request.id}: ${error.message}`);
            }
          }

          synced++;

          // Create RFQ for high priority maintenance requests
          if (request.priority === 'urgent' || request.priority === 'high') {
            if (request.status === 'pending' || request.status === 'in_progress') {
              const rfqResult = await this.createMaintenanceRFQ(request);
              if (rfqResult.created) {
                createdRFQs++;
              }
              errors.push(...rfqResult.errors);
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Error syncing maintenance ${request.id}: ${message}`);
        }
      }

      offset += limit;
    }

    return { synced, createdRFQs, errors };
  }

  /**
   * Create RFQ for maintenance request
   */
  private async createMaintenanceRFQ(request: MaintenanceRequest): Promise<{
    created: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Check if RFQ already exists for this maintenance request
      const { data: existingRFQ } = await this.supabase
        .from('rfqs')
        .select('id')
        .eq('merchant_id', this.connection.merchantId)
        .eq('metadata->>maintenance_request_id', request.id)
        .single();

      if (existingRFQ) {
        return { created: false, errors: [] };
      }

      const rfqRequest: GenerateRFQRequest = {
        merchantId: this.connection.merchantId,
        connectionId: this.connection.id,
        title: `Maintenance Service RFQ - ${request.title}`,
        description: request.description,
        category: request.category || 'maintenance',
        items: [
          {
            productName: request.title,
            quantity: 1,
            unit: 'service',
            targetPrice: request.estimatedCost,
          },
        ],
        priority: request.priority,
        deliveryDeadline: request.scheduledDate,
        notes: `Generated from REZ Merchant maintenance request ${request.id}`,
      };

      const rfqResult = await this.createBulkSupplyRFQ(rfqRequest);
      if (!rfqResult.success) {
        errors.push(rfqResult.message);
      }

      return { created: rfqResult.success, errors };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Error creating maintenance RFQ: ${message}`);
      return { created: false, errors };
    }
  }

  // ===========================================================================
  // RFQ Generation
  // ===========================================================================

  /**
   * Generate RFQ for bulk supplies
   */
  async createBulkSupplyRFQ(request: GenerateRFQRequest): Promise<{
    success: boolean;
    rfqId?: string;
    rfqNumber?: string;
    message: string;
  }> {
    try {
      // Validate items
      if (!request.items || request.items.length === 0) {
        return { success: false, message: 'At least one item is required for RFQ' };
      }

      // Generate RFQ number
      const rfqNumber = `RFQ-${Date.now()}-${randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase()}`;

      // Calculate total estimated value
      const estimatedValue = request.items.reduce((sum, item) => {
        return sum + (item.targetPrice || 0) * item.quantity;
      }, 0);

      // Insert RFQ into database
      const { data: rfq, error: rfqError } = await this.supabase
        .from('rfqs')
        .insert({
          merchant_id: request.merchantId,
          rfq_number: rfqNumber,
          title: request.title,
          description: request.description,
          category: request.category,
          quantity: request.items.reduce((sum, item) => sum + item.quantity, 0),
          unit: 'various',
          target_price: estimatedValue,
          delivery_deadline: request.deliveryDeadline?.toISOString(),
          status: 'open',
          metadata: {
            source: 'rez-merchant',
            connection_id: request.connectionId,
            items: request.items,
            priority: request.priority,
            notes: request.notes,
          },
        })
        .select('id')
        .single();

      if (rfqError) {
        return { success: false, message: `Database error: ${rfqError.message}` };
      }

      // Insert RFQ items
      const rfqItems = request.items.map((item) => ({
        rfq_id: rfq.id,
        product_name: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unit: item.unit,
        target_price: item.targetPrice,
      }));

      const { error: itemsError } = await this.supabase
        .from('rfq_items')
        .insert(rfqItems);

      if (itemsError) {
        // Rollback RFQ creation
        await this.supabase.from('rfqs').delete().eq('id', rfq.id);
        return { success: false, message: `Failed to insert RFQ items: ${itemsError.message}` };
      }

      // Log sync record
      await this.supabase.from('events').insert({
        type: 'rfq.created',
        source: 'rez-merchant',
        payload: {
          rfqId: rfq.id,
          rfqNumber,
          merchantId: request.merchantId,
          connectionId: request.connectionId,
          itemCount: request.items.length,
          priority: request.priority,
        },
      });

      this.reportProgress('rfq', 1, 1, `Created RFQ ${rfqNumber}`);

      return {
        success: true,
        rfqId: rfq.id,
        rfqNumber,
        message: 'RFQ created successfully',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, message: `Failed to create RFQ: ${message}` };
    }
  }

  // ===========================================================================
  // Full Sync
  // ===========================================================================

  /**
   * Perform full sync of all data from REZ Merchant
   */
  async fullSync(options?: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let syncedInventory = 0;
    let syncedOrders = 0;
    let createdRFQs = 0;

    try {
      // Update connection status
      await this.supabase
        .from('rez_merchant_connections')
        .update({ status: 'syncing' })
        .eq('id', this.connection.id);

      // Determine sync scope
      const since = options?.since || this.connection.lastSyncAt;
      const syncInventory = options?.syncInventory !== false;
      const syncOrders = options?.syncOrders !== false;
      const syncMaintenance = options?.syncMaintenance !== false;

      // Sync inventory
      if (syncInventory) {
        const inventoryResult = await this.syncInventory({ since });
        syncedInventory = inventoryResult.synced;
        errors.push(...inventoryResult.errors);
      }

      // Sync orders
      if (syncOrders) {
        const ordersResult = await this.syncOrders({ since });
        syncedOrders = ordersResult.synced;
        createdRFQs += ordersResult.createdRFQs;
        errors.push(...ordersResult.errors);
      }

      // Sync maintenance
      if (syncMaintenance) {
        const maintenanceResult = await this.syncMaintenance({ since });
        syncedOrders += maintenanceResult.synced; // Maintenance counts as synced items
        createdRFQs += maintenanceResult.createdRFQs;
        errors.push(...maintenanceResult.errors);
      }

      // Update connection status
      await this.supabase
        .from('rez_merchant_connections')
        .update({
          status: 'connected',
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', this.connection.id);

      return {
        success: errors.length === 0,
        connectionId: this.connection.id,
        syncedInventory,
        syncedOrders,
        createdRFQs,
        errors,
        syncedAt: new Date(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(message);

      // Update connection status with error
      await this.supabase
        .from('rez_merchant_connections')
        .update({
          status: 'error',
          last_error: message,
        })
        .eq('id', this.connection.id);

      return {
        success: false,
        connectionId: this.connection.id,
        syncedInventory,
        syncedOrders,
        createdRFQs,
        errors,
        syncedAt: new Date(),
      };
    }
  }
}

// ============================================================================
// Sync Engine Factory
// ============================================================================

/**
 * Create sync engine from connection
 */
export function createSyncEngine(
  supabase: SupabaseClient,
  connection: RezMerchantConnection
): RezMerchantSyncEngine {
  return new RezMerchantSyncEngine({ supabase, connection });
}

/**
 * Create sync engine from connection ID
 */
export async function createSyncEngineFromConnectionId(
  supabase: SupabaseClient,
  connectionId: string
): Promise<RezMerchantSyncEngine | null> {
  const { data, error } = await supabase
    .from('rez_merchant_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (error || !data) {
    return null;
  }

  const connection: RezMerchantConnection = {
    id: data.id,
    merchantId: data.merchant_id,
    rezMerchantStoreId: data.rez_merchant_store_id,
    storeName: data.store_name,
    apiKey: data.api_key,
    apiSecret: data.api_secret,
    webhookUrl: data.webhook_url,
    webhookSecret: data.webhook_secret,
    status: data.status,
    lastSyncAt: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
    lastError: data.last_error,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };

  return createSyncEngine(supabase, connection);
}
