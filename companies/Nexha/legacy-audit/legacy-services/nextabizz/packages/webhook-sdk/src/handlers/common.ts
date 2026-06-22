import { logger } from '../../shared/logger';
/**
 * Shared handler utilities for webhook processing
 * Consolidates common logic to reduce code duplication across handlers
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  InventorySignal as SharedInventorySignal,
  SignalSeverity,
  SignalType,
} from '@nextabizz/shared-types';

// Re-export the shared InventorySignal type for handlers
export type InventorySignal = SharedInventorySignal;

// Map incoming severity to DB-compatible values
// DB CHECK: severity IN ('low', 'medium', 'high', 'critical')
export function mapSeverityToDB(severity: string): SignalSeverity {
  const severityMap: Record<string, SignalSeverity> = {
    low: 'low',
    critical: 'critical',
    out_of_stock: 'critical', // Map out_of_stock to critical (closest match)
    medium: 'medium',
    high: 'high',
  };
  return severityMap[severity] ?? 'low';
}

// Map incoming signal type to DB-compatible values
// DB CHECK: signal_type IN ('low_stock', 'out_of_stock', 'expiring', 'overstock', 'movement')
export function mapSignalTypeToDB(signalType: string): SignalType {
  const typeMap: Record<string, SignalType> = {
    threshold_breach: 'low_stock',
    manual_request: 'low_stock', // Map manual_request to low_stock
    forecast_deficit: 'low_stock', // Map forecast_deficit to low_stock
    low_stock: 'low_stock',
    out_of_stock: 'out_of_stock',
    expiring: 'expiring',
    overstock: 'overstock',
    movement: 'movement',
  };
  return typeMap[signalType] ?? 'low_stock';
}

/**
 * Standard handler context interface
 */
export interface WebhookHandlerContext {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

/**
 * Standard handler result interface
 */
export interface WebhookHandlerResult {
  success: boolean;
  signalId?: string;
  eventId?: string;
  error?: string;
}

/**
 * Creates a Supabase client for the handler
 */
export function createHandlerClient(context: WebhookHandlerContext): SupabaseClient {
  return createClient(context.supabaseUrl, context.supabaseServiceKey);
}

/**
 * Inserts an inventory signal into the database
 */
export async function insertInventorySignal(
  supabase: SupabaseClient,
  signal: Omit<InventorySignal, 'id'>
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('inventory_signals')
    .insert({
      merchant_id: signal.merchantId,
      source: signal.source,
      source_product_id: signal.sourceProductId,
      source_merchant_id: signal.sourceMerchantId,
      product_name: signal.productName,
      sku: signal.sku,
      current_stock: signal.currentStock,
      threshold: signal.threshold,
      unit: signal.unit,
      category: signal.category,
      severity: signal.severity,
      signal_type: signal.signalType,
      metadata: signal.metadata ?? {},
    })
    .select('id')
    .single();

  return { data, error };
}

/**
 * Inserts an event record into the events table
 * Note: events table only has: id, type, source, payload, created_at
 */
export async function insertEventRecord(
  supabase: SupabaseClient,
  eventType: string,
  source: string,
  payload: Record<string, unknown>
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      type: eventType,
      source: source,
      payload: payload,
    })
    .select('id')
    .single();

  return { data, error };
}

/**
 * Standard error handling for webhook handlers
 */
export function handleError(error: unknown, source: string): WebhookHandlerResult {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error(`[${source}] Handler error:`, message);
  return { success: false, error: message };
}
