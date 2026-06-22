import logger from './utils/logger';

/**
 * RestoPapa Webhook Handler
 *
 * Handles incoming webhooks from RestoPapa for:
 * - Inventory signals (low stock, out of stock)
 * - Order status changes
 * - Maintenance requests
 * - Sync completion notifications
 */

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type {
  RestoPapaWebhookPayload,
  RestoPapaInventoryWebhookData,
  RestoPapaOrderWebhookData,
  RestoPapaMaintenanceWebhookData,
  RestoPapaConnection,
  RestoPapaLowStockItem,
} from './types';
import { verifyRestoPapaWebhook } from './client';
import {
  CreateInventorySignalInput,
  SignalSeverity,
  SignalType,
  ProductSource,
} from '@nextabizz/shared-types';

// ============================================
// Webhook Validation Schemas
// ============================================

/**
 * Schema for inventory webhook payload
 */
const InventoryWebhookSchema = z.object({
  event: z.enum(['inventory.low_stock', 'inventory.out_of_stock', 'inventory.stock_updated']),
  timestamp: z.string().datetime(),
  merchantId: z.string(),
  locationId: z.string().optional(),
  data: z.object({
    productId: z.string(),
    productName: z.string(),
    sku: z.string().optional(),
    category: z.string().optional(),
    previousStock: z.number().optional(),
    currentStock: z.number(),
    minStock: z.number().optional(),
    threshold: z.number().optional(),
    unit: z.string(),
  }),
  signature: z.string().optional(),
});

/**
 * Schema for order webhook payload
 */
const OrderWebhookSchema = z.object({
  event: z.enum(['order.status_changed', 'order.created']),
  timestamp: z.string().datetime(),
  merchantId: z.string(),
  locationId: z.string().optional(),
  data: z.object({
    orderId: z.string(),
    orderNumber: z.string(),
    previousStatus: z.string().optional(),
    newStatus: z.string(),
    updatedAt: z.string().datetime(),
  }),
  signature: z.string().optional(),
});

/**
 * Schema for maintenance webhook payload
 */
const MaintenanceWebhookSchema = z.object({
  event: z.enum(['maintenance.request_created', 'maintenance.status_changed']),
  timestamp: z.string().datetime(),
  merchantId: z.string(),
  locationId: z.string().optional(),
  data: z.object({
    requestId: z.string(),
    requestNumber: z.string(),
    previousStatus: z.string().optional(),
    newStatus: z.string(),
    title: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    scheduledDate: z.string().datetime().optional(),
  }),
  signature: z.string().optional(),
});

/**
 * Schema for sync webhook payload
 */
const SyncWebhookSchema = z.object({
  event: z.enum(['sync.completed']),
  timestamp: z.string().datetime(),
  merchantId: z.string(),
  locationId: z.string().optional(),
  data: z.object({
    syncId: z.string(),
    itemsProcessed: z.number(),
    lowStockCount: z.number(),
    outOfStockCount: z.number(),
    status: z.enum(['completed', 'failed']),
    errors: z.array(z.string()).optional(),
  }),
  signature: z.string().optional(),
});

/**
 * Union schema for all webhook payloads
 */
const RestoPapaWebhookSchema = z.discriminatedUnion('event', [
  InventoryWebhookSchema,
  OrderWebhookSchema,
  MaintenanceWebhookSchema,
  SyncWebhookSchema,
]);

// ============================================
// Handler Context
// ============================================

/**
 * Context for webhook handlers
 */
export interface WebhookHandlerContext {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

/**
 * Result of webhook handling
 */
export interface WebhookHandlerResult {
  success: boolean;
  action?: string;
  signalId?: string;
  eventId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

// ============================================
// Signal Severity Mapping
// ============================================

/**
 * Map RestoPapa severity to our internal severity
 */
function mapSeverity(severity: 'low' | 'critical' | 'out_of_stock'): SignalSeverity {
  switch (severity) {
    case 'out_of_stock':
      return 'critical';
    case 'critical':
      return 'high';
    default:
      return 'medium';
  }
}

/**
 * Map event type to signal type
 */
function mapSignalType(event: string): SignalType {
  switch (event) {
    case 'inventory.out_of_stock':
      return 'out_of_stock';
    case 'inventory.low_stock':
      return 'low_stock';
    case 'inventory.stock_updated':
      return 'movement';
    default:
      return 'low_stock';
  }
}

// ============================================
// Database Operations
// ============================================

/**
 * Insert an inventory signal into the database
 */
async function insertInventorySignal(
  supabase: ReturnType<typeof createClient>,
  input: CreateInventorySignalInput,
  metadata?: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase
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
      metadata,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to insert inventory signal: ${error.message}`);
  }

  return data.id;
}

/**
 * Insert an event record
 */
async function insertEventRecord(
  supabase: ReturnType<typeof createClient>,
  params: {
    merchantId: string;
    eventType: string;
    source: string;
    payload: unknown;
    signalId?: string;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      id: crypto.randomUUID(),
      merchant_id: params.merchantId,
      event_type: params.eventType,
      source: params.source,
      payload: params.payload,
      signal_id: params.signalId,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to insert event record: ${error.message}`);
  }

  return data.id;
}

/**
 * Create a service order for maintenance request
 */
async function createServiceOrderFromMaintenance(
  supabase: ReturnType<typeof createClient>,
  merchantId: string,
  maintenanceData: RestoPapaMaintenanceWebhookData,
  merchantName: string
): Promise<string> {
  // Map maintenance priority to service order priority
  const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    urgent: 'urgent',
  };

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, name')
    .eq('id', merchantId)
    .single();

  const serviceOrderNumber = `SRV-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabase
    .from('service_orders')
    .insert({
      id: crypto.randomUUID(),
      order_number: serviceOrderNumber,
      merchant_id: merchantId,
      merchant_name: merchantName,
      status: 'pending',
      priority: priorityMap[maintenanceData.priority] || 'medium',
      title: maintenanceData.title,
      description: `RestoPapa Maintenance Request: ${maintenanceData.requestNumber}`,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      payment_status: 'pending',
      schedule: maintenanceData.scheduledDate
        ? {
            scheduledDate: new Date(maintenanceData.scheduledDate),
            startTime: '09:00',
            endTime: '17:00',
          }
        : null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create service order: ${error.message}`);
  }

  return data.id;
}

/**
 * Update order status from RestoPapa webhook
 */
async function updateOrderFromWebhook(
  supabase: ReturnType<typeof createClient>,
  orderWebhookData: RestoPapaOrderWebhookData,
  merchantId: string
): Promise<void> {
  // Find the order by RestoPapa order ID
  const { error } = await supabase
    .from('purchase_orders')
    .update({
      status: mapRestoPapaOrderStatus(orderWebhookData.newStatus),
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', merchantId)
    .eq('source', 'api')
    .eq('metadata', { resto_papa_order_id: orderWebhookData.orderId });

  if (error) {
    logger.warn(`Failed to update order status: ${error.message}`);
  }
}

/**
 * Map RestoPapa order status to our status
 */
function mapRestoPapaOrderStatus(status: string): string {
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
// Webhook Handlers
// ============================================

/**
 * Handle inventory webhooks
 */
async function handleInventoryWebhook(
  payload: z.infer<typeof InventoryWebhookSchema>,
  context: WebhookHandlerContext,
  connection: RestoPapaConnection
): Promise<WebhookHandlerResult> {
  const supabase = createClient(context.supabaseUrl, context.supabaseServiceKey);
  const data = payload.data as RestoPapaInventoryWebhookData;

  // Determine severity based on event type and stock level
  let severity: SignalSeverity;
  let signalType: SignalType;

  if (payload.event === 'inventory.out_of_stock' || data.currentStock === 0) {
    severity = 'critical';
    signalType = 'out_of_stock';
  } else if (payload.event === 'inventory.low_stock') {
    severity = mapSeverity(data.threshold && data.currentStock <= data.threshold * 0.5 ? 'critical' : 'low');
    signalType = 'low_stock';
  } else {
    severity = 'medium';
    signalType = 'movement';
  }

  const signalInput: CreateInventorySignalInput = {
    merchantId: connection.merchantId,
    source: 'restopapa' as ProductSource,
    sourceProductId: data.productId,
    sourceMerchantId: payload.merchantId,
    productName: data.productName,
    sku: data.sku,
    currentStock: data.currentStock,
    threshold: data.minStock || data.threshold || 0,
    unit: data.unit,
    category: data.category,
    severity,
    signalType,
    metadata: {
      previousStock: data.previousStock,
      event: payload.event,
      locationId: payload.locationId,
    },
  };

  const signalId = await insertInventorySignal(supabase, signalInput, {
    previousStock: data.previousStock,
    event: payload.event,
  });

  // Insert event record
  await insertEventRecord(supabase, {
    merchantId: connection.merchantId,
    eventType: 'inventory_signal_created',
    source: 'restopapa',
    payload,
    signalId,
  });

  // Update last sync timestamp
  await supabase
    .from('restopapa_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', connection.id);

  return {
    success: true,
    action: 'signal_created',
    signalId,
    details: {
      severity,
      signalType,
      currentStock: data.currentStock,
    },
  };
}

/**
 * Handle order webhooks
 */
async function handleOrderWebhook(
  payload: z.infer<typeof OrderWebhookSchema>,
  context: WebhookHandlerContext,
  connection: RestoPapaConnection
): Promise<WebhookHandlerResult> {
  const supabase = createClient(context.supabaseUrl, context.supabaseServiceKey);
  const data = payload.data as RestoPapaOrderWebhookData;

  await updateOrderFromWebhook(supabase, data, connection.merchantId);

  // Insert event record
  await insertEventRecord(supabase, {
    merchantId: connection.merchantId,
    eventType: 'order_status_changed',
    source: 'restopapa',
    payload,
  });

  return {
    success: true,
    action: 'order_updated',
    details: {
      orderId: data.orderId,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
    },
  };
}

/**
 * Handle maintenance webhooks
 */
async function handleMaintenanceWebhook(
  payload: z.infer<typeof MaintenanceWebhookSchema>,
  context: WebhookHandlerContext,
  connection: RestoPapaConnection
): Promise<WebhookHandlerResult> {
  const supabase = createClient(context.supabaseUrl, context.supabaseServiceKey);
  const data = payload.data as RestoPapaMaintenanceWebhookData;

  const serviceOrderId = await createServiceOrderFromMaintenance(
    supabase,
    connection.merchantId,
    data,
    'RestoPapa Import'
  );

  // Insert event record
  await insertEventRecord(supabase, {
    merchantId: connection.merchantId,
    eventType: 'service_order_created',
    source: 'restopapa',
    payload,
  });

  return {
    success: true,
    action: 'service_order_created',
    details: {
      requestId: data.requestId,
      serviceOrderId,
    },
  };
}

/**
 * Handle sync completion webhooks
 */
async function handleSyncWebhook(
  payload: z.infer<typeof SyncWebhookSchema>,
  context: WebhookHandlerContext,
  connection: RestoPapaConnection
): Promise<WebhookHandlerResult> {
  const supabase = createClient(context.supabaseUrl, context.supabaseServiceKey);
  const data = payload.data;

  // Insert event record
  await insertEventRecord(supabase, {
    merchantId: connection.merchantId,
    eventType: 'sync_completed',
    source: 'restopapa',
    payload,
  });

  // Update connection last sync
  await supabase
    .from('restopapa_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', connection.id);

  return {
    success: true,
    action: 'sync_recorded',
    details: {
      syncId: data.syncId,
      itemsProcessed: data.itemsProcessed,
      status: data.status,
    },
  };
}

// ============================================
// Main Handler
// ============================================

/**
 * Main webhook handler for RestoPapa events
 */
export async function handleRestoPapaWebhook(
  rawBody: string,
  headers: Headers,
  connection: RestoPapaConnection,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  try {
    // Verify webhook signature
    const verification = verifyRestoPapaWebhook(
      rawBody,
      headers,
      connection.webhookSecret
    );

    if (!verification.valid) {
      return {
        success: false,
        error: verification.error,
      };
    }

    // Parse and validate payload
    const parseResult = RestoPapaWebhookSchema.safeParse(JSON.parse(rawBody));
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid webhook payload: ${parseResult.error.message}`,
      };
    }

    const payload = parseResult.data;

    // Route to appropriate handler based on event type
    if (['inventory.low_stock', 'inventory.out_of_stock', 'inventory.stock_updated'].includes(payload.event)) {
      return handleInventoryWebhook(
        payload as z.infer<typeof InventoryWebhookSchema>,
        context,
        connection
      );
    }

    if (['order.status_changed', 'order.created'].includes(payload.event)) {
      return handleOrderWebhook(
        payload as z.infer<typeof OrderWebhookSchema>,
        context,
        connection
      );
    }

    if (['maintenance.request_created', 'maintenance.status_changed'].includes(payload.event)) {
      return handleMaintenanceWebhook(
        payload as z.infer<typeof MaintenanceWebhookSchema>,
        context,
        connection
      );
    }

    if (payload.event === 'sync.completed') {
      return handleSyncWebhook(
        payload as z.infer<typeof SyncWebhookSchema>,
        context,
        connection
      );
    }

    return {
      success: false,
      error: `Unknown event type: ${payload.event}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('RestoPapa webhook handler error:', message);
    return {
      success: false,
      error: message,
    };
  }
}

// ============================================
// Connection Lookup
// ============================================

/**
 * Get RestoPapa connection by merchant ID
 */
export async function getConnectionByMerchantId(
  context: WebhookHandlerContext,
  merchantId: string
): Promise<RestoPapaConnection | null> {
  const supabase = createClient(context.supabaseUrl, context.supabaseServiceKey);

  const { data, error } = await supabase
    .from('restopapa_connections')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    merchantId: data.merchant_id,
    restoPapaMerchantId: data.restopapa_merchant_id,
    restoPapaLocationId: data.restopapa_location_id,
    apiKey: data.api_key,
    webhookSecret: data.webhook_secret,
    webhookUrl: data.webhook_url,
    isActive: data.is_active,
    lastSyncAt: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
    syncFrequency: data.sync_frequency,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Get RestoPapa connection by ID
 */
export async function getConnectionById(
  context: WebhookHandlerContext,
  connectionId: string
): Promise<RestoPapaConnection | null> {
  const supabase = createClient(context.supabaseUrl, context.supabaseServiceKey);

  const { data, error } = await supabase
    .from('restopapa_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    merchantId: data.merchant_id,
    restoPapaMerchantId: data.restopapa_merchant_id,
    restoPapaLocationId: data.restopapa_location_id,
    apiKey: data.api_key,
    webhookSecret: data.webhook_secret,
    webhookUrl: data.webhook_url,
    isActive: data.is_active,
    lastSyncAt: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
    syncFrequency: data.sync_frequency,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
