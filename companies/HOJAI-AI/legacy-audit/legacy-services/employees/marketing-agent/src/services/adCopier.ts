// ============================================
// HOJAI AI - Ad Copier Service
// ============================================

import { AdCopy, IAdCopyDocument } from '../models';
import {
  AdType,
  SocialPlatform,
  IAdCopy
} from '../types';
import { logger } from '../utils/logger';

export interface AdCopierConfig {
  maxHeadlines: number;
  maxDescriptions: number;
  defaultPlatform: SocialPlatform;
}

export class AdCopierService {
  private config: AdCopierConfig;

  constructor(config?: Partial<AdCopierConfig>) {
    this.config = {
      maxHeadlines: config?.maxHeadlines || 10,
      maxDescriptions: config?.maxDescriptions || 5,
      defaultPlatform: config?.defaultPlatform || SocialPlatform.LINKEDIN
    };
  }

  /**
   * Generate ad copy based on product and requirements
   */
  async generateAdCopy(
    tenantId: string,
    params: {
      adType: AdType;
      productName: string;
      productDescription?: string;
      targetAudience?: string;
      headlineOptions?: number;
      descriptionOptions?: number;
      cta?: string;
      keywords?: string[];
      platform?: SocialPlatform;
    }
  ): Promise<{
    headlines: string[];
    descriptions: string[];
    callToActions: string[];
    body?: string;
  }> {
    logger.info('Generating ad copy', { tenantId, adType: params.adType, product: params.productName });

    const numHeadlines = Math.min(params.headlineOptions || 3, this.config.maxHeadlines);
    const numDescriptions = Math.min(params.descriptionOptions || 2, this.config.maxDescriptions);
    const platform = params.platform || this.config.defaultPlatform;

    // Generate headlines based on ad type
    const headlines = this.generateHeadlines(
      params.adType,
      params.productName,
      params.targetAudience,
      params.keywords,
      numHeadlines
    );

    // Generate descriptions
    const descriptions = this.generateDescriptions(
      params.adType,
      params.productName,
      params.productDescription,
      params.targetAudience,
      numDescriptions,
      platform
    );

    // Generate call-to-actions
    const callToActions = this.generateCTAs(params.adType, params.cta);

    // Generate body copy
    const body = this.generateBody(
      params.adType,
      params.productName,
      params.productDescription,
      params.targetAudience
    );

    // Store ad copy
    await AdCopy.create({
      tenantId,
      adType: params.adType,
      platform,
      productName: params.productName,
      productDescription: params.productDescription,
      targetAudience: params.targetAudience,
      headlines,
      descriptions,
      callToActions,
      body,
      keywords: params.keywords || []
    });

    return {
      headlines,
      descriptions,
      callToActions,
      body
    };
  }

  /**
   * Generate headlines based on ad type
   */
  private generateHeadlines(
    adType: AdType,
    productName: string,
    targetAudience?: string,
    keywords?: string[],
    count: number = 3
  ): string[] {
    const headlineTemplates: Record<AdType, string[]> = {
      [AdType.SEARCH]: [
        `${productName} - Official Site`,
        `Best ${productName} | Free Trial`,
        `${productName} - Compare Prices`,
        `Get ${productName} Today`,
        `${productName} Reviews & Ratings`
      ],
      [AdType.DISPLAY]: [
        `Discover ${productName}`,
        `Transform Your Business with ${productName}`,
        `The Future is ${productName}`,
        `Unlock Your Potential with ${productName}`,
        `${productName} - Game Changer`
      ],
      [AdType.SOCIAL]: [
        `Why ${productName} is Worth It`,
        `Why Smart Businesses Choose ${productName}`,
        `${productName} - The Smart Choice`,
        `Join Thousands Using ${productName}`,
        `${productName}: What You Need to Know`
      ],
      [AdType.VIDEO]: [
        `See ${productName} in Action`,
        `Watch: How ${productName} Works`,
        `${productName} Demo Video`,
        `30-Second ${productName} Overview`,
        `Experience ${productName}`
      ],
      [AdType.NATIVE]: [
        `I Tried ${productName} - Here's What Happened`,
        `${productName}: A Game-Changer`,
        `Why Everyone's Talking About ${productName}`,
        `The Truth About ${productName}`,
        `${productName} Changed Everything`
      ],
      [AdType.SEARCH_GENERATION]: [
        `${productName} Solutions`,
        `${productName} - Find What You Need`,
        `Shop ${productName} Online`,
        `${productName} - Browse & Compare`,
        `${productName} Near You`
      ]
    };

    let templates = headlineTemplates[adType] || headlineTemplates[AdType.DISPLAY];

    // Add audience-specific variations
    if (targetAudience) {
      templates = templates.map(t => {
        if (t.includes('Your') || t.includes('your')) {
          return t.replace('Your', targetAudience);
        }
        return t;
      });
    }

    // Add keyword-based variations
    if (keywords && keywords.length > 0) {
      const keyword = keywords[0];
      templates.push(`${productName} for ${keyword}`);
      templates.push(`${keyword} Solution: ${productName}`);
    }

    // Shuffle and return requested count
    const shuffled = this.shuffleArray([...templates]);
    return shuffled.slice(0, count);
  }

  /**
   * Generate descriptions based on ad type and platform
   */
  private generateDescriptions(
    adType: AdType,
    productName: string,
    productDescription?: string,
    targetAudience?: string,
    count: number = 2,
    platform?: SocialPlatform
  ): string[] {
    const baseDescription = productDescription || `Discover how ${productName} can help you achieve your goals.`;

    const platformLimits: Record<string, number> = {
      'twitter': 80,
      'linkedin': 150,
      'facebook': 125,
      'instagram': 125,
      'youtube': 5000,
      'tiktok': 150,
      'threads': 150,
      'reddit': 300
    };

    const charLimit = platform ? (platformLimits[platform] || 150) : 150;

    const templates: Record<AdType, string[]> = {
      [AdType.SEARCH]: [
        `Get instant access to ${productName}. Start your free trial today and see results.`,
        `Join 10,000+ users choosing ${productName} for better results. Try free.`,
        `Professional ${productName} solution. Sign up now for exclusive pricing.`,
        `Trusted by industry leaders. Discover ${productName} today.`
      ],
      [AdType.DISPLAY]: [
        `${productName} helps you work smarter, not harder. Try it free today.`,
        `Transform your workflow with ${productName}. No credit card required.`,
        `${productName} - The all-in-one solution you've been looking for.`,
        `Simple, powerful, affordable. That's ${productName}.`
      ],
      [AdType.SOCIAL]: [
        baseDescription,
        `${productName} is changing the game. Here's what makes it different.`,
        `Don't take our word for it. See why ${productName} is trending.`,
        `The secret weapon successful teams use: ${productName}.`
      ],
      [AdType.VIDEO]: [
        `See how ${productName} works in this quick overview.`,
        `From setup to results in under 2 minutes with ${productName}.`,
        `Learn why ${productName} is the #1 choice for professionals.`,
        `Everything you need to know about ${productName} in one video.`
      ],
      [AdType.NATIVE]: [
        `We tested ${productName} for 30 days. Here's our honest review.`,
        `Is ${productName} worth the hype? We found out.`,
        `Why ${productName} might be exactly what you need.`,
        `The real story behind ${productName}.`
      ],
      [AdType.SEARCH_GENERATION]: [
        `Shop ${productName} - Best selection and prices.`,
        `Find ${productName} near you. Local and online options.`,
        `Compare ${productName} prices from top retailers.`
      ]
    };

    let descriptions = templates[adType] || templates[AdType.DISPLAY];

    // Truncate to platform limit
    descriptions = descriptions.map(d => {
      if (d.length > charLimit) {
        return d.substring(0, charLimit - 3) + '...';
      }
      return d;
    });

    const shuffled = this.shuffleArray([...descriptions]);
    return shuffled.slice(0, count);
  }

  /**
   * Generate call-to-action variations
   */
  private generateCTAs(adType: AdType, customCTA?: string): string[] {
    const ctaTemplates: Record<AdType, string[]> = {
      [AdType.SEARCH]: [
        'Get Started Free',
        'Start Free Trial',
        'Get a Quote',
        'Learn More',
        'Shop Now'
      ],
      [AdType.DISPLAY]: [
        'Try It Free',
        'Get Started',
        'Learn More',
        'Sign Up Today',
        'Start Now'
      ],
      [AdType.SOCIAL]: [
        'Learn More',
        'See How It Works',
        'Get Started',
        'Join Now',
        'Try for Free'
      ],
      [AdType.VIDEO]: [
        'Watch Demo',
        'See More',
        'Try Free',
        'Get Started',
        'Learn More'
      ],
      [AdType.NATIVE]: [
        'Read More',
        'See Full Story',
        'Try It',
        'Learn More',
        'See Why'
      ],
      [AdType.SEARCH_GENERATION]: [
        'Shop Now',
        'Find Near You',
        'Compare Prices',
        'View Options',
        'See Results'
      ]
    };

    const ctas = customCTA
      ? [customCTA, ...ctaTemplates[adType] || ctaTemplates[AdType.DISPLAY]]
      : ctaTemplates[adType] || ctaTemplates[AdType.DISPLAY];

    return [...new Set(ctas)].slice(0, 5);
  }

  /**
   * Generate body copy
   */
  private generateBody(
    adType: AdType,
    productName: string,
    productDescription?: string,
    targetAudience?: string
  ): string | undefined {
    const audience = targetAudience ? ` for ${targetAudience}` : '';

    const bodies: Record<AdType, string> = {
      [AdType.SEARCH]: `Discover ${productName}${audience}. Get started with a free trial today.`,

      [AdType.DISPLAY]: `${productName} delivers results that matter.

• Easy to use
• Powerful features
• Affordable pricing
• Trusted by thousands

Start your free trial today.`,

      [AdType.SOCIAL]: `What makes ${productName} different?

• Designed for real results
• Backed by customer success stories
• Continuously improving with updates
• Support when you need it

Try ${productName} free for 14 days.`,

      [AdType.VIDEO]: `In this video, you'll discover:
- How ${productName} works
- Real customer success stories
- Key features and benefits
- Getting started tips

Watch to learn more about ${productName}.`,

      [AdType.NATIVE]: `${productName} - Worth the Hype?

We spent 30 days testing ${productName}${audience}. Here's what we found.

The good, the bad, and whether it's worth your time.

Read our full review to decide for yourself.`,

      [AdType.SEARCH_GENERATION]: `${productName} available now.

Browse our full selection and find the perfect option for your needs.

Free shipping on orders over $50.`
    };

    return bodies[adType] || bodies[AdType.DISPLAY];
  }

  /**
   * Get ad copy by ID
   */
  async getAdCopy(tenantId: string, adCopyId: string): Promise<IAdCopy | null> {
    const doc = await AdCopy.findOne({ _id: adCopyId, tenantId });
    if (!doc) return null;
    return this.mapToIAdCopy(doc);
  }

  /**
   * List ad copies
   */
  async listAdCopies(
    tenantId: string,
    filters: {
      adType?: AdType;
      platform?: SocialPlatform;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: IAdCopy[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };

    if (filters.adType) query.adType = filters.adType;
    if (filters.platform) query.platform = filters.platform;

    const [docs, total] = await Promise.all([
      AdCopy.find(query)
        .sort({ createdAt: -1 })
        .skip(filters.offset || 0)
        .limit(filters.limit || 20)
        .lean(),
      AdCopy.countDocuments(query)
    ]);

    return {
      items: docs.map(doc => this.mapToIAdCopy(doc)),
      total
    };
  }

  /**
   * Get A/B test variations
   */
  async generateABVariations(
    tenantId: string,
    params: {
      adType: AdType;
      productName: string;
      productDescription?: string;
      targetAudience?: string;
      variations?: number;
    }
  ): Promise<Array<{
    variationId: string;
    headlines: string[];
    descriptions: string[];
    callToActions: string[];
  }>> {
    logger.info('Generating A/B variations', { tenantId, product: params.productName });

    const numVariations = params.variations || 3;
    const variations: Array<{
      variationId: string;
      headlines: string[];
      descriptions: string[];
      callToActions: string[];
    }> = [];

    for (let i = 0; i < numVariations; i++) {
      const variation = await this.generateAdCopy(tenantId, {
        adType: params.adType,
        productName: params.productName,
        productDescription: params.productDescription,
        targetAudience: params.targetAudience,
        headlineOptions: 2,
        descriptionOptions: 1,
        cta: i === 0 ? 'Get Started' : i === 1 ? 'Try Free' : 'Learn More'
      });

      variations.push({
        variationId: `var_${Date.now()}_${i}`,
        headlines: variation.headlines,
        descriptions: variation.descriptions,
        callToActions: variation.callToActions
      });
    }

    return variations;
  }

  /**
   * Get platform-specific ad copy
   */
  async getPlatformAdCopy(
    tenantId: string,
    platform: SocialPlatform,
    adType?: AdType
  ): Promise<IAdCopy[]> {
    const query: Record<string, unknown> = { tenantId, platform };
    if (adType) query.adType = adType;

    const docs = await AdCopy.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return docs.map(doc => this.mapToIAdCopy(doc));
  }

  /**
   * Duplicate ad copy for new platform
   */
  async duplicateAdCopy(
    tenantId: string,
    adCopyId: string,
    newPlatform: SocialPlatform
  ): Promise<IAdCopy | null> {
    const original = await AdCopy.findOne({ _id: adCopyId, tenantId });
    if (!original) return null;

    const duplicated = await AdCopy.create({
      tenantId,
      adType: original.adType,
      platform: newPlatform,
      productName: original.productName,
      productDescription: original.productDescription,
      targetAudience: original.targetAudience,
      headlines: original.headlines,
      descriptions: original.descriptions.map(d => {
        // Truncate for Twitter limit
        if (newPlatform === SocialPlatform.TWITTER && d.length > 80) {
          return d.substring(0, 77) + '...';
        }
        return d;
      }),
      callToActions: original.callToActions,
      body: original.body,
      keywords: original.keywords
    });

    return this.mapToIAdCopy(duplicated);
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Map document to interface
   */
  private mapToIAdCopy(doc: any): IAdCopy {
    return {
      id: doc._id?.toString() || '',
      tenantId: doc.tenantId || '',
      adType: doc.adType,
      platform: doc.platform,
      productName: doc.productName || '',
      productDescription: doc.productDescription,
      targetAudience: doc.targetAudience,
      headlines: doc.headlines || [],
      descriptions: doc.descriptions || [],
      callToActions: doc.callToActions || [],
      body: doc.body,
      displayUrl: doc.displayUrl,
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date()
    };
  }
}

// Export singleton instance
export const adCopier = new AdCopierService();
