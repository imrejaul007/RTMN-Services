import { logger } from '../../shared/logger';
import { randomUUID } from 'crypto';
import {
  type RFQGenerationInput,
  type RFQGenerationResult,
  type SupplierMatch,
  type TriggerEvent,
  type RFQUrgency,
  type AutoRFQTriggerConfig,
  type SupplierMatchStrategy,
  TriggerType,
} from './types/index.js';
import { calculateReorderQuantity } from './triggers.js';

/**
 * Generates a unique RFQ number
 */
function generateRFQNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomUUID().replace(/-/g, '').substring(0, 4).toUpperCase();
  return `RFQ-${timestamp}-${random}`;
}

/**
 * RFQ Title templates based on trigger type
 */
const TITLE_TEMPLATES: Record<TriggerType, string> = {
  low_inventory: 'Auto-PO: {productName}',
  scheduled_reorder: 'Scheduled Reorder: {productName}',
  contract_renewal: 'Contract Renewal: {productName}',
  manual: 'Manual RFQ: {productName}',
};

/**
 * RFQ Description templates based on trigger type
 */
const DESCRIPTION_TEMPLATES: Record<TriggerType, string> = {
  low_inventory:
    'Automated RFQ generated due to low inventory levels. Please provide your best pricing and availability.',
  scheduled_reorder:
    'Scheduled reorder RFQ generated as per configured schedule. Please confirm availability and pricing.',
  contract_renewal:
    'Contract renewal RFQ. Current contract expiring soon - please provide updated pricing.',
  manual:
    'Manually initiated RFQ for procurement review.',
};

/**
 * Maps urgency to RFQ expiration days multiplier
 */
const URGENCY_EXPIRATION_MULTIPLIER: Record<RFQUrgency, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 5,
};

/**
 * Calculates RFQ expiration date based on urgency
 */
function calculateExpirationDate(
  baseDays: number,
  urgency: RFQUrgency
): Date {
  const days = baseDays * URGENCY_EXPIRATION_MULTIPLIER[urgency];
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Calculates delivery deadline based on urgency
 */
function calculateDeliveryDeadline(urgency: RFQUrgency): Date {
  const baseDays = 7;
  const urgencyDays: Record<RFQUrgency, number> = {
    urgent: 3,
    high: 5,
    medium: baseDays,
    low: baseDays * 2,
  };

  const date = new Date();
  date.setDate(date.getDate() + urgencyDays[urgency]);
  return date;
}

/**
 * Generates RFQ title from template
 */
export function generateRFQTitle(
  triggerType: TriggerType,
  productName: string
): string {
  return TITLE_TEMPLATES[triggerType].replace('{productName}', productName);
}

/**
 * Generates RFQ description from template
 */
export function generateRFQDescription(
  triggerType: TriggerType,
  additionalInfo?: string
): string {
  let description = DESCRIPTION_TEMPLATES[triggerType];
  if (additionalInfo) {
    description += ` ${additionalInfo}`;
  }
  return description;
}

/**
 * Builds complete RFQ generation input from trigger event
 */
export function buildRFQInputFromTrigger(
  triggerEvent: TriggerEvent,
  config: AutoRFQTriggerConfig,
  matchedSuppliers: SupplierMatch[],
  additionalQuantity?: number
): RFQGenerationInput {
  const metadata = triggerEvent.metadata || {};

  // Calculate quantity based on trigger metadata or use provided value
  let quantity: number;
  if (additionalQuantity !== undefined) {
    quantity = additionalQuantity;
  } else if (typeof metadata.suggestedQuantity === 'number') {
    quantity = metadata.suggestedQuantity;
  } else {
    // Default to covering the gap plus buffer
    const maxStock = (metadata.maxStock as number) || 100;
    const daysOfBuffer = (metadata.daysOfBuffer as number) || 7;
    const avgUsage = (metadata.averageDailyUsage as number) || (maxStock / 30);
    quantity = calculateReorderQuantity(
      triggerEvent.currentValue,
      maxStock,
      daysOfBuffer,
      avgUsage
    );
  }

  // Ensure minimum quantity of 1
  quantity = Math.max(1, quantity);

  return {
    merchantId: triggerEvent.merchantId,
    title: generateRFQTitle(
      triggerEvent.triggerType,
      (metadata.productName as string) || 'Unknown Product'
    ),
    description: generateRFQDescription(
      triggerEvent.triggerType,
      `Source: ${triggerEvent.sourceType} ID ${triggerEvent.sourceId}`
    ),
    category: metadata.category as string | undefined,
    quantity,
    unit: (metadata.unit as string) || 'units',
    targetPrice: undefined,
    deliveryDeadline: calculateDeliveryDeadline(triggerEvent.urgency),
    triggerType: triggerEvent.triggerType,
    sourceId: triggerEvent.sourceId,
    matchedSuppliers,
    urgency: triggerEvent.urgency,
  };
}

/**
 * Formats RFQ generation input for storage/transmission
 */
export interface FormattedRFQData {
  rfqNumber: string;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  targetPrice: number | undefined;
  deliveryDeadline: Date;
  expiresAt: Date;
  merchantId: string;
  category: string | undefined;
  metadata: Record<string, unknown>;
}

/**
 * Formats RFQ input for creating the actual RFQ record
 */
export function formatRFQForCreation(
  input: RFQGenerationInput,
  config: AutoRFQTriggerConfig
): FormattedRFQData {
  const rfqNumber = generateRFQNumber();

  return {
    rfqNumber,
    title: input.title,
    description: input.description || '',
    quantity: input.quantity,
    unit: input.unit,
    targetPrice: input.targetPrice,
    deliveryDeadline: input.deliveryDeadline || calculateDeliveryDeadline(input.urgency),
    expiresAt: calculateExpirationDate(config.rfqExpirationDays, input.urgency),
    merchantId: input.merchantId,
    category: input.category,
    metadata: {
      triggerType: input.triggerType,
      sourceId: input.sourceId,
      urgency: input.urgency,
      matchedSuppliers: input.matchedSuppliers.map((s) => ({
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        confidence: s.confidence,
        isPreferred: s.isPreferred,
      })),
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Creates a failed RFQ generation result
 */
export function createFailedResult(
  input: RFQGenerationInput,
  error: string,
  errorCode?: string
): RFQGenerationResult {
  return {
    success: false,
    error,
    errorCode,
    matchedSuppliers: input.matchedSuppliers,
    generatedAt: new Date(),
  };
}

/**
 * Creates a successful RFQ generation result
 */
export function createSuccessResult(
  input: RFQGenerationInput,
  rfqId: string,
  rfqNumber: string
): RFQGenerationResult {
  return {
    success: true,
    rfqId,
    rfqNumber,
    matchedSuppliers: input.matchedSuppliers,
    generatedAt: new Date(),
  };
}

/**
 * Supplier Match Strategy Implementation
 */
export class SupplierMatcher {
  /**
   * Apply match strategy to filter/rank suppliers
   */
  static applyStrategy(
    suppliers: SupplierMatch[],
    strategy: SupplierMatchStrategy,
    maxSuppliers: number = 5
  ): SupplierMatch[] {
    let ranked: SupplierMatch[];

    switch (strategy) {
      case 'preferred':
        // Sort by preferred first, then by confidence
        ranked = [...suppliers].sort((a, b) => {
          if (a.isPreferred !== b.isPreferred) {
            return a.isPreferred ? -1 : 1;
          }
          return b.confidence - a.confidence;
        });
        break;

      case 'top_rated':
        // Sort by rating (descending), then by confidence
        ranked = [...suppliers].sort((a, b) => {
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (ratingDiff !== 0) return ratingDiff;
          return b.confidence - a.confidence;
        });
        break;

      case 'lowest_price':
        // This would need price data - for now sort by confidence
        // In real implementation, suppliers would have pricing info
        ranked = [...suppliers].sort((a, b) => b.confidence - a.confidence);
        break;

      case 'all_eligible':
      default:
        ranked = [...suppliers].sort((a, b) => b.confidence - a.confidence);
        break;
    }

    // Limit to max suppliers
    return ranked.slice(0, maxSuppliers);
  }

  /**
   * Calculate match confidence based on various factors
   */
  static calculateConfidence(params: {
    supplierRating: number;
    isPreferred: boolean;
    hasCategory: boolean;
    avgDeliveryDays?: number;
    requestedDeliveryDays?: number;
  }): number {
    let confidence = 0;

    // Rating contributes up to 50 points (rating is 0-5)
    confidence += (params.supplierRating / 5) * 50;

    // Preferred supplier bonus: 20 points
    if (params.isPreferred) {
      confidence += 20;
    }

    // Category match: 20 points
    if (params.hasCategory) {
      confidence += 20;
    }

    // Delivery speed bonus: up to 10 points
    if (
      params.avgDeliveryDays !== undefined &&
      params.requestedDeliveryDays !== undefined
    ) {
      if (params.avgDeliveryDays <= params.requestedDeliveryDays) {
        confidence += 10;
      } else if (params.avgDeliveryDays <= params.requestedDeliveryDays * 1.5) {
        confidence += 5;
      }
    }

    return Math.min(100, Math.round(confidence));
  }
}

/**
 * RFQ Generator - handles actual RFQ creation logic
 */
export class RFQGenerator {
  constructor(private config: AutoRFQTriggerConfig) {}

  /**
   * Generate RFQs from a list of trigger events
   */
  async generateFromTriggers(
    events: TriggerEvent[],
    getMatchedSuppliers: (
      merchantId: string,
      category: string,
      strategy: SupplierMatchStrategy
    ) => Promise<SupplierMatch[]>
  ): Promise<RFQGenerationInput[]> {
    const inputs: RFQGenerationInput[] = [];

    for (const event of events) {
      const metadata = event.metadata || {};
      const category = (metadata.category as string) || 'general';

      // Get matched suppliers for this product/category
      const suppliers = await getMatchedSuppliers(
        event.merchantId,
        category,
        this.config.defaultMatchStrategy
      );

      // If no suppliers matched, skip this event
      if (suppliers.length === 0) {
        continue;
      }

      // Apply supplier match strategy
      const matchedSuppliers = SupplierMatcher.applyStrategy(
        suppliers,
        this.config.defaultMatchStrategy
      );

      // Build RFQ input
      const input = buildRFQInputFromTrigger(
        event,
        this.config,
        matchedSuppliers
      );

      inputs.push(input);
    }

    return inputs;
  }

  /**
   * Validate RFQ generation input
   */
  validateInput(input: RFQGenerationInput): string[] {
    const errors: string[] = [];

    if (!input.merchantId) {
      errors.push('Merchant ID is required');
    }

    if (!input.title || input.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (input.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (!input.unit || input.unit.trim().length === 0) {
      errors.push('Unit is required');
    }

    if (input.matchedSuppliers.length === 0) {
      errors.push('At least one supplier must be matched');
    }

    if (input.targetPrice !== undefined && input.targetPrice <= 0) {
      errors.push('Target price must be greater than 0');
    }

    if (
      input.deliveryDeadline &&
      input.deliveryDeadline < new Date()
    ) {
      errors.push('Delivery deadline cannot be in the past');
    }

    return errors;
  }

  /**
   * Get the configuration being used
   */
  getConfig(): AutoRFQTriggerConfig {
    return { ...this.config };
  }
}

/**
 * Batch RFQ Processor - processes multiple RFQs efficiently
 */
export class BatchRFQProcessor {
  private results: RFQGenerationResult[] = [];
  private errors: Array<{ sourceId: string; error: string; errorCode?: string }> = [];

  constructor(private generator: RFQGenerator) {}

  /**
   * Process a batch of RFQ inputs
   */
  async processBatch(
    inputs: RFQGenerationInput[],
    createRFQ: (input: FormattedRFQData) => Promise<{ id: string; rfqNumber: string }>,
    notifyBuyers: (rfqIds: string[], merchantId: string) => Promise<void>
  ): Promise<{
    successful: number;
    failed: number;
    results: RFQGenerationResult[];
    errors: Array<{ sourceId: string; error: string; errorCode?: string }>;
  }> {
    const successful: string[] = [];
    const failedRfqs: string[] = [];

    for (const input of inputs) {
      // Validate input
      const validationErrors = this.generator.validateInput(input);
      if (validationErrors.length > 0) {
        const result = createFailedResult(
          input,
          validationErrors.join(', '),
          'VALIDATION_ERROR'
        );
        this.results.push(result);
        this.errors.push({
          sourceId: input.sourceId,
          error: validationErrors.join(', '),
          errorCode: 'VALIDATION_ERROR',
        });
        failedRfqs.push(input.sourceId);
        continue;
      }

      try {
        // Format for creation
        const formatted = formatRFQForCreation(input, this.generator.getConfig());

        // Create RFQ
        const created = await createRFQ(formatted);

        // Create success result
        const result = createSuccessResult(input, created.id, created.rfqNumber);
        this.results.push(result);
        successful.push(created.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const result = createFailedResult(input, errorMessage, 'CREATE_ERROR');
        this.results.push(result);
        this.errors.push({
          sourceId: input.sourceId,
          error: errorMessage,
          errorCode: 'CREATE_ERROR',
        });
        failedRfqs.push(input.sourceId);
      }
    }

    // Send notifications for successful RFQs
    if (successful.length > 0 && this.generator.getConfig().notifications.notifyOnAutoGenerate) {
      try {
        await notifyBuyers(successful, inputs[0]?.merchantId || '');
      } catch (error) {
        logger.error('Failed to send notifications:', error);
      }
    }

    return {
      successful: successful.length,
      failed: failedRfqs.length,
      results: this.results,
      errors: this.errors,
    };
  }

  /**
   * Get current results
   */
  getResults(): RFQGenerationResult[] {
    return [...this.results];
  }

  /**
   * Get current errors
   */
  getErrors(): Array<{ sourceId: string; error: string; errorCode?: string }> {
    return [...this.errors];
  }

  /**
   * Reset processor state
   */
  reset(): void {
    this.results = [];
    this.errors = [];
  }
}
