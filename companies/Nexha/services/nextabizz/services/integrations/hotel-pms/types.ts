/**
 * Hotel PMS Integration Types
 *
 * Types for Hotel Property Management System integration with NEXABIZZ
 * Supports maintenance requests, service RFQs, and laundry vendor connections
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

/** Service categories for maintenance requests */
export const ServiceCategorySchema = z.enum([
  'plumbing',
  'electrical',
  'hvac',
  'cleaning',
  'laundry',
  'general',
]);
export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;

/** Status of maintenance requests */
export const MaintenanceStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);
export type MaintenanceStatus = z.infer<typeof MaintenanceStatusSchema>;

/** Priority levels for maintenance requests */
export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type Priority = z.infer<typeof PrioritySchema>;

/** Hotel PMS connection status */
export const ConnectionStatusSchema = z.enum([
  'connected',
  'disconnected',
  'error',
  'syncing',
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

// ============================================================================
// Hotel PMS API Types
// ============================================================================

/** Hotel PMS API Configuration */
export interface HotelPMSConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  webhookSecret?: string;
}

/** Hotel PMS Connection Record */
export interface HotelPMSConnection {
  id: string;
  merchantId: string;
  hotelPmsHotelId: string;
  hotelName: string;
  apiKey: string;
  apiSecret: string;
  webhookUrl: string;
  webhookSecret: string;
  status: ConnectionStatus;
  lastSyncAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Maintenance Request from Hotel PMS */
export interface MaintenanceRequest {
  id: string;
  hotelId: string;
  roomNumber?: string;
  category: ServiceCategory;
  title: string;
  description: string;
  priority: Priority;
  status: MaintenanceStatus;
  reportedBy?: string;
  reportedAt: Date;
  location: string;
  attachments?: string[];
  estimatedCost?: number;
  actualCost?: number;
  vendorId?: string;
  completedAt?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Service Request Types (NEXABIZZ)
// ============================================================================

/** Service Request created in NEXABIZZ from Hotel PMS maintenance request */
export interface ServiceRequest {
  id: string;
  connectionId: string;
  hotelPmsRequestId: string;
  merchantId: string;
  category: ServiceCategory;
  title: string;
  description: string;
  priority: Priority;
  status: MaintenanceStatus;
  rfqId?: string;
  location: string;
  roomNumber?: string;
  estimatedCost?: number;
  actualCost?: number;
  vendorId?: string;
  completedAt?: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Create Service Request Input */
export interface CreateServiceRequestInput {
  connectionId: string;
  hotelPmsRequestId: string;
  merchantId: string;
  category: ServiceCategory;
  title: string;
  description: string;
  priority: Priority;
  location: string;
  roomNumber?: string;
  estimatedCost?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Laundry Vendor Connection Types
// ============================================================================

/** Hotel Laundry Configuration */
export interface HotelLaundryConfig {
  id: string;
  connectionId: string;
  merchantId: string;
  dailyVolume?: number;
  unit: 'kg' | 'pieces';
  preferredVendorId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Laundry Service Request */
export interface LaundryServiceRequest {
  id: string;
  hotelLaundryConfigId: string;
  merchantId: string;
  vendorId: string;
  requestedAt: Date;
  quantity: number;
  unit: 'kg' | 'pieces';
  status: 'pending' | 'picked_up' | 'in_progress' | 'delivered' | 'completed';
  pickupDate?: Date;
  deliveryDate?: Date;
  notes?: string;
  rfqId?: string;
}

// ============================================================================
// Webhook Payload Types
// ============================================================================

/** Hotel PMS Webhook Event Types */
export const HotelPMSWebhookEventSchema = z.enum([
  'maintenance.request.created',
  'maintenance.request.updated',
  'maintenance.request.completed',
  'maintenance.request.cancelled',
  'inventory.low_stock',
  'laundry.pickup_scheduled',
  'laundry.delivery_completed',
]);
export type HotelPMSWebhookEvent = z.infer<typeof HotelPMSWebhookEventSchema>;

/** Maintenance Request Webhook Payload */
export const MaintenanceWebhookPayloadSchema = z.object({
  event: HotelPMSWebhookEventSchema,
  timestamp: z.string().datetime(),
  hotelId: z.string().min(1),
  data: z.object({
    requestId: z.string().min(1),
    roomNumber: z.string().optional(),
    category: ServiceCategorySchema,
    title: z.string().min(1),
    description: z.string(),
    priority: PrioritySchema,
    status: MaintenanceStatusSchema,
    reportedBy: z.string().optional(),
    reportedAt: z.string().datetime(),
    location: z.string().min(1),
    attachments: z.array(z.string()).optional(),
    estimatedCost: z.number().optional(),
    actualCost: z.number().optional(),
    vendorId: z.string().optional(),
    completedAt: z.string().datetime().optional(),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});
export type MaintenanceWebhookPayload = z.infer<typeof MaintenanceWebhookPayloadSchema>;

/** Laundry Webhook Payload */
export const LaundryWebhookPayloadSchema = z.object({
  event: z.enum(['laundry.pickup_scheduled', 'laundry.delivery_completed']),
  timestamp: z.string().datetime(),
  hotelId: z.string().min(1),
  data: z.object({
    laundryRequestId: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.enum(['kg', 'pieces']),
    scheduledDate: z.string().datetime(),
    vendorId: z.string().optional(),
    notes: z.string().optional(),
  }),
});
export type LaundryWebhookPayload = z.infer<typeof LaundryWebhookPayloadSchema>;

// ============================================================================
// RFQ Types for Service Requests
// ============================================================================

/** Service RFQ Creation Input */
export interface CreateServiceRFQInput {
  merchantId: string;
  serviceRequestId: string;
  category: ServiceCategory;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  targetPrice?: number;
  deliveryDeadline?: Date;
  preferredVendorIds?: string[];
}

/** RFQ Category Mapping */
export const RFQCategoryMap: Record<ServiceCategory, string> = {
  plumbing: 'Plumbing Services',
  electrical: 'Electrical Services',
  hvac: 'HVAC Services',
  cleaning: 'Cleaning Services',
  laundry: 'Laundry Services',
  general: 'General Maintenance',
};

// ============================================================================
// Sync Types
// ============================================================================

/** Sync Result */
export interface SyncResult {
  success: boolean;
  connectionId: string;
  syncedRequests: number;
  createdRFQs: number;
  errors: string[];
  syncedAt: Date;
}

/** Sync Options */
export interface SyncOptions {
  connectionId: string;
  fullSync?: boolean;
  since?: Date;
  categories?: ServiceCategory[];
}

// ============================================================================
// API Response Types
// ============================================================================

/** Connection Response */
export interface ConnectionResponse {
  success: boolean;
  connection?: HotelPMSConnection;
  message: string;
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
