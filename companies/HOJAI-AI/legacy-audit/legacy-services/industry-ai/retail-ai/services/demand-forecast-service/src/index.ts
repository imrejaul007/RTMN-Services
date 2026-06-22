/**
 * HOJAI Demand Forecast Service
 * Sales prediction, reorder optimization, trend analysis
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface SalesData {
  productId: string;
  date: string;
  quantity: number;
  revenue: number;
}

interface Forecast {
  productId: string;
  productName: string;
  period: string;
  predictedQuantity: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  seasonalFactor: number;
  recommendedStock: number;
  reorderQuantity: number;
}

interface TrendAnalysis {
  productId: string;
  productName: string;
  period: string;
  totalSales: number;
  avgDaily: number;
  growthRate: number;
  topDay: string;
  peakHour?: number;
  trend: 'up' | 'down' | 'stable';
}

const forecasts = new Map<string, Forecast>();

// Get forecast
router.post('/forecast', async (req, res) => {
  try {
    const { productId, productName, period, historicalData } = req.body;

    // Simple forecasting based on historical data
    const avgDaily = historicalData?.length > 0
      ? historicalData.reduce((sum: number, d: SalesData) => sum + d.quantity, 0) / historicalData.length
      : 10;

    const lastWeek = historicalData?.slice(-7) || [];
    const prevWeek = historicalData?.slice(-14, -7) || [];

    const recentAvg = lastWeek.length > 0
      ? lastWeek.reduce((sum: number, d: SalesData) => sum + d.quantity, 0) / lastWeek.length
      : avgDaily;

    const prevAvg = prevWeek.length > 0
      ? prevWeek.reduce((sum: number, d: SalesData) => sum + d.quantity, 0) / prevWeek.length
      : avgDaily;

    const growthRate = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0;

    // Predict next period
    const predictedQuantity = Math.round(recentAvg * (period === 'week' ? 7 : 30) * (1 + growthRate / 100));

    const forecast: Forecast = {
      productId,
      productName: productName || 'Product',
      period,
      predictedQuantity,
      confidence: historicalData?.length > 20 ? 85 : 60,
      trend: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable',
      seasonalFactor: 1.0,
      recommendedStock: Math.round(predictedQuantity * 1.3),
      reorderQuantity: Math.round(predictedQuantity * 0.5),
    };

    forecasts.set(productId, forecast);

    res.json({ forecast });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

// Get all forecasts
router.get('/forecasts', async (req, res) => {
  try {
    const allForecasts = Array.from(forecasts.values());
    res.json({ forecasts: allForecasts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get forecasts' });
  }
});

// Analyze trends
router.post('/trends', async (req, res) => {
  try {
    const { productId, productName, salesData } = req.body;

    if (!salesData || salesData.length === 0) {
      return res.json({
        analysis: { productId, productName, message: 'No sales data available' }
      });
    }

    const totalSales = salesData.reduce((sum: number, d: SalesData) => sum + d.quantity, 0);
    const avgDaily = totalSales / salesData.length;

    // Calculate growth
    const midPoint = Math.floor(salesData.length / 2);
    const firstHalf = salesData.slice(0, midPoint);
    const secondHalf = salesData.slice(midPoint);

    const firstAvg = firstHalf.reduce((sum: number, d: SalesData) => sum + d.quantity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum: number, d: SalesData) => sum + d.quantity, 0) / secondHalf.length;
    const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    // Find top day
    const byDay: { [key: string]: number } = {};
    salesData.forEach((d: SalesData) => {
      const day = new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' });
      byDay[day] = (byDay[day] || 0) + d.quantity;
    });
    const topDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const analysis: TrendAnalysis = {
      productId,
      productName: productName || 'Product',
      period: `Last ${salesData.length} days`,
      totalSales,
      avgDaily: Math.round(avgDaily * 100) / 100,
      growthRate: Math.round(growthRate * 10) / 10,
      topDay,
      trend: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable',
    };

    res.json({ analysis });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze trends' });
  }
});

// Reorder recommendations
router.get('/reorder', async (req, res) => {
  try {
    const { location } = req.query;

    const recommendations = Array.from(forecasts.values())
      .map(f => ({
        productId: f.productId,
        productName: f.productName,
        reorderQuantity: f.reorderQuantity,
        reason: f.trend === 'up' ? 'Growing demand' : 'Regular reorder',
        urgency: f.reorderQuantity > 50 ? 'high' : 'medium',
      }))
      .filter(r => r.reorderQuantity > 0)
      .sort((a, b) => b.reorderQuantity - a.reorderQuantity);

    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

export { router, forecasts };
export type { SalesData, Forecast, TrendAnalysis };
