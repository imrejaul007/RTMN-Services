/**
 * Reddit Actor
 * Extract posts, subreddit info, and trending content from Reddit
 */

// @ts-ignore - Using compiled output
import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/dist/index.js';
import type { CheerioAPI } from 'cheerio';

export interface RedditConfig {
  id: 'reddit';
  name: 'Reddit Actor';
  description: 'Extract posts, subreddit info, and trending content from Reddit';
  version: '1.0.0';
  capabilities: ['posts', 'subreddits', 'trending', 'comments'];
  rateLimit: { requests: number; window: number };
}

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
  isSpoiler?: boolean;
  isPinned?: boolean;
  awards?: Award[];
  userBadge?: string;
  linkFlair?: string;
  domain?: string;
}

export interface Award {
  name: string;
  icon: string;
  count: number;
  coinPrice?: number;
}

export interface Subreddit {
  name: string;
  displayName: string;
  title: string;
  description: string;
  sidebarText?: string;
  icon?: string;
  banner?: string;
  members: number;
  onlineMembers?: number;
  activeUsers?: number;
  createdAt: string;
  category?: string;
  rules?: SubredditRule[];
  isNsfw: boolean;
  isSubscribed: boolean;
  isMuted: boolean;
  isBanned: boolean;
  isFollowing: boolean;
  flairOptions?: string[];
  postTypes?: string[];
}

export interface SubredditRule {
  name: string;
  description: string;
  shortName: string;
}

export interface Comment {
  id: string;
  author: string;
  authorFlair?: string;
  text: string;
  timestamp: string;
  score: number;
  isOP: boolean;
  isDistinguished: boolean;
  isDeleted: boolean;
  isRemoved: boolean;
  depth: number;
  replies?: Comment[];
  awards?: Award[];
  permalink: string;
  parentId?: string;
  linkId?: string;
  gilded?: number;
}

export class RedditActor extends Actor {
  constructor() {
    super({
      id: 'reddit',
      name: 'Reddit Actor',
      description: 'Extract posts, subreddit info, and trending content from Reddit',
      version: '1.0.0',
      capabilities: ['posts', 'subreddits', 'trending', 'comments'],
      rateLimit: { requests: 20, window: 60000 },
    });
  }

  /**
   * Search for posts by query
   */
  async search_posts(input: {
    query: string;
    subreddit?: string;
    maxResults?: number;
    sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
    time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  }): Promise<ActorOutput> {
    const { query, subreddit, maxResults = 25, sort = 'relevance', time = 'all' } = input;

    try {
      let searchUrl: string;

      if (subreddit) {
        // Search within specific subreddit
        searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=${sort}&t=${time}&restrict_sr=1`;
      } else {
        // Global search
        searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=${sort}&t=${time}`;
      }

      const response = await fetchUrl(searchUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = JSON.parse(response);
      const posts = this.parseJsonPosts(data, maxResults);

      return {
        success: true,
        data: {
          query,
          subreddit: subreddit || 'all',
          sort,
          time,
          posts,
          totalResults: posts.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search posts',
      };
    }
  }

  /**
   * Get subreddit information
   */
  async get_subreddit(input: { subreddit: string; includeRules?: boolean }): Promise<ActorOutput> {
    const { subreddit, includeRules = false } = input;

    try {
      const cleanName = subreddit.replace(/^\/r\//, '').replace('r/', '');
      const aboutUrl = `https://www.reddit.com/r/${cleanName}/about.json`;
      const htmlUrl = `https://www.reddit.com/r/${cleanName}`;

      // Try JSON API first
      try {
        const response = await fetchUrl(aboutUrl, {
          timeout: 30000,
          headers: {
            'Accept': 'application/json',
          },
        });

        const data = JSON.parse(response);

        if (data?.data) {
          const subData = data.data;
          const subredditInfo: Subreddit = {
            name: cleanName,
            displayName: subData.display_name || cleanName,
            title: subData.title || '',
            description: subData.description || subData.public_description || '',
            sidebarText: subData.description_html || undefined,
            icon: subData.icon_img || subData.community_icon?.split('?')[0],
            banner: subData.banner_img || subData.banner_background_image,
            members: subData.subscribers || 0,
            onlineMembers: subData.accounts_active || undefined,
            activeUsers: subData.active_user_count,
            createdAt: new Date(subData.created_utc * 1000).toISOString(),
            category: subData.primary_color,
            isNsfw: subData.over18 || false,
            isSubscribed: subData.user_is_subscriber || false,
            isMuted: subData.user_has_fanned || false,
            isBanned: subData.user_is_banned || false,
            isFollowing: subData.user_is_contributor || false,
            flairOptions: subData.flair_options || undefined,
            postTypes: this.extractPostTypes(subData),
          };

          // Fetch rules if requested
          if (includeRules) {
            try {
              const rulesUrl = `https://www.reddit.com/r/${cleanName}/about/rules.json`;
              const rulesResponse = await fetchUrl(rulesUrl, {
                timeout: 15000,
                headers: { 'Accept': 'application/json' },
              });
              const rulesData = JSON.parse(rulesResponse);
              subredditInfo.rules = this.parseRules(rulesData);
            } catch {
              // Rules are optional
            }
          }

          return {
            success: true,
            data: subredditInfo,
          };
        }
      } catch {
        // Fallback to HTML parsing
      }

      // HTML fallback
      const html = await fetchUrl(htmlUrl, { timeout: 30000 });
      const subredditInfo = this.parseSubredditHtml(html, cleanName);

      return {
        success: true,
        data: subredditInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get subreddit',
      };
    }
  }

  /**
   * Get trending posts from subreddit or all
   */
  async get_trending(input?: { subreddit?: string; category?: string }): Promise<ActorOutput> {
    const { subreddit, category } = input || {};

    try {
      let url: string;

      if (subreddit) {
        const cleanName = subreddit.replace(/^\/r\//, '').replace('r/', '');
        url = category
          ? `https://www.reddit.com/r/${cleanName}/${category}.json`
          : `https://www.reddit.com/r/${cleanName}/hot.json`;
      } else {
        url = 'https://www.reddit.com/best.json';
      }

      const response = await fetchUrl(url, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = JSON.parse(response);
      const posts = this.parseJsonPosts(data, 25);

      return {
        success: true,
        data: {
          subreddit: subreddit || 'all',
          category: category || 'hot',
          posts,
          totalPosts: posts.length,
          scrapedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get trending',
      };
    }
  }

  private parseJsonPosts(data: any, maxResults: number): RedditPost[] {
    const posts: RedditPost[] = [];

    const children = data?.data?.children || [];
    const postData = children.slice(0, maxResults);

    for (const child of postData) {
      try {
        const post = this.extractPostFromJson(child.data);
        if (post) {
          posts.push(post);
        }
      } catch {
        // Skip malformed posts
      }
    }

    return posts;
  }

  private extractPostFromJson(post: any): RedditPost | null {
    if (!post?.id || !post?.title) return null;

    const awards: Award[] = [];
    if (post.all_awardings && post.all_awardings.length > 0) {
      for (const award of post.all_awardings.slice(0, 5)) {
        awards.push({
          name: award.name,
          icon: award.icon_url,
          count: award.count,
          coinPrice: award.coin_price,
        });
      }
    }

    return {
      id: post.id,
      title: post.title,
      text: post.selftext || undefined,
      author: post.author || '[deleted]',
      authorFlair: post.author_flair_text || undefined,
      subreddit: post.subreddit || '',
      subredditIcon: post.community_icon?.split('?')[0] || undefined,
      timestamp: new Date(post.created_utc * 1000).toISOString(),
      score: post.score || 0,
      upvotes: post.ups || 0,
      downvotes: post.downs || 0,
      numComments: post.num_comments || 0,
      url: post.url || undefined,
      permalink: post.permalink || `/r/${post.subreddit}/comments/${post.id}`,
      images: post.preview?.images?.[0]?.source?.url
        ? [post.preview.images[0].source.url.replace(/&amp;/g, '&')]
        : undefined,
      isVideo: post.is_video || false,
      isNsfw: post.over_18 || false,
      isSpoiler: post.spoiler || false,
      isPinned: post.pinned || false,
      awards: awards.length > 0 ? awards : undefined,
      userBadge: post.author_flair_css_class || undefined,
      linkFlair: post.link_flair_text || undefined,
      domain: post.domain || undefined,
    };
  }

  private parseSubredditHtml(html: string, name: string): Subreddit {
    const $ = parseHtml(html);

    // Extract from JSON-LD or script tags
    const jsonMatch = html.match(/"subscribers":\s*(\d+)/);
    const members = jsonMatch ? parseInt(jsonMatch[1]) : 0;

    const activeMatch = html.match(/"accountsActive":\s*(\d+)/);
    const activeUsers = activeMatch ? parseInt(activeMatch[1]) : 0;

    // Extract title
    const titleEl = $('h1.reddit-header__title, [data-testid="subreddit-title"]');
    const title = titleEl.text().trim() || name;

    // Extract description
    const descEl = $('[data-testid="subreddit-description"], .wiki-description');
    const description = descEl.text().trim() || '';

    // Extract icon
    const iconEl = $('img[data-testid="subreddit-icon"], .reddit-branded-hero img');
    const icon = iconEl.attr('src') || undefined;

    // Extract banner
    const bannerEl = $('img[data-testid="subreddit-banner-image"]');
    const banner = bannerEl.attr('src') || undefined;

    return {
      name,
      displayName: title,
      title,
      description,
      icon,
      banner,
      members,
      activeUsers,
      createdAt: new Date().toISOString(),
      isNsfw: false,
      isSubscribed: false,
      isMuted: false,
      isBanned: false,
      isFollowing: false,
    };
  }

  private parseRules(data: any): SubredditRule[] {
    const rules: SubredditRule[] = [];
    const rulesList = data?.data?.rules || [];

    for (const rule of rulesList) {
      rules.push({
        name: rule.short_name || rule.priority?.toString() || '',
        description: rule.description || '',
        shortName: rule.short_name || '',
      });
    }

    return rules;
  }

  private extractPostTypes(data: any): string[] | undefined {
    const types: string[] = [];

    if (data.allow_images) types.push('images');
    if (data.allow_videos) types.push('videos');
    if (data.allow_polls) types.push('polls');
    if (data.allow_text_crossposts) types.push('crossposts');
    if (data.allow_predictions) types.push('predictions');

    return types.length > 0 ? types : undefined;
  }

  async scrape(input: any): Promise<ActorOutput> {
    // Route to appropriate action
    if (input.action === 'search_posts' || input.query) {
      return this.search_posts(input);
    } else if (input.action === 'get_subreddit' || input.subreddit) {
      return this.get_subreddit(input);
    } else if (input.action === 'get_trending') {
      return this.get_trending(input);
    }

    return {
      success: false,
      error: 'Unknown action. Use: search_posts, get_subreddit, or get_trending',
    };
  }

  async validate(input: any): Promise<boolean> {
    if (!input) return false;

    // Validate based on action
    if (input.action === 'search_posts' || input.query) {
      return !!(input.query && typeof input.query === 'string' && input.query.length > 0);
    } else if (input.action === 'get_subreddit' || input.subreddit) {
      return !!(input.subreddit && typeof input.subreddit === 'string' && input.subreddit.length > 0);
    } else if (input.action === 'get_trending') {
      return true; // No required params
    }

    return false;
  }
}

export default new RedditActor();
