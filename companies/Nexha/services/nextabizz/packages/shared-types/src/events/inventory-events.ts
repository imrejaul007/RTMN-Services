import { z } from 'zod';
import type { SignalSeverity, ReorderUrgency } from '../entities/product.js';
import type { POStatus } from '../entities/order.js';

// ============================================
// Event Type Constants
// ============================================
export const EVENT_TYPES = {
  INVENTORY_SIGNAL_RECEIVED: 'inventory.signal.received',
  REORDER_SIGNAL_CREATED: 'reorder.signal.created',
  REORDER_SIGNAL_MATCHED: 'reorder.signal.matched',
  PO_CREATED: 'po.created',
  PO_STATUS_CHANGED: 'po.status_changed',
  PO_DELIVERED: 'po.delivered',
  SUPPLIER_SCORED: 'supplier.scored',
  PROCUREMENT_COMPLETED: 'procurement.completed',
  RFQ_CREATED: 'rfq.created',
  RFQ_QUOTED: 'rfq.quoted',
} as const;

// ============================================
// 1. inventory.signal.received
// ============================================
export interface InventorySignalReceivedEvent {
  type: typeof EVENT_TYPES.INVENTORY_SIGNAL_RECEIVED;
  timestamp: string;
  data: {
    signalId: string;
    merchantId: string;
    source: 'restopapa' | 'rez-merchant' | 'hotel-pms';
    sourceProductId: string;
    productName: string;
    currentStock: number;
    threshold: number;
    unit: string;
    severity: SignalSeverity;
    signalType: 'threshold_breach' | 'manual_request' | 'forecast_deficit';
  };
}

export const InventorySignalReceivedEventSchema = z.object({
  type: z.literal(EVENT_TYPES.INVENTORY_SIGNAL_RECEIVED),
  timestamp: z.string().datetime(),
  data: z.object({
    signalId: z.string().uuid(),
    merchantId: z.string().uuid(),
    source: z.enum(['restopapa', 'rez-merchant', 'hotel-pms']),
    sourceProductId: z.string().min(1),
    productName: z.string().min(1),
    currentStock: z.number().min(0),
    threshold: z.number().min(0),
    unit: z.string().min(1),
    severity: z.enum(['low', 'critical', 'out_of_stock']),
    signalType: z.enum(['threshold_breach', 'manual_request', 'forecast_deficit']),
  }),
});

// ============================================
// 2. reorder.signal.created
// ============================================
export interface ReorderSignalCreatedEvent {
  type: typeof EVENT_TYPES.REORDER_SIGNAL_CREATED;
  timestamp: string;
  data: {
    signalId: string;
    merchantId: string;
    inventorySignalId?: string;
    suggestedQty?: number;
    urgency: ReorderUrgency;
    productName: string;
    supplierId?: string;
  };
}

export const ReorderSignalCreatedEventSchema = z.object({
  type: z.literal(EVENT_TYPES.REORDER_SIGNAL_CREATED),
  timestamp: z.string().datetime(),
  data: z.object({
    signalId: z.string().uuid(),
    merchantId: z.string().uuid(),
    inventorySignalId: z.string().uuid().optional(),
    suggestedQty: z.number().positive().optional(),
    urgency: z.enum(['high', 'medium', 'low']),
    productName: z.string().min(1),
    supplierId: z.string().uuid().optional(),
  }),
});

// ============================================
// 3. reorder.signal.matched
// ============================================
export interface ReorderSignalMatchedEvent {
  type: typeof EVENT_TYPES.REORDER_SIGNAL_MATCHED;
  timestamp: string;
  data: {
    signalId: string;
    merchantId: string;
    supplierId: string;
    supplierProductId: string;
    matchConfidence: number;
    unitPrice: number;
    estimatedDeliveryDays?: number;
  };
}

export const ReorderSignalMatchedEventSchema = z.object({
  type: z.literal(EVENT_TYPES.REORDER_SIGNAL_MATCHED),
  timestamp: z.string().datetime(),
  data: z.object({
    signalId: z.string().uuid(),
    merchantId: z.string().uuid(),
    supplierId: z.string().uuid(),
    supplierProductId: z.string().uuid(),
    matchConfidence: z.number().min(0).max(100),
    unitPrice: z.number().positive(),
    estimatedDeliveryDays: z.number().int().min(0).optional(),
  }),
});

// ============================================
// 4. po.created
// ============================================
export interface POCreatedEvent {
  type: typeof EVENT_TYPES.PO_CREATED;
  timestamp: string;
  data: {
    poId: string;
    orderNumber: string;
    merchantId: string;
    supplierId: string;
    subtotal: number;
    netAmount: number;
    itemCount: number;
    source: 'manual' | 'reorder_signal' | 'rfq';
    rfqId?: string;
  };
}

export const POCreatedEventSchema = z.object({
  type: z.literal(EVENT_TYPES.PO_CREATED),
  timestamp: z.string().datetime(),
  data: z.object({
    poId: z.string().uuid(),
    orderNumber: z.string().min(1),
    merchantId: z.string().uuid(),
    supplierId: z.string().uuid(),
    subtotal: z.number().min(0),
    netAmount: z.number().min(0),
    itemCount: z.number().int().positive(),
    source: z.enum(['manual', 'reorder_signal', 'rfq']),
    rfqId: z.string().uuid().optional(),
  }),
});

// ============================================
// 5. po.status_changed
// ============================================
export interface POStatusChangedEvent {
  type: typeof EVENT_TYPES.PO_STATUS_CHANGED;
  timestamp: string;
  data: {
    poId: string;
    orderNumber: string;
    merchantId: string;
    supplierId: string;
    previousStatus: POStatus;
    newStatus: POStatus;
    changedBy?: string;
    notes?: string;
  };
}

export const POStatusChangedEventSchema = z.object({
  type: z.literal(EVENT_TYPES.PO_STATUS_CHANGED),
  timestamp: z.string().datetime(),
  data: z.object({
    poId: z.string().uuid(),
    orderNumber: z.string().min(1),
    merchantId: z.string().uuid(),
    supplierId: z.string().uuid(),
    previousStatus: z.enum(['draft', 'submitted', 'confirmed', 'processing', 'shipped', 'partial', 'received', 'cancelled']),
    newStatus: z.enum(['draft', 'submitted', 'confirmed', 'processing', 'shipped', 'partial', 'received', 'cancelled']),
    changedBy: z.string().optional(),
    notes: z.string().optional(),
  }),
});

// ============================================
// 6. po.delivered
// ============================================
export interface PODeliveredEvent {
  type: typeof EVENT_TYPES.PO_DELIVERED;
  timestamp: string;
  data: {
    poId: string;
    orderNumber: string;
    merchantId: string;
    supplierId: string;
    actualDelivery: string;
    itemsDelivered: number;
    totalItems: number;
    poIdempotencyKey: string;
  };
}

export const PODeliveredEventSchema = z.object({
  type: z.literal(EVENT_TYPES.PO_DELIVERED),
  timestamp: z.string().datetime(),
  data: z.object({
    poId: z.string().uuid(),
    orderNumber: z.string().min(1),
    merchantId: z.string().uuid(),
    supplierId: z.string().uuid(),
    actualDelivery: z.string().datetime(),
    itemsDelivered: z.number().int().min(0),
    totalItems: z.number().int().positive(),
    poIdempotencyKey: z.string().min(1),
  }),
});

// ============================================
// 7. supplier.scored
// ============================================
export interface SupplierScoredEvent {
  type: typeof EVENT_TYPES.SUPPLIER_SCORED;
  timestamp: string;
  data: {
    scoreId: string;
    supplierId: string;
    period: 'monthly' | 'quarterly';
    periodStart: string;
    periodEnd: string;
    overallScore: number;
    onTimeDeliveryRate: number;
    qualityRejectionRate: number;
    priceConsistency: number;
    responseRate: number;
    creditBoost: number;
  };
}

export const SupplierScoredEventSchema = z.object({
  type: z.literal(EVENT_TYPES.SUPPLIER_SCORED),
  timestamp: z.string().datetime(),
  data: z.object({
    scoreId: z.string().uuid(),
    supplierId: z.string().uuid(),
    period: z.enum(['monthly', 'quarterly']),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    overallScore: z.number().min(0).max(100),
    onTimeDeliveryRate: z.number().min(0).max(100),
    qualityRejectionRate: z.number().min(0).max(100),
    priceConsistency: z.number().min(0).max(100),
    responseRate: z.number().min(0).max(100),
    creditBoost: z.number().min(0).max(10),
  }),
});

// ============================================
// 8. procurement.completed
// ============================================
export interface ProcurementCompletedEvent {
  type: typeof EVENT_TYPES.PROCUREMENT_COMPLETED;
  timestamp: string;
  data: {
    procurementId: string;
    merchantId: string;
    totalOrders: number;
    totalAmount: number;
    suppliersInvolved: string[];
    fulfillmentRate: number;
    avgDeliveryDays: number;
    completedAt: string;
  };
}

export const ProcurementCompletedEventSchema = z.object({
  type: z.literal(EVENT_TYPES.PROCUREMENT_COMPLETED),
  timestamp: z.string().datetime(),
  data: z.object({
    procurementId: z.string().uuid(),
    merchantId: z.string().uuid(),
    totalOrders: z.number().int().positive(),
    totalAmount: z.number().min(0),
    suppliersInvolved: z.array(z.string().uuid()),
    fulfillmentRate: z.number().min(0).max(100),
    avgDeliveryDays: z.number().min(0),
    completedAt: z.string().datetime(),
  }),
});

// ============================================
// 9. rfq.created
// ============================================
export interface RFQCreatedEvent {
  type: typeof EVENT_TYPES.RFQ_CREATED;
  timestamp: string;
  data: {
    rfqId: string;
    rfqNumber: string;
    merchantId: string;
    title: string;
    category?: string;
    quantity: number;
    unit: string;
    targetPrice?: number;
    deliveryDeadline?: string;
    expiresAt?: string;
  };
}

export const RFQCreatedEventSchema = z.object({
  type: z.literal(EVENT_TYPES.RFQ_CREATED),
  timestamp: z.string().datetime(),
  data: z.object({
    rfqId: z.string().uuid(),
    rfqNumber: z.string().min(1),
    merchantId: z.string().uuid(),
    title: z.string().min(1),
    category: z.string().optional(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    targetPrice: z.number().positive().optional(),
    deliveryDeadline: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

// ============================================
// 10. rfq.quoted
// ============================================
export interface RFQQuotedEvent {
  type: typeof EVENT_TYPES.RFQ_QUOTED;
  timestamp: string;
  data: {
    rfqId: string;
    rfqNumber: string;
    responseId: string;
    supplierId: string;
    unitPrice: number;
    totalPrice: number;
    leadTimeDays?: number;
    notes?: string;
    submittedAt: string;
  };
}

export const RFQQuotedEventSchema = z.object({
  type: z.literal(EVENT_TYPES.RFQ_QUOTED),
  timestamp: z.string().datetime(),
  data: z.object({
    rfqId: z.string().uuid(),
    rfqNumber: z.string().min(1),
    responseId: z.string().uuid(),
    supplierId: z.string().uuid(),
    unitPrice: z.number().positive(),
    totalPrice: z.number().positive(),
    leadTimeDays: z.number().int().min(0).optional(),
    notes: z.string().optional(),
    submittedAt: z.string().datetime(),
  }),
});

// ============================================
// Union type for all inventory events
// ============================================
export type InventoryEvent =
  | InventorySignalReceivedEvent
  | ReorderSignalCreatedEvent
  | ReorderSignalMatchedEvent
  | POCreatedEvent
  | POStatusChangedEvent
  | PODeliveredEvent
  | SupplierScoredEvent
  | ProcurementCompletedEvent
  | RFQCreatedEvent
  | RFQQuotedEvent;

export const InventoryEventSchema = z.union([
  InventorySignalReceivedEventSchema,
  ReorderSignalCreatedEventSchema,
  ReorderSignalMatchedEventSchema,
  POCreatedEventSchema,
  POStatusChangedEventSchema,
  PODeliveredEventSchema,
  SupplierScoredEventSchema,
  ProcurementCompletedEventSchema,
  RFQCreatedEventSchema,
  RFQQuotedEventSchema,
]);
