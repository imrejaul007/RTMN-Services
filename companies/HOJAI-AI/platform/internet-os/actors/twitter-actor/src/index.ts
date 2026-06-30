/**
 * Twitter (X) Actor
 * Extract tweets, user profiles, and trending topics from Twitter/X
 */

// @ts-ignore - Using compiled output
import { Actor, ActorOutput, fetchUrl, parseHtml } from '../../actor-runtime/dist/index.js';
import type { CheerioAPI } from 'cheerio';

export interface TwitterConfig {
  id: 'twitter';
  name: 'Twitter (X) Actor';
  description: 'Extract tweets, user profiles, and trending topics from Twitter/X';
  version: '1.0.0';
  capabilities: ['tweets', 'profiles', 'trending', 'sentiment'];
  rateLimit: { requests: number; window: number };
}

export interface Tweet {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  authorAvatar?: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
  views?: number;
  isRetweet?: boolean;
  retweetedBy?: string;
  images?: string[];
  urls?: string[];
  hashtags?: string[];
  mentions?: string[];
}

export interface Profile {
  handle: string;
  displayName: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedDate?: string;
  following: number;
  followers: number;
  tweets: number;
  likes: number;
  isVerified: boolean;
  isPrivate: boolean;
  bannerImage?: string;
  avatarImage?: string;
}

export interface TrendingTopic {
  name: string;
  query: string;
  tweetVolume?: number;
  category?: string;
  promoted?: boolean;
}

export class TwitterActor extends Actor {
  constructor() {
    super({
      id: 'twitter',
      name: 'Twitter (X) Actor',
      description: 'Extract tweets, user profiles, and trending topics from Twitter/X',
      version: '1.0.0',
      capabilities: ['tweets', 'profiles', 'trending', 'sentiment'],
      rateLimit: { requests: 10, window: 60000 },
    });
  }

  /**
   * Search for tweets by query
   */
  async search_tweets(input: {
    query: string;
    maxResults?: number;
    type?: 'latest' | 'top' | 'photos' | 'videos';
  }): Promise<ActorOutput> {
    const { query, maxResults = 20, type = 'latest' } = input;

    try {
      const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&f=${type}`;
      const html = await fetchUrl(searchUrl, { timeout: 30000 });

      const tweets = this.parseTweetResults(html, maxResults);

      return {
        success: true,
        data: {
          query,
          type,
          tweets,
          totalResults: tweets.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search tweets',
      };
    }
  }

  /**
   * Get user profile information
   */
  async get_profile(input: { handle: string }): Promise<ActorOutput> {
    const { handle } = input;

    try {
      // Clean handle
      const cleanHandle = handle.replace('@', '').trim();
      const profileUrl = `https://x.com/${cleanHandle}`;
      const html = await fetchUrl(profileUrl, { timeout: 30000 });

      const profile = this.parseProfile(html, cleanHandle);

      if (!profile) {
        return {
          success: false,
          error: 'Profile not found',
        };
      }

      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile',
      };
    }
  }

  /**
   * Get trending topics
   */
  async get_trending(input?: { location?: string }): Promise<ActorOutput> {
    const location = input?.location || 'worldwide';

    try {
      // Trending page
      const trendingUrl = `https://x.com/i/trends`;
      const html = await fetchUrl(trendingUrl, { timeout: 30000 });

      const trends = this.parseTrending(html);

      return {
        success: true,
        data: {
          location,
          trends,
          totalTrends: trends.length,
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

  private parseTweetResults(html: string, maxResults: number): Tweet[] {
    const tweets: Tweet[] = [];
    const $ = parseHtml(html);

    // Parse tweet articles
    const tweetArticles = $('article[data-testid="tweet"]');

    tweetArticles.slice(0, maxResults).each((_, article) => {
      try {
        const tweet = this.extractTweet($, article);
        if (tweet) {
          tweets.push(tweet);
        }
      } catch {
        // Skip malformed tweets
      }
    });

    return tweets;
  }

  private extractTweet($: CheerioAPI, article: any): Tweet | null {
    const tweet: Partial<Tweet> = {};

    // Extract tweet text
    const textEl = $(article).find('[data-testid="tweetText"]');
    tweet.text = textEl.text().trim();

    if (!tweet.text) return null;

    // Extract author info
    const authorEl = $(article).find('[data-testid="User-Name"] a[role="link"]');
    const authorLink = authorEl.first();
    const href = authorLink.attr('href') || '';
    tweet.authorHandle = href.replace('/', '') || 'unknown';
    tweet.author = authorLink.find('span').first().text().trim() || tweet.authorHandle;

    // Extract timestamp
    const timeEl = $(article).find('time');
    tweet.timestamp = timeEl.attr('datetime') || new Date().toISOString();

    // Extract tweet ID from link
    const linkEl = $(article).find('a[href*="/status/"]').first();
    const statusHref = linkEl.attr('href') || '';
    const idMatch = statusHref.match(/\/status\/(\d+)/);
    tweet.id = idMatch?.[1] || '';

    // Extract engagement metrics
    const likeEl = $(article).find('[data-testid="like"]');
    tweet.likes = this.parseMetric(likeEl.text());

    const retweetEl = $(article).find('[data-testid="retweet"]');
    tweet.retweets = this.parseMetric(retweetEl.text());

    const replyEl = $(article).find('[data-testid="reply"]');
    tweet.replies = this.parseMetric(replyEl.text());

    // Extract views
    const viewEl = $(article).find('a[href*="retweets"][href*="views"], span:contains("Views")');
    if (viewEl.length > 0) {
      const viewText = viewEl.text().match(/[\d,]+/)?.[0] || '0';
      tweet.views = parseInt(viewText.replace(/,/g, ''));
    }

    // Extract images
    const images: string[] = [];
    $(article).find('img[src*="media"]').each((_, img) => {
      const src = $(img).attr('src');
      if (src) images.push(src);
    });
    tweet.images = images.length > 0 ? images : undefined;

    // Extract hashtags and mentions from text
    tweet.hashtags = tweet.text.match(/#\w+/g) || undefined;
    tweet.mentions = tweet.text.match(/@\w+/g) || undefined;

    // Check for retweet
    const retweetLabel = $(article).find('span:contains("reposted")');
    if (retweetLabel.length > 0) {
      tweet.isRetweet = true;
      const repostedBy = $(article).find('[data-testid="User-Name"] span').first().text();
      tweet.retweetedBy = repostedBy.replace('reposted', '').trim();
    }

    return tweet as Tweet;
  }

  private parseProfile(html: string, handle: string): Partial<Profile> {
    const $ = parseHtml(html);
    const profile: Partial<Profile> = {
      handle,
      displayName: '',
      following: 0,
      followers: 0,
      tweets: 0,
      likes: 0,
      isVerified: false,
      isPrivate: false,
    };

    // Extract display name
    const displayNameEl = $('[data-testid="UserName"] span').first();
    profile.displayName = displayNameEl.text().trim() || handle;

    // Extract bio
    const bioEl = $('[data-testid="UserDescription"]');
    profile.bio = bioEl.text().trim() || undefined;

    // Extract location
    const locationEl = $('[data-testid="UserLocation"]');
    profile.location = locationEl.text().trim() || undefined;

    // Extract website
    const websiteEl = $('[data-testid="UserUrl"] a');
    profile.website = websiteEl.attr('href') || undefined;

    // Extract join date
    const joinEl = $('[data-testid="UserJoinDate"]');
    const joinText = joinEl.text().trim();
    if (joinText) {
      profile.joinedDate = joinText.replace('Joined ', '').trim();
    }

    // Extract stats
    const statsLinks = $('a[href*="/following"], a[href*="/followers"], a[href$="/with_replies"], a[data-testid="追随者"], a[data-testid="关注中"]');

    $('a[role="tab"]').each((_, tab) => {
      const href = $(tab).attr('href') || '';
      const text = $(tab).find('span').text() || $(tab).text();
      const count = this.parseMetric(text);

      if (href.includes('following') || text.toLowerCase().includes('following')) {
        profile.following = count;
      } else if (href.includes('followers') || text.toLowerCase().includes('followers')) {
        profile.followers = count;
      } else if (href.includes('with_replies') || text.toLowerCase().includes('tweet')) {
        profile.tweets = count;
      }
    });

    // Check verification
    const verifiedEl = $('[data-testid="icon-verified"], svg path[d*="M9"]');
    profile.isVerified = verifiedEl.length > 0;

    // Check if private
    const privateEl = $('span:contains("account is private"), span:contains("This account is private")');
    profile.isPrivate = privateEl.length > 0;

    // Extract avatar and banner
    const avatarEl = $('img[alt*="profile"], [data-testid="UserAvatar"] img');
    profile.avatarImage = avatarEl.first().attr('src') || undefined;

    const bannerEl = $('[data-testid="profile-banner"] img, [data-testid="heroImage"] img');
    profile.bannerImage = bannerEl.attr('src') || undefined;

    return profile;
  }

  private parseTrending(html: string): TrendingTopic[] {
    const trends: TrendingTopic[] = [];
    const $ = parseHtml(html);

    // Parse trending items - Twitter uses various selectors
    const trendItems = $('[data-testid="trend"], .trend-item, [href*="/search?q="]');

    trendItems.each((_, item) => {
      const $item = $(item);
      const text = $item.text().trim();
      const href = $item.attr('href') || '';

      if (text && !text.match(/^\d+$/)) {
        const trend: TrendingTopic = {
          name: text,
          query: href.split('?q=')[1]?.split('&')[0] || text,
        };

        // Extract tweet volume
        const volumeMatch = text.match(/(\d+[\d,.]*[KMB]?)\s*(tweet|post)?/i);
        if (volumeMatch) {
          trend.tweetVolume = this.parseCompactNumber(volumeMatch[1]);
        }

        // Check if promoted
        const promotedEl = $item.find('span:contains("Promoted"), span:contains("promoted")');
        trend.promoted = promotedEl.length > 0;

        trends.push(trend);
      }
    });

    return trends.slice(0, 20);
  }

  private parseMetric(text: string): number {
    if (!text) return 0;

    // Remove icons and whitespace
    const cleaned = text.trim();

    // Parse compact numbers (1.2K, 3.4M, 5B)
    const match = cleaned.match(/([\d.]+)\s*([KMB])?/i);
    if (!match) return 0;

    let value = parseFloat(match[1]);
    const suffix = match[2]?.toUpperCase();

    switch (suffix) {
      case 'K':
        value *= 1000;
        break;
      case 'M':
        value *= 1000000;
        break;
      case 'B':
        value *= 1000000000;
        break;
    }

    return Math.round(value);
  }

  private parseCompactNumber(text: string): number {
    if (!text) return 0;

    const match = text.match(/([\d.]+)\s*([KMB]?)/i);
    if (!match) return 0;

    let value = parseFloat(match[1]);
    const suffix = match[2]?.toUpperCase();

    switch (suffix) {
      case 'K':
        return Math.round(value * 1000);
      case 'M':
        return Math.round(value * 1000000);
      case 'B':
        return Math.round(value * 1000000000);
      default:
        return parseInt(text.replace(/[^\d]/g, '')) || 0;
    }
  }

  async scrape(input: any): Promise<ActorOutput> {
    // Route to appropriate action based on input
    if (input.action === 'search_tweets' || input.query) {
      return this.search_tweets(input);
    } else if (input.action === 'get_profile' || input.handle) {
      return this.get_profile(input);
    } else if (input.action === 'get_trending') {
      return this.get_trending(input);
    }

    return {
      success: false,
      error: 'Unknown action. Use: search_tweets, get_profile, or get_trending',
    };
  }

  async validate(input: any): Promise<boolean> {
    if (!input) return false;

    // Validate based on action
    if (input.action === 'search_tweets' || input.query) {
      return !!(input.query && typeof input.query === 'string' && input.query.length > 0);
    } else if (input.action === 'get_profile' || input.handle) {
      return !!(input.handle && typeof input.handle === 'string' && input.handle.length > 0);
    } else if (input.action === 'get_trending') {
      return true; // No required params
    }

    return false;
  }
}

export default new TwitterActor();
