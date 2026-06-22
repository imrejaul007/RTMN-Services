import { z } from 'zod';

// ============================================
// Service Quote Status Enum
// ============================================
export const ServiceQuoteStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_review',
  'accepted',
  'rejected',
  'expired',
  'withdrawn',
]);
export type ServiceQuoteStatus = z.infer<typeof ServiceQuoteStatusSchema>;

// ============================================
// Service Quote Entity
// ============================================
export interface ServiceQuote {
  id: string;
  quoteNumber: string;
  serviceRfqId: string;
  vendorId: string;
  merchantId: string;
  status: ServiceQuoteStatus;
  proposedStartDate?: Date;
  proposedEndDate?: Date;
  estimatedDurationDays?: number;
  estimatedHours?: number;
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;
  totalPrice: number;
  currency: string;
  paymentTerms?: string;
  validUntil?: Date;
  warrantyInfo?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  acceptedBy?: string;
  rejectedBy?: string;
  linkedServiceOrderId?: string;
}

// Service Quote Zod Schema
export const ServiceQuoteSchema = z.object({
  id: z.string().uuid(),
  quoteNumber: z.string().min(1),
  serviceRfqId: z.string().uuid(),
  vendorId: z.string().uuid(),
  merchantId: z.string().uuid(),
  status: ServiceQuoteStatusSchema,
  proposedStartDate: z.date().optional(),
  proposedEndDate: z.date().optional(),
  estimatedDurationDays: z.number().int().positive().optional(),
  estimatedHours: z.number().positive().optional(),
  laborCost: z.number().min(0).optional(),
  materialCost: z.number().min(0).optional(),
  equipmentCost: z.number().min(0).optional(),
  totalPrice: z.number().positive(),
  currency: z.string().default('INR'),
  paymentTerms: z.string().optional(),
  validUntil: z.date().optional(),
  warrantyInfo: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  submittedAt: z.date().optional(),
  acceptedAt: z.date().optional(),
  rejectedAt: z.date().optional(),
  acceptedBy: z.string().uuid().optional(),
  rejectedBy: z.string().uuid().optional(),
  linkedServiceOrderId: z.string().uuid().optional(),
});

// ============================================
// Material Line Item
// ============================================
export interface MaterialLineItem {
  id: string;
  quoteId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  isOptional: boolean;
  brand?: string;
  supplier?: string;
  deliveryDate?: Date;
  createdAt: Date;
}

export const MaterialLineItemSchema = z.object({
  id: z.string().uuid(),
  quoteId: z.string().uuid(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  isOptional: z.boolean().default(false),
  brand: z.string().optional(),
  supplier: z.string().optional(),
  deliveryDate: z.date().optional(),
  createdAt: z.date(),
});

// Material Line Item Input
export interface MaterialLineItemInput {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  isOptional?: boolean;
  brand?: string;
  supplier?: string;
  deliveryDate?: Date;
}

export const MaterialLineItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().min(0),
  isOptional: z.boolean().default(false),
  brand: z.string().optional(),
  supplier: z.string().optional(),
  deliveryDate: z.date().optional(),
});

// ============================================
// Create Service Quote Input
// ============================================
export interface CreateServiceQuoteInput {
  serviceRfqId: string;
  vendorId: string;
  merchantId: string;
  proposedStartDate?: Date;
  proposedEndDate?: Date;
  estimatedDurationDays?: number;
  estimatedHours?: number;
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;
  totalPrice: number;
  currency?: string;
  paymentTerms?: string;
  validUntil?: Date;
  warrantyInfo?: string;
  notes?: string;
  materials?: MaterialLineItemInput[];
}

export const CreateServiceQuoteSchema = z.object({
  serviceRfqId: z.string().uuid(),
  vendorId: z.string().uuid(),
  merchantId: z.string().uuid(),
  proposedStartDate: z.date().optional(),
  proposedEndDate: z.date().optional(),
  estimatedDurationDays: z.number().int().positive().optional(),
  estimatedHours: z.number().positive().optional(),
  laborCost: z.number().min(0).optional(),
  materialCost: z.number().min(0).optional(),
  equipmentCost: z.number().min(0).optional(),
  totalPrice: z.number().positive('Total price is required and must be positive'),
  currency: z.string().default('INR'),
  paymentTerms: z.string().optional(),
  validUntil: z.date().optional(),
  warrantyInfo: z.string().optional(),
  notes: z.string().optional(),
  materials: z.array(MaterialLineItemInputSchema).optional(),
});

// ============================================
// Update Service Quote Input
// ============================================
export interface UpdateServiceQuoteInput {
  proposedStartDate?: Date;
  proposedEndDate?: Date;
  estimatedDurationDays?: number;
  estimatedHours?: number;
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;
  totalPrice?: number;
  currency?: string;
  paymentTerms?: string;
  validUntil?: Date;
  warrantyInfo?: string;
  notes?: string;
  internalNotes?: string;
  status?: ServiceQuoteStatus;
  materials?: MaterialLineItemInput[];
}

export const UpdateServiceQuoteSchema = z.object({
  proposedStartDate: z.date().optional(),
  proposedEndDate: z.date().optional(),
  estimatedDurationDays: z.number().int().positive().optional(),
  estimatedHours: z.number().positive().optional(),
  laborCost: z.number().min(0).optional(),
  materialCost: z.number().min(0).optional(),
  equipmentCost: z.number().min(0).optional(),
  totalPrice: z.number().positive().optional(),
  currency: z.string().optional(),
  paymentTerms: z.string().optional(),
  validUntil: z.date().optional(),
  warrantyInfo: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  status: ServiceQuoteStatusSchema.optional(),
  materials: z.array(MaterialLineItemInputSchema).optional(),
});

// ============================================
// Accept/Reject Quote Input
// ============================================
export interface AcceptQuoteInput {
  acceptedBy: string;
  notes?: string;
}

export const AcceptQuoteSchema = z.object({
  acceptedBy: z.string().uuid('User ID is required'),
  notes: z.string().optional(),
});

export interface RejectQuoteInput {
  rejectedBy: string;
  reason?: string;
}

export const RejectQuoteSchema = z.object({
  rejectedBy: z.string().uuid('User ID is required'),
  reason: z.string().optional(),
});

// ============================================
// Submit Quote Input
// ============================================
export interface SubmitQuoteInput {
  vendorId: string;
}

export const SubmitQuoteSchema = z.object({
  vendorId: z.string().uuid('Vendor ID is required'),
});

// ============================================
// Quote Comparison View
// ============================================
export interface QuoteComparisonItem {
  quoteId: string;
  quoteNumber: string;
  vendorId: string;
  vendorName: string;
  status: ServiceQuoteStatus;
  totalPrice: number;
  currency: string;
  proposedStartDate?: Date;
  proposedEndDate?: Date;
  estimatedDurationDays?: number;
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;
  warrantyInfo?: string;
  validUntil?: Date;
  submittedAt?: Date;
  materialsCount: number;
  materials: MaterialLineItem[];
  paymentTerms?: string;
  notes?: string;
}

export interface QuoteComparison {
  serviceRfqId: string;
  rfqTitle: string;
  merchantId: string;
  merchantName: string;
  quotes: QuoteComparisonItem[];
  comparisonDate: Date;
  lowestPrice?: {
    quoteId: string;
    amount: number;
  };
  fastestDelivery?: {
    quoteId: string;
    days: number;
  };
  bestValue?: {
    quoteId: string;
    reason: string;
  };
}

// ============================================
// Service Quote Event Types
// ============================================
export const SERVICE_QUOTE_EVENTS = {
  CREATED: 'service_quote.created',
  UPDATED: 'service_quote.updated',
  SUBMITTED: 'service_quote.submitted',
  ACCEPTED: 'service_quote.accepted',
  REJECTED: 'service_quote.rejected',
  EXPIRED: 'service_quote.expired',
  WITHDRAWN: 'service_quote.withdrawn',
} as const;

export type ServiceQuoteEventType = typeof SERVICE_QUOTE_EVENTS[keyof typeof SERVICE_QUOTE_EVENTS];

// Valid status transitions for service quotes
export const SERVICE_QUOTE_STATUS_TRANSITIONS: Record<ServiceQuoteStatus, ServiceQuoteStatus[]> = {
  draft: ['submitted', 'withdrawn'],
  submitted: ['under_review', 'withdrawn'],
  under_review: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: [],
  withdrawn: [],
};
