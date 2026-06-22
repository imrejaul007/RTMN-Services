/**
 * Event Emitter Module
 *
 * Provides event emission utilities for the Inventory → Reorder closed loop.
 * This module should be integrated into rez-merchant-service to emit
 * inventory.low events when stock levels fall below thresholds.
 *
 * Usage in rez-merchant-service:
 *
 *   import { InventoryEventEmitter, createEmitter } from './emitter';
 *
 *   const emitter = createEmitter({
 *     eventPlatformUrl: process.env.EVENT_PLATFORM_URL,
 *     serviceToken: process.env.EVENT_PLATFORM_SERVICE_TOKEN,
 *   });
 *
 *   // When inventory drops below threshold
 *   await emitter.emitInventoryLow({
 *     productId: 'prod_123',
 *     sku: 'SKU-12345',
 *     currentStock: 5,
 *     reorderPoint: 20,
 *     tenantId: 'tenant_456',
 *   });
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface InventoryLowPayload {
  productId: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  preferredSupplierId?: string;
  suggestedQuantity?: number;
  tenantId: string;
}

export interface InventoryLowEvent {
  eventId: string;
  eventType: 'inventory.low';
  timestamp: string;
  source: 'rez-merchant-service';
  tenantId: string;
  payload: InventoryLowPayload;
}

export interface EmitterConfig {
  eventPlatformUrl: string;
  serviceToken: string;
  retryAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

export interface EmitterResult {
  success: boolean;
  eventId: string;
  eventType: string;
  timestamp: string;
  error?: string;
}

export interface EmitOptions {
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Event Emitter Class
// ============================================================================

export class InventoryEventEmitter {
  private readonly config: Required<EmitterConfig>;
  private readonly metrics: EmitterMetrics;

  constructor(config: EmitterConfig) {
    this.config = {
      retryAttempts: 3,
      retryDelayMs: 1000,
      timeoutMs: 10000,
      ...config,
    };
    this.metrics = {
      eventsEmitted: 0,
      eventsSucceeded: 0,
      eventsFailed: 0,
      totalLatencyMs: 0,
    };
  }

  /**
   * Emit an inventory.low event to the Event Platform
   */
  async emitInventoryLow(
    payload: InventoryLowPayload,
    options: EmitOptions = {}
  ): Promise<EmitterResult> {
    const event: InventoryLowEvent = {
      eventId: `evt_${uuidv4()}`,
      eventType: 'inventory.low',
      timestamp: new Date().toISOString(),
      source: 'rez-merchant-service',
      tenantId: payload.tenantId,
      payload: {
        productId: payload.productId,
        sku: payload.sku,
        currentStock: payload.currentStock,
        reorderPoint: payload.reorderPoint,
        preferredSupplierId: payload.preferredSupplierId,
        suggestedQuantity: payload.suggestedQuantity,
      },
    };

    return this.emitEvent(event, options);
  }

  /**
   * Emit a generic event to the Event Platform
   */
  async emitEvent<T extends { eventType: string; payload: unknown }>(
    event: { eventId: string; eventType: string; timestamp: string; source: string; tenantId: string; payload: T['payload'] },
    options: EmitOptions = {}
  ): Promise<EmitterResult> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await this.sendEvent(event, options);

        this.metrics.eventsEmitted++;
        this.metrics.eventsSucceeded++;
        this.metrics.totalLatencyMs += Date.now() - startTime;

        return {
          success: true,
          eventId: event.eventId,
          eventType: event.eventType,
          timestamp: event.timestamp,
        };
      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          this.metrics.eventsEmitted++;
          this.metrics.eventsFailed++;

          return {
            success: false,
            eventId: event.eventId,
            eventType: event.eventType,
            timestamp: event.timestamp,
            error: error instanceof Error ? error.message : String(error),
          };
        }

        // Exponential backoff
        await this.delay(this.config.retryDelayMs * Math.pow(2, attempt - 1));
      }
    }

    // Should never reach here
    return {
      success: false,
      eventId: event.eventId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      error: 'Max retry attempts exceeded',
    };
  }

  /**
   * Get emitter metrics
   */
  getMetrics(): Readonly<EmitterMetrics> {
    return { ...this.metrics };
  }

  private async sendEvent(
    event: InventoryLowEvent,
    options: EmitOptions
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.eventPlatformUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.serviceToken}`,
          'X-Correlation-ID': options.correlationId || event.eventId,
          'X-Loop-Id': `loop_${uuidv4()}`,
          ...(options.metadata && { 'X-Event-Metadata': JSON.stringify(options.metadata) }),
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Event Platform returned ${response.status}: ${await response.text()}`);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Metrics Interface
// ============================================================================

interface EmitterMetrics {
  eventsEmitted: number;
  eventsSucceeded: number;
  eventsFailed: number;
  totalLatencyMs: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createEmitter(config: EmitterConfig): InventoryEventEmitter {
  if (!config.eventPlatformUrl) {
    throw new Error('EVENT_PLATFORM_URL is required');
  }
  if (!config.serviceToken) {
    throw new Error('EVENT_PLATFORM_SERVICE_TOKEN is required');
  }
  return new InventoryEventEmitter(config);
}

// ============================================================================
// Integration Helper for rez-merchant-service
// ============================================================================

/**
 * Creates a middleware-compatible inventory monitor that can be integrated
 * into the existing rez-merchant-service inventory management flow.
 */
export function createInventoryMonitor(
  emitter: InventoryEventEmitter,
  options: {
    checkThreshold?: (currentStock: number, reorderPoint: number) => boolean;
    onLowInventory?: (event: InventoryLowEvent) => Promise<void>;
  } = {}
) {
  const {
    checkThreshold = (current, reorder) => current <= reorder,
    onLowInventory,
  } = options;

  return {
    /**
     * Check inventory and emit event if below threshold
     */
    async checkAndEmit(
      productId: string,
      sku: string,
      currentStock: number,
      reorderPoint: number,
      tenantId: string,
      preferredSupplierId?: string
    ): Promise<EmitterResult | null> {
      if (!checkThreshold(currentStock, reorderPoint)) {
        return null;
      }

      const result = await emitter.emitInventoryLow({
        productId,
        sku,
        currentStock,
        reorderPoint,
        preferredSupplierId,
        tenantId,
      });

      if (result.success && onLowInventory) {
        const event: InventoryLowEvent = {
          eventId: result.eventId,
          eventType: 'inventory.low',
          timestamp: result.timestamp,
          source: 'rez-merchant-service',
          tenantId,
          payload: {
            productId,
            sku,
            currentStock,
            reorderPoint,
            preferredSupplierId,
          },
        };
        await onLowInventory(event);
      }

      return result;
    },

    /**
     * Emit a low inventory event directly
     */
    emitLowInventory: (
      payload: InventoryLowPayload
    ): Promise<EmitterResult> => {
      return emitter.emitInventoryLow(payload);
    },
  };
}

// ============================================================================
// Batch Emitter
// ============================================================================

export interface BatchEmitter {
  addToBatch(payload: InventoryLowPayload): void;
  emitBatch(): Promise<EmitterResult[]>;
  clearBatch(): void;
  getBatchSize(): number;
}

export function createBatchEmitter(
  emitter: InventoryEventEmitter,
  maxBatchSize = 100
): BatchEmitter {
  let batch: InventoryLowPayload[] = [];

  return {
    addToBatch(payload: InventoryLowPayload): void {
      if (batch.length >= maxBatchSize) {
        throw new Error(`Batch size limit reached: ${maxBatchSize}`);
      }
      batch.push(payload);
    },

    async emitBatch(): Promise<EmitterResult[]> {
      const results = await Promise.all(
        batch.map((payload) => emitter.emitInventoryLow(payload))
      );
      batch = [];
      return results;
    },

    clearBatch(): void {
      batch = [];
    },

    getBatchSize(): number {
      return batch.length;
    },
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  InventoryEventEmitter,
  createEmitter,
  createInventoryMonitor,
  createBatchEmitter,
};
