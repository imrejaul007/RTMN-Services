/**
 * Twitter/X Actor - API v2 Version
 * Uses the official Twitter API v2 (paid tier)
 *
 * Requires Bearer Token from: https://developer.twitter.com/
 * Set TWITTER_BEARER_TOKEN environment variable
 *
 * Pricing tiers (as of 2024):
 * - Free: 100 tweets/month (very limited)
 * - Basic ($100/mo): 10K tweets/month
 * - Pro ($5K/mo): 1M tweets/month
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  username?: string;
  name?: string;
  createdAt?: string;
  metrics?: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    views?: number;
  };
  url?: string;
  language?: string;
}

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  followers: number;
  following: number;
  tweets: number;
  verified: boolean;
  profileImage?: string;
  createdAt?: string;
}

export class TwitterApiActor extends Actor {
  private bearerToken?: string;
  private readonly API_URL = 'https://api.twitter.com/2';

  constructor(bearerToken?: string) {
    super({
      id: 'twitter-api',
      name: 'Twitter API v2 Actor',
      description: 'Official Twitter/X API v2 access for tweets, users, and search',
      version: '1.0.0',
      capabilities: ['tweets', 'users', 'search', 'mentions', 'timelines', 'api-based'],
      rateLimit: { requests: 50, window: 60000 }, // Subject to Twitter's own limits
    });
    this.bearerToken = bearerToken || process.env.TWITTER_BEARER_TOKEN;
  }

  /**
   * Make authenticated Twitter API v2 request
   * Uses OAuth 2.0 Bearer Token (App-only auth)
   */
  private async apiRequest(path: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.bearerToken) {
      throw new Error(
        'Twitter Bearer Token required. Set TWITTER_BEARER_TOKEN env var. ' +
        'Get a token at https://developer.twitter.com/'
      );
    }

    const url = new URL(`${this.API_URL}${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }

    const response = await fetchUrl(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      retries: 3,
    });

    return JSON.parse(response);
  }

  async scrape(input: any): Promise<ActorOutput> {
    try {
      const action = input.action || 'search_tweets';

      switch (action) {
        case 'search_tweets':
          return await this.searchTweets(input.params);
        case 'get_user':
          return await this.getUser(input.params);
        case 'get_user_tweets':
          return await this.getUserTweets(input.params);
        case 'get_tweet':
          return await this.getTweet(input.params);
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search recent tweets (last 7 days)
   */
  private async searchTweets(params: {
    query: string;
    limit?: number;
    nextToken?: string;
  }): Promise<ActorOutput> {
    if (!params.query) {
      return { success: false, error: 'query is required' };
    }

    const limit = Math.min(params.limit || 10, 100);
    const data = await this.apiRequest('/tweets/search/recent', {
      query: params.query + ' -is:retweet', // exclude retweets for cleaner results
      max_results: limit,
      'tweet.fields': 'created_at,author_id,public_metrics,lang',
      'expansions': 'author_id',
      'user.fields': 'username,name,verified,public_metrics',
      'next_token': params.nextToken,
    });

    const tweets = this.parseTweets(data);

    return {
      success: true,
      data: {
        tweets,
        nextToken: data.meta?.next_token,
        total: data.meta?.result_count,
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'twitter-api',
        itemsFound: tweets.tweets.length,
        duration: 0,
      },
    };
  }

  /**
   * Get user by username
   */
  private async getUser(params: { username: string }): Promise<ActorOutput> {
    if (!params.username) {
      return { success: false, error: 'username is required' };
    }

    const data = await this.apiRequest(`/users/by/username/${encodeURIComponent(params.username)}`, {
      'user.fields': 'description,public_metrics,verified,profile_image_url,created_at',
    });

    if (!data.data) {
      return { success: false, error: `User not found: ${params.username}` };
    }

    const user: TwitterUser = {
      id: data.data.id,
      username: data.data.username,
      name: data.data.name,
      description: data.data.description,
      followers: data.data.public_metrics?.followers_count || 0,
      following: data.data.public_metrics?.following_count || 0,
      tweets: data.data.public_metrics?.tweet_count || 0,
      verified: data.data.verified || false,
      profileImage: data.data.profile_image_url,
      createdAt: data.data.created_at,
    };

    return {
      success: true,
      data: user,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'twitter-api',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Get a user's tweets
   */
  private async getUserTweets(params: {
    userId: string;
    limit?: number;
    paginationToken?: string;
  }): Promise<ActorOutput> {
    if (!params.userId) {
      return { success: false, error: 'userId is required' };
    }

    const limit = Math.min(params.limit || 10, 100);
    const data = await this.apiRequest(`/users/${encodeURIComponent(params.userId)}/tweets`, {
      max_results: limit,
      'tweet.fields': 'created_at,public_metrics,lang',
      'pagination_token': params.paginationToken,
    });

    const tweets = this.parseTweets(data);

    return {
      success: true,
      data: {
        tweets,
        nextToken: data.meta?.next_token,
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'twitter-api',
        itemsFound: tweets.tweets.length,
        duration: 0,
      },
    };
  }

  /**
   * Get a single tweet
   */
  private async getTweet(params: { tweetId: string }): Promise<ActorOutput> {
    if (!params.tweetId) {
      return { success: false, error: 'tweetId is required' };
    }

    const data = await this.apiRequest(`/tweets/${encodeURIComponent(params.tweetId)}`, {
      'tweet.fields': 'created_at,author_id,public_metrics,lang',
      'expansions': 'author_id',
      'user.fields': 'username,name',
    });

    if (!data.data) {
      return { success: false, error: 'Tweet not found' };
    }

    return {
      success: true,
      data: this.parseTweets(data).tweets[0],
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'twitter-api',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Map Twitter API response to our Tweet type
   */
  private parseTweets(data: any): { tweets: Tweet[] } {
    const tweets: Tweet[] = [];
    const users = new Map<string, any>();

    // Build user lookup map
    if (data.includes?.users) {
      for (const user of data.includes.users) {
        users.set(user.id, user);
      }
    }

    for (const t of data.data || []) {
      const author = users.get(t.author_id);
      const tweet: Tweet = {
        id: t.id,
        text: t.text,
        authorId: t.author_id,
        username: author?.username,
        name: author?.name,
        createdAt: t.created_at,
        language: t.lang,
        metrics: {
          likes: t.public_metrics?.like_count || 0,
          retweets: t.public_metrics?.retweet_count || 0,
          replies: t.public_metrics?.reply_count || 0,
          quotes: t.public_metrics?.quote_count || 0,
          views: t.public_metrics?.impression_count,
        },
        url: author?.username ? `https://twitter.com/${author.username}/status/${t.id}` : undefined,
      };
      tweets.push(tweet);
    }

    return { tweets };
  }

  async validate(input: any): Promise<boolean> {
    return !!(input?.params?.query || input?.params?.username || input?.params?.userId || input?.params?.tweetId);
  }
}

export default TwitterApiActor;