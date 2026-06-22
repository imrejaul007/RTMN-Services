import Redis from 'ioredis';
import axios from 'axios';

export class EventBusService {
  private redis: Redis;
  private subscribers: Map<string, Set<(event: any) => void>> = new Map();

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.subscribe('__keyevent@0__:hojai_events', (message) => {
      try {
        const event = JSON.parse(message);
        this.notifySubscribers(event.type, event);
      } catch {}
    });
  }

  async publish(event: {
    type: string;
    userId?: string;
    tenantId?: string;
    data: Record<string, any>;
    timestamp?: string;
  }): Promise<{ id: string }> {
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const enriched = {
      id,
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    };

    await this.redis.publish('hojai_events', JSON.stringify(enriched));
    await this.redis.lpush('hojai_events_history', JSON.stringify(enriched));
    await this.redis.ltrim('hojai_events_history', 0, 9999);

    return { id };
  }

  async subscribe(eventType: string, handler: (event: any) => void): Promise<void> {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);
  }

  async forwardToRez(event: any): Promise<void> {
    const rezUrl = process.env.REZ_EVENT_BUS_URL;
    if (!rezUrl) return;

    try {
      await axios.post(`${rezUrl}/api/events`, event, {
        headers: {
          'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN
        }
      });
    } catch (e) {
      console.error('[EventBus] Forward failed:', e);
    }
  }

  private async notifySubscribers(eventType: string, event: any): Promise<void> {
    this.subscribers.get(eventType)?.forEach(handler => handler(event));
    this.subscribers.get('*')?.forEach(handler => handler(event));
  }

  async getHistory(limit = 100): Promise<any[]> {
    const events = await this.redis.lrange('hojai_events_history', 0, limit - 1);
    return events.map(e => JSON.parse(e)).reverse();
  }
}

export const eventBusService = new EventBusService();
