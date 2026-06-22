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
 * Hotel PMS Inventory Signal Payload Schema
 */
export const HotelPMSInventoryPayloadSchema = z.object({
  event: z.literal('inventory.signal.received'),
  merchantId: z.string().min(1, 'merchantId is required'),
  department: z.enum(['housekeeping', 'kitchen', 'spa', 'front_desk']),
  itemId: z.string().min(1, 'itemId is required'),
  itemName: z.string().min(1, 'itemName is required'),
  category: z.string().min(1, 'category is required'),
  currentStock: z.number().min(0, 'currentStock must be non-negative'),
  threshold: z.number().min(0, 'threshold must be non-negative'),
  unit: z.string().min(1, 'unit is required'),
  severity: z.enum(['low', 'critical', 'out_of_stock']),
  signalType: z.enum(['threshold_breach', 'manual_request', 'forecast_deficit']),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime({ message: 'Invalid ISO timestamp format' }),
});

export type HotelPMSInventoryPayload = z.infer<typeof HotelPMSInventoryPayloadSchema>;

/**
 * Maps Hotel PMS payload to internal InventorySignal format
 */
export function mapHotelPMSToInventorySignal(
  payload: HotelPMSInventoryPayload
): Omit<InventorySignal, 'id'> {
  return {
    merchantId: payload.merchantId,
    source: 'hotel-pms',
    sourceMerchantId: payload.merchantId,
    sourceProductId: payload.itemId,
    productName: payload.itemName,
    category: payload.category,
    currentStock: payload.currentStock,
    threshold: payload.threshold,
    unit: payload.unit,
    severity: mapSeverityToDB(payload.severity),
    signalType: mapSignalTypeToDB(payload.signalType),
    metadata: {
      ...payload.metadata,
      hotelDepartment: payload.department,
    },
    createdAt: new Date(),
  };
}

/**
 * Validates and parses Hotel PMS payload
 * @throws ZodError if validation fails
 */
export function validateHotelPMSPayload(data: unknown): HotelPMSInventoryPayload {
  return HotelPMSInventoryPayloadSchema.parse(data);
}

/**
 * Safe validation that returns result instead of throwing
 */
export function validateHotelPMSPayloadSafe(
  data: unknown
): { success: true; data: HotelPMSInventoryPayload } | { success: false; error: z.ZodError } {
  const result = HotelPMSInventoryPayloadSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Process a Hotel PMS inventory signal webhook
 */
export async function handleHotelPMSInventorySignal(
  payload: HotelPMSInventoryPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  try {
    const supabase = createHandlerClient(context);

    // Map to internal format
    const inventorySignal = mapHotelPMSToInventorySignal(payload);

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
      'hotel-pms',
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
    return handleError(error, 'hotel-pms');
  }
}
