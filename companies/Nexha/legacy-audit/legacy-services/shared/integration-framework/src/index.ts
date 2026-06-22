/**
 * @rez/integration-framework - Universal Integration Framework
 *
 * Connect any partner to the REZ ecosystem with a unified interface.
 *
 * @example
 * ```typescript
 * import { createIntegration, registerPartner } from '@rez/integration-framework';
 *
 * // Create integration instance
 * const integration = createIntegration({
 *   db: supabaseClient,
 *   eventBus: eventBus
 * });
 *
 * // Register a partner
 * await integration.registerPartner({
 *   id: 'restopapa',
 *   name: 'RestoPapa',
 *   category: 'restaurant',
 *   webhookPath: '/webhooks/restopapa',
 *   events: ['inventory.*', 'order.*']
 * });
 *
 * // Add handlers
 * integration.on('inventory.*', async (event) => {
 *   await processInventorySignal(event);
 * });
 * ```
 */

// Registry
export {
  PartnerRegistry,
  getPartnerRegistry,
  setPartnerRegistry,
  type RegistryOptions,
  type PartnerDatabase,
  type EventBus,
} from './registry.js';

// Webhook Processor
export {
  WebhookProcessor,
  HandlerRegistry,
  createInventorySignalHandler,
  createOrderHandler,
  createRFQHandler,
  type WebhookProcessorConfig,
} from './webhook-processor.js';

// Types
export type {
  PartnerConnection,
  PartnerCategory,
  IntegrationStatus,
  EventHandler,
  EventHandlerResult,
  SyncConfig,
  SyncJob,
  SyncError,
  WebhookPayload,
  WebhookProcessingResult,
  EntityMapping,
  MappedEntity,
  ConnectorConfig,
} from './types.js';


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'integration-framework',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
