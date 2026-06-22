/**
 * News Monitor - GDELT-based news intelligence
 *
 * Uses GDELT (Global Database of Events, Language, and Tone)
 * Free, unlimited news data from api.gdeltproject.org
 */

import axios from 'axios';

export interface NewsSearchOptions {
  mode?: 'artlist' | 'timelinevol';
  maxResults?: number;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface NewsArticle {
  seendate: string;
  sourcelang: string;
  domain: string;
  title: string;
  url: string;
  sentiment?: {
    tone?: string;
    score?: number;
  };
  entities?: {
    persons?: string[];
    organizations?: string[];
    locations?: string[];
  };
  image?: string;
  socialimage?: string;
}

export interface NewsTimelineEntry {
  date: string;
  count: number;
  volume?: number;
}

export class NewsMonitor {
  private baseUrl = 'https://api.gdeltproject.org/api/v2/docdoc/docdoc';
  private timelineUrl = 'https://api.gdeltproject.org/api/v2/timeline/timeline';

  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'HOJAI-WebIntelligence/1.0'
      }
    });
  }

  /**
   * Search news articles
   */
  async search(query: string, options?: NewsSearchOptions): Promise<NewsArticle[]> {
    try {
      const params = new URLSearchParams({
        query: query,
        mode: options?.mode || 'artlist',
        maxrecords: String(options?.maxResults || 50),
        sort: 'DateDesc',
        format: 'json',
        sourcecountry: 'US,IN,GB',
        ...(options?.sourceLanguage && { sourcelang: options.sourceLanguage }),
        ...(options?.targetLanguage && { targetlang: options.targetLanguage }),
      });

      // Add GKG fields for enhanced data
      const gkgParams = 'SOURCES,GKGRECORDCOUNT,DATE,URL,TITLE,SOURCELANG,DOMAIN,IMAGE,SOCIALIMAGE';

      const response = await this.axiosInstance.get(`${this.baseUrl}?${params}&trans=GKGRECORD=${gkgParams}`);

      const data = response.data;

      if (!data?.articles) {
        return [];
      }

      return data.articles.map((article: any) => ({
        seendate: article.seenDate || article.seedate,
        sourcelang: article.sourcelang,
        domain: article.domain,
        title: article.title,
        url: article.url,
        sentiment: {
          tone: article.tone,
          score: this.parseToneScore(article.tone)
        },
        entities: this.extractEntities(article),
        image: article.image,
        socialimage: article.socialimage
      }));
    } catch (error: any) {
      throw new Error(`GDELT search failed: ${error.message}`);
    }
  }

  /**
   * Search news by entity (person, organization, location)
   */
  async searchByEntity(entity: string, options?: {
    type?: 'person' | 'organization' | 'location';
    maxResults?: number;
  }): Promise<NewsArticle[]> {
    // Build entity-specific query
    const entityQuery = `(${entity})`;

    // Add entity type filter if specified
    const typeFilter = options?.type
      ? `(${options.type.toUpperCase()})`
      : '';

    return this.search(`${entityQuery}${typeFilter}`, {
      maxResults: options?.maxResults || 50
    });
  }

  /**
   * Get news timeline for a topic
   */
  async getTimeline(query: string, options?: {
    interval?: '15m' | '1h' | '24h';
    maxResults?: number;
  }): Promise<NewsTimelineEntry[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        mode: 'timelinevol',
        format: 'json',
        timelinemode: '1', // 1 = volume timeline
        timezone: 'Asia/Kolkata',
        ...(options?.interval && { interval: options.interval }),
      });

      const response = await this.axiosInstance.get(`${this.timelineUrl}?${params}`);

      const data = response.data;

      if (!data?.timeline?.[0]?.data) {
        return [];
      }

      return data.timeline[0].data.map((entry: any) => ({
        date: entry.date,
        count: parseInt(entry.count) || 0,
        volume: parseFloat(entry.volume) || 0
      }));
    } catch (error: any) {
      throw new Error(`GDELT timeline failed: ${error.message}`);
    }
  }

  /**
   * Search for company news (useful for AssetMind)
   */
  async searchCompanyNews(companyName: string): Promise<NewsArticle[]> {
    // Search for company + common news keywords
    const queries = [
      companyName,
      `${companyName} earnings`,
      `${companyName} funding`,
      `${companyName} expansion`,
      `${companyName} partnership`
    ];

    const results: NewsArticle[] = [];

    for (const query of queries) {
      const articles = await this.search(query, { maxResults: 10 });
      results.push(...articles);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    return results.filter(article => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    });
  }

  /**
   * Search for industry news
   */
  async searchIndustryNews(industry: string): Promise<NewsArticle[]> {
    const queries = [
      `${industry} industry news`,
      `${industry} market trends`,
      `${industry} technology`,
      `${industry} innovation`
    ];

    const results: NewsArticle[] = [];

    for (const query of queries) {
      const articles = await this.search(query, { maxResults: 10 });
      results.push(...articles);
    }

    // Deduplicate
    const seen = new Set<string>();
    return results.filter(article => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    });
  }

  /**
   * Get breaking news (last 24 hours)
   */
  async getBreakingNews(): Promise<NewsArticle[]> {
    return this.search('breaking news', {
      mode: 'artlist',
      maxResults: 50
    });
  }

  /**
   * Get tech news (useful for various services)
   */
  async getTechNews(): Promise<NewsArticle[]> {
    const queries = [
      'artificial intelligence',
      'machine learning',
      'startup funding',
      'tech company',
      'software release'
    ];

    const results: NewsArticle[] = [];

    for (const query of queries) {
      const articles = await this.search(query, { maxResults: 10 });
      results.push(...articles);
    }

    // Deduplicate
    const seen = new Set<string>();
    return results.filter(article => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    });
  }

  // Helper methods

  private parseToneScore(tone: string | undefined): number {
    if (!tone) return 0;
    // Tone format: "tone,pos,neg,pol"
    const parts = tone.split(',');
    const score = parseFloat(parts[0]);
    return isNaN(score) ? 0 : score;
  }

  private extractEntities(article: any): {
    persons?: string[];
    organizations?: string[];
    locations?: string[];
  } {
    const entities: any = {};

    // Parse GKG records if available
    if (article.gkgrecordinfo) {
      // Extract entities from GKG data
      // Format: persons;organizations;locations
      const parts = article.gkgrecordinfo.split(';');
      if (parts[0]) entities.persons = parts[0].split(',').filter(Boolean);
      if (parts[1]) entities.organizations = parts[1].split(',').filter(Boolean);
      if (parts[2]) entities.locations = parts[2].split(',').filter(Boolean);
    }

    return entities;
  }
}