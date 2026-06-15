import axios from 'axios';
import { logger } from './logger';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';

export class EventBus {
  private url: string = EVENT_BUS_URL;
  private enabled: boolean = process.env.EVENT_BUS_ENABLED !== 'false';

  async publish(topic: string, data: any): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      await axios.post(`${this.url}/api/v1/publish`, { topic, data, source: 'boa-sutar-bridge', timestamp: new Date().toISOString() }, { timeout: 3000 });
      return true;
    } catch (error: any) {
      logger.warn(`[EventBus] Failed to publish ${topic}: ${error.message}`);
      return false;
    }
  }

  async subscribe(topic: string, callbackUrl: string): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      const response = await axios.post(`${this.url}/api/v1/subscribe`, { topic, callbackUrl, source: 'boa-sutar-bridge' }, { timeout: 3000 });
      return response.data?.subscriptionId || null;
    } catch (error: any) {
      logger.warn(`[EventBus] Failed to subscribe ${topic}: ${error.message}`);
      return null;
    }
  }
}

export const eventBus = new EventBus();
export default eventBus;
