/**
 * RTMN Mobile SDK - Push Notifications API
 */

import { EventEmitter } from 'eventemitter3';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PushNotification,
  NotificationPermission,
} from './types';

export interface PushNotificationConfig {
  onNotification?: (notification: PushNotification) => void;
  onTokenRefresh?: (token: string) => void;
  onNotificationOpened?: (notification: PushNotification) => void;
}

export class NotificationsAPI extends EventEmitter {
  private config: PushNotificationConfig;
  private deviceToken: string | null = null;
  private subscribedTopics: Set<string> = new Set();
  private readonly STORAGE_KEY = '@rtmn:notifications:token';

  constructor(config: PushNotificationConfig = {}) {
    super();
    this.config = config;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      // Platform-specific implementation would go here
      // For iOS: PushNotificationIOS.requestPermissions()
      // For Android: PermissionsAndroid.request()

      // Simulate permission granted for SDK structure
      const status: NotificationPermission = {
        granted: true,
        status: 'granted',
      };

      this.emit('permissionChanged', status);
      return status;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Check current permission status
   */
  async checkPermission(): Promise<NotificationPermission> {
    try {
      // Platform-specific implementation
      const status: NotificationPermission = {
        granted: true,
        status: 'granted',
      };

      return status;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get device token for push notifications
   */
  async getDeviceToken(): Promise<string | null> {
    // Try to get cached token first
    const cachedToken = await AsyncStorage.getItem(this.STORAGE_KEY);
    if (cachedToken) {
      this.deviceToken = cachedToken;
      return cachedToken;
    }

    return null;
  }

  /**
   * Set device token
   */
  async setDeviceToken(token: string): Promise<void> {
    this.deviceToken = token;
    await AsyncStorage.setItem(this.STORAGE_KEY, token);
    this.config.onTokenRefresh?.(token);
    this.emit('tokenRefresh', token);
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(topic: string): Promise<void> {
    if (this.subscribedTopics.has(topic)) {
      return;
    }

    // Store subscription locally
    this.subscribedTopics.add(topic);

    // Register with server
    // In real implementation, this would call the backend API
    this.emit('subscribed', topic);
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic: string): Promise<void> {
    if (!this.subscribedTopics.has(topic)) {
      return;
    }

    this.subscribedTopics.delete(topic);
    this.emit('unsubscribed', topic);
  }

  /**
   * Get all subscribed topics
   */
  getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics);
  }

  /**
   * Handle incoming notification
   */
  handleNotification(notification: PushNotification): void {
    // Parse notification data
    const parsed: PushNotification = {
      id: notification.id || Date.now().toString(),
      title: notification.title,
      body: notification.body,
      data: notification.data,
      image: notification.image,
      badge: notification.badge,
      sound: notification.sound,
      clickAction: notification.clickAction,
      category: notification.category,
    };

    // Emit to listeners
    this.emit('notification', parsed);
    this.config.onNotification?.(parsed);
  }

  /**
   * Handle notification tap/opened
   */
  handleNotificationOpened(notification: PushNotification): void {
    this.emit('notificationOpened', notification);
    this.config.onNotificationOpened?.(notification);
  }

  /**
   * Handle token refresh
   */
  handleTokenRefresh(token: string): void {
    this.setDeviceToken(token);
  }

  /**
   * Set badge count (iOS)
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      // PushNotificationIOS.setApplicationIconBadgeNumber(count);
    }
    this.emit('badgeSet', count);
  }

  /**
   * Clear badge count
   */
  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  /**
   * Clear all delivered notifications
   */
  async clearAll(): Promise<void> {
    if (Platform.OS === 'ios') {
      // PushNotificationIOS.removeAllDeliveredNotifications();
    }
    this.emit('cleared');
  }

  /**
   * Get pending notifications
   */
  async getPendingNotifications(): Promise<PushNotification[]> {
    // Platform-specific implementation
    return [];
  }

  /**
   * Subscribe to notifications
   */
  onNotification(callback: (notification: PushNotification) => void): () => void {
    const handler = (notification: PushNotification) => callback(notification);
    this.on('notification', handler);
    return () => this.off('notification', handler);
  }

  /**
   * Subscribe to notification opened events
   */
  onNotificationOpened(callback: (notification: PushNotification) => void): () => void {
    const handler = (notification: PushNotification) => callback(notification);
    this.on('notificationOpened', handler);
    return () => this.off('notificationOpened', handler);
  }

  /**
   * Subscribe to token refresh events
   */
  onTokenRefresh(callback: (token: string) => void): () => void {
    const handler = (token: string) => callback(token);
    this.on('tokenRefresh', handler);
    return () => this.off('tokenRefresh', handler);
  }
}
