/**
 * CorpID Authentication Service
 * Universal identity for all RTNM apps
 */

import axios, { AxiosInstance } from 'axios';

// ============================================
// CONFIGURATION
// ============================================

const CORPID_URL = process.env.EXPO_PUBLIC_CORPID_URL || 'http://localhost:4300';

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface TokenPayload {
  user_id: string;
  email: string;
  iat: number;
  exp: number;
}

// ============================================
// AUTH CLIENT
// ============================================

class CorpIDAuth {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: CORPID_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load tokens from storage if available
    this.loadTokens();
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  private async loadTokens(): Promise<void> {
    // In production, load from AsyncStorage
    // For now, just check if they exist in memory
    if (this.accessToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    }
  }

  private saveTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    // In production, save to AsyncStorage
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    delete this.client.defaults.headers.common['Authorization'];
    // In production, clear from AsyncStorage
  }

  // ============================================
  // AUTH METHODS
  // ============================================

  async signUp(params: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>('/api/auth/signup', params);
    this.saveTokens(data.access_token, data.refresh_token);
    this.user = data.user;
    return data;
  }

  async signIn(params: {
    email: string;
    password: string;
  } | {
    phone: string;
    otp: string;
  }): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>('/api/auth/login', params);
    this.saveTokens(data.access_token, data.refresh_token);
    this.user = data.user;
    return data;
  }

  async signOut(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } catch (error) {
      // Ignore errors on logout
    }
    this.clearTokens();
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const { data } = await this.client.post<{ access_token: string; refresh_token: string }>('/api/auth/refresh', {
      refresh_token: this.refreshToken,
    });

    this.saveTokens(data.access_token, data.refresh_token);
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.post('/api/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.client.post('/api/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  // ============================================
  // USER METHODS
  // ============================================

  async getProfile(): Promise<User> {
    if (this.user) return this.user;

    const { data } = await this.client.get<User>('/api/users/me');
    this.user = data;
    return data;
  }

  async updateProfile(updates: Partial<{
    name: string;
    phone: string;
    avatar_url: string;
  }>): Promise<User> {
    const { data } = await this.client.patch<User>('/api/users/me', updates);
    this.user = data;
    return data;
  }

  async verifyEmail(token: string): Promise<void> {
    await this.client.post('/api/auth/verify-email', { token });
  }

  async sendVerificationEmail(): Promise<void> {
    await this.client.post('/api/auth/send-verification');
  }

  // ============================================
  // OTP METHODS
  // ============================================

  async requestOTP(phone: string): Promise<{ message: string }> {
    const { data } = await this.client.post<{ message: string }>('/api/auth/request-otp', { phone });
    return data;
  }

  async verifyOTP(phone: string, otp: string): Promise<{ valid: boolean }> {
    const { data } = await this.client.post<{ valid: boolean }>('/api/auth/verify-otp', { phone, otp });
    return data;
  }

  // ============================================
  // SOCIAL AUTH
  // ============================================

  async signInWithGoogle(idToken: string): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>('/api/auth/google', { id_token: idToken });
    this.saveTokens(data.access_token, data.refresh_token);
    this.user = data.user;
    return data;
  }

  async signInWithApple(idToken: string): Promise<AuthResponse> {
    const { data } = await this.client.post<AuthResponse>('/api/auth/apple', { id_token: idToken });
    this.saveTokens(data.access_token, data.refresh_token);
    this.user = data.user;
    return data;
  }

  // ============================================
  // HELPERS
  // ============================================

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  getUserId(): string | null {
    return this.user?.user_id || null;
  }

  // Decode JWT without verification (for display purposes)
  decodeToken(token: string): TokenPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    if (!this.accessToken) return true;

    const payload = this.decodeToken(this.accessToken);
    if (!payload) return true;

    return Date.now() >= payload.exp * 1000;
  }

  // ============================================
  // HEALTH
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton
export const corpIDAuth = new CorpIDAuth();
export default corpIDAuth;
