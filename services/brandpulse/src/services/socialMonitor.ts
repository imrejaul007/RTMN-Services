import axios from 'axios';
import { Brand } from '../models/Brand';
import { Mention } from '../models/Mention';
import { SentimentAnalysisService } from './sentimentAnalysis';
import { BrandHealthService } from './brandHealth';
import { TwinSyncService } from './twinSync';
import { CustomerOpsBridge } from './customerOpsBridge';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

export class SocialMonitorService {
  private sentimentService: SentimentAnalysisService;
  private brandHealth: BrandHealthService;
  private twinSync: TwinSyncService;
  private customerOpsBridge: CustomerOpsBridge;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    brandHealth: BrandHealthService,
    twinSync: TwinSyncService,
    customerOpsBridge: CustomerOpsBridge
  ) {
    this.sentimentService = new SentimentAnalysisService();
    this.brandHealth = brandHealth;
    this.twinSync = twinSync;
    this.customerOpsBridge = customerOpsBridge;
  }

  startMonitoring() {
    if (this.isRunning) {
      logger.warn('Social monitoring already running');
      return;
    }

    const intervalMs = parseInt(process.env.SOCIAL_POLL_INTERVAL || '300000'); // 5 minutes default
    this.monitoringInterval = setInterval(() => this.pollSocialMedia(), intervalMs);

    // Run immediately on start
    this.pollSocialMedia();

    this.isRunning = true;
    logger.info('Social media monitoring started');
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    logger.info('Social media monitoring stopped');
  }

  private async pollSocialMedia() {
    try {
      const brands = await Brand.find({});

      for (const brand of brands) {
        await this.monitorBrand(brand);
      }
    } catch (error) {
      logger.error('Error polling social media:', error);
    }
  }

  async monitorBrand(brand: any) {
    try {
      logger.info(`Monitoring brand: ${brand.name}`);

      // Monitor each platform in parallel
      const results = await Promise.allSettled([
        this.monitorTwitter(brand),
        this.monitorFacebook(brand),
        this.monitorInstagram(brand),
        this.monitorLinkedIn(brand),
        this.monitorNews(brand)
      ]);

      // Process results and check for crises
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const mentions = result.value;
          for (const mention of mentions) {
            await this.processMention(brand, mention);

            // Sync to TwinOS Hub
            await this.twinSync.syncMentionToJourney(brand.brandId, mention);

            // Check for crisis
            if (mention.isCrisis) {
              await this.customerOpsBridge.sendCrisisAlert(brand.brandId, mention);
            }
          }
        }
      }

      // Update brand health score
      await this.brandHealth.updateHealthScore(brand.brandId);
    } catch (error) {
      logger.error(`Error monitoring brand ${brand.name}:`, error);
    }
  }

  private async monitorTwitter(brand: any): Promise<any[]> {
    const mentions: any[] = [];
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      logger.debug('Twitter bearer token not configured, using mock data');
      return this.generateMockMentions(brand, 'twitter', 5);
    }

    try {
      // Search for brand mentions
      const query = brand.keywords.join(' OR ');
      const response = await axios.get(
        'https://api.twitter.com/2/tweets/search/recent',
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`
          },
          params: {
            query: `${query} -is:retweet`,
            'tweet.fields': 'author_id,created_at,public_metrics,entities',
            'expansions': 'author_id',
            'max_results': 100
          }
        }
      );

      const tweets = response.data.data || [];
      for (const tweet of tweets) {
        mentions.push({
          source: 'twitter',
          platformId: tweet.id,
          author: {
            name: 'Twitter User',
            handle: tweet.author_id
          },
          content: tweet.text,
          url: `https://twitter.com/i/web/status/${tweet.id}`,
          publishedAt: new Date(tweet.created_at),
          engagement: {
            likes: tweet.public_metrics?.like_count || 0,
            shares: tweet.public_metrics?.retweet_count || 0,
            comments: tweet.public_metrics?.reply_count || 0,
            reach: (tweet.public_metrics?.retweet_count || 0) * 100
          }
        });
      }
    } catch (error) {
      logger.error('Error fetching Twitter mentions:', error);
    }

    return mentions;
  }

  private async monitorFacebook(brand: any): Promise<any[]> {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

    if (!accessToken) {
      logger.debug('Facebook access token not configured, using mock data');
      return this.generateMockMentions(brand, 'facebook', 3);
    }

    // Facebook Graph API implementation would go here
    // For now, return mock data
    return this.generateMockMentions(brand, 'facebook', 2);
  }

  private async monitorInstagram(brand: any): Promise<any[]> {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!accessToken) {
      logger.debug('Instagram access token not configured, using mock data');
      return this.generateMockMentions(brand, 'instagram', 3);
    }

    // Instagram Graph API implementation would go here
    return this.generateMockMentions(brand, 'instagram', 2);
  }

  private async monitorLinkedIn(brand: any): Promise<any[]> {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

    if (!accessToken) {
      logger.debug('LinkedIn access token not configured, using mock data');
      return this.generateMockMentions(brand, 'linkedin', 2);
    }

    // LinkedIn API implementation would go here
    return this.generateMockMentions(brand, 'linkedin', 1);
  }

  private async monitorNews(brand: any): Promise<any[]> {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      logger.debug('News API key not configured, using mock data');
      return this.generateMockMentions(brand, 'news', 3);
    }

    try {
      const mentions: any[] = [];

      for (const keyword of brand.keywords.slice(0, 3)) {
        const response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: keyword,
            language: 'en',
            sortBy: 'publishedAt',
            pageSize: 10,
            apiKey
          }
        });

        const articles = response.data.articles || [];
        for (const article of articles) {
          mentions.push({
            source: 'news',
            platformId: article.url,
            author: {
              name: article.author || article.source.name
            },
            content: article.title + '. ' + article.description,
            url: article.url,
            publishedAt: new Date(article.publishedAt),
            engagement: {
              reach: Math.floor(Math.random() * 10000) + 1000
            }
          });
        }
      }

      return mentions;
    } catch (error) {
      logger.error('Error fetching news mentions:', error);
      return this.generateMockMentions(brand, 'news', 2);
    }
  }

  private generateMockMentions(brand: any, source: string, count: number): any[] {
    const mentions: any[] = [];
    const sentiments = ['positive', 'neutral', 'negative'];

    const sampleTexts: Record<string, string[]> = {
      twitter: [
        `Just had a great experience with ${brand.name}! Highly recommend their service.`,
        `${brand.name} is okay, nothing special.`,
        `Terrible experience with ${brand.name}. Never again.`,
        `Love the new features from ${brand.name}!`,
        `Not impressed with ${brand.name} lately.`
      ],
      facebook: [
        `Check out ${brand.name} - amazing products!`,
        `My review of ${brand.name} after using for a month.`,
        `Disappointed with ${brand.name}'s customer service.`
      ],
      instagram: [
        `${brand.name} vibes! #${brand.name.replace(/\s/g, '')}`,
        `Unboxing ${brand.name} products. So excited!`,
        `Why is ${brand.name} quality declining?`
      ],
      linkedin: [
        `${brand.name} announces new partnership. Exciting times!`,
        `Working with ${brand.name} has been a great experience.`
      ],
      news: [
        `${brand.name} reports record quarterly earnings`,
        `Industry analysis: ${brand.name}'s market position strengthens`,
        `${brand.name} faces scrutiny over new policy`
      ]
    };

    const texts = sampleTexts[source] || sampleTexts.twitter;

    for (let i = 0; i < count; i++) {
      const text = texts[Math.floor(Math.random() * texts.length)];
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

      mentions.push({
        source,
        platformId: `${source}-${uuidv4().slice(0, 8)}`,
        author: {
          name: `User ${Math.floor(Math.random() * 10000)}`,
          followers: Math.floor(Math.random() * 10000)
        },
        content: text,
        publishedAt: new Date(Date.now() - Math.random() * 86400000), // Last 24 hours
        engagement: {
          likes: Math.floor(Math.random() * 500),
          shares: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 50),
          reach: Math.floor(Math.random() * 50000)
        }
      });
    }

    return mentions;
  }

  async processMention(brand: any, rawMention: any) {
    // Analyze sentiment
    const sentiment = await this.sentimentService.analyzeText(rawMention.content);

    // Determine if crisis (high negative sentiment or specific keywords)
    const crisisKeywords = ['scandal', 'lawsuit', 'fraud', 'crisis', 'breach', 'hack', 'recall'];
    const isCrisis = sentiment.label === 'negative' &&
      (sentiment.score < -0.5 || crisisKeywords.some(k => rawMention.content.toLowerCase().includes(k)));

    // Create mention document
    const mention = new Mention({
      mentionId: `MEN-${uuidv4().slice(0, 12).toUpperCase()}`,
      brandId: brand.brandId,
      ...rawMention,
      sentiment: {
        score: sentiment.score,
        label: sentiment.label,
        confidence: sentiment.confidence
      },
      isCrisis,
      tags: this.extractTags(rawMention.content, brand.keywords),
      processedAt: new Date()
    });

    await mention.save();

    // Sync to Journey Twin
    await this.twinSync.syncMentionToJourney(brand.brandId, mention);

    // Send to Customer Ops Bridge if crisis
    if (isCrisis) {
      await this.customerOpsBridge.sendCrisisAlert(brand.brandId, mention);
    }

    return mention;
  }

  private extractTags(content: string, keywords: string[]): string[] {
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const keyword of keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        tags.push(keyword);
      }
    }

    // Extract hashtags
    const hashtagMatches = content.match(/#\w+/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches.map(h => h.substring(1)));
    }

    return [...new Set(tags)];
  }

  // Manual trigger for monitoring a specific brand
  async triggerMonitoring(brandId: string) {
    const brand = await Brand.findOne({ brandId });
    if (brand) {
      await this.monitorBrand(brand);
      return { success: true, brand: brand.name };
    }
    return { success: false, error: 'Brand not found' };
  }
}
