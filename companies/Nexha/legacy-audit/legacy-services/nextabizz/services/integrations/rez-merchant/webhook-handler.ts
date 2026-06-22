import logger from './utils/logger';

/**
 * REZ Merchant Webhook Handler
 *
 * Handles incoming webhooks from REZ Merchant
 * Supports inventory updates, order events, and maintenance notifications
 */

import { z } from 'zod';
import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InventoryWebhookPayload,
  OrderWebhookPayload,
  MaintenanceWebhookPayload,
  RezMerchantWebhookEvent,
  RezMerchantConnection,
} from './types';
import {
  InventoryWebhookPayloadSchema,
  OrderWebhookPayloadSchema,
  MaintenanceWebhookPayloadSchema,
  RezMerchantWebhookEventSchema,
} from './types';

// ============================================================================
// Webhook Handler Context
// ============================================================================

export interface WebhookHandlerContext {
  supabase: SupabaseClient;
  connectionId: string;
  merchantId: string;
}

export interface WebhookHandlerResult {
  success: boolean;
  eventId?: string;
  signalId?: string;
  orderId?: string;
  maintenanceId?: string;
  error?: string;
}

// ============================================================================
// Webhook Verification
// ============================================================================

/**
 * Verify REZ Merchant webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  webhookSecret: string
): boolean {
  if (!webhookSecret) {
    logger.warn('Webhook secret not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Parse and verify webhook headers
 */
export interface ParsedWebhookHeaders {
  timestamp: string;
  signature: string;
  eventType: string;
  storeId: string;
}

export function parseWebhookHeaders(headers: Headers): ParsedWebhookHeaders | null {
  const timestamp = headers.get('X-Timestamp');
  const signature = headers.get('X-Signature');
  const eventType = headers.get('X-Event-Type');
  const storeId = headers.get('X-Store-ID');

  if (!timestamp || !signature || !eventType || !storeId) {
    return null;
  }

  return { timestamp, signature, eventType, storeId };
}

// ============================================================================
// Payload Validation
// ============================================================================

/**
 * Validate inventory webhook payload
 */
export function validateInventoryWebhookPayload(
  data: unknown
): { success: true; data: InventoryWebhookPayload } | { success: false; error: z.ZodError } {
  const result = InventoryWebhookPayloadSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate order webhook payload
 */
export function validateOrderWebhookPayload(
  data: unknown
): { success: true; data: OrderWebhookPayload } | { success: false; error: z.ZodError } {
  const result = OrderWebhookPayloadSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate maintenance webhook payload
 */
export function validateMaintenanceWebhookPayload(
  data: unknown
): { success: true; data: MaintenanceWebhookPayload } | { success: false; error: z.ZodError } {
  const result = MaintenanceWebhookPayloadSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Event Mapping Functions
// ============================================================================

/**
 * Map severity from REZ Merchant to NEXABIZZ format
 */
function mapSeverity(severity: 'low' | 'critical' | 'out_of_stock'): 'low' | 'medium' | 'high' | 'critical' {
  switch (severity) {
    case 'out_of_stock':
    case 'critical':
      return 'critical';
    default:
      return severity;
  }
}

/**
 * Map signal type from REZ Merchant to NEXABIZZ format
 */
function mapSignalType(event: string): 'low_stock' | 'out_of_stock' | 'movement' {
  if (event === 'inventory.out_of_stock') return 'out_of_stock';
  if (event === 'inventory.updated') return 'movement';
  return 'low_stock';
}

/**
 * Map order status from REZ Merchant to NEXABIZZ format
 */
function mapOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'pending',
    confirmed: 'confirmed',
    processing: 'processing',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
    returned: 'cancelled',
  };
  return statusMap[status.toLowerCase()] || status;
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Insert inventory signal into database
 */
async function insertInventorySignal(
  supabase: SupabaseClient,
  signal: {
    merchantId: string;
    source: string;
    sourceMerchantId: string;
    sourceProductId: string;
    productName: string;
    sku?: string;
    currentStock: number;
    threshold: number;
    unit: string;
    category?: string;
    severity: string;
    signalType: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('inventory_signals')
    .insert({
      merchant_id: signal.merchantId,
      source: signal.source,
      source_merchant_id: signal.sourceMerchantId,
      source_product_id: signal.sourceProductId,
      product_name: signal.productName,
      sku: signal.sku,
      current_stock: signal.currentStock,
      threshold: signal.threshold,
      unit: signal.unit,
      category: signal.category,
      severity: signal.severity,
      signal_type: signal.signalType,
      metadata: signal.metadata,
    })
    .select('id')
    .single();

  return { data, error };
}

/**
 * Insert event record
 */
async function insertEventRecord(
  supabase: SupabaseClient,
  eventType: string,
  source: string,
  payload: Record<string, unknown>
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      type: eventType,
      source,
      payload,
    })
    .select('id')
    .single();

  return { data, error };
}

/**
 * Insert order sync record
 */
async function insertOrderSyncRecord(
  supabase: SupabaseClient,
  order: {
    connectionId: string;
    merchantId: string;
    orderId: string;
    orderNumber: string;
    status: string;
    previousStatus?: string;
    total: number;
    itemCount: number;
    customerName?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('order_sync_records')
    .insert({
      connection_id: order.connectionId,
      merchant_id: order.merchantId,
      source_order_id: order.orderId,
      source_order_number: order.orderNumber,
      status: order.status,
      previous_status: order.previousStatus,
      total: order.total,
      item_count: order.itemCount,
      customer_name: order.customerName,
      metadata: order.metadata,
      synced_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  return { data, error };
}

/**
 * Insert maintenance sync record
 */
async function insertMaintenanceSyncRecord(
  supabase: SupabaseClient,
  maintenance: {
    connectionId: string;
    merchantId: string;
    requestId: string;
    title: string;
    description?: string;
    category: string;
    priority: string;
    status: string;
    estimatedCost?: number;
    location?: string;
    reportedAt: Date;
    metadata?: Record<string, unknown>;
  }
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('maintenance_sync_records')
    .insert({
      connection_id: maintenance.connectionId,
      merchant_id: maintenance.merchantId,
      source_request_id: maintenance.requestId,
      title: maintenance.title,
      description: maintenance.description,
      category: maintenance.category,
      priority: maintenance.priority,
      status: maintenance.status,
      estimated_cost: maintenance.estimatedCost,
      location: maintenance.location,
      reported_at: maintenance.reportedAt.toISOString(),
      metadata: maintenance.metadata,
      synced_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  return { data, error };
}

/**
 * Update connection last sync timestamp
 */
async function updateConnectionLastSync(
  supabase: SupabaseClient,
  connectionId: string
): Promise<void> {
  await supabase
    .from('rez_merchant_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      status: 'connected',
    })
    .eq('id', connectionId);
}

/**
 * Update connection error
 */
async function updateConnectionError(
  supabase: SupabaseClient,
  connectionId: string,
  error: string
): Promise<void> {
  await supabase
    .from('rez_merchant_connections')
    .update({
      last_error: error,
      status: 'error',
    })
    .eq('id', connectionId);
}

/**
 * Handle webhook processing error
 */
function handleError(error: unknown, source: string): WebhookHandlerResult {
  logger.error(`${source} webhook handler error:`, error);
  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    success: false,
    error: message,
  };
}

// ============================================================================
// Webhook Handlers
// ============================================================================

/**
 * Handle inventory webhook event
 */
export async function handleInventoryWebhook(
  payload: InventoryWebhookPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  try {
    const { supabase, connectionId, merchantId } = context;

    // Determine severity based on stock level and event type
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let signalType: 'low_stock' | 'out_of_stock' | 'movement' = 'movement';

    if (payload.event === 'inventory.out_of_stock') {
      severity = 'critical';
      signalType = 'out_of_stock';
    } else if (payload.event === 'inventory.low_stock') {
      severity = 'high';
      signalType = 'low_stock';
    } else {
      // inventory.updated - check if stock is low
      if (payload.data.currentStock <= (payload.data.reorderLevel || 0)) {
        severity = payload.data.currentStock === 0 ? 'critical' : 'high';
        signalType = 'low_stock';
      }
    }

    // Insert inventory signal
    const signalResult = await insertInventorySignal(supabase, {
      merchantId,
      source: 'rez-merchant',
      sourceMerchantId: payload.storeId,
      sourceProductId: payload.data.productId,
      productName: payload.data.name,
      sku: payload.data.sku,
      currentStock: payload.data.currentStock,
      threshold: payload.data.reorderLevel || 0,
      unit: payload.data.unit,
      category: payload.data.category,
      severity,
      signalType,
      metadata: payload.data.metadata,
    });

    if (signalResult.error) {
      logger.error('Failed to insert inventory signal:', signalResult.error);
      return {
        success: false,
        error: `Database error: ${signalResult.error.message}`,
      };
    }

    // Insert event record
    const eventResult = await insertEventRecord(
      supabase,
      payload.event,
      'rez-merchant',
      { ...payload, processedAt: new Date().toISOString() }
    );

    // Update connection last sync
    await updateConnectionLastSync(supabase, connectionId);

    return {
      success: true,
      signalId: signalResult.data?.id,
      eventId: eventResult.data?.id,
    };
  } catch (error) {
    return handleError(error, 'inventory');
  }
}

/**
 * Handle order webhook event
 */
export async function handleOrderWebhook(
  payload: OrderWebhookPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  try {
    const { supabase, connectionId, merchantId } = context;

    // Insert order sync record
    const orderResult = await insertOrderSyncRecord(supabase, {
      connectionId,
      merchantId,
      orderId: payload.data.orderId,
      orderNumber: payload.data.orderNumber,
      status: mapOrderStatus(payload.data.status),
      previousStatus: payload.data.previousStatus ? mapOrderStatus(payload.data.previousStatus) : undefined,
      total: payload.data.total,
      itemCount: payload.data.itemCount,
      customerName: payload.data.customerName,
      metadata: payload.data.metadata,
    });

    if (orderResult.error) {
      logger.error('Failed to insert order sync record:', orderResult.error);
      return {
        success: false,
        error: `Database error: ${orderResult.error.message}`,
      };
    }

    // Insert event record
    const eventResult = await insertEventRecord(
      supabase,
      payload.event,
      'rez-merchant',
      { ...payload, processedAt: new Date().toISOString() }
    );

    // Update connection last sync
    await updateConnectionLastSync(supabase, connectionId);

    return {
      success: true,
      orderId: orderResult.data?.id,
      eventId: eventResult.data?.id,
    };
  } catch (error) {
    return handleError(error, 'order');
  }
}

/**
 * Handle maintenance webhook event
 */
export async function handleMaintenanceWebhook(
  payload: MaintenanceWebhookPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  try {
    const { supabase, connectionId, merchantId } = context;

    // Insert maintenance sync record
    const maintenanceResult = await insertMaintenanceSyncRecord(supabase, {
      connectionId,
      merchantId,
      requestId: payload.data.requestId,
      title: payload.data.title,
      description: payload.data.description,
      category: payload.data.category || 'general',
      priority: payload.data.priority,
      status: payload.data.status,
      estimatedCost: payload.data.estimatedCost,
      location: payload.data.location,
      reportedAt: new Date(payload.data.reportedAt),
      metadata: payload.data.metadata,
    });

    if (maintenanceResult.error) {
      logger.error('Failed to insert maintenance sync record:', maintenanceResult.error);
      return {
        success: false,
        error: `Database error: ${maintenanceResult.error.message}`,
      };
    }

    // Insert event record
    const eventResult = await insertEventRecord(
      supabase,
      payload.event,
      'rez-merchant',
      { ...payload, processedAt: new Date().toISOString() }
    );

    // Update connection last sync
    await updateConnectionLastSync(supabase, connectionId);

    return {
      success: true,
      maintenanceId: maintenanceResult.data?.id,
      eventId: eventResult.data?.id,
    };
  } catch (error) {
    return handleError(error, 'maintenance');
  }
}

/**
 * Route webhook to appropriate handler based on event type
 */
export async function routeWebhook(
  event: RezMerchantWebhookEvent,
  payload: unknown,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  // Validate event type
  const eventResult = RezMerchantWebhookEventSchema.safeParse(event);
  if (!eventResult.success) {
    return {
      success: false,
      error: `Unknown event type: ${event}`,
    };
  }

  // Route to appropriate handler based on event category
  if (event.startsWith('inventory.')) {
    const payloadResult = validateInventoryWebhookPayload(payload);
    if (!payloadResult.success) {
      return {
        success: false,
        error: `Invalid inventory payload: ${payloadResult.error.message}`,
      };
    }
    return handleInventoryWebhook(payloadResult.data, context);
  }

  if (event.startsWith('order.')) {
    const payloadResult = validateOrderWebhookPayload(payload);
    if (!payloadResult.success) {
      return {
        success: false,
        error: `Invalid order payload: ${payloadResult.error.message}`,
      };
    }
    return handleOrderWebhook(payloadResult.data, context);
  }

  if (event.startsWith('maintenance.')) {
    const payloadResult = validateMaintenanceWebhookPayload(payload);
    if (!payloadResult.success) {
      return {
        success: false,
        error: `Invalid maintenance payload: ${payloadResult.error.message}`,
      };
    }
    return handleMaintenanceWebhook(payloadResult.data, context);
  }

  return {
    success: false,
    error: `Unhandled event type: ${event}`,
  };
}

// ============================================================================
// Connection Webhook Registration
// ============================================================================

/**
 * Get webhook secret for a connection
 */
export async function getConnectionWebhookSecret(
  supabase: SupabaseClient,
  connectionId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('rez_merchant_connections')
    .select('webhook_secret')
    .eq('id', connectionId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.webhook_secret;
}

/**
 * Validate and get connection by store ID
 */
export async function getConnectionByStoreId(
  supabase: SupabaseClient,
  storeId: string
): Promise<RezMerchantConnection | null> {
  const { data, error } = await supabase
    .from('rez_merchant_connections')
    .select('*')
    .eq('rez_merchant_store_id', storeId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
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
}
