/**
 * Google Maps Actor
 * Extract business information from Google Maps
 */

// @ts-ignore - Using compiled output
import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/dist/index.js';
import type { CheerioAPI } from 'cheerio';

export interface GoogleMapsConfig {
  id: 'google_maps';
  name: 'Google Maps Scraper';
  description: 'Extract business information, reviews, and locations from Google Maps';
  version: '1.0.0';
  capabilities: ['business_search', 'reviews', 'directions', 'places'];
  rateLimit: { requests: number; window: number };
}

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
      description: 'Extract business information from Google Maps',
      version: '1.0.0',
      capabilities: ['business_search', 'reviews', 'directions', 'places'],
      rateLimit: { requests: 10, window: 60000 },
    });
  }

  async scrape(input: {
    query: string;
    location?: string;
    maxResults?: number;
    includeReviews?: boolean;
  }): Promise<ActorOutput> {
    const { query, location = 'India', maxResults = 10, includeReviews = true } = input;

    try {
      // Search for businesses
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query + ' ' + location)}`;
      const html = await fetchUrl(searchUrl, { timeout: 30000 });

      // Parse results
      const businesses = this.parseSearchResults(html, maxResults);

      // Get detailed info for each business
      const detailedBusinesses: BusinessInfo[] = [];

      for (const business of businesses.slice(0, maxResults)) {
        try {
          const details = await this.getBusinessDetails(business.placeId, includeReviews);
          detailedBusinesses.push({ ...business, ...details } as BusinessInfo);
        } catch {
          detailedBusinesses.push(business as BusinessInfo);
        }
      }

      return {
        success: true,
        data: {
          query,
          location,
          results: detailedBusinesses,
          totalResults: detailedBusinesses.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  private parseSearchResults(html: string, maxResults: number): BusinessInfo[] {
    const results: BusinessInfo[] = [];

    // Parse JSON data from the page
    const jsonMatch = html.match(/"resultRenderer":{"jobMap":{[^}]+}/);
    if (jsonMatch) {
      try {
        // Extract business data from JSON
        const dataMatch = html.match(/\[{"entityId":"[^"]+","title":"([^"]+)"/g);
        if (dataMatch) {
          for (const match of dataMatch.slice(0, maxResults)) {
            const titleMatch = match.match(/"title":"([^"]+)"/);
            const idMatch = html.match(new RegExp(`"entityId":"([^"]+).*?"title":"${titleMatch?.[1]}"`));

            if (titleMatch) {
              results.push({
                name: titleMatch[1],
                placeId: idMatch?.[1],
              });
            }
          }
        }
      } catch {
        // Fallback parsing
      }
    }

    // Alternative: Parse from visible text
    if (results.length === 0) {
      const $ = parseHtml(html);
      const cards = $('[data-result-id]');

      cards.slice(0, maxResults).each((_, card) => {
        const name = $(card).find('div[data-result-title]').text().trim();
        const rating = $(card).find('[aria-label*="stars"]').attr('aria-label');

        if (name) {
          results.push({
            name,
            placeId: $(card).attr('data-result-id') || undefined,
            rating: rating ? parseFloat(rating.match(/(\d+\.?\d*)/)?.[1] || '0') : undefined,
          });
        }
      });
    }

    return results;
  }

  private async getBusinessDetails(placeId?: string, includeReviews?: boolean): Promise<Partial<BusinessInfo>> {
    if (!placeId) return {};

    const details: Partial<BusinessInfo> = {};

    try {
      const url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
      const html = await fetchUrl(url, { timeout: 30000 });

      const $ = parseHtml(html);

      // Extract address
      const addressEl = $('[data-item-id="address"]');
      details.address = addressEl.text().trim();

      // Extract phone
      const phoneEl = $('[data-item-id="phone"]');
      details.phone = phoneEl.text().trim();

      // Extract website
      const websiteEl = $('[data-item-id="authority"]');
      details.website = websiteEl.attr('href');

      // Extract category
      const categoryEl = $('[data-item-id="category"]');
      details.category = categoryEl.text().trim();

      // Extract hours
      const hoursEl = $('[data-item-id="hours"]');
      if (hoursEl.length > 0) {
        details.hours = this.parseHours(hoursEl.text() || '');
      }

      // Extract reviews if requested
      if (includeReviews) {
        details.reviewsList = this.parseReviews($);
      }

      // Extract coordinates from URL
      const coordMatch = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        details.latitude = parseFloat(coordMatch[1]);
        details.longitude = parseFloat(coordMatch[2]);
      }
    } catch {
      // Ignore errors for individual fields
    }

    return details;
  }

  private parseHours(hoursText: string): Record<string, string> {
    const hours: Record<string, string> = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    days.forEach((day) => {
      const match = hoursText.match(new RegExp(`${day}\\s*:?\\s*([^,\n]+)`));
      if (match) {
        hours[day.toLowerCase()] = match[1].trim();
      }
    });

    return hours;
  }

  private parseReviews($: CheerioAPI): Review[] {
    const reviews: Review[] = [];

    const reviewCards = $('.review-dialog-list [data-review-id]');

    reviewCards.each((_, card) => {
      const author = $(card).find('.section-review-title').text().trim();
      const ratingEl = $(card).find('[aria-label]');
      const ratingMatch = ratingEl.attr('aria-label')?.match(/(\d)/);
      const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0;
      const date = $(card).find('.section-review-publish-date').text().trim();
      const text = $(card).find('.section-review-text').text().trim();

      if (author && text) {
        reviews.push({
          author,
          rating,
          date: date || '',
          text,
        });
      }
    });

    return reviews;
  }

  async validate(input: any): Promise<boolean> {
    return !!(input && typeof input.query === 'string' && input.query.length > 0);
  }
}

export default new GoogleMapsActor();
