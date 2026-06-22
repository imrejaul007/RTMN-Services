/**
 * Auth Module - Authentication, session management, and user profile
 */

import { QRClient } from './client';
import type {
  OTPResponse,
  AuthSession,
  UserProfile,
  UserPreferences,
} from '../types';

export class AuthModule {
  private client: QRClient;
  private session: AuthSession | null = null;

  constructor(client: QRClient) {
    this.client = client;
  }

  /**
   * Request OTP login
   */
  async loginWithOTP(phone: string): Promise<OTPResponse> {
    return this.client.post('/auth/otp/request', { phone });
  }

  /**
   * Verify OTP and login
   */
  async verifyOTP(phone: string, otp: string): Promise<AuthSession> {
    const session = await this.client.post<AuthSession>('/auth/otp/verify', { phone, otp });
    this.session = session;
    return session;
  }

  /**
   * Resend OTP
   */
  async resendOTP(phone: string): Promise<OTPResponse> {
    return this.client.post('/auth/otp/resend', { phone });
  }

  /**
   * Login with email/password
   */
  async loginWithEmail(email: string, password: string): Promise<AuthSession> {
    const session = await this.client.post<AuthSession>('/auth/email/login', { email, password });
    this.session = session;
    return session;
  }

  /**
   * Register with email
   */
  async register(data: {
    email: string;
    password: string;
    name?: string;
    phone?: string;
  }): Promise<AuthSession> {
    const session = await this.client.post<AuthSession>('/auth/email/register', data);
    this.session = session;
    return session;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    this.session = null;
  }

  /**
   * Get current session
   */
  async getSession(): Promise<AuthSession | null> {
    if (this.session) {
      return this.session;
    }
    try {
      const session = await this.client.get<AuthSession>('/auth/session');
      this.session = session;
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    return this.client.get('/auth/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<Pick<UserProfile, 'name' | 'email' | 'avatar'>>): Promise<UserProfile> {
    return this.client.patch('/auth/profile', data);
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    return this.client.get('/auth/preferences');
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return this.client.patch('/auth/preferences', preferences);
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.client.post('/auth/password/change', { currentPassword, newPassword });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    return this.client.post('/auth/password/reset/request', { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    return this.client.post('/auth/password/reset', { token, newPassword });
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    return this.client.post('/auth/email/verify', { token });
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<void> {
    return this.client.post('/auth/email/verify/resend');
  }

  /**
   * Link phone number
   */
  async linkPhone(phone: string): Promise<OTPResponse> {
    return this.client.post('/auth/phone/link', { phone });
  }

  /**
   * Verify phone link
   */
  async verifyPhoneLink(phone: string, otp: string): Promise<void> {
    return this.client.post('/auth/phone/verify', { phone, otp });
  }

  /**
   * Delete account
   */
  async deleteAccount(password: string): Promise<void> {
    return this.client.post('/auth/account/delete', { password });
  }

  /**
   * Export user data
   */
  async exportData(): Promise<{ downloadUrl: string }> {
    return this.client.post('/auth/data/export');
  }

  /**
   * Refresh session token
   */
  async refreshToken(): Promise<AuthSession> {
    const session = await this.client.post<AuthSession>('/auth/token/refresh');
    this.session = session;
    return session;
  }

  /**
   * Set session manually (for restoring from storage)
   */
  setSession(session: AuthSession): void {
    this.session = session;
  }

  /**
   * Clear session
   */
  clearSession(): void {
    this.session = null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.session !== null;
  }

  /**
   * Get access token
   */
  getToken(): string | null {
    return this.session?.token || null;
  }
}
