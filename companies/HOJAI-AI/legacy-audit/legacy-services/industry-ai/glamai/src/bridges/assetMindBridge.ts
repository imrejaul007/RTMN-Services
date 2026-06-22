/**
 * AssetMind Bridge
 *
 * Connects GlamAI to AssetMind for:
 * - Salon wealth analytics
 * - Investment recommendations
 * - Financial forecasting
 */

import axios from 'axios';
import { logger } from '../../../utils/logger.js';

const ASSETMIND_URL = process.env.ASSETMIND_URL || 'http://localhost:5001';

export class AssetMindBridge {
  private client: axios.AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ASSETMIND_URL,
      timeout: 15000
    });
  }

  // ============ SALON WEALTH TRACKING ============

  /**
   * Track salon financial health
   */
  async trackSalonWealth(salonId: string, data: {
    revenue: number;
    costs: number;
    profit: number;
    assets: number;
    liabilities: number;
  }): Promise<boolean> {
    try {
      await this.client.post('/api/wealth/track', {
        entityId: salonId,
        entityType: 'salon',
        industry: 'beauty',
        metrics: data
      });

      logger.info(`Tracked wealth for salon ${salonId}`);
      return true;
    } catch (error: any) {
      logger.warn(`Wealth tracking failed: ${error.message}`);
      return false;
    }
  }

  // ============ INVESTMENT RECOMMENDATIONS ============

  /**
   * Get investment recommendations for salon
   */
  async getInvestmentRecommendations(salonId: string): Promise<any[]> {
    try {
      const response = await this.client.post('/api/investments/recommend', {
        entityId: salonId,
        industry: 'beauty',
        context: {
          type: 'salon',
          growthStage: 'scaling'
        }
      });

      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Investment recommendations failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get FD/MF/Bonds recommendations
   */
  async getSavingsRecommendations(amount: number, tenure: number): Promise<any[]> {
    try {
      const response = await this.client.post('/api/savings/recommend', {
        amount,
        tenureMonths: tenure,
        riskProfile: 'moderate'
      });

      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Savings recommendations failed: ${error.message}`);
      return [];
    }
  }

  // ============ LTV PREDICTIONS ============

  /**
   * Predict customer LTV
   */
  async predictCustomerLTV(customerId: string, data: {
    totalSpent: number;
    visitFrequency: number;
    avgServiceValue: number;
    churnRisk: string;
  }): Promise<number> {
    try {
      const response = await this.client.post('/api/ml/ltv-predict', {
        entityId: customerId,
        entityType: 'customer',
        features: {
          total_spent: data.totalSpent,
          visit_frequency: data.visitFrequency,
          avg_service_value: data.avgServiceValue,
          churn_risk: data.churnRisk === 'high' ? 1 : data.churnRisk === 'medium' ? 0.5 : 0
        }
      });

      return response.data.data?.ltv || 0;
    } catch (error: any) {
      logger.warn(`LTV prediction failed: ${error.message}`);
      return 0;
    }
  }

  // ============ FINANCIAL FORECASTING ============

  /**
   * Get revenue forecast for salon
   */
  async getRevenueForecast(salonId: string, months: number = 6): Promise<any> {
    try {
      const response = await this.client.post('/api/forecast/revenue', {
        entityId: salonId,
        entityType: 'salon',
        industry: 'beauty',
        forecastMonths: months
      });

      return response.data.data;
    } catch (error: any) {
      logger.warn(`Revenue forecast failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get expense forecast
   */
  async getExpenseForecast(salonId: string, months: number = 6): Promise<any> {
    try {
      const response = await this.client.post('/api/forecast/expense', {
        entityId: salonId,
        entityType: 'salon',
        industry: 'beauty',
        forecastMonths: months
      });

      return response.data.data;
    } catch (error: any) {
      logger.warn(`Expense forecast failed: ${error.message}`);
      return null;
    }
  }

  // ============ WEALTH ANALYTICS ============

  /**
   * Get wealth summary
   */
  async getWealthSummary(ownerId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/wealth/summary/${ownerId}`);
      return response.data.data;
    } catch (error: any) {
      logger.warn(`Wealth summary failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get asset allocation recommendations
   */
  async getAssetAllocation(investableAmount: number): Promise<any> {
    try {
      const response = await this.client.post('/api/assets/allocate', {
        amount: investableAmount,
        profile: 'balanced',
        goals: ['wealth-growth', 'passive-income']
      });

      return response.data.data;
    } catch (error: any) {
      logger.warn(`Asset allocation failed: ${error.message}`);
      return null;
    }
  }

  // ============ INSIGHTS ============

  /**
   * Get business insights
   */
  async getBusinessInsights(salonId: string): Promise<any> {
    try {
      const response = await this.client.post('/api/insights/business', {
        entityId: salonId,
        entityType: 'salon',
        industry: 'beauty'
      });

      return response.data.data;
    } catch (error: any) {
      logger.warn(`Business insights failed: ${error.message}`);
      return null;
    }
  }

  // ============ TAX PLANNING ============

  /**
   * Get tax saving recommendations
   */
  async getTaxSavings(year: number, income: number): Promise<any[]> {
    try {
      const response = await this.client.post('/api/tax/savings', {
        financialYear: year,
        annualIncome: income,
        category: 'business'
      });

      return response.data.data || [];
    } catch (error: any) {
      logger.warn(`Tax savings failed: ${error.message}`);
      return [];
    }
  }

  // ============ HEALTH CHECK ============

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const assetMindBridge = new AssetMindBridge();
