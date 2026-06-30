/**
 * Competitor Researcher Agent
 *
 * Monitors competitors for product launches, pricing changes, and marketing activity
 * Uses: Google Maps + Zomato + Amazon + News + skills
 */

import { ResearchAgent, ResearchAgentConfig, ResearchReport } from '../base/research-agent.js';

export interface CompetitorResearchInput {
  competitor: string;
  city?: string;
  includeProducts?: boolean;
  includeReviews?: boolean;
  includeNews?: boolean;
  includeSocial?: boolean;
}

export class CompetitorResearcher extends ResearchAgent {
  constructor(config?: Partial<ResearchAgentConfig>) {
    const defaultConfig: ResearchAgentConfig = {
      name: 'Competitor Researcher',
      type: 'competitor',
      skills: ['competitor-intel'],
      actors: ['google-maps', 'amazon', 'shopify', 'news', 'twitter'],
      schedule: { frequency: 'hourly' },
      deliveryChannels: ['memory-os', 'webhook'],
      memoryPartition: 'competitor-research',
    };
    super({ ...defaultConfig, ...config } as ResearchAgentConfig);
  }

  async generateReport(input: CompetitorResearchInput): Promise<ResearchReport> {
    const reportId = `competitor-${Date.now()}`;
    const generatedAt = new Date().toISOString();

    const data: any = {};
    const insights: string[] = [];
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Step 1: Find competitor on Google Maps
    if (input.city) {
      data.businessInfo = await this.callActor('google-maps', 'search', {
        keyword: input.competitor,
        city: input.city,
        limit: 10,
      });

      if (data.businessInfo.length > 0) {
        const avgRating = data.businessInfo.reduce((sum: number, b: any) => sum + (b.rating || 0), 0) / data.businessInfo.length;
        insights.push(`Competitor has ${data.businessInfo.length} locations, average rating ${avgRating.toFixed(1)}`);
      }
    }

    // Step 2: Get news about competitor
    if (input.includeNews !== false) {
      data.news = await this.callActor('news', 'search', {
        query: input.competitor,
        limit: 15,
      });

      if (data.news.length > 3) {
        alerts.push(`${input.competitor} in news frequently (${data.news.length} articles)`);
      }
    }

    // Step 3: Get social mentions
    if (input.includeSocial !== false) {
      data.social = await this.callActor('twitter', 'search_tweets', {
        query: input.competitor,
        limit: 10,
      });

      if (data.social.length > 0) {
        insights.push(`${data.social.length} social mentions detected`);
      }
    }

    // Generate summary
    const summary = `Competitive intelligence for ${input.competitor}${input.city ? ` in ${input.city}` : ''}. ` +
      `Analyzed ${data.businessInfo?.length || 0} business locations, ${data.news?.length || 0} news articles, ` +
      `and ${data.social?.length || 0} social posts.`;

    recommendations.push('Set up alerts for pricing changes');
    recommendations.push('Compare pricing using the pricing-intelligence skill');
    recommendations.push('Track customer reviews for sentiment trends');

    return {
      agentName: this.config.name,
      agentType: this.config.type,
      reportId,
      generatedAt,
      duration: 0,
      data,
      summary,
      insights,
      recommendations,
      alerts,
    };
  }
}

export default CompetitorResearcher;