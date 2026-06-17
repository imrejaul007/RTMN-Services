import { v4 as uuidv4 } from 'uuid';
import { IAudienceSegment, ISegmentAnalysisResponse, IMarketingInsight } from '../types';

interface SegmentationCriteria {
  demographics?: {
    ageRange?: { min: number; max: number };
    location?: string[];
    income?: { min: number; max: number };
  };
  behaviors?: {
    purchaseFrequency?: 'frequent' | 'regular' | 'occasional' | 'rare';
    engagementLevel?: 'high' | 'medium' | 'low';
    channelPreference?: string[];
  };
  psychographics?: {
    interests?: string[];
    values?: string[];
    lifestyle?: string[];
  };
}

export class SegmentationService {

  async analyzeAudience(data: SegmentationCriteria): Promise<ISegmentAnalysisResponse> {
    // Generate segments based on criteria
    const segments = await this.generateSegments(data);

    // Calculate total addressable market
    const totalAddressableMarket = segments.reduce((sum, seg) => sum + seg.size, 0);

    // Calculate segment distribution
    const segmentDistribution = segments.map(seg => ({
      segmentId: seg.id,
      percentage: totalAddressableMarket > 0 ? (seg.size / totalAddressableMarket) * 100 : 0
    }));

    // Generate insights for each segment
    const insights = await this.generateSegmentInsights(segments);

    return {
      segments,
      totalAddressableMarket,
      segmentDistribution,
      insights
    };
  }

  async getSegments(): Promise<IAudienceSegment[]> {
    // Return default segments for demo
    return this.generateDefaultSegments();
  }

  private async generateSegments(criteria: SegmentationCriteria): Promise<IAudienceSegment[]> {
    const segments: IAudienceSegment[] = [];

    // High-Value Customers
    segments.push({
      id: uuidv4(),
      name: 'High-Value Loyalists',
      description: 'Customers with high lifetime value who purchase frequently and engage regularly',
      size: Math.floor(Math.random() * 5000) + 3000,
      characteristics: [
        'Multiple purchase history',
        'High average order value',
        'Engages with loyalty programs',
        'Low churn probability',
        'Brand advocates'
      ],
      engagementScore: 85 + Math.random() * 15,
      conversionRate: 12 + Math.random() * 8,
      preferredChannels: ['email', 'direct_mail', 'mobile_app'],
      preferredContentTypes: ['exclusive_offers', 'new_products', 'VIP_content'],
      avgOrderValue: 250 + Math.random() * 150,
      churnRisk: 'low'
    });

    // Engaged Prospects
    segments.push({
      id: uuidv4(),
      name: 'Engaged Prospects',
      description: 'Active website visitors who have shown interest but haven\'t converted',
      size: Math.floor(Math.random() * 15000) + 10000,
      characteristics: [
        'Multiple website visits',
        'Product page views',
        'Abandoned cart behavior',
        'Email engagement',
        'Social media following'
      ],
      engagementScore: 60 + Math.random() * 25,
      conversionRate: 5 + Math.random() * 5,
      preferredChannels: ['social_media', 'email', 'display_ads'],
      preferredContentTypes: ['educational', 'product_highlights', 'case_studies'],
      avgOrderValue: 100 + Math.random() * 100,
      churnRisk: 'medium'
    });

    // New Customers
    segments.push({
      id: uuidv4(),
      name: 'New Customer Acquisition',
      description: 'Recent first-time buyers who are in the onboarding phase',
      size: Math.floor(Math.random() * 8000) + 5000,
      characteristics: [
        'First purchase in last 90 days',
        'Single transaction history',
        'Email subscriber',
        'Social media engagement',
        'Referral potential'
      ],
      engagementScore: 70 + Math.random() * 20,
      conversionRate: 8 + Math.random() * 6,
      preferredChannels: ['email', 'mobile_app', 'social_media'],
      preferredContentTypes: ['onboarding', 'tutorials', 'cross_sell'],
      avgOrderValue: 75 + Math.random() * 75,
      churnRisk: 'medium'
    });

    // At-Risk Customers
    segments.push({
      id: uuidv4(),
      name: 'At-Risk Customers',
      description: 'Previously engaged customers showing signs of disengagement',
      size: Math.floor(Math.random() * 3000) + 1500,
      characteristics: [
        'Declining purchase frequency',
        'Reduced email engagement',
        'No recent activity',
        'Past high-value purchases',
        'Support tickets or complaints'
      ],
      engagementScore: 25 + Math.random() * 20,
      conversionRate: 2 + Math.random() * 3,
      preferredChannels: ['email', 'retargeting_ads'],
      preferredContentTypes: ['win_back', 'special_offers', 'surveys'],
      avgOrderValue: 150 + Math.random() * 100,
      churnRisk: 'high'
    });

    // Price Sensitive
    segments.push({
      id: uuidv4(),
      name: 'Price-Sensitive Shoppers',
      description: 'Customers primarily motivated by discounts and promotions',
      size: Math.floor(Math.random() * 12000) + 8000,
      characteristics: [
        'High promotion redemption rate',
        'Coupon code usage',
        'Price comparison behavior',
        'Seasonal purchase patterns',
        'Low brand loyalty'
      ],
      engagementScore: 55 + Math.random() * 20,
      conversionRate: 6 + Math.random() * 4,
      preferredChannels: ['email', 'deal_sites', 'social_media'],
      preferredContentTypes: ['discounts', 'clearance', 'bundle_offers'],
      avgOrderValue: 60 + Math.random() * 40,
      churnRisk: 'medium'
    });

    // Dormant/Inactive
    segments.push({
      id: uuidv4(),
      name: 'Dormant/Inactive',
      description: 'Customers with no activity in the past 6+ months',
      size: Math.floor(Math.random() * 20000) + 10000,
      characteristics: [
        'No recent purchases',
        'Email unsubscribes possible',
        'No website activity',
        'Past low-to-medium value',
        'Reactivation potential low'
      ],
      engagementScore: 5 + Math.random() * 10,
      conversionRate: 0.5 + Math.random() * 1.5,
      preferredChannels: ['email', 'direct_mail'],
      preferredContentTypes: ['reactivation', 'surveys', 'unsubscribe_appeal'],
      avgOrderValue: 50 + Math.random() * 50,
      churnRisk: 'high'
    });

    // Apply criteria filters if provided
    return this.filterSegments(segments, criteria);
  }

  private filterSegments(segments: IAudienceSegment[], criteria: SegmentationCriteria): IAudienceSegment[] {
    let filtered = [...segments];

    if (criteria.demographics?.ageRange) {
      // Simulate age-based filtering
      filtered = filtered.slice(0, Math.ceil(filtered.length * 0.8));
    }

    if (criteria.demographics?.location) {
      // Filter by location
      filtered = filtered.map(seg => ({
        ...seg,
        size: Math.floor(seg.size * 0.3) // Reduce for specific locations
      }));
    }

    return filtered;
  }

  private generateDefaultSegments(): IAudienceSegment[] {
    return [
      {
        id: 'seg-001',
        name: 'Millennial Professionals',
        description: 'Tech-savvy professionals aged 25-40 with high digital engagement',
        size: 15000,
        characteristics: ['Mobile-first', 'Social media active', 'Value convenience'],
        engagementScore: 78,
        conversionRate: 8.5,
        preferredChannels: ['instagram', 'linkedin', 'mobile_app'],
        preferredContentTypes: ['stories', 'short_video', 'infographics']
      },
      {
        id: 'seg-002',
        name: 'Gen Z Early Adopters',
        description: 'Trend-conscious youth aged 18-24 seeking authenticity',
        size: 12000,
        characteristics: ['Influencer-driven', 'Authenticity-focused', 'Video content lovers'],
        engagementScore: 82,
        conversionRate: 4.2,
        preferredChannels: ['tiktok', 'instagram', 'snapchat'],
        preferredContentTypes: ['short_video', 'memes', 'UGC']
      },
      {
        id: 'seg-003',
        name: 'Busy Parents',
        description: 'Parents with limited time seeking efficiency and value',
        size: 18000,
        characteristics: ['Time-poor', 'Value-conscious', 'Quality-focused'],
        engagementScore: 65,
        conversionRate: 9.8,
        preferredChannels: ['facebook', 'email', 'pinterest'],
        preferredContentTypes: ['time_savers', 'family_tips', 'productivity']
      },
      {
        id: 'seg-004',
        name: 'Senior Professionals',
        description: 'Established professionals aged 45-60 valuing quality and service',
        size: 8000,
        characteristics: ['Quality over price', 'Premium expectations', 'Email preference'],
        engagementScore: 72,
        conversionRate: 11.2,
        preferredChannels: ['email', 'facebook', 'linkedin'],
        preferredContentTypes: ['expert_content', 'white_papers', 'webinars']
      }
    ];
  }

  private async generateSegmentInsights(segments: IAudienceSegment[]): Promise<IMarketingInsight[]> {
    const insights: IMarketingInsight[] = [];

    // High-value segment insight
    const highValueSegment = segments.find(s => s.engagementScore > 80);
    if (highValueSegment) {
      insights.push({
        type: 'opportunity',
        category: 'audience',
        title: `Priority Focus: ${highValueSegment.name}`,
        description: `This segment shows the highest engagement (${highValueSegment.engagementScore.toFixed(1)}%) and should be prioritized for retention efforts.`,
        impact: 'high',
        confidence: 85,
        evidence: [
          `Engagement score: ${highValueSegment.engagementScore.toFixed(1)}%`,
          `Conversion rate: ${highValueSegment.conversionRate.toFixed(1)}%`,
          `Segment size: ${highValueSegment.size.toLocaleString()}`
        ],
        recommendations: [
          'Implement VIP loyalty program',
          'Create exclusive early access content',
          'Develop referral incentives',
          'Personalize communication based on preferences'
        ],
        actionable: true,
        timestamp: new Date()
      });
    }

    // Churn risk insight
    const atRiskSegments = segments.filter(s => s.churnRisk === 'high');
    if (atRiskSegments.length > 0) {
      insights.push({
        type: 'threat',
        category: 'audience',
        title: 'Churn Risk Alert',
        description: `${atRiskSegments.length} segment(s) identified with high churn risk requiring immediate attention.`,
        impact: 'high',
        confidence: 78,
        evidence: atRiskSegments.map(s => `${s.name}: ${s.engagementScore.toFixed(1)}% engagement, ${s.size.toLocaleString()} users`),
        recommendations: [
          'Launch win-back campaigns',
          'Send satisfaction surveys',
          'Offer exclusive re-engagement incentives',
          'Review last interaction touchpoints'
        ],
        actionable: true,
        timestamp: new Date()
      });
    }

    // Cross-channel opportunity
    const channels = segments.flatMap(s => s.preferredChannels);
    const channelCounts = channels.reduce((acc, ch) => {
      acc[ch] = (acc[ch] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topChannels = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topChannels.length > 0) {
      insights.push({
        type: 'trend',
        category: 'channel',
        title: 'Cross-Channel Optimization Opportunity',
        description: `Analysis shows strong potential for cross-channel campaigns targeting multiple segments.`,
        impact: 'medium',
        confidence: 72,
        evidence: topChannels.map(([ch, count]) => `${ch} (${count} segments)`),
        recommendations: [
          'Develop omnichannel campaign strategy',
          'Create channel-specific content variations',
          'Implement cross-segment retargeting',
          'Build unified customer journey maps'
        ],
        actionable: true,
        timestamp: new Date()
      });
    }

    return insights;
  }

  async getSegmentById(segmentId: string): Promise<IAudienceSegment | null> {
    const segments = this.generateDefaultSegments();
    return segments.find(s => s.id === segmentId) || null;
  }

  async predictSegmentGrowth(segmentId: string, months: number = 6): Promise<{
    current: number;
    predicted: number;
    growthRate: number;
    confidence: number;
  }> {
    const segments = this.generateDefaultSegments();
    const segment = segments.find(s => s.id === segmentId);

    if (!segment) {
      return { current: 0, predicted: 0, growthRate: 0, confidence: 0 };
    }

    const monthlyGrowth = (Math.random() * 10 + 2) / 100; // 2-12% monthly growth
    const predicted = Math.round(segment.size * Math.pow(1 + monthlyGrowth, months));
    const growthRate = ((predicted - segment.size) / segment.size) * 100;

    return {
      current: segment.size,
      predicted,
      growthRate: Math.round(growthRate * 10) / 10,
      confidence: 75 + Math.random() * 15
    };
  }
}

export const segmentationService = new SegmentationService();
