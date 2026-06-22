/**
 * REZ Merchant Integration Types
 *
 * Types for REZ Merchant API integration with NEXABIZZ
 * Supports inventory fetching, RFQ generation, maintenance needs, and order sync
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

/** REZ Merchant connection status */
export const RezMerchantConnectionStatusSchema = z.enum([
  'connected',
  'disconnected',
  'error',
  'syncing',
]);
export type RezMerchantConnectionStatus = z.infer<typeof RezMerchantConnectionStatusSchema>;

/** Order status from REZ Merchant */
export const RezOrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
]);
export type RezOrderStatus = z.infer<typeof RezOrderStatusSchema>;

/** Inventory sync status */
export const InventorySyncStatusSchema = z.enum([
  'synced',
  'pending',
  'failed',
]);
export type InventorySyncStatus = z.infer<typeof InventorySyncStatusSchema>;

/** RFQ priority */
export const RFQPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type RFQPriority = z.infer<typeof RFQPrioritySchema>;

/** Maintenance request type */
export const MaintenanceTypeSchema = z.enum([
  'repair',
  'replacement',
  'inspection',
  'preventive',
  'emergency',
]);
export type MaintenanceType = z.infer<typeof MaintenanceTypeSchema>;

// ============================================================================
// REZ Merchant API Types
// ============================================================================

/** REZ Merchant API Configuration */
export interface RezMerchantConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  webhookSecret?: string;
}

/** REZ Merchant Connection Record */
export interface RezMerchantConnection {
  id: string;
  merchantId: string;
  rezMerchantStoreId: string;
  storeName: string;
  apiKey: string;
  apiSecret: string;
  webhookUrl: string;
  webhookSecret: string;
  status: RezMerchantConnectionStatus;
  lastSyncAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Inventory Item from REZ Merchant */
export interface InventoryItem {
  id: string;
  storeId: string;
  productId: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  unitPrice: number;
  supplierId?: string;
  isActive: boolean;
  lastUpdated: Date;
  metadata?: Record<string, unknown>;
}

/** Order from REZ Merchant */
export interface RezOrder {
  id: string;
  storeId: string;
  orderNumber: string;
  status: RezOrderStatus;
  customerId?: string;
  customerName?: string;
  items: RezOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  metadata?: Record<string, unknown>;
}

/** Order Item from REZ Merchant */
export interface RezOrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
}

/** Maintenance Request from REZ Merchant */
export interface MaintenanceRequest {
  id: string;
  storeId: string;
  title: string;
  description: string;
  type: MaintenanceType;
  priority: RFQPriority;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  category: string;
  estimatedCost?: number;
  actualCost?: number;
  vendorId?: string;
  location?: string;
  roomNumber?: string;
  reportedBy?: string;
  reportedAt: Date;
  scheduledDate?: Date;
  completedAt?: Date;
  notes?: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
}

/** Bulk Supply RFQ Request */
export interface BulkSupplyRFQRequest {
  merchantId: string;
  connectionId: string;
  items: Array<{
    productId?: string;
    productName: string;
    sku?: string;
    category: string;
    quantity: number;
    unit: string;
    targetPrice?: number;
    preferredSupplierIds?: string[];
  }>;
  deliveryDeadline?: Date;
  priority: RFQPriority;
  notes?: string;
}

// ============================================================================
// Webhook Payload Types
// ============================================================================

/** REZ Merchant Webhook Event Types */
export const RezMerchantWebhookEventSchema = z.enum([
  'inventory.updated',
  'inventory.low_stock',
  'inventory.out_of_stock',
  'order.created',
  'order.updated',
  'order.status_changed',
  'order.shipped',
  'order.delivered',
  'order.cancelled',
  'maintenance.created',
  'maintenance.updated',
  'maintenance.completed',
]);
export type RezMerchantWebhookEvent = z.infer<typeof RezMerchantWebhookEventSchema>;

/** Inventory Update Webhook Payload */
export const InventoryWebhookPayloadSchema = z.object({
  event: z.enum(['inventory.updated', 'inventory.low_stock', 'inventory.out_of_stock']),
  timestamp: z.string().datetime(),
  storeId: z.string().min(1),
  data: z.object({
    productId: z.string().min(1),
    sku: z.string().optional(),
    name: z.string().min(1),
    category: z.string().optional(),
    previousStock: z.number().min(0).optional(),
    currentStock: z.number().min(0),
    reorderLevel: z.number().min(0).optional(),
    unit: z.string().min(1),
    unitPrice: z.number().min(0).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});
export type InventoryWebhookPayload = z.infer<typeof InventoryWebhookPayloadSchema>;

/** Order Webhook Payload */
export const OrderWebhookPayloadSchema = z.object({
  event: z.enum([
    'order.created',
    'order.updated',
    'order.status_changed',
    'order.shipped',
    'order.delivered',
    'order.cancelled',
  ]),
  timestamp: z.string().datetime(),
  storeId: z.string().min(1),
  data: z.object({
    orderId: z.string().min(1),
    orderNumber: z.string().min(1),
    status: RezOrderStatusSchema,
    previousStatus: RezOrderStatusSchema.optional(),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    subtotal: z.number().min(0),
    tax: z.number().min(0).optional(),
    total: z.number().min(0),
    itemCount: z.number().int().min(0),
    shippingAddress: z.object({
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      pincode: z.string(),
      country: z.string().optional(),
    }).optional(),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});
export type OrderWebhookPayload = z.infer<typeof OrderWebhookPayloadSchema>;

/** Maintenance Webhook Payload */
export const MaintenanceWebhookPayloadSchema = z.object({
  event: z.enum(['maintenance.created', 'maintenance.updated', 'maintenance.completed']),
  timestamp: z.string().datetime(),
  storeId: z.string().min(1),
  data: z.object({
    requestId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    type: MaintenanceTypeSchema,
    priority: RFQPrioritySchema,
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
    category: z.string().optional(),
    estimatedCost: z.number().optional(),
    actualCost: z.number().optional(),
    vendorId: z.string().optional(),
    location: z.string().optional(),
    roomNumber: z.string().optional(),
    reportedBy: z.string().optional(),
    reportedAt: z.string().datetime(),
    scheduledDate: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});
export type MaintenanceWebhookPayload = z.infer<typeof MaintenanceWebhookPayloadSchema>;

// ============================================================================
// Sync Types
// ============================================================================

/** Sync Result */
export interface SyncResult {
  success: boolean;
  connectionId: string;
  syncedInventory: number;
  syncedOrders: number;
  createdRFQs: number;
  errors: string[];
  syncedAt: Date;
}

/** Sync Options */
export interface SyncOptions {
  connectionId: string;
  fullSync?: boolean;
  since?: Date;
  syncInventory?: boolean;
  syncOrders?: boolean;
  syncMaintenance?: boolean;
}

/** Inventory Sync Record */
export interface InventorySyncRecord {
  id: string;
  connectionId: string;
  merchantId: string;
  productId: string;
  sku?: string;
  productName: string;
  previousStock?: number;
  currentStock: number;
  reorderLevel?: number;
  unit: string;
  status: InventorySyncStatus;
  syncedAt: Date;
}

/** Order Sync Record */
export interface OrderSyncRecord {
  id: string;
  connectionId: string;
  merchantId: string;
  orderId: string;
  orderNumber: string;
  status: RezOrderStatus;
  previousStatus?: RezOrderStatus;
  syncedAt: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Connection Response */
export interface ConnectionResponse {
  success: boolean;
  connection?: RezMerchantConnection;
  message: string;
}

/** Inventory Response */
export interface InventoryResponse {
  success: boolean;
  items?: InventoryItem[];
  total?: number;
  error?: string;
}

/** Sync Response */
export interface SyncResponse {
  success: boolean;
  result?: SyncResult;
  message: string;
}

/** Webhook Response */
export interface WebhookResponse {
  received: boolean;
  processed: boolean;
  error?: string;
}

/** RFQ Generation Request */
export interface GenerateRFQRequest {
  merchantId: string;
  connectionId: string;
  title: string;
  description?: string;
  category: string;
  items: Array<{
    productName: string;
    sku?: string;
    quantity: number;
    unit: string;
    targetPrice?: number;
  }>;
  priority: RFQPriority;
  deliveryDeadline?: Date;
  notes?: string;
}

/** RFQ Generation Response */
export interface GenerateRFQResponse {
  success: boolean;
  rfqId?: string;
  rfqNumber?: string;
  message: string;
}
