import { Webhook } from '../models/Webhook';
import { WebhookEventModel } from '../models/Event';
import logger from './logger';

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export interface PendingRetry {
  webhookId: string;
  event: WebhookEventModel;
  scheduledFor: Date;
  attempt: number;
}

const defaultConfig: RetryConfig = {
  maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '5'),
  initialDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000'),
  backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
  maxDelayMs: 24 * 60 * 60 * 1000, // Max 24 hours
};

class RetryService {
  private pendingRetries: Map<string, PendingRetry> = new Map();
  private config: RetryConfig = defaultConfig;
  private processingTimer?: NodeJS.Timeout;

  constructor() {
    // Start the retry processor
    this.startRetryProcessor();
  }

  configure(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  shouldRetry(attempts: number): boolean {
    return attempts < this.config.maxAttempts;
  }

  getNextRetryTime(attempts: number): Date {
    const delay = this.calculateDelay(attempts);
    return new Date(Date.now() + delay);
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
    const delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Cap at max delay
    return Math.min(delay, this.config.maxDelayMs);
  }

  scheduleRetry(webhook: Webhook, event: WebhookEventModel): void {
    const attempt = (event.deliveryAttempts || 0) + 1;

    if (!this.shouldRetry(attempt)) {
      logger.info(`Max retry attempts reached for event ${event.id}`, {
        webhookId: webhook.id,
        attempts: attempt,
      });
      return;
    }

    const nextRetryAt = this.getNextRetryTime(attempt);

    const pendingRetry: PendingRetry = {
      webhookId: webhook.id,
      event: event as WebhookEventModel,
      scheduledFor: nextRetryAt,
      attempt,
    };

    // Use event.id as key, but append webhookId for uniqueness
    const key = `${event.id}-${webhook.id}`;
    this.pendingRetries.set(key, pendingRetry);

    logger.info(`Scheduled retry for event ${event.id}`, {
      webhookId: webhook.id,
      attempt,
      scheduledFor: nextRetryAt.toISOString(),
      delayMs: nextRetryAt.getTime() - Date.now(),
    });
  }

  removeRetry(eventId: string, webhookId?: string): void {
    if (webhookId) {
      const key = `${eventId}-${webhookId}`;
      this.pendingRetries.delete(key);
    } else {
      // Remove all retries for this event
      for (const key of this.pendingRetries.keys()) {
        if (key.startsWith(`${eventId}-`)) {
          this.pendingRetries.delete(key);
        }
      }
    }
  }

  getPendingRetries(): PendingRetry[] {
    return Array.from(this.pendingRetries.values()).filter(
      retry => retry.scheduledFor <= new Date()
    );
  }

  getScheduledRetries(): PendingRetry[] {
    return Array.from(this.pendingRetries.values()).filter(
      retry => retry.scheduledFor > new Date()
    );
  }

  getRetryStats(): {
    pending: number;
    scheduled: number;
    maxAttempts: number;
    currentConfig: RetryConfig;
  } {
    const now = new Date();
    const pending = Array.from(this.pendingRetries.values()).filter(
      r => r.scheduledFor <= now
    ).length;

    return {
      pending,
      scheduled: this.pendingRetries.size - pending,
      maxAttempts: this.config.maxAttempts,
      currentConfig: this.config,
    };
  }

  private startRetryProcessor(): void {
    // Process pending retries every 5 seconds
    this.processingTimer = setInterval(async () => {
      await this.processPendingRetries();
    }, 5000);

    logger.info('Retry processor started');
  }

  private async processPendingRetries(): Promise<void> {
    const pendingRetries = this.getPendingRetries();

    if (pendingRetries.length === 0) return;

    logger.info(`Processing ${pendingRetries.length} pending retries`);

    for (const retry of pendingRetries) {
      try {
        const { orchestrator } = await import('./orchestrator');
        await orchestrator.deliverToWebhook(retry.webhook, retry.event);
        this.removeRetry(retry.event.id, retry.webhookId);
      } catch (error) {
        logger.error(`Error processing retry for event ${retry.event.id}`, {
          webhookId: retry.webhookId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  stop(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }
    logger.info('Retry processor stopped');
  }

  // Exponential backoff with jitter
  static calculateBackoffWithJitter(
    attempt: number,
    baseDelay: number = 1000,
    maxDelay: number = 60000,
    jitterFactor: number = 0.3
  ): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * jitterFactor * exponentialDelay;
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  // Linear backoff
  static calculateLinearBackoff(
    attempt: number,
    baseDelay: number = 1000,
    maxDelay: number = 60000
  ): number {
    return Math.min(baseDelay * attempt, maxDelay);
  }

  // Fixed delay
  static calculateFixedDelay(
    attempt: number,
    fixedDelay: number = 5000,
    maxDelay: number = 60000
  ): number {
    return Math.min(fixedDelay, maxDelay);
  }
}

export const retryService = new RetryService();
