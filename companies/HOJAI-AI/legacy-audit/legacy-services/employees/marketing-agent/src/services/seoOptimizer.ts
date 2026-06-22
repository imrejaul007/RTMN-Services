// ============================================
// HOJAI AI - SEO Optimizer Service
// ============================================

import { SEOOptimization, ISEOOptimizationDocument } from '../models';
import {
  SEOContentType,
  ISEOOptimization
} from '../types';
import { logger } from '../utils/logger';

export interface SEOConfig {
  maxTitleLength: number;
  maxDescriptionLength: number;
  minKeywordDensity: number;
  maxKeywordDensity: number;
}

export class SEOOptimizerService {
  private config: SEOConfig;

  constructor(config?: Partial<SEOConfig>) {
    this.config = {
      maxTitleLength: config?.maxTitleLength || 60,
      maxDescriptionLength: config?.maxDescriptionLength || 160,
      minKeywordDensity: config?.minKeywordDensity || 0.5,
      maxKeywordDensity: config?.maxKeywordDensity || 3.0
    };
  }

  /**
   * Optimize content for SEO
   */
  async optimize(
    tenantId: string,
    params: {
      url?: string;
      content?: string;
      type?: SEOContentType;
      targetKeywords: string[];
      competitorUrls?: string[];
      metaTitle?: string;
      metaDescription?: string;
    }
  ): Promise<{
    metaTitle: string;
    metaDescription: string;
    suggestions: string[];
    contentScore: number;
    keywordDensity: Record<string, number>;
    headings?: {
      h1: string[];
      h2: string[];
      h3: string[];
    };
    optimizedContent?: string;
  }> {
    logger.info('Optimizing SEO', { tenantId, keywords: params.targetKeywords });

    // Extract current content if URL provided
    let content = params.content;
    if (!content && params.url) {
      // In production, fetch and parse the URL
      content = 'Content from URL would be fetched here';
    }

    // Generate meta title
    const metaTitle = params.metaTitle || this.generateMetaTitle(
      params.targetKeywords[0],
      params.type || SEOContentType.BLOG
    );

    // Generate meta description
    const metaDescription = params.metaDescription || this.generateMetaDescription(
      params.targetKeywords,
      content
    );

    // Calculate keyword density
    const keywordDensity = this.calculateKeywordDensity(content || '', params.targetKeywords);

    // Calculate content score
    const contentScore = this.calculateContentScore(content || '', params.targetKeywords, params.type || SEOContentType.BLOG);

    // Generate suggestions
    const suggestions = this.generateSuggestions(
      content || '',
      params.targetKeywords,
      keywordDensity,
      metaTitle,
      metaDescription
    );

    // Generate optimized headings
    const headings = this.generateHeadings(params.targetKeywords, params.type || SEOContentType.BLOG);

    // Generate optimized content if content provided
    let optimizedContent: string | undefined;
    if (content) {
      optimizedContent = this.optimizeContent(content, params.targetKeywords, headings);
    }

    // Store optimization result
    const doc = await SEOOptimization.create({
      tenantId,
      url: params.url,
      type: params.type || SEOContentType.BLOG,
      targetKeywords: params.targetKeywords,
      metaTitle,
      metaDescription,
      headings,
      contentScore,
      keywordDensity,
      suggestions,
      originalContent: content,
      optimizedContent
    });

    logger.info('SEO optimization stored', { tenantId, optimizationId: doc._id });

    return {
      metaTitle: metaTitle.substring(0, this.config.maxTitleLength),
      metaDescription: metaDescription.substring(0, this.config.maxDescriptionLength),
      suggestions,
      contentScore,
      keywordDensity,
      headings,
      optimizedContent
    };
  }

  /**
   * Generate meta title
   */
  private generateMetaTitle(primaryKeyword: string, type: SEOContentType): string {
    const templates: Record<SEOContentType, string[]> = {
      [SEOContentType.BLOG]: [
        `${primaryKeyword}: Complete Guide & Best Practices [2026]`,
        `The Ultimate ${primaryKeyword} Guide for Success`,
        `How to Master ${primaryKeyword} - Step by Step`
      ],
      [SEOContentType.LANDING_PAGE]: [
        `${primaryKeyword} - Transform Your Business Today`,
        `Get Started with ${primaryKeyword} | Free Trial`,
        `The Best ${primaryKeyword} Solution for Enterprises`
      ],
      [SEOContentType.PRODUCT_PAGE]: [
        `${primaryKeyword} | Premium Quality`,
        `Buy ${primaryKeyword} - Best Price Guaranteed`,
        `${primaryKeyword} - Features, Pricing & Reviews`
      ],
      [SEOContentType.CATEGORY_PAGE]: [
        `${primaryKeyword} - Browse Our Collection`,
        `Explore ${primaryKeyword} | Wide Selection`,
        `Discover ${primaryKeyword} - Quality Guaranteed`
      ],
      [SEOContentType.FAQ]: [
        `${primaryKeyword} - Frequently Asked Questions`,
        `Your ${primaryKeyword} Questions Answered`,
        `${primaryKeyword} Help & FAQ`
      ]
    };

    const templatesForType = templates[type] || templates[SEOContentType.BLOG];
    return templatesForType[Math.floor(Math.random() * templatesForType.length)];
  }

  /**
   * Generate meta description
   */
  private generateMetaDescription(keywords: string[], content?: string): string {
    const primaryKeyword = keywords[0] || 'our services';

    const templates = [
      `Discover everything you need to know about ${primaryKeyword}. Expert insights, practical tips, and comprehensive guides to help you succeed in 2026.`,
      `Learn how to effectively use ${primaryKeyword} to achieve your goals. Our comprehensive guide covers strategies, best practices, and real-world examples.`,
      `Get started with ${primaryKeyword} today. This complete guide provides actionable insights and proven techniques for success.`,
      `Master ${primaryKeyword} with our in-depth resources. From beginner to advanced, find everything you need to know here.`
    ];

    // Extract relevant snippet from content if available
    if (content && content.length > 50) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      if (sentences.length > 0) {
        const snippet = sentences[0].trim();
        if (snippet.length <= this.config.maxDescriptionLength) {
          return snippet;
        }
        return snippet.substring(0, this.config.maxDescriptionLength - 3) + '...';
      }
    }

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Calculate keyword density
   */
  private calculateKeywordDensity(content: string, keywords: string[]): Record<string, number> {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const density: Record<string, number> = {};

    if (wordCount === 0) return density;

    keywords.forEach(keyword => {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = content.toLowerCase().match(regex);
      const count = matches ? matches.length : 0;
      density[keyword] = Math.round((count / wordCount) * 100 * 100) / 100; // Percentage with 2 decimal places
    });

    return density;
  }

  /**
   * Calculate content score
   */
  private calculateContentScore(
    content: string,
    keywords: string[],
    type: SEOContentType
  ): number {
    let score = 0;

    // Word count (different thresholds for different types)
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const minWords: Record<SEOContentType, number> = {
      [SEOContentType.BLOG]: 300,
      [SEOContentType.LANDING_PAGE]: 150,
      [SEOContentType.PRODUCT_PAGE]: 100,
      [SEOContentType.CATEGORY_PAGE]: 200,
      [SEOContentType.FAQ]: 150
    };

    const required = minWords[type] || 300;
    if (wordCount >= required) {
      score += 25;
    } else if (wordCount >= required * 0.5) {
      score += 15;
    } else {
      score += 5;
    }

    // Keyword usage
    const keywordDensity = this.calculateKeywordDensity(content, keywords);
    let keywordsUsed = 0;
    Object.values(keywordDensity).forEach(density => {
      if (density >= this.config.minKeywordDensity && density <= this.config.maxKeywordDensity) {
        keywordsUsed++;
      }
    });
    score += (keywordsUsed / keywords.length) * 25;

    // Headings structure
    const hasH1 = content.includes('# ') || content.includes('<h1');
    const hasH2 = content.includes('## ') || content.includes('<h2');
    const hasH3 = content.includes('### ') || content.includes('<h3');

    if (hasH1) score += 10;
    if (hasH2) score += 10;
    if (hasH3) score += 5;

    // Content structure (lists)
    const hasLists = content.includes('- ') || content.includes('* ') || content.includes('<ul');
    if (hasLists) score += 10;

    // Internal/external links
    const hasLinks = content.includes('[') && content.includes('](');
    if (hasLinks) score += 10;

    // Images (placeholder)
    const hasImages = content.includes('![') || content.includes('<img');
    if (hasImages) score += 5;

    return Math.min(100, Math.round(score));
  }

  /**
   * Generate SEO suggestions
   */
  private generateSuggestions(
    content: string,
    keywords: string[],
    keywordDensity: Record<string, number>,
    metaTitle: string,
    metaDescription: string
  ): string[] {
    const suggestions: string[] = [];

    // Check meta title
    if (metaTitle.length > this.config.maxTitleLength) {
      suggestions.push(`Meta title is too long (${metaTitle.length} chars). Keep it under ${this.config.maxTitleLength} characters.`);
    }

    // Check meta description
    if (metaDescription.length > this.config.maxDescriptionLength) {
      suggestions.push(`Meta description is too long (${metaDescription.length} chars). Keep it under ${this.config.maxDescriptionLength} characters.`);
    }

    // Check keyword density
    keywords.forEach(keyword => {
      const density = keywordDensity[keyword] || 0;
      if (density < this.config.minKeywordDensity) {
        suggestions.push(`Keyword "${keyword}" density is low (${density}%). Aim for ${this.config.minKeywordDensity}-${this.config.maxKeywordDensity}%.`);
      } else if (density > this.config.maxKeywordDensity) {
        suggestions.push(`Keyword "${keyword}" is overused (${density}%). Reduce to avoid keyword stuffing.`);
      }
    });

    // Check content length
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 300) {
      suggestions.push(`Content is short (${wordCount} words). Aim for at least 300 words for better SEO.`);
    }

    // Check headings
    if (!content.includes('# ') && !content.includes('<h1')) {
      suggestions.push('Add H1 heading to structure your content.');
    }
    if (!content.includes('## ') && !content.includes('<h2')) {
      suggestions.push('Add H2 subheadings to improve readability.');
    }

    // Check lists
    if (!content.includes('- ') && !content.includes('* ') && !content.includes('<ul')) {
      suggestions.push('Add bullet or numbered lists to improve readability.');
    }

    // Check links
    if (!content.includes('[') || !content.includes('](')) {
      suggestions.push('Add internal and external links to related content.');
    }

    // Check images
    if (!content.includes('![') && !content.includes('<img')) {
      suggestions.push('Add relevant images with alt text for better engagement.');
    }

    // Positive suggestions
    if (suggestions.length === 0) {
      suggestions.push('Great job! Your content follows SEO best practices.');
    }

    return suggestions;
  }

  /**
   * Generate heading structure
   */
  private generateHeadings(keywords: string[], type: SEOContentType): {
    h1: string[];
    h2: string[];
    h3: string[];
  } {
    const primaryKeyword = keywords[0] || 'Topic';
    const secondaryKeywords = keywords.slice(1, 4);

    const headings: Record<SEOContentType, {
      h1: string[];
      h2: string[];
      h3: string[];
    }> = {
      [SEOContentType.BLOG]: {
        h1: [`Complete Guide to ${primaryKeyword}`],
        h2: [
          `What is ${primaryKeyword}?`,
          `Why ${primaryKeyword} Matters`,
          `Getting Started with ${primaryKeyword}`,
          ...secondaryKeywords.map(k => `Understanding ${k}`),
          `Best Practices for ${primaryKeyword}`,
          `Common Mistakes to Avoid`,
          `Conclusion`
        ],
        h3: [
          `Key Benefits`,
          `Step-by-Step Process`,
          `Tips and Tricks`,
          `Examples and Case Studies`
        ]
      },
      [SEOContentType.LANDING_PAGE]: {
        h1: [`${primaryKeyword} - Your Solution`],
        h2: [
          `Why Choose ${primaryKeyword}?`,
          `Key Features`,
          `How It Works`,
          `Testimonials`,
          `Get Started Today`
        ],
        h3: [
          `Feature 1`,
          `Feature 2`,
          `Feature 3`
        ]
      },
      [SEOContentType.PRODUCT_PAGE]: {
        h1: [`${primaryKeyword} - Product Details`],
        h2: [
          `Product Overview`,
          `Features & Specifications`,
          `Pricing`,
          `Reviews`,
          `Related Products`
        ],
        h3: [
          `Technical Specs`,
          `Customer Reviews`
        ]
      },
      [SEOContentType.CATEGORY_PAGE]: {
        h1: [`Browse ${primaryKeyword}`],
        h2: [
          `Popular ${primaryKeyword}`,
          `New Arrivals`,
          `Top Rated`,
          `On Sale`
        ],
        h3: []
      },
      [SEOContentType.FAQ]: {
        h1: [`${primaryKeyword} - FAQ`],
        h2: [
          `General Questions`,
          `Getting Started`,
          `Troubleshooting`,
          `Contact Support`
        ],
        h3: []
      }
    };

    return headings[type] || headings[SEOContentType.BLOG];
  }

  /**
   * Optimize content with headings and structure
   */
  private optimizeContent(
    content: string,
    keywords: string[],
    headings: { h1: string[]; h2: string[]; h3: string[] }
  ): string {
    let optimized = content;

    // Add H1 if not present
    if (!optimized.includes('# ') && !optimized.includes('<h1')) {
      const h1 = headings.h1[0] || keywords[0];
      optimized = `# ${h1}\n\n${optimized}`;
    }

    // Add section breaks and structure
    if (!optimized.includes('## ')) {
      const h2Sections = headings.h2.slice(0, 3).map(h => `## ${h}\n\nSection content here.\n`);
      optimized += '\n\n' + h2Sections.join('\n');
    }

    return optimized;
  }

  /**
   * Get SEO analysis for URL
   */
  async analyzeUrl(
    tenantId: string,
    url: string
  ): Promise<ISEOOptimization | null> {
    const doc = await SEOOptimization.findOne({ tenantId, url });
    if (!doc) return null;
    return this.mapToISEOOptimization(doc);
  }

  /**
   * List SEO optimizations
   */
  async listOptimizations(
    tenantId: string,
    filters: {
      type?: SEOContentType;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: ISEOOptimization[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };
    if (filters.type) query.type = filters.type;

    const [docs, total] = await Promise.all([
      SEOOptimization.find(query)
        .sort({ createdAt: -1 })
        .skip(filters.offset || 0)
        .limit(filters.limit || 20)
        .lean(),
      SEOOptimization.countDocuments(query)
    ]);

    return {
      items: docs.map(doc => this.mapToISEOOptimization(doc)),
      total
    };
  }

  /**
   * Map document to interface
   */
  private mapToISEOOptimization(doc: any): ISEOOptimization {
    return {
      id: doc._id?.toString() || '',
      tenantId: doc.tenantId || '',
      url: doc.url,
      type: doc.type || SEOContentType.BLOG,
      targetKeywords: doc.targetKeywords || [],
      metaTitle: doc.metaTitle,
      metaDescription: doc.metaDescription,
      headings: doc.headings,
      contentScore: doc.contentScore,
      keywordDensity: doc.keywordDensity,
      suggestions: doc.suggestions || [],
      optimizedContent: doc.optimizedContent,
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date()
    };
  }
}

// Export singleton instance
export const seoOptimizer = new SEOOptimizerService();
