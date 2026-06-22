import { logger } from '../../shared/logger';
/**
 * RestoPapa Sync Engine
 *
 * Handles bidirectional synchronization between RestoPapa and ReZ:
 * - Fetch low stock items and create RFQs
 * - Sync order statuses
 * - Import maintenance requests
 * - Track sync history
 */

import { createClient } from '@supabase/supabase-js';
import { RestoPapaClient } from './client';
import type {
  RestoPapaConnection,
  RestoPapaLowStockItem,
  RestoPapaOrder,
  RestoPapaMaintenanceRequest,
  RestoPapaRFQAutoCreateOptions,
  RestoPapaSyncStatus,
  RestoPapaSyncStats,
} from './types';
import type {
  CreateInventorySignalInput,
  CreateRFQInput,
  SignalSeverity,
  SignalType,
  ProductSource,
} from '@nextabizz/shared-types';

// ============================================
// Sync Engine Configuration
// ============================================

/**
 * Sync engine options
 */
export interface SyncEngineOptions {
  /** Supabase connection URL */
  supabaseUrl: string;
  /** Supabase service role key */
  supabaseServiceKey: string;
  /** Low stock threshold multiplier (default: 1.0 = use RestoPapa threshold) */
  lowStockThresholdMultiplier?: number;
  /** Auto-create RFQs for low stock items (default: true) */
  autoCreateRFQs?: boolean;
  /** RFQ expiry days (default: 7) */
  rfqExpiryDays?: number;
}

// ============================================
// Sync Engine Class
// ============================================

/**
 * Sync engine for RestoPapa integration
 */
export class RestoPapaSyncEngine {
  private supabase: ReturnType<typeof createClient>;
  private options: Required<SyncEngineOptions>;

  constructor(connection: RestoPapaConnection, options: SyncEngineOptions) {
    this.supabase = createClient(options.supabaseUrl, options.supabaseServiceKey);
    this.options = {
      supabaseUrl: options.supabaseUrl,
      supabaseServiceKey: options.supabaseServiceKey,
      lowStockThresholdMultiplier: options.lowStockThresholdMultiplier ?? 1.0,
      autoCreateRFQs: options.autoCreateRFQs ?? true,
      rfqExpiryDays: options.rfqExpiryDays ?? 7,
    };

    // Attach client to connection for convenience
    (connection as RestoPapaConnection & { client?: RestoPapaClient }).client =
      new RestoPapaClient({
        baseUrl: 'https://api.restopapa.com/v1',
        apiKey: connection.apiKey,
        webhookSecret: connection.webhookSecret,
      });
  }

  // ============================================
  // Sync Status Management
  // ============================================

  /**
   * Create a new sync status record
   */
  async createSyncStatus(connectionId: string, syncType: 'full' | 'incremental'): Promise<string> {
    const { data, error } = await this.supabase
      .from('restopapa_sync_status')
      .insert({
        id: crypto.randomUUID(),
        connection_id: connectionId,
        sync_type: syncType,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        items_processed: 0,
        items_created: 0,
        items_updated: 0,
        items_failed: 0,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create sync status: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(
    syncId: string,
    updates: Partial<{
      status: 'pending' | 'in_progress' | 'completed' | 'failed';
      itemsProcessed: number;
      itemsCreated: number;
      itemsUpdated: number;
      itemsFailed: number;
      errors: Array<{ itemId: string; itemType: string; error: string }>;
    }>
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (updates.status) {
      updateData.status = updates.status;
      if (updates.status === 'completed' || updates.status === 'failed') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (updates.itemsProcessed !== undefined) updateData.items_processed = updates.itemsProcessed;
    if (updates.itemsCreated !== undefined) updateData.items_created = updates.itemsCreated;
    if (updates.itemsUpdated !== undefined) updateData.items_updated = updates.itemsUpdated;
    if (updates.itemsFailed !== undefined) updateData.items_failed = updates.itemsFailed;
    if (updates.errors) {
      updateData.errors = updates.errors;
    }

    await this.supabase
      .from('restopapa_sync_status')
      .update(updateData)
      .eq('id', syncId);
  }

  // ============================================
  // Inventory Sync
  // ============================================

  /**
   * Fetch and sync low stock items from RestoPapa
   */
  async syncLowStock(connection: RestoPapaConnection): Promise<{
    lowStockItems: RestoPapaLowStockItem[];
    signalsCreated: number;
    rfqsCreated: number;
  }> {
    const client = new RestoPapaClient({
      baseUrl: 'https://api.restopapa.com/v1',
      apiKey: connection.apiKey,
      webhookSecret: connection.webhookSecret,
    });

    // Fetch all low stock items
    const allLowStockItems: RestoPapaLowStockItem[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const response = await client.getLowStockItems({ page, limit });
      if (!response.success || !response.data) {
        throw new Error(`Failed to fetch low stock items: ${response.error?.message}`);
      }

      allLowStockItems.push(...response.data.data.items);
      const { totalPages } = response.data.data.pagination;

      if (page >= totalPages) break;
      page++;
    }

    // Process each low stock item
    let signalsCreated = 0;
    let rfqsCreated = 0;

    for (const item of allLowStockItems) {
      try {
        // Create inventory signal
        const signalId = await this.createInventorySignal(connection.merchantId, item);
        signalsCreated++;

        // Auto-create RFQ if configured
        if (this.options.autoCreateRFQs && item.severity !== 'out_of_stock') {
          await this.createRFQFromLowStock(connection.merchantId, item);
          rfqsCreated++;
        }
      } catch (error) {
        logger.error(`Failed to process low stock item ${item.productId}:`, error);
      }
    }

    // Update connection last sync time
    await this.supabase
      .from('restopapa_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);

    return {
      lowStockItems: allLowStockItems,
      signalsCreated,
      rfqsCreated,
    };
  }

  /**
   * Create an inventory signal from low stock item
   */
  private async createInventorySignal(
    merchantId: string,
    item: RestoPapaLowStockItem
  ): Promise<string> {
    // Determine severity
    let severity: SignalSeverity;
    let signalType: SignalType;

    if (item.severity === 'out_of_stock' || item.currentStock === 0) {
      severity = 'critical';
      signalType = 'out_of_stock';
    } else if (item.severity === 'critical') {
      severity = 'high';
      signalType = 'low_stock';
    } else {
      severity = 'medium';
      signalType = 'low_stock';
    }

    const input: CreateInventorySignalInput = {
      merchantId,
      source: 'restopapa' as ProductSource,
      sourceProductId: item.productId,
      sourceMerchantId: merchantId,
      productName: item.productName,
      sku: item.sku,
      currentStock: item.currentStock,
      threshold: item.minStock,
      unit: item.unit,
      category: item.category,
      severity,
      signalType,
    };

    const { data, error } = await this.supabase
      .from('inventory_signals')
      .insert({
        id: crypto.randomUUID(),
        merchant_id: input.merchantId,
        source: input.source,
        source_product_id: input.sourceProductId,
        source_merchant_id: input.sourceMerchantId,
        product_name: input.productName,
        sku: input.sku,
        current_stock: input.currentStock,
        threshold: input.threshold,
        unit: input.unit,
        category: input.category,
        severity: input.severity,
        signal_type: input.signalType,
      })
      .select('id')
      .single();

    if (error) {
      // Check for duplicate - update instead
      if (error.code === '23505') {
        const { data: existing } = await this.supabase
          .from('inventory_signals')
          .select('id')
          .eq('merchant_id', merchantId)
          .eq('source_product_id', item.productId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existing) {
          await this.supabase
            .from('inventory_signals')
            .update({
              current_stock: item.currentStock,
              severity: input.severity,
              signal_type: input.signalType,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          return existing.id;
        }
      }
      throw new Error(`Failed to create inventory signal: ${error.message}`);
    }

    return data.id;
  }

  // ============================================
  // RFQ Auto-Creation
  // ============================================

  /**
   * Create an RFQ from a low stock item
   */
  async createRFQFromLowStock(
    merchantId: string,
    item: RestoPapaLowStockItem,
    options?: Partial<RestoPapaRFQAutoCreateOptions>
  ): Promise<string> {
    // Check if RFQ already exists for this item (within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: existingRFQ } = await this.supabase
      .from('rfqs')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('status', 'open')
      .gte('created_at', sevenDaysAgo.toISOString())
      .limit(1)
      .single();

    if (existingRFQ) {
      return existingRFQ.id;
    }

    // Calculate suggested quantity (bring stock to max or 2x min stock)
    const suggestedQty = item.suggestedReorderQty || item.minStock * 2;

    // Generate RFQ number
    const rfqNumber = `RFQ-RP-${Date.now().toString(36).toUpperCase()}`;

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.options.rfqExpiryDays);

    // Calculate delivery deadline (7 days from now)
    const deliveryDeadline = new Date();
    deliveryDeadline.setDate(deliveryDeadline.getDate() + 7);

    const rfqInput: CreateRFQInput = {
      merchantId,
      title: `Supply Request: ${item.productName}`,
      description: options?.notes || `Auto-generated from RestoPapa low stock alert. Product: ${item.productName}${item.sku ? ` (SKU: ${item.sku})` : ''}. Current stock: ${item.currentStock} ${item.unit}. Reorder quantity: ${suggestedQty} ${item.unit}.`,
      category: item.category,
      quantity: suggestedQty,
      unit: item.unit,
      targetPrice: options?.targetPrice,
      deliveryDeadline,
      expiresAt,
    };

    const { data, error } = await this.supabase
      .from('rfqs')
      .insert({
        id: crypto.randomUUID(),
        rfq_number: rfqNumber,
        merchant_id: rfqInput.merchantId,
        title: rfqInput.title,
        description: rfqInput.description,
        category: rfqInput.category,
        quantity: rfqInput.quantity,
        unit: rfqInput.unit,
        target_price: rfqInput.targetPrice,
        delivery_deadline: rfqInput.deliveryDeadline?.toISOString(),
        status: 'open',
        created_at: new Date().toISOString(),
        expires_at: rfqInput.expiresAt?.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create RFQ: ${error.message}`);
    }

    // Insert event record
    await this.supabase.from('events').insert({
      id: crypto.randomUUID(),
      merchant_id: merchantId,
      event_type: 'rfq_created_from_low_stock',
      source: 'restopapa_sync',
      payload: { item, rfqId: data.id },
    });

    return data.id;
  }

  // ============================================
  // Order Sync
  // ============================================

  /**
   * Sync orders from RestoPapa
   */
  async syncOrders(
    connection: RestoPapaConnection,
    params?: { fromDate?: Date; toDate?: Date }
  ): Promise<{
    orders: RestoPapaOrder[];
    ordersUpdated: number;
  }> {
    const client = new RestoPapaClient({
      baseUrl: 'https://api.restopapa.com/v1',
      apiKey: connection.apiKey,
      webhookSecret: connection.webhookSecret,
    });

    // Fetch orders
    const response = await client.getOrders({
      fromDate: params?.fromDate,
      toDate: params?.toDate,
    });

    if (!response.success || !response.data) {
      throw new Error(`Failed to fetch orders: ${response.error?.message}`);
    }

    const orders = response.data.data.items;
    let ordersUpdated = 0;

    // Process each order
    for (const order of orders) {
      try {
        await this.syncOrder(connection.merchantId, order);
        ordersUpdated++;
      } catch (error) {
        logger.error(`Failed to sync order ${order.id}:`, error);
      }
    }

    return { orders, ordersUpdated };
  }

  /**
   * Sync a single order
   */
  private async syncOrder(merchantId: string, order: RestoPapaOrder): Promise<void> {
    // Check if order exists
    const { data: existing } = await this.supabase
      .from('purchase_orders')
      .select('id')
      .eq('metadata', { resto_papa_order_id: order.id })
      .single();

    if (existing) {
      // Update existing order
      await this.supabase
        .from('purchase_orders')
        .update({
          status: mapOrderStatus(order.status),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }
    // Note: We don't create orders from RestoPapa, only track status updates
  }

  /**
   * Map RestoPapa order status to our status
   */
  private mapOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'draft',
      confirmed: 'confirmed',
      processing: 'processing',
      shipped: 'shipped',
      delivered: 'delivered',
      cancelled: 'cancelled',
    };
    return statusMap[status] || status;
  }

  // ============================================
  // Maintenance Sync
  // ============================================

  /**
   * Sync maintenance requests from RestoPapa
   */
  async syncMaintenanceRequests(
    connection: RestoPapaConnection,
    params?: { status?: string }
  ): Promise<{
    requests: RestoPapaMaintenanceRequest[];
    serviceOrdersCreated: number;
  }> {
    const client = new RestoPapaClient({
      baseUrl: 'https://api.restopapa.com/v1',
      apiKey: connection.apiKey,
      webhookSecret: connection.webhookSecret,
    });

    // Fetch maintenance requests
    const response = await client.getMaintenanceRequests({ status: params?.status });
    if (!response.success || !response.data) {
      throw new Error(`Failed to fetch maintenance requests: ${response.error?.message}`);
    }

    const requests = response.data.data.items;
    let serviceOrdersCreated = 0;

    // Process each request
    for (const request of requests) {
      try {
        const created = await this.syncMaintenanceRequest(connection, request);
        if (created) serviceOrdersCreated++;
      } catch (error) {
        logger.error(`Failed to sync maintenance request ${request.id}:`, error);
      }
    }

    return { requests, serviceOrdersCreated };
  }

  /**
   * Sync a single maintenance request
   */
  private async syncMaintenanceRequest(
    connection: RestoPapaConnection,
    request: RestoPapaMaintenanceRequest
  ): Promise<boolean> {
    // Check if service order already exists
    const { data: existing } = await this.supabase
      .from('service_orders')
      .select('id')
      .eq('merchant_id', connection.merchantId)
      .eq('metadata', { resto_papa_request_id: request.id })
      .single();

    if (existing) {
      // Update status if changed
      await this.supabase
        .from('service_orders')
        .update({
          status: mapMaintenanceStatus(request.status),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      return false;
    }

    // Create new service order
    const orderNumber = `SRV-RP-${Date.now().toString(36).toUpperCase()}`;

    await this.supabase.from('service_orders').insert({
      id: crypto.randomUUID(),
      order_number: orderNumber,
      merchant_id: connection.merchantId,
      merchant_name: connection.restoPapaMerchantId,
      status: mapMaintenanceStatus(request.status),
      priority: request.priority,
      title: request.title,
      description: request.description,
      metadata: { resto_papa_request_id: request.id },
      subtotal: request.estimatedCost || 0,
      tax: 0,
      discount: 0,
      total: request.estimatedCost || 0,
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Insert event record
    await this.supabase.from('events').insert({
      id: crypto.randomUUID(),
      merchant_id: connection.merchantId,
      event_type: 'service_order_created_from_maintenance',
      source: 'restopapa_sync',
      payload: { request },
    });

    return true;
  }

  /**
   * Map maintenance status
   */
  private mapMaintenanceStatus(status: string): string {
    const statusMap: Record<string, string> = {
      requested: 'pending',
      scheduled: 'confirmed',
      in_progress: 'in_progress',
      completed: 'completed',
      cancelled: 'cancelled',
    };
    return statusMap[status] || 'pending';
  }

  // ============================================
  // Full Sync
  // ============================================

  /**
   * Run a full sync of all data from RestoPapa
   */
  async runFullSync(connection: RestoPapaConnection): Promise<{
    syncId: string;
    lowStockResult: { lowStockItems: RestoPapaLowStockItem[]; signalsCreated: number; rfqsCreated: number };
    ordersResult: { orders: RestoPapaOrder[]; ordersUpdated: number };
    maintenanceResult: { requests: RestoPapaMaintenanceRequest[]; serviceOrdersCreated: number };
  }> {
    const syncId = await this.createSyncStatus(connection.id, 'full');

    try {
      // Sync low stock items
      const lowStockResult = await this.syncLowStock(connection);

      // Sync orders
      const ordersResult = await this.syncOrders(connection);

      // Sync maintenance requests
      const maintenanceResult = await this.syncMaintenanceRequests(connection);

      // Update sync status to completed
      await this.updateSyncStatus(syncId, {
        status: 'completed',
        itemsProcessed: lowStockResult.lowStockItems.length + ordersResult.orders.length + maintenanceResult.requests.length,
        itemsCreated: lowStockResult.signalsCreated + maintenanceResult.serviceOrdersCreated,
        itemsUpdated: ordersResult.ordersUpdated,
        itemsFailed: 0,
      });

      return {
        syncId,
        lowStockResult,
        ordersResult,
        maintenanceResult,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.updateSyncStatus(syncId, {
        status: 'failed',
        errors: [{ itemId: 'sync', itemType: 'sync', error: message }],
      });

      throw error;
    }
  }

  // ============================================
  // Sync Statistics
  // ============================================

  /**
   * Get sync statistics for a connection
   */
  async getSyncStats(connectionId: string): Promise<RestoPapaSyncStats> {
    const { data: syncs } = await this.supabase
      .from('restopapa_sync_status')
      .select('*')
      .eq('connection_id', connectionId)
      .order('started_at', { ascending: false })
      .limit(100);

    const { data: signals } = await this.supabase
      .from('inventory_signals')
      .select('id, source')
      .eq('source', 'restopapa')
      .limit(1000);

    const { data: rfqs } = await this.supabase
      .from('events')
      .select('id')
      .eq('event_type', 'rfq_created_from_low_stock')
      .eq('source', 'restopapa_sync')
      .limit(1000);

    const { data: orders } = await this.supabase
      .from('events')
      .select('id')
      .eq('event_type', 'order_status_changed')
      .eq('source', 'restopapa')
      .limit(1000);

    const successfulSyncs = syncs?.filter(s => s.status === 'completed').length || 0;
    const failedSyncs = syncs?.filter(s => s.status === 'failed').length || 0;
    const lastSuccessful = syncs?.find(s => s.status === 'completed');

    return {
      totalSyncs: syncs?.length || 0,
      successfulSyncs,
      failedSyncs,
      lastSuccessfulSync: lastSuccessful?.completed_at ? new Date(lastSuccessful.completed_at) : undefined,
      averageItemsPerSync: syncs?.length ? (syncs.reduce((acc, s) => acc + s.items_processed, 0) / syncs.length) : 0,
      inventorySignalsGenerated: signals?.length || 0,
      rfqsCreated: rfqs?.length || 0,
      ordersSynced: orders?.length || 0,
    };
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a sync engine instance
 */
export function createSyncEngine(
  connection: RestoPapaConnection,
  options: SyncEngineOptions
): RestoPapaSyncEngine {
  return new RestoPapaSyncEngine(connection, options);
}
