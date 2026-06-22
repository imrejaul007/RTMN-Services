import { Brand, Review, Alert } from '../models/index.js';
import { reviewService } from './review.service.js';

// ============================================================================
// DEMO SERVICE - Sample Data Generation
// ============================================================================

export interface DemoDataConfig {
  brandId: string;
  tenantId: string;
  brandName: string;
  industry: string;
}

// Sample reviews for different industries
const HOTEL_REVIEWS = [
  { rating: 5, content: "Absolutely amazing stay! The staff went above and beyond. Room was spotless and the breakfast was delicious.", title: "Best hotel experience ever!" },
  { rating: 4, content: "Great location, helpful staff. The room was comfortable but could use some updates. Overall a pleasant stay.", title: "Good value for money" },
  { rating: 5, content: "The concierge was incredibly helpful with restaurant recommendations. Loved the rooftop bar with stunning views.", title: "Exceptional service" },
  { rating: 3, content: "Room was okay but the WiFi was very slow. Also had to wait 20 minutes for checkout.", title: "Average experience" },
  { rating: 1, content: "Terrible experience. The AC wasn't working and they refused to move us to another room. Would not recommend.", title: "Disappointing stay" },
  { rating: 5, content: "Perfect for a business trip. Fast WiFi, comfortable bed, and excellent room service.", title: "Great for business travelers" },
  { rating: 4, content: "Beautiful pool area and spa services. The massage was incredibly relaxing.", title: "Relaxing getaway" },
  { rating: 2, content: "Room was not ready at check-in time. Had to wait 2 hours. Staff apologized but the damage was done.", title: "Poor check-in experience" },
];

const RESTAURANT_REVIEWS = [
  { rating: 5, content: "The pasta was incredible! Best Italian food I've had in years. Will definitely come back.", title: "Amazing Italian cuisine" },
  { rating: 4, content: "Great ambiance and friendly service. The cocktails were creative and delicious.", title: "Perfect date night spot" },
  { rating: 5, content: "Best brunch in town! The eggs benedict and mimosas are to die for.", title: "Best brunch spot" },
  { rating: 3, content: "Food was good but portions are small for the price. Also a bit noisy.", title: "Good food, pricey" },
  { rating: 1, content: "Waited 45 minutes for a table that was not reserved. Service was slow and unfriendly.", title: "Poor service" },
  { rating: 5, content: "The chef's tasting menu was phenomenal. Every course was a masterpiece.", title: "Culinary masterpiece" },
  { rating: 4, content: "Vegan options were creative and tasty. Appreciated the allergen menu.", title: "Great for dietary needs" },
];

const RETAIL_REVIEWS = [
  { rating: 5, content: "Found exactly what I was looking for. Staff was knowledgeable and helped me choose the right size.", title: "Great shopping experience" },
  { rating: 4, content: "Good selection of products. The online ordering was smooth and pickup was quick.", title: "Convenient shopping" },
  { rating: 3, content: "Product quality was okay but packaging was damaged. Customer service resolved it eventually.", title: "Mixed experience" },
  { rating: 5, content: "Amazing loyalty program! Earned points fast and redeemed for great rewards.", title: "Love the rewards program" },
  { rating: 2, content: "Wrong item was shipped. Had to wait a week for replacement. Very frustrating.", title: "Shipping issues" },
];

const SOURCE_OPTIONS = ['google', 'yelp', 'tripadvisor', 'facebook', 'direct'] as const;
const AUTHOR_NAMES = [
  'Sarah M.', 'James K.', 'Emily R.', 'Michael S.', 'Lisa T.', 'David W.',
  'Jennifer L.', 'Robert H.', 'Amanda B.', 'Chris P.', 'Nina G.', 'Tom H.'
];

export class DemoService {
  /**
   * Generate sample brand with reviews
   */
  async generateDemoData(config: DemoDataConfig): Promise<{
    brand: any;
    reviews: number;
  }> {
    // Create brand
    const slug = config.brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const existingBrand = await Brand.findOne({ brandId: config.brandId });
    if (existingBrand) {
      return { brand: existingBrand, reviews: 0 };
    }

    const brand = await Brand.create({
      brandId: config.brandId,
      tenantId: config.tenantId,
      name: config.brandName,
      slug,
      industry: config.industry,
      website: `https://${slug}.com`,
      description: `Demo ${config.industry} brand for ${config.brandName}`,
      isActive: true,
      stats: {
        totalReviews: 0,
        averageRating: 0,
        sentimentScore: 0,
        positivePercent: 0,
        neutralPercent: 0,
        negativePercent: 0,
        lastUpdated: new Date()
      }
    });

    // Generate reviews
    const reviewCount = 25 + Math.floor(Math.random() * 15); // 25-40 reviews
    const reviews = await this.generateReviews(config.brandId, config.tenantId, config.industry, reviewCount);

    return { brand, reviews: reviews.length };
  }

  /**
   * Generate sample reviews
   */
  private async generateReviews(
    brandId: string,
    tenantId: string,
    industry: string,
    count: number
  ): Promise<any[]> {
    const templates = this.getReviewTemplates(industry);
    const reviews = [];

    for (let i = 0; i < count; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const daysAgo = Math.floor(Math.random() * 60); // Within last 60 days
      const publishedAt = new Date();
      publishedAt.setDate(publishedAt.getDate() - daysAgo);

      // Calculate sentiment from rating
      let sentimentLabel: 'positive' | 'neutral' | 'negative';
      let sentimentScore: number;
      if (template.rating >= 4) {
        sentimentLabel = 'positive';
        sentimentScore = 0.3 + (template.rating - 4) * 0.35;
      } else if (template.rating <= 2) {
        sentimentLabel = 'negative';
        sentimentScore = -0.3 - (3 - template.rating) * 0.35;
      } else {
        sentimentLabel = 'neutral';
        sentimentScore = 0;
      }

      reviews.push({
        brandId,
        tenantId,
        source: SOURCE_OPTIONS[Math.floor(Math.random() * SOURCE_OPTIONS.length)],
        content: template.content,
        title: template.title,
        rating: template.rating,
        author: {
          name: AUTHOR_NAMES[Math.floor(Math.random() * AUTHOR_NAMES.length)],
          isVerified: Math.random() > 0.7,
          reviewCount: Math.floor(Math.random() * 50)
        },
        publishedAt,
        moderation: {
          status: 'approved',
          flagged: false
        },
        sentiment: {
          score: sentimentScore,
          label: sentimentLabel,
          confidence: 0.7 + Math.random() * 0.3,
          aspects: [],
          keywords: []
        },
        engagement: {
          helpful: Math.floor(Math.random() * 20),
          shares: Math.floor(Math.random() * 5),
          clicks: Math.floor(Math.random() * 50)
        },
        metadata: {
          verified: Math.random() > 0.5,
          sponsored: Math.random() > 0.9,
          language: 'en'
        }
      });
    }

    // Bulk insert reviews
    if (reviews.length > 0) {
      await Review.insertMany(reviews);
    }

    return reviews;
  }

  /**
   * Get review templates by industry
   */
  private getReviewTemplates(industry: string): typeof HOTEL_REVIEWS {
    switch (industry.toLowerCase()) {
      case 'hotel':
      case 'hospitality':
      case 'travel':
        return HOTEL_REVIEWS;
      case 'restaurant':
      case 'food':
      case 'dining':
        return RESTAURANT_REVIEWS;
      case 'retail':
      case 'shopping':
      case 'e-commerce':
        return RETAIL_REVIEWS;
      default:
        return HOTEL_REVIEWS;
    }
  }

  /**
   * Reset demo data
   */
  async resetDemoData(brandId: string): Promise<void> {
    await Review.deleteMany({ brandId });
    await Alert.deleteMany({ brandId });
    await Brand.deleteOne({ brandId });
  }
}

export const demoService = new DemoService();
