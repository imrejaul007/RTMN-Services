/**
 * Canonical Event Types for REZ Ecosystem
 *
 * All events follow CloudEvents spec:
 * - type: Event type identifier
 * - source: Originating service
 * - subject: Entity being acted upon
 * - time: ISO 8601 timestamp
 * - datacontenttype: application/json
 */

import { z } from 'zod';

// ============================================================================
// Event Type Constants
// ============================================================================

export const DEMAND_EVENTS = {
  // Inventory/Demand signals
  INVENTORY_LOW: 'demand.inventory.low',
  INVENTORY_OUT: 'demand.inventory.out',
  INVENTORY_REPLENISHED: 'demand.inventory.replenished',

  // Orders
  ORDER_PLACED: 'demand.order.placed',
  ORDER_CONFIRMED: 'demand.order.confirmed',
  ORDER_DELIVERED: 'demand.order.delivered',
  ORDER_CANCELLED: 'demand.order.cancelled',

  // Cart
  CART_CREATED: 'demand.cart.created',
  CART_ABANDONED: 'demand.cart.abandoned',
  CHECKOUT_STARTED: 'demand.checkout.started',
} as const;

export const SUPPLY_EVENTS = {
  // Procurement
  PROCUREMENT_CREATED: 'supply.procurement.created',
  PROCUREMENT_CONFIRMED: 'supply.procurement.confirmed',
  PROCUREMENT_FULFILLED: 'supply.procurement.fulfilled',

  // RFQ
  RFQ_CREATED: 'supply.rfq.created',
  RFQ_QUOTED: 'supply.rfq.quoted',
  RFQ_AWARDED: 'supply.rfq.awarded',

  // Purchase Orders
  PO_CREATED: 'supply.po.created',
  PO_SENT: 'supply.po.sent',
  PO_CONFIRMED: 'supply.po.confirmed',
  PO_SHIPPED: 'supply.po.shipped',
  PO_DELIVERED: 'supply.po.delivered',

  // Inventory (Supply side)
  STOCK_RECEIVED: 'supply.stock.received',
  STOCK_ADJUSTED: 'supply.stock.adjusted',
} as const;

export const DISTRIBUTION_EVENTS = {
  // Distribution signals
  DISTRIBUTOR_SIGNAL: 'distribution.signal.received',
  ROUTE_ASSIGNED: 'distribution.route.assigned',
  DELIVERY_COMPLETED: 'distribution.delivery.completed',

  // Sales
  VAN_SALE_CREATED: 'distribution.van_sale.created',
  ROUTE_SALE_CREATED: 'distribution.route_sale.created',

  // Collections
  COLLECTION_RECORDED: 'distribution.collection.recorded',
  OUTSTANDING_UPDATED: 'distribution.outstanding.updated',
} as const;

export const FRANCHISE_EVENTS = {
  // Franchise lifecycle
  FRANCHISE_ONBOARDED: 'franchise.onboarded',
  FRANCHISE_SUSPENDED: 'franchise.suspended',
  FRANCHISE_REACTIVATED: 'franchise.reactivated',

  // Performance
  FRANCHISE_PERFORMANCE_UPDATED: 'franchise.performance.updated',
  ROYALTY_CALCULATED: 'franchise.royalty.calculated',

  // Sync
  INVENTORY_SYNCED: 'franchise.inventory.synced',
  MENU_SYNCED: 'franchise.menu.synced',
  PRICING_SYNCED: 'franchise.pricing.synced',
} as const;

export const MANUFACTURING_EVENTS = {
  // Production
  PRODUCTION_ORDER_CREATED: 'manufacturing.production.created',
  PRODUCTION_STARTED: 'manufacturing.production.started',
  PRODUCTION_COMPLETED: 'manufacturing.production.completed',

  // Inventory
  BOM_CONSUMED: 'manufacturing.bom.consumed',
  BATCH_CREATED: 'manufacturing.batch.created',
  QUALITY_CHECK_PASSED: 'manufacturing.quality.passed',
  QUALITY_CHECK_FAILED: 'manufacturing.quality.failed',
} as const;

export const INTELLIGENCE_EVENTS = {
  // Predictions
  DEMAND_PREDICTED: 'intelligence.demand.predicted',
  CHURN_DETECTED: 'intelligence.churn.detected',
  FRAUD_DETECTED: 'intelligence.fraud.detected',

  // Recommendations
  RECOMMENDATION_GENERATED: 'intelligence.recommendation.generated',

  // Segmentation
  SEGMENT_UPDATED: 'intelligence.segment.updated',
} as const;

export const FINANCE_EVENTS = {
  // Payments
  PAYMENT_INITIATED: 'finance.payment.initiated',
  PAYMENT_COMPLETED: 'finance.payment.completed',
  PAYMENT_FAILED: 'finance.payment.failed',

  // Credit
  CREDIT_APPROVED: 'finance.credit.approved',
  CREDIT_REJECTED: 'finance.credit.rejected',
  CREDIT_LIMIT_UPDATED: 'finance.credit.limit.updated',

  // Invoices
  INVOICE_CREATED: 'finance.invoice.created',
  INVOICE_PAID: 'finance.invoice.paid',
  INVOICE_OVERDUE: 'finance.invoice.overdue',
} as const;

export const ALL_EVENTS = {
  ...DEMAND_EVENTS,
  ...SUPPLY_EVENTS,
  ...DISTRIBUTION_EVENTS,
  ...FRANCHISE_EVENTS,
  ...MANUFACTURING_EVENTS,
  ...INTELLIGENCE_EVENTS,
  ...FINANCE_EVENTS,
} as const;

export type DemandEvent = typeof DEMAND_EVENTS[keyof typeof DEMAND_EVENTS];
export type SupplyEvent = typeof SUPPLY_EVENTS[keyof typeof SUPPLY_EVENTS];
export type DistributionEvent = typeof DISTRIBUTION_EVENTS[keyof typeof DISTRIBUTION_EVENTS];
export type FranchiseEvent = typeof FRANCHISE_EVENTS[keyof typeof FRANCHISE_EVENTS];
export type ManufacturingEvent = typeof MANUFACTURING_EVENTS[keyof typeof MANUFACTURING_EVENTS];
export type IntelligenceEvent = typeof INTELLIGENCE_EVENTS[keyof typeof INTELLIGENCE_EVENTS];
export type FinanceEvent = typeof FINANCE_EVENTS[keyof typeof FINANCE_EVENTS];

export type AnyEvent =
  | DemandEvent
  | SupplyEvent
  | DistributionEvent
  | FranchiseEvent
  | ManufacturingEvent
  | IntelligenceEvent
  | FinanceEvent;

// ============================================================================
// CloudEvent Base
// ============================================================================

export interface CloudEvent<T = unknown> {
  specversion: '1.0';
  id: string;
  source: string;
  type: AnyEvent;
  subject?: string;
  time: string;
  datacontenttype: 'application/json';
  data: T;
  extensions?: Record<string, unknown>;
}

export const CloudEventSchema: z.ZodType<CloudEvent> = z.object({
  specversion: z.literal('1.0'),
  id: z.string().uuid(),
  source: z.string().min(1),
  type: z.string().min(1),
  subject: z.string().optional(),
  time: z.string().datetime(),
  datacontenttype: z.literal('application/json'),
  data: z.unknown(),
  extensions: z.record(z.unknown()).optional(),
});

// ============================================================================
// Event Creators
// ============================================================================

export function createEvent<T>(
  type: AnyEvent,
  source: string,
  data: T,
  options?: {
    subject?: string;
    id?: string;
    extensions?: Record<string, unknown>;
  }
): CloudEvent<T> {
  return {
    specversion: '1.0',
    id: options?.id || crypto.randomUUID(),
    source,
    type,
    subject: options?.subject,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data,
    extensions: options?.extensions,
  };
}

// ============================================================================
// Source Identifiers
// ============================================================================

export const EVENT_SOURCES = {
  REZ_MERCHANT: 'rez-merchant',
  REZ_CONSUMER: 'rez-consumer',
  REZ_RIDE: 'rez-ride',
  NEXTA_BIZ: 'nextabizz',
  NEXHA_DISTRIBUTION: 'nexha-distribution',
  NEXHA_FRANCHISE: 'nexha-franchise',
  NEXHA_PROCUREMENT: 'nexha-procurement',
  NEXHA_MANUFACTURING: 'nexha-manufacturing',
  RTNM_FINANCE: 'rtnm-finance',
  REZ_INTELLIGENCE: 'rez-intelligence',
  REZ_MEDIA: 'rez-media',
  RABTUL_AUTH: 'rabtul-auth',
  RABTUL_WALLET: 'rabtul-wallet',
  RABTUL_PAYMENT: 'rabtul-payment',
} as const;
