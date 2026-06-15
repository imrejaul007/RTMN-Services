/**
 * Nexha ProcurementOS - Commerce Memory Service
 *
 * Stores transaction history, supplier insights, buyer patterns
 * Powers the "Supplier A raises prices 12% before Diwali" intelligence.
 */

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
  timestamp: Date;
}

export interface SupplierInsight {
  supplierId: string;
  supplierName: string;
  insights: Array<{
    type: 'price_spike' | 'quality_issue' | 'delay_pattern';
    description: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: Date;
  }>;
}

export interface BuyerPattern {
  buyerId: string;
  purchaseFrequency: number;
  avgOrderValue: number;
  preferredCategories: string[];
}

export class CommerceMemoryService {
  private transactions = new Map<string, TransactionRecord[]>();
  private insights = new Map<string, SupplierInsight>();
  private buyerPatterns = new Map<string, BuyerPattern>();

  recordTransaction(tx: TransactionRecord): void {
    const existing = this.transactions.get(tx.supplierId) || [];
    existing.push(tx);
    this.transactions.set(tx.supplierId, existing);
    this.detectInsights(tx.supplierId);
  }

  getSupplierMemory(supplierId: string): TransactionRecord[] {
    return this.transactions.get(supplierId) || [];
  }

  getSupplierInsights(supplierId: string): SupplierInsight | null {
    return this.insights.get(supplierId) || null;
  }

  getBuyerPattern(buyerId: string): BuyerPattern | null {
    return this.buyerPatterns.get(buyerId) || null;
  }

  getSeasonalPatterns(supplierId: string, productName: string): Array<{ festival: string; priceIncrease: number }> {
    const txs = this.transactions.get(supplierId) || [];
    const patterns: Array<{ festival: string; priceIncrease: number }> = [];
    const festivalMonths: Record<number, string> = {
      0: 'New Year', 3: 'Easter', 5: 'June Deals',
      8: 'Festive Season', 10: 'Diwali', 11: 'Year End'
    };

    for (const [month, festival] of Object.entries(festivalMonths)) {
      const monthTxs = txs.filter(tx => new Date(tx.timestamp).getMonth() === parseInt(month));
      if (monthTxs.length < 2) continue;

      const avg = monthTxs.reduce((s, tx) => s + tx.unitPrice, 0) / monthTxs.length;
      const allAvg = txs.reduce((s, tx) => s + tx.unitPrice, 0) / txs.length;
      if (avg > allAvg * 1.05) {
        patterns.push({
          festival,
          priceIncrease: ((avg - allAvg) / allAvg) * 100,
        });
      }
    }
    return patterns;
  }

  predictNextOrder(buyerId: string): Array<{ productName: string; estimatedDate: Date }> {
    const pattern = this.buyerPatterns.get(buyerId);
    if (!pattern) return [];
    return pattern.preferredCategories.map(cat => ({
      productName: cat,
      estimatedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }));
  }

  private detectInsights(supplierId: string): void {
    const txs = this.transactions.get(supplierId) || [];
    if (txs.length < 3) return;

    const insights: SupplierInsight['insights'] = [];
    const failRate = txs.filter(tx => tx.quality === 'fail').length / txs.length;
    if (failRate > 0.05) {
      insights.push({
        type: 'quality_issue',
        description: `Quality failure rate: ${(failRate * 100).toFixed(1)}%`,
        severity: failRate > 0.1 ? 'high' : 'medium',
        detectedAt: new Date(),
      });
    }

    const lateRate = txs.filter(tx => !tx.onTime).length / txs.length;
    if (lateRate > 0.2) {
      insights.push({
        type: 'delay_pattern',
        description: `${(lateRate * 100).toFixed(0)}% orders delivered late`,
        severity: lateRate > 0.3 ? 'high' : 'medium',
        detectedAt: new Date(),
      });
    }

    if (insights.length > 0) {
      this.insights.set(supplierId, {
        supplierId,
        supplierName: txs[0]?.supplierId || supplierId,
        insights,
      });
    }
  }
}

export const commerceMemory = new CommerceMemoryService();
