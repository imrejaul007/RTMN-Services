/**
 * Shared Entities - Order Types
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const POStatusSchema = z.enum([
  'draft', 'sent', 'acknowledged', 'processing',
  'shipped', 'delivered', 'cancelled', 'returned'
]);

export type POStatus = z.infer<typeof POStatusSchema>;

export const RFQStatusSchema = z.enum([
  'draft', 'open', 'quoted', 'awarded', 'closed', 'cancelled'
]);

export type RFQStatus = z.infer<typeof RFQStatusSchema>;

export const PaymentStatusSchema = z.enum([
  'pending', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'
]);

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

// ============================================================================
// Line Item
// ============================================================================

export interface LineItem {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  tax?: number;
  discount?: number;
  metadata?: Record<string, unknown>;
}

export const LineItemSchema: z.ZodType<LineItem> = z.object({
  id: z.string().uuid(),
  productId: z.string(),
  productName: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  tax: z.number().optional(),
  discount: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Purchase Order (PO)
// ============================================================================

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  type: 'purchase' | 'service';
  merchantId: string;
  supplierId: string;
  source: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: POStatus;
  paymentStatus: PaymentStatus;
  expectedDelivery?: Date;
  actualDelivery?: Date;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export const PurchaseOrderSchema: z.ZodType<PurchaseOrder> = z.object({
  id: z.string().uuid(),
  orderNumber: z.string().min(1),
  type: z.enum(['purchase', 'service']),
  merchantId: z.string(),
  supplierId: z.string(),
  source: z.string(),
  items: z.array(LineItemSchema),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  total: z.number().nonnegative(),
  status: POStatusSchema,
  paymentStatus: PaymentStatusSchema,
  expectedDelivery: z.date().optional(),
  actualDelivery: z.date().optional(),
  shippingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Request for Quote (RFQ)
// ============================================================================

export interface RFQItem {
  id: string;
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  specifications?: string;
  metadata?: Record<string, unknown>;
}

export const RFQItemSchema: z.ZodType<RFQItem> = z.object({
  id: z.string().uuid(),
  productName: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  specifications: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export interface RFQQuote {
  id: string;
  supplierId: string;
  supplierName: string;
  validUntil?: Date;
  items: Array<{
    rfqItemId: string;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  deliveryTime?: string;
  paymentTerms?: string;
  notes?: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'withdrawn';
  submittedAt: Date;
}

export const RFQQuoteSchema: z.ZodType<RFQQuote> = z.object({
  id: z.string().uuid(),
  supplierId: z.string(),
  supplierName: z.string().min(1),
  validUntil: z.date().optional(),
  items: z.array(z.object({
    rfqItemId: z.string().uuid(),
    unitPrice: z.number().nonnegative(),
    totalPrice: z.number().nonnegative(),
    notes: z.string().optional(),
  })),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  total: z.number().nonnegative(),
  deliveryTime: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['submitted', 'accepted', 'rejected', 'withdrawn']),
  submittedAt: z.date(),
});

export interface RFQ {
  id: string;
  rfqNumber: string;
  merchantId: string;
  title: string;
  description?: string;
  items: RFQItem[];
  quotes: RFQQuote[];
  status: RFQStatus;
  deadline: Date;
  awardedSupplierId?: string;
  awardedQuoteId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export const RFQSchema: z.ZodType<RFQ> = z.object({
  id: z.string().uuid(),
  rfqNumber: z.string().min(1),
  merchantId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(RFQItemSchema),
  quotes: z.array(RFQQuoteSchema),
  status: RFQStatusSchema,
  deadline: z.date(),
  awardedSupplierId: z.string().optional(),
  awardedQuoteId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  source: z.string(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Service Order
// ============================================================================

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  merchantId: string;
  merchantName: string;
  supplierId?: string;
  supplierName?: string;
  type: 'service' | 'maintenance' | 'repair';
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  paymentStatus: PaymentStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  schedule?: {
    scheduledDate: Date;
    startTime: string;
    endTime: string;
  };
  assignedTo?: string;
  completedAt?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export const ServiceOrderSchema: z.ZodType<ServiceOrder> = z.object({
  id: z.string().uuid(),
  orderNumber: z.string().min(1),
  merchantId: z.string(),
  merchantName: z.string().min(1),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  type: z.enum(['service', 'maintenance', 'repair']),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']),
  paymentStatus: PaymentStatusSchema,
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  total: z.number().nonnegative(),
  schedule: z.object({
    scheduledDate: z.date(),
    startTime: z.string(),
    endTime: z.string(),
  }).optional(),
  assignedTo: z.string().optional(),
  completedAt: z.date().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Service Quote
// ============================================================================

export interface ServiceQuote {
  id: string;
  quoteNumber: string;
  serviceOrderId?: string;
  merchantId: string;
  supplierId: string;
  supplierName: string;
  title: string;
  description?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  validUntil?: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export const ServiceQuoteSchema: z.ZodType<ServiceQuote> = z.object({
  id: z.string().uuid(),
  quoteNumber: z.string().min(1),
  serviceOrderId: z.string().optional(),
  merchantId: z.string(),
  supplierId: z.string(),
  supplierName: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative(),
  })),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  total: z.number().nonnegative(),
  validUntil: z.date().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
