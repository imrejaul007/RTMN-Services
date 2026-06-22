import logger from './utils/logger';

/**
 * Hotel PMS Webhook Handler
 *
 * Handles incoming webhooks from Hotel PMS systems
 * Supports maintenance requests, inventory alerts, and laundry services
 */

import crypto from 'crypto';
import { z } from 'zod';
import type {
  HotelPMSConnection,
  MaintenanceWebhookPayload,
  LaundryWebhookPayload,
  HotelPMSWebhookEvent,
  ServiceRequest,
  WebhookResponse,
} from './types';

// ============================================================================
// Webhook Verification
// ============================================================================

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  connectionId?: string;
}

/**
 * Verify webhook signature from Hotel PMS
 */
export function verifyHotelPMSWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  webhookSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

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
 * Verify webhook with timing-safe comparison
 */
export function verifyWebhook(
  rawBody: string,
  headers: {
    'x-signature'?: string;
    'x-timestamp'?: string;
    'x-hotel-pms-signature'?: string;
    'x-hotel-pms-timestamp'?: string;
  },
  webhookSecret: string
): WebhookVerificationResult {
  // Support both header formats
  const signature = headers['x-signature'] || headers['x-hotel-pms-signature'] || '';
  const timestamp = headers['x-timestamp'] || headers['x-hotel-pms-timestamp'] || '';

  if (!signature || !timestamp) {
    return {
      valid: false,
      error: 'Missing signature or timestamp headers',
    };
  }

  // Verify timestamp is within acceptable window (5 minutes)
  const webhookTime = new Date(timestamp).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (Math.abs(now - webhookTime) > fiveMinutes) {
    return {
      valid: false,
      error: 'Webhook timestamp expired',
    };
  }

  const isValid = verifyHotelPMSWebhookSignature(rawBody, signature, timestamp, webhookSecret);

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid webhook signature',
    };
  }

  return { valid: true };
}

// ============================================================================
// Webhook Parsing
// ============================================================================

/**
 * Parse and validate maintenance webhook payload
 */
export function parseMaintenanceWebhook(
  payload: unknown
): { success: true; data: MaintenanceWebhookPayload } | { success: false; error: string } {
  const result = MaintenanceWebhookPayloadSchema.safeParse(payload);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return {
      success: false,
      error: `Invalid webhook payload: ${errors.join(', ')}`,
    };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate laundry webhook payload
 */
export function parseLaundryWebhook(
  payload: unknown
): { success: true; data: LaundryWebhookPayload } | { success: false; error: string } {
  const result = LaundryWebhookPayloadSchema.safeParse(payload);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return {
      success: false,
      error: `Invalid webhook payload: ${errors.join(', ')}`,
    };
  }

  return { success: true, data: result.data };
}

// ============================================================================
// Event Type Detection
// ============================================================================

/**
 * Detect webhook event type from payload
 */
export function detectWebhookEvent(payload: unknown): HotelPMSWebhookEvent | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const obj = payload as Record<string, unknown>;

  if (typeof obj.event !== 'string') {
    return null;
  }

  const validEvents: HotelPMSWebhookEvent[] = [
    'maintenance.request.created',
    'maintenance.request.updated',
    'maintenance.request.completed',
    'maintenance.request.cancelled',
    'inventory.low_stock',
    'laundry.pickup_scheduled',
    'laundry.delivery_completed',
  ];

  return validEvents.includes(obj.event as HotelPMSWebhookEvent) ? obj.event as HotelPMSWebhookEvent : null;
}

// ============================================================================
// Webhook Handler Interface
// ============================================================================

export interface WebhookHandlerContext {
  connection: HotelPMSConnection;
  supabase?: {
    from: (table: string) => {
      insert: (data: unknown) => Promise<{ data: unknown; error: unknown }>;
      update: (data: unknown) => Promise<{ data: unknown; error: unknown }>;
      upsert: (data: unknown) => Promise<{ data: unknown; error: unknown }>;
      select: (columns?: string) => {
        eq: (column: string, value: unknown) => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
}

export interface WebhookHandlerResult {
  success: boolean;
  processed: boolean;
  serviceRequestId?: string;
  error?: string;
}

/**
 * Base webhook handler interface
 */
export interface WebhookHandler {
  canHandle(event: HotelPMSWebhookEvent): boolean;
  handle(
    payload: MaintenanceWebhookPayload | LaundryWebhookPayload,
    context: WebhookHandlerContext
  ): Promise<WebhookHandlerResult>;
}

// ============================================================================
// Maintenance Request Handlers
// ============================================================================

/**
 * Handle maintenance.request.created event
 */
export async function handleMaintenanceCreated(
  payload: MaintenanceWebhookPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  const { data } = payload;

  try {
    // Check if service request already exists
    if (context.supabase) {
      const { data: existing } = await context.supabase
        .from('hotel_pms_service_requests')
        .select('id')
        .eq('hotel_pms_request_id', data.requestId)
        .eq('connection_id', context.connection.id)
        .single();

      if (existing) {
        return {
          success: true,
          processed: false,
          serviceRequestId: existing.id as string,
          error: 'Service request already exists',
        };
      }
    }

    // Create service request from webhook data
    const serviceRequest = {
      connection_id: context.connection.id,
      hotel_pms_request_id: data.requestId,
      merchant_id: context.connection.merchantId,
      category: data.category,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      location: data.location,
      room_number: data.roomNumber,
      estimated_cost: data.estimatedCost,
      metadata: { ...data.metadata, webhookEvent: payload.event },
      sync_status: 'synced',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (context.supabase) {
      const { data: created, error } = await context.supabase
        .from('hotel_pms_service_requests')
        .insert(serviceRequest)
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to create service request:', error);
        return { success: false, processed: false, error: `Database error: ${error}` };
      }

      return { success: true, processed: true, serviceRequestId: created.id as string };
    }

    // Return as pending if no supabase context (for testing)
    return {
      success: true,
      processed: true,
      serviceRequestId: `pending_${data.requestId}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error handling maintenance created:', message);
    return { success: false, processed: false, error: message };
  }
}

/**
 * Handle maintenance.request.updated event
 */
export async function handleMaintenanceUpdated(
  payload: MaintenanceWebhookPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  const { data } = payload;

  try {
    if (!context.supabase) {
      return {
        success: true,
        processed: true,
        error: 'No database context for update',
      };
    }

    const { data: existing, error: findError } = await context.supabase
      .from('hotel_pms_service_requests')
      .select('id')
      .eq('hotel_pms_request_id', data.requestId)
      .eq('connection_id', context.connection.id)
      .single();

    if (findError || !existing) {
      // Try to create if not found
      return handleMaintenanceCreated(payload, context);
    }

    const { error: updateError } = await context.supabase
      .from('hotel_pms_service_requests')
      .update({
        status: data.status,
        actual_cost: data.actualCost,
        vendor_id: data.vendorId,
        notes: data.notes,
        metadata: { ...data.metadata, webhookEvent: payload.event },
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      return { success: false, processed: false, error: `Update failed: ${updateError}` };
    }

    return { success: true, processed: true, serviceRequestId: existing.id as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, processed: false, error: message };
  }
}

/**
 * Handle maintenance.request.completed event
 */
export async function handleMaintenanceCompleted(
  payload: MaintenanceWebhookPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  const { data } = payload;

  try {
    if (!context.supabase) {
      return { success: true, processed: true, error: 'No database context' };
    }

    const { data: existing, error: findError } = await context.supabase
      .from('hotel_pms_service_requests')
      .select('id')
      .eq('hotel_pms_request_id', data.requestId)
      .eq('connection_id', context.connection.id)
      .single();

    if (findError || !existing) {
      return { success: false, processed: false, error: 'Service request not found' };
    }

    const { error: updateError } = await context.supabase
      .from('hotel_pms_service_requests')
      .update({
        status: 'completed',
        actual_cost: data.actualCost,
        completed_at: data.completedAt ? new Date(data.completedAt) : new Date(),
        metadata: { ...data.metadata, webhookEvent: payload.event },
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      return { success: false, processed: false, error: `Completion update failed: ${updateError}` };
    }

    return { success: true, processed: true, serviceRequestId: existing.id as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, processed: false, error: message };
  }
}

/**
 * Handle maintenance.request.cancelled event
 */
export async function handleMaintenanceCancelled(
  payload: MaintenanceWebhookPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  const { data } = payload;

  try {
    if (!context.supabase) {
      return { success: true, processed: true };
    }

    const { data: existing, error: findError } = await context.supabase
      .from('hotel_pms_service_requests')
      .select('id')
      .eq('hotel_pms_request_id', data.requestId)
      .eq('connection_id', context.connection.id)
      .single();

    if (findError || !existing) {
      return { success: true, processed: false, error: 'Service request not found' };
    }

    const { error: updateError } = await context.supabase
      .from('hotel_pms_service_requests')
      .update({
        status: 'cancelled',
        metadata: { ...data.metadata, webhookEvent: payload.event, cancelled: true },
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      return { success: false, processed: false, error: `Cancellation failed: ${updateError}` };
    }

    return { success: true, processed: true, serviceRequestId: existing.id as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, processed: false, error: message };
  }
}

// ============================================================================
// Laundry Handler
// ============================================================================

/**
 * Handle laundry pickup scheduled event
 */
export async function handleLaundryPickupScheduled(
  payload: LaundryWebhookPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  const { data } = payload;

  try {
    if (!context.supabase) {
      return { success: true, processed: true };
    }

    // Create laundry service request record
    const laundryRequest = {
      connection_id: context.connection.id,
      merchant_id: context.connection.merchantId,
      vendor_id: data.vendorId || null,
      requested_at: new Date(data.scheduledDate),
      quantity: data.quantity,
      unit: data.unit,
      status: 'pending',
      notes: data.notes,
      metadata: { laundry_request_id: data.laundryRequestId, webhookEvent: payload.event },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await context.supabase
      .from('hotel_laundry_requests')
      .insert(laundryRequest)
      .select('id')
      .single();

    if (error) {
      return { success: false, processed: false, error: `Database error: ${error}` };
    }

    return { success: true, processed: true, serviceRequestId: created.id as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, processed: false, error: message };
  }
}

/**
 * Handle laundry delivery completed event
 */
export async function handleLaundryDeliveryCompleted(
  payload: LaundryWebhookPayload,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  const { data } = payload;

  try {
    if (!context.supabase) {
      return { success: true, processed: true };
    }

    const { data: existing, error: findError } = await context.supabase
      .from('hotel_laundry_requests')
      .select('id')
      .eq('metadata->laundry_request_id', data.laundryRequestId)
      .single();

    if (findError || !existing) {
      return { success: true, processed: false, error: 'Laundry request not found' };
    }

    const { error: updateError } = await context.supabase
      .from('hotel_laundry_requests')
      .update({
        status: 'completed',
        delivery_date: new Date(data.scheduledDate),
        metadata: { webhookEvent: payload.event, delivered: true },
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      return { success: false, processed: false, error: `Update failed: ${updateError}` };
    }

    return { success: true, processed: true, serviceRequestId: existing.id as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, processed: false, error: message };
  }
}

// ============================================================================
// Main Webhook Dispatcher
// ============================================================================

const MaintenanceWebhookPayloadSchema = z.object({
  event: z.enum([
    'maintenance.request.created',
    'maintenance.request.updated',
    'maintenance.request.completed',
    'maintenance.request.cancelled',
    'inventory.low_stock',
  ]),
  timestamp: z.string(),
  hotelId: z.string(),
  data: z.object({
    requestId: z.string(),
    roomNumber: z.string().optional(),
    category: z.enum(['plumbing', 'electrical', 'hvac', 'cleaning', 'laundry', 'general']),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
    reportedBy: z.string().optional(),
    reportedAt: z.string(),
    location: z.string(),
    attachments: z.array(z.string()).optional(),
    estimatedCost: z.number().optional(),
    actualCost: z.number().optional(),
    vendorId: z.string().optional(),
    completedAt: z.string().optional(),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

const LaundryWebhookPayloadSchema = z.object({
  event: z.enum(['laundry.pickup_scheduled', 'laundry.delivery_completed']),
  timestamp: z.string(),
  hotelId: z.string(),
  data: z.object({
    laundryRequestId: z.string(),
    quantity: z.number().positive(),
    unit: z.enum(['kg', 'pieces']),
    scheduledDate: z.string(),
    vendorId: z.string().optional(),
    notes: z.string().optional(),
  }),
});

/**
 * Dispatch webhook to appropriate handler
 */
export async function dispatchWebhook(
  payload: unknown,
  context: WebhookHandlerContext
): Promise<WebhookHandlerResult> {
  // Detect event type
  const event = detectWebhookEvent(payload);

  if (!event) {
    return { success: false, processed: false, error: 'Unknown event type' };
  }

  // Handle maintenance events
  if (event.startsWith('maintenance.')) {
    const parseResult = parseMaintenanceWebhook(payload);
    if (!parseResult.success) {
      return { success: false, processed: false, error: parseResult.error };
    }

    switch (event) {
      case 'maintenance.request.created':
        return handleMaintenanceCreated(parseResult.data, context);
      case 'maintenance.request.updated':
        return handleMaintenanceUpdated(parseResult.data, context);
      case 'maintenance.request.completed':
        return handleMaintenanceCompleted(parseResult.data, context);
      case 'maintenance.request.cancelled':
        return handleMaintenanceCancelled(parseResult.data, context);
      default:
        return { success: false, processed: false, error: `Unhandled maintenance event: ${event}` };
    }
  }

  // Handle laundry events
  if (event.startsWith('laundry.')) {
    const parseResult = parseLaundryWebhook(payload);
    if (!parseResult.success) {
      return { success: false, processed: false, error: parseResult.error };
    }

    switch (event) {
      case 'laundry.pickup_scheduled':
        return handleLaundryPickupScheduled(parseResult.data, context);
      case 'laundry.delivery_completed':
        return handleLaundryDeliveryCompleted(parseResult.data, context);
      default:
        return { success: false, processed: false, error: `Unhandled laundry event: ${event}` };
    }
  }

  // Handle inventory events (pass through to existing handler)
  if (event === 'inventory.low_stock') {
    logger.info('Inventory low stock event received, passing to inventory handler');
    return { success: true, processed: true };
  }

  return { success: false, processed: false, error: `Unhandled event: ${event}` };
}

export type { MaintenanceWebhookPayload, LaundryWebhookPayload };
