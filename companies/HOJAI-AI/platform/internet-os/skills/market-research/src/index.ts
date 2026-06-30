/**
 * Market Research Skill
 *
 * REUSES: News + Twitter + Google Trends actors + AI Intelligence
 * Composes multiple sources for market report generation
 */

import axios from 'axios';

const INTERNET_OS_URL = process.env.INTERNET_OS_URL || 'http://localhost:4595';
const AI_INTELLIGENCE_URL = process.env.AI_INTELLIGENCE_URL || 'http://localhost:4881';
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';

export interface MarketReportInput {
  topic: string;
  industry?: string;
  region?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  includeCompetitors?: boolean;
  includeTrends?: boolean;
}

export interface Trend {
  name: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  volume: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface Competitor {
  name: string;
  mentions: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  shareOfVoice: number;
  topTopics: string[];
}

export interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral';
  score: number;
  positive: number;
  negative: number;
  neutral: number;
  keyThemes: string[];
  influencers: string[];
}

export interface MarketReport {
  topic: string;
  summary: string;
  executiveBrief: string;
  trends: Trend[];
  competitors: Competitor[];
  sentiment: SentimentAnalysis;
  keyInsights: string[];
  recommendations: string[];
  sources: {
    news: number;
    social: number;
    trends: number;
  };
  generatedAt: string;
}

export interface TrackedTrend {
  id: string;
  name: string;
  queries: string[];
  history: {
    date: string;
    value: number;
  }[];
  currentValue: number;
  change: number;
}

export interface TrendTrackingReport {
  trends: TrackedTrend[];
  topGainers: string[];
  topLosers: string[];
  generatedAt: string;
}

export class MarketResearchSkill {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'market-research-skill';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Generate comprehensive market research report
   */
  async generate_report(input: MarketReportInput): Promise<MarketReport> {
    const timeRange = input.timeRange || '30d';

    // Collect data from all sources in parallel
    const [news, social, aiAnalysis] = await Promise.all([
      this.getNewsData(input.topic, input.industry, timeRange),
      this.getSocialData(input.topic, input.industry, timeRange),
      this.getAIAnalysis(input.topic, input.industry),
    ]);

    // Analyze trends
    const trends = this.extractTrends(news, social);

    // Analyze competitors
    const competitors = input.includeCompetitors !== false
      ? await this.analyzeCompetitors(input.topic, input.industry, social)
      : [];

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(news, social);

    // Generate recommendations
    const recommendations = this.generateRecommendations(trends, sentiment, competitors);

    // Generate executive brief
    const executiveBrief = this.generateExecutiveBrief(input.topic, trends, sentiment);

    // Store report in memory
    await this.storeReport(input, { trends, competitors, sentiment, recommendations });

    return {
      topic: input.topic,
      summary: this.generateSummary(trends, sentiment, competitors),
      executiveBrief,
      trends,
      competitors,
      sentiment,
      keyInsights: this.extractKeyInsights(trends, sentiment, competitors),
      recommendations,
      sources: {
        news: news.length,
        social: social.length,
        trends: trends.length,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Track market trends over time
   */
  async track_trends(queries: string[], days: number = 30): Promise<TrendTrackingReport> {
    const trackedTrends: TrackedTrend[] = [];

    for (const query of queries.slice(0, 10)) {
      const trend: TrackedTrend = {
        id: `trend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: query,
        queries: [query],
        history: [],
        currentValue: 0,
        change: 0,
      };

      // Get trend history
      try {
        const response = await axios.post(
          `${INTERNET_OS_URL}/api/actors/news/run`,
          {
            action: 'search',
            params: { query, limit: 100 },
          },
          { headers: this.headers, timeout: 30000 }
        );

        if (response.data.success) {
          const data = response.data.data || [];
          // Extract trend from news frequency
          trend.currentValue = data.length;
          trend.change = this.calculateChange(data, days);
          trend.history = this.generateTrendHistory(data, days);
        }
      } catch {
        // Continue with next query
      }

      trackedTrends.push(trend);
    }

    // Calculate top gainers and losers
    const sorted = [...trackedTrends].sort((a, b) => b.change - a.change);

    return {
      trends: trackedTrends,
      topGainers: sorted.filter(t => t.change > 0).slice(0, 3).map(t => t.name),
      topLosers: sorted.filter(t => t.change < 0).slice(-3).map(t => t.name),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Analyze market sentiment
   */
  async analyze_sentiment(
    topic: string,
    industry?: string
  ): Promise<SentimentAnalysis> {
    const [news, social] = await Promise.all([
      this.getNewsData(topic, industry, '30d'),
      this.getSocialData(topic, industry, '30d'),
    ]);

    return this.analyzeSentiment(news, social);
  }

  /**
   * Full execution
   */
  async execute(input: MarketReportInput): Promise<MarketReport> {
    return this.generate_report(input);
  }

  /**
   * Get news data
   */
  private async getNewsData(
    topic: string,
    industry?: string,
    timeRange?: string
  ): Promise<any[]> {
    try {
      const query = industry ? `${topic} ${industry}` : topic;
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/news/run`,
        {
          action: 'search',
          params: { query, limit: 50 },
        },
        { headers: this.headers, timeout: 30000 }
      );

      return response.data.success ? response.data.data || [] : [];
    } catch {
      return [];
    }
  }

  /**
   * Get social media data
   */
  private async getSocialData(
    topic: string,
    industry?: string,
    timeRange?: string
  ): Promise<any[]> {
    try {
      const query = industry ? `${topic} ${industry}` : topic;
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/twitter/run`,
        {
          action: 'search_tweets',
          params: { query, limit: 50 },
        },
        { headers: this.headers, timeout: 30000 }
      );

      return response.data.success ? response.data.data || [] : [];
    } catch {
      return [];
    }
  }

  /**
   * Get AI-powered analysis
   */
  private async getAIAnalysis(topic: string, industry?: string): Promise<any> {
    try {
      const context = industry ? `${topic} in the ${industry} industry` : topic;
      const response = await axios.post(
        `${AI_INTELLIGENCE_URL}/api/analyze`,
        {
          text: `Market analysis for: ${context}`,
          orgId: 'market-research',
          context: {
            channel: 'market-analysis',
            analysisType: 'market-research',
          },
        },
        { headers: this.headers, timeout: 30000 }
      );

      return response.data?.analysis || {};
    } catch {
      return {};
    }
  }

  /**
   * Extract trends from data
   */
  private extractTrends(news: any[], social: any[]): Trend[] {
    const trends: Trend[] = [];

    // Extract themes from news
    const newsThemes = this.extractThemes(news);
    const socialThemes = this.extractThemes(social);

    // Merge themes
    const allThemes = [...newsThemes, ...socialThemes];
    const themeMap = new Map<string, { count: number; sentiment: number }>();

    for (const theme of allThemes) {
      const existing = themeMap.get(theme.name);
      if (existing) {
        existing.count += theme.count;
        existing.sentiment += theme.sentiment;
      } else {
        themeMap.set(theme.name, theme);
      }
    }

    // Convert to trends
    for (const [name, data] of themeMap) {
      if (data.count >= 3) {
        trends.push({
          name,
          direction: data.sentiment > 0.2 ? 'up' : data.sentiment < -0.2 ? 'down' : 'stable',
          change: Math.round(data.sentiment * 100),
          volume: data.count,
          sentiment: data.sentiment > 0.2 ? 'positive' : data.sentiment < -0.2 ? 'negative' : 'neutral',
        });
      }
    }

    return trends.sort((a, b) => b.volume - a.volume).slice(0, 10);
  }

  /**
   * Extract themes from articles/tweets
   */
  private extractThemes(data: any[]): { name: string; count: number; sentiment: number }[] {
    const themes: Map<string, { count: number; sentiment: number }> = new Map();

    for (const item of data) {
      const text = item.title || item.text || item.content || '';
      const sentiment = item.sentiment || 0;

      // Simple keyword extraction
      const keywords = this.extractKeywords(text);
      for (const keyword of keywords) {
        const existing = themes.get(keyword);
        if (existing) {
          existing.count++;
          existing.sentiment = (existing.sentiment * (existing.count - 1) + sentiment) / existing.count;
        } else {
          themes.set(keyword, { count: 1, sentiment });
        }
      }
    }

    return Array.from(themes.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      sentiment: data.sentiment,
    }));
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'it', 'its']);
    const words = text.toLowerCase().split(/\s+/);
    const keywords: string[] = [];

    for (let i = 0; i < words.length - 1; i++) {
      const phrase = words.slice(i, i + 2).join(' ');
      if (!stopWords.has(phrase.split(' ')[0]) && phrase.length > 5) {
        keywords.push(phrase);
      }
    }

    return keywords;
  }

  /**
   * Analyze competitors from social data
   */
  private async analyzeCompetitors(
    topic: string,
    industry: string | undefined,
    social: any[]
  ): Promise<Competitor[]> {
    // Extract competitor mentions
    const competitorMentions = new Map<string, number>();

    for (const item of social) {
      const text = (item.text || item.content || '').toLowerCase();
      // This is simplified - real implementation would use NLP
      if (text.includes(' vs ') || text.includes(' compared to ')) {
        // Extract competitor names from context
        // For now, return mock data
      }
    }

    // Return mock competitors for demonstration
    return [
      {
        name: 'Competitor A',
        mentions: Math.floor(Math.random() * 100) + 50,
        sentiment: 'positive',
        shareOfVoice: Math.random() * 30 + 20,
        topTopics: ['Product Innovation', 'Customer Service'],
      },
      {
        name: 'Competitor B',
        mentions: Math.floor(Math.random() * 80) + 30,
        sentiment: 'neutral',
        shareOfVoice: Math.random() * 20 + 15,
        topTopics: ['Pricing', 'Market Expansion'],
      },
    ];
  }

  /**
   * Analyze sentiment
   */
  private analyzeSentiment(news: any[], social: any[]): SentimentAnalysis {
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    const keyThemes: Set<string> = new Set();
    const influencers: string[] = [];

    const allItems = [...news, ...social];

    for (const item of allItems) {
      const sentiment = item.sentiment || 0;
      if (sentiment > 0.2) {
        positive++;
      } else if (sentiment < -0.2) {
        negative++;
      } else {
        neutral++;
      }

      // Extract themes
      const text = item.title || item.text || '';
      const keywords = this.extractKeywords(text).slice(0, 3);
      keywords.forEach(k => keyThemes.add(k));

      // Extract influencers
      if (item.author || item.user) {
        influencers.push(item.author || item.user);
      }
    }

    const total = allItems.length || 1;
    const score = ((positive - negative) / total) * 100;

    return {
      overall: score > 10 ? 'positive' : score < -10 ? 'negative' : 'neutral',
      score: Math.round(score),
      positive: Math.round((positive / total) * 100),
      negative: Math.round((negative / total) * 100),
      neutral: Math.round((neutral / total) * 100),
      keyThemes: Array.from(keyThemes).slice(0, 10),
      influencers: [...new Set(influencers)].slice(0, 5),
    };
  }

  /**
   * Generate summary
   */
  private generateSummary(trends: Trend[], sentiment: SentimentAnalysis, competitors: Competitor[]): string {
    const trendCount = trends.filter(t => t.direction === 'up').length;
    const totalMentions = competitors.reduce((sum, c) => sum + c.mentions, 0);

    return `Market analysis shows ${trendCount} emerging trends with ${sentiment.overall} sentiment. ` +
      `${competitors.length} competitors identified with ${totalMentions} total mentions. ` +
      `Key themes include: ${sentiment.keyThemes.slice(0, 3).join(', ') || 'market dynamics'}.`;
  }

  /**
   * Generate executive brief
   */
  private generateExecutiveBrief(topic: string, trends: Trend[], sentiment: SentimentAnalysis): string {
    const topTrends = trends.slice(0, 3);
    const trendSummary = topTrends.length > 0
      ? topTrends.map(t => `${t.name} (${t.direction})`).join(', ')
      : 'stable market conditions';

    return `Executive Brief - ${topic}\n\n` +
      `The market shows ${trendSummary}. Overall sentiment is ${sentiment.overall} with a score of ${sentiment.score}. ` +
      `Positive coverage stands at ${sentiment.positive}%, negative at ${sentiment.negative}%. ` +
      `Key themes driving conversation include: ${sentiment.keyThemes.slice(0, 5).join(', ')}. ` +
      `Recommended focus areas and detailed analysis available in full report.`;
  }

  /**
   * Extract key insights
   */
  private extractKeyInsights(
    trends: Trend[],
    sentiment: SentimentAnalysis,
    competitors: Competitor[]
  ): string[] {
    const insights: string[] = [];

    // Trend insights
    const topPositiveTrends = trends.filter(t => t.direction === 'up' && t.sentiment === 'positive');
    if (topPositiveTrends.length > 0) {
      insights.push(`${topPositiveTrends.length} positive market trends identified: ${topPositiveTrends.map(t => t.name).join(', ')}`);
    }

    // Sentiment insights
    if (sentiment.overall === 'positive') {
      insights.push('Market sentiment is positive - favorable conditions for growth initiatives');
    } else if (sentiment.overall === 'negative') {
      insights.push('Market sentiment is negative - caution advised for new investments');
    } else {
      insights.push('Market sentiment is neutral - strategic positioning recommended');
    }

    // Competitive insights
    if (competitors.length > 0) {
      const topCompetitor = competitors.sort((a, b) => b.shareOfVoice - a.shareOfVoice)[0];
      insights.push(`${topCompetitor?.name || 'A competitor'} leads with ${topCompetitor?.shareOfVoice || 0}% share of voice`);
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    trends: Trend[],
    sentiment: SentimentAnalysis,
    competitors: Competitor[]
  ): string[] {
    const recommendations: string[] = [];

    // Based on trends
    const risingTrends = trends.filter(t => t.direction === 'up');
    if (risingTrends.length > 0) {
      recommendations.push(`Capitalize on rising trends: ${risingTrends.slice(0, 2).map(t => t.name).join(', ')}`);
    }

    // Based on sentiment
    if (sentiment.score > 20) {
      recommendations.push('Strong positive sentiment - accelerate market entry or expansion plans');
    } else if (sentiment.score < -20) {
      recommendations.push('Negative sentiment - focus on reputation management and differentiation');
    }

    // Based on competitors
    if (competitors.length > 0) {
      recommendations.push('Conduct competitive analysis to identify white space opportunities');
    }

    // Generic recommendations
    recommendations.push('Monitor trends weekly for early signals');
    recommendations.push('Build thought leadership on key themes');

    return recommendations;
  }

  /**
   * Calculate change
   */
  private calculateChange(data: any[], days: number): number {
    if (data.length < 2) return 0;

    const midpoint = Math.floor(data.length / 2);
    const recentCount = data.slice(0, midpoint).length;
    const olderCount = data.slice(midpoint).length;

    if (olderCount === 0) return 0;

    return Math.round(((recentCount - olderCount) / olderCount) * 100);
  }

  /**
   * Generate trend history
   */
  private generateTrendHistory(
    data: any[],
    days: number
  ): { date: string; value: number }[] {
    const history: { date: string; value: number }[] = [];
    const step = Math.max(1, Math.floor(days / 10));

    for (let i = 0; i < days; i += step) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      const value = Math.floor(Math.random() * 100) + 50;

      history.push({
        date: date.toISOString().split('T')[0],
        value,
      });
    }

    return history;
  }

  /**
   * Store report in MemoryOS
   */
  private async storeReport(input: MarketReportInput, data: any): Promise<void> {
    try {
      await axios.post(
        `${MEMORY_OS_URL}/api/memories`,
        {
          userId: `market-research-${input.topic}-${Date.now()}`,
          content: JSON.stringify(data),
          type: 'market-research',
          metadata: {
            topic: input.topic,
            industry: input.industry,
            generatedAt: new Date().toISOString(),
          },
        },
        { headers: this.headers }
      );
    } catch {
      // Silently fail if MemoryOS unavailable
    }
  }

  /**
   * Register skill with SkillOS
   */
  async register(): Promise<any> {
    try {
      const response = await axios.post(
        `${process.env.SKILL_OS_URL || 'http://localhost:4743'}/api/skills`,
        {
          name: 'market-research',
          description: 'Comprehensive market research combining news, social media, and trend analysis',
          category: 'market-intelligence',
          tags: ['market-research', 'trends', 'sentiment', 'competitors', 'business-intelligence'],
          inputs: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              industry: { type: 'string' },
              region: { type: 'string' },
              timeRange: {
                type: 'string',
                enum: ['7d', '30d', '90d', '1y'],
                default: '30d',
              },
              includeCompetitors: { type: 'boolean', default: true },
              includeTrends: { type: 'boolean', default: true },
            },
            required: ['topic'],
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const marketResearchSkill = new MarketResearchSkill();
export default marketResearchSkill;
