/**
 * REZ Merchant Integration
 *
 * Integration module for REZ Merchant API
 * Supports inventory fetching, RFQ generation, maintenance needs, and order sync
 */

// Re-export types
export * from './types';

// Re-export client
export {
  createRezMerchantClient,
  createRezMerchantClientFromCredentials,
  mapInventoryItemToNexabizz,
  mapOrderToNexabizz,
  mapMaintenanceRequestToServiceRequest,
  type RezMerchantClientConfig,
} from './client';
export type { RezMerchantConfig, RezMerchantConnection } from './client';

// Re-export webhook handler
export {
  verifyWebhookSignature,
  parseWebhookHeaders,
  validateInventoryWebhookPayload,
  validateOrderWebhookPayload,
  validateMaintenanceWebhookPayload,
  routeWebhook,
  getConnectionWebhookSecret,
  getConnectionByStoreId,
  type WebhookHandlerContext,
  type WebhookHandlerResult,
  type ParsedWebhookHeaders,
} from './webhook-handler';

// Re-export sync engine
export {
  createSyncEngine,
  createSyncEngineFromConnectionId,
  type SyncEngineConfig,
  type SyncProgress,
} from './sync-engine';
