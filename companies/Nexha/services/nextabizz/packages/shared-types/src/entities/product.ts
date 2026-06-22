import { z } from 'zod';

// Product Source Enum
export const ProductSourceSchema = z.enum(['restopapa', 'rez-merchant', 'hotel-pms', 'manual', 'inventory_system']);
export type ProductSource = z.infer<typeof ProductSourceSchema>;

// Signal Severity Enum (matches DB: inventory_signals.severity CHECK)
export const SignalSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type SignalSeverity = z.infer<typeof SignalSeveritySchema>;

// Signal Type Enum (matches DB: inventory_signals.signal_type CHECK)
export const SignalTypeSchema = z.enum(['low_stock', 'out_of_stock', 'expiring', 'overstock', 'movement']);
export type SignalType = z.infer<typeof SignalTypeSchema>;

// Reorder Signal Status Enum (matches DB: reorder_signals.status CHECK)
export const ReorderSignalStatusSchema = z.enum(['pending', 'matched', 'po_created', 'dismissed']);
export type ReorderSignalStatus = z.infer<typeof ReorderSignalStatusSchema>;

// Reorder Signal Urgency Enum (matches DB: reorder_signals.urgency CHECK)
export const ReorderUrgencySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type ReorderUrgency = z.infer<typeof ReorderUrgencySchema>;

// Inventory Signal Entity
export interface InventorySignal {
  id: string;
  merchantId: string;
  source: ProductSource;
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

// Inventory Signal Zod Schema
export const InventorySignalSchema = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  source: ProductSourceSchema,
  sourceProductId: z.string().min(1),
  sourceMerchantId: z.string().min(1),
  productName: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  currentStock: z.number().min(0),
  threshold: z.number().min(0),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().optional(),
  severity: SignalSeveritySchema,
  signalType: SignalTypeSchema,
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

// Create Inventory Signal Input
export interface CreateInventorySignalInput {
  merchantId: string;
  source: ProductSource;
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
}

// Create Inventory Signal Zod Schema
export const CreateInventorySignalSchema = z.object({
  merchantId: z.string().uuid(),
  source: ProductSourceSchema,
  sourceProductId: z.string().min(1),
  sourceMerchantId: z.string().min(1),
  productName: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  currentStock: z.number().min(0),
  threshold: z.number().min(0),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().optional(),
  severity: SignalSeveritySchema,
  signalType: SignalTypeSchema,
  metadata: z.record(z.unknown()).optional(),
});

// Reorder Signal Entity
export interface ReorderSignal {
  id: string;
  merchantId: string;
  inventorySignalId?: string;
  suggestedQty?: number;
  urgency: ReorderUrgency;
  status: ReorderSignalStatus;
  matchConfidence?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Reorder Signal Zod Schema
export const ReorderSignalSchema = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  inventorySignalId: z.string().uuid().optional(),
  suggestedQty: z.number().positive().optional(),
  urgency: ReorderUrgencySchema,
  status: ReorderSignalStatusSchema,
  // DB stores as DECIMAL(3, 2) 0-1, normalized to 0-100 for consistency
  matchConfidence: z.number().min(0).max(1).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create Reorder Signal Input
export interface CreateReorderSignalInput {
  merchantId: string;
  inventorySignalId?: string;
  suggestedQty?: number;
  urgency: ReorderUrgency;
  matchConfidence?: number;
}

// Create Reorder Signal Zod Schema
export const CreateReorderSignalSchema = z.object({
  merchantId: z.string().uuid(),
  inventorySignalId: z.string().uuid().optional(),
  suggestedQty: z.number().positive().optional(),
  urgency: ReorderUrgencySchema,
  // DB stores as DECIMAL(3, 2) 0-1, normalized to 0-100 for consistency
  matchConfidence: z.number().min(0).max(1).optional(),
});

// Update Reorder Signal Input
export interface UpdateReorderSignalInput {
  status?: ReorderSignalStatus;
  matchConfidence?: number;
}

// Update Reorder Signal Zod Schema
export const UpdateReorderSignalSchema = z.object({
  status: ReorderSignalStatusSchema.optional(),
  // DB stores as DECIMAL(3, 2) 0-1, normalized to 0-100 for consistency
  matchConfidence: z.number().min(0).max(1).optional(),
});

