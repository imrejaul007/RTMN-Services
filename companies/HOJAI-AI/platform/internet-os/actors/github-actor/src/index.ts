/**
 * GitHub Actor - API-Based Version
 * Uses GitHub's official REST API (api.github.com) instead of HTML scraping
 *
 * Changes:
 * - Uses REST API for reliability
 * - All requests go through api.github.com
 * - Supports GitHub tokens for higher rate limits
 * - Removes fragile HTML/selector scraping
 */

import { Actor, ActorOutput, fetchUrl } from '@hojai/actor-runtime';

/**
 * GitHub Actor configuration
 */
export interface GitHubConfig {
  id: 'github';
  name: 'GitHub Actor';
  description: 'Extract repository information, user profiles, and trending projects from GitHub';
  version: '1.1.0';
  capabilities: string[];
  rateLimit: { requests: number; window: number };
}

/**
 * Repository information from GitHub API
 */
export interface Repository {
  id?: number;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  stars: number;
  forks: number;
  language?: string;
  topics?: string[];
  license?: string;
  openIssues?: number;
  watchers?: number;
  lastUpdated?: string;
  createdAt?: string;
  homepage?: string;
  defaultBranch?: string;
}

export interface GitHubUser {
  username: string;
  name?: string;
  bio?: string;
  email?: string;
  company?: string;
  location?: string;
  blog?: string;
  twitterUsername?: string;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists?: number;
  avatarUrl?: string;
  profileUrl: string;
  accountCreatedAt?: string;
}

export interface SearchReposInput {
  query: string;
  language?: string;
  sort?: 'stars' | 'forks' | 'updated' | 'best-match';
  order?: 'asc' | 'desc';
  limit?: number;
}

export interface GetRepoInput {
  owner: string;
  repo: string;
}

export interface GetUserInput {
  username: string;
}

export interface GetTrendingInput {
  language?: string;
  since?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
}

export class GitHubActor extends Actor {
  private readonly API_URL = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    super({
      id: 'github',
      name: 'GitHub Actor',
      description: 'Extract repository information, user profiles, and trending projects from GitHub via the GitHub REST API',
      version: '1.1.0',
      capabilities: ['repositories', 'users', 'trending', 'code', 'api-based'],
      rateLimit: { requests: 60, window: 60000 },
    });
    // Support GitHub token via env var or param for higher rate limits
    this.token = token || process.env.GITHUB_TOKEN;
  }

  /**
   * Make an authenticated API request
   */
  private async apiRequest(path: string): Promise<any> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'HOJAI-InternetOS/1.0',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.API_URL}${path}`;
    const response = await fetchUrl(url, {
      headers,
      timeout: 30000,
      retries: 3,
    });

    return JSON.parse(response);
  }

  /**
   * Main scrape method - routes to appropriate handler based on action
   */
  async scrape(input: {
    action: 'search_repos' | 'get_repo' | 'get_user' | 'get_trending';
    params: SearchReposInput | GetRepoInput | GetUserInput | GetTrendingInput;
  }): Promise<ActorOutput> {
    try {
      switch (input.action) {
        case 'search_repos':
          return await this.searchRepos(input.params as SearchReposInput);
        case 'get_repo':
          return await this.getRepo(input.params as GetRepoInput);
        case 'get_user':
          return await this.getUser(input.params as GetUserInput);
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
   * Search repositories using the official search API
   */
  private async searchRepos(params: SearchReposInput): Promise<ActorOutput> {
    const limit = Math.min(params.limit || 30, 100);
    const sort = params.sort || 'stars';
    const order = params.order || 'desc';

    // Build query: combine text query with language filter
    let q = params.query;
    if (params.language) {
      q = `${q} language:${params.language}`;
    }

    const path = `/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=${order}&per_page=${limit}`;
    const data = await this.apiRequest(path);

    const repos: Repository[] = (data.items || []).map((r: any) => this.mapRepo(r));

    return {
      success: true,
      data: repos,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'github',
        itemsFound: repos.length,
        duration: 0,
      },
    };
  }

  /**
   * Get repository details
   */
  private async getRepo(params: GetRepoInput): Promise<ActorOutput> {
    const path = `/repos/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}`;
    const repo = await this.apiRequest(path);
    const mapped = this.mapRepo(repo);

    return {
      success: true,
      data: mapped,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'github',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Get user profile
   */
  private async getUser(params: GetUserInput): Promise<ActorOutput> {
    const path = `/users/${encodeURIComponent(params.username)}`;
    const user = await this.apiRequest(path);
    const mapped = this.mapUser(user);

    return {
      success: true,
      data: mapped,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'github',
        itemsFound: 1,
        duration: 0,
      },
    };
  }

  /**
   * Get trending repos: search by date with stars sort
   * GitHub doesn't have an official "trending" API, but we can
   * approximate it by searching for recently-created repos with many stars
   */
  private async getTrending(params: GetTrendingInput): Promise<ActorOutput> {
    const limit = Math.min(params.limit || 25, 50);
    const since = params.since || 'weekly';

    // Compute date threshold
    const threshold = new Date();
    if (since === 'daily') {
      threshold.setDate(threshold.getDate() - 1);
    } else if (since === 'monthly') {
      threshold.setMonth(threshold.getMonth() - 1);
    } else {
      threshold.setDate(threshold.getDate() - 7);
    }
    const dateStr = threshold.toISOString().split('T')[0];

    // Build query - trending = recently pushed with stars
    let q = `created:>${dateStr}`;
    if (params.language) {
      q = `${q} language:${params.language}`;
    }

    const path = `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${limit}`;
    const data = await this.apiRequest(path);
    const repos: Repository[] = (data.items || []).map((r: any) => this.mapRepo(r));

    return {
      success: true,
      data: repos,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'github',
        itemsFound: repos.length,
        duration: 0,
      },
    };
  }

  /**
   * Map GitHub API repo response to our Repository type
   */
  private mapRepo(r: any): Repository {
    return {
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      url: r.html_url,
      stars: r.stargazers_count ?? r.watchers ?? 0,
      forks: r.forks_count ?? 0,
      language: r.language,
      topics: r.topics,
      license: r.license?.spdx_id || r.license?.key,
      openIssues: r.open_issues_count,
      watchers: r.subscribers_count,
      lastUpdated: r.updated_at,
      createdAt: r.created_at,
      homepage: r.homepage,
      defaultBranch: r.default_branch,
    };
  }

  /**
   * Map GitHub API user response to our GitHubUser type
   */
  private mapUser(u: any): GitHubUser {
    return {
      username: u.login,
      name: u.name,
      bio: u.bio,
      email: u.email,
      company: u.company,
      location: u.location,
      blog: u.blog,
      twitterUsername: u.twitter_username,
      followers: u.followers,
      following: u.following,
      publicRepos: u.public_repos,
      publicGists: u.public_gists,
      avatarUrl: u.avatar_url,
      profileUrl: u.html_url,
      accountCreatedAt: u.created_at,
    };
  }

  async validate(input: any): Promise<boolean> {
    if (!input || !input.action) return false;
    return ['search_repos', 'get_repo', 'get_user', 'get_trending'].includes(input.action);
  }
}

export default GitHubActor;