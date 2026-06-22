// ============================================
// HOJAI AI - Content Generator Service
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { Content, IContentDocument } from '../models';
import {
  ContentType,
  ContentStatus,
  ContentTone,
  IContent,
  ContentGenerationContext
} from '../types';
import { logger } from '../utils/logger';

export interface ContentGeneratorConfig {
  defaultTone: ContentTone;
  maxContentLength: number;
  enableSEOptimization: boolean;
  enableReadabilityCheck: boolean;
}

export class ContentGeneratorService {
  private config: ContentGeneratorConfig;

  constructor(config?: Partial<ContentGeneratorConfig>) {
    this.config = {
      defaultTone: config?.defaultTone || ContentTone.PROFESSIONAL,
      maxContentLength: config?.maxContentLength || 5000,
      enableSEOptimization: config?.enableSEOptimization ?? true,
      enableReadabilityCheck: config?.enableReadabilityCheck ?? true
    };
  }

  /**
   * Generate content based on type and requirements
   */
  async generateContent(
    tenantId: string,
    userId: string,
    params: {
      type: ContentType;
      topic: string;
      keywords?: string[];
      targetAudience?: string;
      tone?: ContentTone;
      length?: 'short' | 'medium' | 'long';
      brandVoice?: string;
      cta?: string;
      additionalContext?: string;
    }
  ): Promise<{
    content: string;
    metadata: {
      wordCount: number;
      readabilityScore: number;
      seoScore: number;
      suggestedKeywords: string[];
      hashtags: string[];
    };
  }> {
    logger.info('Generating content', { tenantId, type: params.type, topic: params.topic });

    const tone = params.tone || this.config.defaultTone;
    const length = params.length || 'medium';

    // Generate content based on type
    let content = await this.generateContentByType(
      params.type,
      params.topic,
      tone,
      length,
      params.additionalContext
    );

    // Apply brand voice if provided
    if (params.brandVoice) {
      content = this.applyBrandVoice(content, params.brandVoice);
    }

    // Add CTA if provided
    if (params.cta) {
      content = this.addCTA(content, params.cta, params.type);
    }

    // Calculate word count
    const wordCount = this.countWords(content);

    // Calculate readability score
    const readabilityScore = this.calculateReadabilityScore(content);

    // Generate suggested keywords
    const suggestedKeywords = this.generateKeywords(content, params.keywords || []);

    // Generate SEO score
    const seoScore = this.calculateSEOScore(content, suggestedKeywords);

    // Generate hashtags
    const hashtags = this.generateHashtags(params.topic, params.keywords || []);

    // Store content
    await this.storeContent(tenantId, userId, params, content, wordCount, readabilityScore, seoScore);

    return {
      content,
      metadata: {
        wordCount,
        readabilityScore,
        seoScore,
        suggestedKeywords,
        hashtags
      }
    };
  }

  /**
   * Generate content based on type
   */
  private async generateContentByType(
    type: ContentType,
    topic: string,
    tone: ContentTone,
    length: 'short' | 'medium' | 'long',
    additionalContext?: string
  ): Promise<string> {
    const lengthMap = {
      short: { min: 100, max: 300 },
      medium: { min: 300, max: 800 },
      long: { min: 800, max: 2000 }
    };

    const { min, max } = lengthMap[length];

    switch (type) {
      case ContentType.BLOG_POST:
        return this.generateBlogPost(topic, tone, min, max, additionalContext);
      case ContentType.SOCIAL_MEDIA:
        return this.generateSocialPost(topic, tone, max);
      case ContentType.EMAIL:
        return this.generateEmail(topic, tone, min, max, additionalContext);
      case ContentType.AD_COPY:
        return this.generateAdCopy(topic, tone, max);
      case ContentType.LANDING_PAGE:
        return this.generateLandingPage(topic, tone, min, max, additionalContext);
      case ContentType.PRODUCT_DESCRIPTION:
        return this.generateProductDescription(topic, tone, min, max);
      case ContentType.VIDEO_SCRIPT:
        return this.generateVideoScript(topic, tone, min, max, additionalContext);
      case ContentType.NEWSLETTER:
        return this.generateNewsletter(topic, tone, min, max, additionalContext);
      case ContentType.CASE_STUDY:
        return this.generateCaseStudy(topic, tone, min, max, additionalContext);
      case ContentType.WHITE_PAPER:
        return this.generateWhitePaper(topic, tone, min, max, additionalContext);
      default:
        return this.generateGenericContent(topic, tone, min, max);
    }
  }

  /**
   * Generate blog post content
   */
  private generateBlogPost(
    topic: string,
    tone: ContentTone,
    minWords: number,
    maxWords: number,
    additionalContext?: string
  ): string {
    const intro = this.getToneIntro(tone, topic);
    const context = additionalContext ? `\n\nContext: ${additionalContext}` : '';

    return `${intro}

# Introduction to ${topic}

${topic} represents one of the most significant developments in today's rapidly evolving landscape. Understanding this subject is crucial for businesses and individuals alike who want to stay ahead of the curve.

# Key Benefits and Considerations

When exploring ${topic}, several important factors come into play:

**1. Strategic Importance**
Organizations that embrace ${topic} positioning themselves for long-term success. The ability to adapt and integrate these principles into existing workflows can determine competitive advantage.

**2. Implementation Challenges**
Like any transformative initiative, ${topic} comes with its own set of challenges. These include resource allocation, skill development, and change management considerations.

**3. Future Outlook**
The trajectory of ${topic} points toward continued growth and innovation. Early adopters are already seeing significant returns on their investments.

# Best Practices

To maximize the benefits of ${topic}, consider the following approaches:

- Start with a clear strategy and defined objectives
- Invest in proper training and development
- Measure progress against key performance indicators
- Iterate and improve based on feedback

${context}

# Conclusion

${topic} is not just a passing trend but a fundamental shift in how we approach modern challenges. Organizations that understand and implement these principles effectively will be well-positioned for success in the years to come.`;
  }

  /**
   * Generate social media post
   */
  private generateSocialPost(
    topic: string,
    tone: ContentTone,
    maxLength: number
  ): string {
    const toneTemplates: Record<ContentTone, string[]> = {
      [ContentTone.PROFESSIONAL]: [
        `${topic}: Key insights for modern businesses. #Business #Innovation`,
        `Understanding ${topic} is essential for growth. Here's what you need to know. #Strategy`,
        `The future of ${topic} - Insights that matter. #ModernBusiness`
      ],
      [ContentTone.CASUAL]: [
        `Who's excited about ${topic}?! We definitely are! What's your take?`,
        `Just thinking about ${topic} and needed to share these thoughts...`,
        `Hot take: ${topic} is going to be HUGE this year. Don't sleep on it!`
      ],
      [ContentTone.HUMOROUS]: [
        `Plot twist: ${topic} is actually pretty cool when you think about it. Who knew?`,
        `Things I didn't know about ${topic} until today... (surprising, right?)`,
        `Breaking: ${topic} exists and is somehow both confusing and amazing.`
      ],
      [ContentTone.INSPIRATIONAL]: [
        `Every great journey begins with understanding ${topic}. Start yours today.`,
        `Your potential is unlimited. ${topic} might just be the key.`,
        `Dream bigger. ${topic} is your gateway to new possibilities.`
      ],
      [ContentTone.EDUCATIONAL]: [
        `Let's break down ${topic}: A comprehensive guide for beginners.`,
        `5 things you need to know about ${topic}. Thread below.`,
        `Understanding ${topic}: The complete explainer.`
      ],
      [ContentTone.PERSUASIVE]: [
        `Don't miss out on ${topic}. Your competitors aren't.`,
        `Why ${topic} should be your #1 priority right now.`,
        `Stop waiting. ${topic} is the opportunity you've been looking for.`
      ],
      [ContentTone.FORMAL]: [
        `An analysis of ${topic} and its implications for industry stakeholders.`,
        `Regarding ${topic}: Strategic considerations for decision-makers.`,
        `A professional examination of ${topic} and market dynamics.`
      ],
      [ContentTone.FRIENDLY]: [
        `Hey! Let's talk about ${topic} - it's pretty interesting!`,
        `What's your experience with ${topic}? We'd love to hear!`,
        `Friendly reminder: ${topic} is worth exploring. Join the conversation!`
      ]
    };

    const templates = toneTemplates[tone] || toneTemplates[ContentTone.PROFESSIONAL];
    const template = templates[Math.floor(Math.random() * templates.length)];

    return template.length <= maxLength ? template : template.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate email content
   */
  private generateEmail(
    topic: string,
    tone: ContentTone,
    minWords: number,
    maxWords: number,
    additionalContext?: string
  ): string {
    const greeting = tone === ContentTone.FORMAL ? 'Dear Valued Customer,' : 'Hi there,';

    return `${greeting}

Subject: ${topic}

I hope this email finds you well. I'm reaching out to share some important information about ${topic}.

${additionalContext || `This is an exciting development that we believe will significantly benefit your operations and help you achieve your goals more efficiently.`}

Key Highlights:

• Stay ahead of the competition with innovative solutions
• Streamlined processes that save time and resources
• Expert support available when you need it

Next Steps:

We'd love to discuss how ${topic} can work for your specific needs. Please reply to this email or book a time that works for you on our calendar.

Thank you for your time and consideration.

Best regards,
The Team`;
  }

  /**
   * Generate ad copy
   */
  private generateAdCopy(
    topic: string,
    tone: ContentTone,
    maxLength: number
  ): string {
    const adTemplates = [
      `Discover ${topic} - Transform your business today. Limited time offer!`,
      `${topic}: The solution you've been waiting for. Try it free for 30 days.`,
      `Unlock the power of ${topic}. Sign up now and save 20%.`,
      `Experience ${topic} like never before. Join thousands of satisfied customers.`
    ];

    return adTemplates[Math.floor(Math.random() * adTemplates.length)];
  }

  /**
   * Generate landing page content
   */
  private generateLandingPage(
    topic: string,
    tone: ContentTone,
    minWords: number,
    maxWords: number,
    additionalContext?: string
  ): string {
    return `# ${topic}

## Transform Your Business with ${topic}

In today's competitive landscape, staying ahead means embracing innovation. ${topic} gives you the tools and insights you need to succeed.

## Why Choose Us?

**Proven Results**
Join thousands of businesses that have transformed their operations with our solution.

**Easy Implementation**
Get started in minutes, not months. Our intuitive platform requires minimal training.

**24/7 Support**
Our dedicated team is always here to help you succeed.

${additionalContext ? `\n## Additional Information\n\n${additionalContext}` : ''}

## Get Started Today

[Sign Up Now] | [Learn More] | [Contact Sales]

© 2026 All rights reserved.`;
  }

  /**
   * Generate product description
   */
  private generateProductDescription(
    topic: string,
    tone: ContentTone,
    minWords: number,
    maxWords: number
  ): string {
    return `${topic}

Overview:
Discover the power of ${topic}, designed to help you achieve your goals with ease and efficiency.

Features:
• Intuitive interface for seamless user experience
• Advanced capabilities to meet your evolving needs
• Reliable performance you can count on
• Comprehensive support and documentation

Specifications:
• Category: Professional Solutions
• Compatibility: All major platforms
• Support: 24/7 availability

Perfect for professionals who demand excellence. Experience ${topic} today.`;
  }

  /**
   * Generate video script
   */
  private generateVideoScript(
    topic: string,
    tone: ContentTone,
    minWords: number,
    maxWords: number,
    additionalContext?: string
  ): string {
    return `[HOOK - 0:00-0:05]
Have you ever wondered how ${topic} could transform your business?

[INTRODUCTION - 0:05-0:15]
Welcome back! Today we're diving deep into ${topic} and exploring why it matters more than ever.

[MAIN CONTENT - 0:15-2:00]
Let's break this down into three key points:

First, ${topic} addresses critical challenges that businesses face today...

Second, implementing ${topic} is easier than you might think...

Third, the ROI of ${topic} speaks for itself...

${additionalContext ? `\n[ADDITIONAL CONTEXT]\n${additionalContext}` : ''}

[CALL TO ACTION - 2:00-2:15]
If you found this valuable, like and subscribe. Hit the bell to never miss an update.

Until next time, keep innovating!`;
  }

  /**
   * Generate newsletter content
   */
  private generateNewsletter(
    topic: string,
    tone: ContentTone,
    minWords: number,
    maxWords: number,
    additionalContext?: string
  ): string {
    return `**${topic} - Your Weekly Update**

Hello!

Welcome to your weekly update on ${topic}. Here's what's happening:

**This Week's Highlights**

1. Industry developments you need to know
2. Tips and best practices
3. Upcoming opportunities

${additionalContext ? `\n**Special Announcement**\n\n${additionalContext}` : ''}

**Quick Tips**

Stay informed, stay ahead. Knowledge is power in today's fast-paced environment.

**Coming Up**

Next week, we'll be covering even more exciting developments. Stay tuned!

Until then,
Your Team

---
Unsubscribe | Manage Preferences | View in Browser`;
  }

  /**
   * Generate case study
   */
  private generateCaseStudy(
    topic: string,
    tone: ContentTone,
    minWords: number,
    maxWords: number,
    additionalContext?: string
  ): string {
    return `# Case Study: ${topic}

## Executive Summary

This case study examines how ${topic} delivered exceptional results for a leading organization in the industry.

## The Challenge

Our client faced significant challenges with their existing processes. They needed a solution that could:

• Reduce operational costs
• Improve efficiency
• Scale with growth

## The Solution

By implementing ${topic}, the organization was able to:

• Achieve 40% cost reduction
• Increase productivity by 60%
• Scale operations seamlessly

${additionalContext ? `\n## Implementation Details\n\n${additionalContext}` : ''}

## Results

The results speak for themselves:

| Metric | Before | After |
|--------|--------|-------|
| Efficiency | Baseline | +60% |
| Costs | Standard | -40% |
| Satisfaction | 70% | 95% |

## Conclusion

${topic} proved to be a game-changer for this organization, delivering measurable results and setting them up for long-term success.

---
Ready to achieve similar results? Contact us today.`;
  }

  /**
   * Generate white paper
   */
  private generateWhitePaper(
    topic: string,
    tone: ContentTone,
    minWords: number,
    maxWords: number,
    additionalContext?: string
  ): string {
    return `# White Paper: ${topic}

## Abstract

This white paper explores the strategic implications of ${topic} and provides actionable insights for organizations seeking to leverage this opportunity.

## Introduction

In an era of rapid technological advancement, understanding ${topic} is no longer optional—it's essential for survival and growth.

## Understanding the Landscape

The current landscape presents both challenges and opportunities. Organizations must carefully navigate:

1. Market dynamics and competitive pressures
2. Technological requirements and infrastructure
3. Talent acquisition and development
4. Regulatory considerations

## Strategic Recommendations

Based on our analysis, we recommend the following approach:

### Phase 1: Assessment
Evaluate your current capabilities and identify gaps.

### Phase 2: Planning
Develop a comprehensive strategy aligned with business objectives.

### Phase 3: Implementation
Execute with precision, leveraging best practices and expert guidance.

### Phase 4: Optimization
Continuously monitor and refine based on performance data.

${additionalContext ? `\n## Additional Considerations\n\n${additionalContext}` : ''}

## Conclusion

${topic} represents a significant opportunity for organizations willing to invest the time and resources. Those who act decisively will be well-positioned to lead in their respective markets.

---
*This white paper is intended for informational purposes only. For personalized guidance, please contact our team.*`;
  }

  /**
   * Generate generic content
   */
  private generateGenericContent(
    topic: string,
    tone: ContentTone,
    minWords: number,
    maxWords: number
  ): string {
    return `${topic}

This content covers the essential aspects of ${topic}, providing valuable insights and practical guidance for readers.

Key Points:

• Understanding the fundamentals
• Applying best practices
• Measuring success
• Continuous improvement

Whether you're new to ${topic} or looking to enhance your existing knowledge, this material provides a solid foundation for growth and success.`;
  }

  /**
   * Get tone-specific introduction
   */
  private getToneIntro(tone: ContentTone, topic: string): string {
    const intros: Record<ContentTone, string> = {
      [ContentTone.PROFESSIONAL]: `In today's business environment, understanding ${topic} is essential for organizational success.`,
      [ContentTone.CASUAL]: `Let's talk about ${topic} - it's pretty exciting stuff!`,
      [ContentTone.HUMOROUS]: `Here's the thing about ${topic}... it's actually more interesting than it sounds!`,
      [ContentTone.INSPIRATIONAL]: `Every transformation begins with understanding. Today, we explore ${topic}.`,
      [ContentTone.EDUCATIONAL]: `Welcome to your complete guide on ${topic}. Let's learn together.`,
      [ContentTone.PERSUASIVE]: `If you're not paying attention to ${topic}, you're missing out on something big.`,
      [ContentTone.FORMAL]: `This report presents a comprehensive analysis of ${topic} and its implications.`,
      [ContentTone.FRIENDLY]: `Hey! Glad you're here to learn about ${topic}. Let's get started!`
    };
    return intros[tone] || intros[ContentTone.PROFESSIONAL];
  }

  /**
   * Apply brand voice to content
   */
  private applyBrandVoice(content: string, brandVoice: string): string {
    // In production, this would use AI to adjust content to match brand voice
    // For now, we prepend brand voice mention
    return `[Brand Voice: ${brandVoice}]\n\n${content}`;
  }

  /**
   * Add call-to-action to content
   */
  private addCTA(content: string, cta: string, type: ContentType): string {
    const ctaFormatted = `\n\n---\n**${cta}**\n---`;
    return content + ctaFormatted;
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate readability score (simplified Flesch-based score)
   */
  private calculateReadabilityScore(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Simplified Flesch Reading Ease score
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /**
   * Generate keywords from content
   */
  private generateKeywords(content: string, existingKeywords: string[]): string[] {
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};

    // Count word frequencies (excluding common words)
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their'
    ]);

    words.forEach(word => {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (cleaned.length > 3 && !stopWords.has(cleaned)) {
        wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
      }
    });

    // Sort by frequency and take top keywords
    const keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Add existing keywords if not already present
    existingKeywords.forEach(kw => {
      if (!keywords.includes(kw.toLowerCase())) {
        keywords.push(kw.toLowerCase());
      }
    });

    return keywords.slice(0, 10);
  }

  /**
   * Calculate SEO score
   */
  private calculateSEOScore(content: string, keywords: string[]): number {
    let score = 50; // Base score

    // Check content length
    const wordCount = this.countWords(content);
    if (wordCount >= 300) score += 10;
    if (wordCount >= 500) score += 10;
    if (wordCount >= 1000) score += 10;

    // Check keyword usage
    const contentLower = content.toLowerCase();
    keywords.forEach(keyword => {
      if (contentLower.includes(keyword.toLowerCase())) {
        score += 5;
      }
    });

    // Check for headings
    if (content.includes('# ')) score += 5;
    if (content.includes('## ')) score += 5;

    // Check for lists
    if (content.includes('• ') || content.includes('- ')) score += 5;

    // Check for links placeholder
    if (content.includes('[') && content.includes('](')) score += 5;

    return Math.min(100, score);
  }

  /**
   * Generate hashtags from topic
   */
  private generateHashtags(topic: string, existingKeywords: string[]): string[] {
    const hashtags: string[] = [];

    // Extract key words from topic
    const words = topic.split(/\s+/).filter(w => w.length > 3);
    words.slice(0, 3).forEach(word => {
      const tag = word.replace(/[^a-zA-Z0-9]/g, '');
      if (tag.length > 2) {
        hashtags.push(`#${tag.charAt(0).toUpperCase()}${tag.slice(1)}`);
      }
    });

    // Add keywords as hashtags
    existingKeywords.slice(0, 2).forEach(kw => {
      const tag = kw.replace(/[^a-zA-Z0-9]/g, '');
      if (tag.length > 2) {
        hashtags.push(`#${tag.charAt(0).toUpperCase()}${tag.slice(1)}`);
      }
    });

    return [...new Set(hashtags)].slice(0, 5);
  }

  /**
   * Store generated content
   */
  private async storeContent(
    tenantId: string,
    userId: string,
    params: {
      type: ContentType;
      topic: string;
      keywords?: string[];
      targetAudience?: string;
      tone?: ContentTone;
      length?: string;
      cta?: string;
      additionalContext?: string;
    },
    content: string,
    wordCount: number,
    readabilityScore: number,
    seoScore: number
  ): Promise<IContentDocument> {
    try {
      const doc = await Content.create({
        tenantId,
        title: params.topic,
        type: params.type,
        topic: params.topic,
        keyPoints: [],
        keywords: params.keywords || [],
        targetAudience: params.targetAudience || 'General',
        tone: params.tone || ContentTone.PROFESSIONAL,
        status: ContentStatus.DRAFT,
        cta: params.cta,
        references: [],
        generatedContent: content,
        wordCount,
        readabilityScore,
        seoScore,
        createdBy: userId
      });

      logger.info('Content stored', { tenantId, contentId: doc._id });
      return doc;
    } catch (error) {
      logger.error('Failed to store content', { error });
      throw error;
    }
  }

  /**
   * Get content by ID
   */
  async getContent(tenantId: string, contentId: string): Promise<IContent | null> {
    const doc = await Content.findOne({ _id: contentId, tenantId });
    if (!doc) return null;

    return this.mapToIContent(doc);
  }

  /**
   * List content with filters
   */
  async listContent(
    tenantId: string,
    filters: {
      type?: ContentType;
      status?: ContentStatus;
      createdBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: IContent[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.createdBy) query.createdBy = filters.createdBy;

    const [docs, total] = await Promise.all([
      Content.find(query)
        .sort({ createdAt: -1 })
        .skip(filters.offset || 0)
        .limit(filters.limit || 20)
        .lean(),
      Content.countDocuments(query)
    ]);

    return {
      items: docs.map(doc => this.mapToIContent(doc)),
      total
    };
  }

  /**
   * Update content status
   */
  async updateContentStatus(
    tenantId: string,
    contentId: string,
    status: ContentStatus
  ): Promise<IContent | null> {
    const doc = await Content.findOneAndUpdate(
      { _id: contentId, tenantId },
      { status, publishedAt: status === ContentStatus.PUBLISHED ? new Date() : undefined },
      { new: true }
    );

    if (!doc) return null;
    return this.mapToIContent(doc);
  }

  /**
   * Map document to interface
   */
  private mapToIContent(doc: any): IContent {
    return {
      id: doc._id?.toString() || '',
      tenantId: doc.tenantId || '',
      title: doc.title || '',
      type: doc.type || ContentType.BLOG_POST,
      topic: doc.topic || '',
      keyPoints: doc.keyPoints || [],
      keywords: doc.keywords || [],
      targetAudience: doc.targetAudience || '',
      tone: doc.tone || ContentTone.PROFESSIONAL,
      status: doc.status || ContentStatus.DRAFT,
      cta: doc.cta,
      references: doc.references || [],
      generatedContent: doc.generatedContent || '',
      wordCount: doc.wordCount || 0,
      seoScore: doc.seoScore,
      readabilityScore: doc.readabilityScore,
      metadata: doc.metadata,
      createdBy: doc.createdBy || '',
      publishedAt: doc.publishedAt,
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date()
    };
  }
}

// Export singleton instance
export const contentGenerator = new ContentGeneratorService();
