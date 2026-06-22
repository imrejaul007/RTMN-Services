import { v4 as uuidv4 } from 'uuid';
import {
  Investment,
  CostItem,
  BenefitItem,
  CreateInvestmentRequest,
  UpdateInvestmentRequest,
  HistoricalROI,
  ROIEntry,
  PerformanceMetrics,
} from '../types/index.js';

/**
 * Investment Storage Service
 * In-memory storage for investments and historical ROI tracking
 * In production, this would use a database
 */
export class InvestmentStorageService {
  private static investments: Map<string, Investment> = new Map();
  private static roiHistory: Map<string, ROIEntry[]> = new Map();

  /**
   * Create a new investment
   */
  static createInvestment(request: CreateInvestmentRequest): Investment {
    const id = uuidv4();
    const now = new Date().toISOString();

    const costs: CostItem[] = (request.costs || []).map((c) => ({
      id: uuidv4(),
      ...c,
    }));

    const benefits: BenefitItem[] = (request.benefits || []).map((b) => ({
      id: uuidv4(),
      ...b,
    }));

    const investment: Investment = {
      id,
      name: request.name,
      description: request.description,
      initialInvestment: request.initialInvestment,
      currency: request.currency || 'USD',
      startDate: request.startDate,
      endDate: request.endDate,
      expectedReturn: request.expectedReturn || 0,
      actualReturn: 0,
      costs,
      benefits,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.investments.set(id, investment);
    this.roiHistory.set(id, []);

    // Initialize ROI history with initial value
    this.addROIEntry(id, investment.initialInvestment);

    return investment;
  }

  /**
   * Get investment by ID
   */
  static getInvestment(id: string): Investment | undefined {
    return this.investments.get(id);
  }

  /**
   * Get all investments
   */
  static getAllInvestments(): Investment[] {
    return Array.from(this.investments.values());
  }

  /**
   * Update investment
   */
  static updateInvestment(id: string, updates: UpdateInvestmentRequest): Investment | undefined {
    const investment = this.investments.get(id);
    if (!investment) return undefined;

    const updated: Investment = {
      ...investment,
      ...updates,
      costs: updates.costs || investment.costs,
      benefits: updates.benefits || investment.benefits,
      updatedAt: new Date().toISOString(),
    };

    this.investments.set(id, updated);
    return updated;
  }

  /**
   * Delete investment
   */
  static deleteInvestment(id: string): boolean {
    this.roiHistory.delete(id);
    return this.investments.delete(id);
  }

  /**
   * Add ROI entry to history
   */
  static addROIEntry(investmentId: string, value: number): ROIEntry | undefined {
    const investment = this.investments.get(investmentId);
    if (!investment) return undefined;

    const history = this.roiHistory.get(investmentId) || [];
    const lastEntry = history[history.length - 1];

    const roi = investment.initialInvestment > 0
      ? ((value - investment.initialInvestment) / investment.initialInvestment) * 100
      : 0;

    const cumulativeReturn = value - investment.initialInvestment;

    const entry: ROIEntry = {
      date: new Date().toISOString(),
      value,
      roi,
      cumulativeReturn,
    };

    history.push(entry);
    this.roiHistory.set(investmentId, history);

    return entry;
  }

  /**
   * Get historical ROI for an investment
   */
  static getHistoricalROI(investmentId: string): HistoricalROI | undefined {
    const investment = this.investments.get(investmentId);
    if (!investment) return undefined;

    const entries = this.roiHistory.get(investmentId) || [];

    if (entries.length === 0) {
      return {
        investmentId,
        entries: [],
        currentRoi: 0,
        averageRoi: 0,
        bestRoi: 0,
        worstRoi: 0,
      };
    }

    const currentRoi = entries[entries.length - 1].roi;
    const averageRoi = entries.reduce((sum, e) => sum + e.roi, 0) / entries.length;
    const bestRoi = Math.max(...entries.map((e) => e.roi));
    const worstRoi = Math.min(...entries.map((e) => e.roi));

    return {
      investmentId,
      entries,
      currentRoi: Math.round(currentRoi * 100) / 100,
      averageRoi: Math.round(averageRoi * 100) / 100,
      bestRoi: Math.round(bestRoi * 100) / 100,
      worstRoi: Math.round(worstRoi * 100) / 100,
    };
  }

  /**
   * Get performance metrics for an investment
   */
  static getPerformanceMetrics(
    investmentId: string,
    benchmarkReturn?: number,
    riskFreeRate?: number
  ): PerformanceMetrics | undefined {
    const investment = this.investments.get(investmentId);
    const history = this.roiHistory.get(investmentId);

    if (!investment || !history || history.length < 2) return undefined;

    const currentValue = history[history.length - 1].value;
    const initialValue = investment.initialInvestment;
    const totalReturn = currentValue - initialValue;
    const periodReturn = (totalReturn / initialValue) * 100;

    // Calculate annualized return
    const startDate = new Date(investment.startDate);
    const endDate = investment.endDate ? new Date(investment.endDate) : new Date();
    const years = (endDate.getTime() - startDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const annualizedReturn = years > 0 ? (Math.pow(currentValue / initialValue, 1 / years) - 1) * 100 : 0;

    // Calculate volatility (standard deviation of returns)
    const returns = history.map((e) => e.roi);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Calculate max drawdown
    let peak = initialValue;
    let maxDrawdown = 0;
    for (const entry of history) {
      if (entry.value > peak) peak = entry.value;
      const drawdown = ((peak - entry.value) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Calculate Sharpe Ratio
    let sharpeRatio: number | undefined;
    if (riskFreeRate !== undefined && volatility > 0) {
      sharpeRatio = (annualizedReturn - riskFreeRate) / volatility;
    }

    // Calculate alpha and beta (if benchmark provided)
    let alpha: number | undefined;
    let beta: number | undefined;
    if (benchmarkReturn !== undefined) {
      const rfr = riskFreeRate ?? 0;
      beta = volatility > 0 ? (annualizedReturn - rfr) / (benchmarkReturn - rfr || 1) : 1;
      alpha = annualizedReturn - (rfr + beta * (benchmarkReturn - rfr));
    }

    return {
      investmentId,
      ROI: Math.round(periodReturn * 100) / 100,
      annualizedReturn: Math.round(annualizedReturn * 100) / 100,
      sharpeRatio: sharpeRatio ? Math.round(sharpeRatio * 100) / 100 : undefined,
      volatility: Math.round(volatility * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100,
      periodReturn: Math.round(periodReturn * 100) / 100,
      benchmarkReturn: benchmarkReturn,
      alpha: alpha ? Math.round(alpha * 100) / 100 : undefined,
      beta: beta ? Math.round(beta * 100) / 100 : undefined,
    };
  }

  /**
   * Record actual return for an investment
   */
  static recordReturn(investmentId: string, returnAmount: number): Investment | undefined {
    const investment = this.investments.get(investmentId);
    if (!investment) return undefined;

    investment.actualReturn += returnAmount;
    investment.updatedAt = new Date().toISOString();

    this.investments.set(investmentId, investment);
    this.addROIEntry(investmentId, investment.initialInvestment + investment.actualReturn);

    return investment;
  }

  /**
   * Add cost to investment
   */
  static addCost(investmentId: string, cost: Omit<CostItem, 'id'>): CostItem | undefined {
    const investment = this.investments.get(investmentId);
    if (!investment) return undefined;

    const newCost: CostItem = {
      id: uuidv4(),
      ...cost,
    };

    investment.costs.push(newCost);
    investment.updatedAt = new Date().toISOString();

    this.investments.set(investmentId, investment);
    return newCost;
  }

  /**
   * Add benefit to investment
   */
  static addBenefit(investmentId: string, benefit: Omit<BenefitItem, 'id'>): BenefitItem | undefined {
    const investment = this.investments.get(investmentId);
    if (!investment) return undefined;

    const newBenefit: BenefitItem = {
      id: uuidv4(),
      ...benefit,
    };

    investment.benefits.push(newBenefit);
    investment.updatedAt = new Date().toISOString();

    this.investments.set(investmentId, investment);
    return newBenefit;
  }

  /**
   * Clear all data (for testing)
   */
  static clearAll(): void {
    this.investments.clear();
    this.roiHistory.clear();
  }
}

export default InvestmentStorageService;
