/**
 * Firecrawl Scraper - Cloud-based JS rendering scraper
 *
 * Uses Firecrawl API for sites that require JavaScript rendering
 * Get API key at: https://firecrawl.dev
 */

import axios from 'axios';

export interface FirecrawlOptions {
  extractFields?: string[];
  waitForSelector?: string;
  onlyIncludeTags?: string[];
  removeTags?: string[];
}

export interface FirecrawlResult {
  success: boolean;
  url: string;
  content?: string;
  markdown?: string;
  extracted?: Record<string, any>;
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    publishedDate?: string;
    sourceURL?: string;
  };
}

export class FirecrawlScraper {
  private apiKey: string;
  private baseUrl: string;
  private axiosInstance;

  constructor() {
    this.apiKey = process.env.FIRECRAWL_API_KEY || '';
    this.baseUrl = 'https://api.firecrawl.dev/v0';

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // Firecrawl can take longer
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      }
    });
  }

  /**
   * Scrape a URL using Firecrawl
   */
  async scrape(url: string, options?: FirecrawlOptions): Promise<FirecrawlResult> {
    // If no API key, fall back to simple scraping message
    if (!this.apiKey) {
      console.warn('Firecrawl API key not set. Set FIRECRAWL_API_KEY environment variable.');
      return {
        success: false,
        url,
        content: 'Firecrawl API key not configured',
        metadata: { sourceURL: url }
      };
    }

    try {
      const response = await this.axiosInstance.post('/scrape', {
        url,
        pageOptions: {
          onlyIncludeTags: options?.onlyIncludeTags || ['h1', 'h2', 'h3', 'p', 'li', 'article', 'section'],
          removeTags: options?.removeTags || ['nav', 'footer', 'header', 'script', 'style'],
        },
        extractorOptions: {
          extractionStrategy: 'markdown',
          // If custom fields specified, use LLM extraction
          ...(options?.extractFields && {
            prompt: `Extract the following information: ${options.extractFields.join(', ')}`
          })
        }
      });

      const data = response.data;

      return {
        success: true,
        url,
        content: data.content,
        markdown: data.markdown,
        extracted: data.data,
        metadata: {
          title: data.metadata?.title,
          description: data.metadata?.description,
          language: data.metadata?.language,
          publishedDate: data.metadata?.publishedDate,
          sourceURL: url
        }
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Firecrawl API key');
      }
      throw new Error(`Firecrawl scrape failed: ${error.message}`);
    }
  }

  /**
   * Batch scrape multiple URLs using Firecrawl
   */
  async scrapeBatch(urls: string[], options?: FirecrawlOptions): Promise<FirecrawlResult[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.scrape(url, options))
    );

    return results
      .filter((r): r is PromiseFulfilledResult<FirecrawlResult> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  /**
   * Check if Firecrawl is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}