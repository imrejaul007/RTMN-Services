/**
 * Social Authentication Service
 * Google, Apple, Facebook OAuth implementations
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

const REDIS_PREFIX = 'social:';
const STATE_TTL = 600; // 10 minutes

interface SocialConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface SocialTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  idToken?: string;
}

interface SocialUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
}

/**
 * Google OAuth 2.0 implementation
 */
export class GoogleAuth {
  private config: SocialConfig;

  constructor(config: SocialConfig) {
    this.config = config;
  }

  /**
   * Generate Google OAuth authorization URL
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      state,
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<SocialTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google token exchange failed: ${error}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number; refresh_token?: string; id_token?: string };
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
    };
  }

  /**
   * Get user profile from Google
   */
  async getUserInfo(accessToken: string): Promise<SocialUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info from Google');
    }

    const data = await response.json() as { id: string; email: string; name: string; picture?: string; email_verified?: boolean };
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      emailVerified: data.email_verified,
    };
  }

  /**
   * Verify Google ID token
   */
  async verifyIdToken(idToken: string): Promise<SocialUser> {
    const response = await fetch('https://oauth2.googleapis.com/tokeninfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `id_token=${idToken}`,
    });

    if (!response.ok) {
      throw new Error('Invalid Google ID token');
    }

    const data = await response.json() as { aud?: string; sub?: string; email?: string; email_verified?: boolean };

    // Verify audience matches our client ID
    if (data.aud !== this.config.clientId) {
      throw new Error('Token audience mismatch');
    }

    return {
      id: data.sub ?? '',
      email: data.email ?? '',
      emailVerified: true,
    };
  }
}

/**
 * Generate secure state parameter for OAuth
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify state parameter matches
 */
export async function verifyState(redis, state: string): Promise<boolean> {
  const key = `${REDIS_PREFIX}state:${state}`;
  const exists = await redis.exists(key);
  if (exists) {
    await redis.del(key);
    return true;
  }
  return false;
}

/**
 * Store state in Redis
 */
export async function storeState(redis, state: string, redirectUri: string): Promise<void> {
  const key = `${REDIS_PREFIX}state:${state}`;
  await redis.setex(key, STATE_TTL, redirectUri);
}

export type { SocialConfig, SocialTokens, SocialUser };
