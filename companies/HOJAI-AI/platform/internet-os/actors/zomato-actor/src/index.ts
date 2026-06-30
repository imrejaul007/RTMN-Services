/**
 * Zomato Actor
 * Restaurant data extraction from Zomato
 */

import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/src/index.js';
import type { CheerioAPI } from 'cheerio';

export class ZomatoActor extends Actor {
  constructor() {
    super({
      id: 'zomato',
      name: 'Zomato Scraper',
      description: 'Extract restaurant info, reviews, menus, and pricing from Zomato',
      version: '1.0.0',
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
          return await this.searchRestaurants(query!, location, limit);
        case 'restaurant':
          return await this.getRestaurantDetails(url!);
        case 'reviews':
          return await this.getReviews(url!, limit);
        case 'menu':
          return await this.getMenu(url!);
        default:
          return await this.searchRestaurants(query!, location, limit);
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
    const html = await fetchUrl(searchUrl, { timeout: 30000 });
    const doc = parseHtml(html);

    const restaurants: any[] = [];
    const cards = doc.querySelectorAll('.restaurant-card, .search-result');

    cards.slice(0, limit).forEach((card) => {
      const name = card.querySelector('.result-title')?.textContent?.trim();
      const cuisine = card.querySelector('.cuisine')?.textContent?.trim();
      const rating = card.querySelector('[aria-label*="rated"]')?.textContent?.trim();
      const priceRange = card.querySelector('.price-range')?.textContent?.trim();
      const deliveryTime = card.querySelector('.delivery-time')?.textContent?.trim();
      const address = card.querySelector('.address')?.textContent?.trim();

      if (name) {
        restaurants.push({
          name,
          cuisine,
          rating: rating ? parseFloat(rating) : null,
          priceRange,
          deliveryTime,
          address,
          url: card.querySelector('a')?.getAttribute('href'),
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
  }

  private async getRestaurantDetails(restaurantUrl: string): Promise<ActorOutput> {
    const html = await fetchUrl(restaurantUrl, { timeout: 30000 });
    const doc = parseHtml(html);

    const details = {
      name: doc.querySelector('h1')?.textContent?.trim(),
      rating: doc.querySelector('[aria-label*="rating"]')?.textContent?.trim(),
      reviews: doc.querySelector('.reviews-count')?.textContent?.trim(),
      cuisine: this.parseCuisine(doc),
      address: doc.querySelector('[data-testid="address"]')?.textContent?.trim(),
      hours: doc.querySelector('[data-testid="timing"]')?.textContent?.trim(),
      costForTwo: doc.querySelector('.cost-for-two')?.textContent?.trim(),
      delivery: doc.querySelector('.delivery-time')?.textContent?.trim(),
      menuUrl: doc.querySelector('[data-testid="menu"]')?.getAttribute('href'),
      photos: this.extractPhotos(doc),
      features: this.extractFeatures(doc),
    };

    return {
      success: true,
      data: details,
    };
  }

  private parseCuisine(doc: CheerioAPI): string[] {
    const cuisines: string[] = [];
    const cuisineEls = doc.querySelectorAll('.cuisine a');
    cuisineEls.forEach((el) => {
      cuisines.push(el.textContent?.trim() || '');
    });
    return cuisines;
  }

  private extractPhotos(doc: CheerioAPI): string[] {
    const photos: string[] = [];
    const photoEls = doc.querySelectorAll('.photo-gallery img');
    photoEls.slice(0, 10).forEach((el) => {
      const src = el.getAttribute('data-src') || el.getAttribute('src');
      if (src) photos.push(src);
    });
    return photos;
  }

  private extractFeatures(doc: CheerioAPI): string[] {
    const features: string[] = [];
    const featureEls = doc.querySelectorAll('.facility-badge, .feature-tag');
    featureEls.forEach((el) => {
      features.push(el.textContent?.trim() || '');
    });
    return features;
  }

  private async getReviews(restaurantUrl: string, limit: number): Promise<ActorOutput> {
    const reviewsUrl = `${restaurantUrl}/reviews`;
    const html = await fetchUrl(reviewsUrl, { timeout: 30000 });
    const doc = parseHtml(html);

    const reviews: any[] = [];
    const reviewCards = doc.querySelectorAll('.review-card, .review-item');

    reviewCards.slice(0, limit).forEach((card) => {
      const author = card.querySelector('.author-name')?.textContent?.trim();
      const rating = card.querySelector('.rating')?.textContent?.trim();
      const date = card.querySelector('.date')?.textContent?.trim();
      const text = card.querySelector('.review-text')?.textContent?.trim();
      const likes = card.querySelector('.helpful-count')?.textContent?.trim();

      if (author && text) {
        reviews.push({
          author,
          rating: rating ? parseFloat(rating) : null,
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
  }

  private async getMenu(restaurantUrl: string): Promise<ActorOutput> {
    const menuUrl = `${restaurantUrl}/order`;
    const html = await fetchUrl(menuUrl, { timeout: 30000 });
    const doc = parseHtml(html);

    const categories: any[] = [];
    const categoryEls = doc.querySelectorAll('.menu-category, .category-section');

    categoryEls.forEach((catEl) => {
      const categoryName = catEl.querySelector('h2, h3')?.textContent?.trim();
      const items: any[] = [];

      const itemEls = catEl.querySelectorAll('.menu-item, .item-card');
      itemEls.forEach((itemEl) => {
        const name = itemEl.querySelector('.item-name')?.textContent?.trim();
        const description = itemEl.querySelector('.item-description')?.textContent?.trim();
        const price = itemEl.querySelector('.price')?.textContent?.trim();
        const image = itemEl.querySelector('img')?.getAttribute('src');
        const veg = itemEl.querySelector('.veg-indicator') !== null;

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
  }

  async validate(input: any): Promise<boolean> {
    return !!(input && (input.query || input.url));
  }
}

export default new ZomatoActor();
