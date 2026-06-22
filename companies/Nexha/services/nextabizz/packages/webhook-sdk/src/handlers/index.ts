import { logger } from '../../shared/logger';
import { z } from 'zod';

import {
  RestoPapaInventoryPayloadSchema,
  validateRestoPapaPayload,
  validateRestoPapaPayloadSafe,
  handleRestoPapaInventorySignal,
  type RestoPapaInventoryPayload,
} from './restopapa';

import {
  RezMerchantInventoryPayloadSchema,
  validateRezMerchantPayload,
  validateRezMerchantPayloadSafe,
  handleRezMerchantInventorySignal,
  type RezMerchantInventoryPayload,
} from './rez-merchant';

import {
  HotelPMSInventoryPayloadSchema,
  validateHotelPMSPayload,
  validateHotelPMSPayloadSafe,
  handleHotelPMSInventorySignal,
  type HotelPMSInventoryPayload,
} from './hotel-pms';

// Import common module types
import type {
  WebhookHandlerContext as CommonWebhookHandlerContext,
  WebhookHandlerResult as CommonWebhookHandlerResult,
} from './common';

export {
  mapSeverityToDB,
  mapSignalTypeToDB,
  createHandlerClient,
  insertInventorySignal,
  insertEventRecord,
  handleError,
} from './common';

// Re-export common types
export type {
  WebhookHandlerContext,
  WebhookHandlerResult,
} from './common';

// Re-export all types and functions from individual handlers
export {
  // RestoPapa
  RestoPapaInventoryPayloadSchema,
  validateRestoPapaPayload,
  validateRestoPapaPayloadSafe,
  handleRestoPapaInventorySignal,
  type RestoPapaInventoryPayload,
  // ReZ Merchant
  RezMerchantInventoryPayloadSchema,
  validateRezMerchantPayload,
  validateRezMerchantPayloadSafe,
  handleRezMerchantInventorySignal,
  type RezMerchantInventoryPayload,
  // Hotel PMS
  HotelPMSInventoryPayloadSchema,
  validateHotelPMSPayload,
  validateHotelPMSPayloadSafe,
  handleHotelPMSInventorySignal,
  type HotelPMSInventoryPayload,
};

/**
 * Supported webhook sources
 */
export type WebhookSource = 'restopapa' | 'rez-merchant' | 'hotel-pms';

/**
 * Supported webhook event types
 */
export type WebhookEventType = 'inventory.signal.received';

/**
 * Unified handler context for all webhook sources
 * Uses the same interface as WebhookHandlerContext from common
 */
export type UnifiedHandlerContext = CommonWebhookHandlerContext;

/**
 * Result of dispatching a webhook to its handler
 */
export interface DispatchResult {
  success: boolean;
  source: WebhookSource;
  eventType: WebhookEventType;
  signalId?: string;
  eventId?: string;
  error?: string;
  validationError?: z.ZodError;
}

/**
 * Unified payload type for all supported webhook payloads
 */
export type UnifiedWebhookPayload =
  | RestoPapaInventoryPayload
  | RezMerchantInventoryPayload
  | HotelPMSInventoryPayload;

/**
 * Schema to identify the source and event type of a webhook
 */
export const WebhookIdentificationSchema = z.object({
  event: z.string(),
  merchantId: z.string().optional(),
  department: z.string().optional(),
  itemId: z.string().optional(),
  productId: z.string().optional(),
});

/**
 * Identifies the source of a webhook based on its payload structure
 */
export function identifyWebhookSource(payload: unknown): {
  source: WebhookSource | null;
  eventType: WebhookEventType | null;
} {
  const identification = WebhookIdentificationSchema.safeParse(payload);

  if (!identification.success) {
    return { source: null, eventType: null };
  }

  const data = identification.data;

  // RestoPapa has productId and uses 'inventory.signal.received'
  if (data.productId && data.event === 'inventory.signal.received') {
    // Check if it's RestoPapa or ReZ Merchant by checking for department
    if (data.department) {
      // Hotel PMS has department field
      return { source: 'hotel-pms', eventType: 'inventory.signal.received' };
    }
    // RestoPapa and ReZ Merchant both use productId
    // We distinguish them by checking the URL/context in the dispatcher
    // For now, we'll use a heuristic: if no sku field, it's likely RestoPapa
    // This should be determined at the API route level based on the endpoint
    return { source: null, eventType: null };
  }

  return { source: null, eventType: null };
}

/**
 * Dispatch a webhook to the appropriate handler based on source and payload
 *
 * @param source - The webhook source ('restopapa', 'rez-merchant', 'hotel-pms')
 * @param eventType - The event type (e.g., 'inventory.signal.received')
 * @param payload - The webhook payload
 * @param context - Database connection context
 * @returns Result of the webhook processing
 */
export async function dispatchWebhook(
  source: WebhookSource,
  eventType: WebhookEventType,
  payload: unknown,
  context: UnifiedHandlerContext
): Promise<DispatchResult> {
  const baseResult: Omit<DispatchResult, 'validationError'> = {
    success: false,
    source,
    eventType,
  };

  try {
    switch (source) {
      case 'restopapa': {
        if (eventType !== 'inventory.signal.received') {
          return {
            ...baseResult,
            success: false,
            error: `Unsupported event type '${eventType}' for source 'restopapa'`,
          };
        }

        const validation = validateRestoPapaPayloadSafe(payload);
        if (!validation.success) {
          return {
            ...baseResult,
            success: false,
            error: 'Payload validation failed',
            validationError: validation.error,
          };
        }

        const handlerContext: CommonWebhookHandlerContext = {
          supabaseUrl: context.supabaseUrl,
          supabaseServiceKey: context.supabaseServiceKey,
        };

        const result = await handleRestoPapaInventorySignal(validation.data, handlerContext);
        return {
          ...baseResult,
          success: result.success,
          signalId: result.signalId,
          eventId: result.eventId,
          error: result.error,
        };
      }

      case 'rez-merchant': {
        if (eventType !== 'inventory.signal.received') {
          return {
            ...baseResult,
            success: false,
            error: `Unsupported event type '${eventType}' for source 'rez-merchant'`,
          };
        }

        const validation = validateRezMerchantPayloadSafe(payload);
        if (!validation.success) {
          return {
            ...baseResult,
            success: false,
            error: 'Payload validation failed',
            validationError: validation.error,
          };
        }

        const handlerContext: CommonWebhookHandlerContext = {
          supabaseUrl: context.supabaseUrl,
          supabaseServiceKey: context.supabaseServiceKey,
        };

        const result = await handleRezMerchantInventorySignal(validation.data, handlerContext);
        return {
          ...baseResult,
          success: result.success,
          signalId: result.signalId,
          eventId: result.eventId,
          error: result.error,
        };
      }

      case 'hotel-pms': {
        if (eventType !== 'inventory.signal.received') {
          return {
            ...baseResult,
            success: false,
            error: `Unsupported event type '${eventType}' for source 'hotel-pms'`,
          };
        }

        const validation = validateHotelPMSPayloadSafe(payload);
        if (!validation.success) {
          return {
            ...baseResult,
            success: false,
            error: 'Payload validation failed',
            validationError: validation.error,
          };
        }

        const handlerContext: CommonWebhookHandlerContext = {
          supabaseUrl: context.supabaseUrl,
          supabaseServiceKey: context.supabaseServiceKey,
        };

        const result = await handleHotelPMSInventorySignal(validation.data, handlerContext);
        return {
          ...baseResult,
          success: result.success,
          signalId: result.signalId,
          eventId: result.eventId,
          error: result.error,
        };
      }

      default:
        return {
          ...baseResult,
          success: false,
          error: `Unknown webhook source '${source}'`,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error dispatching webhook for source '${source}':`, message);
    return {
      ...baseResult,
      success: false,
      error: message,
    };
  }
}

/**
 * Typed dispatcher functions for specific sources
 */
export const dispatchRestoPapaWebhook = async (
  payload: unknown,
  context: UnifiedHandlerContext
): Promise<DispatchResult> => {
  return dispatchWebhook('restopapa', 'inventory.signal.received', payload, context);
};

export const dispatchRezMerchantWebhook = async (
  payload: unknown,
  context: UnifiedHandlerContext
): Promise<DispatchResult> => {
  return dispatchWebhook('rez-merchant', 'inventory.signal.received', payload, context);
};

export const dispatchHotelPMSWebhook = async (
  payload: unknown,
  context: UnifiedHandlerContext
): Promise<DispatchResult> => {
  return dispatchWebhook('hotel-pms', 'inventory.signal.received', payload, context);
};
