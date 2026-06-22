/**
 * Shared Entities - Product Types
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const ProductCategorySchema = z.enum([
  'fmcg', 'food', 'beverage', 'packaging',
  'equipment', 'supplies', 'pharmaceutical', 'cosmetic',
  'industrial', 'automotive', 'textile', 'other'
]);

export type ProductCategory = z.infer<typeof ProductCategorySchema>;

export const StockStatusSchema = z.enum([
  'in_stock', 'low_stock', 'out_of_stock', 'discontinued'
]);

export type StockStatus = z.infer<typeof StockStatusSchema>;

export const SignalSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export type SignalSeverity = z.infer<typeof SignalSeveritySchema>;

export const SignalTypeSchema = z.enum([
  'low_stock', 'out_of_stock', 'movement', 'threshold_breach',
  'forecast_deficit', 'manual_request'
]);

export type SignalType = z.infer<typeof SignalTypeSchema>;

export const ReorderUrgencySchema = z.enum(['low', 'medium', 'high', 'urgent', 'critical']);

export type ReorderUrgency = z.infer<typeof ReorderUrgencySchema>;

// ============================================================================
// Product Entity
// ============================================================================

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  description?: string;
  unit: string;
  minStockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  currentStock?: number;
  stockStatus: StockStatus;
  supplierId?: string;
  price?: number;
  metadata?: Record<string, unknown>;
}

export const ProductSchema: z.ZodType<Product> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  sku: z.string().min(1),
  category: ProductCategorySchema,
  description: z.string().optional(),
  unit: z.string().min(1),
  minStockLevel: z.number().optional(),
  reorderPoint: z.number().optional(),
  reorderQuantity: z.number().optional(),
  currentStock: z.number().optional(),
  stockStatus: StockStatusSchema,
  supplierId: z.string().optional(),
  price: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Inventory Signal Entity
// ============================================================================

export interface InventorySignal {
  id: string;
  merchantId: string;
  source: string;
  sourceProductId: string;
  sourceMerchantId: string;
  productName: string;
  sku?: string;
  currentStock: number;
  threshold: number;
  unit: string;
  category?: string;
  severity: SignalSeverity;
  signalType: SignalType;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export const InventorySignalSchema: z.ZodType<InventorySignal> = z.object({
  id: z.string().uuid(),
  merchantId: z.string(),
  source: z.string(),
  sourceProductId: z.string(),
  sourceMerchantId: z.string(),
  productName: z.string().min(1),
  sku: z.string().optional(),
  currentStock: z.number().min(0),
  threshold: z.number().min(0),
  unit: z.string().min(1),
  category: z.string().optional(),
  severity: SignalSeveritySchema,
  signalType: SignalTypeSchema,
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

// ============================================================================
// Reorder Signal Entity
// ============================================================================

export interface ReorderSignal {
  id: string;
  merchantId: string;
  inventorySignalId?: string;
  productId?: string;
  productName: string;
  suggestedQty?: number;
  urgency: ReorderUrgency;
  supplierId?: string;
  status: 'pending' | 'rfq_created' | 'ordered' | 'fulfilled';
  createdAt: Date;
}

export const ReorderSignalSchema: z.ZodType<ReorderSignal> = z.object({
  id: z.string().uuid(),
  merchantId: z.string(),
  inventorySignalId: z.string().optional(),
  productId: z.string().optional(),
  productName: z.string().min(1),
  suggestedQty: z.number().optional(),
  urgency: ReorderUrgencySchema,
  supplierId: z.string().optional(),
  status: z.enum(['pending', 'rfq_created', 'ordered', 'fulfilled']),
  createdAt: z.date(),
});

// ============================================================================
// Supplier Entity
// ============================================================================

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  categories: string[];
  rating?: number;
  status: 'active' | 'inactive' | 'suspended';
  score?: {
    quality: number;
    delivery: number;
    price: number;
    overall: number;
  };
  metadata?: Record<string, unknown>;
}

export const SupplierSchema: z.ZodType<Supplier> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  categories: z.array(z.string()),
  rating: z.number().optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
  score: z.object({
    quality: z.number(),
    delivery: z.number(),
    price: z.number(),
    overall: z.number(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Distributor Entity (NeXha DistributionOS)
// ============================================================================

export interface Distributor {
  id: string;
  name: string;
  type: 'distributor' | 'wholesaler' | 'stockist' | 'dealer';
  email: string;
  phone: string;
  territory: {
    regions: string[];
    cities: string[];
    zones: string[];
  };
  brands: string[];
  retailers: string[];
  status: 'active' | 'inactive' | 'suspended';
  score?: {
    sales: number;
    collections: number;
    logistics: number;
    overall: number;
  };
  metadata?: Record<string, unknown>;
}

export const DistributorSchema: z.ZodType<Distributor> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['distributor', 'wholesaler', 'stockist', 'dealer']),
  email: z.string().email(),
  phone: z.string().min(1),
  territory: z.object({
    regions: z.array(z.string()),
    cities: z.array(z.string()),
    zones: z.array(z.string()),
  }),
  brands: z.array(z.string()),
  retailers: z.array(z.string()),
  status: z.enum(['active', 'inactive', 'suspended']),
  score: z.object({
    sales: z.number(),
    collections: z.number(),
    logistics: z.number(),
    overall: z.number(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Franchise Entity (NeXha FranchiseOS)
// ============================================================================

export interface Franchise {
  id: string;
  brandId: string;
  brandName: string;
  locationId: string;
  locationName: string;
  franchiseeName: string;
  email: string;
  phone: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };
  type: 'owned' | 'franchise' | 'licensed';
  status: 'active' | 'inactive' | 'suspended';
  contract?: {
    startDate: Date;
    endDate: Date;
    royaltyRate?: number;
    marketingFee?: number;
  };
  performance?: {
    revenue: number;
    orders: number;
    customers: number;
    avgOrderValue: number;
  };
  metadata?: Record<string, unknown>;
}

export const FranchiseSchema: z.ZodType<Franchise> = z.object({
  id: z.string().uuid(),
  brandId: z.string(),
  brandName: z.string().min(1),
  locationId: z.string(),
  locationName: z.string(),
  franchiseeName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  }),
  type: z.enum(['owned', 'franchise', 'licensed']),
  status: z.enum(['active', 'inactive', 'suspended']),
  contract: z.object({
    startDate: z.date(),
    endDate: z.date(),
    royaltyRate: z.number().optional(),
    marketingFee: z.number().optional(),
  }).optional(),
  performance: z.object({
    revenue: z.number(),
    orders: z.number(),
    customers: z.number(),
    avgOrderValue: z.number(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});
