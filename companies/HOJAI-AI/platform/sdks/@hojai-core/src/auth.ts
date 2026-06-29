/**
 * HOJAI Auth
 */

import axios from 'axios';
import { Config } from './config';

export interface Token {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export class Auth {
  private config: Config;
  private token?: Token;
  private refreshing?: Promise<string>;

  constructor(config: Config) {
    this.config = config;
  }

  async getToken(): Promise<string | undefined> {
    if (this.token && !this.isExpired(this.token)) {
      return this.token.accessToken;
    }

    if (this.refreshing) {
      return this.refreshing;
    }

    this.refreshing = this.refresh();
    return this.refreshing;
  }

  async refresh(): Promise<string> {
    if (this.token?.refreshToken) {
      try {
        const res = await axios.post(`${this.config.apiUrl}/auth/refresh`, {
          refreshToken: this.token.refreshToken,
        });

        this.token = {
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
          expiresAt: Date.now() + res.data.expiresIn * 1000,
        };

        return this.token.accessToken;
      } catch (e) {
        // Fall through to api key auth
      }
    }

    // API key auth
    if (this.config.apiKey) {
      return this.config.apiKey;
    }

    throw new Error('No authentication available');
  }

  private isExpired(token: Token): boolean {
    return Date.now() >= token.expiresAt - 60000; // 1 min buffer
  }

  async login(email: string, password: string): Promise<Token> {
    const res = await axios.post(`${this.config.apiUrl}/auth/login`, {
      email,
      password,
    });

    this.token = {
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      expiresAt: Date.now() + res.data.expiresIn * 1000,
    };

    return this.token;
  }

  async logout(): Promise<void> {
    if (this.token?.refreshToken) {
      await axios.post(`${this.config.apiUrl}/auth/logout`, {
        refreshToken: this.token.refreshToken,
      });
    }
    this.token = undefined;
  }
}
