// ============================================================================
// Event Bus Helper - REZ-event-bus (Port 4510)
// ============================================================================

import axios from 'axios';
import { logger } from './logger';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';

export class EventBus {
  private url: string;
  private enabled: boolean;

  constructor(url: string = EVENT_BUS_URL) {
    this.url = url;
    this.enabled = process.env.EVENT_BUS_ENABLED !== 'false';
  }

  /**
   * Publish an event to the event bus
   */
  async publish(topic: string, data: any): Promise<boolean> {
    if (!this.enabled) {
      logger.debug(`[EventBus] Disabled - would publish to ${topic}`);
      return false;
    }

    try {
      await axios.post(`${this.url}/api/v1/publish`, {
        topic,
        data,
        source: 'boa-os',
        timestamp: new Date().toISOString(),
      }, { timeout: 3000 });
      logger.debug(`[EventBus] Published to ${topic}`);
      return true;
    } catch (error: any) {
      logger.warn(`[EventBus] Failed to publish to ${topic}: ${error.message}`);
      return false;
    }
  }

  /**
   * Subscribe to a topic (returns subscription ID)
   */
  async subscribe(topic: string, callbackUrl: string): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      const response = await axios.post(`${this.url}/api/v1/subscribe`, {
        topic,
        callbackUrl,
        source: 'boa-os',
      }, { timeout: 3000 });
      return response.data?.subscriptionId || null;
    } catch (error: any) {
      logger.warn(`[EventBus] Failed to subscribe to ${topic}: ${error.message}`);
      return null;
    }
  }
}

export const eventBus = new EventBus();
export default eventBus;
