/**
 * Google Trends Actor for HOJAI InternetOS
 *
 * Scrapes Google Trends data including:
 * - Trending searches
 * - Topic trending data
 * - Regional trends
 * - Topic comparisons
 */

import { Actor, ActorOutput, fetchUrl, parseHtml } from '@hojai/actor-runtime';

export interface TrendingTopic {
  title: string;
  query: string;
  url: string;
  traffic?: string;
  description?: string;
}

export interface RegionalTrend {
  region: string;
  regionCode: string;
  trendScore: number;
  relatedTopics?: string[];
}

export interface ComparisonResult {
  topic1: string;
  topic2: string;
  interestOverTime?: {
    date: string;
    topic1Score: number;
    topic2Score: number;
  }[];
  comparisonData?: {
    topic1: {
      peak: number;
      average: number;
      trend: 'rising' | 'falling' | 'stable';
    };
    topic2: {
      peak: number;
      average: number;
      trend: 'rising' | 'falling' | 'stable';
    };
  };
}

export interface GoogleTrendsInput {
  type: 'get_trending' | 'search_topic' | 'compare_topics' | 'get_by_region';
  query?: string;
  queries?: string[];
  region?: string;
  regionCode?: string;
  geo?: string;
  limit?: number;
}

export class GoogleTrendsActor extends Actor {
  constructor() {
    super({
      id: 'google-trends',
      name: 'Google Trends Actor',
      description: 'Scrape trending searches, topics, and regional data from Google Trends',
      version: '1.0.0',
      capabilities: ['trending', 'topics', 'regions', 'comparison'],
      rateLimit: {
        requests: 20,
        window: 60000, // 20 requests per minute
      },
    });
  }

  /**
   * Main scrape method - dispatches to specific actions
   */
  async scrape(input: GoogleTrendsInput): Promise<ActorOutput> {
    const startTime = Date.now();

    try {
      await (this as any).rateLimit();

      switch (input.type) {
        case 'get_trending':
          return await this.getTrending(input.limit || 10);

        case 'search_topic':
          if (!input.query) {
            return {
              success: false,
              error: 'Query is required for search_topic action',
            };
          }
          return await this.searchTopic(input.query, input.geo, input.limit || 10);

        case 'compare_topics':
          if (!input.queries || input.queries.length < 2) {
            return {
              success: false,
              error: 'At least 2 queries are required for compare_topics action',
            };
          }
          return await this.compareTopics(input.queries, input.geo);

        case 'get_by_region':
          if (!input.region && !input.regionCode) {
            return {
              success: false,
              error: 'Region or regionCode is required for get_by_region action',
            };
          }
          return await this.getByRegion(input.region || input.regionCode!, input.query, input.limit || 10);

        default:
          return {
            success: false,
            error: `Unknown action type: ${(input as any).type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'google-trends',
          itemsFound: 0,
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Get trending searches from Google Trends homepage
   */
  private async getTrending(limit: number): Promise<ActorOutput> {
    const url = 'https://trends.google.com/trends/trendingsearches/realtime';

    const html = await fetchUrl(url, {
      timeout: 30000,
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = parseHtml(html);
    const trending: TrendingTopic[] = [];

    // Parse trending items from the page
    // Google Trends uses data attributes and specific class names
    const trendItems = this.extractTrendingItems($);

    for (const item of trendItems.slice(0, limit)) {
      trending.push({
        title: item.title,
        query: item.query || item.title,
        url: `https://www.google.com/search?q=${encodeURIComponent(item.query || item.title)}`,
        traffic: item.traffic,
        description: item.description,
      });
    }

    return {
      success: true,
      data: {
        trending,
        totalResults: trending.length,
        scrapedAt: new Date().toISOString(),
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'google-trends',
        itemsFound: trending.length,
        duration: Date.now() - Date.now(),
      },
    };
  }

  /**
   * Search for a topic's trending data
   */
  private async searchTopic(query: string, geo?: string, limit: number = 10): Promise<ActorOutput> {
    const geoParam = geo ? `&geo=${geo}` : '';
    const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}${geoParam}`;

    const html = await fetchUrl(url, {
      timeout: 30000,
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = parseHtml(html);
    const result = this.parseTopicResults($, query);

    // Extract related queries
    const relatedTopics = this.extractRelatedQueries($, limit);

    return {
      success: true,
      data: {
        query,
        geo: geo || 'WORLD',
        interest: result,
        relatedTopics,
        searchUrl: url,
        scrapedAt: new Date().toISOString(),
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'google-trends',
        itemsFound: relatedTopics.length + 1,
        duration: Date.now() - Date.now(),
      },
    };
  }

  /**
   * Compare multiple topics
   */
  private async compareTopics(queries: string[], geo?: string): Promise<ActorOutput> {
    if (queries.length < 2) {
      return {
        success: false,
        error: 'At least 2 queries are required for comparison',
      };
    }

    const queryString = queries.map(q => encodeURIComponent(q)).join(',');
    const geoParam = geo ? `&geo=${geo}` : '';
    const url = `https://trends.google.com/trends/explore?q=${queryString}${geoParam}`;

    const html = await fetchUrl(url, {
      timeout: 30000,
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = parseHtml(html);
    const comparison = this.parseComparisonResults($, queries);

    return {
      success: true,
      data: {
        queries,
        geo: geo || 'WORLD',
        comparison,
        searchUrl: url,
        scrapedAt: new Date().toISOString(),
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'google-trends',
        itemsFound: queries.length,
        duration: Date.now() - Date.now(),
      },
    };
  }

  /**
   * Get trends by geographic region
   */
  private async getByRegion(region: string, query?: string, limit: number = 10): Promise<ActorOutput> {
    const regionCode = this.regionToCode(region);
    const queryParam = query ? `&q=${encodeURIComponent(query)}` : '';
    const url = `https://trends.google.com/trends/explore${queryParam ? `?${queryParam.slice(1)}` : ''}&geo=${regionCode}`;

    const html = await fetchUrl(url, {
      timeout: 30000,
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = parseHtml(html);
    const regionalTrends: RegionalTrend[] = [];

    // Parse regional data from the page
    const regions = this.extractRegionalData($, regionCode);

    for (const regionData of regions.slice(0, limit)) {
      regionalTrends.push({
        region: regionData.region,
        regionCode: regionData.code,
        trendScore: regionData.score,
        relatedTopics: regionData.relatedTopics,
      });
    }

    return {
      success: true,
      data: {
        region,
        regionCode,
        query: query || 'all',
        trends: regionalTrends,
        scrapedAt: new Date().toISOString(),
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'google-trends',
        itemsFound: regionalTrends.length,
        duration: Date.now() - Date.now(),
      },
    };
  }

  /**
   * Validate input
   */
  async validate(input: any): Promise<boolean> {
    if (!input || typeof input !== 'object') {
      return false;
    }

    const validTypes = ['get_trending', 'search_topic', 'compare_topics', 'get_by_region'];

    if (!validTypes.includes(input.type)) {
      return false;
    }

    switch (input.type) {
      case 'get_trending':
        return true;

      case 'search_topic':
        return !!(input.query && typeof input.query === 'string');

      case 'compare_topics':
        return !!(input.queries && Array.isArray(input.queries) && input.queries.length >= 2);

      case 'get_by_region':
        return !!(input.region || input.regionCode);

      default:
        return false;
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Extract trending items from parsed HTML
   */
  private extractTrendingItems($: any): TrendingTopic[] {
    const items: TrendingTopic[] = [];

    // Try multiple selectors that Google Trends might use
    const selectors = [
      '.feed-list-item',
      '[data-query]',
      '.trending-list-item',
      '.searchmatch',
      '.md-search-result',
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((_, el) => {
          const title = $(el).find('.title, .search-title, [data-query]').text().trim() ||
                       $(el).attr('data-query') ||
                       $(el).text().trim();

          if (title && title.length > 0 && title.length < 200) {
            items.push({
              title,
              query: title,
              url: '',
              traffic: $(el).find('.traffic, .search-volume').text().trim() || undefined,
              description: $(el).find('.description, .snippet').text().trim() || undefined,
            });
          }
        });

        if (items.length > 0) break;
      }
    }

    // Fallback: parse from JSON data embedded in page
    if (items.length === 0) {
      const jsonData = this.extractJsonFromPage($);
      if (jsonData && jsonData.trendingSearches) {
        for (const item of jsonData.trendingSearches.slice(0, 20)) {
          items.push({
            title: item.title || item.query,
            query: item.query,
            url: item.url || '',
            traffic: item.traffic,
            description: item.summary,
          });
        }
      }
    }

    return items;
  }

  /**
   * Parse topic results from HTML
   */
  private parseTopicResults($: any, query: string): any {
    const result: any = {
      query,
      interestLevel: 'unknown',
      trend: 'stable' as const,
    };

    // Extract interest over time data
    const timelineData = this.extractTimelineData($);
    if (timelineData) {
      result.interestOverTime = timelineData;
    }

    // Extract interest by region
    const regionalInterest = this.extractRegionalInterest($);
    if (regionalInterest) {
      result.interestByRegion = regionalInterest;
    }

    // Try to extract numeric interest from the page
    const interestMatch = $('body').text().match(/interest[:\s]*(\d+)/i);
    if (interestMatch) {
      result.interestLevel = parseInt(interestMatch[1], 10);
    }

    return result;
  }

  /**
   * Parse comparison results from HTML
   */
  private parseComparisonResults($: any, queries: string[]): ComparisonResult {
    const comparison: ComparisonResult = {
      topic1: queries[0],
      topic2: queries[1] || queries[0],
      interestOverTime: [],
      comparisonData: {
        topic1: { peak: 0, average: 0, trend: 'stable' as const },
        topic2: { peak: 0, average: 0, trend: 'stable' as const },
      },
    };

    // Extract timeline comparison data
    const timelineData = this.extractTimelineData($);
    if (timelineData && timelineData.length > 0) {
      comparison.interestOverTime = timelineData.map(item => ({
        date: item.date,
        topic1Score: item.scores && item.scores[0] ? item.scores[0] : 0,
        topic2Score: item.scores && item.scores[1] ? item.scores[1] : 0,
      }));

      // Calculate comparison metrics
      if (queries.length >= 2) {
        const topic1Scores = comparison.interestOverTime.map(d => d.topic1Score);
        const topic2Scores = comparison.interestOverTime.map(d => d.topic2Score);

        comparison.comparisonData!.topic1 = {
          peak: Math.max(...topic1Scores, 0),
          average: topic1Scores.length > 0 ? Math.round(topic1Scores.reduce((a, b) => a + b, 0) / topic1Scores.length) : 0,
          trend: this.calculateTrend(topic1Scores),
        };

        comparison.comparisonData!.topic2 = {
          peak: Math.max(...topic2Scores, 0),
          average: topic2Scores.length > 0 ? Math.round(topic2Scores.reduce((a, b) => a + b, 0) / topic2Scores.length) : 0,
          trend: this.calculateTrend(topic2Scores),
        };
      }
    }

    return comparison;
  }

  /**
   * Extract related queries from HTML
   */
  private extractRelatedQueries($: any, limit: number): string[] {
    const queries: string[] = [];

    // Try various selectors for related queries
    const selectors = [
      '.related-query',
      '.related-search-item',
      '[data-query-type="related"]',
      '.keyword .value',
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.slice(0, limit).each((_, el) => {
          const text = $(el).text().trim();
          if (text && !queries.includes(text)) {
            queries.push(text);
          }
        });

        if (queries.length > 0) break;
      }
    }

    // Fallback: parse from embedded JSON
    if (queries.length === 0) {
      const jsonData = this.extractJsonFromPage($);
      if (jsonData && jsonData.relatedQueries) {
        queries.push(...jsonData.relatedQueries.slice(0, limit));
      }
    }

    return queries;
  }

  /**
   * Extract regional data from HTML
   */
  private extractRegionalData($: any, regionCode: string): { region: string; code: string; score: number; relatedTopics?: string[] }[] {
    const regions: { region: string; code: string; score: number; relatedTopics?: string[] }[] = [];

    // Try various selectors for regional data
    const selectors = [
      '.region-item',
      '[data-region]',
      '.geo-map-item',
      '.subregion',
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((_, el) => {
          const region = $(el).find('.region-name, [data-region-name]').text().trim() ||
                        $(el).attr('data-region-name') ||
                        $(el).text().trim().split('\n')[0];

          const scoreText = $(el).find('.score, .trend-score, [data-score]').text().trim();
          // FIX: Don't return fake data. Use 0 to indicate we couldn't extract the score.
          const score = parseFloat(scoreText) || 0; // Use 0 instead of fake random data

          if (region && region.length < 100) {
            regions.push({
              region,
              code: regionCode,
              score: Math.round(score * 100) / 100,
            });
          }
        });

        if (regions.length > 0) break;
      }
    }

    return regions;
  }

  /**
   * Extract timeline data from HTML
   */
  private extractTimelineData($: any): { date: string; score?: number; scores?: number[] }[] | null {
    const data: { date: string; score?: number; scores?: number[] }[] = [];

    // Try to extract from embedded JSON data
    const jsonData = this.extractJsonFromPage($);
    if (jsonData && jsonData.timelineData) {
      return jsonData.timelineData.map((item: any) => ({
        date: new Date(item.time * 1000).toISOString().split('T')[0],
        score: item.value?.[0] || 0,
        scores: item.value || [],
      }));
    }

    return data.length > 0 ? data : null;
  }

  /**
   * Extract regional interest data
   */
  private extractRegionalInterest($: any): any[] | null {
    const jsonData = this.extractJsonFromPage($);
    if (jsonData && jsonData.geoMapData) {
      return jsonData.geoMapData.map((item: any) => ({
        geoCode: item.geoCode,
        geoName: item.geoName,
        value: item.value,
      }));
    }
    return null;
  }

  /**
   * Extract JSON data from page
   */
  private extractJsonFromPage($: any): any | null {
    // Try to find JSON data in script tags
    const scripts = $('script');
    let jsonData: any = null;

    scripts.each((_, el) => {
      const content = $(el).html() || '';
      // Look for JSON-like structures in the script
      const jsonMatch = content.match(/\{[\s\S]*?"(query|trendingSearches|relatedQueries|timelineData)[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          jsonData = JSON.parse(jsonMatch[0]);
        } catch {
          // Continue searching
        }
      }
    });

    // Try to find data in window object assignments
    const bodyText = $('body').html() || '';
    const windowMatch = bodyText.match(/window\.__DATA__\s*=\s*({[\s\S]*?});/);
    if (windowMatch) {
      try {
        jsonData = JSON.parse(windowMatch[1]);
      } catch {
        // Continue
      }
    }

    return jsonData;
  }

  /**
   * Convert region name to country code
   */
  private regionToCode(region: string): string {
    const regionMap: Record<string, string> = {
      // Countries
      'india': 'IN',
      'usa': 'US',
      'united states': 'US',
      'uk': 'GB',
      'united kingdom': 'GB',
      'germany': 'DE',
      'france': 'FR',
      'japan': 'JP',
      'china': 'CN',
      'brazil': 'BR',
      'australia': 'AU',
      'canada': 'CA',
      'russia': 'RU',
      'south korea': 'KR',
      'italy': 'IT',
      'spain': 'ES',
      'mexico': 'MX',
      'indonesia': 'ID',
      'netherlands': 'NL',
      'saudi arabia': 'SA',
      'turkey': 'TR',
      'switzerland': 'CH',
      'poland': 'PL',
      'sweden': 'SE',
      'belgium': 'BE',
      'argentina': 'AR',
      'austria': 'AT',
      'norway': 'NO',
      'ireland': 'IE',
      'israel': 'IL',
      'hong kong': 'HK',
      'denmark': 'DK',
      'malaysia': 'MY',
      'philippines': 'PH',
      'colombia': 'CO',
      'pakistan': 'PK',
      'chile': 'CL',
      'finland': 'FI',
      'thailand': 'TH',
      'singapore': 'SG',
      'vietnam': 'VN',
      'egypt': 'EG',
      'uae': 'AE',
      'united arab emirates': 'AE',
      'new zealand': 'NZ',
      'portugal': 'PT',
      'czech republic': 'CZ',
      'romania': 'RO',
      'greece': 'GR',
      'hungary': 'HU',
      'peru': 'PE',
      'ukraine': 'UA',
      'qatar': 'QA',
      'kuwait': 'KW',
      'world': 'WORLD',
      'global': 'WORLD',
    };

    const normalizedRegion = region.toLowerCase().trim();
    return regionMap[normalizedRegion] || region.toUpperCase().slice(0, 2);
  }

  /**
   * Calculate trend direction from score array
   */
  private calculateTrend(scores: number[]): 'rising' | 'falling' | 'stable' {
    if (scores.length < 2) return 'stable';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / (firstAvg || 1)) * 100;

    if (change > 10) return 'rising';
    if (change < -10) return 'falling';
    return 'stable';
  }
}

export default new GoogleTrendsActor();
