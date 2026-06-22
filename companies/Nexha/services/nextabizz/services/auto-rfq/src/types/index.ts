import { z } from 'zod';

// ============================================
// Auto-RFQ Enums
// ============================================

/**
 * Trigger types that can initiate RFQ generation
 */
export const TriggerTypeSchema = z.enum([
  'low_inventory',
  'scheduled_reorder',
  'contract_renewal',
  'manual',
]);
export type TriggerType = z.infer<typeof TriggerTypeSchema>;

/**
 * Status of an auto-RFQ generation batch
 */
export const AutoRFQBatchStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'partial',
  'failed',
]);
export type AutoRFQBatchStatus = z.infer<typeof AutoRFQBatchStatusSchema>;

/**
 * Urgency level for RFQ generation
 */
export const RFQUrgencySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type RFQUrgency = z.infer<typeof RFQUrgencySchema>;

/**
 * Match strategy for supplier selection
 */
export const SupplierMatchStrategySchema = z.enum([
  'preferred',
  'all_eligible',
  'top_rated',
  'lowest_price',
]);
export type SupplierMatchStrategy = z.infer<typeof SupplierMatchStrategySchema>;

// ============================================
// Trigger Configuration
// ============================================

/**
 * Configuration for low inventory trigger
 */
export interface LowInventoryTriggerConfig {
  /** Minimum stock level to trigger reorder */
  minStockLevel: number;
  /** Reorder point as percentage of max stock (0-100) */
  reorderPointPercent: number;
  /** Days of inventory buffer to order for */
  daysOfBuffer: number;
  /** Whether to auto-generate RFQ or just create signal */
  autoGenerateRFQ: boolean;
}

/**
 * Configuration for scheduled reorder trigger
 */
export interface ScheduledReorderConfig {
  /** Cron expression for reorder schedule */
  scheduleCron: string;
  /** Whether to auto-generate RFQ or just create signal */
  autoGenerateRFQ: boolean;
  /** List of category IDs to include (empty = all) */
  categoryFilters: string[];
}

/**
 * Configuration for contract renewal trigger
 */
export interface ContractRenewalConfig {
  /** Days before contract expiry to trigger RFQ */
  daysBeforeExpiry: number;
  /** Whether to auto-renew or create RFQ for review */
  autoRenew: boolean;
  /** Contract types to monitor */
  contractTypes: string[];
}

/**
 * Master trigger configuration for auto-RFQ
 */
export interface AutoRFQTriggerConfig {
  /** Unique configuration identifier */
  id: string;
  /** Merchant this config belongs to */
  merchantId: string;
  /** Enable/disable the entire auto-RFQ system */
  enabled: boolean;
  /** Low inventory trigger settings */
  lowInventory: LowInventoryTriggerConfig;
  /** Scheduled reorder trigger settings */
  scheduledReorder: ScheduledReorderConfig;
  /** Contract renewal trigger settings */
  contractRenewal: ContractRenewalConfig;
  /** Default supplier match strategy */
  defaultMatchStrategy: SupplierMatchStrategy;
  /** Number of days before RFQ expires */
  rfqExpirationDays: number;
  /** Notification settings */
  notifications: NotificationConfig;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  /** Notify buyer when RFQ is auto-generated */
  notifyOnAutoGenerate: boolean;
  /** Notify buyer when RFQ is ready for review */
  notifyOnReady: boolean;
  /** Notify on RFQ response received */
  notifyOnResponse: boolean;
  /** Notify on RFQ expiration */
  notifyOnExpiration: boolean;
  /** Email addresses to notify (in addition to assigned buyer) */
  additionalEmailRecipients: string[];
}

// ============================================
// Trigger Events & Signals
// ============================================

/**
 * An event that triggered RFQ generation check
 */
export interface TriggerEvent {
  /** Unique event identifier */
  id: string;
  /** Type of trigger */
  triggerType: TriggerType;
  /** Associated merchant */
  merchantId: string;
  /** Entity that triggered (e.g., product ID, contract ID) */
  sourceId: string;
  /** Source type (e.g., 'product', 'contract') */
  sourceType: string;
  /** Current value at time of trigger */
  currentValue: number;
  /** Threshold that was breached */
  threshold: number;
  /** Urgency level determined */
  urgency: RFQUrgency;
  /** Timestamp of trigger */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of matching suppliers to a trigger
 */
export interface SupplierMatch {
  /** Supplier identifier */
  supplierId: string;
  /** Supplier business name */
  supplierName: string;
  /** Match confidence score (0-100) */
  confidence: number;
  /** Reason for match */
  matchReason: string;
  /** Estimated lead time in days */
  estimatedLeadTime?: number;
  /** Is this a preferred supplier */
  isPreferred: boolean;
  /** Supplier rating (0-5) */
  rating?: number;
}

// ============================================
// RFQ Generation
// ============================================

/**
 * Input for generating an RFQ
 */
export interface RFQGenerationInput {
  /** Merchant requesting the RFQ */
  merchantId: string;
  /** Product or item name */
  title: string;
  /** Detailed description */
  description?: string;
  /** Product category */
  category?: string;
  /** Quantity needed */
  quantity: number;
  /** Unit of measurement */
  unit: string;
  /** Target price per unit (optional) */
  targetPrice?: number;
  /** Desired delivery date */
  deliveryDeadline?: Date;
  /** Trigger that initiated this RFQ */
  triggerType: TriggerType;
  /** Source entity ID */
  sourceId: string;
  /** Matched suppliers */
  matchedSuppliers: SupplierMatch[];
  /** Urgency level */
  urgency: RFQUrgency;
}

/**
 * Result of generating a single RFQ
 */
export interface RFQGenerationResult {
  /** Whether generation was successful */
  success: boolean;
  /** Generated RFQ ID (if successful) */
  rfqId?: string;
  /** RFQ number (if successful) */
  rfqNumber?: string;
  /** Error message (if failed) */
  error?: string;
  /** Error code (if failed) */
  errorCode?: string;
  /** Supplier matches that were used */
  matchedSuppliers: SupplierMatch[];
  /** Generation timestamp */
  generatedAt: Date;
}

// ============================================
// Batch Generation
// ============================================

/**
 * Batch generation request
 */
export interface BatchGenerationRequest {
  /** Merchant ID */
  merchantId: string;
  /** Trigger type to process */
  triggerType: TriggerType;
  /** Optional: specific source IDs to process */
  sourceIds?: string[];
  /** Override default supplier match strategy */
  matchStrategy?: SupplierMatchStrategy;
  /** Generate RFQs in dry-run mode */
  dryRun?: boolean;
}

/**
 * Result of batch RFQ generation
 */
export interface BatchGenerationResult {
  /** Unique batch identifier */
  batchId: string;
  /** Overall batch status */
  status: AutoRFQBatchStatus;
  /** Merchant this batch belongs to */
  merchantId: string;
  /** Trigger type that initiated the batch */
  triggerType: TriggerType;
  /** Total number of items processed */
  totalProcessed: number;
  /** Number of successful RFQs */
  successful: number;
  /** Number of failed RFQs */
  failed: number;
  /** Individual RFQ results */
  results: RFQGenerationResult[];
  /** Errors encountered (if any) */
  errors: Array<{ sourceId: string; error: string; errorCode?: string }>;
  /** Batch started at */
  startedAt: Date;
  /** Batch completed at */
  completedAt?: Date;
  /** Total duration in ms */
  durationMs?: number;
}

// ============================================
// Generation History
// ============================================

/**
 * History record for RFQ generation
 */
export interface GenerationHistoryRecord {
  /** Unique history identifier */
  id: string;
  /** Batch ID (if batched) or individual RFQ ID */
  batchId?: string;
  /** Generated RFQ ID */
  rfqId: string;
  /** RFQ number */
  rfqNumber: string;
  /** Merchant ID */
  merchantId: string;
  /** Trigger type */
  triggerType: TriggerType;
  /** RFQ title */
  rfqTitle: string;
  /** Quantity requested */
  quantity: number;
  /** Unit */
  unit: string;
  /** Number of suppliers matched */
  suppliersMatched: number;
  /** Status of the RFQ at time of history record */
  rfqStatus: string;
  /** Buyer notified */
  buyerNotified: boolean;
  /** Generated timestamp */
  generatedAt: Date;
  /** Any additional notes */
  notes?: string;
}

/**
 * Paginated history query
 */
export interface HistoryQuery {
  /** Merchant ID (required) */
  merchantId: string;
  /** Page number */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Filter by trigger type */
  triggerType?: TriggerType;
  /** Filter by date range start */
  startDate?: Date;
  /** Filter by date range end */
  endDate?: Date;
  /** Filter by status */
  status?: string;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Update trigger configuration request
 */
export const UpdateTriggerConfigRequestSchema = z.object({
  enabled: z.boolean().optional(),
  lowInventory: z.object({
    minStockLevel: z.number().positive().optional(),
    reorderPointPercent: z.number().min(0).max(100).optional(),
    daysOfBuffer: z.number().int().positive().optional(),
    autoGenerateRFQ: z.boolean().optional(),
  }).optional(),
  scheduledReorder: z.object({
    scheduleCron: z.string().optional(),
    autoGenerateRFQ: z.boolean().optional(),
    categoryFilters: z.array(z.string()).optional(),
  }).optional(),
  contractRenewal: z.object({
    daysBeforeExpiry: z.number().int().positive().optional(),
    autoRenew: z.boolean().optional(),
    contractTypes: z.array(z.string()).optional(),
  }).optional(),
  defaultMatchStrategy: SupplierMatchStrategySchema.optional(),
  rfqExpirationDays: z.number().int().positive().optional(),
  notifications: z.object({
    notifyOnAutoGenerate: z.boolean().optional(),
    notifyOnReady: z.boolean().optional(),
    notifyOnResponse: z.boolean().optional(),
    notifyOnExpiration: z.boolean().optional(),
    additionalEmailRecipients: z.array(z.string().email()).optional(),
  }).optional(),
});

export type UpdateTriggerConfigRequest = z.infer<typeof UpdateTriggerConfigRequestSchema>;

/**
 * Manual generation request
 */
export const ManualGenerationRequestSchema = z.object({
  merchantId: z.string().uuid(),
  triggerType: TriggerTypeSchema,
  sourceIds: z.array(z.string()).optional(),
  matchStrategy: SupplierMatchStrategySchema.optional(),
  dryRun: z.boolean().optional(),
});

export type ManualGenerationRequest = z.infer<typeof ManualGenerationRequestSchema>;

/**
 * Get configuration response
 */
export interface GetConfigResponse {
  success: boolean;
  data?: AutoRFQTriggerConfig;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Update configuration response
 */
export interface UpdateConfigResponse {
  success: boolean;
  data?: AutoRFQTriggerConfig;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Generate RFQ response
 */
export interface GenerateRFQResponse {
  success: boolean;
  data?: BatchGenerationResult;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Get history response
 */
export interface GetHistoryResponse {
  success: boolean;
  data?: {
    items: GenerationHistoryRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// Service Interface
// ============================================

/**
 * Auto-RFQ Service interface
 */
export interface IAutoRFQService {
  /**
   * Get trigger configuration for a merchant
   */
  getConfig(merchantId: string): Promise<AutoRFQTriggerConfig | null>;

  /**
   * Update trigger configuration
   */
  updateConfig(
    merchantId: string,
    config: Partial<AutoRFQTriggerConfig>
  ): Promise<AutoRFQTriggerConfig>;

  /**
   * Process a specific trigger type and generate RFQs
   */
  processTriggers(
    request: BatchGenerationRequest
  ): Promise<BatchGenerationResult>;

  /**
   * Get generation history for a merchant
   */
  getHistory(query: HistoryQuery): Promise<{
    items: GenerationHistoryRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Check if a product should trigger RFQ generation
   */
  checkInventoryTrigger(
    merchantId: string,
    productId: string,
    currentStock: number,
    maxStock: number
  ): Promise<TriggerEvent | null>;

  /**
   * Match suppliers for a given trigger
   */
  matchSuppliers(
    merchantId: string,
    category: string,
    strategy: SupplierMatchStrategy
  ): Promise<SupplierMatch[]>;
}
