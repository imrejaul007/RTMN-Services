/**
 * Webhook Processor - Universal webhook handler for all partners
 *
 * Handles:
 * - Signature verification
 * - Event routing
 * - Handler execution
 * - Error handling
 */

import { z } from 'zod';
import {
  verifyWebhookSignature,
  verifyWebhookSignatureDetailed,
  type HeadersRecord,
} from '@rez/webhook-sdk';
import { PartnerRegistry } from './registry';
import type { EventHandler, WebhookPayload, WebhookProcessingResult } from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface WebhookProcessorConfig {
  /** Partner registry instance */
  registry: PartnerRegistry;
  /** Whether to require signature verification */
  requireSignature?: boolean;
  /** Timestamp tolerance in seconds */
  timestampTolerance?: number;
  /** Default secret for development */
  defaultSecret?: string;
}

// ============================================================================
// Handler Registry
// ============================================================================

export class HandlerRegistry {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Register an event handler
   */
  register(handler: EventHandler): void {
    for (const eventType of handler.eventTypes) {
      const existing = this.handlers.get(eventType) || [];
      existing.push(handler);
      // Sort by priority (lower = higher priority)
      existing.sort((a, b) => (a.priority || 100) - (b.priority || 100));
      this.handlers.set(eventType, existing);
    }
  }

  /**
   * Unregister a handler by ID
   */
  unregister(handlerId: string): void {
    for (const [eventType, handlers] of this.handlers.entries()) {
      const filtered = handlers.filter(h => h.id !== handlerId);
      if (filtered.length === 0) {
        this.handlers.delete(eventType);
      } else {
        this.handlers.set(eventType, filtered);
      }
    }
  }

  /**
   * Get handlers for an event type
   */
  getHandlers(eventType: string): EventHandler[] {
    return this.handlers.get(eventType) || [];
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// ============================================================================
// Webhook Processor
// ============================================================================

export class WebhookProcessor {
  private registry: PartnerRegistry;
  private handlers: HandlerRegistry;
  private requireSignature: boolean;
  private timestampTolerance: number;
  private defaultSecret?: string;

  constructor(config: WebhookProcessorConfig) {
    this.registry = config.registry;
    this.handlers = new HandlerRegistry();
    this.requireSignature = config.requireSignature ?? true;
    this.timestampTolerance = config.timestampTolerance ?? 300;
    this.defaultSecret = config.defaultSecret;
  }

  /**
   * Get handler registry for adding custom handlers
   */
  getHandlerRegistry(): HandlerRegistry {
    return this.handlers;
  }

  /**
   * Process a webhook request
   */
  async processWebhook(
    rawBody: string,
    headers: HeadersRecord,
    webhookPath: string
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      // Get connector config
      const connector = this.registry.getConnectorByPath(webhookPath);
      if (!connector) {
        return {
          success: false,
          handlersExecuted: 0,
          error: `Unknown webhook path: ${webhookPath}`,
        };
      }

      // Get partner connection for this webhook
      const source = this.extractHeader(headers, 'x-source') || connector.id;
      const connections = await this.registry.getConnectionsByPartnerId(source);
      const connection = connections.find(c => c.status === 'active');

      // Verify signature
      const secret = connection?.webhookSecret || this.defaultSecret;
      if (this.requireSignature && secret) {
        const verification = verifyWebhookSignatureDetailed(rawBody, headers, {
          secret,
          toleranceSeconds: this.timestampTolerance,
        });

        if (!verification.valid) {
          return {
            success: false,
            handlersExecuted: 0,
            error: verification.error || 'Invalid signature',
          };
        }
      }

      // Parse payload
      const body = JSON.parse(rawBody);
      const eventType = this.extractHeader(headers, 'x-event-type') ||
        (typeof body === 'object' && body !== null && 'type' in body ? String(body.type) : 'unknown');

      const payload: WebhookPayload = {
        rawBody,
        body,
        headers,
        source,
        eventType,
        timestamp: this.extractHeader(headers, 'x-timestamp') || new Date().toISOString(),
      };

      // Get handlers for this event type
      const eventHandlers = this.handlers.getHandlers(eventType);
      if (eventHandlers.length === 0) {
        // No handlers - just acknowledge
        await this.registry.updateLastSync(connection?.id || '');
        return {
          success: true,
          handlersExecuted: 0,
          details: { eventType, acknowledged: true },
        };
      }

      // Execute handlers
      let handlersExecuted = 0;
      for (const handler of eventHandlers) {
        try {
          await handler.handle({
            specversion: '1.0',
            id: crypto.randomUUID(),
            source,
            type: eventType as any,
            time: payload.timestamp,
            datacontenttype: 'application/json',
            data: body,
          });
          handlersExecuted++;

          if (handler.stopPropagation) break;
        } catch (error) {
          console.error(`Handler ${handler.id} failed:`, error);
          // Continue with other handlers unless this is critical
        }
      }

      // Update last sync
      await this.registry.updateLastSync(connection?.id || '');

      return {
        success: true,
        handlersExecuted,
        details: {
          eventType,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        handlersExecuted: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Express route handler factory
   */
  createExpressHandler(webhookPath: string) {
    return async (
      req: { body: string; headers: HeadersRecord },
      res: { status: (code: number) => { json: (data: object) => void } }
    ) => {
      const result = await this.processWebhook(
        req.body,
        req.headers,
        webhookPath
      );

      if (result.success) {
        res.status(200).json({ success: true, ...result });
      } else {
        res.status(400).json({ success: false, ...result });
      }
    };
  }

  /**
   * Next.js API route handler
   */
  createNextHandler(webhookPath: string) {
    return async (req: Request) => {
      const rawBody = await req.text();
      const headers: HeadersRecord = {};
      req.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const result = await this.processWebhook(rawBody, headers, webhookPath);

      return Response.json(result, {
        status: result.success ? 200 : 400,
      });
    };
  }

  private extractHeader(headers: HeadersRecord, name: string): string | undefined {
    const value = headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }
}

// ============================================================================
// Pre-built Handlers
// ============================================================================

/**
 * Creates a handler for inventory signals
 */
export function createInventorySignalHandler(
  handler: (data: {
    source: string;
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
  }) => Promise<{ signalId: string }>
): EventHandler {
  return {
    id: 'inventory-signal-handler',
    eventTypes: [
      'inventory.low_stock',
      'inventory.out_of_stock',
      'inventory.updated',
      'demand.inventory.low',
      'demand.inventory.out',
    ],
    priority: 10,
    handle: async (event) => {
      const data = event.data as Record<string, unknown>;
      const result = await handler({
        source: event.source,
        productId: String(data.productId || data.sourceProductId),
        productName: String(data.productName || data.name),
        currentStock: Number(data.currentStock || data.stock),
        threshold: Number(data.threshold || data.reorderLevel || 0),
      });
      return {
        success: true,
        action: 'signal_created',
        entityId: result.signalId,
      };
    },
  };
}

/**
 * Creates a handler for order events
 */
export function createOrderHandler(
  handler: (data: {
    source: string;
    orderId: string;
    orderNumber: string;
    status: string;
    total: number;
  }) => Promise<void>
): EventHandler {
  return {
    id: 'order-event-handler',
    eventTypes: [
      'order.created',
      'order.status_changed',
      'supply.po.created',
      'supply.po.confirmed',
      'supply.po.shipped',
      'supply.po.delivered',
    ],
    priority: 20,
    handle: async (event) => {
      const data = event.data as Record<string, unknown>;
      await handler({
        source: event.source,
        orderId: String(data.orderId || data.id),
        orderNumber: String(data.orderNumber || data.order_id || ''),
        status: String(data.status || data.newStatus),
        total: Number(data.total || data.amount || 0),
      });
      return {
        success: true,
        action: 'order_processed',
      };
    },
  };
}

/**
 * Creates a handler for RFQ events
 */
export function createRFQHandler(
  handler: (data: {
    source: string;
    rfqId: string;
    rfqNumber: string;
    status: string;
    priority: string;
  }) => Promise<void>
): EventHandler {
  return {
    id: 'rfq-event-handler',
    eventTypes: [
      'rfq.created',
      'rfq.quoted',
      'rfq.awarded',
      'supply.rfq.created',
      'supply.rfq.quoted',
      'supply.rfq.awarded',
    ],
    priority: 15,
    handle: async (event) => {
      const data = event.data as Record<string, unknown>;
      await handler({
        source: event.source,
        rfqId: String(data.rfqId || data.id),
        rfqNumber: String(data.rfqNumber || data.rfq_number || ''),
        status: String(data.status),
        priority: String(data.priority || 'medium'),
      });
      return {
        success: true,
        action: 'rfq_processed',
      };
    },
  };
}
