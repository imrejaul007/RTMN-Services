/**
 * Zomato Actor - Browser Engine Version
 * Uses Playwright/Puppeteer via @hojai/browser-engine for JS rendering
 */

import { Actor, ActorOutput } from '@hojai/actor-runtime';
import { browserEngine } from '@hojai/browser-engine';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

export class ZomatoActor extends Actor {
  constructor() {
    super({
      id: 'zomato',
      name: 'Zomato Scraper',
      description: 'Extract restaurant info, reviews, menus, and pricing from Zomato via headless browser',
      version: '2.0.0',
      capabilities: ['restaurant_search', 'menu_extraction', 'review_scrape', 'pricing'],
      rateLimit: { requests: 10, window: 60000 },
    });
  }

  async scrape(input: {
    type: 'search' | 'restaurant' | 'reviews' | 'menu';
    query?: string;
    url?: string;
    location?: string;
    limit?: number;
  }): Promise<ActorOutput> {
    const { type, query, url, location = 'Bangalore', limit = 10 } = input;

    try {
      switch (type) {
        case 'search':
          if (!query) return { success: false, error: 'query is required' };
          return await this.searchRestaurants(query, location, limit);
        case 'restaurant':
          if (!url) return { success: false, error: 'url is required' };
          return await this.getRestaurantDetails(url);
        case 'reviews':
          if (!url) return { success: false, error: 'url is required' };
          return await this.getReviews(url, limit);
        case 'menu':
          if (!url) return { success: false, error: 'url is required' };
          return await this.getMenu(url);
        default:
          if (!query) return { success: false, error: 'query is required' };
          return await this.searchRestaurants(query, location, limit);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  private async searchRestaurants(query: string, location: string, limit: number): Promise<ActorOutput> {
    const searchUrl = `https://www.zomato.com/${location}/search?q=${encodeURIComponent(query)}`;

    try {
      const result = await browserEngine.browse({
        url: searchUrl,
        waitUntil: 'networkidle',
        delay: 3000, // Wait for JS rendering
        timeout: 60000,
      });

      const $ = cheerio.load(result.html);
      const restaurants: any[] = [];

      // Try multiple selectors (Zomato changes these frequently)
      $('.restaurant-card, .search-result, a[href*="/r/"]').slice(0, limit).each((_, card) => {
        const $el = $(card);
        const name = $el.find('.result-title, h4, .sc-1hp8d8a-0').first().text().trim();
        const cuisine = $el.find('.cuisine, .sc-1hp8d8a-5').first().text().trim();
        const ratingText = $el.find('[aria-label*="rated"], [aria-label*="Rating"]').text().trim();
        const priceRange = $el.find('.price-range, .sc-1hp8d8a-7').text().trim();
        const deliveryTime = $el.find('.delivery-time, .sc-1hp8d8a-8').text().trim();
        const address = $el.find('.address, .sc-1hp8d8a-4').text().trim();
        const href = $el.attr('href') || (card.tagName === 'a' ? $(card).attr('href') : '');

        if (name) {
          restaurants.push({
            name,
            cuisine,
            rating: this.parseRating(ratingText),
            priceRange,
            deliveryTime,
            address,
            url: href ? (href.startsWith('http') ? href : `https://www.zomato.com${href}`) : null,
          });
        }
      });

      return {
        success: true,
        data: {
          query,
          location,
          restaurants,
          totalFound: restaurants.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Browser engine failed: ${(error as Error).message}`,
      };
    }
  }

  private async getRestaurantDetails(restaurantUrl: string): Promise<ActorOutput> {
    try {
      const result = await browserEngine.browse({
        url: restaurantUrl,
        waitUntil: 'networkidle',
        delay: 3000,
        timeout: 60000,
      });

      const $ = cheerio.load(result.html);

      // Try multiple selectors (Zomato modern + legacy)
      const name = $('h1').first().text().trim();
      const ratingText = $('[aria-label*="rating"]').first().text().trim();
      const details = {
        name,
        rating: this.parseRating(ratingText),
        reviews: $('.reviews-count, .sc-1q7gu17-2').first().text().trim(),
        cuisine: this.parseCuisine($),
        address: $('[data-testid="address"], .sc-1a2ua6s-3').first().text().trim(),
        hours: $('[data-testid="timing"], .sc-1a2ua6s-2').first().text().trim(),
        costForTwo: $('.cost-for-two, .sc-1a2ua6s-1').first().text().trim(),
        photos: this.extractPhotos($),
        features: this.extractFeatures($),
      };

      return {
        success: true,
        data: details,
      };
    } catch (error) {
      return {
        success: false,
        error: `Browser engine failed: ${(error as Error).message}`,
      };
    }
  }

  private async getReviews(restaurantUrl: string, limit: number): Promise<ActorOutput> {
    const reviewsUrl = `${restaurantUrl.replace(/\/$/, '')}/reviews`;

    try {
      const result = await browserEngine.browse({
        url: reviewsUrl,
        waitUntil: 'networkidle',
        delay: 3000,
        timeout: 60000,
      });

      const $ = cheerio.load(result.html);
      const reviews: any[] = [];

      $('.review-card, .review-item, .sc-1qt1oc-1').slice(0, limit).each((_, card) => {
        const $el = $(card);
        const author = $el.find('.author-name, .sc-1qt1oc-2').text().trim();
        const ratingText = $el.find('.rating, .sc-1qt1oc-3').text().trim();
        const date = $el.find('.date, .sc-1qt1oc-4').text().trim();
        const text = $el.find('.review-text, .sc-1qt1oc-5').text().trim();
        const likes = $el.find('.helpful-count').text().trim();

        if (author && text) {
          reviews.push({
            author,
            rating: this.parseRating(ratingText),
            date,
            text,
            likes: likes ? parseInt(likes) : 0,
          });
        }
      });

      return {
        success: true,
        data: {
          reviews,
          totalReviews: reviews.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Browser engine failed: ${(error as Error).message}`,
      };
    }
  }

  private async getMenu(restaurantUrl: string): Promise<ActorOutput> {
    const menuUrl = `${restaurantUrl.replace(/\/$/, '')}/order`;

    try {
      const result = await browserEngine.browse({
        url: menuUrl,
        waitUntil: 'networkidle',
        delay: 3000,
        timeout: 60000,
      });

      const $ = cheerio.load(result.html);
      const categories: any[] = [];

      $('.menu-category, .category-section').each((_, catEl) => {
        const $cat = $(catEl);
        const categoryName = $cat.find('h2, h3').first().text().trim();
        const items: any[] = [];

        $cat.find('.menu-item, .item-card').each((_, itemEl) => {
          const $item = $(itemEl);
          const name = $item.find('.item-name, h4').text().trim();
          const description = $item.find('.item-description').text().trim();
          const price = $item.find('.price').text().trim();
          const image = $item.find('img').attr('src');
          const veg = $item.find('.veg-indicator').length > 0;

          if (name) {
            items.push({
              name,
              description,
              price: price ? parseInt(price.replace(/[^0-9]/g, '')) : null,
              image,
              isVeg: veg,
            });
          }
        });

        categories.push({
          category: categoryName,
          items,
        });
      });

      return {
        success: true,
        data: {
          categories,
          totalItems: categories.reduce((sum, cat) => sum + cat.items.length, 0),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Browser engine failed: ${(error as Error).message}`,
      };
    }
  }

  private parseRating(text: string): number | null {
    if (!text) return null;
    const match = text.match(/([0-9]\.[0-9])/);
    return match ? parseFloat(match[1]) : null;
  }

  private parseCuisine($: CheerioAPI): string[] {
    const cuisines: string[] = [];
    $('.cuisine a, .sc-1hp8d8a-5 a').each((_, el) => {
      cuisines.push($(el).text().trim());
    });
    return cuisines;
  }

  private extractPhotos($: CheerioAPI): string[] {
    const photos: string[] = [];
    $('.photo-gallery img').slice(0, 10).each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src) photos.push(src);
    });
    return photos;
  }

  private extractFeatures($: CheerioAPI): string[] {
    const features: string[] = [];
    $('.facility-badge, .feature-tag').each((_, el) => {
      features.push($(el).text().trim());
    });
    return features;
  }

  async validate(input: any): Promise<boolean> {
    return !!(input && (input.query || input.url));
  }
}

export default ZomatoActor;