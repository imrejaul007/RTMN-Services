/**
 * Zomato Actor
 * Restaurant data extraction from Zomato
 */

import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/dist/index.js';
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
    const $ = parseHtml(html);

    const restaurants: any[] = [];
    const cards = $('.restaurant-card, .search-result');

    cards.slice(0, limit).each((_, card) => {
      const name = $(card).find('.result-title').text().trim();
      const cuisine = $(card).find('.cuisine').text().trim();
      const rating = $(card).find('[aria-label*="rated"]').text().trim();
      const priceRange = $(card).find('.price-range').text().trim();
      const deliveryTime = $(card).find('.delivery-time').text().trim();
      const address = $(card).find('.address').text().trim();

      if (name) {
        restaurants.push({
          name,
          cuisine,
          rating: rating ? parseFloat(rating) : null,
          priceRange,
          deliveryTime,
          address,
          url: $(card).find('a').attr('href'),
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
    const $ = parseHtml(html);

    const details = {
      name: $('h1').first().text().trim(),
      rating: $('[aria-label*="rating"]').first().text().trim(),
      reviews: $('.reviews-count').first().text().trim(),
      cuisine: this.parseCuisine($),
      address: $('[data-testid="address"]').first().text().trim(),
      hours: $('[data-testid="timing"]').first().text().trim(),
      costForTwo: $('.cost-for-two').first().text().trim(),
      delivery: $('.delivery-time').first().text().trim(),
      menuUrl: $('[data-testid="menu"]').attr('href'),
      photos: this.extractPhotos($),
      features: this.extractFeatures($),
    };

    return {
      success: true,
      data: details,
    };
  }

  private parseCuisine($: CheerioAPI): string[] {
    const cuisines: string[] = [];
    const cuisineEls = $('.cuisine a');
    cuisineEls.each((_, el) => {
      cuisines.push($(el).text().trim());
    });
    return cuisines;
  }

  private extractPhotos($: CheerioAPI): string[] {
    const photos: string[] = [];
    const photoEls = $('.photo-gallery img');
    photoEls.slice(0, 10).each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src) photos.push(src);
    });
    return photos;
  }

  private extractFeatures($: CheerioAPI): string[] {
    const features: string[] = [];
    const featureEls = $('.facility-badge, .feature-tag');
    featureEls.each((_, el) => {
      features.push($(el).text().trim());
    });
    return features;
  }

  private async getReviews(restaurantUrl: string, limit: number): Promise<ActorOutput> {
    const reviewsUrl = `${restaurantUrl}/reviews`;
    const html = await fetchUrl(reviewsUrl, { timeout: 30000 });
    const $ = parseHtml(html);

    const reviews: any[] = [];
    const reviewCards = $('.review-card, .review-item');

    reviewCards.slice(0, limit).each((_, card) => {
      const author = $(card).find('.author-name').text().trim();
      const rating = $(card).find('.rating').text().trim();
      const date = $(card).find('.date').text().trim();
      const text = $(card).find('.review-text').text().trim();
      const likes = $(card).find('.helpful-count').text().trim();

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
    const $ = parseHtml(html);

    const categories: any[] = [];
    const categoryEls = $('.menu-category, .category-section');

    categoryEls.each((_, catEl) => {
      const categoryName = $(catEl).find('h2, h3').first().text().trim();
      const items: any[] = [];

      const itemEls = $(catEl).find('.menu-item, .item-card');
      itemEls.each((_, itemEl) => {
        const name = $(itemEl).find('.item-name').text().trim();
        const description = $(itemEl).find('.item-description').text().trim();
        const price = $(itemEl).find('.price').text().trim();
        const image = $(itemEl).find('img').attr('src');
        const veg = $(itemEl).find('.veg-indicator').length > 0;

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
