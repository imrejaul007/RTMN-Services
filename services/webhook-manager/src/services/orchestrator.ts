import { Webhook, getWebhookById } from '../models/Webhook';
import { WebhookEventModel, EventPayload } from '../models/Event';
import { deliveryService, DeliveryResult } from './delivery';
import { retryService } from './retry';
import logger from './logger';

export interface OrchestrationResult {
  eventId: string;
  webhookId: string;
  success: boolean;
  deliveryId?: string;
  error?: string;
  duration?: number;
}

export interface DispatchResult {
  event: WebhookEventModel;
  totalWebhooks: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  results: OrchestrationResult[];
}

class WebhookOrchestrator {
  private processingQueue: Map<string, boolean> = new Map();

  async dispatchEvent(
    event: WebhookEventModel,
    webhooks: Webhook[]
  ): Promise<OrchestrationResult[]> {
    logger.info(`Dispatching event ${event.id} to ${webhooks.length} webhooks`, {
      eventType: event.type,
      webhookIds: webhooks.map(w => w.id),
    });

    const results: OrchestrationResult[] = [];

    // Filter webhooks based on event filters
    const matchingWebhooks = webhooks.filter(webhook => {
      if (!webhook.enabled) return false;
      if (!webhook.matchesEvent(event.type)) return false;
      if (webhook.filters?.conditions) {
        return webhook.matchesFilters?.(event.payload) ?? true;
      }
      return true;
    });

    logger.info(`Found ${matchingWebhooks.length} matching webhooks for event ${event.id}`);

    // Dispatch to all matching webhooks in parallel
    const dispatchPromises = matchingWebhooks.map(webhook =>
      this.deliverToWebhook(webhook, event)
    );

    const dispatchResults = await Promise.allSettled(dispatchPromises);

    for (let i = 0; i < dispatchResults.length; i++) {
      const result = dispatchResults[i];
      const webhook = matchingWebhooks[i];

      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          eventId: event.id,
          webhookId: webhook.id,
          success: false,
          error: result.reason?.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  async deliverToWebhook(
    webhook: Webhook,
    event: WebhookEventModel | { type: string; payload: EventPayload; source: string }
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();

    // Prevent duplicate processing
    const queueKey = `${event.id}-${webhook.id}`;
    if (this.processingQueue.get(queueKey)) {
      logger.warn(`Duplicate delivery attempt detected for ${queueKey}`);
      return {
        eventId: 'id' in event ? event.id : 'unknown',
        webhookId: webhook.id,
        success: false,
        error: 'Duplicate delivery attempt',
      };
    }

    this.processingQueue.set(queueKey, true);

    try {
      logger.info(`Delivering event to webhook ${webhook.id}`, {
        webhookUrl: webhook.url,
        eventType: event.type,
      });

      const deliveryResult = await deliveryService.deliver({
        webhook,
        event,
      });

      const duration = Date.now() - startTime;

      // Update webhook stats
      if (deliveryResult.success) {
        webhook.recordSuccess();
        logger.info(`Successfully delivered event to webhook ${webhook.id}`, {
          deliveryId: deliveryResult.deliveryId,
          duration,
        });
      } else {
        webhook.recordFailure();

        // Schedule retry if applicable
        if (retryService.shouldRetry(deliveryResult.attempts || 1)) {
          const nextRetry = retryService.getNextRetryTime(deliveryResult.attempts || 1);
          event.markRetrying(nextRetry);

          // Queue for retry
          retryService.scheduleRetry(webhook, event);
          logger.info(`Scheduled retry for webhook ${webhook.id}`, {
            nextRetry,
            attempt: deliveryResult.attempts,
          });
        }

        logger.error(`Failed to deliver event to webhook ${webhook.id}`, {
          error: deliveryResult.error,
          attempts: deliveryResult.attempts,
        });
      }

      return {
        eventId: 'id' in event ? event.id : 'unknown',
        webhookId: webhook.id,
        success: deliveryResult.success,
        deliveryId: deliveryResult.deliveryId,
        error: deliveryResult.error,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      webhook.recordFailure();

      return {
        eventId: 'id' in event ? event.id : 'unknown',
        webhookId: webhook.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    } finally {
      this.processingQueue.delete(queueKey);
    }
  }

  async retryEvent(event: WebhookEventModel): Promise<OrchestrationResult | null> {
    if (!event.webhookId) {
      logger.error(`Cannot retry event ${event.id}: no webhookId associated`);
      return null;
    }

    const webhook = getWebhookById(event.webhookId);
    if (!webhook) {
      logger.error(`Cannot retry event ${event.id}: webhook ${event.webhookId} not found`);
      return null;
    }

    if (!webhook.enabled) {
      logger.error(`Cannot retry event ${event.id}: webhook ${webhook.id} is disabled`);
      return null;
    }

    logger.info(`Retrying event ${event.id} for webhook ${webhook.id}`);

    return this.deliverToWebhook(webhook, event);
  }

  async processRetryQueue(): Promise<void> {
    const retries = retryService.getPendingRetries();

    logger.info(`Processing ${retries.length} pending retries`);

    for (const retry of retries) {
      const webhook = getWebhookById(retry.webhookId);
      if (!webhook || !webhook.enabled) {
        retryService.removeRetry(retry.eventId);
        continue;
      }

      await this.deliverToWebhook(webhook, retry.event);
    }
  }

  async handleIncomingEvent(
    type: string,
    payload: EventPayload,
    source: string = 'external'
  ): Promise<DispatchResult> {
    const { createEvent, getWebhooksByEvent } = await import('../models/Event');

    // Create the event
    const event = createEvent({ type, payload, source });

    // Get matching webhooks
    const webhooks = getWebhooksByEvent(type);

    // Dispatch
    const results = await this.dispatchEvent(event, webhooks);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      event,
      totalWebhooks: webhooks.length,
      successfulDeliveries: successful,
      failedDeliveries: failed,
      results,
    };
  }
}

export const orchestrator = new WebhookOrchestrator();
