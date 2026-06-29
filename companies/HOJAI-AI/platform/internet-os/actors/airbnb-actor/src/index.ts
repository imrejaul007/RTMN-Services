/**
 * Airbnb Actor
 * Property and hospitality data extraction
 */

import { Actor, ActorOutput, fetchUrl, parseHtml } from '../actor-runtime';

export class AirbnbActor extends Actor {
  constructor() {
    super({
      id: 'airbnb',
      name: 'Airbnb Scraper',
      description: 'Extract property listings, reviews, pricing, and availability from Airbnb',
      version: '1.0.0',
      capabilities: ['property_search', 'pricing_analysis', 'review_scrape', 'availability'],
      rateLimit: { requests: 5, window: 60000 },
    });
  }

  async scrape(input: {
    type: 'search' | 'property' | 'reviews' | 'pricing';
    query?: string;
    url?: string;
    location?: string;
    checkin?: string;
    checkout?: string;
    guests?: number;
    limit?: number;
  }): Promise<ActorOutput> {
    const { type, query, url, location = 'India', limit = 10 } = input;

    try {
      switch (type) {
        case 'search':
          return await this.searchProperties(query!, location, limit);
        case 'property':
          return await this.getPropertyDetails(url!);
        case 'reviews':
          return await this.getReviews(url!, limit);
        case 'pricing':
          return await this.analyzePricing(url!);
        default:
          return await this.searchProperties(query!, location, limit);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  private async searchProperties(query: string, location: string, limit: number): Promise<ActorOutput> {
    const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(location)}/homes?query=${encodeURIComponent(query)}`;
    const html = await fetchUrl(searchUrl, { timeout: 30000 });

    const properties: any[] = [];
    const doc = parseHtml(html);

    // Parse search results (Airbnb uses dynamic rendering, so this is a simplified version)
    const cards = doc.querySelectorAll('[itemprop="url"], .listing-card');

    cards.slice(0, limit).forEach((card) => {
      const name = card.querySelector('[itemprop="name"], .listing-title')?.textContent?.trim();
      const priceEl = card.querySelector('[data-testid="price-item"], .price');
      const priceMatch = priceEl?.textContent?.match(/₹([\d,]+)/);
      const rating = card.querySelector('[aria-label*="stars"]')?.textContent?.trim();
      const locationText = card.querySelector('.location-text, [itemprop="address"]')?.textContent?.trim();

      if (name) {
        properties.push({
          name,
          price: priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null,
          rating: rating ? parseFloat(rating.match(/(\d+\.?\d*)/)?.[1] || '0') : null,
          location: locationText,
          url: card.querySelector('a')?.getAttribute('href'),
        });
      }
    });

    return {
      success: true,
      data: {
        query,
        location,
        properties,
        totalFound: properties.length,
      },
    };
  }

  private async getPropertyDetails(propertyUrl: string): Promise<ActorOutput> {
    const html = await fetchUrl(propertyUrl, { timeout: 30000 });
    const doc = parseHtml(html);

    const details = {
      name: doc.querySelector('h1, [itemprop="name"]')?.textContent?.trim(),
      description: doc.querySelector('[itemprop="description"]')?.textContent?.trim(),
      price: this.extractPrice(doc),
      rating: this.extractRating(doc),
      reviewCount: this.extractReviewCount(doc),
      amenities: this.extractAmenities(doc),
      location: this.extractLocation(doc),
      images: this.extractImages(doc),
      host: this.extractHost(doc),
      houseRules: this.extractHouseRules(doc),
      cancellationPolicy: this.extractCancellationPolicy(doc),
    };

    return {
      success: true,
      data: details,
    };
  }

  private extractPrice(doc: Document): number | null {
    const priceEl = doc.querySelector('[data-testid="price"]');
    const match = priceEl?.textContent?.match(/₹([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : null;
  }

  private extractRating(doc: Document): number | null {
    const ratingEl = doc.querySelector('[aria-label*="rating"]');
    const match = ratingEl?.getAttribute('aria-label')?.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }

  private extractReviewCount(doc: Document): number | null {
    const countEl = doc.querySelector('[aria-label*="reviews"]');
    const match = countEl?.textContent?.match(/(\d+,?\d*)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : null;
  }

  private extractAmenities(doc: Document): string[] {
    const amenities: string[] = [];
    const amenityEls = doc.querySelectorAll('[data-testid="amenity-item"], .amenity-item');
    amenityEls.forEach((el) => {
      amenities.push(el.textContent?.trim() || '');
    });
    return amenities;
  }

  private extractLocation(doc: Document): string {
    return doc.querySelector('[data-testid="location-description"]')?.textContent?.trim() || '';
  }

  private extractImages(doc: Document): string[] {
    const images: string[] = [];
    const imgEls = doc.querySelectorAll('[data-testid="photo"] img, .photo img');
    imgEls.slice(0, 10).forEach((el) => {
      const src = el.getAttribute('src') || el.getAttribute('data-src');
      if (src) images.push(src);
    });
    return images;
  }

  private extractHost(doc: Document): any {
    return {
      name: doc.querySelector('.host-name')?.textContent?.trim(),
      since: doc.querySelector('.host-since')?.textContent?.trim(),
      responseRate: doc.querySelector('.response-rate')?.textContent?.trim(),
      responseTime: doc.querySelector('.response-time')?.textContent?.trim(),
      isSuperhost: doc.querySelector('.superhost-badge') !== null,
    };
  }

  private extractHouseRules(doc: Document): string[] {
    const rules: string[] = [];
    const ruleEls = doc.querySelectorAll('.house-rules-item, .cancellation-policy-item');
    ruleEls.forEach((el) => {
      rules.push(el.textContent?.trim() || '');
    });
    return rules;
  }

  private extractCancellationPolicy(doc: Document): string {
    return doc.querySelector('.cancellation-policy')?.textContent?.trim() || '';
  }

  private async getReviews(propertyUrl: string, limit: number): Promise<ActorOutput> {
    const reviewsUrl = `${propertyUrl}?section_index=0`;
    const html = await fetchUrl(reviewsUrl, { timeout: 30000 });
    const doc = parseHtml(html);

    const reviews: any[] = [];
    const reviewEls = doc.querySelectorAll('.review-item, [itemprop="review"]');

    reviewEls.slice(0, limit).forEach((el) => {
      const author = el.querySelector('.author-name')?.textContent?.trim();
      const rating = el.querySelector('.rating')?.textContent?.trim();
      const date = el.querySelector('.date')?.textContent?.trim();
      const text = el.querySelector('.review-text, [itemprop="reviewBody"]')?.textContent?.trim();

      if (author && text) {
        reviews.push({
          author,
          rating: rating ? parseFloat(rating) : null,
          date,
          text,
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

  private async analyzePricing(propertyUrl: string): Promise<ActorOutput> {
    const html = await fetchUrl(propertyUrl, { timeout: 30000 });

    // Analyze pricing patterns
    const nightlyRate = this.extractPrice(parseHtml(html));
    const monthlyRate = nightlyRate ? nightlyRate * 30 * 0.7 : null; // 30% discount for monthly
    const weeklyRate = nightlyRate ? nightlyRate * 7 * 0.85 : null; // 15% discount for weekly

    // Extract cleaning fee, service fee, etc.
    const cleaningFeeMatch = html.match(/Cleaning fee[:\s]*₹?([\d,]+)/i);
    const serviceFeeMatch = html.match(/Service fee[:\s]*₹?([\d,]+)/i);

    return {
      success: true,
      data: {
        nightly: nightlyRate,
        weekly: weeklyRate,
        monthly: monthlyRate,
        cleaningFee: cleaningFeeMatch ? parseInt(cleaningFeeMatch[1].replace(/,/g, '')) : null,
        serviceFee: serviceFeeMatch ? parseInt(serviceFeeMatch[1].replace(/,/g, '')) : null,
        recommendations: this.generatePricingRecommendations(nightlyRate),
      },
    };
  }

  private generatePricingRecommendations(price: number | null): string[] {
    if (!price) return [];

    const recommendations: string[] = [];

    // Dynamic pricing suggestions
    if (price < 2000) {
      recommendations.push('Consider weekend premium pricing (+20%)');
    }
    if (price > 10000) {
      recommendations.push('Add mid-week discounts to increase occupancy');
    }

    recommendations.push('Use seasonal pricing for holidays');
    recommendations.push('Consider minimum stay requirements during peak');

    return recommendations;
  }

  async validate(input: any): Promise<boolean> {
    return !!(input && (input.query || input.url));
  }
}

export default new AirbnbActor();
