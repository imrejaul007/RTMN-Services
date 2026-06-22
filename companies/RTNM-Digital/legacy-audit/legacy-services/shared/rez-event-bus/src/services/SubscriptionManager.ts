import { RedisClientType } from 'redis';
import { EventRouter, Event } from './EventRouter';
import axios from 'axios';

interface WebhookSubscription {
  id: string;
  patterns: string[];
  callbackUrl: string;
  createdAt: Date;
  failures: number;
}

interface SSEClient {
  id: string;
  patterns: string[];
  response: any;
}

export class SubscriptionManager {
  private webhooks: Map<string, WebhookSubscription> = new Map();
  private sseClients: Map<string, SSEClient> = new Map();
  private redis: RedisClientType;
  private eventRouter: EventRouter;
  private webhookRetryQueue = 'webhook:retry';

  constructor(redis: RedisClientType, eventRouter: EventRouter) {
    this.redis = redis;
    this.eventRouter = eventRouter;

    // Subscribe to all events
    this.eventRouter.on('*', async (event) => {
      await this.deliverToWebhooks(event);
      await this.deliverToSSE(event);
    });

    // Start retry processor
    this.startRetryProcessor();
  }

  async addWebhook(patterns: string[], callbackUrl: string): Promise<string> {
    const id = `webhook_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const webhook: WebhookSubscription = {
      id,
      patterns,
      callbackUrl,
      createdAt: new Date(),
      failures: 0
    };

    this.webhooks.set(id, webhook);

    // Subscribe to patterns
    for (const pattern of patterns) {
      this.eventRouter.on(pattern, async (event) => {
        await this.deliverWebhook(webhook, event);
      });
    }

    return id;
  }

  async addSSE(patterns: string[]): Promise<string> {
    const id = `sse_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const client: SSEClient = {
      id,
      patterns,
      response: null // Would be set on connection
    };

    this.sseClients.set(id, client);

    // Subscribe to patterns
    for (const pattern of patterns) {
      this.eventRouter.on(pattern, async (event) => {
        await this.deliverToSSEClient(client, event);
      });
    }

    return id;
  }

  removeWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }

  removeSSE(id: string): boolean {
    return this.sseClients.delete(id);
  }

  private async deliverToWebhooks(event: Event): Promise<void> {
    for (const webhook of this.webhooks.values()) {
      const matches = webhook.patterns.some(p => this.match(p, event.type));
      if (matches) {
        await this.deliverWebhook(webhook, event);
      }
    }
  }

  private async deliverWebhook(webhook: WebhookSubscription, event: Event): Promise<void> {
    try {
      await axios.post(webhook.callbackUrl, event, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Id': event.id,
          'X-Event-Type': event.type,
          'X-Event-Source': event.source
        }
      });

      webhook.failures = 0;
    } catch (error: any) {
      webhook.failures++;

      if (webhook.failures < 5) {
        // Retry later
        await this.redis.zAdd(this.webhookRetryQueue, {
          score: Date.now() + (60000 * webhook.failures),
          value: JSON.stringify({ webhookId: webhook.id, event, attempt: webhook.failures })
        });
      } else {
        console.error(`Webhook ${webhook.id} failed ${webhook.failures} times, disabling`);
        this.webhooks.delete(webhook.id);
      }
    }
  }

  private async deliverToSSE(event: Event): Promise<void> {
    for (const client of this.sseClients.values()) {
      const matches = client.patterns.some(p => this.match(p, event.type));
      if (matches) {
        await this.deliverToSSEClient(client, event);
      }
    }
  }

  private async deliverToSSEClient(client: SSEClient, event: Event): Promise<void> {
    if (!client.response) return;

    try {
      client.response.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      console.error(`SSE delivery failed for ${client.id}`);
      this.sseClients.delete(client.id);
    }
  }

  private match(pattern: string, eventType: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventType) return true;

    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(eventType);
  }

  private async startRetryProcessor(): Promise<void> {
    setInterval(async () => {
      try {
        // Get due retries
        const now = Date.now();
        const retries = await this.redis.zRangeByScore(this.webhookRetryQueue, '0', now, { COUNT: 10 });

        for (const item of retries) {
          const { webhookId, event, attempt } = JSON.parse(item);
          const webhook = this.webhooks.get(webhookId);

          if (webhook) {
            await this.deliverWebhook(webhook, event);
            await this.redis.zRem(this.webhookRetryQueue, item);
          } else {
            await this.redis.zRem(this.webhookRetryQueue, item);
          }
        }
      } catch (error) {
        console.error('Retry processor error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  getStats(): { webhooks: number; sseClients: number } {
    return {
      webhooks: this.webhooks.size,
      sseClients: this.sseClients.size
    };
  }
}
