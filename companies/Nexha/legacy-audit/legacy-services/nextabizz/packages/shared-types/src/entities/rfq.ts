import { z } from 'zod';

// RFQ Status Enum (matches DB: rfqs.status CHECK)
export const RFQStatusSchema = z.enum(['open', 'closed', 'awarded', 'cancelled', 'expired']);
export type RFQStatus = z.infer<typeof RFQStatusSchema>;

// RFQ Entity
export interface RFQ {
  id: string;
  rfqNumber: string;
  merchantId: string;
  title: string;
  description?: string;
  category?: string;
  quantity: number;
  unit: string;
  targetPrice?: number;
  deliveryDeadline?: Date;
  status: RFQStatus;
  awardedTo?: string;
  linkedPoId?: string;
  createdAt: Date;
  expiresAt?: Date;
  updatedAt: Date;
}

// RFQ Zod Schema
export const RFQSchema = z.object({
  id: z.string().uuid(),
  rfqNumber: z.string().min(1),
  merchantId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  targetPrice: z.number().positive().optional(),
  deliveryDeadline: z.date().optional(),
  status: RFQStatusSchema,
  awardedTo: z.string().uuid().optional(),
  linkedPoId: z.string().uuid().optional(),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
  updatedAt: z.date(),
});

// RFQ Response Entity
export interface RFQResponse {
  id: string;
  rfqId: string;
  supplierId: string;
  unitPrice: number;
  totalPrice: number;
  leadTimeDays?: number;
  notes?: string;
  submittedAt: Date;
}

// RFQ Response Zod Schema
export const RFQResponseSchema = z.object({
  id: z.string().uuid(),
  rfqId: z.string().uuid(),
  supplierId: z.string().uuid(),
  unitPrice: z.number().positive('Unit price must be positive'),
  totalPrice: z.number().positive('Total price must be positive'),
  leadTimeDays: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  submittedAt: z.date(),
});

// Create RFQ Input
export interface CreateRFQInput {
  merchantId: string;
  title: string;
  description?: string;
  category?: string;
  quantity: number;
  unit: string;
  targetPrice?: number;
  deliveryDeadline?: Date;
  expiresAt?: Date;
}

// Create RFQ Zod Schema
export const CreateRFQSchema = z.object({
  merchantId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  targetPrice: z.number().positive().optional(),
  deliveryDeadline: z.date().optional(),
  expiresAt: z.date().optional(),
});

// RFQ Respond Input
export interface RFQRespondInput {
  supplierId: string;
  unitPrice: number;
  leadTimeDays?: number;
  notes?: string;
}

// RFQ Respond Zod Schema
export const RFQRespondSchema = z.object({
  supplierId: z.string().uuid(),
  unitPrice: z.number().positive('Unit price must be positive'),
  leadTimeDays: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

// Award RFQ Input
export interface AwardRFQInput {
  awardedTo: string;
}

// Award RFQ Zod Schema
export const AwardRFQSchema = z.object({
  awardedTo: z.string().uuid('Valid supplier ID is required'),
});

// Update RFQ Status Input
export interface UpdateRFQStatusInput {
  status: RFQStatus;
}

// Update RFQ Status Zod Schema
export const UpdateRFQStatusSchema = z.object({
  status: RFQStatusSchema,
});

