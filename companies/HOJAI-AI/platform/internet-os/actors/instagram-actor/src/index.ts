/**
 * Instagram Actor - Meta Graph API Version
 * Uses the official Instagram Graph API for Business/Creator accounts
 *
 * Setup:
 * 1. Create a Facebook App at https://developers.facebook.com/apps
 * 2. Add Instagram Graph API product
 * 3. Get a long-lived access token (valid 60 days)
 * 4. Connect your Instagram Business/Creator account
 * 5. Get your Instagram Business Account ID
 *
 * Required env vars:
 * - INSTAGRAM_ACCESS_TOKEN (long-lived token)
 * - INSTAGRAM_BUSINESS_ID (your Instagram Business Account ID)
 *
 * Pricing: Free for Instagram Business accounts
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';

export interface InstagramAccount {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  website?: string;
  profilePictureUrl?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  isVerified?: boolean;
  accountType?: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp?: string;
  likeCount?: number;
  commentsCount?: number;
  insights?: {
    impressions?: number;
    reach?: number;
    engagement?: number;
  };
}

export interface InstagramHashtag {
  id: string;
  name: string;
  mediaCount: number;
}

export class InstagramActor extends Actor {
  private accessToken?: string;
  private businessId?: string;
  private readonly API_VERSION = 'v18.0';
  private readonly API_URL = `https://graph.facebook.com/${this.API_VERSION}`;

  constructor(accessToken?: string, businessId?: string) {
    super({
      id: 'instagram',
      name: 'Instagram Graph API Actor',
      description: 'Official Instagram Graph API access for Business/Creator accounts',
      version: '1.0.0',
      capabilities: ['account_info', 'media', 'stories', 'insights', 'api-based'],
      rateLimit: { requests: 200, window: 60000 }, // Meta's rate limit
    });
    this.accessToken = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
    this.businessId = businessId || process.env.INSTAGRAM_BUSINESS_ID;
  }

  /**
   * Make Graph API request
   */
  private async apiRequest(path: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.accessToken) {
      throw new Error(
        'Instagram Access Token required. Set INSTAGRAM_ACCESS_TOKEN env var. ' +
        'Get a long-lived token at https://developers.facebook.com/tools/explorer/'
      );
    }

    const url = new URL(`${this.API_URL}${path}`);
    url.searchParams.set('access_token', this.accessToken);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }

    const response = await fetchUrl(url.toString(), {
      timeout: 30000,
      retries: 2,
    });

    return JSON.parse(response);
  }

  async scrape(input: any): Promise<ActorOutput> {
    try {
      const action = input.action || 'get_account';

      switch (action) {
        case 'get_account':
          return await this.getAccount(input.params);
        case 'get_media':
          return await this.getMedia(input.params);
        case 'get_media_insights':
          return await this.getMediaInsights(input.params);
        case 'get_hashtag':
          return await this.getHashtag(input.params);
        case 'search_hashtag':
          return await this.searchHashtag(input.params);
        case 'get_account_insights':
          return await this.getAccountInsights(input.params);
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Get Instagram account info
   */
  private async getAccount(params: { accountId?: string }): Promise<ActorOutput> {
    const accountId = params.accountId || this.businessId;
    if (!accountId) {
      return { success: false, error: 'accountId is required (or set INSTAGRAM_BUSINESS_ID)' };
    }

    const data = await this.apiRequest(`/${accountId}`, {
      fields: 'id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count,is_verified,account_type',
    });

    const account: InstagramAccount = {
      id: data.id,
      username: data.username,
      name: data.name,
      biography: data.biography,
      website: data.website,
      profilePictureUrl: data.profile_picture_url,
      followersCount: data.followers_count || 0,
      followsCount: data.follows_count || 0,
      mediaCount: data.media_count || 0,
      isVerified: data.is_verified,
      accountType: data.account_type,
    };

    return {
      success: true,
      data: account,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'instagram-graph-api',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Get all media for the account
   */
  private async getMedia(params: {
    accountId?: string;
    limit?: number;
    type?: string;
  }): Promise<ActorOutput> {
    const accountId = params.accountId || this.businessId;
    if (!accountId) {
      return { success: false, error: 'accountId is required' };
    }

    const limit = Math.min(params.limit || 25, 100);
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';

    const data = await this.apiRequest(`/${accountId}/media`, {
      fields,
      limit: String(limit),
    });

    const media: InstagramMedia[] = (data.data || []).map((m: any) => ({
      id: m.id,
      caption: m.caption,
      mediaType: m.media_type,
      mediaUrl: m.media_url,
      thumbnailUrl: m.thumbnail_url,
      permalink: m.permalink,
      timestamp: m.timestamp,
      likeCount: m.like_count,
      commentsCount: m.comments_count,
    }));

    return {
      success: true,
      data: media,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'instagram-graph-api',
        itemsFound: media.length,
        duration: 0,
      },
    };
  }

  /**
   * Get insights for specific media
   */
  private async getMediaInsights(params: { mediaId: string }): Promise<ActorOutput> {
    if (!params.mediaId) {
      return { success: false, error: 'mediaId is required' };
    }

    const data = await this.apiRequest(`/${params.mediaId}/insights`, {
      metric: 'impressions,reach,engagement',
    });

    const insights: Record<string, number> = {};
    for (const item of data.data || []) {
      insights[item.name] = item.values?.[0]?.value || 0;
    }

    return {
      success: true,
      data: insights,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'instagram-graph-api',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Get account-level insights (followers, reach, impressions)
   */
  private async getAccountInsights(params: {
    accountId?: string;
    period?: string;
    metrics?: string;
  }): Promise<ActorOutput> {
    const accountId = params.accountId || this.businessId;
    if (!accountId) {
      return { success: false, error: 'accountId is required' };
    }

    const period = params.period || 'day';
    const metrics = params.metrics || 'follower_count,impressions,reach,profile_views';

    const data = await this.apiRequest(`/${accountId}/insights`, {
      metric: metrics,
      period,
    });

    const insights: Record<string, any> = {};
    for (const item of data.data || []) {
      insights[item.name] = {
        title: item.title,
        description: item.description,
        values: item.values,
      };
    }

    return {
      success: true,
      data: insights,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'instagram-graph-api',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Search a hashtag (find its ID first)
   */
  private async searchHashtag(params: { query: string }): Promise<ActorOutput> {
    if (!params.query) {
      return { success: false, error: 'query is required' };
    }

    const data = await this.apiRequest('/ig_hashtag_search', {
      q: params.query,
      'user_id': this.businessId || '',
    });

    const hashtags = (data.data || []).map((h: any) => ({
      id: h.id,
      name: h.name,
    }));

    return {
      success: true,
      data: hashtags,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'instagram-graph-api',
        itemsFound: hashtags.length,
        duration: 0,
      },
    };
  }

  /**
   * Get top media for a hashtag
   */
  private async getHashtag(params: {
    hashtagId: string;
    type?: 'top_media' | 'recent_media';
    limit?: number;
  }): Promise<ActorOutput> {
    if (!params.hashtagId) {
      return { success: false, error: 'hashtagId is required' };
    }

    const limit = Math.min(params.limit || 25, 50);
    const endpoint = params.type || 'top_media';

    const data = await this.apiRequest(`/${params.hashtagId}/${endpoint}`, {
      user_id: this.businessId || '',
      fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
      limit: String(limit),
    });

    const media: InstagramMedia[] = (data.data || []).map((m: any) => ({
      id: m.id,
      caption: m.caption,
      mediaType: m.media_type,
      mediaUrl: m.media_url,
      permalink: m.permalink,
      timestamp: m.timestamp,
      likeCount: m.like_count,
      commentsCount: m.comments_count,
    }));

    return {
      success: true,
      data: media,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'instagram-graph-api',
        itemsFound: media.length,
        duration: 0,
      },
    };
  }

  async validate(input: any): Promise<boolean> {
    if (!input?.params) return false;
    const action = input.action || 'get_account';
    return !!action && action.length > 0;
  }
}

export default InstagramActor;