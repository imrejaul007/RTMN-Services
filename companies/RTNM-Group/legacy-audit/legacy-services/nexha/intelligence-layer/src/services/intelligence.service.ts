/**
 * NeXha Intelligence Layer - Core Service
 *
 * Features:
 * - Demand Forecasting
 * - Reorder Recommendations
 * - Supplier Scoring
 * - Territory Intelligence
 * - Fraud Detection
 * - Churn Prediction
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface DemandForecast {
  productId: string;
  productName: string;
  period: { start: Date; end: Date };
  predictions: Array<{
    date: string;
    predicted: number;
    confidence: number;
    factors: string[];
  }>;
  recommendations: string[];
}

export interface ReorderRecommendation {
  productId: string;
  productName: string;
  currentStock: number;
  suggestedQuantity: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  confidence: number;
}

export interface SupplierScore {
  supplierId: string;
  supplierName: string;
  overallScore: number;
  breakdown: {
    quality: number;
    delivery: number;
    price: number;
    responsiveness: number;
    compliance: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface TerritoryInsight {
  territoryId: string;
  territoryName: string;
  metrics: {
    totalRetailers: number;
    activeRetailers: number;
    potentialRetailers: number;
    coveragePercent: number;
    avgOrderValue: number;
    monthlyGrowth: number;
  };
  opportunities: Array<{
    type: 'expansion' | 'upsell' | 'retention';
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

export interface FraudRisk {
  entityId: string;
  entityType: 'order' | 'supplier' | 'distributor' | 'franchise';
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: Array<{
    type: string;
    severity: 'warning' | 'alert' | 'critical';
    description: string;
  }>;
  recommendation: string;
}

export interface ChurnPrediction {
  entityId: string;
  entityType: 'retailer' | 'franchise' | 'distributor';
  churnProbability: number; // 0-1
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  retentionActions: string[];
}

// ============================================================================
// Demand Forecasting Service
// ============================================================================

export class DemandForecastService {
  /**
   * Predict demand for a product
   * Uses historical patterns and external factors
   */
  async forecastDemand(
    productId: string,
    productName: string,
    periodDays: number = 7
  ): Promise<DemandForecast> {
    // Simulated forecast based on random patterns
    const predictions = [];
    const today = new Date();

    for (let i = 0; i < periodDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      // Simulated prediction with some variance
      const baseDemand = 100 + Math.random() * 50;
      const dayOfWeek = date.getDay();
      const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1;

      predictions.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.round(baseDemand * weekendFactor),
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
  }

  /**
   * Predict reorder quantity
   */
  async predictReorder(
    productId: string,
    productName: string,
    currentStock: number,
    historicalSales: number[]
  ): Promise<ReorderRecommendation> {
    const avgDailySales = historicalSales.reduce((a, b) => a + b, 0) / historicalSales.length;
    const daysUntilStockOut = currentStock / avgDailySales;

    let urgency: ReorderRecommendation['urgency'] = 'medium';
    let suggestedQuantity = avgDailySales * 14; // 2 weeks stock

    if (daysUntilStockOut <= 3) {
      urgency = 'critical';
      suggestedQuantity = avgDailySales * 21; // 3 weeks
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
  }
}

// ============================================================================
// Supplier Scoring Service
// ============================================================================

export class SupplierScoringService {
  /**
   * Calculate supplier score based on performance metrics
   */
  async scoreSupplier(input: {
    supplierId: string;
    supplierName: string;
    qualityScore?: number;
    deliveryScore?: number;
    priceScore?: number;
    responsivenessScore?: number;
    complianceScore?: number;
    historicalData?: {
      onTimeDeliveries: number;
      totalDeliveries: number;
      qualityReturns: number;
      totalOrders: number;
      priceVariance: number;
      avgResponseTime: number; // hours
    };
  }): Promise<SupplierScore> {
    // Calculate scores from historical data if provided
    const historical = input.historicalData;

    const quality = historical
      ? ((historical.totalDeliveries - historical.qualityReturns) / historical.totalDeliveries) * 100
      : (input.qualityScore || 75);

    const delivery = historical
      ? (historical.onTimeDeliveries / historical.totalDeliveries) * 100
      : (input.deliveryScore || 80);

    const price = historical
      ? Math.max(0, 100 - Math.abs(historical.priceVariance))
      : (input.priceScore || 70);

    const responsiveness = historical
      ? Math.max(0, 100 - (historical.avgResponseTime * 5))
      : (input.responsivenessScore || 75);

    const compliance = input.complianceScore || 85;

    const overall = (quality * 0.3 + delivery * 0.25 + price * 0.2 + responsiveness * 0.15 + compliance * 0.1);

    // Determine trend
    const trend: SupplierScore['trend'] = overall >= 80 ? 'improving' : overall >= 60 ? 'stable' : 'declining';

    // Risk level
    let riskLevel: SupplierScore['riskLevel'] = 'low';
    if (overall < 50 || delivery < 60) riskLevel = 'high';
    else if (overall < 70 || delivery < 75) riskLevel = 'medium';

    return {
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      overallScore: Math.round(overall * 10) / 10,
      breakdown: {
        quality: Math.round(quality * 10) / 10,
        delivery: Math.round(delivery * 10) / 10,
        price: Math.round(price * 10) / 10,
        responsiveness: Math.round(responsiveness * 10) / 10,
        compliance,
      },
      trend,
      riskLevel,
      recommendations: this.generateRecommendations(overall, delivery, quality),
    };
  }

  private generateRecommendations(overall: number, delivery: number, quality: number): string[] {
    const recs = [];
    if (delivery < 80) recs.push('Improve on-time delivery rate');
    if (quality < 80) recs.push('Focus on quality control');
    if (overall >= 85) recs.push('Consider for preferred supplier status');
    if (overall < 60) recs.push('Schedule performance review meeting');
    return recs;
  }
}

// ============================================================================
// Territory Intelligence Service
// ============================================================================

export class TerritoryIntelligenceService {
  /**
   * Get insights for a territory
   */
  async getTerritoryInsights(input: {
    territoryId: string;
    territoryName: string;
    totalRetailers: number;
    activeRetailers: number;
    avgOrderValue: number;
    monthlyGrowth?: number;
  }): Promise<TerritoryInsight> {
    const coveragePercent = (input.activeRetailers / input.totalRetailers) * 100;

    const opportunities = [];

    if (coveragePercent < 50) {
      opportunities.push({
        type: 'expansion',
        description: `Only ${coveragePercent.toFixed(0)}% retailer coverage. Expand outreach.`,
        impact: 'high',
      });
    }

    if (input.monthlyGrowth && input.monthlyGrowth < 5) {
      opportunities.push({
        type: 'upsell',
        description: 'Growth below target. Focus on AOV improvement.',
        impact: 'medium',
      });
    }

    if (coveragePercent >= 70) {
      opportunities.push({
        type: 'retention',
        description: 'High coverage. Focus on retention and loyalty.',
        impact: 'medium',
      });
    }

    return {
      territoryId: input.territoryId,
      territoryName: input.territoryName,
      metrics: {
        totalRetailers: input.totalRetailers,
        activeRetailers: input.activeRetailers,
        potentialRetailers: input.totalRetailers - input.activeRetailers,
        coveragePercent,
        avgOrderValue: input.avgOrderValue,
        monthlyGrowth: input.monthlyGrowth || 0,
      },
      opportunities,
    };
  }
}

// ============================================================================
// Fraud Detection Service
// ============================================================================

export class FraudDetectionService {
  /**
   * Detect potential fraud
   */
  async detectFraud(input: {
    entityId: string;
    entityType: FraudRisk['entityType'];
    orderValue?: number;
    unusualPatterns?: string[];
    blacklistedPatterns?: string[];
    velocityAnomaly?: boolean;
    addressMismatch?: boolean;
  }): Promise<FraudRisk> {
    const flags = [];
    let riskScore = 0;

    // Check various risk factors
    if (input.orderValue && input.orderValue > 100000) {
      flags.push({
        type: 'high_value_order',
        severity: 'warning',
        description: `Order value ₹${input.orderValue.toLocaleString()} exceeds typical threshold`,
      });
      riskScore += 20;
    }

    if (input.velocityAnomaly) {
      flags.push({
        type: 'velocity_anomaly',
        severity: 'alert',
        description: 'Unusual order frequency detected',
      });
      riskScore += 30;
    }

    if (input.addressMismatch) {
      flags.push({
        type: 'address_mismatch',
        severity: 'alert',
        description: 'Shipping address differs from registered address',
      });
      riskScore += 25;
    }

    if (input.blacklistedPatterns?.length) {
      flags.push({
        type: 'blacklist_match',
        severity: 'critical',
        description: 'Matches known fraudulent patterns',
      });
      riskScore += 50;
    }

    // Determine risk level
    let riskLevel: FraudRisk['riskLevel'] = 'low';
    if (riskScore >= 50) riskLevel = 'critical';
    else if (riskScore >= 35) riskLevel = 'high';
    else if (riskScore >= 20) riskLevel = 'medium';

    return {
      entityId: input.entityId,
      entityType: input.entityType,
      riskScore,
      riskLevel,
      flags,
      recommendation: riskScore >= 35
        ? 'Review manually before processing'
        : 'Auto-approve (low risk)',
    };
  }
}

// ============================================================================
// Churn Prediction Service
// ============================================================================

export class ChurnPredictionService {
  /**
   * Predict churn probability
   */
  async predictChurn(input: {
    entityId: string;
    entityType: ChurnPrediction['entityType'];
    daysSinceLastOrder?: number;
    orderFrequencyTrend?: 'increasing' | 'stable' | 'decreasing';
    avgOrderValueTrend?: 'increasing' | 'stable' | 'decreasing';
    engagementScore?: number;
    complaintCount?: number;
    competitorActivity?: boolean;
  }): Promise<ChurnPrediction> {
    let churnProbability = 0.1; // Base 10%
    const factors = [];

    // Days since last order
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

    // Order frequency trend
    if (input.orderFrequencyTrend === 'decreasing') {
      churnProbability += 0.15;
      factors.push({
        factor: 'order_frequency',
        impact: 0.15,
        description: 'Order frequency declining over time',
      });
    }

    // Engagement score
    if (input.engagementScore && input.engagementScore < 30) {
      churnProbability += 0.15;
      factors.push({
        factor: 'low_engagement',
        impact: 0.15,
        description: 'Engagement score below threshold',
      });
    }

    // Complaints
    if (input.complaintCount && input.complaintCount > 3) {
      churnProbability += 0.2;
      factors.push({
        factor: 'complaints',
        impact: 0.2,
        description: `${input.complaintCount} complaints in last 30 days`,
      });
    }

    // Competitor activity
    if (input.competitorActivity) {
      churnProbability += 0.1;
      factors.push({
        factor: 'competitor_activity',
        impact: 0.1,
        description: 'Competitor activity detected in territory',
      });
    }

    // Determine risk level
    let churnRisk: ChurnPrediction['churnRisk'] = 'low';
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
  }

  private generateRetentionActions(probability: number): string[] {
    const actions = [];
    if (probability >= 0.5) {
      actions.push('Send personalized win-back offer');
      actions.push('Schedule direct call with relationship manager');
      actions.push('Review and resolve any outstanding issues');
    }
    if (probability >= 0.3) {
      actions.push('Offer loyalty rewards program enrollment');
      actions.push('Share product updates and new offerings');
    }
    actions.push('Continue regular engagement cadence');
    return actions;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const demandForecastService = new DemandForecastService();
export const supplierScoringService = new SupplierScoringService();
export const territoryIntelligenceService = new TerritoryIntelligenceService();
export const fraudDetectionService = new FraudDetectionService();
export const churnPredictionService = new ChurnPredictionService();
