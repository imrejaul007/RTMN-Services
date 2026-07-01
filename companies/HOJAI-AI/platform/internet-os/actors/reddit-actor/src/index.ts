/**
 * Reddit Actor - JSON API Version
 * Uses Reddit's official JSON API (no auth required for public reads)
 *
 * Endpoints:
 * - GET /r/{subreddit}/hot.json
 * - GET /r/{subreddit}/new.json
 * - GET /r/{subreddit}/top.json
 * - GET /r/{subreddit}/controversial.json
 * - GET /r/random.json
 * - GET /subreddits/by_name.json?names=programming,technology
 * - GET /search.json?q={query}&restrict_sr=1&sort=relevance
 *
 * Rate limits: 60 requests/minute (unauthenticated)
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';

const REDDIT_JSON = 'https://www.reddit.com';

export interface RedditPost {
  id: string;
  title: string;
  text?: string;
  author: string;
  authorFlair?: string;
  subreddit: string;
  subredditIcon?: string;
  timestamp: string;
  score: number;
  upvotes: number;
  downvotes: number;
  numComments: number;
  url?: string;
  permalink: string;
  images?: string[];
  isVideo?: boolean;
  isNsfw?: boolean;
  isPinned?: boolean;
  awards?: string[];
  linkFlair?: string;
}

export class RedditActor extends Actor {
  constructor() {
    super({
      id: 'reddit',
      name: 'Reddit Actor',
      description: 'Extract posts, trending, and search from Reddit via official JSON API',
      version: '2.0.0',
      capabilities: ['subreddit_posts', 'search', 'trending', 'comments', 'api-based'],
      rateLimit: { requests: 60, window: 60000 },
    });
  }

  private async redditJson(path: string): Promise<any> {
    const url = `${REDDIT_JSON}${path}`;
    const response = await fetchUrl(url, {
      headers: {
        'User-Agent': 'HOJAI-InternetOS/1.0 (web scraper; contact@hojai.ai)',
      },
      timeout: 15000,
      retries: 2,
    });

    const data = JSON.parse(response);
    return data;
  }

  private parsePost(post: any): RedditPost | null {
    const d = post.data;
    if (!d || d.stickied) return null;

    // Extract images from preview
    const images: string[] = [];
    const preview = d.preview?.images?.[0]?.source;
    if (preview) {
      images.push(preview.url.replace(/&amp;/g, '&'));
    }
    // Gallery images
    const gallery = d.gallery_data?.items || [];
    const mediaMeta = d.media_metadata || {};
    for (const item of gallery) {
      const meta = mediaMeta[item.media_id];
      if (meta?.s?.u) {
        images.push(meta.s.u.replace(/&amp;/g, '&'));
      }
    }

    // Awards
    const awards = Object.keys(d.all_awardings || {}).map((a: any) =>
      d.all_awardings[a]?.name
    ).filter(Boolean);

    return {
      id: d.id,
      title: d.title || '',
      text: d.selftext || undefined,
      author: d.author || '[deleted]',
      authorFlair: d.author_flair_text || undefined,
      subreddit: d.subreddit || '',
      subredditIcon: d.sr_detail?.icon_img || undefined,
      timestamp: new Date(d.created_utc * 1000).toISOString(),
      score: d.score || 0,
      upvotes: d.ups || 0,
      downvotes: d.downs || 0,
      numComments: d.num_comments || 0,
      url: d.url || undefined,
      permalink: `https://reddit.com${d.permalink}`,
      images: images.length > 0 ? images : undefined,
      isVideo: d.is_video || false,
      isNsfw: d.over_18 || false,
      isPinned: d.stickied || false,
      awards: awards.length > 0 ? awards : undefined,
      linkFlair: d.link_flair_text || undefined,
    };
  }

  async scrape(input: any): Promise<ActorOutput> {
    try {
      const action = input.action || 'subreddit_posts';
      const params = input.params || {};

      switch (action) {
        case 'subreddit_posts':
          return await this.getSubredditPosts(params);
        case 'search':
          return await this.searchPosts(params);
        case 'trending':
          return await this.getTrending(params);
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

  private async getSubredditPosts(params: {
    subreddit: string;
    sort?: 'hot' | 'new' | 'top' | 'controversial';
    limit?: number;
  }): Promise<ActorOutput> {
    if (!params.subreddit) {
      return { success: false, error: 'subreddit is required' };
    }

    const sort = params.sort || 'hot';
    const limit = Math.min(params.limit || 25, 100);

    const data = await this.redditJson(
      `/r/${encodeURIComponent(params.subreddit)}/${sort}.json?limit=${limit}`
    );

    const posts: RedditPost[] = [];
    for (const child of data.data?.children || []) {
      const post = this.parsePost(child);
      if (post) posts.push(post);
    }

    return {
      success: true,
      data: {
        subreddit: params.subreddit,
        sort,
        posts,
        after: data.data?.after,
        before: data.data?.before,
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'reddit-json-api',
        itemsFound: posts.length,
        duration: 0,
      },
    };
  }

  private async searchPosts(params: {
    query: string;
    subreddit?: string;
    sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
    limit?: number;
  }): Promise<ActorOutput> {
    if (!params.query) {
      return { success: false, error: 'query is required' };
    }

    const sort = params.sort || 'relevance';
    const limit = Math.min(params.limit || 25, 100);

    let path = `/search.json?q=${encodeURIComponent(params.query)}&restrict_sr=${params.subreddit ? 1 : 0}&sort=${sort}&limit=${limit}`;
    if (params.subreddit) {
      path = `/r/${encodeURIComponent(params.subreddit)}/search.json?q=${encodeURIComponent(params.query)}&restrict_sr=1&sort=${sort}&limit=${limit}`;
    }

    const data = await this.redditJson(path);

    const posts: RedditPost[] = [];
    for (const child of data.data?.children || []) {
      const post = this.parsePost(child);
      if (post) posts.push(post);
    }

    return {
      success: true,
      data: {
        query: params.query,
        subreddit: params.subreddit || 'all',
        sort,
        posts,
        after: data.data?.after,
      },
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'reddit-json-api',
        itemsFound: posts.length,
        duration: 0,
      },
    };
  }

  private async getTrending(params: {
    limit?: number;
  }): Promise<ActorOutput> {
    const limit = Math.min(params.limit || 25, 100);

    // Get multiple sort types for trending
    const [hotData, newData, topData] = await Promise.all([
      this.redditJson(`/hot.json?limit=${limit}`).catch(() => null),
      this.redditJson(`/new.json?limit=${limit}`).catch(() => null),
      this.redditJson(`/top.json?limit=${limit}`).catch(() => null),
    ]);

    const trending: Record<string, RedditPost[]> = {};

    if (hotData?.data?.children) {
      trending.hot = hotData.data.children
        .map((c: any) => this.parsePost(c))
        .filter(Boolean) as RedditPost[];
    }
    if (newData?.data?.children) {
      trending.new = newData.data.children
        .map((c: any) => this.parsePost(c))
        .filter(Boolean) as RedditPost[];
    }
    if (topData?.data?.children) {
      trending.top = topData.data.children
        .map((c: any) => this.parsePost(c))
        .filter(Boolean) as RedditPost[];
    }

    return {
      success: true,
      data: trending,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'reddit-json-api',
        itemsFound: Object.values(trending).flat().length,
        duration: 0,
      },
    };
  }

  async validate(input: any): Promise<boolean> {
    return !!(input?.params?.subreddit || input?.params?.query);
  }
}

export default RedditActor;