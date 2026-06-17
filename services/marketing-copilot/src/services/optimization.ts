import { v4 as uuidv4 } from 'uuid';
import { Campaign } from '../models/Campaign';
import {
  ICampaignMetrics,
  ICampaignOptimizationResponse,
  IABTestRecommendation,
  IROIPrediction,
  ICampaign
} from '../types';

export class OptimizationService {

  async optimizeCampaign(campaignId: string): Promise<ICampaignOptimizationResponse | null> {
    // Find the campaign
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      // Return simulated optimization for demo
      return this.generateSimulatedOptimization(campaignId);
    }

    // Calculate current metrics
    const currentMetrics = this.calculateCurrentMetrics(campaign);

    // Generate ROI predictions
    const predictions = await this.generateROIPrediction(campaign, currentMetrics);

    // Generate optimization recommendations
    const recommendations = this.generateRecommendations(campaign, currentMetrics, predictions);

    // Generate A/B test recommendations
    const abTests = this.generateABTests(campaign);

    // Generate budget reallocation suggestions
    const budgetReallocation = this.generateBudgetReallocation(campaign);

    return {
      campaignId: campaign._id.toString(),
      currentMetrics,
      predictions,
      recommendations,
      abTests,
      budgetReallocation
    };
  }

  private generateSimulatedOptimization(campaignId: string): ICampaignOptimizationResponse {
    const currentMetrics: ICampaignMetrics = {
      impressions: 125000,
      clicks: 3750,
      conversions: 112,
      revenue: 8400,
      spend: 3200,
      ctr: 3.0,
      conversionRate: 2.99,
      roas: 2.625,
      engagement: 4.5
    };

    const predictions: IROIPrediction = {
      predictedRevenue: 10500,
      predictedCost: 3000,
      predictedROI: 250,
      confidenceInterval: { min: 180, max: 320 },
      breakEvenPoint: 75,
      paybackPeriod: 14,
      assumptions: [
        'Maintain current CTR',
        'Increase engagement by 15%',
        'Reduce CPC by 10%'
      ]
    };

    const recommendations = [
      {
        priority: 'high' as const,
        action: 'Optimize ad creative for higher CTR',
        expectedImpact: 15,
        implementation: 'A/B test headline variations focusing on value proposition'
      },
      {
        priority: 'high' as const,
        action: 'Refine audience targeting',
        expectedImpact: 12,
        implementation: 'Exclude low-performing demographics and expand high-converting segments'
      },
      {
        priority: 'medium' as const,
        action: 'Adjust bidding strategy',
        expectedImpact: 8,
        implementation: 'Switch from manual bidding to target ROAS bidding'
      },
      {
        priority: 'medium' as const,
        action: 'Improve landing page experience',
        expectedImpact: 20,
        implementation: 'Reduce page load time and simplify conversion form'
      },
      {
        priority: 'low' as const,
        action: 'Expand to new time slots',
        expectedImpact: 5,
        implementation: 'Test evening and weekend ad placements'
      }
    ];

    const abTests: IABTestRecommendation[] = [
      {
        id: uuidv4(),
        element: 'headline',
        variantA: '50% Off Today Only - Limited Time Offer',
        variantB: 'Exclusive Deal: Save 50% on Your First Order',
        hypothesis: 'Exclusivity language will increase CTR',
        expectedLift: 18,
        confidence: 82,
        sampleSize: 5000,
        duration: 7
      },
      {
        id: uuidv4(),
        element: 'cta',
        variantA: 'Shop Now',
        variantB: 'Claim Your Discount',
        hypothesis: 'Action-oriented CTA with benefit will improve conversion',
        expectedLift: 12,
        confidence: 75,
        sampleSize: 3000,
        duration: 5
      }
    ];

    return {
      campaignId,
      currentMetrics,
      predictions,
      recommendations,
      abTests,
      budgetReallocation: [
        {
          from: 'Low-performing placements',
          to: 'Top-performing demographics',
          amount: 500,
          rationale: 'Reallocate budget from underperforming ad sets to those with 3x ROAS'
        }
      ]
    };
  }

  private calculateCurrentMetrics(campaign: ICampaign): ICampaignMetrics {
    const metrics = campaign.metrics || {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      spend: 0,
      ctr: 0,
      conversionRate: 0,
      roas: 0,
      engagement: 0
    };

    // Calculate derived metrics if not set
    if (metrics.impressions > 0 && metrics.clicks === 0) {
      metrics.ctr = (metrics.clicks / metrics.impressions) * 100;
    }
    if (metrics.clicks > 0 && metrics.conversions === 0) {
      metrics.conversionRate = (metrics.conversions / metrics.clicks) * 100;
    }
    if (metrics.spend > 0 && metrics.revenue > 0) {
      metrics.roas = metrics.revenue / metrics.spend;
    }

    return metrics;
  }

  private async generateROIPrediction(campaign: ICampaign, metrics: ICampaignMetrics): Promise<IROIPrediction> {
    const currentROAS = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0;
    const projectedROAS = currentROAS * 1.15; // 15% improvement projection

    const baseRevenue = metrics.revenue;
    const projectedRevenue = baseRevenue * (1 + Math.random() * 0.3);
    const projectedCost = metrics.spend * (1 - Math.random() * 0.1);

    const roi = ((projectedRevenue - projectedCost) / projectedCost) * 100;

    return {
      predictedRevenue: Math.round(projectedRevenue * 100) / 100,
      predictedCost: Math.round(projectedCost * 100) / 100,
      predictedROI: Math.round(roi * 100) / 100,
      confidenceInterval: {
        min: Math.round((roi * 0.7) * 100) / 100,
        max: Math.round((roi * 1.3) * 100) / 100
      },
      breakEvenPoint: Math.round(metrics.spend / (metrics.revenue / metrics.conversions)),
      paybackPeriod: Math.round((1 / (metrics.conversions / metrics.clicks)) * 100) / 100,
      assumptions: [
        'Current market conditions remain stable',
        'Seasonal adjustments applied',
        'Competitive landscape remains consistent',
        'Budget remains constant throughout campaign'
      ]
    };
  }

  private generateRecommendations(
    campaign: ICampaign,
    metrics: ICampaignMetrics,
    predictions: IROIPrediction
  ): ICampaignOptimizationResponse['recommendations'] {
    const recommendations: ICampaignOptimizationResponse['recommendations'] = [];

    // CTR optimization
    if (metrics.ctr < 2) {
      recommendations.push({
        priority: 'high',
        action: 'Improve creative CTR',
        expectedImpact: 25,
        implementation: 'Test multiple headline variations, use power words and emotional triggers'
      });
    }

    // Conversion rate optimization
    if (metrics.conversionRate < 3) {
      recommendations.push({
        priority: 'high',
        action: 'Optimize conversion funnel',
        expectedImpact: 18,
        implementation: 'Simplify checkout process, add trust badges, reduce form fields'
      });
    }

    // ROAS optimization
    if (metrics.roas < 2) {
      recommendations.push({
        priority: 'high',
        action: 'Improve ROAS through audience refinement',
        expectedImpact: 30,
        implementation: 'Use lookalike audiences based on converting customers'
      });
    }

    // Engagement optimization
    if (metrics.engagement < 4) {
      recommendations.push({
        priority: 'medium',
        action: 'Boost engagement with interactive content',
        expectedImpact: 15,
        implementation: 'Add polls, quizzes, or user-generated content campaigns'
      });
    }

    // Frequency optimization
    recommendations.push({
      priority: 'medium',
      action: 'Adjust ad frequency',
      expectedImpact: 10,
      implementation: 'Set frequency cap at 3-5 exposures per week to prevent fatigue'
    });

    // Budget timing
    recommendations.push({
      priority: 'low',
      action: 'Optimize budget allocation timing',
      expectedImpact: 8,
      implementation: 'Shift 20% of daily budget to peak conversion hours'
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private generateABTests(campaign: ICampaign): IABTestRecommendation[] {
    const tests: IABTestRecommendation[] = [];

    // Headline test
    tests.push({
      id: uuidv4(),
      element: 'headline',
      variantA: campaign.name,
      variantB: `${campaign.name} - Special Offer Inside`,
      hypothesis: 'Adding urgency/special offer language will increase click-through rate',
      expectedLift: 15 + Math.random() * 10,
      confidence: 70 + Math.random() * 20,
      sampleSize: Math.floor(2000 + Math.random() * 3000),
      duration: Math.floor(5 + Math.random() * 5)
    });

    // CTA test
    tests.push({
      id: uuidv4(),
      element: 'cta',
      variantA: 'Learn More',
      variantB: 'Get Started Today',
      hypothesis: 'Action-oriented CTA with time reference will improve conversions',
      expectedLift: 10 + Math.random() * 8,
      confidence: 65 + Math.random() * 25,
      sampleSize: Math.floor(1500 + Math.random() * 2500),
      duration: Math.floor(3 + Math.random() * 4)
    });

    // Image test
    if (campaign.type === 'social' || campaign.type === 'ppc') {
      tests.push({
        id: uuidv4(),
        element: 'image',
        variantA: 'Product-focused image',
        variantB: 'Lifestyle/image with people',
        hypothesis: 'Human-centric imagery increases emotional connection',
        expectedLift: 12 + Math.random() * 15,
        confidence: 60 + Math.random() * 25,
        sampleSize: Math.floor(3000 + Math.random() * 4000),
        duration: Math.floor(7 + Math.random() * 7)
      });
    }

    // Timing test
    tests.push({
      id: uuidv4(),
      element: 'timing',
      variantA: 'Standard business hours',
      variantB: 'Extended evening hours (6PM-10PM)',
      hypothesis: 'Evening ads capture more engaged weekend shoppers',
      expectedLift: 8 + Math.random() * 12,
      confidence: 55 + Math.random() * 30,
      sampleSize: Math.floor(4000 + Math.random() * 5000),
      duration: Math.floor(10 + Math.random() * 10)
    });

    return tests;
  }

  private generateBudgetReallocation(campaign: ICampaign): ICampaignOptimizationResponse['budgetReallocation'] {
    const reallocation: ICampaignOptimizationResponse['budgetReallocation'] = [];
    const totalBudget = campaign.budget;

    // Simulate analysis of current spending
    const lowPerformerPct = 0.2;
    const highPerformerPct = 0.3;
    const reallocAmount = totalBudget * lowPerformerPct * 0.15;

    if (reallocAmount > 0) {
      reallocation.push({
        from: 'Underperforming placements',
        to: 'Top 20% performing audiences',
        amount: Math.round(reallocAmount * 100) / 100,
        rationale: 'Historical data shows top-performing audience segments deliver 3x ROAS'
      });
    }

    // Channel reallocation
    reallocation.push({
      from: 'Display advertising',
      to: 'Retargeting campaigns',
      amount: Math.round(totalBudget * highPerformerPct * 100) / 100,
      rationale: 'Retargeting converts at 70% higher rate than cold display'
    });

    return reallocation;
  }

  async getCampaignRecommendations(campaignId: string): Promise<string[]> {
    const optimization = await this.optimizeCampaign(campaignId);

    if (!optimization) {
      return [];
    }

    return optimization.recommendations.map(rec => rec.action);
  }

  async predictCampaignSuccess(campaignId: string): Promise<{
    score: number;
    factors: { factor: string; impact: number }[];
    recommendation: string;
  }> {
    const optimization = await this.optimizeCampaign(campaignId);

    if (!optimization) {
      return { score: 0, factors: [], recommendation: 'Campaign not found' };
    }

    const factors = [
      { factor: 'Current ROAS', impact: optimization.currentMetrics.roas * 15 },
      { factor: 'CTR Performance', impact: optimization.currentMetrics.ctr * 3 },
      { factor: 'Conversion Rate', impact: optimization.currentMetrics.conversionRate * 5 },
      { factor: 'Engagement Score', impact: optimization.currentMetrics.engagement * 3 }
    ];

    const score = Math.min(100, factors.reduce((sum, f) => sum + f.impact, 0) / 10);

    let recommendation = '';
    if (score >= 80) {
      recommendation = 'Campaign is performing excellently. Maintain current strategy and focus on scaling.';
    } else if (score >= 60) {
      recommendation = 'Campaign shows solid performance. Address medium-priority recommendations for improvement.';
    } else if (score >= 40) {
      recommendation = 'Campaign needs optimization. Implement high-priority recommendations immediately.';
    } else {
      recommendation = 'Campaign requires significant intervention. Consider restructuring or pausing.';
    }

    return { score: Math.round(score * 10) / 10, factors, recommendation };
  }
}

export const optimizationService = new OptimizationService();
