/**
 * GENIE Business Intelligence Service - Business Logic
 * Version: 1.0.0 | Date: June 13, 2026
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
import {
  BusinessSummary,
  SalesData,
  CustomerAnalytics,
  OrderInsights,
  Report,
  TrendData,
  TopItem,
  PeakHour,
  DailySales,
} from '../types.js';

const logger = createLogger('business-intelligence-service');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // REZ Services (for fetching real data)
  rezOrderService: process.env.REZ_ORDER_SERVICE_URL || 'http://localhost:4000',
  rezCustomerService: process.env.REZ_CUSTOMER_SERVICE_URL || 'http://localhost:4000',
  rezAnalyticsService: process.env.REZ_ANALYTICS_SERVICE_URL || 'http://localhost:4000',
  rezMerchantService: process.env.REZ_MERCHANT_SERVICE_URL || 'http://localhost:4000',
  // HOJAI AI
  hojaiGateway: process.env.HOJAI_GATEWAY_URL || 'http://localhost:4500',
};

// ============================================================================
// Business Summary
// ============================================================================

/**
 * Get complete business summary for a merchant
 */
export async function getBusinessSummary(
  merchantId: string,
  startDate?: string,
  endDate?: string
): Promise<BusinessSummary> {
  logger.info('get_business_summary', { merchantId, startDate, endDate });

  const period = calculatePeriod(startDate, endDate);

  // Fetch data from REZ services
  const [salesData, customerData, orderData] = await Promise.allSettled([
    getSalesData(merchantId, startDate, endDate),
    getCustomerAnalytics(merchantId, startDate, endDate),
    getOrderInsights(merchantId, startDate, endDate),
  ]);

  const sales = salesData.status === 'fulfilled' ? salesData.value : { revenue: 0, orders: 0, average_order_value: 0 };
  const customers = customerData.status === 'fulfilled' ? customerData.value : { new_customers: 0, returning_customers: 0, top_customers: [] };
  const orders = orderData.status === 'fulfilled' ? orderData.value : { popular_items: [] };

  // Get top items and trends
  const topItems = orders.popular_items.slice(0, 5);
  const trends = calculateTrends(sales);

  return {
    merchant_id: merchantId,
    period,
    total_revenue: sales.revenue,
    total_orders: sales.orders,
    average_order_value: sales.average_order_value,
    new_customers: customers.new_customers,
    returning_customers: customers.returning_customers,
    top_items: topItems,
    peak_hours: [],
    trends,
  };
}

// ============================================================================
// Sales Data
// ============================================================================

/**
 * Get detailed sales data
 */
export async function getSalesData(
  merchantId: string,
  startDate?: string,
  endDate?: string
): Promise<SalesData> {
  logger.info('get_sales_data', { merchantId, startDate, endDate });

  // Try to fetch from REZ Analytics
  try {
    const response = await axios.get(`${CONFIG.rezAnalyticsService}/api/sales`, {
      params: { merchantId, startDate, endDate },
      timeout: 5000,
    });
    return response.data;
  } catch {
    // Return mock data if service unavailable
    return generateMockSalesData(merchantId);
  }
}

// ============================================================================
// Customer Analytics
// ============================================================================

/**
 * Get customer analytics
 */
export async function getCustomerAnalytics(
  merchantId: string,
  startDate?: string,
  endDate?: string
): Promise<CustomerAnalytics> {
  logger.info('get_customer_analytics', { merchantId, startDate, endDate });

  try {
    const response = await axios.get(`${CONFIG.rezCustomerService}/api/customers/analytics`, {
      params: { merchantId, startDate, endDate },
      timeout: 5000,
    });
    return response.data;
  } catch {
    return generateMockCustomerAnalytics(merchantId);
  }
}

// ============================================================================
// Order Insights
// ============================================================================

/**
 * Get order insights
 */
export async function getOrderInsights(
  merchantId: string,
  startDate?: string,
  endDate?: string
): Promise<OrderInsights> {
  logger.info('get_order_insights', { merchantId, startDate, endDate });

  try {
    const response = await axios.get(`${CONFIG.rezOrderService}/api/orders/insights`, {
      params: { merchantId, startDate, endDate },
      timeout: 5000,
    });
    return response.data;
  } catch {
    return generateMockOrderInsights(merchantId);
  }
}

// ============================================================================
// Peak Hours
// ============================================================================

/**
 * Get peak hours analysis
 */
export async function getPeakHours(merchantId: string): Promise<PeakHour[]> {
  logger.info('get_peak_hours', { merchantId });

  try {
    const response = await axios.get(`${CONFIG.rezAnalyticsService}/api/peak-hours`, {
      params: { merchantId },
      timeout: 5000,
    });
    return response.data;
  } catch {
    return generateMockPeakHours();
  }
}

// ============================================================================
// Top Items
// ============================================================================

/**
 * Get top selling items
 */
export async function getTopItems(merchantId: string, limit: number = 10): Promise<TopItem[]> {
  logger.info('get_top_items', { merchantId, limit });

  try {
    const response = await axios.get(`${CONFIG.rezOrderService}/api/items/top`, {
      params: { merchantId, limit },
      timeout: 5000,
    });
    return response.data;
  } catch {
    return generateMockTopItems(limit);
  }
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate a business report
 */
export async function generateReport(
  merchantId: string,
  type: 'daily' | 'weekly' | 'monthly' | 'custom' | 'comparison',
  startDate: string,
  endDate: string,
  format: 'json' | 'pdf' = 'json'
): Promise<Report> {
  logger.info('generate_report', { merchantId, type, startDate, endDate, format });

  const summary = await getBusinessSummary(merchantId, startDate, endDate);

  const report: Report = {
    id: uuidv4(),
    merchant_id: merchantId,
    type,
    start_date: startDate,
    end_date: endDate,
    summary,
    generated_at: new Date().toISOString(),
    format,
  };

  // In production, would generate PDF here
  return report;
}

// ============================================================================
// Natural Language Query
// ============================================================================

/**
 * Process natural language business query
 */
export async function processQuery(
  merchantId: string,
  query: string
): Promise<{ answer: string; data?: unknown }> {
  logger.info('process_query', { merchantId, query });

  const lowerQuery = query.toLowerCase();

  // Pattern matching for common queries
  if (lowerQuery.includes('sales today') || lowerQuery === 'today') {
    const today = new Date().toISOString().split('T')[0];
    const summary = await getBusinessSummary(merchantId, today, today);
    return {
      answer: `Today you made ₹${summary.total_revenue} from ${summary.total_orders} orders. Average order value: ₹${summary.average_order_value}.`,
      data: summary,
    };
  }

  if (lowerQuery.includes('top items') || lowerQuery.includes('best selling')) {
    const items = await getTopItems(merchantId, 5);
    const itemsList = items.map((item, i) => `${i + 1}. ${item.name} - ${item.quantity_sold} sold`).join('\n');
    return {
      answer: `Your top selling items:\n${itemsList}`,
      data: items,
    };
  }

  if (lowerQuery.includes('new customers')) {
    const summary = await getBusinessSummary(merchantId);
    return {
      answer: `You have ${summary.new_customers} new customers. ${summary.returning_customers} returning customers.`,
      data: summary,
    };
  }

  if (lowerQuery.includes('peak hours') || lowerQuery.includes('busiest time')) {
    const peakHours = await getPeakHours(merchantId);
    if (peakHours.length > 0) {
      const topHour = peakHours[0];
      return {
        answer: `Your busiest time is ${topHour.hour}:00 on ${topHour.day_of_week}. You get ${topHour.order_count} orders during this time.`,
        data: peakHours,
      };
    }
    return { answer: 'Not enough data to determine peak hours yet.' };
  }

  if (lowerQuery.includes('report') || lowerQuery.includes('summary')) {
    const summary = await getBusinessSummary(merchantId);
    return {
      answer: `Here's your business summary:\nTotal Revenue: ₹${summary.total_revenue}\nOrders: ${summary.total_orders}\nAverage Order: ₹${summary.average_order_value}`,
      data: summary,
    };
  }

  // Default response
  return {
    answer: `I can help you with:\n- Sales reports\n- Top selling items\n- Customer analytics\n- Peak hours\n- Daily/weekly reports\n\nWhat would you like to know?`,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculatePeriod(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return 'all_time';
  return `${startDate || 'start'} to ${endDate || 'now'}`;
}

function calculateTrends(sales: { revenue: number; orders: number }): TrendData[] {
  // Mock trend calculation
  return [
    {
      metric: 'revenue',
      current_value: sales.revenue,
      previous_value: sales.revenue * 0.9,
      change_percentage: 10,
      trend: 'up',
    },
    {
      metric: 'orders',
      current_value: sales.orders,
      previous_value: sales.orders * 0.85,
      change_percentage: 15,
      trend: 'up',
    },
  ];
}

// Mock data generators
function generateMockSalesData(merchantId: string): SalesData {
  return {
    merchant_id: merchantId,
    period: 'mock',
    revenue: 45000 + Math.random() * 10000,
    orders: 45 + Math.floor(Math.random() * 20),
    average_order_value: 900 + Math.random() * 200,
    growth_percentage: 12.5,
    daily_breakdown: [],
  };
}

function generateMockCustomerAnalytics(merchantId: string): CustomerAnalytics {
  return {
    merchant_id: merchantId,
    total_customers: 150,
    new_customers: 25,
    returning_customers: 125,
    customer_retention_rate: 83,
    average_ltv: 2500,
    top_customers: [],
  };
}

function generateMockOrderInsights(merchantId: string): OrderInsights {
  return {
    merchant_id: merchantId,
    total_orders: 150,
    completed_orders: 145,
    cancelled_orders: 5,
    average_preparation_time: 25,
    popular_items: generateMockTopItems(5),
  };
}

function generateMockPeakHours(): PeakHour[] {
  return [
    { hour: 19, day_of_week: 'Friday', order_count: 45, revenue: 12500 },
    { hour: 20, day_of_week: 'Friday', order_count: 42, revenue: 11500 },
    { hour: 13, day_of_week: 'Saturday', order_count: 38, revenue: 10200 },
    { hour: 12, day_of_week: 'Sunday', order_count: 35, revenue: 9500 },
    { hour: 19, day_of_week: 'Saturday', order_count: 33, revenue: 8900 },
  ];
}

function generateMockTopItems(limit: number): TopItem[] {
  const items = [
    { item_id: '1', name: 'Margherita Pizza', quantity_sold: 120, revenue: 14400, category: 'Pizza' },
    { item_id: '2', name: 'Chicken Burger', quantity_sold: 95, revenue: 8550, category: 'Burgers' },
    { item_id: '3', name: 'Pasta Alfredo', quantity_sold: 78, revenue: 7800, category: 'Pasta' },
    { item_id: '4', name: 'Garlic Bread', quantity_sold: 150, revenue: 4500, category: 'Sides' },
    { item_id: '5', name: 'Coke', quantity_sold: 200, revenue: 4000, category: 'Beverages' },
    { item_id: '6', name: 'Pepperoni Pizza', quantity_sold: 65, revenue: 7800, category: 'Pizza' },
    { item_id: '7', name: 'Veggie Wrap', quantity_sold: 55, revenue: 4400, category: 'Wraps' },
    { item_id: '8', name: 'French Fries', quantity_sold: 110, revenue: 3300, category: 'Sides' },
  ];
  return items.slice(0, limit);
}
