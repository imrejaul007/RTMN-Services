/**
 * Webhook SDK Types
 */

// ============================================================================
// Partner Types
// ============================================================================

export type PartnerSource =
  | 'restopapa'
  | 'rez-merchant'
  | 'hotel-pms'
  | 'nexha-distribution'
  | 'nexha-franchise'
  | 'nexha-manufacturing'
  | 'rez-intelligence'
  | 'rez-media'
  | 'rtnm-finance';

export interface WebhookEvent<T = unknown> {
  id: string;
  source: PartnerSource;
  type: string;
  timestamp: string;
  data: T;
  metadata?: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  attempts: number;
  lastAttempt: string;
  error?: string;
}

// ============================================================================
// Handler Types
// ============================================================================

export interface WebhookHandler<T = unknown> {
  source: PartnerSource;
  eventTypes: string[];
  handle: (event: WebhookEvent<T>) => Promise<void>;
  validate?: (payload: unknown) => boolean;
}

export interface WebhookHandlerResult {
  success: boolean;
  action?: string;
  entityId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Registry Types
// ============================================================================

export interface PartnerConnection {
  id: string;
  partnerSource: PartnerSource;
  webhookUrl: string;
  webhookSecret: string;
  isActive: boolean;
  lastSyncAt?: Date;
  lastError?: string;
}

export interface WebhookRegistry {
  registerHandler(handler: WebhookHandler): void;
  unregisterHandler(source: PartnerSource): void;
  getHandler(source: PartnerSource): WebhookHandler | undefined;
  getAllHandlers(): WebhookHandler[];
}
