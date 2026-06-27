/**
 * Slack OAuth 2.0 Implementation
 * Real OAuth flow with token management
 */
import crypto from 'crypto';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

const SCOPES = [
  'chat:write',
  'channels:read',
  'channels:write',
  'users:read',
  'users:read.email',
  'groups:read',
  'im:read',
  'im:write',
  'mpim:read',
].join(',');

interface TokenData {
  accessToken: string;
  teamId: string;
  teamName: string;
  userId: string;
  scope: string;
  expiresAt: number;
  refreshToken?: string;
}

const tokenStore = new Map<string, TokenData>();

/export function generateAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
    response_type: 'code',
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<TokenData> {
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await response.json() as any;

  if (!data.ok) {
    throw new Error(`OAuth failed: ${data.error}`);
  }

  const tokenData: TokenData = {
    accessToken: data.access_token,
    teamId: data.team?.id || data.team_id,
    teamName: data.team?.name || data.team_name,
    userId: data.authed_user?.id || data.user_id,
    scope: data.scope,
    expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
    refreshToken: data.refresh_token,
  };

  tokenStore.set(tokenData.teamId, tokenData);
  return tokenData;
}

export async function refreshToken(teamId: string): Promise<TokenData> {
  const current = tokenStore.get(teamId);
  if (!current?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: current.refreshToken,
    }),
  });

  const data = await response.json() as any;

  if (!data.ok) {
    throw new Error(`Refresh failed: ${data.error}`);
  }

  const newToken: TokenData = {
    accessToken: data.access_token,
    teamId: data.team?.id || teamId,
    teamName: data.team?.name || current.teamName,
    userId: data.authed_user?.id || current.userId,
    scope: data.scope,
    expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
    refreshToken: data.refresh_token,
  };

  tokenStore.set(teamId, newToken);
  return newToken;
}

export async function callSlackApi(teamId: string, method: string, params: Record<string, unknown>): Promise<any> {
  let tokenData = tokenStore.get(teamId);

  if (!tokenData) {
    throw new Error('Not authenticated');
  }

  if (tokenData.expiresAt < Date.now()) {
    tokenData = await refreshToken(teamId);
  }

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json() as any;

  if (!data.ok) {
    if (data.error === 'token_expired') {
      tokenData = await refreshToken(teamId);
      return callSlackApi(teamId, method, params);
    }
    throw new Error(`Slack API error: ${data.error}`);
  }

  return data;
}

export function getToken(teamId: string): TokenData | undefined {
  return tokenStore.get(teamId);
}

export function revokeToken(teamId: string): void {
  tokenStore.delete(teamId);
}
