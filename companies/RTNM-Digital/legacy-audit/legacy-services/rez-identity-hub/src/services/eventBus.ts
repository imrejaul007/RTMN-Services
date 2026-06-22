/**
 * REZ Event Bus Integration
 *
 * Subscribe to profile updates from all systems
 * Port 4025 - RABTUL Event Bus
 */

import axios from 'axios';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4025';

// ==================== EVENT TYPES ====================

interface ProfileEvent {
  type: string;
  source: string;
  identityId: string;
  data: Record<string, any>;
  timestamp: string;
}

// ==================== EVENT BUS CLIENT ====================

export class EventBusService {
  private subscriptions: Map<string, (event: ProfileEvent) => void> = new Map();
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Subscribe to profile events
   */
  async subscribe(eventTypes: string[], handler: (event: ProfileEvent) => void): Promise<void> {
    for (const type of eventTypes) {
      this.subscriptions.set(type, handler);
    }

    // Register with event bus
    try {
      await this.registerSubscriptions(eventTypes);
      this.connected = true;
      console.log(`EventBus: Subscribed to ${eventTypes.length} event types`);
    } catch (error) {
      console.error('EventBus: Failed to subscribe', error);
    }
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(eventTypes: string[]): Promise<void> {
    for (const type of eventTypes) {
      this.subscriptions.delete(type);
    }

    try {
      await this.unregisterSubscriptions(eventTypes);
    } catch (error) {
      console.error('EventBus: Failed to unsubscribe', error);
    }
  }

  /**
   * Handle incoming event
   */
  async handleEvent(event: ProfileEvent): Promise<void> {
    const handler = this.subscriptions.get(event.type);
    if (handler) {
      await handler(event);
    }

    // Also call any wildcard handlers
    const wildcardHandler = this.subscriptions.get('*');
    if (wildcardHandler) {
      await wildcardHandler(event);
    }
  }

  /**
   * Publish event to other systems
   */
  async publish(type: string, data: Record<string, any>): Promise<void> {
    try {
      await axios.post(`${EVENT_BUS_URL}/api/events`, {
        type,
        source: 'identity-hub',
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('EventBus: Failed to publish event', error);
    }
  }

  private async registerSubscriptions(eventTypes: string[]): Promise<void> {
    await axios.post(`${EVENT_BUS_URL}/api/subscriptions`, {
      service: 'identity-hub',
      events: eventTypes,
      callback: `http://localhost:6000/api/events`
    });
  }

  private async unregisterSubscriptions(eventTypes: string[]): Promise<void> {
    await axios.delete(`${EVENT_BUS_URL}/api/subscriptions`, {
      data: {
        service: 'identity-hub',
        events: eventTypes
      }
    });
  }

  /**
   * Reconnect to event bus
   */
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('EventBus: Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`EventBus: Reconnecting (attempt ${this.reconnectAttempts})...`);

    try {
      await this.registerSubscriptions(Array.from(this.subscriptions.keys()));
      this.connected = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      setTimeout(() => this.reconnect(), 5000);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// ==================== PROFILE EVENT HANDLERS ====================

export const profileEventHandlers = {
  'user.updated': async (event: ProfileEvent) => {
    console.log(`EventBus: user.updated - ${event.identityId}`);
  },
  'user.created': async (event: ProfileEvent) => {
    console.log(`EventBus: user.created - ${event.identityId}`);
  },
  'user.deleted': async (event: ProfileEvent) => {
    console.log(`EventBus: user.deleted - ${event.identityId}`);
  },
  'transaction.completed': async (event: ProfileEvent) => {
    console.log(`EventBus: transaction.completed - ${event.identityId}`);
  },
  'profile.enriched': async (event: ProfileEvent) => {
    console.log(`EventBus: profile.enriched - ${event.identityId}`);
  },
  'verification.completed': async (event: ProfileEvent) => {
    console.log(`EventBus: verification.completed - ${event.identityId}`);
  },
  'trust.updated': async (event: ProfileEvent) => {
    console.log(`EventBus: trust.updated - ${event.identityId}`);
  },
  'social.profile.updated': async (event: ProfileEvent) => {
    console.log(`EventBus: social.profile.updated - ${event.identityId}`);
  }
};

// ==================== EVENT TYPES TO SUBSCRIBE ====================

export const PROFILE_EVENT_TYPES = [
  'user.created',
  'user.updated',
  'user.deleted',
  'transaction.completed',
  'transaction.failed',
  'profile.enriched',
  'verification.completed',
  'trust.updated',
  'social.profile.updated',
  'social.profile.added',
  'identity.linked',
  'identity.merged'
];

export const eventBusService = new EventBusService();
