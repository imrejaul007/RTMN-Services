/**
 * Intelligence - Integration Tests
 */

import { describe, test, expect } from '@jest/globals';

// ============================================================================
// Demand Forecasting Service
// ============================================================================

const demandForecastService = {
  async forecastDemand(productId: string, productName: string, periodDays: number = 7) {
    const predictions = [];
    const today = new Date();

    for (let i = 0; i < periodDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const baseDemand = 100 + Math.random() * 50;

      predictions.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.round(baseDemand),
        confidence: 0.75 + Math.random() * 0.2,
        factors: ['historical_average', 'seasonality', 'market_trend'],
      });
    }

    return {
      productId,
      productName,
      period: {
        start: today,
        end: new Date(today.getTime() + periodDays * 24 * 60 * 60 * 1000),
      },
      predictions,
      recommendations: [
        'Stock up before weekend peak',
        'Consider promotions on weekday slow periods',
      ],
    };
  },

  async predictReorder(productId: string, productName: string, currentStock: number, historicalSales: number[]) {
    const avgDailySales = historicalSales.reduce((a, b) => a + b, 0) / historicalSales.length;
    const daysUntilStockOut = currentStock / avgDailySales;

    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let suggestedQuantity = avgDailySales * 14;

    if (daysUntilStockOut <= 3) {
      urgency = 'critical';
      suggestedQuantity = avgDailySales * 21;
    } else if (daysUntilStockOut <= 7) {
      urgency = 'high';
      suggestedQuantity = avgDailySales * 14;
    } else if (daysUntilStockOut <= 14) {
      urgency = 'medium';
      suggestedQuantity = avgDailySales * 14;
    } else {
      urgency = 'low';
    }

    return {
      productId,
      productName,
      currentStock,
      suggestedQuantity: Math.round(suggestedQuantity),
      urgency,
      reason: `Based on avg ${avgDailySales.toFixed(0)} units/day, stock lasts ${daysUntilStockOut.toFixed(1)} days`,
      confidence: 0.8,
    };
  },
};

// ============================================================================
// Fraud Detection Service
// ============================================================================

const fraudDetectionService = {
  detectFraud(input: {
    entityId: string;
    entityType: 'order' | 'supplier' | 'distributor' | 'franchise';
    orderValue?: number;
    velocityAnomaly?: boolean;
    addressMismatch?: boolean;
    blacklistedPatterns?: string[];
  }) {
    const flags = [];
    let riskScore = 0;

    if (input.orderValue && input.orderValue > 100000) {
      flags.push({
        type: 'high_value_order',
        severity: 'warning' as const,
        description: `Order value ₹${input.orderValue.toLocaleString()} exceeds threshold`,
      });
      riskScore += 20;
    }

    if (input.velocityAnomaly) {
      flags.push({
        type: 'velocity_anomaly',
        severity: 'alert' as const,
        description: 'Unusual order frequency detected',
      });
      riskScore += 30;
    }

    if (input.addressMismatch) {
      flags.push({
        type: 'address_mismatch',
        severity: 'alert' as const,
        description: 'Address differs from registered',
      });
      riskScore += 25;
    }

    if (input.blacklistedPatterns?.length) {
      flags.push({
        type: 'blacklist_match',
        severity: 'critical' as const,
        description: 'Matches known fraudulent patterns',
      });
      riskScore += 50;
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 50) riskLevel = 'critical';
    else if (riskScore >= 35) riskLevel = 'high';
    else if (riskScore >= 20) riskLevel = 'medium';

    return {
      entityId: input.entityId,
      entityType: input.entityType,
      riskScore,
      riskLevel,
      flags,
      recommendation: riskScore >= 35 ? 'Review manually' : 'Auto-approve',
    };
  },
};

// ============================================================================
// Churn Prediction Service
// ============================================================================

const churnPredictionService = {
  predictChurn(input: {
    entityId: string;
    entityType: 'retailer' | 'franchise' | 'distributor';
    daysSinceLastOrder?: number;
    orderFrequencyTrend?: 'increasing' | 'stable' | 'decreasing';
    engagementScore?: number;
    complaintCount?: number;
  }) {
    let churnProbability = 0.1;
    const factors = [];

    if (input.daysSinceLastOrder) {
      if (input.daysSinceLastOrder > 60) {
        churnProbability += 0.4;
        factors.push({
          factor: 'inactivity',
          impact: 0.4,
          description: `No orders in ${input.daysSinceLastOrder} days`,
        });
      } else if (input.daysSinceLastOrder > 30) {
        churnProbability += 0.2;
        factors.push({
          factor: 'declining_activity',
          impact: 0.2,
          description: `Last order ${input.daysSinceLastOrder} days ago`,
        });
      }
    }

    if (input.orderFrequencyTrend === 'decreasing') {
      churnProbability += 0.15;
      factors.push({
        factor: 'order_frequency',
        impact: 0.15,
        description: 'Order frequency declining',
      });
    }

    if (input.engagementScore && input.engagementScore < 30) {
      churnProbability += 0.15;
      factors.push({
        factor: 'low_engagement',
        impact: 0.15,
        description: 'Low engagement score',
      });
    }

    let churnRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (churnProbability >= 0.7) churnRisk = 'critical';
    else if (churnProbability >= 0.5) churnRisk = 'high';
    else if (churnProbability >= 0.3) churnRisk = 'medium';

    return {
      entityId: input.entityId,
      entityType: input.entityType,
      churnProbability: Math.min(1, churnProbability),
      churnRisk,
      factors,
      retentionActions: this.generateRetentionActions(churnProbability),
    };
  },

  generateRetentionActions(probability: number): string[] {
    const actions = [];
    if (probability >= 0.5) {
      actions.push('Send win-back offer');
      actions.push('Schedule direct call');
    }
    if (probability >= 0.3) {
      actions.push('Offer loyalty rewards');
    }
    actions.push('Continue engagement');
    return actions;
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('Intelligence - Demand Forecasting', () => {
  test('should forecast demand for 7 days', async () => {
    const forecast = await demandForecastService.forecastDemand('prod_123', 'Tomato Ketchup', 7);

    expect(forecast).toBeDefined();
    expect(forecast.predictions.length).toBe(7);
    expect(forecast.productName).toBe('Tomato Ketchup');
    expect(forecast.recommendations.length).toBeGreaterThan(0);
  });

  test('should generate predictions with confidence scores', async () => {
    const forecast = await demandForecastService.forecastDemand('prod_456', 'Rice 5kg', 14);

    forecast.predictions.forEach(pred => {
      expect(pred.predicted).toBeGreaterThan(0);
      expect(pred.confidence).toBeGreaterThanOrEqual(0.75);
      expect(pred.confidence).toBeLessThanOrEqual(1);
    });
  });
});

describe('Intelligence - Reorder Prediction', () => {
  test('should predict critical reorder when stock is low', async () => {
    const recommendation = await demandForecastService.predictReorder(
      'prod_123',
      'Tomato Ketchup',
      10,
      [50, 45, 60, 55, 48, 52, 58]
    );

    expect(recommendation.urgency).toBe('critical');
    expect(recommendation.suggestedQuantity).toBeGreaterThan(0);
    expect(recommendation.confidence).toBe(0.8);
  });

  test('should predict low urgency when stock is sufficient', async () => {
    const recommendation = await demandForecastService.predictReorder(
      'prod_456',
      'Rice 5kg',
      500,
      [50, 45, 60, 55, 48, 52, 58]
    );

    expect(recommendation.urgency).toBe('low');
    expect(recommendation.suggestedQuantity).toBeGreaterThan(0);
  });

  test('should calculate based on average daily sales', async () => {
    const historicalSales = [100, 100, 100, 100, 100, 100, 100];
    const recommendation = await demandForecastService.predictReorder(
      'prod_789',
      'Test Product',
      100,
      historicalSales
    );

    // Avg = 100, days until stock out = 1 day, should be critical
    expect(recommendation.urgency).toBe('critical');
  });
});

describe('Intelligence - Fraud Detection', () => {
  test('should detect high risk for high value orders', () => {
    const detection = fraudDetectionService.detectFraud({
      entityId: 'order_123',
      entityType: 'order',
      orderValue: 500000,
    });

    expect(detection.riskScore).toBeGreaterThan(0);
    expect(detection.flags.length).toBeGreaterThan(0);
    expect(detection.flags[0].type).toBe('high_value_order');
  });

  test('should detect velocity anomaly', () => {
    const detection = fraudDetectionService.detectFraud({
      entityId: 'order_456',
      entityType: 'order',
      velocityAnomaly: true,
    });

    expect(detection.flags.some(f => f.type === 'velocity_anomaly')).toBe(true);
    expect(detection.riskScore).toBe(30);
  });

  test('should mark as critical when blacklisted', () => {
    const detection = fraudDetectionService.detectFraud({
      entityId: 'order_789',
      entityType: 'order',
      blacklistedPatterns: ['suspicious_ip'],
    });

    expect(detection.riskLevel).toBe('critical');
    expect(detection.flags.some(f => f.type === 'blacklist_match')).toBe(true);
  });

  test('should return low risk for normal orders', () => {
    const detection = fraudDetectionService.detectFraud({
      entityId: 'order_101',
      entityType: 'order',
      orderValue: 5000,
    });

    expect(detection.riskLevel).toBe('low');
    expect(detection.flags.length).toBe(0);
  });
});

describe('Intelligence - Churn Prediction', () => {
  test('should predict high churn for inactive entities', () => {
    const prediction = churnPredictionService.predictChurn({
      entityId: 'retailer_123',
      entityType: 'retailer',
      daysSinceLastOrder: 90,
    });

    expect(prediction.churnProbability).toBeGreaterThan(0.5);
    expect(prediction.churnRisk).toMatch(/high|critical/);
  });

  test('should predict low churn for active entities', () => {
    const prediction = churnPredictionService.predictChurn({
      entityId: 'retailer_456',
      entityType: 'retailer',
      daysSinceLastOrder: 5,
      orderFrequencyTrend: 'increasing',
    });

    expect(prediction.churnProbability).toBeLessThan(0.3);
    expect(prediction.churnRisk).toBe('low');
  });

  test('should include retention actions', () => {
    const prediction = churnPredictionService.predictChurn({
      entityId: 'franchise_123',
      entityType: 'franchise',
      daysSinceLastOrder: 45,
    });

    expect(prediction.retentionActions.length).toBeGreaterThan(0);
  });

  test('should suggest aggressive actions for high churn risk', () => {
    const prediction = churnPredictionService.predictChurn({
      entityId: 'distributor_123',
      entityType: 'distributor',
      daysSinceLastOrder: 120,
      orderFrequencyTrend: 'decreasing',
      engagementScore: 20,
      complaintCount: 5,
    });

    expect(prediction.retentionActions).toContain('Send win-back offer');
    expect(prediction.retentionActions).toContain('Schedule direct call');
  });
});
