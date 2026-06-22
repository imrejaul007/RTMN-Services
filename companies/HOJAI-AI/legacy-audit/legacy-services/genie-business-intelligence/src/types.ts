/**
 * GENIE Business Intelligence Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: Business insights and reports for REZ Merchants
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Business Summary
 */
export interface BusinessSummary {
  merchant_id: string;
  period: string;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  new_customers: number;
  returning_customers: number;
  top_items: TopItem[];
  peak_hours: PeakHour[];
  trends: TrendData[];
}

/**
 * Sales Data
 */
export interface SalesData {
  merchant_id: string;
  period: string;
  revenue: number;
  orders: number;
  average_order_value: number;
  growth_percentage: number;
  daily_breakdown: DailySales[];
}

/**
 * Customer Analytics
 */
export interface CustomerAnalytics {
  merchant_id: string;
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  customer_retention_rate: number;
  average_ltv: number;
  top_customers: Customer[];
}

/**
 * Order Insights
 */
export interface OrderInsights {
  merchant_id: string;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  average_preparation_time: number;
  popular_items: TopItem[];
}

/**
 * Trend Data
 */
export interface TrendData {
  metric: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Top Item
 */
export interface TopItem {
  item_id: string;
  name: string;
  quantity_sold: number;
  revenue: number;
  category?: string;
}

/**
 * Peak Hour
 */
export interface PeakHour {
  hour: number;
  day_of_week: string;
  order_count: number;
  revenue: number;
}

/**
 * Customer
 */
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
}

/**
 * Daily Sales
 */
export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

/**
 * Report
 */
export interface Report {
  id: string;
  merchant_id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom' | 'comparison';
  start_date: string;
  end_date: string;
  summary: BusinessSummary;
  generated_at: string;
  format: 'json' | 'pdf';
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface BusinessQueryResponse {
  answer: string;
  data?: BusinessSummary | SalesData | CustomerAnalytics;
  sources: string[];
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const DateRangeSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

export const ReportTypeSchema = z.enum(['daily', 'weekly', 'monthly', 'custom', 'comparison']);

export const CreateReportSchema = z.object({
  type: ReportTypeSchema,
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  format: z.enum(['json', 'pdf']).default('json'),
});

export const BusinessQuerySchema = z.object({
  query: z.string().min(1, 'Query is required').max(500),
});

export const MerchantIdParamSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required'),
});

// ============================================================================
// Type Inference
// ============================================================================

export type DateRange = z.infer<typeof DateRangeSchema>;
export type ReportType = z.infer<typeof ReportTypeSchema>;
export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type BusinessQueryInput = z.infer<typeof BusinessQuerySchema>;

// ============================================================================
// Tenant Context
// ============================================================================

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  merchant_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
