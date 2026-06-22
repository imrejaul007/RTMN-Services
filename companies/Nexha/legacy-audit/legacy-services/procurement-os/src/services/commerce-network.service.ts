/**
 * Nexha ProcurementOS - Commerce Memory Service
 *
 * Stores transaction history, supplier insights, buyer patterns
 * Powers the "Supplier A raises prices 12% before Diwali" intelligence.
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';

export interface TransactionRecord {
  id: string;
  supplierId: string;
  buyerId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  deliveryDays: number;
  quality: 'pass' | 'fail' | 'partial';
  onTime: boolean;
  buyerReputation: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface PriceTrend {
  productName: string;
  supplierId: string;
  period: 'week' | 'month' | 'quarter';
  prices: Array<{ date: Date; price: number }>;
  avgPrice: number;
  trend: 'rising' | 'falling' | 'stable';
  variance: number; // % change from avg
}

export interface DeliveryTrend {
  supplierId: string;
  period: 'week' | 'month' | 'quarter';
  onTimeRate: number;
  avgDays: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface SupplierInsight {
  supplierId: string;
  supplierName: string;
  insights: Array<{
    type: 'price_spike' | 'quality_issue' | 'delay_pattern' | 'loyalty_opportunity' | 'risk_signal';
    description: string;
    severity: 'low' | 'medium' | 'high';
    evidence: string[];
    recommendations: string[];
    detectedAt: Date;
  }>;
}

export interface BuyerPattern {
  buyerId: string;
  buyerName: string;
  supplierId: string;
  purchaseFrequency: number; // orders per month
  avgOrderValue: number;
  preferredCategories: string[];
  seasonality: Array<{ month: number; volume: number }>;
  negotiationStyle: 'aggressive' | 'balanced' | 'collaborative';
}

export class CommerceMemoryService {
  private transactions = new Map<string, TransactionRecord[]>();
  private priceTrends = new Map<string, PriceTrend[]>();
  private deliveryTrends = new Map<string, DeliveryTrend[]>();
  private supplierInsights = new Map<string, SupplierInsight>();
  private buyerPatterns = new Map<string, BuyerPattern>();

  /**
   * Record a completed transaction
   */
  recordTransaction(tx: TransactionRecord): void {
    const existing = this.transactions.get(tx.supplierId) || [];
    existing.push(tx);
    this.transactions.set(tx.supplierId, existing);

    // Update price trends
    this.updatePriceTrend(tx);

    // Detect insights
    this.detectInsights(tx.supplierId);
  }

  /**
   * Get supplier memory (full history)
   */
  getSupplierMemory(supplierId: string): TransactionRecord[] {
    return this.transactions.get(supplierId) || [];
  }

  /**
   * Get price trend for a product
   */
  getPriceTrend(productName: string, supplierId: string): PriceTrend | null {
    const trends = this.priceTrends.get(`${supplierId}:${productName}`);
    if (!trends || trends.length === 0) return null;
    return trends[trends.length - 1];
  }

  /**
   * Get seasonal patterns (e.g., "Supplier A raises prices 12% before Diwali")
   */
  getSeasonalPatterns(supplierId: string, productName: string): Array<{ festival: string; priceIncrease: number }> {
    const txs = this.transactions.get(supplierId) || [];
    const patterns: Array<{ festival: string; priceIncrease: number }> = [];
    const festivalMonths = [1, 3, 5, 8, 10, 11]; // Months with major festivals

    for (const month of festivalMonths) {
      const monthTxs = txs.filter(tx =>
        new Date(tx.timestamp).getMonth() === month
      );
      if (monthTxs.length < 2) continue;

      const avg = monthTxs.reduce((s, tx) => s + tx.unitPrice, 0) / monthTxs.length;
      const allAvg = txs.reduce((s, tx) => s + tx.unitPrice, 0) / txs.length;
      if (txs.length > 1 && avg > allAvg * 1.05) {
        patterns.push({
          festival: this.getFestivalName(month),
          priceIncrease: ((avg - allAvg) / allAvg) * 100,
        });
      }
    }

    return patterns;
  }

  /**
   * Get delivery performance trend
   */
  getDeliveryTrend(supplierId: string): DeliveryTrend | null {
    return this.deliveryTrends.get(supplierId) || null;
  }

  /**
   * Get insights for a supplier
   */
  getSupplierInsights(supplierId: string): SupplierInsight | null {
    return this.supplierInsights.get(supplierId) || null;
  }

  /**
   * Get buyer purchase pattern
   */
  getBuyerPattern(buyerId: string): BuyerPattern | null {
    return this.buyerPatterns.get(buyerId) || null;
  }

  /**
   * Find suppliers who sell similar products to what buyers also bought
   */
  findSimilarSupplierOpportunities(supplierId: string, productName: string): string[] {
    const txs = this.transactions.get(supplierId) || [];
    const buyerIds = new Set(txs.map(tx => tx.buyerId));
    const opportunities = new Set<string>();

    for (const buyerId of buyerIds) {
      // Find other suppliers this buyer purchased from
      for (const [sid, buyerTxs] of this.transactions) {
        if (sid === supplierId) continue;
        const alsoBought = buyerTxs.filter(tx => buyerIds.has(tx.buyerId));
        if (alsoBought.length > 0) {
          opportunities.add(sid);
        }
      }
    }

    return Array.from(opportunities);
  }

  /**
   * Predict next order for a buyer
   */
  predictNextOrder(buyerId: string): Array<{ productName: string; estimatedDate: Date; estimatedValue: number }> {
    const pattern = this.buyerPatterns.get(buyerId);
    if (!pattern) return [];

    return pattern.preferredCategories.map(cat => ({
      productName: cat,
      estimatedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 / pattern.purchaseFrequency),
      estimatedValue: pattern.avgOrderValue,
    }));
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private updatePriceTrend(tx: TransactionRecord): void {
    const key = `${tx.supplierId}:${tx.productName}`;
    const existing = this.priceTrends.get(key) || [];
    const trend: PriceTrend = {
      productName: tx.productName,
      supplierId: tx.supplierId,
      period: 'month',
      prices: [...(existing.length > 0 ? existing[existing.length - 1].prices : []), { date: tx.timestamp, price: tx.unitPrice }],
      avgPrice: tx.unitPrice,
      trend: 'stable',
      variance: 0,
    };

    // Calculate trend
    if (trend.prices.length >= 3) {
      const recent = trend.prices.slice(-3);
      const first = recent[0].price;
      const last = recent[recent.length - 1].price;
      const change = ((last - first) / first) * 100;
      trend.trend = change > 2 ? 'rising' : change < -2 ? 'falling' : 'stable';
      trend.variance = change;
    }

    existing.push(trend);
    this.priceTrends.set(key, existing.slice(-12)); // Keep 12 periods
  }

  private detectInsights(supplierId: string): void {
    const txs = this.transactions.get(supplierId) || [];
    if (txs.length < 3) return;

    const insights: SupplierInsight['insights'] = [];

    // Price spike detection
    const seasonal = this.getSeasonalPatterns(supplierId, txs[0]?.productName || '');
    for (const s of seasonal) {
      if (s.priceIncrease > 5) {
        insights.push({
          type: 'price_spike',
          description: `Prices increase ${s.priceIncrease.toFixed(1)}% during ${s.festival}`,
          severity: s.priceIncrease > 10 ? 'high' : 'medium',
          evidence: [`${s.priceIncrease.toFixed(1)}% increase during ${s.festival}`],
          recommendations: ['Negotiate fixed pricing', 'Pre-buy before festival season'],
          detectedAt: new Date(),
        });
      }
    }

    // Quality issue detection
    const failRate = txs.filter(tx => tx.quality === 'fail').length / txs.length;
    if (failRate > 0.05) {
      insights.push({
        type: 'quality_issue',
        description: `Quality failure rate: ${(failRate * 100).toFixed(1)}%`,
        severity: failRate > 0.1 ? 'high' : 'medium',
        evidence: [`${txs.filter(tx => tx.quality === 'fail').length} failures in ${txs.length} orders`],
        recommendations: ['Schedule quality audit', 'Request root cause analysis'],
        detectedAt: new Date(),
      });
    }

    // Delay pattern
    const lateRate = txs.filter(tx => !tx.onTime).length / txs.length;
    if (lateRate > 0.2) {
      insights.push({
        type: 'delay_pattern',
        description: `${(lateRate * 100).toFixed(0)}% orders delivered late`,
        severity: lateRate > 0.3 ? 'high' : 'medium',
        evidence: [`${txs.filter(tx => !tx.onTime).length} late deliveries`],
        recommendations: ['Discuss logistics', 'Consider backup supplier'],
        detectedAt: new Date(),
      });
    }

    if (insights.length > 0) {
      this.supplierInsights.set(supplierId, {
        supplierId,
        supplierName: txs[0]?.supplierId || supplierId,
        insights,
      });
    }
  }

  private getFestivalName(month: number): string {
    const festivals: Record<number, string> = {
      0: 'New Year',
      1: 'February Sales',
      3: 'Easter/Passion/Id-ul-Fitr',
      5: 'June Deals',
      8: 'Festive Season Start',
      10: 'Diwali/Deepawali',
      11: 'Christmas/Year End',
    };
    return festivals[month] || `Month ${month + 1}`;
  }
}

export const commerceMemory = new CommerceMemoryService();
