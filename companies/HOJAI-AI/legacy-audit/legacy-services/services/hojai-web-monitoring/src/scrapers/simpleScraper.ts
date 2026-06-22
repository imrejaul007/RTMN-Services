/**
 * Simple Scraper - Cheerio-based scraper for monitoring
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapeOptions {
  selectors?: {
    title?: string;
    content?: string;
    price?: string;
    [key: string]: string | undefined;
  };
}

export interface ScrapeResult {
  url: string;
  title?: string;
  content?: string;
  price?: string;
  links?: string[];
  images?: string[];
  metadata: {
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
        'User-Agent': 'Mozilla/5.0 (compatible; HOJAI-WebMonitoring/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult> {
    try {
      const response = await this.axiosInstance.get(url, { responseType: 'text' });
      const $ = cheerio.load(response.data);

      const result: ScrapeResult = {
        url,
        metadata: {
          fetchedAt: new Date().toISOString(),
          statusCode: response.status,
          contentType: String(response.headers['content-type'] || 'text/html'),
        }
      };

      const selectors = options?.selectors || {
        title: 'title, h1, .title',
        content: 'article, .content, main, body',
        price: '.price, [class*="price"], .amount',
      };

      result.title = $('title').first().text().trim();
      result.content = $(selectors.content).first().text().trim().slice(0, 5000);
      result.price = $(selectors.price).first().text().trim() || undefined;

      // Extract links
      const links: string[] = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href?.startsWith('http')) links.push(href);
      });
      result.links = links.slice(0, 50);

      // Extract images
      const images: string[] = [];
      $('img[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) images.push(src.startsWith('http') ? src : new URL(src, url).href);
      });
      result.images = images.slice(0, 20);

      return result;
    } catch (error: any) {
      throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
  }
}