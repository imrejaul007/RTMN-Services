/**
 * Company Intelligence Service
 *
 * AI CEO layer for companies:
 * - Daily briefings
 * - Risk analysis
 * - Forecasting
 * - Recommendations
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CompanyCopilot,
  DailyBriefing,
  Metric,
  Alert,
  Recommendation,
  RiskAnalysis,
  Risk,
  Opportunity,
} from './types';

// ============================================
// In-Memory Stores
// ============================================

const copilots = new Map<string, CompanyCopilot>();
const briefings = new Map<string, DailyBriefing>();
const riskAnalysis = new Map<string, RiskAnalysis>();

// ============================================
// Company Intelligence Service
// ============================================

export class CompanyIntelligence {
  /**
   * Create a company copilot (AI CEO/CFO/etc)
   */
  createCopilot(params: {
    companyId: string;
    name: string;
    role: 'ceo' | 'cfo' | 'cmo' | 'coo' | 'hr';
    personality?: string;
  }): CompanyCopilot {
    const copilot: CompanyCopilot = {
      companyId: params.companyId,
      name: params.name,
      role: params.role,
      personality: params.personality || 'Professional, data-driven',
      enabled: true,
    };

    copilots.set(copilot.companyId, copilot);
    return copilot;
  }

  /**
   * Get company copilot
   */
  getCopilot(companyId: string): CompanyCopilot | null {
    return copilots.get(companyId) || null;
  }

  /**
   * Generate daily briefing
   */
  generateBriefing(params: {
    companyId: string;
    date: string;
    metrics: {
      revenue: number;
      orders: number;
      customers: number;
      expenses: number;
    };
  }): DailyBriefing {
    const keyMetrics: Metric[] = [
      {
        name: 'Revenue',
        value: params.metrics.revenue,
        change: 5.2, // Would be calculated from historical data
        trend: 'up',
        status: 'good',
      },
      {
        name: 'Orders',
        value: params.metrics.orders,
        change: 3.1,
        trend: 'up',
        status: 'good',
      },
      {
        name: 'Customers',
        value: params.metrics.customers,
        change: 2.8,
        trend: 'up',
        status: 'good',
      },
      {
        name: 'Expenses',
        value: params.metrics.expenses,
        change: -1.5,
        trend: 'down',
        status: 'good',
      },
    ];

    const alerts: Alert[] = [];

    // Auto-generate alerts
    if (params.metrics.revenue < 100000) {
      alerts.push({
        type: 'opportunity',
        title: 'Revenue below target',
        description: 'Consider running a promotional campaign',
        priority: 'medium',
      });
    }

    const recommendations: Recommendation[] = [
      {
        type: 'growth',
        title: 'Expand to new location',
        description: 'Based on current performance, a second location could increase revenue by 40%',
        expectedImpact: '+40% revenue',
        confidence: 75,
        effort: 'high',
      },
      {
        type: 'efficiency',
        title: 'Automate order processing',
        description: 'AI can reduce manual work by 60%',
        expectedImpact: '-60% manual work',
        confidence: 90,
        effort: 'low',
      },
    ];

    const briefing: DailyBriefing = {
      id: `brief_${uuidv4().slice(0, 8)}`,
      companyId: params.companyId,
      date: params.date,
      summary: `Today ${params.date}: Revenue ₹${params.metrics.revenue}, ${params.metrics.orders} orders from ${params.metrics.customers} customers.`,
      keyMetrics,
      alerts,
      recommendations,
      createdAt: new Date().toISOString(),
    };

    briefings.set(briefing.id, briefing);
    return briefing;
  }

  /**
   * Get latest briefing
   */
  getLatestBriefing(companyId: string): DailyBriefing | null {
    const companyBriefings = Array.from(briefings.values())
      .filter(b => b.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return companyBriefings[0] || null;
  }

  /**
   * Analyze risks
   */
  analyzeRisks(params: {
    companyId: string;
    financials: {
      revenue: number;
      expenses: number;
      debt: number;
    };
    operations: {
      employeeCount: number;
      locations: number;
    };
  }): RiskAnalysis {
    const risks: Risk[] = [];
    const opportunities: Opportunity[] = [];

    // Financial risks
    if (params.financials.expenses > params.financials.revenue * 0.8) {
      risks.push({
        id: `risk_${uuidv4().slice(0, 8)}`,
        category: 'financial',
        title: 'High expense ratio',
        description: 'Expenses are consuming most revenue',
        severity: 'high',
        probability: 80,
        impact: 70,
        mitigation: 'Review and reduce discretionary expenses',
      });
    }

    // Operational risks
    if (params.operations.employeeCount < 3 && params.operations.locations > 1) {
      risks.push({
        id: `risk_${uuidv4().slice(0, 8)}`,
        category: 'operational',
        title: 'Understaffed',
        description: 'Too few employees for multiple locations',
        severity: 'medium',
        probability: 60,
        impact: 50,
        mitigation: 'Hire additional staff or reduce locations',
      });
    }

    // Opportunities
    if (params.financials.revenue > 500000) {
      opportunities.push({
        id: `opp_${uuidv4().slice(0, 8)}`,
        category: 'growth',
        title: 'Ready for franchise',
        description: 'Revenue suggests franchise readiness',
        potential: 85,
        timeline: '6 months',
        requirements: ['Brand guidelines', 'Operating manual', 'Franchise agreement'],
      });
    }

    const overallScore = Math.min(100, (risks.length * 15) + 20);

    const analysis: RiskAnalysis = {
      companyId: params.companyId,
      overallScore,
      risks,
      opportunities,
      analyzedAt: new Date().toISOString(),
    };

    riskAnalysis.set(params.companyId, analysis);
    return analysis;
  }

  /**
   * Get risk analysis
   */
  getRiskAnalysis(companyId: string): RiskAnalysis | null {
    return riskAnalysis.get(companyId) || null;
  }

  /**
   * Generate strategic recommendation
   */
  generateRecommendation(params: {
    companyId: string;
    goal: string;
  }): Recommendation {
    // Simplified recommendation generator
    // In production, this would use AI/LLM

    if (params.goal.includes('revenue') || params.goal.includes('grow')) {
      return {
        type: 'growth',
        title: 'Focus on customer retention',
        description: 'Increasing retention by 10% can increase revenue by 25%',
        expectedImpact: '+25% revenue',
        confidence: 80,
        effort: 'medium',
      };
    }

    if (params.goal.includes('cost') || params.goal.includes('reduce')) {
      return {
        type: 'cost',
        title: 'Automate repetitive tasks',
        description: 'AI can handle 70% of routine work',
        expectedImpact: '-30% operational costs',
        confidence: 90,
        effort: 'low',
      };
    }

    return {
      type: 'efficiency',
      title: 'Optimize processes',
      description: 'Streamlining operations can improve efficiency',
      expectedImpact: '+20% productivity',
      confidence: 70,
      effort: 'medium',
    };
  }
}

export const companyIntelligence = new CompanyIntelligence();