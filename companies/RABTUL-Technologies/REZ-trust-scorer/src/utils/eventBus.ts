import axios from 'axios';
import { logger } from './logger';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
const SOURCE = 'rez-trust-scorer';

export class EventBus {
  private url: string = EVENT_BUS_URL;
  private enabled: boolean = process.env.EVENT_BUS_ENABLED !== 'false';

  async publish(topic: string, data: any): Promise<boolean> {
    if (!this.enabled) {
      logger.debug(`[EventBus disabled] would publish: ${topic}`);
      return false;
    }
    try {
      await axios.post(
        `${this.url}/api/v1/publish`,
        {
          topic,
          data,
          source: SOURCE,
          timestamp: new Date().toISOString(),
        },
        { timeout: 3000 }
      );
      logger.debug(`[EventBus] published: ${topic}`);
      return true;
    } catch (error: any) {
      logger.warn(`[EventBus] failed to publish ${topic}: ${error.message}`);
      return false;
    }
  }
}

export const eventBus = new EventBus();

export const TRUST_TOPICS = {
  TRUST_CALCULATED: 'trust.calculated',
  TRUST_UPDATED: 'trust.updated',
  TRUST_TIER_CHANGED: 'trust.tier.changed',
  TRUST_EVENT_RECORDED: 'trust.event.recorded',
  TRUST_ALERT: 'trust.alert',
  TRUST_ANOMALY_DETECTED: 'trust.anomaly.detected',
} as const;