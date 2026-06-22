/**
 * WMS (Warehouse Management System) types — Phase C.5.
 *
 * Adds on top of the slot-booking model:
 *   - Bins (physical storage locations inside a warehouse)
 *   - Stock items (SKU + qty + bin assignment)
 *   - Stock movements (receive, putaway, pick, transfer out, transfer in, adjust)
 *   - Inter-warehouse transfers
 *   - Pick lists (for outbound orders)
 *
 * All quantities are non-negative integers; weight in kg.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Bins — a physical location inside a warehouse
// ─────────────────────────────────────────────────────────────────────────────

export const BinSchema = z.object({
  id: z.string(),
  warehouseId: z.string(),
  /** Human label: A-01-03 = Aisle A, Rack 01, Shelf 03 */
  code: z.string().min(1),
  /** Volume in cubic meters. */
  capacityM3: z.number().positive(),
  /** Weight capacity in kg. */
  capacityKg: z.number().positive(),
  /** Zone (cold / ambient / hazmat / bonded / returns). */
  zone: z.enum(['ambient', 'cold', 'hazmat', 'bonded', 'returns']),
  active: z.boolean().default(true),
});
export type Bin = z.infer<typeof BinSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Stock items — what is stored
// ─────────────────────────────────────────────────────────────────────────────

export const StockItemSchema = z.object({
  id: z.string(),
  /** Stock Keeping Unit — product identifier. */
  sku: z.string().min(1),
  warehouseId: z.string(),
  binId: z.string(),
  quantity: z.number().int().nonnegative(),
  weightKgPerUnit: z.number().positive(),
  /** Expiry (ISO) — null means no expiry. */
  expiry: z.string().nullable().optional(),
  /** Batch / lot id (for traceability). */
  batchId: z.string().nullable().optional(),
  receivedAt: z.string(),
});
export type StockItem = z.infer<typeof StockItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Stock movements — audit log of every quantity change
// ─────────────────────────────────────────────────────────────────────────────

export const MovementTypeSchema = z.enum([
  'receive',     // Inbound from supplier
  'putaway',     // Move from receiving to bin
  'pick',        // Outbound to customer
  'transfer_out',// Moved to another warehouse
  'transfer_in', // Received from another warehouse
  'adjust',      // Manual adjustment (cycle count)
]);
export type MovementType = z.infer<typeof MovementTypeSchema>;

export const MovementSchema = z.object({
  id: z.string(),
  type: MovementTypeSchema,
  sku: z.string(),
  warehouseId: z.string(),
  binId: z.string().nullable(),      // null for inter-warehouse
  quantity: z.number().int(),
  /** For transfer_out / transfer_in — paired id. */
  transferId: z.string().nullable().optional(),
  reason: z.string().min(1),
  at: z.string(),
});
export type Movement = z.infer<typeof MovementSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Transfers — inter-warehouse stock movement
// ─────────────────────────────────────────────────────────────────────────────

export const TransferStatusSchema = z.enum([
  'pending',   // Created, not yet picked from origin
  'in_transit',// Picked, in transit to destination
  'received',  // Received at destination, stock increased
  'cancelled', // Cancelled before pickup
]);
export type TransferStatus = z.infer<typeof TransferStatusSchema>;

export const TransferSchema = z.object({
  id: z.string(),
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  sku: z.string(),
  quantity: z.number().int().positive(),
  status: TransferStatusSchema,
  createdAt: z.string(),
  pickedAt: z.string().nullable().optional(),
  receivedAt: z.string().nullable().optional(),
});
export type Transfer = z.infer<typeof TransferSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Pick lists — outbound order fulfillment
// ─────────────────────────────────────────────────────────────────────────────

export const PickLineSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().positive(),
  /** Set by pick() — which bin to pull from. */
  binId: z.string().nullable().optional(),
  picked: z.boolean().default(false),
});
export type PickLine = z.infer<typeof PickLineSchema>;

export const PickListSchema = z.object({
  id: z.string(),
  warehouseId: z.string(),
  orderId: z.string(),
  lines: z.array(PickLineSchema).min(1),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']),
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
});
export type PickList = z.infer<typeof PickListSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// API request schemas
// ─────────────────────────────────────────────────────────────────────────────

export const ReceiveStockSchema = z.object({
  warehouseId: z.string(),
  binId: z.string(),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  weightKgPerUnit: z.number().positive(),
  expiry: z.string().nullable().optional(),
  batchId: z.string().nullable().optional(),
  reason: z.string().min(1).default('receive'),
});
export type ReceiveStockRequest = z.infer<typeof ReceiveStockSchema>;

export const AdjustStockSchema = z.object({
  warehouseId: z.string(),
  binId: z.string(),
  sku: z.string().min(1),
  newQuantity: z.number().int().nonnegative(),
  reason: z.string().min(1),
});
export type AdjustStockRequest = z.infer<typeof AdjustStockSchema>;

export const CreateTransferSchema = z.object({
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
});
export type CreateTransferRequest = z.infer<typeof CreateTransferSchema>;

export const CreatePickListSchema = z.object({
  warehouseId: z.string(),
  orderId: z.string().min(1),
  lines: z.array(z.object({
    sku: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
});
export type CreatePickListRequest = z.infer<typeof CreatePickListSchema>;

export const PickFromBinSchema = z.object({
  pickListId: z.string(),
  binId: z.string(),
  sku: z.string(),
  quantity: z.number().int().positive(),
});
export type PickFromBinRequest = z.infer<typeof PickFromBinSchema>;
