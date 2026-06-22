/**
 * RestoPapa Integration
 *
 * A comprehensive integration for connecting ReZ with RestoPapa restaurant
 * inventory management system. This module provides:
 *
 * - REST API client for RestoPapa
 * - Webhook handlers for real-time events
 * - Sync engine for inventory, orders, and maintenance
 * - RFQ auto-creation from low stock alerts
 *
 * @example
 * ```typescript
 * import {
 *   RestoPapaClient,
 *   createRestoPapaClient,
 *   RestoPapaSyncEngine,
 *   createSyncEngine,
 *   handleRestoPapaWebhook,
 * } from '@nextabizz/restopapa';
 * ```
 */

// Types
export * from './types';

// Client
export {
  RestoPapaClient,
  createRestoPapaClient,
  verifyRestoPapaWebhookSignature,
  verifyRestoPapaWebhook,
  getWebhookTimestamp,
} from './client';

// Webhook Handler
export {
  handleRestoPapaWebhook,
  getConnectionByMerchantId,
  getConnectionById,
  type WebhookHandlerContext,
  type WebhookHandlerResult,
} from './webhook-handler';

// Sync Engine
export {
  RestoPapaSyncEngine,
  createSyncEngine,
  type SyncEngineOptions,
} from './sync-engine';
