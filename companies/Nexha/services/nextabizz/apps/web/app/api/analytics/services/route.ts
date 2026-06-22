import { logger } from '../../shared/logger';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Secure random number for placeholder ratings
function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}

export interface ServiceAnalyticsData {
  totalRequests: number;
  requestsByCategory: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  avgResponseTime: number;
  conversionRate: number;
  revenueByServiceType: Array<{
    serviceType: string;
    revenue: number;
    orders: number;
  }>;
  topVendors: Array<{
    vendorId: string;
    vendorName: string;
    totalOrders: number;
    rating: number;
    revenue: number;
  }>;
  requestTrends: Array<{
    date: string;
    requests: number;
    quotes: number;
    orders: number;
    revenue: number;
  }>;
  budgetVsActual: Array<{
    category: string;
    budget: number;
    actual: number;
    variance: number;
  }>;
  summary: {
    totalRevenue: number;
    totalQuotes: number;
    totalOrders: number;
    avgOrderValue: number;
    requestsGrowth: number;
    revenueGrowth: number;
  };
}

type DateRange = '7d' | '30d' | '90d' | '1y';

function getDateRangeParams(dateRange: DateRange): { startDate: string; endDate: string; months: number } {
  const endDate = new Date();
  const startDate = new Date();

  switch (dateRange) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), months: 1 };
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), months: 1 };
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), months: 3 };
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), months: 12 };
  }
}

async function fetchAnalyticsData(dateRange: DateRange, merchantId?: string): Promise<ServiceAnalyticsData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { startDate, endDate } = getDateRangeParams(dateRange);

  // Build base query for service_rfqs (requests)
  let rfqQuery = supabase
    .from('service_rfqs')
    .select('*', { count: 'exact' })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (merchantId) {
    rfqQuery = rfqQuery.eq('merchant_id', merchantId);
  }

  const { data: rfqs, count: totalRfqs, error: rfqError } = await rfqQuery;

  if (rfqError) {
    logger.error('Error fetching RFQs:', rfqError);
    throw rfqError;
  }

  // Build query for service_quotes (quotes)
  let quotesQuery = supabase
    .from('service_quotes')
    .select('*', { count: 'exact' })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (merchantId) {
    quotesQuery = quotesQuery.eq('merchant_id', merchantId);
  }

  const { count: totalQuotes, error: quotesError } = await quotesQuery;

  if (quotesError) {
    logger.error('Error fetching quotes:', quotesError);
    throw quotesError;
  }

  // Build query for service_orders (orders)
  let ordersQuery = supabase
    .from('service_orders')
    .select('*', { count: 'exact' })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (merchantId) {
    ordersQuery = ordersQuery.eq('merchant_id', merchantId);
  }

  const { data: orders, count: totalOrders, error: ordersError } = await ordersQuery;

  if (ordersError) {
    logger.error('Error fetching orders:', ordersError);
    throw ordersError;
  }

  // Calculate total revenue
  const totalRevenue = (orders || []).reduce((sum, order) => sum + (order.total || 0), 0);
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  // Get previous period for growth calculations
  const prevStartDate = new Date(startDate);
  const prevEndDate = new Date(startDate);
  const periodDays = Math.ceil((new Date(endDate).getTime() - prevStartDate.getTime()) / (1000 * 60 * 60 * 24));
  prevStartDate.setDate(prevStartDate.getDate() - periodDays);

  const { count: prevTotalRfqs } = await supabase
    .from('service_rfqs')
    .select('*', { count: 'exact' })
    .gte('created_at', prevStartDate.toISOString())
    .lt('created_at', startDate);

  const { count: prevTotalOrders } = await supabase
    .from('service_orders')
    .select('*', { count: 'exact' })
    .gte('created_at', prevStartDate.toISOString())
    .lt('created_at', startDate);

  const { data: prevOrders } = await supabase
    .from('service_orders')
    .select('total')
    .gte('created_at', prevStartDate.toISOString())
    .lt('created_at', startDate);

  const prevRevenue = (prevOrders || []).reduce((sum, order) => sum + (order.total || 0), 0);

  // Calculate growth rates
  const requestsGrowth = prevTotalRfqs && prevTotalRfqs > 0
    ? ((totalRfqs || 0) - prevTotalRfqs) / prevTotalRfqs * 100
    : 0;

  const revenueGrowth = prevRevenue > 0
    ? (totalRevenue - prevRevenue) / prevRevenue * 100
    : 0;

  // Get RFQs by status (for requests by category simulation)
  const { data: rfqsByStatus } = await supabase
    .from('service_rfqs')
    .select('status')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const statusCounts = new Map<string, number>();
  (rfqsByStatus || []).forEach((rfq) => {
    const status = rfq.status || 'unknown';
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });

  const totalRfqsCount = statusCounts.size > 0 ? Array.from(statusCounts.values()).reduce((a, b) => a + b, 0) : 1;
  const requestsByCategory = Array.from(statusCounts.entries()).map(([status, count]) => ({
    category: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    count,
    percentage: Math.round((count / totalRfqsCount) * 100),
  }));

  // Get vendors from quotes
  const { data: vendorQuotes } = await supabase
    .from('service_quotes')
    .select('vendor_id, total_price')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const vendorStats = new Map<string, { revenue: number; orderCount: number }>();
  (vendorQuotes || []).forEach((quote) => {
    const existing = vendorStats.get(quote.vendor_id) || { revenue: 0, orderCount: 0 };
    vendorStats.set(quote.vendor_id, {
      revenue: existing.revenue + (quote.total_price || 0),
      orderCount: existing.orderCount + 1,
    });
  });

  // Get vendor names
  const vendorIds = Array.from(vendorStats.keys());
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, business_name')
    .in('id', vendorIds);

  const vendorMap = new Map(vendors?.map((v) => [v.id, v.business_name]) || []);

  const topVendors = Array.from(vendorStats.entries())
    .map(([vendorId, stats]) => ({
      vendorId,
      vendorName: vendorMap.get(vendorId) || 'Unknown Vendor',
      totalOrders: stats.orderCount,
      // Statistical simulation: placeholder rating 4.5-5.0 for demo data
      rating: 4.5 + secureRandom() * 0.5,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Generate request trends (group by month)
  const { months } = getDateRangeParams(dateRange);
  const requestTrends = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const monthRfqs = (rfqs || []).filter((rfq: Record<string, unknown>) => {
      const rfqDate = new Date(rfq.created_at as string);
      return rfqDate >= monthDate && rfqDate <= monthEnd;
    }).length;

    const monthQuotes = (vendorQuotes || []).filter((quote: Record<string, unknown>) => {
      const quoteDate = new Date(quote.created_at as string);
      return quoteDate >= monthDate && quoteDate <= monthEnd;
    }).length;

    const monthOrders = (orders || []).filter((order: Record<string, unknown>) => {
      const orderDate = new Date(order.created_at as string);
      return orderDate >= monthDate && orderDate <= monthEnd;
    });

    requestTrends.push({
      date: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      requests: monthRfqs,
      quotes: monthQuotes,
      orders: monthOrders.length,
      revenue: monthOrders.reduce((sum, o) => sum + ((o as Record<string, unknown>).total || 0), 0),
    });
  }

  // Calculate revenue by service type (from order titles/categories)
  const { data: allOrders } = await supabase
    .from('service_orders')
    .select('title, total')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const serviceTypeRevenue = new Map<string, { revenue: number; orders: number }>();
  (allOrders || []).forEach((order) => {
    // Extract service type from title (simple categorization)
    const title = order.title || 'Unknown';
    const words = title.split(' ');
    const serviceType = words.slice(0, 2).join(' ') || 'General Services';

    const existing = serviceTypeRevenue.get(serviceType) || { revenue: 0, orders: 0 };
    serviceTypeRevenue.set(serviceType, {
      revenue: existing.revenue + (order.total || 0),
      orders: existing.orders + 1,
    });
  });

  const revenueByServiceType = Array.from(serviceTypeRevenue.entries())
    .map(([serviceType, stats]) => ({
      serviceType,
      revenue: stats.revenue,
      orders: stats.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // Budget vs actual (placeholder - would need budget table)
  const budgetVsActual = [
    { category: 'Technology & IT', budget: 200000, actual: totalRevenue * 0.4, variance: 15 },
    { category: 'Marketing', budget: 150000, actual: totalRevenue * 0.25, variance: 10 },
    { category: 'Legal', budget: 80000, actual: totalRevenue * 0.1, variance: 20 },
    { category: 'HR Services', budget: 60000, actual: totalRevenue * 0.15, variance: 5 },
    { category: 'Logistics', budget: 100000, actual: totalRevenue * 0.1, variance: 30 },
  ];

  return {
    totalRequests: totalRfqs || 0,
    requestsByCategory: requestsByCategory.length > 0 ? requestsByCategory : [
      { category: 'General', count: totalRfqs || 0, percentage: 100 },
    ],
    avgResponseTime: 2.4, // Placeholder - would need actual tracking
    conversionRate: totalQuotes && totalRfqs ? (totalQuotes / totalRfqs) * 100 : 0,
    revenueByServiceType: revenueByServiceType.length > 0 ? revenueByServiceType : [
      { serviceType: 'General Services', revenue: totalRevenue, orders: totalOrders || 0 },
    ],
    topVendors: topVendors.length > 0 ? topVendors : [
      { vendorId: 'N/A', vendorName: 'No vendors yet', totalOrders: 0, rating: 0, revenue: 0 },
    ],
    requestTrends,
    budgetVsActual,
    summary: {
      totalRevenue,
      totalQuotes: totalQuotes || 0,
      totalOrders: totalOrders || 0,
      avgOrderValue: Math.round(avgOrderValue),
      requestsGrowth: Math.round(requestsGrowth * 10) / 10,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = (searchParams.get('dateRange') || '30d') as DateRange;
    const merchantId = searchParams.get('merchantId') || undefined;

    if (!['7d', '30d', '90d', '1y'].includes(dateRange)) {
      return NextResponse.json(
        { error: 'Invalid date range. Must be one of: 7d, 30d, 90d, 1y' },
        { status: 400 }
      );
    }

    const data = await fetchAnalyticsData(dateRange, merchantId);

    return NextResponse.json({
      success: true,
      data,
      meta: {
        dateRange,
        merchantId: merchantId || null,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Service analytics API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    // Check if it's a database configuration issue
    if (errorMessage.includes('Missing Supabase')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database not configured. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
