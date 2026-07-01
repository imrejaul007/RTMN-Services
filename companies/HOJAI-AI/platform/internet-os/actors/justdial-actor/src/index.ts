/**
 * JustDial Actor - Browser Engine Version
 * Local business search for India
 *
 * Uses browser engine for JS rendering + proper headers
 * JustDial blocks standard HTTP clients
 */

import { Actor, ActorOutput } from '@hojai/actor-runtime';
import { browserEngine } from '@hojai/browser-engine';
import * as cheerio from 'cheerio';

export interface BusinessListing {
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  reviews?: number;
  hours?: string;
  category?: string;
  distance?: string;
  url?: string;
}

export class JustdialActor extends Actor {
  constructor() {
    super({
      id: 'justdial',
      name: 'JustDial India Scraper',
      description: 'Search local businesses, services, and contacts in India via browser engine',
      version: '2.0.0',
      capabilities: ['business_search', 'phone_numbers', 'addresses', 'reviews', 'local_seo'],
      rateLimit: { requests: 10, window: 60000 },
    });
  }

  async scrape(input: {
    query: string;
    location?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    const { query, location = 'Bangalore', limit = 20 } = input;

    try {
      const searchUrl = `https://www.justdial.com/${encodeURIComponent(location)}/${encodeURIComponent(query)}`;

      // Try browser engine first
      try {
        const result = await browserEngine.browse({
          url: searchUrl,
          waitForSelector: '.store-name, .jcll0',
          waitUntil: 'networkidle',
          delay: 3000,
          timeout: 60000,
        });

        const businesses = this.parseResults(result.html, limit);

        return {
          success: businesses.length > 0,
          data: { businesses, location, query, count: businesses.length },
          metadata: {
            scrapedAt: new Date().toISOString(),
            source: 'justdial-browser',
            itemsFound: businesses.length,
            duration: 0,
          },
        };
      } catch {
        // Fallback: try with custom headers
        return await this.scrapeFallback(query, location, limit);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private parseResults(html: string, limit: number): BusinessListing[] {
    const $ = cheerio.load(html);
    const businesses: BusinessListing[] = [];

    // JustDial modern selectors
    $('.store-name, .jcll0, [class*="store"]').slice(0, limit).each((_, el) => {
      const $el = $(el);
      const name = $el.text().trim();
      const $parent = $el.closest('[class*="result"], [class*="store"], li');

      const address = $parent.find('[class*="address"], .address').first().text().trim();
      const phone = $parent.find('a[href*="tel:"], [class*="phone"]').first().text().trim();
      const ratingText = $parent.find('[class*="rating"]').first().text().trim();
      const rating = this.parseRating(ratingText);

      if (name) {
        businesses.push({
          name,
          address,
          phone: phone?.replace(/[^+\d\s]/g, '').trim() || undefined,
          rating,
          reviews: this.parseReviewCount(ratingText),
          category: $el.closest('[class*="category"]').find('a').first().text().trim(),
        });
      }
    });

    return businesses;
  }

  private parseRating(text: string): number | undefined {
    const match = text.match(/([0-9]+\.[0-9])/);
    return match ? parseFloat(match[1]) : undefined;
  }

  private parseReviewCount(text: string): number | undefined {
    const match = text.match(/\(([\d,]+)\)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : undefined;
  }

  private async scrapeFallback(query: string, location: string, limit: number): Promise<ActorOutput> {
    // Try fetching with browser-like headers
    const searchUrl = `https://www.justdial.com/${encodeURIComponent(location)}/${encodeURIComponent(query)}`;

    const result = await browserEngine.browse({
      url: searchUrl,
      waitUntil: 'domcontentloaded',
      delay: 5000,
      timeout: 60000,
    });

    const businesses = this.parseResults(result.html, limit);

    return {
      success: businesses.length > 0,
      data: { businesses, location, query, count: businesses.length, fallback: true },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'justdial-browser-fallback',
        itemsFound: businesses.length,
        duration: 0,
      },
    };
  }

  async validate(input: any): Promise<boolean> {
    return !!(input?.query);
  }
}

export default JustdialActor;