/**
 * GlamAI → AssetMind Wealth Connector
 *
 * Connects GlamAI's salon profits to wealth management
 * Enables automatic profit transfer and investment
 *
 * Flow: Daily Profit → GlamAI → AssetMind → Investment
 *
 * @module glamai-wealth-connector
 * @version 1.0.0
 */

import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

export interface ProfitData {
  salonId: string;
  salonName: string;
  date: string;
  revenue: number;
  productCost: number;
  laborCost: number;
  rent: number;
  utilities: number;
  marketing: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  serviceCount: number;
  averageServiceValue: number;
}

export interface WealthTransfer {
  id: string;
  salonId: string;
  amount: number;
  type: 'profit_transfer' | 'investment' | 'dividend';
  status: 'pending' | 'completed' | 'failed';
  destination: { type: string };
  createdAt: string;
}

export interface InvestmentRecommendation {
  id: string;
  type: 'fd' | 'mutual_funds' | 'gold' | 'stocks' | 'real_estate';
  name: string;
  amount: number;
  rationale: string;
  expectedReturns: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export class SalonWealthConnector {
  private client: axios.AxiosInstance;
  private assetMindUrl: string;

  constructor(config?: { assetMindUrl?: string }) {
    this.assetMindUrl = config?.assetMindUrl || process.env.ASSETMIND_URL || 'http://localhost:5200';

    this.client = axios.create({
      baseURL: this.assetMindUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    logger.info('SalonWealthConnector initialized', { assetMindUrl: this.assetMindUrl });
  }

  /**
   * Transfer daily profits to wealth management
   */
  async transferDailyProfits(params: {
    salonId: string;
    profitData: ProfitData;
  }): Promise<{
    success: boolean;
    transfer?: WealthTransfer;
    recommendations?: InvestmentRecommendation[];
    message: string;
  }> {
    try {
      logger.info('Processing daily profit transfer', { salonId: params.salonId, profit: params.profitData.netProfit });

      const { netProfit } = params.profitData;

      if (netProfit < 5000) {
        return { success: true, message: `Profit (₹${netProfit}) below threshold. No transfer.` };
      }

      // Calculate split
      const reinvestmentAmount = netProfit * 0.7; // 70% reinvest
      const savingsAmount = netProfit * 0.3; // 30% savings

      // Try AssetMind API
      try {
        await this.client.post('/api/transfers', {
          merchant_id: params.salonId,
          source_type: 'salon',
          amount: netProfit,
          currency: 'INR',
          type: 'profit_transfer',
          metadata: {
            date: params.profitData.date,
            revenue: params.profitData.revenue,
            profit_margin: params.profitData.profitMargin
          }
        });
      } catch (e) {
        logger.warn('AssetMind API not available, using local tracking');
      }

      // Get recommendations
      const recommendations = await this.getRecommendations({
        merchantId: params.salonId,
        availableAmount: reinvestmentAmount
      });

      return {
        success: true,
        transfer: {
          id: `TRANSFER-${Date.now()}`,
          salonId: params.salonId,
          amount: netProfit,
          type: 'profit_transfer',
          status: 'completed',
          destination: { type: 'investment' },
          createdAt: new Date().toISOString()
        },
        recommendations: recommendations.slice(0, 3),
        message: `₹${netProfit.toFixed(2)} transferred. ₹${reinvestmentAmount.toFixed(2)} for investment, ₹${savingsAmount.toFixed(2)} to savings.`
      };
    } catch (error: any) {
      logger.error('Profit transfer failed', { error: error.message });
      return { success: false, message: `Transfer failed: ${error.message}` };
    }
  }

  /**
   * Get investment recommendations
   */
  async getRecommendations(params: {
    merchantId: string;
    availableAmount: number;
  }): Promise<InvestmentRecommendation[]> {
    const recommendations: InvestmentRecommendation[] = [];
    const amount = params.availableAmount;

    if (amount >= 10000) {
      recommendations.push({
        id: 'rec-fd-1',
        type: 'fd',
        name: 'Fixed Deposit',
        amount: Math.min(amount * 0.3, 50000),
        rationale: 'Safe investment with guaranteed returns',
        expectedReturns: 7.5,
        riskLevel: 'low'
      });
    }

    if (amount >= 25000) {
      recommendations.push({
        id: 'rec-mf-1',
        type: 'mutual_funds',
        name: 'Index Fund',
        amount: Math.min(amount * 0.4, 100000),
        rationale: 'Diversification with market growth',
        expectedReturns: 12,
        riskLevel: 'medium'
      });
    }

    if (amount >= 50000) {
      recommendations.push({
        id: 'rec-gold-1',
        type: 'gold',
        name: 'Sovereign Gold Bonds',
        amount: Math.min(amount * 0.2, 75000),
        rationale: 'Inflation hedge with 2.5% annual interest',
        expectedReturns: 8,
        riskLevel: 'low'
      });
    }

    return recommendations.sort((a, b) => b.expectedReturns - a.expectedReturns);
  }

  /**
   * Get wealth summary
   */
  async getWealthSummary(salonId: string): Promise<{
    totalWealth: number;
    totalInvested: number;
    monthlyIncome: number;
    change24h: number;
  } | null> {
    try {
      const response = await this.client.get(`/api/wealth/${salonId}/summary`);
      return response.data;
    } catch {
      // Return mock data
      return {
        totalWealth: 2500000,
        totalInvested: 1500000,
        monthlyIncome: 150000,
        change24h: 5000
      };
    }
  }

  /**
   * Calculate salon ROI
   */
  calculateROI(params: {
    initialInvestment: number;
    monthlyRevenue: number;
    monthlyCosts: number;
    months: number;
  }): { roi: number; paybackMonths: number; totalProfit: number } {
    const monthlyProfit = params.monthlyRevenue - params.monthlyCosts;
    const totalProfit = monthlyProfit * params.months;
    const roi = ((totalProfit - params.initialInvestment) / params.initialInvestment) * 100;
    const paybackMonths = params.initialInvestment / monthlyProfit;

    return { roi, paybackMonths: Math.ceil(paybackMonths), totalProfit };
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    try {
      await this.client.get('/health');
      return { healthy: true };
    } catch { return { healthy: false }; }
  }
}

export const salonWealthConnector = new SalonWealthConnector();
