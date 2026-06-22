/**
 * Simple Scraper - Cheerio-based scraper for static sites
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapeOptions {
  selectors?: {
    title?: string;
    content?: string;
    links?: string;
    images?: string;
    price?: string;
    [key: string]: string | undefined;
  };
  extractFields?: Record<string, string>;
}

export interface ScrapeResult {
  url: string;
  title?: string;
  content?: string;
  links?: string[];
  images?: string[];
  extracted?: Record<string, any>;
  metadata?: {
    fetchedAt: string;
    statusCode: number;
    contentType: string;
  };
}

export class SimpleScraper {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HOJAI-WebIntelligence/1.0; +https://hojai.rez.money)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
  }

  /**
   * Scrape a URL and extract content
   */
  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult> {
    try {
      const response = await this.axiosInstance.get(url, {
        responseType: 'text',
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      const result: ScrapeResult = {
        url,
        metadata: {
          fetchedAt: new Date().toISOString(),
          statusCode: response.status,
          contentType: String(response.headers['content-type'] || 'text/html'),
        }
      };

      // Default selectors
      const selectors = options?.selectors || {
        title: 'title, h1, .title, #title',
        content: 'article, .content, .post, main, body',
        links: 'a[href]',
        images: 'img[src]',
        price: '.price, .amount, [class*="price"]',
      };

      // Extract title
      result.title = $(selectors.title).first().text().trim() || undefined;

      // Extract main content
      result.content = $(selectors.content).first().text().trim().slice(0, 10000) || undefined;

      // Extract links
      const links: string[] = [];
      $(selectors.links).each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('http')) {
          links.push(href);
        }
      });
      result.links = links.slice(0, 100);

      // Extract images
      const images: string[] = [];
      $(selectors.images).each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) {
          images.push(src.startsWith('http') ? src : new URL(src, url).href);
        }
      });
      result.images = images.slice(0, 50);

      // Extract custom fields
      if (options?.extractFields) {
        result.extracted = {};
        for (const [field, selector] of Object.entries(options.extractFields)) {
          if (selector) {
            result.extracted[field] = $(selector).first().text().trim() || undefined;
          }
        }
      }

      return result;
    } catch (error: any) {
      throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
  }

  /**
   * Scrape multiple URLs in parallel
   */
  async scrapeBatch(urls: string[], options?: ScrapeOptions): Promise<ScrapeResult[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.scrape(url, options))
    );

    return results
      .filter((r): r is PromiseFulfilledResult<ScrapeResult> => r.status === 'fulfilled')
      .map(r => r.value);
  }

  /**
   * Extract specific elements by CSS selector
   */
  async extract(url: string, selector: string): Promise<string[]> {
    const result = await this.scrape(url);
    const $ = cheerio.load(result.content || '');

    const elements: string[] = [];
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text) elements.push(text);
    });

    return elements;
  }

  /**
   * Get all text content from a page
   */
  async getTextContent(url: string): Promise<string> {
    const result = await this.scrape(url);
    const $ = cheerio.load(result.content || '');

    // Remove scripts and styles
    $('script, style, nav, footer, header').remove();

    return $('body').text().replace(/\s+/g, ' ').trim();
  }
}
