import crypto from 'crypto';
import { Company, EventType, ChannelType } from '../models/journey';
import { eventAggregator, RawEvent } from './eventAggregator';
import { logger } from '../utils/logger';

export interface WebhookPayload {
  event: string;
  data: {
    customerId: string;
    companyId?: string;
    companyName?: string;
    eventType: string;
    channel?: string;
    metadata?: Record<string, unknown>;
    properties?: Record<string, unknown>;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    referralSource?: string;
    utmParameters?: Record<string, string>;
    timestamp?: string;
  };
  signature?: string;
  timestamp?: number;
}

export interface WebhookResult {
  success: boolean;
  eventId?: string;
  error?: string;
  processedAt: Date;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  retryCount: number;
  retryDelay: number;
}

export class WebhookHandler {
  private webhookQueue: WebhookPayload[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly PROCESS_INTERVAL = 1000; // 1 second

  constructor() {
    this.startQueueProcessing();
  }

  /**
   * Receive webhook from a company
   */
  async receiveWebhook(
    companyId: string,
    payload: WebhookPayload
  ): Promise<WebhookResult> {
    logger.info(`Received webhook from company ${companyId}`, {
      event: payload.event,
      customerId: payload.data.customerId
    });

    try {
      // Validate webhook payload
      if (!this.validatePayload(payload)) {
        return {
          success: false,
          error: 'Invalid payload structure',
          processedAt: new Date()
        };
      }

      // Process the webhook
      const result = await this.processWebhook(payload, companyId);

      return result;
    } catch (error) {
      logger.error(`Error processing webhook from ${companyId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processedAt: new Date()
      };
    }
  }

  /**
   * Validate webhook payload structure
   */
  private validatePayload(payload: WebhookPayload): boolean {
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.event || typeof payload.event !== 'string') return false;
    if (!payload.data || typeof payload.data !== 'object') return false;
    if (!payload.data.customerId || typeof payload.data.customerId !== 'string') return false;
    if (!payload.data.eventType || typeof payload.data.eventType !== 'string') return false;
    return true;
  }

  /**
   * Validate webhook signature
   */
  async validateWebhook(
    payload: WebhookPayload,
    secret: string
  ): Promise<boolean> {
    if (!secret) {
      logger.warn('No webhook secret configured, skipping signature validation');
      return true;
    }

    if (!payload.signature) {
      logger.warn('Webhook received without signature');
      return false;
    }

    const timestamp = payload.timestamp || Math.floor(Date.now() / 1000);

    // Check timestamp (reject if older than 5 minutes)
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
    if (timestamp < fiveMinutesAgo) {
      logger.warn('Webhook timestamp too old', { timestamp, now: Math.floor(Date.now() / 1000) });
      return false;
    }

    // Calculate expected signature
    const payloadString = JSON.stringify({
      ...payload,
      ...(payload.data && { data: payload.data }),
      timestamp
    });

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    // Constant-time comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(payload.signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn('Webhook signature mismatch', {
        received: payload.signature.substring(0, 10) + '...',
        expected: expectedSignature.substring(0, 10) + '...'
      });
    }

    return isValid;
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    payload: WebhookPayload,
    companyId: string
  ): Promise<WebhookResult> {
    // Convert to raw event format
    const rawEvent: RawEvent = {
      customerId: payload.data.customerId,
      companyId: payload.data.companyId || companyId,
      companyName: payload.data.companyName,
      eventType: payload.data.eventType,
      channel: payload.data.channel,
      metadata: payload.data.metadata,
      properties: payload.data.properties,
      sessionId: payload.data.sessionId,
      userAgent: payload.data.userAgent,
      ipAddress: payload.data.ipAddress,
      referralSource: payload.data.referralSource,
      utmParameters: payload.data.utmParameters,
      timestamp: payload.data.timestamp ? new Date(payload.data.timestamp) : new Date()
    };

    // Receive and process the event
    const event = await eventAggregator.receiveEvent(companyId, rawEvent);

    logger.info(`Webhook processed successfully`, {
      eventId: event.eventId,
      customerId: event.customerId,
      eventType: event.eventType
    });

    return {
      success: true,
      eventId: event.eventId,
      processedAt: new Date()
    };
  }

  /**
   * Register a webhook endpoint for a company
   */
  async registerWebhook(
    companyId: string,
    config: Partial<WebhookConfig>
  ): Promise<WebhookConfig> {
    const company = await Company.findOne({ companyId });

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    const webhookConfig: WebhookConfig = {
      url: config.url || '',
      secret: config.secret || crypto.randomBytes(32).toString('hex'),
      events: config.events || Object.values(EventType),
      enabled: config.enabled ?? true,
      retryCount: config.retryCount ?? 3,
      retryDelay: config.retryDelay ?? 5000
    };

    // Store webhook secret in company document
    company.webhookSecret = webhookConfig.secret;
    company.webhookUrl = webhookConfig.url;
    await company.save();

    logger.info(`Webhook registered for company ${companyId}`, {
      url: webhookConfig.url,
      eventsCount: webhookConfig.events.length
    });

    return webhookConfig;
  }

  /**
   * Generate webhook signature for testing
   */
  generateSignature(
    payload: object,
    secret: string,
    timestamp?: number
  ): string {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify({ ...payload, timestamp: ts });

    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Add event to webhook queue (for sending outbound webhooks)
   */
  async queueWebhook(
    targetUrl: string,
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const webhookPayload: WebhookPayload = {
      event,
      data: data as WebhookPayload['data'],
      timestamp: Math.floor(Date.now() / 1000)
    };

    this.webhookQueue.push(webhookPayload);
    logger.debug(`Webhook queued for ${targetUrl}`, { event });
  }

  /**
   * Start processing webhook queue
   */
  private startQueueProcessing(): void {
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.PROCESS_INTERVAL);
  }

  /**
   * Process webhook queue
   */
  private async processQueue(): Promise<void> {
    if (this.webhookQueue.length === 0) return;

    const batch = this.webhookQueue.splice(0, this.BATCH_SIZE);

    for (const webhook of batch) {
      try {
        // In production, would make HTTP request to targetUrl
        logger.debug(`Processing queued webhook`, { event: webhook.event });
        // await axios.post(targetUrl, webhook);
      } catch (error) {
        logger.error(`Error processing queued webhook`, error);
        // Would handle retry logic here
      }
    }
  }

  /**
   * Handle batch webhook events
   */
  async processBatchWebhook(
    companyId: string,
    events: WebhookPayload[]
  ): Promise<{ processed: number; failed: number; results: WebhookResult[] }> {
    const results: WebhookResult[] = [];
    let processed = 0;
    let failed = 0;

    for (const event of events) {
      const result = await this.receiveWebhook(companyId, event);
      results.push(result);

      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    }

    logger.info(`Batch webhook processed: ${processed} success, ${failed} failed`);

    return { processed, failed, results };
  }

  /**
   * Get webhook health status
   */
  getQueueStatus(): {
    queueLength: number;
    processing: boolean;
    lastProcessed?: Date;
  } {
    return {
      queueLength: this.webhookQueue.length,
      processing: this.processingInterval !== null
    };
  }

  /**
   * Shutdown webhook handler
   */
  async shutdown(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Process remaining queue
    await this.processQueue();

    logger.info('Webhook handler shutdown complete');
  }
}

export const webhookHandler = new WebhookHandler();
