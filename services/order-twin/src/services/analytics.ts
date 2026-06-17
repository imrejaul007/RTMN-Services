import { Order } from '../models/Order';

// Build date filter
function buildDateFilter(tenantId: string, startDate?: string, endDate?: string): Record<string, any> {
  const filter: Record<string, any> = { tenantId };

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) (filter.createdAt as any).$gte = new Date(startDate);
    if (endDate) (filter.createdAt as any).$lte = new Date(endDate);
  }

  return filter;
}

// Calculate order metrics
export async function calculateOrderMetrics(
  tenantId: string,
  startDate?: string,
  endDate?: string
) {
  const dateFilter = buildDateFilter(tenantId, startDate, endDate);

  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    returnedOrders,
  ] = await Promise.all([
    Order.countDocuments(dateFilter),
    Order.countDocuments({ ...dateFilter, status: 'pending' }),
    Order.countDocuments({ ...dateFilter, status: 'delivered' }),
    Order.countDocuments({ ...dateFilter, status: 'cancelled' }),
    Order.countDocuments({ ...dateFilter, status: 'returned' }),
  ]);

  const fulfillmentRate = totalOrders > 0
    ? Math.round(((completedOrders + returnedOrders) / totalOrders) * 10000) / 100
    : 0;

  const cancellationRate = totalOrders > 0
    ? Math.round((cancelledOrders / totalOrders) * 10000) / 100
    : 0;

  // Calculate average processing time
  const processingTimes = await Order.aggregate([
    {
      $match: {
        ...dateFilter,
        status: 'delivered',
        createdAt: { $exists: true },
        'shipping.actualDelivery': { $exists: true },
      },
    },
    {
      $project: {
        processingTime: {
          $divide: [
            { $subtract: ['$shipping.actualDelivery', '$createdAt'] },
            1000 * 60 * 60 * 24, // Convert to days
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgProcessingTime: { $avg: '$processingTime' },
        minProcessingTime: { $min: '$processingTime' },
        maxProcessingTime: { $max: '$processingTime' },
      },
    },
  ]);

  const avgProcessingTime = processingTimes[0]?.avgProcessingTime || 0;

  return {
    total: totalOrders,
    byStatus: {
      pending: pendingOrders,
      completed: completedOrders,
      cancelled: cancelledOrders,
      returned: returnedOrders,
    },
    rates: {
      fulfillment: fulfillmentRate,
      cancellation: cancellationRate,
    },
    processing: {
      averageDays: Math.round(avgProcessingTime * 100) / 100,
      minDays: Math.round((processingTimes[0]?.minProcessingTime || 0) * 100) / 100,
      maxDays: Math.round((processingTimes[0]?.maxProcessingTime || 0) * 100) / 100,
    },
  };
}

// Calculate revenue metrics
export async function calculateRevenueMetrics(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  granularity: string = 'day'
) {
  const dateFilter = buildDateFilter(tenantId, startDate, endDate);

  // Filter out cancelled orders from revenue
  const revenueFilter = { ...dateFilter, status: { $nin: ['cancelled'] } };

  const [
    totalRevenue,
    averageOrderValue,
    revenueByPaymentStatus,
  ] = await Promise.all([
    Order.aggregate([
      { $match: revenueFilter },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Order.aggregate([
      { $match: revenueFilter },
      { $group: { _id: null, avg: { $avg: '$pricing.total' } } },
    ]),
    Order.aggregate([
      { $match: revenueFilter },
      {
        $group: {
          _id: '$paymentStatus',
          revenue: { $sum: '$pricing.total' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Revenue by period
  let groupFormat: string;
  switch (granularity) {
    case 'hour':
      groupFormat = '%Y-%m-%d %H:00';
      break;
    case 'week':
      groupFormat = '%Y-W%V';
      break;
    case 'month':
      groupFormat = '%Y-%m';
      break;
    default:
      groupFormat = '%Y-%m-%d';
  }

  const revenueOverTime = await Order.aggregate([
    { $match: revenueFilter },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
        revenue: { $sum: '$pricing.total' },
        orders: { $sum: 1 },
        tax: { $sum: '$pricing.tax' },
        shipping: { $sum: '$pricing.shipping' },
        discounts: { $sum: '$pricing.discount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    totalRevenue: Math.round((totalRevenue[0]?.total || 0) * 100) / 100,
    averageOrderValue: Math.round((averageOrderValue[0]?.avg || 0) * 100) / 100,
    byPaymentStatus: revenueByPaymentStatus.map(item => ({
      status: item._id,
      revenue: Math.round(item.revenue * 100) / 100,
      count: item.count,
    })),
    overTime: revenueOverTime.map(item => ({
      period: item._id,
      revenue: Math.round(item.revenue * 100) / 100,
      orders: item.orders,
      tax: Math.round(item.tax * 100) / 100,
      shipping: Math.round(item.shipping * 100) / 100,
      discounts: Math.round(item.discounts * 100) / 100,
    })),
  };
}

// Calculate customer metrics
export async function calculateCustomerMetrics(
  tenantId: string,
  startDate?: string,
  endDate?: string
) {
  const dateFilter = buildDateFilter(tenantId, startDate, endDate);
  const revenueFilter = { ...dateFilter, status: { $nin: ['cancelled'] } };

  const customerStats = await Order.aggregate([
    { $match: revenueFilter },
    {
      $group: {
        _id: '$customerId',
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$pricing.total' },
        avgOrderValue: { $avg: '$pricing.total' },
        lastOrder: { $max: '$createdAt' },
      },
    },
    {
      $facet: {
        total: [{ $count: 'count' }],
        topSpenders: [
          { $sort: { totalSpent: -1 } },
          { $limit: 10 },
          {
            $project: {
              customerId: '$_id',
              totalOrders: 1,
              totalSpent: { $round: ['$totalSpent', 2] },
              avgOrderValue: { $round: ['$avgOrderValue', 2] },
              lastOrder: 1,
            },
          },
        ],
        repeatCustomers: [
          { $match: { totalOrders: { $gt: 1 } } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  const result = customerStats[0] || { total: [{ count: 0 }], topSpenders: [], repeatCustomers: [{ count: 0 }] };

  // Customer retention rate
  const totalCustomers = result.total[0]?.count || 0;
  const repeatCustomers = result.repeatCustomers[0]?.count || 0;
  const retentionRate = totalCustomers > 0
    ? Math.round((repeatCustomers / totalCustomers) * 10000) / 100
    : 0;

  return {
    totalCustomers,
    repeatCustomers,
    retentionRate,
    topSpenders: result.topSpenders,
  };
}

// Calculate product metrics
export async function calculateProductMetrics(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  limit: number = 10
) {
  const dateFilter = buildDateFilter(tenantId, startDate, endDate);

  // Unwind items and group
  const productStats = await Order.aggregate([
    { $match: { ...dateFilter, status: { $nin: ['cancelled'] } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.name' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: {
          $sum: {
            $multiply: [
              '$items.price',
              '$items.quantity',
              { $subtract: [1, { $divide: ['$items.discount', { $multiply: ['$items.price', '$items.quantity'] }] }] },
            ],
          },
        },
        orderCount: { $sum: 1 },
        avgPrice: { $avg: '$items.price' },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
    {
      $project: {
        productId: '$_id',
        productName: 1,
        totalQuantity: 1,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        orderCount: 1,
        avgPrice: { $round: ['$avgPrice', 2] },
      },
    },
  ]);

  // Top products by quantity
  const topByQuantity = await Order.aggregate([
    { $match: { ...dateFilter, status: { $nin: ['cancelled'] } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.name' },
        totalQuantity: { $sum: '$items.quantity' },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
  ]);

  // Calculate total items sold
  const totalItemsSold = productStats.reduce((sum, p) => sum + p.totalQuantity, 0);
  const totalProductRevenue = productStats.reduce((sum, p) => sum + p.totalRevenue, 0);

  return {
    topByRevenue: productStats,
    topByQuantity: topByQuantity.map(p => ({
      productId: p._id,
      productName: p.productName,
      totalQuantity: p.totalQuantity,
    })),
    summary: {
      totalItemsSold,
      totalProductRevenue: Math.round(totalProductRevenue * 100) / 100,
      avgItemsPerOrder: totalItemsSold > 0
        ? Math.round((totalItemsSold / (await Order.countDocuments({ ...dateFilter, status: { $nin: ['cancelled'] } }))) * 100) / 100
        : 0,
    },
  };
}

// Calculate shipping metrics
export async function calculateShippingMetrics(
  tenantId: string,
  startDate?: string,
  endDate?: string
) {
  const dateFilter = buildDateFilter(tenantId, startDate, endDate);

  const shippingStats = await Order.aggregate([
    { $match: { ...dateFilter, status: { $nin: ['cancelled'] } } },
    {
      $group: {
        _id: '$shipping.method',
        count: { $sum: 1 },
        totalCost: { $sum: '$pricing.shipping' },
        avgCost: { $avg: '$pricing.shipping' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // On-time delivery rate
  const deliveryStats = await Order.aggregate([
    {
      $match: {
        ...dateFilter,
        status: 'delivered',
        'shipping.actualDelivery': { $exists: true },
        'shipping.estimatedDelivery': { $exists: true },
      },
    },
    {
      $project: {
        onTime: {
          $lte: ['$shipping.actualDelivery', '$shipping.estimatedDelivery'],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalDelivered: { $sum: 1 },
        onTime: { $sum: { $cond: ['$onTime', 1, 0] } },
      },
    },
  ]);

  const totalDelivered = deliveryStats[0]?.totalDelivered || 0;
  const onTimeDeliveries = deliveryStats[0]?.onTime || 0;
  const onTimeRate = totalDelivered > 0
    ? Math.round((onTimeDeliveries / totalDelivered) * 10000) / 100
    : 0;

  return {
    byMethod: shippingStats.map(s => ({
      method: s._id,
      count: s.count,
      totalCost: Math.round(s.totalCost * 100) / 100,
      avgCost: Math.round(s.avgCost * 100) / 100,
    })),
    deliveryPerformance: {
      totalDelivered,
      onTimeDeliveries,
      onTimeRate,
    },
  };
}
