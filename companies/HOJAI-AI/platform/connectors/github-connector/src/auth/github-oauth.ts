/**
 * GitHub OAuth 2.0 Implementation
 * Real OAuth flow with token management
 */

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

const SCOPES = ['repo', 'read:user', 'read:org', 'user:email'].join(' ');

interface GitHubTokenData {
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt?: number;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

const tokenStore = new Map<string, GitHubTokenData>();
const userCache = new Map<string, GitHubUser>();

export function generateAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<GitHubTokenData> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await response.json() as any;

  if (data.error) {
    throw new Error(`OAuth failed: ${data.error_description}`);
  }

  const tokenData: GitHubTokenData = {
    accessToken: data.access_token,
    tokenType: data.token_type,
    scope: data.scope,
  };

  // Store with user identifier
  tokenStore.set('default', tokenData);
  return tokenData;
}

export async function getUser(token?: string): Promise<GitHubUser> {
  const accessToken = token || tokenStore.get('default')?.accessToken;
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  if (userCache.has(accessToken)) {
    return userCache.get(accessToken)!;
  }

  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const user = await response.json() as GitHubUser;
  userCache.set(accessToken, user);
  return user;
}

export async function callGitHubApi(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<any> {
  const accessToken = token || tokenStore.get('default')?.accessToken;
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle pagination
  const data = await response.json();
  const linkHeader = response.headers.get('Link');

  return {
    data,
    pagination: linkHeader ? parseLinkHeader(linkHeader) : null,
  };
}

function parseLinkHeader(header: string): { next?: string; last?: string } {
  const links: Record<string, string> = {};
  const parts = header.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      links[match[2]] = match[1];
    }
  }
  return links;
}

export async function listRepos(token?: string): Promise<any[]> {
  const result = await callGitHubApi('/user/repos?sort=updated&per_page=100', {}, token);
  return result.data;
}

export async function getRepo(owner: string, repo: string, token?: string): Promise<any> {
  const result = await callGitHubApi(`/repos/${owner}/${repo}`, {}, token);
  return result.data;
}

export async function createIssue(
  owner: string,
  repo: string,
  data: { title: string; body?: string; labels?: string[] },
  token?: string
): Promise<any> {
  const result = await callGitHubApi(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
  return result.data;
}

export async function listIssues(owner: string, repo: string, token?: string): Promise<any[]> {
  const result = await callGitHubApi(`/repos/${owner}/${repo}/issues?state=all&per_page=100`, {}, token);
  return result.data;
}

export function getToken(teamId = 'default'): GitHubTokenData | undefined {
  return tokenStore.get(teamId);
}

export function revokeToken(teamId = 'default'): void {
  tokenStore.delete(teamId);
  userCache.clear();
}
