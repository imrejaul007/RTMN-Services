/**
 * RTMN Mobile SDK - Main Entry Point
 */

import { EventEmitter } from 'eventemitter3';
import { CustomerTwinAPI } from './customer';
import { TicketAPI } from './ticket';
import { ChatAPI, WebSocketConfig } from './chat';
import { AnalyticsAPI, AnalyticsConfig } from './analytics';
import { NotificationsAPI, PushNotificationConfig } from './notifications';
import {
  SDKConfig,
  Customer,
  Ticket,
  TicketInput,
  TicketFilters,
  ChatMessage,
  PushNotification,
  ConnectionState,
} from './types';

export interface RTMNSdkInstance {
  init(): Promise<void>;
  customer: CustomerTwinAPI;
  ticket: TicketAPI;
  chat: ChatAPI;
  analytics: AnalyticsAPI;
  notifications: NotificationsAPI;
  isInitialized: boolean;
}

class RTMNSdk implements RTMNSdkInstance {
  private config: SDKConfig | null = null;
  private initialized: boolean = false;
  private eventBus: EventEmitter;
  private realtimeWs: WebSocket | null = null;

  public customer: CustomerTwinAPI;
  public ticket: TicketAPI;
  public chat: ChatAPI;
  public analytics: AnalyticsAPI;
  public notifications: NotificationsAPI;

  constructor() {
    this.eventBus = new EventEmitter();
    this.customer = null as unknown as CustomerTwinAPI;
    this.ticket = null as unknown as TicketAPI;
    this.chat = null as unknown as ChatAPI;
    this.analytics = null as unknown as AnalyticsAPI;
    this.notifications = null as unknown as NotificationsAPI;
  }

  /**
   * Initialize the SDK with configuration
   */
  async init(config?: SDKConfig): Promise<void> {
    if (this.initialized && !config) {
      return;
    }

    this.config = config || this.getConfigFromEnvironment();

    if (!this.config.apiUrl) {
      throw new Error('RTMN SDK: apiUrl is required');
    }

    // Initialize Customer Twin API
    this.customer = new CustomerTwinAPI(this.config.apiUrl);

    // Initialize Ticket API
    this.ticket = new TicketAPI(this.config.apiUrl);
    this.ticket.setRealtimeClient(this.eventBus);

    // Initialize Chat API
    const chatConfig: WebSocketConfig = {
      url: this.config.eventBusUrl || `${this.config.apiUrl.replace('http', 'ws')}/chat`,
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
    };
    this.chat = new ChatAPI(chatConfig);

    // Initialize Analytics API
    const analyticsConfig: AnalyticsConfig = {
      apiUrl: this.config.apiUrl,
      flushInterval: 30000,
      maxQueueSize: 20,
      debug: this.config.debug,
    };
    this.analytics = new AnalyticsAPI(analyticsConfig);

    // Initialize Notifications API
    const notificationsConfig: PushNotificationConfig = {
      onNotification: (notification) => {
        this.analytics.track('notification_received', {
          notification_id: notification.id,
          notification_title: notification.title,
        });
      },
      onNotificationOpened: (notification) => {
        this.analytics.track('notification_opened', {
          notification_id: notification.id,
          notification_title: notification.title,
        });
      },
    };
    this.notifications = new NotificationsAPI(notificationsConfig);

    // Setup realtime connection for event bus
    if (this.config.eventBusUrl) {
      this.setupRealtimeConnection();
    }

    this.initialized = true;
  }

  /**
   * Get configuration from environment
   */
  private getConfigFromEnvironment(): SDKConfig {
    // These would typically come from environment variables
    // or a configuration file
    return {
      apiUrl: process.env.RTMN_API_URL || 'http://localhost:4399',
      eventBusUrl: process.env.RTMN_EVENT_BUS_URL || 'ws://localhost:4510',
      debug: process.env.NODE_ENV !== 'production',
    };
  }

  /**
   * Setup WebSocket connection for realtime events
   */
  private setupRealtimeConnection(): void {
    if (!this.config?.eventBusUrl) return;

    const wsUrl = `${this.config.eventBusUrl}?client=mobile-sdk`;

    try {
      this.realtimeWs = new WebSocket(wsUrl);

      this.realtimeWs.onopen = () => {
        this.eventBus.emit('connected');
        if (this.config?.debug) {
          console.log('[RTMN SDK] Realtime connected');
        }
      };

      this.realtimeWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.eventBus.emit(data.type, data.payload);
        } catch (error) {
          console.error('[RTMN SDK] Failed to parse realtime message:', error);
        }
      };

      this.realtimeWs.onerror = (error) => {
        this.eventBus.emit('error', error);
      };

      this.realtimeWs.onclose = () => {
        this.eventBus.emit('disconnected');
      };
    } catch (error) {
      console.error('[RTMN SDK] Failed to setup realtime connection:', error);
    }
  }

  /**
   * Set authentication token for all services
   */
  setAuthToken(token: string): void {
    this.customer.setAuthToken(token);
    this.ticket.setAuthToken(token);
    this.analytics.identify(token);
  }

  /**
   * Subscribe to realtime events
   */
  on(event: string, callback: (data: unknown) => void): () => void {
    this.eventBus.on(event, callback);
    return () => this.eventBus.off(event, callback);
  }

  /**
   * Emit an event
   */
  emit(event: string, data?: unknown): void {
    this.eventBus.emit(event, data);
  }

  /**
   * Check if SDK is initialized
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get SDK version
   */
  getVersion(): string {
    return '1.0.0';
  }

  /**
   * Reset SDK (logout)
   */
  async reset(): Promise<void> {
    this.chat.disconnect();
    this.analytics.reset();
    this.realtimeWs?.close();
    this.initialized = false;
  }
}

// Export singleton instance
export const RTMNSdk = new RTMNSdk();

// Export individual classes for advanced usage
export { CustomerTwinAPI } from './customer';
export { TicketAPI } from './ticket';
export { ChatAPI } from './chat';
export { AnalyticsAPI } from './analytics';
export { NotificationsAPI } from './notifications';

// Export types
export * from './types';

// Default export
export default RTMNSdk;
