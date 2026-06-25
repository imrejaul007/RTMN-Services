/**
 * CEO Agent — Strategic leadership for a Nexha company.
 *
 * Responsibilities:
 * - Goal setting and tracking
 * - KPI monitoring
 * - Performance reviews
 * - Strategic recommendations
 * - Market intelligence integration
 *
 * ADR-??? Phase 3 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';

export class CEOAgent {
  constructor(tenantId) {
    this.agentId = 'ceo';
    this.tenantId = tenantId;
    this.role = 'CEO';
    this.name = 'Nexha CEO Agent';
    this.capabilities = [
      'goal_setting',
      'performance_review',
      'strategy',
      'kpi_monitoring',
      'market_intelligence',
      'resource_allocation',
    ];
    this.goals = [];
    this.activityLog = [];
  }

  async act(context) {
    const { action } = context;
    switch (action) {
      case 'review_performance':
        return this.reviewPerformance(context);
      case 'set_goals':
        return this.setGoals(context);
      case 'get_kpis':
        return this.getKPIs(context);
      case 'recommend':
        return this.recommend(context);
      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  async getKPIs(context = {}) {
    // Simulate KPI data — in production, fetches from various OS
    const kpis = {
      revenue: { current: 1250000, target: 1500000, trend: '+8%' },
      customers: { current: 342, target: 400, trend: '+12%' },
      orders: { current: 1847, target: 2000, trend: '+5%' },
      avgOrderValue: { current: 677, target: 750, trend: '+3%' },
      fulfillmentRate: { current: 0.94, target: 0.98, trend: '-1%' },
      supplierCount: { current: 89, target: 100, trend: '+7%' },
    };

    this.log('get_kpis', { kpis });
    return { agent: this.role, kpis, timestamp: new Date().toISOString() };
  }

  async setGoals(context) {
    const { goals } = context;
    if (!goals || !Array.isArray(goals)) {
      return { error: 'goals array required' };
    }

    const newGoals = goals.map(g => ({
      goalId: uuidv4(),
      description: g.description,
      target: g.target,
      deadline: g.deadline,
      status: 'active',
      progress: 0,
      createdAt: new Date().toISOString(),
    }));

    this.goals.push(...newGoals);
    this.log('set_goals', { count: newGoals.length });
    return { agent: this.role, goals: newGoals, totalGoals: this.goals.length };
  }

  async reviewPerformance(context) {
    const { period = 'monthly', department } = context;
    const kpis = await this.getKPIs({});

    const issues = [];
    const opportunities = [];

    // Analyze KPI gaps
    for (const [key, data] of Object.entries(kpis)) {
      const pct = data.current / data.target;
      if (pct < 0.8) {
        issues.push({
          metric: key,
          current: data.current,
          target: data.target,
          gap: data.target - data.current,
          severity: pct < 0.5 ? 'critical' : 'warning',
        });
      } else if (pct >= 1.0) {
        opportunities.push({
          metric: key,
          current: data.current,
          aboveTarget: data.current - data.target,
          note: 'Exceeding target — consider scaling',
        });
      }
    }

    const recommendations = this.generateRecommendations(issues, opportunities);
    this.log('review_performance', { period, issues: issues.length, opportunities: opportunities.length });

    return {
      agent: this.role,
      period,
      department: department || 'all',
      kpis,
      issues,
      opportunities,
      recommendations,
      score: this.calculateScore(kpis),
    };
  }

  generateRecommendations(issues, opportunities) {
    const recommendations = [];

    for (const issue of issues) {
      switch (issue.metric) {
        case 'fulfillmentRate':
          recommendations.push({
            priority: 'high',
            action: 'Investigate supply chain delays',
            metric: issue.metric,
            expectedImpact: '+4% fulfillment rate',
          });
          break;
        case 'revenue':
          recommendations.push({
            priority: 'high',
            action: 'Launch retention campaign for high-value customers',
            metric: issue.metric,
            expectedImpact: '+15% revenue',
          });
          break;
        case 'customers':
          recommendations.push({
            priority: 'medium',
            action: 'Expand to adjacent customer segments',
            metric: issue.metric,
            expectedImpact: '+20 new customers/month',
          });
          break;
      }
    }

    for (const opp of opportunities) {
      recommendations.push({
        priority: 'low',
        action: `Scale ${opp.metric} operations`,
        metric: opp.metric,
        expectedImpact: `+${Math.round(opp.aboveTarget * 0.5)} ${opp.metric}`,
      });
    }

    return recommendations.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    });
  }

  calculateScore(kpis) {
    let total = 0;
    let count = 0;
    for (const [, data] of Object.entries(kpis)) {
      const pct = Math.min(1, data.current / data.target);
      total += pct;
      count++;
    }
    return Math.round((total / count) * 100);
  }

  async recommend(context) {
    const { type = 'strategy' } = context;
    const kpis = await this.getKPIs({});
    const score = this.calculateScore(kpis);

    let recommendation = {};
    if (score >= 80) {
      recommendation = {
        phase: 'growth',
        headline: 'Company performing well — focus on scaling',
        actions: [
          'Expand to new markets',
          'Increase marketing spend by 20%',
          'Hire 2 more sales representatives',
          'Automate fulfillment pipeline',
        ],
      };
    } else if (score >= 50) {
      recommendation = {
        phase: 'stabilize',
        headline: 'Company needs attention — prioritize fixes',
        actions: [
          'Address lowest-performing KPIs first',
          'Weekly CEO reviews until score > 70',
          'Hire consultant for process optimization',
          'Reduce non-essential spending',
        ],
      };
    } else {
      recommendation = {
        phase: 'crisis',
        headline: 'Company in critical state — immediate action required',
        actions: [
          'Emergency leadership meeting',
          'Cut costs by 30% immediately',
          'Focus on core product/market',
          'Consider strategic partnership',
        ],
      };
    }

    this.log('recommend', { type, score });
    return { agent: this.role, score, ...recommendation };
  }

  log(action, data) {
    this.activityLog.unshift({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action,
      data,
    });
    if (this.activityLog.length > 100) this.activityLog.pop();
  }

  getHistory(limit = 20) {
    return this.activityLog.slice(0, limit);
  }

  getProfile() {
    return {
      agentId: this.agentId,
      role: this.role,
      name: this.name,
      capabilities: this.capabilities,
      goalsCount: this.goals.length,
      activeGoals: this.goals.filter(g => g.status === 'active').length,
    };
  }
}
