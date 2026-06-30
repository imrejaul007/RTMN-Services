/**
 * YouTube Actor - Data API v3 Version
 * Uses YouTube's official Data API v3 (free tier: 10K units/day)
 *
 * Major improvements over previous version:
 * - Uses official API instead of HTML scraping
 * - No more fragile ytInitialData JSON regex parsing
 * - No more data-testid selector hunting
 * - Reliable structured JSON responses
 *
 * Requires: YOUTUBE_API_KEY environment variable
 * Get a key at: https://console.cloud.google.com/apis/credentials
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';

export interface VideoInfo {
  id?: string;
  title?: string;
  channelId?: string;
  channelName?: string;
  description?: string;
  views?: number;
  likes?: number;
  comments?: number;
  duration?: string;
  publishedAt?: string;
  thumbnail?: string;
  url?: string;
  tags?: string[];
}

export interface ChannelInfo {
  id?: string;
  name?: string;
  description?: string;
  subscribers?: number;
  videoCount?: number;
  viewCount?: number;
  country?: string;
  customUrl?: string;
  thumbnail?: string;
  url?: string;
  createdAt?: string;
}

export interface SearchVideosInput {
  query: string;
  limit?: number;
  type?: 'video' | 'channel' | 'playlist';
  order?: 'date' | 'rating' | 'relevance' | 'viewCount' | 'title';
}

export interface GetVideoInput {
  videoId: string;
  parts?: string[]; // parts of video resource to fetch (snippet, statistics, contentDetails, etc.)
}

export interface GetChannelInput {
  channelId?: string;
  username?: string; // @username handle
}

export interface GetTrendingInput {
  region?: string;   // ISO 3166-1 alpha-2 country code, e.g. 'IN', 'US'
  limit?: number;
  category?: string; // music, gaming, news, etc.
}

export class YouTubeActor extends Actor {
  private readonly API_URL = 'https://www.googleapis.com/youtube/v3';
  private apiKey?: string;

  constructor(apiKey?: string) {
    super({
      id: 'youtube',
      name: 'YouTube Actor',
      description: 'Extract video, channel, and search data from YouTube via the official Data API v3',
      version: '2.0.0',
      capabilities: ['videos', 'channels', 'trending', 'search', 'api-based'],
      rateLimit: { requests: 100, window: 60000 },
    });

    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY;
    if (!this.apiKey) {
      console.warn('YouTubeActor: YOUTUBE_API_KEY not set. Get one at https://console.cloud.google.com/apis/credentials');
    }
  }

  /**
   * Make an authenticated YouTube Data API request
   * YouTube Data API v3 uses ?key=... query parameter
   */
  private async apiRequest(path: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('YouTube API key required. Set YOUTUBE_API_KEY env var.');
    }

    const url = new URL(`${this.API_URL}${path}`);
    url.searchParams.set('key', this.apiKey);

    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }

    const response = await fetchUrl(url.toString(), {
      timeout: 30000,
      retries: 3,
    });

    return JSON.parse(response);
  }

  /**
   * Main scrape method - routes to handler
   */
  async scrape(input: {
    action: 'search_videos' | 'get_video' | 'get_channel' | 'get_trending';
    params: SearchVideosInput | GetVideoInput | GetChannelInput | GetTrendingInput;
  }): Promise<ActorOutput> {
    try {
      switch (input.action) {
        case 'search_videos':
          return await this.searchVideos(input.params as SearchVideosInput);
        case 'get_video':
          return await this.getVideo(input.params as GetVideoInput);
        case 'get_channel':
          return await this.getChannel(input.params as GetChannelInput);
        case 'get_trending':
          return await this.getTrending(input.params as GetTrendingInput);
        default:
          return {
            success: false,
            error: `Unknown action: ${input.action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search videos via the official search API
   */
  private async searchVideos(params: SearchVideosInput): Promise<ActorOutput> {
    const limit = Math.min(params.limit || 10, 50);
    const type = params.type || 'video';
    const order = params.order || 'relevance';

    const data = await this.apiRequest('/search', {
      part: 'snippet',
      q: params.query,
      type,
      order,
      maxResults: limit,
    });

    const videos: VideoInfo[] = (data.items || []).map((item: any) => ({
      id: item.id?.videoId || item.id?.channelId,
      title: item.snippet?.title,
      channelId: item.snippet?.channelId,
      channelName: item.snippet?.channelTitle,
      description: item.snippet?.description,
      publishedAt: item.snippet?.publishedAt,
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
      url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : null,
    }));

    return {
      success: true,
      data: videos,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'youtube',
        itemsFound: videos.length,
        duration: 0,
      },
    };
  }

  /**
   * Get video details by ID
   */
  private async getVideo(params: GetVideoInput): Promise<ActorOutput> {
    const parts = params.parts?.join(',') || 'snippet,statistics,contentDetails';
    const data = await this.apiRequest('/videos', {
      part: parts,
      id: params.videoId,
    });

    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: `Video not found: ${params.videoId}`,
      };
    }

    const v = data.items[0];
    const video: VideoInfo = {
      id: v.id,
      title: v.snippet?.title,
      channelId: v.snippet?.channelId,
      channelName: v.snippet?.channelTitle,
      description: v.snippet?.description,
      views: parseInt(v.statistics?.viewCount || '0'),
      likes: parseInt(v.statistics?.likeCount || '0'),
      comments: parseInt(v.statistics?.commentCount || '0'),
      duration: v.contentDetails?.duration, // ISO 8601, e.g. PT15M33S
      publishedAt: v.snippet?.publishedAt,
      thumbnail: v.snippet?.thumbnails?.maxres?.url || v.snippet?.thumbnails?.high?.url,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      tags: v.snippet?.tags,
    };

    return {
      success: true,
      data: video,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'youtube',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Get channel info by ID or username
   */
  private async getChannel(params: GetChannelInput): Promise<ActorOutput> {
    const params_: any = {
      part: 'snippet,statistics,contentDetails',
    };

    if (params.channelId) {
      params_.id = params.channelId;
    } else if (params.username) {
      params_.forHandle = params.username.replace(/^@/, '');
    } else {
      return {
        success: false,
        error: 'Either channelId or username must be provided',
      };
    }

    const data = await this.apiRequest('/channels', params_);

    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: 'Channel not found',
      };
    }

    const c = data.items[0];
    const channel: ChannelInfo = {
      id: c.id,
      name: c.snippet?.title,
      description: c.snippet?.description,
      subscribers: parseInt(c.statistics?.subscriberCount || '0'),
      videoCount: parseInt(c.statistics?.videoCount || '0'),
      viewCount: parseInt(c.statistics?.viewCount || '0'),
      country: c.snippet?.country,
      customUrl: c.snippet?.customUrl,
      thumbnail: c.snippet?.thumbnails?.high?.url || c.snippet?.thumbnails?.default?.url,
      url: `https://www.youtube.com/channel/${c.id}`,
      createdAt: c.snippet?.publishedAt,
    };

    return {
      success: true,
      data: channel,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'youtube',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Get trending videos using the videos list API, sorted by viewCount
   * This is an approximation of trending - uses highly-viewed recent videos
   * For the official trending feed, use chart=mostPopular
   */
  private async getTrending(params: GetTrendingInput): Promise<ActorOutput> {
    const limit = Math.min(params.limit || 10, 50);
    const region = params.region || 'US';
    const params_: any = {
      part: 'snippet,statistics,contentDetails',
      chart: 'mostPopular',
      regionCode: region,
      maxResults: limit,
    };
    if (params.category) {
      params_.videoCategoryId = params.category;
    }

    const data = await this.apiRequest('/videos', params_);

    const videos: VideoInfo[] = (data.items || []).map((v: any) => ({
      id: v.id,
      title: v.snippet?.title,
      channelId: v.snippet?.channelId,
      channelName: v.snippet?.channelTitle,
      description: v.snippet?.description,
      views: parseInt(v.statistics?.viewCount || '0'),
      likes: parseInt(v.statistics?.likeCount || '0'),
      comments: parseInt(v.statistics?.commentCount || '0'),
      duration: v.contentDetails?.duration,
      publishedAt: v.snippet?.publishedAt,
      thumbnail: v.snippet?.thumbnails?.maxres?.url || v.snippet?.thumbnails?.high?.url,
      url: `https://www.youtube.com/watch?v=${v.id}`,
    }));

    return {
      success: true,
      data: videos,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'youtube',
        itemsFound: videos.length,
        duration: 0,
      },
    };
  }

  async validate(input: any): Promise<boolean> {
    if (!input || !input.action) return false;
    return ['search_videos', 'get_video', 'get_channel', 'get_trending'].includes(input.action);
  }
}

export default YouTubeActor;