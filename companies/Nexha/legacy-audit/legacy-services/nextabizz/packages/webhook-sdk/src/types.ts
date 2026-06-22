import { z } from 'zod';

/**
 * Supported webhook sources
 */
export const WebhookSourceSchema = z.enum(['restopapa', 'rez-merchant', 'hotel-pms']);
export type WebhookSource = z.infer<typeof WebhookSourceSchema>;

/**
 * Generic webhook payload structure
 */
export interface WebhookPayload {
  id: string;
  source: WebhookSource;
  type: string;
  timestamp: string;
  data: unknown;
}

/**
 * Generic webhook handler interface
 */
export interface WebhookHandler<T = unknown> {
  source: WebhookSource;
  type: string;
  handler: (payload: WebhookPayload & { data: T }) => Promise<void>;
}

/**
 * Common severity levels for inventory signals
 */
export const SeveritySchema = z.enum(['low', 'critical', 'out_of_stock']);
export type Severity = z.infer<typeof SeveritySchema>;

/**
 * Common signal types for inventory signals
 */
export const SignalTypeSchema = z.enum(['threshold_breach', 'manual_request', 'forecast_deficit']);
export type SignalType = z.infer<typeof SignalTypeSchema>;

/**
 * Common units for inventory measurements
 */
export const InventoryUnitSchema = z.enum(['kg', 'units', 'liters', 'packs', 'boxes', 'cases', 'pieces']);
export type InventoryUnit = z.infer<typeof InventoryUnitSchema>;

/**
 * Hotel departments that can send inventory signals
 */
export const HotelDepartmentSchema = z.enum(['housekeeping', 'kitchen', 'spa', 'front_desk', 'maintenance', 'laundry']);
export type HotelDepartment = z.infer<typeof HotelDepartmentSchema>;

/**
 * Inventory signal as stored in the database
 */
export interface InventorySignalRecord {
  id: string;
  merchantId: string;
  source: WebhookSource;
  sourceMerchantId: string;
  productId: string;
  productName: string;
  sku?: string;
  currentStock: number;
  threshold: number;
  unit: string;
  category?: string;
  department?: string;
  severity: Severity;
  signalType: SignalType;
  metadata?: Record<string, unknown>;
  signalTimestamp: string;
  receivedAt: string;
  processedAt?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Event record as stored in the events table
 */
export interface EventRecord {
  id: string;
  type: string;
  source: WebhookSource;
  payload: unknown;
  merchantId?: string;
  productId?: string;
  severity?: Severity;
  timestamp: string;
  createdAt: string;
}
