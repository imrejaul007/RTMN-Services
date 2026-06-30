/**
 * Market Researcher Agent
 *
 * Researches market trends, news, and consumer behavior
 * Uses: News actor + Google Trends + Twitter actor + skills
 */

import { ResearchAgent, ResearchAgentConfig, ResearchReport } from '../base/research-agent.js';

export interface MarketResearchInput {
  industry: string;
  city?: string;
  includeSocial?: boolean;
  includeNews?: boolean;
  includeTrends?: boolean;
}

export class MarketResearcher extends ResearchAgent {
  constructor(config?: Partial<ResearchAgentConfig>) {
    const defaultConfig: ResearchAgentConfig = {
      name: 'Market Researcher',
      type: 'market',
      skills: ['market-research', 'trend-discovery'],
      actors: ['news', 'twitter', 'google-trends'],
      schedule: { frequency: 'daily', time: '08:00' },
      deliveryChannels: ['memory-os', 'webhook'],
      memoryPartition: 'market-research',
    };
    super({ ...defaultConfig, ...config } as ResearchAgentConfig);
  }

  async generateReport(input: MarketResearchInput): Promise<ResearchReport> {
    const reportId = `market-${Date.now()}`;
    const generatedAt = new Date().toISOString();

    const data: any = {};
    const insights: string[] = [];
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Step 1: Get industry news
    if (input.includeNews !== false) {
      data.news = await this.callActor('news', 'search', {
        query: `${input.industry} ${input.city || ''}`.trim(),
        limit: 20,
      });

      if (data.news.length > 0) {
        insights.push(`Found ${data.news.length} news articles about ${input.industry}`);
      }
    }

    // Step 2: Get trending topics
    if (input.includeTrends !== false) {
      data.trends = await this.callActor('google-trends', 'search_topic', {
        query: input.industry,
        limit: 20,
      });

      if (data.trends.length > 0) {
        insights.push(`${data.trends.length} trending topics related to ${input.industry}`);
      }
    }

    // Step 3: Get social mentions
    if (input.includeSocial !== false) {
      data.social = await this.callActor('twitter', 'search_tweets', {
        query: input.industry,
        limit: 20,
      });

      if (data.social.length > 0) {
        insights.push(`${data.social.length} social posts mentioning ${input.industry}`);
      }
    }

    // Generate summary
    const summary = `Market research for ${input.industry}${input.city ? ` in ${input.city}` : ''}. ` +
      `Analyzed ${data.news?.length || 0} news articles, ${data.trends?.length || 0} trends, ` +
      `and ${data.social?.length || 0} social posts.`;

    // Generate recommendations
    recommendations.push('Monitor top trending topics for emerging opportunities');
    recommendations.push('Track competitor activity using the competitor-researcher agent');
    recommendations.push('Review consumer sentiment in social posts for product positioning');

    // Check for alerts
    if (data.trends && data.trends.length > 10) {
      alerts.push('High trend velocity detected - significant market movement');
    }

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

export default MarketResearcher;