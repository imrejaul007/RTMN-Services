import { Campaign } from '../models/Campaign';
import { DailyMetrics, MetricsSummary } from '../models/Metric';

export interface CampaignAnalytics {
  campaignId: string;
  name: string;
  period: {
    start: Date;
    end: Date;
    days: number;
    remaining: number;
  };
  financial: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    budgetUtilization: number;
  };
  performance: {
    impressions: number;
    clicks: number;
    leads: number;
    conversions: number;
    revenue: number;
  };
  rates: {
    ctr: number;
    conversionRate: number;
    cpc: number;
    cpa: number;
    roas: number;
    ltvContribution: number;
  };
  roi: {
    value: number;
    cost: number;
    revenue: number;
    profit: number;
  };
  efficiency: {
    impressionsPerDay: number;
    clicksPerDay: number;
    costPerDay: number;
    revenuePerDay: number;
  };
  channels: Array<{
    channel: string;
    budget: number;
    spent: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    allocation: number;
  }>;
  trends: {
    impressionsTrend: 'up' | 'down' | 'stable';
    clicksTrend: 'up' | 'down' | 'stable';
    revenueTrend: 'up' | 'down' | 'stable';
  };
  benchmark: {
    industryAvgCtr: number;
    industryAvgRoas: number;
    performanceVsIndustry: number;
  };
}

export class CampaignAnalyticsService {
  // Get comprehensive analytics for a campaign
  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
    const campaign = await Campaign.findOne({ campaignId }).lean();

    if (!campaign) {
      return null;
    }

    const analytics = await this.calculateAnalytics(campaign);
    return analytics;
  }

  // Calculate analytics from campaign data
  private async calculateAnalytics(campaign: any): Promise<CampaignAnalytics> {
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const totalBudget = campaign.channels.reduce((sum: number, ch: any) => sum + ch.budget, 0);
    const totalSpent = campaign.channels.reduce((sum: number, ch: any) => sum + ch.spent, 0);

    const metrics = campaign.metrics;
    const roi = campaign.roi;

    // Calculate rates
    const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    const conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
    const cpc = metrics.clicks > 0 ? totalSpent / metrics.clicks : 0;
    const cpa = metrics.conversions > 0 ? totalSpent / metrics.conversions : 0;
    const roas = totalSpent > 0 ? metrics.revenue / totalSpent : 0;

    // Channel breakdown
    const channelAnalytics = campaign.channels.map((ch: any) => {
      const chImpressions = 0; // Would come from channel-specific metrics
      const chClicks = 0;
      return {
        channel: ch.channel,
        budget: ch.budget,
        spent: ch.spent,
        impressions: chImpressions,
        clicks: chClicks,
        ctr: chImpressions > 0 ? (chClicks / chImpressions) * 100 : 0,
        cpc: chClicks > 0 ? ch.spent / chClicks : 0,
        allocation: totalBudget > 0 ? (ch.budget / totalBudget) * 100 : 0
      };
    });

    // Get trend data
    const trends = await this.calculateTrends(campaign.campaignId);

    return {
      campaignId: campaign.campaignId,
      name: campaign.name,
      period: {
        start: startDate,
        end: endDate,
        days: totalDays,
        remaining: remainingDays
      },
      financial: {
        totalBudget,
        totalSpent,
        remaining: totalBudget - totalSpent,
        budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
      },
      performance: {
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        leads: metrics.leads,
        conversions: metrics.conversions,
        revenue: metrics.revenue
      },
      rates: {
        ctr,
        conversionRate,
        cpc,
        cpa,
        roas,
        ltvContribution: metrics.conversions > 0 ? metrics.revenue / metrics.conversions : 0
      },
      roi: {
        value: roi.value,
        cost: totalSpent,
        revenue: metrics.revenue,
        profit: metrics.revenue - totalSpent
      },
      efficiency: {
        impressionsPerDay: elapsedDays > 0 ? metrics.impressions / elapsedDays : 0,
        clicksPerDay: elapsedDays > 0 ? metrics.clicks / elapsedDays : 0,
        costPerDay: elapsedDays > 0 ? totalSpent / elapsedDays : 0,
        revenuePerDay: elapsedDays > 0 ? metrics.revenue / elapsedDays : 0
      },
      channels: channelAnalytics,
      trends,
      benchmark: {
        industryAvgCtr: 2.5, // Example benchmark
        industryAvgRoas: 4.0,
        performanceVsIndustry: ((roas - 4.0) / 4.0) * 100
      }
    };
  }

  // Calculate trends by comparing recent vs earlier periods
  private async calculateTrends(campaignId: string): Promise<{
    impressionsTrend: 'up' | 'down' | 'stable';
    clicksTrend: 'up' | 'down' | 'stable';
    revenueTrend: 'up' | 'down' | 'stable';
  }> {
    const halfPoint = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const metrics = await DailyMetrics.find({
      campaignId,
      date: { $lte: new Date() }
    }).sort({ date: 1 }).lean();

    if (metrics.length < 2) {
      return {
        impressionsTrend: 'stable',
        clicksTrend: 'stable',
        revenueTrend: 'stable'
      };
    }

    const midIndex = Math.floor(metrics.length / 2);
    const recent = metrics.slice(midIndex);
    const earlier = metrics.slice(0, midIndex);

    const sumRecent = recent.reduce((acc, m) => ({
      impressions: acc.impressions + m.metrics.impressions,
      clicks: acc.clicks + m.metrics.clicks,
      revenue: acc.revenue + m.metrics.revenue
    }), { impressions: 0, clicks: 0, revenue: 0 });

    const sumEarlier = earlier.reduce((acc, m) => ({
      impressions: acc.impressions + m.metrics.impressions,
      clicks: acc.clicks + m.metrics.clicks,
      revenue: acc.revenue + m.metrics.revenue
    }), { impressions: 0, clicks: 0, revenue: 0 });

    const threshold = 5; // 5% threshold for trend detection

    return {
      impressionsTrend: this.getTrend(sumRecent.impressions, sumEarlier.impressions, threshold),
      clicksTrend: this.getTrend(sumRecent.clicks, sumEarlier.clicks, threshold),
      revenueTrend: this.getTrend(sumRecent.revenue, sumEarlier.revenue, threshold)
    };
  }

  private getTrend(current: number, previous: number, threshold: number): 'up' | 'down' | 'stable' {
    if (previous === 0) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (change > threshold) return 'up';
    if (change < -threshold) return 'down';
    return 'stable';
  }

  // Get comparative analytics across multiple campaigns
  async compareCampaigns(campaignIds: string[]): Promise<{
    campaigns: CampaignAnalytics[];
    comparison: {
      bestRoi: string;
      bestRoas: string;
      highestConversion: string;
      mostEfficient: string;
    };
    averages: {
      avgCtr: number;
      avgConversionRate: number;
      avgRoas: number;
      avgCpa: number;
    };
  }> {
    const analytics = [];

    for (const campaignId of campaignIds) {
      const campaignAnal = await this.getCampaignAnalytics(campaignId);
      if (campaignAnal) {
        analytics.push(campaignAnal);
      }
    }

    if (analytics.length === 0) {
      return {
        campaigns: [],
        comparison: {
          bestRoi: '',
          bestRoas: '',
          highestConversion: '',
          mostEfficient: ''
        },
        averages: {
          avgCtr: 0,
          avgConversionRate: 0,
          avgRoas: 0,
          avgCpa: 0
        }
      };
    }

    const comparison = {
      bestRoi: analytics.reduce((best, curr) =>
        curr.roi.value > best.roi.value ? curr : best, analytics[0]
      ).campaignId,
      bestRoas: analytics.reduce((best, curr) =>
        curr.rates.roas > best.rates.roas ? curr : best, analytics[0]
      ).campaignId,
      highestConversion: analytics.reduce((best, curr) =>
        curr.performance.conversions > best.performance.conversions ? curr : best, analytics[0]
      ).campaignId,
      mostEfficient: analytics.reduce((best, curr) =>
        curr.rates.cpa < best.rates.cpa ? curr : best, analytics[0]
      ).campaignId
    };

    const totals = analytics.reduce((acc, a) => ({
      ctr: acc.ctr + a.rates.ctr,
      conversionRate: acc.conversionRate + a.rates.conversionRate,
      roas: acc.roas + a.rates.roas,
      cpa: acc.cpa + a.rates.cpa
    }), { ctr: 0, conversionRate: 0, roas: 0, cpa: 0 });

    const count = analytics.length;

    return {
      campaigns: analytics,
      comparison,
      averages: {
        avgCtr: totals.ctr / count,
        avgConversionRate: totals.conversionRate / count,
        avgRoas: totals.roas / count,
        avgCpa: totals.cpa / count
      }
    };
  }

  // Generate ROI forecast based on current performance
  async forecastROI(campaignId: string): Promise<{
    projectedRevenue: number;
    projectedRoas: number;
    confidence: number;
    scenarios: {
      pessimistic: { revenue: number; roas: number };
      realistic: { revenue: number; roas: number };
      optimistic: { revenue: number; roas: number };
    };
  }> {
    const campaign = await Campaign.findOne({ campaignId }).lean();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const metrics = campaign.metrics;
    const totalSpent = campaign.channels.reduce((sum: number, ch: any) => sum + ch.spent, 0);
    const totalBudget = campaign.channels.reduce((sum: number, ch: any) => sum + ch.budget, 0);

    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);

    const elapsedDays = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate daily rates
    const dailyRevenue = elapsedDays > 0 ? metrics.revenue / elapsedDays : 0;
    const dailySpend = elapsedDays > 0 ? totalSpent / elapsedDays : 0;
    const remainingSpend = Math.min(dailySpend * remainingDays, totalBudget - totalSpent);

    // Project based on current trends
    const projectedRevenue = metrics.revenue + (dailyRevenue * remainingDays);
    const projectedRoas = remainingSpend > 0 ? projectedRevenue / (totalSpent + remainingSpend) : 0;

    // Confidence based on data quality
    const confidence = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

    return {
      projectedRevenue,
      projectedRoas,
      confidence,
      scenarios: {
        pessimistic: {
          revenue: metrics.revenue + (dailyRevenue * remainingDays * 0.7),
          roas: projectedRoas * 0.7
        },
        realistic: {
          revenue: projectedRevenue,
          roas: projectedRoas
        },
        optimistic: {
          revenue: metrics.revenue + (dailyRevenue * remainingDays * 1.3),
          roas: projectedRoas * 1.3
        }
      }
    };
  }
}

export const campaignAnalyticsService = new CampaignAnalyticsService();
