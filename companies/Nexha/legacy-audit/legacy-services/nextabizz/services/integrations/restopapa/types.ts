/**
 * RestoPapa Integration Types
 *
 * This module defines all types for the RestoPapa inventory system integration.
 * RestoPapa is a restaurant inventory management system that provides:
 * - Low stock alerts
 * - Supply chain management
 * - Order tracking
 * - Maintenance scheduling
 */

import { z } from 'zod';

// ============================================
// Configuration Types
// ============================================

/**
 * RestoPapa API configuration
 */
export interface RestoPapaConfig {
  /** Base URL of the RestoPapa API */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Webhook secret for signature verification */
  webhookSecret: string;
  /** Callback URL for webhooks */
  webhookUrl?: string;
}

/**
 * Connection status for a merchant's RestoPapa integration
 */
export interface RestoPapaConnection {
  id: string;
  merchantId: string;
  restoPapaMerchantId: string;
  restoPapaLocationId?: string;
  apiKey: string;
  webhookSecret: string;
  webhookUrl?: string;
  isActive: boolean;
  lastSyncAt?: Date;
  syncFrequency: RestoPapaSyncFrequency;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync frequency options
 */
export const RestoPapaSyncFrequencySchema = z.enum(['realtime', 'hourly', 'daily', 'manual']);
export type RestoPapaSyncFrequency = z.infer<typeof RestoPapaSyncFrequencySchema>;

// ============================================
// Inventory Types
// ============================================

/**
 * RestoPapa product/inventory item
 */
export interface RestoPapaProduct {
  id: string;
  sku?: string;
  name: string;
  category?: string;
  currentStock: number;
  minStock?: number;
  maxStock?: number;
  unit: string;
  unitPrice?: number;
  supplierId?: string;
  supplierName?: string;
  lastRestocked?: Date;
  expiryDate?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Low stock item from RestoPapa
 */
export interface RestoPapaLowStockItem {
  productId: string;
  productName: string;
  sku?: string;
  category?: string;
  currentStock: number;
  minStock: number;
  unit: string;
  severity: 'low' | 'critical' | 'out_of_stock';
  suggestedReorderQty?: number;
  lastRestocked?: Date;
}

/**
 * Inventory sync result from RestoPapa
 */
export interface RestoPapaInventorySync {
  merchantId: string;
  syncId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'failed';
  itemsProcessed: number;
  lowStockItems: RestoPapaLowStockItem[];
  outOfStockItems: RestoPapaLowStockItem[];
  errors?: string[];
}

// ============================================
// Order Types
// ============================================

/**
 * RestoPapa order status
 */
export const RestoPapaOrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);
export type RestoPapaOrderStatus = z.infer<typeof RestoPapaOrderStatusSchema>;

/**
 * RestoPapa order item
 */
export interface RestoPapaOrderItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

/**
 * RestoPapa order
 */
export interface RestoPapaOrder {
  id: string;
  orderNumber: string;
  merchantId: string;
  supplierId?: string;
  supplierName?: string;
  status: RestoPapaOrderStatus;
  items: RestoPapaOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  deliveryAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  expectedDelivery?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Maintenance Types
// ============================================

/**
 * Maintenance request status
 */
export const MaintenanceStatusSchema = z.enum([
  'requested',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);
export type MaintenanceStatus = z.infer<typeof MaintenanceStatusSchema>;

/**
 * Maintenance priority
 */
export const MaintenancePrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type MaintenancePriority = z.infer<typeof MaintenancePrioritySchema>;

/**
 * RestoPapa maintenance request
 */
export interface RestoPapaMaintenanceRequest {
  id: string;
  requestNumber: string;
  merchantId: string;
  merchantName: string;
  equipmentId?: string;
  equipmentName?: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduledDate?: Date;
  assignedTo?: string;
  assignedToName?: string;
  estimatedCost?: number;
  actualCost?: number;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maintenance categories
 */
export const MaintenanceCategorySchema = z.enum([
  'equipment_repair',
  'plumbing',
  'electrical',
  'hvac',
  'cleaning',
  'pest_control',
  'safety_inspection',
  'preventive',
  'other',
]);
export type MaintenanceCategory = z.infer<typeof MaintenanceCategorySchema>;

// ============================================
// Webhook Types
// ============================================

/**
 * RestoPapa webhook event types
 */
export const RestoPapaWebhookEventSchema = z.enum([
  'inventory.low_stock',
  'inventory.out_of_stock',
  'inventory.stock_updated',
  'order.status_changed',
  'order.created',
  'maintenance.request_created',
  'maintenance.status_changed',
  'sync.completed',
]);
export type RestoPapaWebhookEvent = z.infer<typeof RestoPapaWebhookEventSchema>;

/**
 * Base webhook payload from RestoPapa
 */
export interface RestoPapaWebhookPayload {
  event: RestoPapaWebhookEvent;
  timestamp: Date;
  merchantId: string;
  locationId?: string;
  data: unknown;
  signature?: string;
}

/**
 * Inventory webhook data
 */
export interface RestoPapaInventoryWebhookData {
  productId: string;
  productName: string;
  sku?: string;
  category?: string;
  previousStock?: number;
  currentStock: number;
  minStock?: number;
  threshold?: number;
  unit: string;
}

/**
 * Order status change webhook data
 */
export interface RestoPapaOrderWebhookData {
  orderId: string;
  orderNumber: string;
  previousStatus?: RestoPapaOrderStatus;
  newStatus: RestoPapaOrderStatus;
  updatedAt: Date;
}

/**
 * Maintenance webhook data
 */
export interface RestoPapaMaintenanceWebhookData {
  requestId: string;
  requestNumber: string;
  previousStatus?: MaintenanceStatus;
  newStatus: MaintenanceStatus;
  title: string;
  priority: MaintenancePriority;
  scheduledDate?: Date;
}

// ============================================
// RFQ Types
// ============================================

/**
 * RFQ auto-creation options from RestoPapa low stock
 */
export interface RestoPapaRFQAutoCreateOptions {
  /** Merchant ID for the RFQ */
  merchantId: string;
  /** Low stock item to create RFQ for */
  lowStockItem: RestoPapaLowStockItem;
  /** Target price (optional) */
  targetPrice?: number;
  /** Delivery deadline (optional) */
  deliveryDeadline?: Date;
  /** Expiry date for the RFQ */
  expiresAt?: Date;
  /** Additional notes */
  notes?: string;
}

// ============================================
// API Response Types
// ============================================

/**
 * Generic API response wrapper
 */
export interface RestoPapaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Paginated API response
 */
export interface RestoPapaPaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// Sync Types
// ============================================

/**
 * Sync status for tracking
 */
export interface RestoPapaSyncStatus {
  id: string;
  merchantId: string;
  connectionId: string;
  syncType: 'full' | 'incremental';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  errors?: SyncError[];
}

/**
 * Sync error entry
 */
export interface SyncError {
  itemId: string;
  itemType: 'product' | 'order' | 'maintenance';
  error: string;
  timestamp: Date;
}

/**
 * Sync statistics
 */
export interface RestoPapaSyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSuccessfulSync?: Date;
  averageItemsPerSync: number;
  inventorySignalsGenerated: number;
  rfqsCreated: number;
  ordersSynced: number;
}
