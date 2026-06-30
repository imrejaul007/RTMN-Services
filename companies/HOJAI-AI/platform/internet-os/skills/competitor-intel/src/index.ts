/**
 * Competitor Intelligence Skill
 *
 * REUSES: News, Twitter, Google Maps actors + AI Intelligence
 * Composes multiple sources for comprehensive competitor analysis
 */

import axios from 'axios';

const INTERNET_OS_URL = process.env.INTERNET_OS_URL || 'http://localhost:4595';
const AI_INTELLIGENCE_URL = process.env.AI_INTELLIGENCE_URL || 'http://localhost:4881';
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';

export interface CompetitorIntelInput {
  competitor: string;
  city?: string;
  includeNews?: boolean;
  includeSocial?: boolean;
  includeReviews?: boolean;
}

export interface CompetitorIntelReport {
  competitor: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recentNews: any[];
  recentTweets: any[];
  reviews: any[];
  pricing?: any[];
  generatedAt: string;
}

export class CompetitorIntelSkill {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'competitor-intel-skill';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Execute competitor intelligence skill
   */
  async execute(input: CompetitorIntelInput): Promise<CompetitorIntelReport> {
    const [news, social, reviews] = await Promise.all([
      input.includeNews !== false ? this.getCompetitorNews(input.competitor) : Promise.resolve([]),
      input.includeSocial !== false ? this.getCompetitorSocial(input.competitor) : Promise.resolve([]),
      input.includeReviews !== false ? this.getCompetitorReviews(input.competitor, input.city) : Promise.resolve([]),
    ]);

    // Store in MemoryOS for history
    await this.storeReport(input.competitor, { news, social, reviews });

    // Generate AI summary if AI Intelligence is available
    let summary = '';
    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let opportunities: string[] = [];
    let threats: string[] = [];

    try {
      const aiResponse = await axios.post(
        `${AI_INTELLIGENCE_URL}/api/analyze`,
        {
          text: this.compileText(input.competitor, news, social, reviews),
          orgId: 'competitor-intel',
          context: {
            channel: 'competitor-analysis',
            analysisType: 'swot',
          },
        },
        { headers: this.headers, timeout: 30000 }
      );

      if (aiResponse.data?.analysis) {
        summary = aiResponse.data.analysis.summary || '';
        strengths = aiResponse.data.analysis.strengths || [];
        weaknesses = aiResponse.data.analysis.weaknesses || [];
        opportunities = aiResponse.data.analysis.opportunities || [];
        threats = aiResponse.data.analysis.threats || [];
      }
    } catch (error) {
      console.warn('AI Intelligence not available, using basic summary');
      summary = `Competitor analysis for ${input.competitor} based on ${news.length} news articles, ${social.length} social posts, and ${reviews.length} reviews.`;
    }

    return {
      competitor: input.competitor,
      summary,
      strengths,
      weaknesses,
      opportunities,
      threats,
      recentNews: news,
      recentTweets: social,
      reviews,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get news about competitor
   */
  private async getCompetitorNews(competitor: string): Promise<any[]> {
    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/news/run`,
        {
          action: 'search',
          params: { query: competitor, limit: 10 },
        },
        { headers: this.headers, timeout: 30000 }
      );

      return response.data.success ? response.data.data || [] : [];
    } catch {
      return [];
    }
  }

  /**
   * Get social mentions
   */
  private async getCompetitorSocial(competitor: string): Promise<any[]> {
    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/twitter/run`,
        {
          action: 'search_tweets',
          params: { query: competitor, limit: 10 },
        },
        { headers: this.headers, timeout: 30000 }
      );

      return response.data.success ? response.data.data || [] : [];
    } catch {
      return [];
    }
  }

  /**
   * Get reviews from Google Maps
   */
  private async getCompetitorReviews(competitor: string, city?: string): Promise<any[]> {
    if (!city) return [];

    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/google-maps/run`,
        {
          action: 'search',
          params: { keyword: competitor, city },
        },
        { headers: this.headers, timeout: 30000 }
      );

      return response.data.success ? response.data.data || [] : [];
    } catch {
      return [];
    }
  }

  /**
   * Store report in MemoryOS
   */
  private async storeReport(competitor: string, data: any): Promise<void> {
    try {
      await axios.post(
        `${MEMORY_OS_URL}/api/memories`,
        {
          userId: `competitor-${competitor}`,
          content: JSON.stringify(data),
          type: 'competitor-intelligence',
          metadata: {
            competitor,
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
   * Compile text for AI analysis
   */
  private compileText(competitor: string, news: any[], social: any[], reviews: any[]): string {
    const parts = [`Competitor: ${competitor}\n`];

    if (news.length > 0) {
      parts.push(`\nRecent News (${news.length}):`);
      news.slice(0, 5).forEach(n => {
        parts.push(`- ${n.title || n.text || JSON.stringify(n)}`);
      });
    }

    if (social.length > 0) {
      parts.push(`\nSocial Mentions (${social.length}):`);
      social.slice(0, 5).forEach(s => {
        parts.push(`- ${s.text || s.content || JSON.stringify(s)}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Register skill
   */
  async register(): Promise<any> {
    try {
      const response = await axios.post(
        `${process.env.SKILL_OS_URL || 'http://localhost:4743'}/api/skills`,
        {
          name: 'competitor-intelligence',
          description: 'Multi-source competitor analysis combining news, social, and reviews',
          category: 'competitive-intelligence',
          tags: ['competitors', 'analysis', 'business', 'ai'],
          inputs: {
            type: 'object',
            properties: {
              competitor: { type: 'string' },
              city: { type: 'string' },
            },
            required: ['competitor'],
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

export const competitorIntelSkill = new CompetitorIntelSkill();
export default competitorIntelSkill;