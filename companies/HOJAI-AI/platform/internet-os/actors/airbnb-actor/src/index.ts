/**
 * Airbnb Actor
 * Property and hospitality data extraction
 */

// @ts-ignore - Using local actor-runtime
import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/dist/index.js';
import type { CheerioAPI } from 'cheerio';

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
    const $ = parseHtml(html);

    // Parse search results (Airbnb uses dynamic rendering, so this is a simplified version)
    const cards = $('[itemprop="url"], .listing-card');

    cards.slice(0, limit).each((_, card) => {
      const name = $(card).find('[itemprop="name"], .listing-title').first().text().trim();
      const priceEl = $(card).find('[data-testid="price-item"], .price').first();
      const priceMatch = priceEl.text().match(/₹([\d,]+)/);
      const rating = $(card).find('[aria-label*="stars"]').text().trim();
      const locationText = $(card).find('.location-text, [itemprop="address"]').first().text().trim();

      if (name) {
        properties.push({
          name,
          price: priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null,
          rating: rating ? parseFloat(rating.match(/(\d+\.?\d*)/)?.[1] || '0') : null,
          location: locationText,
          url: $(card).find('a').attr('href'),
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
    const $ = parseHtml(html);

    const details = {
      name: $('h1, [itemprop="name"]').first().text().trim(),
      description: $('[itemprop="description"]').first().text().trim(),
      price: this.extractPrice($),
      rating: this.extractRating($),
      reviewCount: this.extractReviewCount($),
      amenities: this.extractAmenities($),
      location: this.extractLocation($),
      images: this.extractImages($),
      host: this.extractHost($),
      houseRules: this.extractHouseRules($),
      cancellationPolicy: this.extractCancellationPolicy($),
    };

    return {
      success: true,
      data: details,
    };
  }

  private extractPrice($: CheerioAPI): number | null {
    const priceEl = $('[data-testid="price"]');
    const match = priceEl.text().match(/₹([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : null;
  }

  private extractRating($: CheerioAPI): number | null {
    const ratingEl = $('[aria-label*="rating"]');
    const match = ratingEl.attr('aria-label')?.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }

  private extractReviewCount($: CheerioAPI): number | null {
    const countEl = $('[aria-label*="reviews"]');
    const match = countEl.text().match(/(\d+,?\d*)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : null;
  }

  private extractAmenities($: CheerioAPI): string[] {
    const amenities: string[] = [];
    const amenityEls = $('[data-testid="amenity-item"], .amenity-item');
    amenityEls.each((_, el) => {
      amenities.push($(el).text().trim());
    });
    return amenities;
  }

  private extractLocation($: CheerioAPI): string {
    return $('[data-testid="location-description"]').text().trim() || '';
  }

  private extractImages($: CheerioAPI): string[] {
    const images: string[] = [];
    const imgEls = $('[data-testid="photo"] img, .photo img');
    imgEls.slice(0, 10).each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) images.push(src);
    });
    return images;
  }

  private extractHost($: CheerioAPI): any {
    return {
      name: $('.host-name').text().trim(),
      since: $('.host-since').text().trim(),
      responseRate: $('.response-rate').text().trim(),
      responseTime: $('.response-time').text().trim(),
      isSuperhost: $('.superhost-badge').length > 0,
    };
  }

  private extractHouseRules($: CheerioAPI): string[] {
    const rules: string[] = [];
    const ruleEls = $('.house-rules-item, .cancellation-policy-item');
    ruleEls.each((_, el) => {
      rules.push($(el).text().trim());
    });
    return rules;
  }

  private extractCancellationPolicy($: CheerioAPI): string {
    return $('.cancellation-policy').text().trim() || '';
  }

  private async getReviews(propertyUrl: string, limit: number): Promise<ActorOutput> {
    const reviewsUrl = `${propertyUrl}?section_index=0`;
    const html = await fetchUrl(reviewsUrl, { timeout: 30000 });
    const $ = parseHtml(html);

    const reviews: any[] = [];
    const reviewEls = $('.review-item, [itemprop="review"]');

    reviewEls.slice(0, limit).each((_, el) => {
      const author = $(el).find('.author-name').text().trim();
      const rating = $(el).find('.rating').text().trim();
      const date = $(el).find('.date').text().trim();
      const text = $(el).find('.review-text, [itemprop="reviewBody"]').text().trim();

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
    const $ = parseHtml(html);
    const nightlyRate = this.extractPrice($);
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
