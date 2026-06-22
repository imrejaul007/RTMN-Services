import { z } from 'zod';

// Supplier Entity
export interface Supplier {
  id: string;
  businessName: string;
  gstNumber?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  categories: string[];
  rating: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Supplier Zod Schema
export const SupplierSchema = z.object({
  id: z.string().uuid(),
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().or(z.literal('')),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  categories: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).default(0),
  isVerified: z.boolean().default(false),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create Supplier Input
export interface CreateSupplierInput {
  businessName: string;
  gstNumber?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  categories?: string[];
}

// Create Supplier Zod Schema
export const CreateSupplierSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional().or(z.literal('')),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  categories: z.array(z.string()).optional().default([]),
});

// Supplier Product Entity
export interface SupplierProduct {
  id: string;
  supplierId: string;
  categoryId?: string;
  name: string;
  sku?: string;
  description?: string;
  unit: string;
  moq: number;
  price: number;
  bulkPricing?: { qty: number; price: number }[];
  images?: string[];
  isActive: boolean;
  deliveryDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Bulk Pricing Schema
// Note: DB column 'bulk_pricing' uses min_qty, but we expose it as qty for cleaner API
export const BulkPricingSchema = z.object({
  // Maps to DB column 'min_qty' in bulk_pricing JSONB
  qty: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
});

// Supplier Product Zod Schema
export const SupplierProductSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  moq: z.number().int().positive().default(1),
  price: z.number().positive('Price must be positive'),
  bulkPricing: z.array(BulkPricingSchema).optional(),
  images: z.array(z.string().url()).optional(),
  isActive: z.boolean().default(true),
  deliveryDays: z.number().int().min(0).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create Supplier Product Input
export interface CreateSupplierProductInput {
  supplierId: string;
  categoryId?: string;
  name: string;
  sku?: string;
  description?: string;
  unit: string;
  moq?: number;
  price: number;
  bulkPricing?: { qty: number; price: number }[];
  images?: string[];
  deliveryDays?: number;
}

// Create Supplier Product Zod Schema
export const CreateSupplierProductSchema = z.object({
  supplierId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  moq: z.number().int().positive().default(1),
  price: z.number().positive('Price must be positive'),
  bulkPricing: z.array(BulkPricingSchema).optional(),
  images: z.array(z.string().url()).optional(),
  deliveryDays: z.number().int().min(0).optional(),
});

// Supplier Category Entity
export interface SupplierCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  icon?: string;
  displayOrder: number;
  createdAt: Date;
}

// Supplier Category Zod Schema
export const SupplierCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  parentId: z.string().uuid().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().int().default(0),
  createdAt: z.date(),
});

// Supplier Score Entity
export interface SupplierScore {
  id: string;
  supplierId: string;
  period: 'monthly' | 'quarterly';
  periodStart: Date;
  periodEnd: Date;
  // DB stores rate fields as DECIMAL(5, 4) 0-1, keeping same scale in TypeScript
  onTimeDeliveryRate: number;
  qualityRejectionRate: number;
  priceConsistency: number;
  avgLeadTimeDays?: number;
  responseRate: number;
  // DB stores overall_score as DECIMAL(3, 2) 0-5 (not 0-100)
  overallScore: number;
  creditBoost: number;
  calculatedAt: Date;
}

// Supplier Score Zod Schema
export const SupplierScoreSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  period: z.enum(['monthly', 'quarterly']),
  periodStart: z.date(),
  periodEnd: z.date(),
  // DB stores as DECIMAL(5, 4) 0-1
  onTimeDeliveryRate: z.number().min(0).max(1),
  qualityRejectionRate: z.number().min(0).max(1),
  priceConsistency: z.number().min(0).max(1),
  avgLeadTimeDays: z.number().min(0).optional(),
  // DB stores as DECIMAL(5, 4) 0-1
  responseRate: z.number().min(0).max(1),
  // DB stores as DECIMAL(3, 2) 0-5 (not 0-100)
  overallScore: z.number().min(0).max(5),
  creditBoost: z.number().min(0).max(10),
  calculatedAt: z.date(),
});

