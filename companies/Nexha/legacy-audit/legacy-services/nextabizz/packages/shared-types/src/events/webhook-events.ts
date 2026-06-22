import { z } from 'zod';

// ============================================
// Webhook Source Enum
// ============================================
export const WebhookSourceSchema = z.enum(['restopapa', 'rez-merchant', 'hotel-pms']);
export type WebhookSource = z.infer<typeof WebhookSourceSchema>;

// ============================================
// Base Webhook Event
// ============================================
export interface BaseWebhookEvent {
  id: string;
  source: WebhookSource;
  type: string;
  timestamp: string;
  signature: string;
  payload: unknown;
}

export const BaseWebhookEventSchema = z.object({
  id: z.string().min(1),
  source: WebhookSourceSchema,
  type: z.string().min(1),
  timestamp: z.string().datetime(),
  signature: z.string().min(1),
  payload: z.unknown(),
});

// ============================================
// RestoPapa Webhook Events
// ============================================
export const RestoPapaEventTypeSchema = z.enum([
  'product.stock.updated',
  'order.created',
  'order.status_changed',
  'merchant.updated',
]);

export type RestoPapaEventType = z.infer<typeof RestoPapaEventTypeSchema>;

export interface RestoPapaStockUpdate {
  productId: string;
  sku: string;
  productName: string;
  currentStock: number;
  unit: string;
  category: string;
  lastUpdated: string;
}

export interface RestoPapaOrderCreated {
  orderId: string;
  orderNumber: string;
  merchantId: string;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    unit: string;
  }>;
  totalAmount: number;
  deliveryAddress: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  expectedDelivery?: string;
  notes?: string;
}

export interface RestoPapaOrderStatusChanged {
  orderId: string;
  orderNumber: string;
  previousStatus: string;
  newStatus: string;
  updatedAt: string;
  notes?: string;
}

export interface RestoPapaMerchantUpdated {
  merchantId: string;
  businessName: string;
  email?: string;
  phone?: string;
  address?: string;
  category: string;
}

export interface RestoPapaWebhookPayload {
  product?: RestoPapaStockUpdate;
  order?: RestoPapaOrderCreated | RestoPapaOrderStatusChanged;
  merchant?: RestoPapaMerchantUpdated;
}

export interface RestoPapaWebhookEvent {
  id: string;
  source: 'restopapa';
  type: RestoPapaEventType;
  timestamp: string;
  signature: string;
  payload: RestoPapaWebhookPayload;
}

export const RestoPapaWebhookEventSchema = z.object({
  id: z.string().min(1),
  source: z.literal('restopapa'),
  type: RestoPapaEventTypeSchema,
  timestamp: z.string().datetime(),
  signature: z.string().min(1),
  payload: z.object({
    product: z.object({
      productId: z.string().min(1),
      sku: z.string().min(1),
      productName: z.string().min(1),
      currentStock: z.number().min(0),
      unit: z.string().min(1),
      category: z.string().min(1),
      lastUpdated: z.string().datetime(),
    }).optional(),
    order: z.union([
      z.object({
        orderId: z.string().min(1),
        orderNumber: z.string().min(1),
        merchantId: z.string().min(1),
        items: z.array(z.object({
          productId: z.string().min(1),
          name: z.string().min(1),
          qty: z.number().positive(),
          unit: z.string().min(1),
        })),
        totalAmount: z.number().min(0),
        deliveryAddress: z.object({
          line1: z.string().min(1),
          city: z.string().min(1),
          state: z.string().min(1),
          pincode: z.string().regex(/^[0-9]{6}$/),
        }),
        expectedDelivery: z.string().datetime().optional(),
        notes: z.string().optional(),
      }),
      z.object({
        orderId: z.string().min(1),
        orderNumber: z.string().min(1),
        previousStatus: z.string().min(1),
        newStatus: z.string().min(1),
        updatedAt: z.string().datetime(),
        notes: z.string().optional(),
      }),
    ]).optional(),
    merchant: z.object({
      merchantId: z.string().min(1),
      businessName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      category: z.string().min(1),
    }).optional(),
  }),
});

// ============================================
// ReZ Merchant Webhook Events
// ============================================
export const RezMerchantEventTypeSchema = z.enum([
  'inventory.low_stock',
  'inventory.out_of_stock',
  'purchase.created',
  'purchase.updated',
]);

export type RezMerchantEventType = z.infer<typeof RezMerchantEventTypeSchema>;

export interface RezMerchantInventoryUpdate {
  productId: string;
  merchantId: string;
  productName: string;
  sku?: string;
  currentStock: number;
  threshold: number;
  unit: string;
  category?: string;
}

export interface RezMerchantPurchaseCreated {
  purchaseId: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    unit: string;
    unitPrice: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'prepaid' | 'net-terms' | 'bnpl';
  expectedDelivery?: string;
  notes?: string;
}

export interface RezMerchantPurchaseUpdated {
  purchaseId: string;
  purchaseNumber: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'processing' | 'shipped' | 'partial' | 'received' | 'cancelled';
  previousStatus?: string;
  updatedAt: string;
}

export interface RezMerchantWebhookEvent {
  id: string;
  source: 'rez-merchant';
  type: RezMerchantEventType;
  timestamp: string;
  signature: string;
  payload: unknown;
}

export const RezMerchantWebhookEventSchema = z.object({
  id: z.string().min(1),
  source: z.literal('rez-merchant'),
  type: RezMerchantEventTypeSchema,
  timestamp: z.string().datetime(),
  signature: z.string().min(1),
  payload: z.unknown(),
});

// ============================================
// Hotel PMS Webhook Events
// ============================================
export const HotelPMSEventTypeSchema = z.enum([
  'reservation.created',
  'reservation.modified',
  'reservation.cancelled',
  'inventory.sync',
]);

export type HotelPMSEventType = z.infer<typeof HotelPMSEventTypeSchema>;

export interface HotelPMSReservationCreated {
  reservationId: string;
  confirmationNumber: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  roomCount: number;
  roomType: string;
  guestCount: number;
  notes?: string;
}

export interface HotelPMSReservationModified {
  reservationId: string;
  confirmationNumber: string;
  previousCheckIn?: string;
  newCheckIn: string;
  previousCheckOut?: string;
  newCheckOut: string;
  previousRoomCount?: number;
  newRoomCount: number;
  modificationReason?: string;
}

export interface HotelPMSReservationCancelled {
  reservationId: string;
  confirmationNumber: string;
  cancelledAt: string;
  cancellationReason?: string;
  refundStatus?: 'pending' | 'processed' | 'not_applicable';
}

export interface HotelPMSInventorySync {
  hotelId: string;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    items: Array<{
      itemId: string;
      name: string;
      currentStock: number;
      parLevel: number;
      unit: string;
    }>;
  }>;
  syncedAt: string;
}

export interface HotelPMSWebhookEvent {
  id: string;
  source: 'hotel-pms';
  type: HotelPMSEventType;
  timestamp: string;
  signature: string;
  payload: unknown;
}

export const HotelPMSWebhookEventSchema = z.object({
  id: z.string().min(1),
  source: z.literal('hotel-pms'),
  type: HotelPMSEventTypeSchema,
  timestamp: z.string().datetime(),
  signature: z.string().min(1),
  payload: z.unknown(),
});

// ============================================
// Union type for all webhook events
// ============================================
export type WebhookEvent =
  | RestoPapaWebhookEvent
  | RezMerchantWebhookEvent
  | HotelPMSWebhookEvent;

export const WebhookEventSchema = z.union([
  RestoPapaWebhookEventSchema,
  RezMerchantWebhookEventSchema,
  HotelPMSWebhookEventSchema,
]);

// ============================================
// Webhook Verification
// ============================================
export interface WebhookVerificationInput {
  signature: string;
  timestamp: string;
  payload: string;
  secret: string;
}

export const WebhookVerificationInputSchema = z.object({
  signature: z.string().min(1),
  timestamp: z.string().min(1),
  payload: z.string().min(1),
  secret: z.string().min(1),
});
