// ============================================
// HOJAI AI - Social Media Manager Service
// ============================================

import { SocialPost, ISocialPostDocument, Campaign } from '../models';
import {
  SocialPlatform,
  SocialPostStatus,
  ISocialPost,
  CampaignStatus
} from '../types';
import { logger } from '../utils/logger';

export interface SocialAccount {
  platform: SocialPlatform;
  accountId: string;
  accessToken?: string;
  accountName?: string;
}

export interface SocialMediaConfig {
  accounts: SocialAccount[];
  defaultSchedulingHours: number[];
  maxPostsPerDay: number;
}

interface PlatformResponse {
  success: boolean;
  postId?: string;
  error?: string;
}

export class SocialMediaManagerService {
  private config: SocialMediaConfig;

  constructor(config?: Partial<SocialMediaConfig>) {
    this.config = {
      accounts: config?.accounts || [],
      defaultSchedulingHours: config?.defaultSchedulingHours || [9, 12, 17],
      maxPostsPerDay: config?.maxPostsPerDay || 10
    };
  }

  /**
   * Create a social media post
   */
  async createPost(
    tenantId: string,
    params: {
      platform: SocialPlatform;
      content: string;
      mediaUrls?: string[];
      hashtags?: string[];
      mentions?: string[];
      scheduledFor?: string;
      title?: string;
      campaignId?: string;
    }
  ): Promise<ISocialPost> {
    logger.info('Creating social post', { tenantId, platform: params.platform });

    // Validate platform access
    const account = this.config.accounts.find(a => a.platform === params.platform);
    if (!account) {
      throw new Error(`No account configured for platform: ${params.platform}`);
    }

    // Process content (add hashtags, mentions formatting)
    const processedContent = this.processContent(
      params.content,
      params.hashtags,
      params.mentions
    );

    // Determine status
    const status = params.scheduledFor
      ? SocialPostStatus.SCHEDULED
      : SocialPostStatus.DRAFT;

    // Create post document
    const doc = await SocialPost.create({
      tenantId,
      campaignId: params.campaignId,
      platform: params.platform,
      title: params.title,
      content: processedContent,
      mediaUrls: params.mediaUrls || [],
      hashtags: params.hashtags || [],
      mentions: params.mentions || [],
      status,
      scheduledFor: params.scheduledFor ? new Date(params.scheduledFor) : undefined
    });

    logger.info('Social post created', { tenantId, postId: doc._id });

    return this.mapToISocialPost(doc);
  }

  /**
   * Schedule a post for publishing
   */
  async schedulePost(
    tenantId: string,
    postId: string,
    scheduledFor: string
  ): Promise<ISocialPost | null> {
    const doc = await SocialPost.findOneAndUpdate(
      { _id: postId, tenantId },
      {
        status: SocialPostStatus.SCHEDULED,
        scheduledFor: new Date(scheduledFor)
      },
      { new: true }
    );

    if (!doc) return null;
    return this.mapToISocialPost(doc);
  }

  /**
   * Publish a post immediately
   */
  async publishPost(
    tenantId: string,
    postId: string
  ): Promise<{ success: boolean; post?: ISocialPost; error?: string }> {
    logger.info('Publishing social post', { tenantId, postId });

    const doc = await SocialPost.findOne({ _id: postId, tenantId });
    if (!doc) {
      return { success: false, error: 'Post not found' };
    }

    if (doc.status === SocialPostStatus.PUBLISHED) {
      return { success: false, error: 'Post already published' };
    }

    // Simulate publishing to platform
    const platformResponse = await this.publishToPlatform(
      doc.platform,
      doc.content,
      doc.mediaUrls
    );

    if (platformResponse.success) {
      await SocialPost.findByIdAndUpdate(postId, {
        status: SocialPostStatus.PUBLISHED,
        publishedAt: new Date(),
        platformPostId: platformResponse.postId
      });

      const updatedDoc = await SocialPost.findById(postId);
      return { success: true, post: updatedDoc ? this.mapToISocialPost(updatedDoc) : undefined };
    } else {
      await SocialPost.findByIdAndUpdate(postId, {
        status: SocialPostStatus.FAILED,
        errorMessage: platformResponse.error
      });

      return { success: false, error: platformResponse.error };
    }
  }

  /**
   * Publish to social platform (simulated)
   */
  private async publishToPlatform(
    platform: SocialPlatform,
    content: string,
    mediaUrls?: string[]
  ): Promise<PlatformResponse> {
    // In production, this would call actual platform APIs
    // For now, simulate successful publish
    logger.info('Publishing to platform', { platform, contentLength: content.length });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate mock post ID
    const mockPostId = `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      postId: mockPostId
    };
  }

  /**
   * Create a multi-platform social campaign
   */
  async createCampaign(
    tenantId: string,
    params: {
      name: string;
      platforms: SocialPlatform[];
      posts: Array<{
        platform: SocialPlatform;
        content: string;
        mediaUrls?: string[];
        scheduledFor?: string;
      }>;
      startDate: string;
      endDate?: string;
    }
  ): Promise<{
    campaignId: string;
    posts: ISocialPost[];
  }> {
    logger.info('Creating social campaign', { tenantId, name: params.name });

    // Create campaign in database
    const campaign = await Campaign.create({
      tenantId,
      name: params.name,
      type: 'social',
      objective: 'engagement',
      description: `Social media campaign: ${params.name}`,
      startDate: new Date(params.startDate),
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      channels: params.platforms,
      status: CampaignStatus.DRAFT,
      createdBy: 'system'
    });

    // Create posts for each platform
    const posts: ISocialPost[] = [];
    for (const postParams of params.posts) {
      const post = await this.createPost(tenantId, {
        platform: postParams.platform,
        content: postParams.content,
        mediaUrls: postParams.mediaUrls,
        scheduledFor: postParams.scheduledFor,
        campaignId: campaign._id.toString()
      });
      posts.push(post);
    }

    logger.info('Social campaign created', {
      tenantId,
      campaignId: campaign._id,
      postsCount: posts.length
    });

    return {
      campaignId: campaign._id.toString(),
      posts
    };
  }

  /**
   * Schedule posts for optimal times
   */
  async scheduleOptimalTimes(
    tenantId: string,
    postIds: string[],
    dates: string[]
  ): Promise<ISocialPost[]> {
    const updatedPosts: ISocialPost[] = [];

    for (const postId of postIds) {
      const post = await SocialPost.findOne({ _id: postId, tenantId });
      if (!post) continue;

      // Find next optimal time slot
      const scheduledFor = this.findOptimalTime(post.platform, dates);
      if (scheduledFor) {
        const updated = await this.schedulePost(tenantId, postId, scheduledFor);
        if (updated) updatedPosts.push(updated);
      }
    }

    return updatedPosts;
  }

  /**
   * Find optimal posting time (simplified)
   */
  private findOptimalTime(platform: SocialPlatform, dates: string[]): string | null {
    if (dates.length === 0) return null;

    const optimalHours = this.getOptimalHours(platform);
    const randomHour = optimalHours[Math.floor(Math.random() * optimalHours.length)];

    const date = new Date(dates[0]);
    date.setHours(randomHour, 0, 0, 0);

    return date.toISOString();
  }

  /**
   * Get optimal posting hours by platform
   */
  private getOptimalHours(platform: SocialPlatform): number[] {
    const platformHours: Record<SocialPlatform, number[]> = {
      [SocialPlatform.TWITTER]: [8, 9, 12, 17, 18],
      [SocialPlatform.LINKEDIN]: [7, 8, 9, 12, 17],
      [SocialPlatform.FACEBOOK]: [9, 12, 13, 15, 18],
      [SocialPlatform.INSTAGRAM]: [6, 7, 8, 11, 17],
      [SocialPlatform.YOUTUBE]: [12, 14, 16, 18, 20],
      [SocialPlatform.TIKTOK]: [6, 7, 8, 12, 17],
      [SocialPlatform.THREADS]: [8, 9, 12, 17],
      [SocialPlatform.REDDIT]: [6, 9, 12, 18, 21]
    };

    return platformHours[platform] || [9, 12, 17];
  }

  /**
   * Process content (add hashtags, mentions formatting)
   */
  private processContent(
    content: string,
    hashtags?: string[],
    mentions?: string[]
  ): string {
    let processed = content;

    // Add hashtags at the end
    if (hashtags && hashtags.length > 0) {
      const hashtagString = hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
      processed += `\n\n${hashtagString}`;
    }

    // Format mentions
    if (mentions && mentions.length > 0) {
      mentions.forEach(mention => {
        const formatted = mention.startsWith('@') ? mention : `@${mention}`;
        processed = processed.replace(formatted, formatted);
      });
    }

    return processed;
  }

  /**
   * Get post analytics
   */
  async getPostAnalytics(
    tenantId: string,
    postId: string
  ): Promise<{
    impressions: number;
    clicks: number;
    likes: number;
    shares: number;
    comments: number;
    engagementRate: number;
  } | null> {
    const doc = await SocialPost.findOne({ _id: postId, tenantId });
    if (!doc) return null;

    const engagement = doc.engagement || {
      impressions: 0,
      clicks: 0,
      likes: 0,
      shares: 0,
      comments: 0
    };

    const engagementRate = engagement.impressions > 0
      ? ((engagement.likes + engagement.shares + engagement.comments + engagement.clicks) / engagement.impressions) * 100
      : 0;

    return {
      ...engagement,
      engagementRate: Math.round(engagementRate * 100) / 100
    };
  }

  /**
   * Update post engagement metrics
   */
  async updateEngagement(
    tenantId: string,
    postId: string,
    metrics: {
      impressions?: number;
      clicks?: number;
      likes?: number;
      shares?: number;
      comments?: number;
    }
  ): Promise<ISocialPost | null> {
    const doc = await SocialPost.findOneAndUpdate(
      { _id: postId, tenantId },
      {
        $set: {
          'engagement.impressions': metrics.impressions,
          'engagement.clicks': metrics.clicks,
          'engagement.likes': metrics.likes,
          'engagement.shares': metrics.shares,
          'engagement.comments': metrics.comments
        }
      },
      { new: true }
    );

    if (!doc) return null;
    return this.mapToISocialPost(doc);
  }

  /**
   * List posts with filters
   */
  async listPosts(
    tenantId: string,
    filters: {
      platform?: SocialPlatform;
      status?: SocialPostStatus;
      campaignId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: ISocialPost[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };

    if (filters.platform) query.platform = filters.platform;
    if (filters.status) query.status = filters.status;
    if (filters.campaignId) query.campaignId = filters.campaignId;

    const [docs, total] = await Promise.all([
      SocialPost.find(query)
        .sort({ createdAt: -1 })
        .skip(filters.offset || 0)
        .limit(filters.limit || 20)
        .lean(),
      SocialPost.countDocuments(query)
    ]);

    return {
      items: docs.map(doc => this.mapToISocialPost(doc)),
      total
    };
  }

  /**
   * Delete a post
   */
  async deletePost(tenantId: string, postId: string): Promise<boolean> {
    const result = await SocialPost.deleteOne({ _id: postId, tenantId });
    return result.deletedCount > 0;
  }

  /**
   * Get platform-specific content preview
   */
  getPlatformPreview(
    content: string,
    platform: SocialPlatform
  ): {
    preview: string;
    remaining: number;
    tips: string[];
  } {
    const limits: Record<SocialPlatform, { max: number; tip: string }> = {
      [SocialPlatform.TWITTER]: { max: 280, tip: 'Keep it concise. Use hashtags strategically.' },
      [SocialPlatform.LINKEDIN]: { max: 3000, tip: 'Professional tone works well. Include relevant hashtags.' },
      [SocialPlatform.FACEBOOK]: { max: 63206, tip: 'You have room for more detail. Engage with questions.' },
      [SocialPlatform.INSTAGRAM]: { max: 2200, tip: 'Visual storytelling is key. Use line breaks.' },
      [SocialPlatform.YOUTUBE]: { max: 5000, tip: 'Include timestamps for longer content.' },
      [SocialPlatform.TIKTOK]: { max: 2200, tip: 'Hook viewers in the first 3 seconds.' },
      [SocialPlatform.THREADS]: { max: 500, tip: 'Casual, conversational tone works best.' },
      [SocialPlatform.REDDIT]: { max: 40000, tip: 'Respect community rules. No self-promotion.' }
    };

    const { max, tip } = limits[platform];
    const preview = content.length > max ? content.substring(0, max - 3) + '...' : content;

    return {
      preview,
      remaining: Math.max(0, max - content.length),
      tips: [tip]
    };
  }

  /**
   * Map document to interface
   */
  private mapToISocialPost(doc: any): ISocialPost {
    return {
      id: doc._id?.toString() || '',
      tenantId: doc.tenantId || '',
      campaignId: doc.campaignId?.toString(),
      platform: doc.platform,
      title: doc.title,
      content: doc.content || '',
      mediaUrls: doc.mediaUrls || [],
      hashtags: doc.hashtags || [],
      mentions: doc.mentions || [],
      status: doc.status,
      scheduledFor: doc.scheduledFor?.toISOString?.() || doc.scheduledFor,
      publishedAt: doc.publishedAt,
      engagement: doc.engagement,
      errorMessage: doc.errorMessage,
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date()
    };
  }
}

// Export singleton instance
export const socialMediaManager = new SocialMediaManagerService();
