/**
 * Google Maps Actor - Browser Engine Version
 * Uses Playwright/Puppeteer via @hojai/browser-engine for JS rendering
 *
 * Replaces fragile HTML scraping with proper headless browser automation
 */

import { Actor, ActorOutput } from '@hojai/actor-runtime';
import { browserEngine } from '@hojai/browser-engine';
import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

export interface BusinessInfo {
  name: string;
  placeId?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  reviewsList?: Review[];
  hours?: Record<string, string>;
  category?: string;
  photos?: string[];
  latitude?: number;
  longitude?: number;
  priceLevel?: string;
}

export interface Review {
  author: string;
  rating: number;
  date: string;
  text: string;
  responses?: string[];
}

export class GoogleMapsActor extends Actor {
  constructor() {
    super({
      id: 'google_maps',
      name: 'Google Maps Scraper',
      description: 'Extract business information from Google Maps via headless browser',
      version: '2.0.0',
      capabilities: ['business_search', 'reviews', 'directions', 'places'],
      rateLimit: { requests: 10, window: 60000 },
    });
  }

  async scrape(input: any): Promise<ActorOutput> {
    try {
      const action = input.action || 'search';
      const params = input.params || {};

      switch (action) {
        case 'search':
          return await this.searchBusinesses(params);
        case 'get_details':
          return await this.getBusinessDetails(params);
        case 'get_reviews':
          return await this.getReviews(params);
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async searchBusinesses(params: { keyword: string; city?: string; limit?: number }): Promise<ActorOutput> {
    if (!params.keyword) {
      return { success: false, error: 'keyword is required' };
    }

    const query = `${params.keyword} ${params.city || ''}`.trim();
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

    try {
      const result = await browserEngine.browse({
        url,
        waitForSelector: '[role="feed"], .section-result',
        waitUntil: 'networkidle',
        delay: 2000, // Allow JS to render cards
        timeout: 60000,
      });

      const $ = cheerio.load(result.html);
      const businesses: BusinessInfo[] = [];

      // Google Maps modern selectors
      $('.section-result, .Nv2PK, .THOPZb').each((_, el) => {
        const $el = $(el);
        const name = $el.find('.section-result-title, .qBF1Pd, .fontHeadlineSmall').text().trim();
        const ratingText = $el.find('.section-result-rating, .MW4etd, .ZkP5Je').text().trim();
        const reviewsText = $el.find('.section-result-num-ratings, .UY7F9, .WOKKOe').text().trim();

        if (name) {
          const rating = this.parseRating(ratingText);
          const reviews = this.parseReviewCount(reviewsText);

          businesses.push({
            name,
            rating,
            reviews,
            address: $el.find('.section-result-location, .W4Efsd, .Rog68').text().trim(),
            category: $el.find('.section-result-details, .W4Efsd').text().trim(),
          });
        }
      });

      const limit = params.limit || 20;
      return {
        success: true,
        data: businesses.slice(0, limit),
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'google_maps',
          itemsFound: businesses.length,
          duration: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Browser engine failed: ${(error as Error).message}. Make sure playwright/puppeteer is installed.`,
      };
    }
  }

  private async getBusinessDetails(params: { name: string; city?: string }): Promise<ActorOutput> {
    if (!params.name) {
      return { success: false, error: 'name is required' };
    }

    const query = `${params.name} ${params.city || ''}`.trim();
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

    try {
      const result = await browserEngine.browse({
        url,
        waitForSelector: '.section-result',
        waitUntil: 'networkidle',
        delay: 3000,
        timeout: 60000,
      });

      // Click first result to get details
      const $ = cheerio.load(result.html);
      const firstResult = $('.section-result, .Nv2PK').first();
      const detailUrl = firstResult.attr('href') || url;

      const detailResult = await browserEngine.browse({
        url: detailUrl,
        waitForSelector: '.section-info, .m6QErb',
        waitUntil: 'networkidle',
        delay: 3000,
        timeout: 60000,
      });

      const $detail = cheerio.load(detailResult.html);

      // Try multiple selectors (Google changes these)
      const name = $detail('h1.section-hero-header-title, .DUwDvf, .lMbq3e').text().trim() || params.name;
      const rating = this.parseRating(
        $detail('.section-hero-header-rating, .F7nice, .LBgpqf').text()
      );
      const reviews = this.parseReviewCount(
        $detail('.section-hero-header-num-ratings, .F7nice span:last-child, .UY7F9').text()
      );
      const address = $detail('[data-section-id="ad"], .rogA2c .Io6YTe, .CsEnBe').text().trim();
      const phone = $detail('[data-section-id="pn0"], .QsXRxf, .UsdlK').text().trim();
      const website = $detail('[data-section-id="iw"], .CsEnBe a, .kno-vb-tl a').attr('href');

      return {
        success: true,
        data: {
          name,
          rating,
          reviews,
          address,
          phone,
          website,
        },
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'google_maps',
          itemsFound: 1,
          duration: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Browser engine failed: ${(error as Error).message}`,
      };
    }
  }

  private async getReviews(params: { name: string; city?: string; limit?: number }): Promise<ActorOutput> {
    if (!params.name) {
      return { success: false, error: 'name is required' };
    }

    const query = `${params.name} ${params.city || ''}`.trim();
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

    try {
      const result = await browserEngine.browse({
        url,
        waitForSelector: '.section-result',
        waitUntil: 'networkidle',
        delay: 3000,
        timeout: 60000,
      });

      const $ = cheerio.load(result.html);
      const detailUrl = $('.section-result').first().attr('href') || url;

      const detailResult = await browserEngine.browse({
        url: detailUrl,
        waitForSelector: '.section-review, .wiI7pd',
        waitUntil: 'networkidle',
        delay: 3000,
        timeout: 60000,
      });

      const $detail = cheerio.load(detailResult.html);
      const reviews: Review[] = [];

      $('.section-review, .jftiEf').each((_, el) => {
        const $el = $(el);
        const author = $el.find('.section-review-name, .d4r55').text().trim();
        const rating = this.parseRating($el.find('.section-review-rating, .kvMYJc').text()) || 0;
        const text = $el.find('.section-review-text, .MyEned').text().trim();
        const date = $el.find('.section-review-publish-date, .rsqaWe').text().trim();

        if (author || text) {
          reviews.push({ author, rating, date, text });
        }
      });

      const limit = params.limit || 10;
      return {
        success: true,
        data: reviews.slice(0, limit),
        metadata: {
          scrapedAt: new Date().toISOString(),
          source: 'google_maps',
          itemsFound: reviews.length,
          duration: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Browser engine failed: ${(error as Error).message}`,
      };
    }
  }

  private parseRating(text: string): number | undefined {
    const match = text.match(/([0-9]\.[0-9])/);
    return match ? parseFloat(match[1]) : undefined;
  }

  private parseReviewCount(text: string): number | undefined {
    const match = text.match(/\(([0-9,]+)\)|([0-9,]+)/);
    if (!match) return undefined;
    const numStr = (match[1] || match[2]).replace(/,/g, '');
    return parseInt(numStr);
  }

  async validate(input: any): Promise<boolean> {
    return !!input?.params?.keyword || !!input?.params?.name;
  }
}

export default GoogleMapsActor;