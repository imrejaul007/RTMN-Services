/**
 * Slack OAuth 2.0 Handler
 * Handles Slack app installation, token exchange, and token management
 */

import axios from 'axios';
import type {
  SlackOAuthToken,
  SlackTokenInfo,
  SlackConnectorConfig,
  Logger,
} from '../types/index.js';

// Default OAuth scopes for the connector
export const DEFAULT_SCOPES = [
  'channels:read',
  'channels:write',
  'groups:read',
  'groups:write',
  'chat:write',
  'chat:write.public',
  'users:read',
  'users:read.email',
  'users.profile:read',
  'users.profile:write',
  'im:read',
  'im:write',
  'im:history',
  'mpim:read',
  'mpim:write',
  'mpim:history',
  'files:read',
  'files:write',
  'reactions:read',
  'reactions:write',
  'team:read',
  'admin',
  'admin.apps:read',
  'admin.apps:write',
  'admin.conversations:read',
  'admin.conversations:write',
].join(' ');

export const BOT_SCOPES = [
  'channels:read',
  'channels:write',
  'groups:read',
  'groups:write',
  'chat:write',
  'chat:write.public',
  'users:read',
  'files:read',
  'files:write',
  'reactions:read',
  'reactions:write',
].join(' ');

export interface TokenStorage {
  [teamId: string]: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    scope: string;
    tokenType: 'bot' | 'user';
    teamName?: string;
    appId?: string;
    incomingWebhook?: {
      channel: string;
      channelId: string;
      url: string;
    };
  };
}

/**
 * In-memory token storage (use Redis/DB in production)
 */
export class MemoryTokenStore {
  private tokens: TokenStorage = {};

  async getToken(teamId: string): Promise<string | null> {
    const entry = this.tokens[teamId];
    if (!entry) return null;
    if (entry.expiresAt && Date.now() >= entry.expiresAt) {
      delete this.tokens[teamId];
      return null;
    }
    return entry.accessToken;
  }

  async setToken(
    teamId: string,
    token: string,
    options?: {
      refreshToken?: string;
      expiresIn?: number;
      scope?: string;
      tokenType?: 'bot' | 'user';
      teamName?: string;
      appId?: string;
      incomingWebhook?: { channel: string; channelId: string; url: string };
    }
  ): Promise<void> {
    this.tokens[teamId] = {
      accessToken: token,
      refreshToken: options?.refreshToken,
      expiresAt: options?.expiresIn ? Date.now() + options.expiresIn * 1000 : undefined,
      scope: options?.scope || '',
      tokenType: options?.tokenType || 'bot',
      teamName: options?.teamName,
      appId: options?.appId,
      incomingWebhook: options?.incomingWebhook,
    };
  }

  async removeToken(teamId: string): Promise<void> {
    delete this.tokens[teamId];
  }

  async getAllTokens(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const [teamId, entry] of Object.entries(this.tokens)) {
      if (entry.expiresAt && Date.now() >= entry.expiresAt) {
        delete this.tokens[teamId];
        continue;
      }
      map.set(teamId, entry.accessToken);
    }
    return map;
  }

  async getTokenEntry(teamId: string): Promise<TokenStorage[string] | null> {
    return this.tokens[teamId] || null;
  }

  async hasToken(teamId: string): Promise<boolean> {
    return (await this.getToken(teamId)) !== null;
  }
}

export class SlackOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tokenStore: MemoryTokenStore;
  private logger: Logger;

  constructor(config: SlackConnectorConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri || `${process.env.PUBLIC_URL || 'http://localhost:4790'}/auth/callback`;
    this.tokenStore = config.tokenStore || new MemoryTokenStore();
    this.logger = config.logger || console;
  }

  /**
   * Build the Slack OAuth authorization URL
   */
  buildAuthorizeUrl(
    state: string,
    scopes?: string,
    teamId?: string,
    redirectPath?: string
  ): string {
    const scope = scopes || DEFAULT_SCOPES;
    const baseUrl = 'https://slack.com/oauth/v2/authorize';

    const params = new URLSearchParams({
      client_id: this.clientId,
      scope,
      redirect_uri: redirectPath
        ? `${this.redirectUri.replace('/auth/callback', '')}${redirectPath}`
        : this.redirectUri,
      state,
    });

    if (teamId) {
      params.set('team', teamId);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Build OAuth v2 authorize URL with granular scopes
   */
  buildAuthorizeUrlV2(
    state: string,
    userScopes?: string[],
    botScopes?: string[]
  ): string {
    const baseUrl = 'https://slack.com/oauth/v2/authorize';
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: (botScopes || BOT_SCOPES.split(' ')).join(' '),
      user_scope: (userScopes || []).join(' '),
      state,
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code: string): Promise<SlackOAuthToken> {
    this.logger.info('Exchanging authorization code for access token');

    try {
      const response = await axios.post<SlackOAuthToken>(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (!data.ok) {
        throw new Error(`OAuth exchange failed: ${data.error}`);
      }

      // Store the token
      const teamId = data.team_id;
      if (teamId) {
        await this.tokenStore.setToken(teamId, data.access_token, {
          refreshToken: 'refresh_token' in data ? (data as any).refresh_token : undefined,
          expiresIn: 'expires_in' in data ? (data as any).expires_in : undefined,
          scope: data.scope,
          tokenType: data.token_type,
          teamName: data.team_name,
          appId: data.app_id,
          incomingWebhook: data.incoming_webhook,
        });
      }

      this.logger.info('Successfully exchanged code for token', {
        teamId,
        teamName: data.team_name,
        tokenType: data.token_type,
      });

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        this.logger.error('OAuth code exchange failed', { error: message });
        throw new Error(`OAuth exchange failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Refresh an access token
   */
  async refreshToken(refreshToken: string): Promise<SlackOAuthToken> {
    this.logger.info('Refreshing access token');

    try {
      const response = await axios.post<SlackOAuthToken>(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (!data.ok) {
        throw new Error(`Token refresh failed: ${data.error}`);
      }

      // Store the new token
      const teamId = data.team_id;
      if (teamId) {
        await this.tokenStore.setToken(teamId, data.access_token, {
          refreshToken: 'refresh_token' in data ? (data as any).refresh_token : undefined,
          expiresIn: 'expires_in' in data ? (data as any).expires_in : undefined,
          scope: data.scope,
          tokenType: data.token_type,
          teamName: data.team_name,
          appId: data.app_id,
        });
      }

      this.logger.info('Successfully refreshed token', { teamId });
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        this.logger.error('Token refresh failed', { error: message });
        throw new Error(`Token refresh failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Revoke an access token
   */
  async revokeToken(token: string): Promise<boolean> {
    this.logger.info('Revoking access token');

    try {
      const response = await axios.post(
        'https://slack.com/api/auth.revoke',
        new URLSearchParams({ token }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data as { ok: boolean };

      if (data.ok) {
        this.logger.info('Successfully revoked token');
      } else {
        this.logger.warn('Token revocation returned false', { data });
      }

      return data.ok;
    } catch (error) {
      this.logger.error('Token revocation failed', { error });
      return false;
    }
  }

  /**
   * Get information about an access token
   */
  async getAccessTokenInfo(token: string): Promise<SlackTokenInfo> {
    this.logger.debug('Getting access token info');

    try {
      const response = await axios.get<SlackTokenInfo>(
        'https://slack.com/api/auth.test',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        this.logger.error('Failed to get token info', { error: message });
        throw new Error(`Failed to get token info: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get token from store for a team
   */
  async getToken(teamId: string): Promise<string | null> {
    return this.tokenStore.getToken(teamId);
  }

  /**
   * Get token entry from store for a team
   */
  async getTokenEntry(teamId: string) {
    return this.tokenStore.getTokenEntry(teamId);
  }

  /**
   * Get all installed teams
   */
  async getInstalledTeams(): Promise<string[]> {
    const tokens = await this.tokenStore.getAllTokens();
    return Array.from(tokens.keys());
  }

  /**
   * Uninstall a team (remove their token)
   */
  async uninstall(teamId: string): Promise<void> {
    const token = await this.tokenStore.getToken(teamId);
    if (token) {
      await this.revokeToken(token);
    }
    await this.tokenStore.removeToken(teamId);
    this.logger.info('Uninstalled team', { teamId });
  }

  /**
   * Generate a secure state parameter for OAuth
   */
  static generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/**
 * Create a new SlackOAuth instance with config from environment
 */
export function createSlackOAuth(logger?: Logger): SlackOAuth {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error(
      'SLACK_CLIENT_ID and SLACK_CLIENT_SECRET environment variables are required'
    );
  }

  return new SlackOAuth({
    clientId,
    clientSecret,
    signingSecret: signingSecret || '',
    redirectUri,
  });
}

export default SlackOAuth;