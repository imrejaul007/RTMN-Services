/**
 * @nextabizz/webhook-sdk
 *
 * A comprehensive webhook SDK for handling inventory signals from multiple sources:
 * - RestoPapa
 * - ReZ Merchant
 * - Hotel PMS
 */

// Verify signature exports
export {
  verifyWebhookSignature,
  verifyWebhookSignatureDetailed,
  createWebhookSignature,
  type WebhookVerificationOptions,
  type HeadersRecord,
  type VerificationResult,
} from './verify';

// Handler exports
export {
  // Common utilities
  mapSeverityToDB,
  mapSignalTypeToDB,
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
  // Dispatcher
  dispatchWebhook,
  dispatchRestoPapaWebhook,
  dispatchRezMerchantWebhook,
  dispatchHotelPMSWebhook,
  type WebhookSource,
  type WebhookEventType,
  type UnifiedHandlerContext,
  type WebhookHandlerContext,
  type WebhookHandlerResult,
  type DispatchResult,
  type UnifiedWebhookPayload,
  identifyWebhookSource,
} from './handlers';

// Types exports
export type { WebhookPayload, WebhookHandler } from './types';

// Sender exports (for sending webhooks to external services)
export {
  sendReorderSignalToRezMerchant,
  buildReorderSignalPayload,
  createSenderSignature,
  type RezMerchantWebhookPayload,
  type WebhookSendResult,
} from './sender';
