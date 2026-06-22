import { logger } from '../../shared/logger';
import { z } from 'zod';
import {
  mapSeverityToDB,
  mapSignalTypeToDB,
  type WebhookHandlerContext,
  type WebhookHandlerResult,
  type InventorySignal,
  createHandlerClient,
  insertInventorySignal,
  insertEventRecord,
  handleError,
} from './common';

/**
 * RestoPapa Inventory Signal Payload Schema
 */
export const RestoPapaInventoryPayloadSchema = z.object({
  event: z.literal('inventory.signal.received'),
  merchantId: z.string().min(1, 'merchantId is required'),
  productId: z.string().min(1, 'productId is required'),
  productName: z.string().min(1, 'productName is required'),
  sku: z.string().optional(),
  currentStock: z.number().min(0, 'currentStock must be non-negative'),
  threshold: z.number().min(0, 'threshold must be non-negative'),
  unit: z.enum(['kg', 'units', 'liters', 'packs']),
  category: z.string().optional(),
  severity: z.enum(['low', 'critical', 'out_of_stock']),
  signalType: z.enum(['threshold_breach', 'manual_request', 'forecast_deficit']),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime({ message: 'Invalid ISO timestamp format' }),
});

export type RestoPapaInventoryPayload = z.infer<typeof RestoPapaInventoryPayloadSchema>;

/**
 * Maps RestoPapa payload to internal InventorySignal format
 */
export function mapRestoPapaToInventorySignal(
  payload: RestoPapaInventoryPayload
): Omit<InventorySignal, 'id'> {
  return {
    merchantId: payload.merchantId,
    source: 'restopapa',
    sourceMerchantId: payload.merchantId,
    sourceProductId: payload.productId,
    productName: payload.productName,
    sku: payload.sku,
    currentStock: payload.currentStock,
    threshold: payload.threshold,
    unit: payload.unit,
    category: payload.category,
    severity: mapSeverityToDB(payload.severity),
    signalType: mapSignalTypeToDB(payload.signalType),
    metadata: payload.metadata,
    createdAt: new Date(),
  };
}

/**
 * Validates and parses RestoPapa payload
 * @throws ZodError if validation fails
 */
export function validateRestoPapaPayload(data: unknown): RestoPapaInventoryPayload {
  return RestoPapaInventoryPayloadSchema.parse(data);
}

/**
 * Safe validation that returns result instead of throwing
 */
export function validateRestoPapaPayloadSafe(
  data: unknown
): { success: true; data: RestoPapaInventoryPayload } | { success: false; error: z.ZodError } {
  const result = RestoPapaInventoryPayloadSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Process a RestoPapa inventory signal webhook
 */
export async function handleRestoPapaInventorySignal(
  payload: RestoPapaInventoryPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  try {
    const supabase = createHandlerClient(context);

    // Map to internal format
    const inventorySignal = mapRestoPapaToInventorySignal(payload);

    // Insert inventory signal
    const signalResult = await insertInventorySignal(supabase, inventorySignal);
    if (signalResult.error) {
      logger.error('Failed to insert inventory signal:', signalResult.error);
      return {
        success: false,
        error: `Database error inserting inventory signal: ${signalResult.error.message}`,
      };
    }

    // Insert event record (events table only has: id, type, source, payload, created_at)
    const eventResult = await insertEventRecord(
      supabase,
      payload.event,
      'restopapa',
      { ...payload, processedAt: new Date().toISOString() }
    );
    if (eventResult.error) {
      logger.error('Failed to insert event record:', eventResult.error);
    }

    return {
      success: true,
      signalId: signalResult.data?.id,
      eventId: eventResult.data?.id,
    };
  } catch (error) {
    return handleError(error, 'restopapa');
  }
}
