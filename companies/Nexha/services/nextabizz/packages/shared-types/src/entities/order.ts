import { z } from 'zod';

// PO Status Enum (matches DB: purchase_orders.status CHECK)
export const POStatusSchema = z.enum(['draft', 'sent', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'closed']);
export type POStatus = z.infer<typeof POStatusSchema>;

// Payment Status Enum
export const PaymentStatusSchema = z.enum(['pending', 'partial', 'paid']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

// Payment Method Enum (matches DB: purchase_orders.payment_method - TEXT type, allows any)
export const PaymentMethodSchema = z.enum(['prepaid', 'net-terms', 'bnpl', 'credit', 'cod', 'upi', 'bank_transfer']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

// PO Source Enum (matches DB: purchase_orders.source CHECK)
export const POSourceSchema = z.enum(['manual', 'rfq', 'reorder', 'api', 'auto']);
export type POSource = z.infer<typeof POSourceSchema>;

// Address Entity
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

// Address Zod Schema
export const AddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^[0-9]{6}$/, 'Pincode must be 6 digits'),
});

// Purchase Order Entity
export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  merchantId: string;
  supplierId: string;
  status: POStatus;
  subtotal: number;
  netAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  deliveryAddress?: Address;
  expectedDelivery?: Date;
  actualDelivery?: Date;
  notes?: string;
  source: POSource;
  rfqId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Purchase Order Zod Schema
export const PurchaseOrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string().min(1),
  merchantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  status: POStatusSchema,
  subtotal: z.number().min(0),
  netAmount: z.number().min(0),
  paymentStatus: PaymentStatusSchema,
  paymentMethod: PaymentMethodSchema.optional(),
  deliveryAddress: AddressSchema.optional(),
  expectedDelivery: z.date().optional(),
  actualDelivery: z.date().optional(),
  notes: z.string().optional(),
  source: POSourceSchema,
  rfqId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// PO Item Entity
export interface POItem {
  id: string;
  poId: string;
  supplierProductId?: string;
  name: string;
  sku?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  receivedQty: number;
  createdAt: Date;
}

// PO Item Zod Schema
export const POItemSchema = z.object({
  id: z.string().uuid(),
  poId: z.string().uuid(),
  supplierProductId: z.string().uuid().optional(),
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional(),
  qty: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
  receivedQty: z.number().min(0).default(0),
  createdAt: z.date(),
});

// PO Item Input
export interface POItemInput {
  supplierProductId?: string;
  name: string;
  sku?: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

// PO Item Input Zod Schema
export const POItemInputSchema = z.object({
  supplierProductId: z.string().uuid().optional(),
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional(),
  qty: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().min(0),
});

// Create Purchase Order Input
export interface CreatePurchaseOrderInput {
  merchantId: string;
  supplierId: string;
  items: POItemInput[];
  paymentMethod?: PaymentMethod;
  deliveryAddress?: Address;
  expectedDelivery?: Date;
  notes?: string;
  source: POSource;
  rfqId?: string;
}

// Create Purchase Order Zod Schema
export const CreatePurchaseOrderSchema = z.object({
  merchantId: z.string().uuid(),
  supplierId: z.string().uuid(),
  items: z.array(POItemInputSchema).min(1, 'At least one item is required'),
  paymentMethod: PaymentMethodSchema.optional(),
  deliveryAddress: AddressSchema.optional(),
  expectedDelivery: z.date().optional(),
  notes: z.string().optional(),
  source: POSourceSchema,
  rfqId: z.string().uuid().optional(),
});

// Update PO Status Input
export interface UpdatePOStatusInput {
  status: POStatus;
  actualDelivery?: Date;
  notes?: string;
}

// Update PO Status Zod Schema
export const UpdatePOStatusSchema = z.object({
  status: POStatusSchema,
  actualDelivery: z.date().optional(),
  notes: z.string().optional(),
});

// Update PO Item Input
export interface UpdatePOItemInput {
  receivedQty: number;
}

// Update PO Item Zod Schema
export const UpdatePOItemSchema = z.object({
  receivedQty: z.number().min(0),
});

