/**
 * Pipeline Dashboard - Sales pipeline visualization
 */

export interface PipelineStats {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  conversionRate: number;
  avgDealSize: number;
  avgCycleTime: number;
  stageDistribution: StageData[];
  recentActivity: ActivityItem[];
  topPerformers: Performer[];
  atRiskDeals: Deal[];
}

export interface StageData {
  stage: string;
  count: number;
  value: number;
  probability: number;
  color: string;
}

export interface ActivityItem {
  id: string;
  type: 'deal_created' | 'deal_won' | 'deal_lost' | 'note' | 'call' | 'email';
  description: string;
  timestamp: Date;
  userId: string;
  userName: string;
}

export interface Performer {
  userId: string;
  userName: string;
  dealsWon: number;
  revenue: number;
  conversionRate: number;
}

export interface Deal {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: string;
  owner: string;
  daysInStage: number;
  probability: number;
  risk: 'low' | 'medium' | 'high';
}

export class PipelineDashboard {
  /**
   * Get dashboard stats
   */
  getStats(deals: Deal[], activities: ActivityItem[]): PipelineStats {
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = deals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
    const conversionRate = this.calculateConversionRate(deals);
    const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;
    const avgCycleTime = this.calculateAvgCycleTime(deals);

    const stageDistribution = this.getStageDistribution(deals);
    const recentActivity = activities.slice(0, 10);
    const topPerformers = this.getTopPerformers(deals);
    const atRiskDeals = deals.filter(d => d.risk === 'high').slice(0, 5);

    return {
      totalDeals,
      totalValue,
      weightedValue,
      conversionRate,
      avgDealSize,
      avgCycleTime,
      stageDistribution,
      recentActivity,
      topPerformers,
      atRiskDeals,
    };
  }

  /**
   * Generate chart data for pipeline
   */
  getPipelineChartData(deals: Deal[]): {
    funnelData: { stage: string; count: number; value: number }[];
    trendData: { date: string; value: number }[];
    revenueByDay: { day: string; actual: number; target: number }[];
  } {
    const funnelData = this.getFunnelData(deals);
    const trendData = this.getTrendData();
    const revenueByDay = this.getRevenueByDay();

    return { funnelData, trendData, revenueByDay };
  }

  /**
   * Get leaderboard data
   */
  getLeaderboard(deals: Deal[]): Performer[] {
    return this.getTopPerformers(deals);
  }

  private calculateConversionRate(deals: Deal[]): number {
    const closed = deals.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost').length;
    const won = deals.filter(d => d.stage === 'closed_won').length;
    return closed > 0 ? Math.round((won / closed) * 100) : 0;
  }

  private calculateAvgCycleTime(deals: Deal[]): number {
    const activeDeals = deals.filter(d => !d.stage.startsWith('closed'));
    if (activeDeals.length === 0) return 0;
    const totalDays = activeDeals.reduce((sum, d) => sum + d.daysInStage, 0);
    return Math.round(totalDays / activeDeals.length);
  }

  private getStageDistribution(deals: Deal[]): StageData[] {
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won'];
    const colors = ['#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

    return stages.map((stage, i) => {
      const stageDeals = deals.filter(d => d.stage === stage);
      return {
        stage,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + d.value, 0),
        probability: [10, 20, 40, 60, 80, 100][i],
        color: colors[i],
      };
    });
  }

  private getFunnelData(deals: Deal[]): { stage: string; count: number; value: number }[] {
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won'];
    return stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage === stage);
      return {
        stage,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + d.value, 0),
      };
    });
  }

  private getTrendData(): { date: string; value: number }[] {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push({
        date: date.toISOString().split('T')[0],
        value: 0, // Will be populated from real data
      });
    }
    return dates;
  }

  private getRevenueByDay(): { day: string; actual: number; target: number }[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days.map(day => ({
      day,
      actual: 0, // Will be populated from real data
      target: 0, // Will be populated from real data
    }));
  }

  private getTopPerformers(deals: Deal[]): Performer[] {
    // Mock data - in real implementation, aggregate from deals
    return [
      { userId: '1', userName: 'Alice Johnson', dealsWon: 12, revenue: 245000, conversionRate: 68 },
      { userId: '2', userName: 'Bob Smith', dealsWon: 10, revenue: 198000, conversionRate: 62 },
      { userId: '3', userName: 'Carol Davis', dealsWon: 8, revenue: 156000, conversionRate: 58 },
    ];
  }
}