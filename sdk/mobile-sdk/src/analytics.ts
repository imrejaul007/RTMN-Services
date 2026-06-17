/**
 * RTMN Mobile SDK - Analytics API
 */

import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import {
  AnalyticsEvent,
  DeviceInfo,
  UserTraits,
  ScreenTracking,
  ApiResponse,
} from './types';

export interface AnalyticsConfig {
  apiUrl: string;
  flushInterval?: number;
  maxQueueSize?: number;
  debug?: boolean;
}

export class AnalyticsAPI {
  private client: AxiosInstance;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;
  private userId: string | null = null;
  private deviceInfo: DeviceInfo;
  private config: AnalyticsConfig;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.deviceInfo = this.getDeviceInfo();

    this.client = axios.create({
      baseURL: `${config.apiUrl}/api/analytics`,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Start auto-flush
    if (config.flushInterval) {
      this.startAutoFlush(config.flushInterval);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    return {
      platform: Platform.OS as 'ios' | 'android' | 'web',
      osVersion: Platform.Version?.toString() || 'unknown',
      appVersion: '1.0.0', // Should be injected from app config
      deviceModel: Platform.OS === 'ios' ? 'iPhone' : 'Android',
    };
  }

  /**
   * Track an event
   */
  track(event: string, properties?: Record<string, unknown>): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: properties || {},
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined,
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo,
    };

    this.eventQueue.push(analyticsEvent);

    if (this.config.debug) {
      console.log('[Analytics] Track:', analyticsEvent);
    }

    // Auto-flush if queue is full
    if (
      this.config.maxQueueSize &&
      this.eventQueue.length >= this.config.maxQueueSize
    ) {
      this.flush().catch(() => {});
    }
  }

  /**
   * Track screen view
   */
  screen(name: string, properties?: Record<string, unknown>): void {
    this.track('screen_view', {
      screen_name: name,
      ...properties,
    });
  }

  /**
   * Track screen with timing
   */
  screenWithTiming(name: string, startTime: number, properties?: Record<string, unknown>): void {
    const duration = Date.now() - startTime;
    this.track('screen_view', {
      screen_name: name,
      duration_ms: duration,
      ...properties,
    });
  }

  /**
   * Identify user
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    this.userId = userId;
    const userTraits: UserTraits = {
      id: userId,
      traits: traits || {},
    };

    // Track identify event
    this.track('user_identified', userTraits);

    if (this.config.debug) {
      console.log('[Analytics] Identify:', userId, traits);
    }
  }

  /**
   * Reset user identity (logout)
   */
  reset(): void {
    this.userId = null;
    this.sessionId = this.generateSessionId();
    this.track('session_reset');
  }

  /**
   * Start screen tracking
   */
  startScreenTracking(name: string): ScreenTracking {
    return {
      name,
      startTime: Date.now(),
    };
  }

  /**
   * End screen tracking and track event
   */
  endScreenTracking(tracking: ScreenTracking, properties?: Record<string, unknown>): void {
    this.screenWithTiming(tracking.name, tracking.startTime, properties);
  }

  /**
   * Track user signup
   */
  trackSignup(method: string, properties?: Record<string, unknown>): void {
    this.track('signup', {
      signup_method: method,
      ...properties,
    });
  }

  /**
   * Track user login
   */
  trackLogin(method: string, properties?: Record<string, unknown>): void {
    this.track('login', {
      login_method: method,
      ...properties,
    });
  }

  /**
   * Track purchase
   */
  trackPurchase(
    revenue: number,
    currency: string = 'USD',
    properties?: Record<string, unknown>
  ): void {
    this.track('purchase', {
      revenue,
      currency,
      ...properties,
    });
  }

  /**
   * Track search
   */
  trackSearch(query: string, resultsCount?: number, properties?: Record<string, unknown>): void {
    this.track('search', {
      query,
      results_count: resultsCount,
      ...properties,
    });
  }

  /**
   * Track error
   */
  trackError(error: Error | string, properties?: Record<string, unknown>): void {
    this.track('error', {
      error_message: typeof error === 'string' ? error : error.message,
      error_stack: typeof error === 'string' ? undefined : error.stack,
      ...properties,
    });
  }

  /**
   * Flush events to server
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await this.client.post<ApiResponse<{ count: number }>>(
        '/events',
        { events }
      );

      if (!response.data.success) {
        // Re-queue events on failure
        this.eventQueue.unshift(...events);
        throw new Error(response.data.error?.message || 'Failed to flush events');
      }

      if (this.config.debug) {
        console.log(`[Analytics] Flushed ${events.length} events`);
      }
    } catch (error) {
      // Re-queue events on error
      this.eventQueue.unshift(...events);
      throw error;
    }
  }

  /**
   * Start auto-flush interval
   */
  startAutoFlush(intervalMs: number = 30000): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushInterval = setInterval(() => {
      this.flush().catch(() => {});
    }, intervalMs);
  }

  /**
   * Stop auto-flush
   */
  stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set app version
   */
  setAppVersion(version: string): void {
    this.deviceInfo.appVersion = version;
  }
}
