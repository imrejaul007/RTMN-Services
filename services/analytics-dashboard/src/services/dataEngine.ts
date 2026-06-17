import { Widget } from '../models/Widget';

interface TimeSeriesOptions {
  metric: string;
  period?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  industry?: string;
}

interface TopPerformersOptions {
  category: string;
  limit: number;
  period: string;
}

interface GeographicOptions {
  metric: string;
  granularity: 'city' | 'state' | 'country';
}

interface KPIOptions {
  period: string;
  includeComparison: boolean;
}

// Generate mock data
function generateRandomData(points: number, min: number, max: number): number[] {
  const data: number[] = [];
  let current = min + Math.random() * (max - min);
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * (max - min) * 0.2;
    current = Math.max(min, Math.min(max, current + change));
    data.push(Math.round(current));
  }
  return data;
}

function generateLabels(count: number, granularity: string): string[] {
  const labels: string[] = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now);
    if (granularity === 'hour') {
      date.setHours(date.getHours() - i);
    } else if (granularity === 'day') {
      date.setDate(date.getDate() - i);
    } else if (granularity === 'week') {
      date.setDate(date.getDate() - i * 7);
    } else {
      date.setMonth(date.getMonth() - i);
    }
    labels.push(date.toISOString().split('T')[0]);
  }

  return labels;
}

export class DataEngine {
  // Get overview metrics
  static getOverview() {
    return {
      totalRevenue: {
        value: 1245893,
        change: 12.5,
        period: 'month'
      },
      totalOrders: {
        value: 45231,
        change: 8.3,
        period: 'month'
      },
      activeCustomers: {
        value: 12847,
        change: 15.2,
        period: 'month'
      },
      averageOrderValue: {
        value: 27.54,
        change: 3.8,
        period: 'month'
      },
      customerSatisfaction: {
        value: 4.6,
        max: 5,
        change: 2.1,
        period: 'month'
      }
    };
  }

  // Get metrics for specific industry
  static getIndustryMetrics(industry: string, period: string = 'month') {
    const multipliers: Record<string, number> = {
      restaurant: 1.2,
      hotel: 1.5,
      healthcare: 1.3,
      retail: 1.1,
      fitness: 0.9,
      automotive: 1.4
    };

    const mult = multipliers[industry] || 1;

    return {
      industry,
      period,
      revenue: Math.round(125000 * mult),
      orders: Math.round(4500 * mult),
      customers: Math.round(1200 * mult),
      averageOrderValue: (25 * mult).toFixed(2),
      growthRate: (Math.random() * 20 - 5).toFixed(1),
      topCategories: [
        { name: 'Category A', value: Math.round(35000 * mult), percentage: 28 },
        { name: 'Category B', value: Math.round(28000 * mult), percentage: 22 },
        { name: 'Category C', value: Math.round(22000 * mult), percentage: 18 }
      ]
    };
  }

  // Get summary for all industries
  static getIndustriesSummary() {
    const industries = ['restaurant', 'hotel', 'healthcare', 'retail', 'fitness', 'automotive', 'beauty', 'education'];

    return {
      industries: industries.map(industry => ({
        name: industry,
        revenue: Math.round(50000 + Math.random() * 200000),
        orders: Math.round(1000 + Math.random() * 5000),
        growth: (Math.random() * 30 - 10).toFixed(1),
        activeCustomers: Math.round(200 + Math.random() * 1000)
      })),
      totalRevenue: 2845673,
      totalOrders: 89456,
      averageGrowth: 12.4
    };
  }

  // Get time series data
  static getTimeSeries(options: TimeSeriesOptions) {
    const { metric, period = 'week', granularity = 'day', industry } = options;

    const pointCounts: Record<string, number> = {
      hour: 24,
      day: 7,
      week: 4,
      month: 12
    };

    const pointCount = pointCounts[period] || 7;
    const labels = generateLabels(pointCount, granularity);

    let data1 = generateRandomData(pointCount, 10000, 50000);
    let data2 = generateRandomData(pointCount, 8000, 45000);

    // Adjust for metric type
    if (metric === 'orders') {
      data1 = generateRandomData(pointCount, 100, 500);
      data2 = generateRandomData(pointCount, 80, 450);
    } else if (metric === 'customers') {
      data1 = generateRandomData(pointCount, 50, 200);
      data2 = generateRandomData(pointCount, 40, 180);
    }

    return {
      metric,
      period,
      granularity,
      labels,
      datasets: [
        {
          label: `${metric} - Current`,
          data: data1
        },
        {
          label: `${metric} - Previous`,
          data: data2
        }
      ]
    };
  }

  // Get comparison data
  static getComparison(metrics: string[], period: string = 'month') {
    return {
      period,
      metrics: metrics.map(metric => ({
        name: metric,
        current: Math.round(10000 + Math.random() * 50000),
        previous: Math.round(9000 + Math.random() * 45000),
        change: (Math.random() * 30 - 10).toFixed(1),
        trend: Math.random() > 0.5 ? 'up' : 'down'
      }))
    };
  }

  // Get real-time data
  static getRealTimeData(metric: string = 'orders') {
    return {
      metric,
      timestamp: new Date().toISOString(),
      value: Math.round(Math.random() * 100),
      change: Math.round((Math.random() - 0.5) * 20),
      sparkline: generateRandomData(10, 50, 150)
    };
  }

  // Get widget-specific data
  static async getWidgetData(widget: Widget) {
    const { type, dataSource } = widget;

    switch (type) {
      case 'kpi':
      case 'metric':
        return {
          value: Math.round(Math.random() * 100000),
          change: (Math.random() * 30 - 10).toFixed(1),
          trend: Math.random() > 0.5 ? 'up' : 'down'
        };

      case 'line-chart':
      case 'area-chart':
        return this.getTimeSeries({
          metric: dataSource.aggregation || 'revenue',
          period: dataSource.dateRange || 'week',
          granularity: 'day'
        });

      case 'bar-chart':
        return {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Orders',
            data: generateRandomData(7, 100, 500)
          }]
        };

      case 'pie-chart':
      case 'donut':
        return {
          labels: ['Category A', 'Category B', 'Category C', 'Category D'],
          datasets: [{
            data: [
              Math.round(Math.random() * 40) + 20,
              Math.round(Math.random() * 30) + 15,
              Math.round(Math.random() * 20) + 10,
              Math.round(Math.random() * 15) + 5
            ]
          }]
        };

      case 'gauge':
        return {
          value: (Math.random() * 2 + 3).toFixed(1),
          min: 0,
          max: 5,
          label: 'Rating'
        };

      case 'table':
        return {
          columns: ['Name', 'Value', 'Change', 'Trend'],
          rows: Array.from({ length: 10 }, () => [
            `Item ${Math.round(Math.random() * 100)}`,
            Math.round(Math.random() * 10000),
            `${Math.random() > 0.5 ? '+' : '-'}${Math.round(Math.random() * 20)}%`,
            Math.random() > 0.5 ? 'up' : 'down'
          ])
        };

      case 'heatmap':
        return {
          xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          yLabels: ['Morning', 'Afternoon', 'Evening'],
          data: Array.from({ length: 15 }, () => Math.round(Math.random() * 100))
        };

      default:
        return { message: 'Widget data not available' };
    }
  }

  // Get KPI data
  static getKPI(metric: string, options: KPIOptions) {
    const { period, includeComparison } = options;

    const baseValue = Math.round(Math.random() * 100000);
    const change = (Math.random() * 30 - 10).toFixed(1);

    const kpi: any = {
      metric,
      period: period || 'month',
      value: baseValue,
      change: parseFloat(change)
    };

    if (includeComparison) {
      kpi.previousValue = Math.round(baseValue * (1 - parseFloat(change) / 100));
      kpi.difference = baseValue - kpi.previousValue;
    }

    return kpi;
  }

  // Get top performers
  static getTopPerformers(options: TopPerformersOptions) {
    const { category, limit, period } = options;

    const items = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E',
                   'Product F', 'Product G', 'Product H', 'Product I', 'Product J'];

    return {
      category,
      period,
      items: items.slice(0, limit).map((name, index) => ({
        rank: index + 1,
        name,
        value: Math.round(Math.random() * 50000 + 10000),
        change: (Math.random() * 40 - 10).toFixed(1)
      }))
    };
  }

  // Get trends
  static getTrends(metrics: string[], period: string = 'month') {
    return {
      period,
      trends: metrics.map(metric => ({
        metric,
        direction: Math.random() > 0.5 ? 'increasing' : 'decreasing',
        changeRate: (Math.random() * 20).toFixed(1),
        prediction: Math.random() > 0.3 ? 'positive' : 'negative'
      }))
    };
  }

  // Get geographic data
  static getGeographicData(options: GeographicOptions) {
    const { metric, granularity } = options;

    const locations = [
      { city: 'New York', state: 'NY', country: 'USA', value: 45000 },
      { city: 'Los Angeles', state: 'CA', country: 'USA', value: 38000 },
      { city: 'Chicago', state: 'IL', country: 'USA', value: 32000 },
      { city: 'Houston', state: 'TX', country: 'USA', value: 28000 },
      { city: 'Phoenix', state: 'AZ', country: 'USA', value: 22000 }
    ];

    return {
      metric,
      granularity,
      locations: granularity === 'city' ? locations :
                 granularity === 'state' ? [
                   { state: 'CA', value: 85000 },
                   { state: 'NY', value: 72000 },
                   { state: 'TX', value: 58000 },
                   { state: 'FL', value: 45000 }
                 ] :
                 [
                   { country: 'USA', value: 280000 },
                   { country: 'UK', value: 85000 },
                   { country: 'Canada', value: 62000 }
                 ]
    };
  }
}
