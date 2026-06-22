/**
 * Hotel PMS Integration Package
 *
 * Integration module for connecting Hotel Property Management Systems
 * with NEXABIZZ for maintenance requests and service RFQs.
 */

// Types
export * from './types';

// Client
export {
  HotelPMSClient,
  createHotelPMSClient,
  createHotelPMSClientFromCredentials,
  mapMaintenanceRequestToServiceRequest,
} from './client';

// Webhook Handler
export {
  verifyHotelPMSWebhookSignature,
  verifyWebhook,
  parseMaintenanceWebhook,
  parseLaundryWebhook,
  detectWebhookEvent,
  dispatchWebhook,
  handleMaintenanceCreated,
  handleMaintenanceUpdated,
  handleMaintenanceCompleted,
  handleMaintenanceCancelled,
  handleLaundryPickupScheduled,
  handleLaundryDeliveryCompleted,
} from './webhook-handler';

// Sync Engine
export {
  HotelPMSSyncEngine,
  HotelLaundrySyncEngine,
  createSyncEngine,
  createLaundrySyncEngine,
} from './sync-engine';
