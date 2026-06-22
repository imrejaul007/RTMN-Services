import { z } from 'zod';

// Merchant Category Enum
export const MerchantCategorySchema = z.enum(['restaurant', 'hotel', 'salon', 'retail', 'pharmacy']);
export type MerchantCategory = z.infer<typeof MerchantCategorySchema>;

// Merchant Source Enum (matches DB: merchants.source CHECK and seed data)
export const MerchantSourceSchema = z.enum(['rez', 'restopapa', 'hotel-pms', 'manual', 'api', 'inventory_system']);
export type MerchantSource = z.infer<typeof MerchantSourceSchema>;

// Merchant Entity
export interface Merchant {
  id: string;
  rezMerchantId: string;
  businessName: string;
  category: MerchantCategory;
  city?: string;
  email?: string;
  phone?: string;
  source: MerchantSource;
  sourceMerchantId: string;
  creditLineId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Merchant Zod Schema
export const MerchantSchema = z.object({
  id: z.string().uuid(),
  rezMerchantId: z.string().min(1),
  businessName: z.string().min(1, 'Business name is required'),
  category: MerchantCategorySchema,
  city: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  source: MerchantSourceSchema,
  sourceMerchantId: z.string().min(1),
  creditLineId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create Merchant Input
export interface CreateMerchantInput {
  rezMerchantId: string;
  businessName: string;
  category: MerchantCategory;
  city?: string;
  email?: string;
  phone?: string;
  source: MerchantSource;
  sourceMerchantId: string;
  creditLineId?: string;
}

// Create Merchant Zod Schema
export const CreateMerchantSchema = z.object({
  rezMerchantId: z.string().min(1),
  businessName: z.string().min(1, 'Business name is required'),
  category: MerchantCategorySchema,
  city: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  source: MerchantSourceSchema,
  sourceMerchantId: z.string().min(1),
  creditLineId: z.string().uuid().optional(),
});

// Update Merchant Input
export interface UpdateMerchantInput {
  businessName?: string;
  category?: MerchantCategory;
  city?: string;
  email?: string;
  phone?: string;
  creditLineId?: string;
}

// Update Merchant Zod Schema
export const UpdateMerchantSchema = z.object({
  businessName: z.string().min(1).optional(),
  category: MerchantCategorySchema.optional(),
  city: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  creditLineId: z.string().uuid().optional(),
});

