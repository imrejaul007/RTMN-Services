import logger from './utils/logger';
import { randomUUID } from 'crypto';

import {
  type IAutoRFQService,
  type AutoRFQTriggerConfig,
  type BatchGenerationRequest,
  type BatchGenerationResult,
  type GenerationHistoryRecord,
  type HistoryQuery,
  type SupplierMatch,
  type SupplierMatchStrategy,
  type TriggerEvent,
  type UpdateTriggerConfigRequest,
  AutoRFQBatchStatus,
  TriggerType,
} from './types/index.js';

import {
  LowInventoryTrigger,
  ScheduledReorderTrigger,
  ContractRenewalTrigger,
  TriggerFactory,
  TriggerEvaluator,
  deduplicateTriggerEvents,
  sortByUrgency,
  filterByMinUrgency,
} from './triggers.js';

import {
  RFQGenerator,
  BatchRFQProcessor,
  SupplierMatcher,
  formatRFQForCreation,
} from './generator.js';

/**
 * Default configuration for auto-RFQ
 */
const DEFAULT_CONFIG: Omit<AutoRFQTriggerConfig, 'id' | 'merchantId' | 'createdAt' | 'updatedAt'> = {
  enabled: true,
  lowInventory: {
    minStockLevel: 10,
    reorderPointPercent: 25,
    daysOfBuffer: 7,
    autoGenerateRFQ: true,
  },
  scheduledReorder: {
    scheduleCron: '0 8 * * 1', // Every Monday at 8 AM
    autoGenerateRFQ: true,
    categoryFilters: [],
  },
  contractRenewal: {
    daysBeforeExpiry: 30,
    autoRenew: false,
    contractTypes: ['supply', 'service', 'maintenance'],
  },
  defaultMatchStrategy: 'preferred',
  rfqExpirationDays: 7,
  notifications: {
    notifyOnAutoGenerate: true,
    notifyOnReady: true,
    notifyOnResponse: true,
    notifyOnExpiration: true,
    additionalEmailRecipients: [],
  },
};

/**
 * Core Auto-RFQ Engine
 * Orchestrates trigger detection, supplier matching, and RFQ generation
 */
export class AutoRFQEngine implements IAutoRFQService {
  private configs: Map<string, AutoRFQTriggerConfig> = new Map();
  private history: GenerationHistoryRecord[] = [];

  constructor(
    private db: DatabaseInterface,
    private notificationService: NotificationService
  ) {}

  // ============================================
  // Configuration Management
  // ============================================

  /**
   * Get trigger configuration for a merchant
   */
  async getConfig(merchantId: string): Promise<AutoRFQTriggerConfig | null> {
    // Try to get from cache first
    const cached = this.configs.get(merchantId);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const config = await this.db.getAutoRFQConfig(merchantId);
    if (config) {
      this.configs.set(merchantId, config);
      return config;
    }

    return null;
  }

  /**
   * Get or create default configuration for a merchant
   */
  async getOrCreateConfig(merchantId: string): Promise<AutoRFQTriggerConfig> {
    const existing = await this.getConfig(merchantId);
    if (existing) {
      return existing;
    }

    // Create default config
    const newConfig: AutoRFQTriggerConfig = {
      ...DEFAULT_CONFIG,
      id: `config_${Date.now()}_${randomUUID().replace(/-/g, '').substring(0, 9)}`,
      merchantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    await this.db.saveAutoRFQConfig(newConfig);
    this.configs.set(merchantId, newConfig);

    return newConfig;
  }

  /**
   * Update trigger configuration
   */
  async updateConfig(
    merchantId: string,
    updates: UpdateTriggerConfigRequest
  ): Promise<AutoRFQTriggerConfig> {
    const current = await this.getOrCreateConfig(merchantId);

    const updated: AutoRFQTriggerConfig = {
      ...current,
      ...updates,
      lowInventory: updates.lowInventory
        ? { ...current.lowInventory, ...updates.lowInventory }
        : current.lowInventory,
      scheduledReorder: updates.scheduledReorder
        ? { ...current.scheduledReorder, ...updates.scheduledReorder }
        : current.scheduledReorder,
      contractRenewal: updates.contractRenewal
        ? { ...current.contractRenewal, ...updates.contractRenewal }
        : current.contractRenewal,
      notifications: updates.notifications
        ? { ...current.notifications, ...updates.notifications }
        : current.notifications,
      updatedAt: new Date(),
    };

    // Save to database
    await this.db.saveAutoRFQConfig(updated);
    this.configs.set(merchantId, updated);

    return updated;
  }

  // ============================================
  // Trigger Processing
  // ============================================

  /**
   * Process triggers and generate RFQs
   */
  async processTriggers(
    request: BatchGenerationRequest
  ): Promise<BatchGenerationResult> {
    const batchId = `batch_${Date.now()}_${randomUUID().replace(/-/g, '').substring(0, 9)}`;
    const startedAt = new Date();

    // Get or create config
    const config = await this.getOrCreateConfig(request.merchantId);

    // Initialize result tracking
    const result: BatchGenerationResult = {
      batchId,
      status: 'pending',
      merchantId: request.merchantId,
      triggerType: request.triggerType,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      results: [],
      errors: [],
      startedAt,
    };

    try {
      result.status = 'processing';

      // Get trigger events based on type
      const events = await this.evaluateTriggers(
        request.merchantId,
        request.triggerType,
        request.sourceIds
      );

      result.totalProcessed = events.length;

      if (events.length === 0) {
        result.status = 'completed';
        result.completedAt = new Date();
        result.durationMs = Date.now() - startedAt.getTime();
        return result;
      }

      // Get matched suppliers for each event
      const strategy = request.matchStrategy || config.defaultMatchStrategy;
      const generator = new RFQGenerator(config);

      // Create inputs for each event
      const inputs = await generator.generateFromTriggers(events, (merchantId, category, strat) =>
        this.matchSuppliers(merchantId, category, strat)
      );

      if (inputs.length === 0) {
        result.status = 'completed';
        result.completedAt = new Date();
        result.durationMs = Date.now() - startedAt.getTime();
        return result;
      }

      // Process batch
      const processor = new BatchRFQProcessor(generator);
      const batchResult = await processor.processBatch(
        inputs,
        async (data) => {
          const rfq = await this.db.createRFQ(data);
          return { id: rfq.id, rfqNumber: rfq.rfqNumber };
        },
        async (rfqIds) => {
          await this.notificationService.notifyBuyers(
            rfqIds,
            request.merchantId,
            config.notifications
          );
        }
      );

      result.successful = batchResult.successful;
      result.failed = batchResult.failed;
      result.results = batchResult.results;
      result.errors = batchResult.errors;

      // Determine overall status
      if (result.failed === 0) {
        result.status = 'completed';
      } else if (result.successful > 0) {
        result.status = 'partial';
      } else {
        result.status = 'failed';
      }

      // Save history records
      await this.saveHistoryRecords(result, config);

      result.completedAt = new Date();
      result.durationMs = Date.now() - startedAt.getTime();

      return result;
    } catch (error) {
      result.status = 'failed';
      result.errors.push({
        sourceId: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BATCH_ERROR',
      });
      result.completedAt = new Date();
      result.durationMs = Date.now() - startedAt.getTime();

      return result;
    }
  }

  /**
   * Evaluate triggers based on type and source IDs
   */
  private async evaluateTriggers(
    merchantId: string,
    triggerType: TriggerType,
    sourceIds?: string[]
  ): Promise<TriggerEvent[]> {
    const config = await this.getOrCreateConfig(merchantId);

    switch (triggerType) {
      case 'low_inventory':
        return this.evaluateLowInventoryTriggers(merchantId, sourceIds, config);

      case 'scheduled_reorder':
        return this.evaluateScheduledReorderTriggers(merchantId, config);

      case 'contract_renewal':
        return this.evaluateContractRenewalTriggers(merchantId, sourceIds, config);

      case 'manual':
        return this.evaluateManualTriggers(merchantId, sourceIds, config);

      default:
        return [];
    }
  }

  /**
   * Evaluate low inventory triggers
   */
  private async evaluateLowInventoryTriggers(
    merchantId: string,
    sourceIds: string[] | undefined,
    config: AutoRFQTriggerConfig
  ): Promise<TriggerEvent[]> {
    const trigger = new LowInventoryTrigger(config.lowInventory);

    // Fetch products from database
    const products = await this.db.getProductsForReorder(
      merchantId,
      config.lowInventory.minStockLevel,
      sourceIds
    );

    const events: TriggerEvent[] = [];

    for (const product of products) {
      const event = trigger.check(
        merchantId,
        product.id,
        product.name,
        product.category,
        product.currentStock,
        product.maxStock,
        product.unit,
        product.averageDailyUsage
      );

      if (event) {
        events.push(event);
      }
    }

    return deduplicateTriggerEvents(events);
  }

  /**
   * Evaluate scheduled reorder triggers
   */
  private async evaluateScheduledReorderTriggers(
    merchantId: string,
    config: AutoRFQTriggerConfig
  ): Promise<TriggerEvent[]> {
    const trigger = new ScheduledReorderTrigger(config.scheduledReorder);

    // Fetch all products for merchant (based on category filters)
    const products = await this.db.getProductsForScheduledReorder(
      merchantId,
      config.scheduledReorder.categoryFilters
    );

    const events: TriggerEvent[] = [];

    for (const product of products) {
      if (trigger.shouldInclude(product.category || '', product.lastOrderedDate)) {
        const event = trigger.createEvent(
          merchantId,
          product.id,
          product.name,
          product.category,
          product.currentStock,
          product.unit,
          product.averageDailyUsage
        );
        events.push(event);
      }
    }

    return sortByUrgency(events);
  }

  /**
   * Evaluate contract renewal triggers
   */
  private async evaluateContractRenewalTriggers(
    merchantId: string,
    sourceIds: string[] | undefined,
    config: AutoRFQTriggerConfig
  ): Promise<TriggerEvent[]> {
    const trigger = new ContractRenewalTrigger(config.contractRenewal);

    // Fetch expiring contracts
    const contracts = await this.db.getExpiringContracts(
      merchantId,
      config.contractRenewal.daysBeforeExpiry,
      sourceIds
    );

    const events: TriggerEvent[] = [];

    for (const contract of contracts) {
      const event = trigger.check(
        merchantId,
        contract.id,
        contract.name,
        contract.type,
        contract.expiryDate,
        contract.lastOrderDate
      );

      if (event) {
        events.push(event);
      }
    }

    return sortByUrgency(events);
  }

  /**
   * Evaluate manual triggers (just process specified source IDs)
   */
  private async evaluateManualTriggers(
    merchantId: string,
    sourceIds: string[] | undefined,
    config: AutoRFQTriggerConfig
  ): Promise<TriggerEvent[]> {
    if (!sourceIds || sourceIds.length === 0) {
      return [];
    }

    // For manual triggers, fetch products by IDs
    const products = await this.db.getProductsByIds(merchantId, sourceIds);

    return products.map((product) => ({
      id: `manual_${Date.now()}_${product.id}`,
      triggerType: 'manual' as TriggerType,
      merchantId,
      sourceId: product.id,
      sourceType: 'product',
      currentValue: product.currentStock,
      threshold: 0,
      urgency: 'medium' as const,
      timestamp: new Date(),
      metadata: {
        productName: product.name,
        category: product.category,
        unit: product.unit,
      },
    }));
  }

  // ============================================
  // Supplier Matching
  // ============================================

  /**
   * Match suppliers for a category
   */
  async matchSuppliers(
    merchantId: string,
    category: string,
    strategy: SupplierMatchStrategy
  ): Promise<SupplierMatch[]> {
    // Get preferred suppliers from database
    const preferredSuppliers = await this.db.getPreferredSuppliers(merchantId, category);

    // Get all eligible suppliers for category
    const eligibleSuppliers = await this.db.getEligibleSuppliers(category);

    // Combine and deduplicate
    const allSuppliers: SupplierMatch[] = [];

    // Add preferred suppliers first
    for (const supplier of preferredSuppliers) {
      allSuppliers.push({
        supplierId: supplier.id,
        supplierName: supplier.businessName,
        confidence: SupplierMatcher.calculateConfidence({
          supplierRating: supplier.rating,
          isPreferred: true,
          hasCategory: true,
          avgDeliveryDays: supplier.avgDeliveryDays,
          requestedDeliveryDays: 7,
        }),
        matchReason: 'Preferred supplier for category',
        estimatedLeadTime: supplier.avgDeliveryDays,
        isPreferred: true,
        rating: supplier.rating,
      });
    }

    // Add other eligible suppliers
    const preferredIds = new Set(preferredSuppliers.map((s) => s.id));
    for (const supplier of eligibleSuppliers) {
      if (preferredIds.has(supplier.id)) {
        continue;
      }

      allSuppliers.push({
        supplierId: supplier.id,
        supplierName: supplier.businessName,
        confidence: SupplierMatcher.calculateConfidence({
          supplierRating: supplier.rating,
          isPreferred: false,
          hasCategory: true,
          avgDeliveryDays: supplier.avgDeliveryDays,
          requestedDeliveryDays: 7,
        }),
        matchReason: 'Eligible supplier for category',
        estimatedLeadTime: supplier.avgDeliveryDays,
        isPreferred: false,
        rating: supplier.rating,
      });
    }

    return allSuppliers;
  }

  // ============================================
  // Inventory Trigger Check
  // ============================================

  /**
   * Check if a product should trigger RFQ generation
   */
  async checkInventoryTrigger(
    merchantId: string,
    productId: string,
    currentStock: number,
    maxStock: number
  ): Promise<TriggerEvent | null> {
    const config = await this.getOrCreateConfig(merchantId);

    if (!config.enabled || !config.lowInventory.autoGenerateRFQ) {
      return null;
    }

    const trigger = new LowInventoryTrigger(config.lowInventory);
    const product = await this.db.getProductById(productId);

    if (!product) {
      return null;
    }

    return trigger.check(
      merchantId,
      productId,
      product.name,
      product.category,
      currentStock,
      maxStock,
      product.unit,
      product.averageDailyUsage
    );
  }

  // ============================================
  // History Management
  // ============================================

  /**
   * Get generation history
   */
  async getHistory(query: HistoryQuery): Promise<{
    items: GenerationHistoryRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Fetch from database
    const result = await this.db.getGenerationHistory(query, limit, offset);

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Save history records from batch result
   */
  private async saveHistoryRecords(
    result: BatchGenerationResult,
    config: AutoRFQTriggerConfig
  ): Promise<void> {
    for (const rfqResult of result.results) {
      if (!rfqResult.success || !rfqResult.rfqId) {
        continue;
      }

      const record: GenerationHistoryRecord = {
        id: `hist_${Date.now()}_${randomUUID().replace(/-/g, '').substring(0, 9)}`,
        batchId: result.batchId,
        rfqId: rfqResult.rfqId,
        rfqNumber: rfqResult.rfqNumber || '',
        merchantId: result.merchantId,
        triggerType: result.triggerType,
        rfqTitle: '', // Would be populated from RFQ data
        quantity: 0,
        unit: '',
        suppliersMatched: rfqResult.matchedSuppliers.length,
        rfqStatus: 'open',
        buyerNotified: config.notifications.notifyOnAutoGenerate,
        generatedAt: rfqResult.generatedAt,
      };

      await this.db.saveGenerationHistory(record);
      this.history.push(record);
    }
  }
}

// ============================================
// Database Interface
// ============================================

export interface DatabaseInterface {
  getAutoRFQConfig(merchantId: string): Promise<AutoRFQTriggerConfig | null>;
  saveAutoRFQConfig(config: AutoRFQTriggerConfig): Promise<void>;
  getProductsForReorder(
    merchantId: string,
    minStockLevel: number,
    sourceIds?: string[]
  ): Promise<Array<{
    id: string;
    name: string;
    category: string | undefined;
    currentStock: number;
    maxStock: number;
    unit: string;
    averageDailyUsage: number;
  }>>;
  getProductsForScheduledReorder(
    merchantId: string,
    categoryFilters: string[]
  ): Promise<Array<{
    id: string;
    name: string;
    category: string | undefined;
    currentStock: number;
    unit: string;
    averageDailyUsage: number;
    lastOrderedDate?: Date;
  }>>;
  getProductsByIds(
    merchantId: string,
    productIds: string[]
  ): Promise<Array<{
    id: string;
    name: string;
    category: string | undefined;
    currentStock: number;
    unit: string;
    averageDailyUsage: number;
  }>>;
  getProductById(productId: string): Promise<{
    id: string;
    name: string;
    category: string | undefined;
    unit: string;
    averageDailyUsage: number;
  } | null>;
  getExpiringContracts(
    merchantId: string,
    daysBeforeExpiry: number,
    sourceIds?: string[]
  ): Promise<Array<{
    id: string;
    name: string;
    type: string;
    expiryDate: Date;
    lastOrderDate?: Date;
  }>>;
  getPreferredSuppliers(
    merchantId: string,
    category: string
  ): Promise<Array<{
    id: string;
    businessName: string;
    rating: number;
    avgDeliveryDays?: number;
  }>>;
  getEligibleSuppliers(category: string): Promise<Array<{
    id: string;
    businessName: string;
    rating: number;
    avgDeliveryDays?: number;
  }>>;
  createRFQ(data: {
    rfqNumber: string;
    title: string;
    description: string;
    quantity: number;
    unit: string;
    targetPrice?: number;
    deliveryDeadline: Date;
    expiresAt: Date;
    merchantId: string;
    category?: string;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string; rfqNumber: string }>;
  getGenerationHistory(
    query: HistoryQuery,
    limit: number,
    offset: number
  ): Promise<{ items: GenerationHistoryRecord[]; total: number }>;
  saveGenerationHistory(record: GenerationHistoryRecord): Promise<void>;
}

// ============================================
// Notification Service Interface
// ============================================

export interface NotificationService {
  notifyBuyers(
    rfqIds: string[],
    merchantId: string,
    config: AutoRFQTriggerConfig['notifications']
  ): Promise<void>;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create an AutoRFQEngine with mock database and notification services
 * For testing and development purposes
 */
export function createMockEngine(): AutoRFQEngine {
  const mockDb: DatabaseInterface = createMockDatabase();
  const mockNotificationService: NotificationService = createMockNotificationService();

  return new AutoRFQEngine(mockDb, mockNotificationService);
}

/**
 * Create mock database for development/testing
 */
function createMockDatabase(): DatabaseInterface {
  return {
    async getAutoRFQConfig() { return null; },
    async saveAutoRFQConfig() {},
    async getProductsForReorder() { return []; },
    async getProductsForScheduledReorder() { return []; },
    async getProductsByIds() { return []; },
    async getProductById() { return null; },
    async getExpiringContracts() { return []; },
    async getPreferredSuppliers() { return []; },
    async getEligibleSuppliers() { return []; },
    async createRFQ(data) {
      return {
        id: `rfq_${Date.now()}`,
        rfqNumber: data.rfqNumber,
      };
    },
    async getGenerationHistory() { return { items: [], total: 0 }; },
    async saveGenerationHistory() {},
  };
}

/**
 * Create mock notification service for development/testing
 */
function createMockNotificationService(): NotificationService {
  return {
    async notifyBuyers() {
      logger.info('[Mock] Notification sent to buyers');
    },
  };
}

// ============================================
// Export
// ============================================

export default AutoRFQEngine;
