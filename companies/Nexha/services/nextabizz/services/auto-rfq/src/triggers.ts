import { randomUUID } from 'crypto';
import {
  type TriggerEvent,
  type LowInventoryTriggerConfig,
  type ScheduledReorderConfig,
  type ContractRenewalConfig,
  type RFQUrgency,
  type AutoRFQTriggerConfig,
  TriggerType,
} from './types/index.js';

/**
 * Generates a unique ID for trigger events
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${randomUUID().replace(/-/g, '').substring(0, 9)}`;
}

/**
 * Calculates the reorder point based on configuration
 */
export function calculateReorderPoint(
  maxStock: number,
  reorderPointPercent: number
): number {
  return Math.ceil((maxStock * reorderPointPercent) / 100);
}

/**
 * Calculates suggested reorder quantity
 */
export function calculateReorderQuantity(
  currentStock: number,
  maxStock: number,
  daysOfBuffer: number,
  averageDailyUsage: number
): number {
  // Calculate days until stock runs out
  const daysUntilStockOut = currentStock / (averageDailyUsage || 1);

  // If stock will last less than buffer days, we need to reorder
  if (daysUntilStockOut <= daysOfBuffer) {
    // Order enough to bring stock back to max plus buffer
    const targetStock = maxStock + (averageDailyUsage * daysOfBuffer);
    return Math.max(0, targetStock - currentStock);
  }

  // Calculate based on average usage for buffer period
  return Math.max(0, Math.ceil(averageDailyUsage * daysOfBuffer));
}

/**
 * Determines urgency level based on stock level
 */
export function determineUrgency(
  currentStock: number,
  reorderPoint: number,
  minStockLevel: number
): RFQUrgency {
  if (currentStock <= minStockLevel) {
    return 'urgent';
  }
  if (currentStock <= reorderPoint) {
    return 'high';
  }
  if (currentStock <= reorderPoint * 1.5) {
    return 'medium';
  }
  return 'low';
}

/**
 * Low Inventory Trigger Handler
 */
export class LowInventoryTrigger {
  constructor(private config: LowInventoryTriggerConfig) {}

  /**
   * Check if inventory level triggers RFQ generation
   */
  check(
    merchantId: string,
    productId: string,
    productName: string,
    category: string | undefined,
    currentStock: number,
    maxStock: number,
    unit: string,
    averageDailyUsage: number = 0
  ): TriggerEvent | null {
    // If current stock is above minimum level, no trigger
    if (currentStock > this.config.minStockLevel) {
      return null;
    }

    const reorderPoint = calculateReorderPoint(
      maxStock,
      this.config.reorderPointPercent
    );

    const urgency = determineUrgency(
      currentStock,
      reorderPoint,
      this.config.minStockLevel
    );

    // Generate trigger event
    return {
      id: generateEventId(),
      triggerType: 'low_inventory',
      merchantId,
      sourceId: productId,
      sourceType: 'product',
      currentValue: currentStock,
      threshold: this.config.minStockLevel,
      urgency,
      timestamp: new Date(),
      metadata: {
        productName,
        category,
        unit,
        maxStock,
        reorderPoint,
        averageDailyUsage,
        daysOfBuffer: this.config.daysOfBuffer,
        suggestedQuantity: calculateReorderQuantity(
          currentStock,
          maxStock,
          this.config.daysOfBuffer,
          averageDailyUsage
        ),
      },
    };
  }

  /**
   * Get configuration being used by this trigger
   */
  getConfig(): LowInventoryTriggerConfig {
    return { ...this.config };
  }
}

/**
 * Scheduled Reorder Trigger Handler
 */
export class ScheduledReorderTrigger {
  constructor(private config: ScheduledReorderConfig) {}

  /**
   * Check if a product should be included in scheduled reorder
   */
  shouldInclude(
    productCategory: string,
    lastOrderedDate: Date | undefined
  ): boolean {
    // If no category filters, include all
    if (this.config.categoryFilters.length === 0) {
      return true;
    }

    // Check if product category is in the filter list
    return this.config.categoryFilters.includes(productCategory);
  }

  /**
   * Create a trigger event for scheduled reorder
   */
  createEvent(
    merchantId: string,
    productId: string,
    productName: string,
    category: string | undefined,
    currentStock: number,
    unit: string,
    averageDailyUsage: number
  ): TriggerEvent {
    // Calculate urgency based on days until stock depletion
    let urgency: RFQUrgency = 'medium';
    const daysUntilStockOut = currentStock / (averageDailyUsage || 1);

    if (daysUntilStockOut <= 3) {
      urgency = 'urgent';
    } else if (daysUntilStockOut <= 7) {
      urgency = 'high';
    } else if (daysUntilStockOut <= 14) {
      urgency = 'medium';
    } else {
      urgency = 'low';
    }

    return {
      id: generateEventId(),
      triggerType: 'scheduled_reorder',
      merchantId,
      sourceId: productId,
      sourceType: 'product',
      currentValue: currentStock,
      threshold: 0,
      urgency,
      timestamp: new Date(),
      metadata: {
        productName,
        category,
        unit,
        averageDailyUsage,
        daysUntilStockOut: Math.floor(daysUntilStockOut),
      },
    };
  }

  /**
   * Get the cron schedule expression
   */
  getSchedule(): string {
    return this.config.scheduleCron;
  }

  /**
   * Get configuration being used by this trigger
   */
  getConfig(): ScheduledReorderConfig {
    return { ...this.config };
  }
}

/**
 * Contract Renewal Trigger Handler
 */
export class ContractRenewalTrigger {
  constructor(private config: ContractRenewalConfig) {}

  /**
   * Check if a contract should trigger RFQ generation
   */
  check(
    merchantId: string,
    contractId: string,
    contractName: string,
    contractType: string,
    expiryDate: Date,
    lastOrderDate: Date | undefined
  ): TriggerEvent | null {
    // Check if contract type is being monitored
    if (
      this.config.contractTypes.length > 0 &&
      !this.config.contractTypes.includes(contractType)
    ) {
      return null;
    }

    // Calculate days until expiry
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If contract is not expiring within threshold, no trigger
    if (daysUntilExpiry > this.config.daysBeforeExpiry) {
      return null;
    }

    // Determine urgency based on days remaining
    let urgency: RFQUrgency;
    if (daysUntilExpiry <= 0) {
      urgency = 'urgent';
    } else if (daysUntilExpiry <= 7) {
      urgency = 'urgent';
    } else if (daysUntilExpiry <= 14) {
      urgency = 'high';
    } else if (daysUntilExpiry <= 30) {
      urgency = 'medium';
    } else {
      urgency = 'low';
    }

    return {
      id: generateEventId(),
      triggerType: 'contract_renewal',
      merchantId,
      sourceId: contractId,
      sourceType: 'contract',
      currentValue: daysUntilExpiry,
      threshold: this.config.daysBeforeExpiry,
      urgency,
      timestamp: new Date(),
      metadata: {
        contractName,
        contractType,
        expiryDate: expiryDate.toISOString(),
        daysUntilExpiry,
        lastOrderDate: lastOrderDate?.toISOString(),
      },
    };
  }

  /**
   * Get configuration being used by this trigger
   */
  getConfig(): ContractRenewalConfig {
    return { ...this.config };
  }
}

/**
 * Trigger Factory - creates appropriate trigger handlers from config
 */
export class TriggerFactory {
  /**
   * Create all trigger handlers from a complete config
   */
  static fromConfig(config: AutoRFQTriggerConfig): {
    lowInventory: LowInventoryTrigger;
    scheduledReorder: ScheduledReorderTrigger;
    contractRenewal: ContractRenewalTrigger;
  } {
    return {
      lowInventory: new LowInventoryTrigger(config.lowInventory),
      scheduledReorder: new ScheduledReorderTrigger(config.scheduledReorder),
      contractRenewal: new ContractRenewalTrigger(config.contractRenewal),
    };
  }

  /**
   * Create a specific trigger by type
   */
  static create(
    triggerType: TriggerType,
    config: AutoRFQTriggerConfig
  ): LowInventoryTrigger | ScheduledReorderTrigger | ContractRenewalTrigger {
    switch (triggerType) {
      case 'low_inventory':
        return new LowInventoryTrigger(config.lowInventory);
      case 'scheduled_reorder':
        return new ScheduledReorderTrigger(config.scheduledReorder);
      case 'contract_renewal':
        return new ContractRenewalTrigger(config.contractRenewal);
      default:
        throw new Error(`Unknown trigger type: ${triggerType}`);
    }
  }
}

/**
 * Trigger Evaluator - evaluates products and generates trigger events
 */
export class TriggerEvaluator {
  constructor(private triggers: {
    lowInventory: LowInventoryTrigger;
    scheduledReorder: ScheduledReorderTrigger;
    contractRenewal: ContractRenewalTrigger;
  }) {}

  /**
   * Evaluate a product against all relevant triggers
   */
  evaluateProduct(
    merchantId: string,
    productId: string,
    productName: string,
    category: string | undefined,
    currentStock: number,
    maxStock: number,
    unit: string,
    averageDailyUsage: number,
    enabledTriggers: TriggerType[]
  ): TriggerEvent[] {
    const events: TriggerEvent[] = [];

    // Check low inventory trigger
    if (enabledTriggers.includes('low_inventory')) {
      const event = this.triggers.lowInventory.check(
        merchantId,
        productId,
        productName,
        category,
        currentStock,
        maxStock,
        unit,
        averageDailyUsage
      );
      if (event) {
        events.push(event);
      }
    }

    // Check scheduled reorder trigger
    if (enabledTriggers.includes('scheduled_reorder')) {
      if (this.triggers.scheduledReorder.shouldInclude(category || '', undefined)) {
        const event = this.triggers.scheduledReorder.createEvent(
          merchantId,
          productId,
          productName,
          category,
          currentStock,
          unit,
          averageDailyUsage
        );
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Evaluate a contract against contract renewal trigger
   */
  evaluateContract(
    merchantId: string,
    contractId: string,
    contractName: string,
    contractType: string,
    expiryDate: Date,
    lastOrderDate: Date | undefined,
    enabledTriggers: TriggerType[]
  ): TriggerEvent | null {
    if (!enabledTriggers.includes('contract_renewal')) {
      return null;
    }

    return this.triggers.contractRenewal.check(
      merchantId,
      contractId,
      contractName,
      contractType,
      expiryDate,
      lastOrderDate
    );
  }
}

/**
 * Filter duplicate triggers - keeps highest urgency when same source triggers multiple times
 */
export function deduplicateTriggerEvents(events: TriggerEvent[]): TriggerEvent[] {
  const eventMap = new Map<string, TriggerEvent>();

  const urgencyOrder: Record<RFQUrgency, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  for (const event of events) {
    const key = `${event.sourceType}:${event.sourceId}`;

    if (!eventMap.has(key)) {
      eventMap.set(key, event);
    } else {
      const existing = eventMap.get(key)!;
      if (urgencyOrder[event.urgency] > urgencyOrder[existing.urgency]) {
        eventMap.set(key, event);
      }
    }
  }

  return Array.from(eventMap.values());
}

/**
 * Sort trigger events by urgency (highest first)
 */
export function sortByUrgency(events: TriggerEvent[]): TriggerEvent[] {
  const urgencyOrder: Record<RFQUrgency, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...events].sort(
    (a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
  );
}

/**
 * Filter events by minimum urgency threshold
 */
export function filterByMinUrgency(
  events: TriggerEvent[],
  minUrgency: RFQUrgency
): TriggerEvent[] {
  const urgencyOrder: Record<RFQUrgency, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const minLevel = urgencyOrder[minUrgency];

  return events.filter(
    (event) => urgencyOrder[event.urgency] >= minLevel
  );
}
