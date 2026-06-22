import { z } from 'zod';
import {
  EVENT_TYPES,
  POCreatedEventSchema,
  POStatusChangedEventSchema,
  PODeliveredEventSchema,
  ProcurementCompletedEventSchema,
  RFQCreatedEventSchema,
  RFQQuotedEventSchema,
  type POCreatedEvent,
  type POStatusChangedEvent,
  type PODeliveredEvent,
  type ProcurementCompletedEvent,
  type RFQCreatedEvent,
  type RFQQuotedEvent,
} from './inventory-events.js';

// Re-export order-related events from inventory-events
export {
  EVENT_TYPES,
  POCreatedEventSchema,
  POStatusChangedEventSchema,
  PODeliveredEventSchema,
  ProcurementCompletedEventSchema,
  RFQCreatedEventSchema,
  RFQQuotedEventSchema,
  type POCreatedEvent,
  type POStatusChangedEvent,
  type PODeliveredEvent,
  type ProcurementCompletedEvent,
  type RFQCreatedEvent,
  type RFQQuotedEvent,
};

// Additional order-specific events

// ============================================
// po.items_updated - for partial deliveries or item changes
// ============================================
export interface POItemsUpdatedEvent {
  type: 'po.items_updated';
  timestamp: string;
  data: {
    poId: string;
    orderNumber: string;
    merchantId: string;
    supplierId: string;
    itemUpdates: Array<{
      itemId: string;
      itemName: string;
      previousReceivedQty: number;
      newReceivedQty: number;
    }>;
    updatedBy: string;
  };
}

export const POItemsUpdatedEventSchema = z.object({
  type: z.literal('po.items_updated'),
  timestamp: z.string().datetime(),
  data: z.object({
    poId: z.string().uuid(),
    orderNumber: z.string().min(1),
    merchantId: z.string().uuid(),
    supplierId: z.string().uuid(),
    itemUpdates: z.array(z.object({
      itemId: z.string().uuid(),
      itemName: z.string().min(1),
      previousReceivedQty: z.number().min(0),
      newReceivedQty: z.number().min(0),
    })),
    updatedBy: z.string().min(1),
  }),
});

// ============================================
// po.payment_updated - payment status changes
// ============================================
export interface POPaymentUpdatedEvent {
  type: 'po.payment_updated';
  timestamp: string;
  data: {
    poId: string;
    orderNumber: string;
    merchantId: string;
    supplierId: string;
    previousPaymentStatus: 'pending' | 'partial' | 'paid';
    newPaymentStatus: 'pending' | 'partial' | 'paid';
    previousPaymentMethod?: 'prepaid' | 'net-terms' | 'bnpl';
    newPaymentMethod?: 'prepaid' | 'net-terms' | 'bnpl';
    amountPaid?: number;
  };
}

export const POPaymentUpdatedEventSchema = z.object({
  type: z.literal('po.payment_updated'),
  timestamp: z.string().datetime(),
  data: z.object({
    poId: z.string().uuid(),
    orderNumber: z.string().min(1),
    merchantId: z.string().uuid(),
    supplierId: z.string().uuid(),
    previousPaymentStatus: z.enum(['pending', 'partial', 'paid']),
    newPaymentStatus: z.enum(['pending', 'partial', 'paid']),
    previousPaymentMethod: z.enum(['prepaid', 'net-terms', 'bnpl']).optional(),
    newPaymentMethod: z.enum(['prepaid', 'net-terms', 'bnpl']).optional(),
    amountPaid: z.number().min(0).optional(),
  }),
});

// Union type for all order events
export type OrderEvent =
  | POCreatedEvent
  | POStatusChangedEvent
  | PODeliveredEvent
  | POItemsUpdatedEvent
  | POPaymentUpdatedEvent
  | ProcurementCompletedEvent
  | RFQCreatedEvent
  | RFQQuotedEvent;

export const OrderEventSchema = z.union([
  POCreatedEventSchema,
  POStatusChangedEventSchema,
  PODeliveredEventSchema,
  POItemsUpdatedEventSchema,
  POPaymentUpdatedEventSchema,
  ProcurementCompletedEventSchema,
  RFQCreatedEventSchema,
  RFQQuotedEventSchema,
]);
