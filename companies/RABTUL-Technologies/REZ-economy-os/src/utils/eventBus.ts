import axios from 'axios';
import { logger } from './logger';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
const SOURCE = 'rez-economy-os';

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

  async subscribe(topic: string, handler: (data: any) => Promise<void> | void): Promise<void> {
    if (!this.enabled) return;
    logger.info(`[EventBus] subscribed to: ${topic}`);
    // In a full implementation, this would open a websocket or poll
  }
}

export const eventBus = new EventBus();

// Standard economy event topics
export const ECONOMY_TOPICS = {
  TRANSACTION_CREATED: 'economy.transaction.created',
  TRANSACTION_COMPLETED: 'economy.transaction.completed',
  TRANSACTION_FAILED: 'economy.transaction.failed',
  TRANSACTION_REVERSED: 'economy.transaction.reversed',
  KARMA_AWARDED: 'economy.karma.awarded',
  KARMA_PENALIZED: 'economy.karma.penalized',
  KARMA_TIER_CHANGED: 'economy.karma.tier.changed',
  CREDIT_UPDATED: 'economy.credit.updated',
  CREDIT_TIER_CHANGED: 'economy.credit.tier.changed',
  ESCROW_HELD: 'economy.escrow.held',
  ESCROW_RELEASED: 'economy.escrow.released',
  ESCROW_DISPUTED: 'economy.escrow.disputed',
  ACCOUNT_FROZEN: 'economy.account.frozen',
  ACCOUNT_ACTIVATED: 'economy.account.activated',
} as const;
