/**
 * Slack Webhook Handler
 * Processes incoming webhook events from Slack with signature verification
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  SlackWebhookEvent,
  SlackEvent,
  SlackEventCallback,
  Logger,
  ObserverEvent,
} from '../types/index.js';

// Supported event types
export const SUPPORTED_EVENTS = [
  'message.channels',
  'message.groups',
  'message.im',
  'message.mpim',
  'message.app_home',
  'app_mention',
  'reaction_added',
  'reaction_removed',
  'user_presence_changed',
  'member_joined_channel',
  'member_left_channel',
  'channel_created',
  'channel_archive',
  'channel_unarchive',
  'channel_deleted',
  'channel_renamed',
  'group_joined',
  'group_left',
  'app_home_opened',
  'app_uninstalled',
  'file_shared',
  'file_public',
  'user_changed',
  'team_join',
] as const;

export type SupportedEventType = typeof SUPPORTED_EVENTS[number];

export interface WebhookHandlerConfig {
  signingSecret: string;
  logger?: Logger;
  onEvent?: (event: ObserverEvent) => Promise<void>;
  onError?: (error: Error, event: SlackEvent) => void;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Process incoming webhook events from Slack
 */
export class SlackWebhookHandler {
  private signingSecret: string;
  private logger: Logger;
  private eventHandlers: Map<string, (event: SlackEvent) => Promise<void>> = new Map();

  constructor(config: WebhookHandlerConfig) {
    this.signingSecret = config.signingSecret;
    this.logger = config.logger || console;

    if (config.onEvent) {
      this.on('*', async (event: SlackEvent) => {
        const observerEvent = this.toObserverEvent(event);
        if (observerEvent) {
          await config.onEvent(observerEvent);
        }
      });
    }

    if (config.onError) {
      this.onError = config.onError;
    }
  }

  private onError: (error: Error, event: SlackEvent) => void = (error, event) => {
    this.logger.error('Webhook handler error', {
      error: error.message,
      eventType: event.type,
    });
  };

  /**
   * Register an event handler
   */
  on(eventType: string, handler: (event: SlackEvent) => Promise<void>): void {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Register multiple event handlers
   */
  onEvents(handlers: Record<string, (event: SlackEvent) => Promise<void>>): void {
    for (const [eventType, handler] of Object.entries(handlers)) {
      this.on(eventType, handler);
    }
  }

  /**
   * Verify the webhook signature from Slack
   */
  verifySignature(
    body: string,
    signature: string,
    timestamp: string
  ): WebhookVerificationResult {
    if (!this.signingSecret) {
      this.logger.warn('Signing secret not configured, skipping verification');
      return { valid: true };
    }

    // Check timestamp to prevent replay attacks (5 minutes window)
    const ts = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > 300) {
      this.logger.warn('Webhook timestamp outside acceptable window', {
        timestamp: ts,
        now,
        diff: Math.abs(now - ts),
      });
      return { valid: false, error: 'Request timestamp outside acceptable window' };
    }

    // Build the base string for HMAC
    const baseString = `v0:${timestamp}:${body}`;

    // Calculate expected signature
    const expectedSignature = createHmac('sha256', this.signingSecret)
      .update(baseString)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const signatureBuffer = Buffer.from(signature.replace('v0=', ''), 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Invalid signature format' };
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return { valid: false, error: 'Signature verification failed' };
    }

    return { valid: true };
  }

  /**
   * Handle an incoming webhook request
   */
  async handleWebhook(
    body: string | Record<string, unknown>,
    headers: Record<string, string | undefined>
  ): Promise<{
    handled: boolean;
    response?: unknown;
  }> {
    const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;
    const signature = headers['x-slack-signature'];
    const timestamp = headers['x-slack-request-timestamp'];

    // Handle URL verification challenge
    if (bodyObj.type === 'url_verification') {
      this.logger.debug('Handling URL verification challenge');
      return {
        handled: true,
        response: { challenge: (bodyObj as { challenge?: string }).challenge },
      };
    }

    // Handle rate limiting
    if (bodyObj.type === 'app_rate_limited') {
      const rateLimitInfo = bodyObj as {
        team_id: string;
        minute_rate_limited: number;
        api_app_id: string;
      };
      this.logger.warn('Slack app rate limited', rateLimitInfo);
      return {
        handled: true,
        response: { ok: true },
      };
    }

    // Verify signature
    if (signature && timestamp) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      const verification = this.verifySignature(bodyStr, signature, timestamp);
      if (!verification.valid) {
        this.logger.warn('Webhook signature verification failed', {
          error: verification.error,
        });
        throw new Error(verification.error);
      }
    }

    // Handle event callback
    if (bodyObj.type === 'event_callback') {
      const eventCallback = bodyObj as SlackEventCallback;
      const event = eventCallback.event;

      if (!event) {
        return { handled: false };
      }

      this.logger.debug('Processing webhook event', {
        eventType: event.type,
        eventId: eventCallback.event_id,
      });

      // Handle with specific handler or wildcard
      const handler = this.eventHandlers.get(event.type) || this.eventHandlers.get('*');

      if (handler) {
        try {
          await handler(event);
        } catch (error) {
          this.onError(error as Error, event);
        }
      } else {
        this.logger.debug('No handler registered for event type', {
          eventType: event.type,
        });
      }

      return {
        handled: true,
        response: { ok: true },
      };
    }

    return { handled: false };
  }

  /**
   * Convert Slack event to Observer event for TwinOS
   */
  private toObserverEvent(event: SlackEvent): ObserverEvent | null {
    const baseEvent: ObserverEvent = {
      source: 'slack',
      type: 'message',
      employeeId: event.user || '',
      timestamp: event.ts ? new Date(parseFloat(event.ts) * 1000).toISOString() : new Date().toISOString(),
      data: {
        raw: event as Record<string, unknown>,
      },
    };

    switch (event.type) {
      case 'message':
        return {
          ...baseEvent,
          type: event.subtype === 'message_changed' ? 'message' : 'message',
          employeeId: event.user || event.bot_id || '',
          data: {
            channel: event.channel,
            text: event.text,
            messageTs: event.ts,
            threadTs: event.thread_ts,
            userId: event.user,
            userName: undefined,
            raw: event as Record<string, unknown>,
          },
        };

      case 'reaction_added':
        return {
          ...baseEvent,
          type: 'reaction',
          employeeId: event.user || '',
          data: {
            channel: event.item?.channel,
            reaction: event.reaction,
            messageTs: event.item?.ts,
            userId: event.user,
            raw: event as Record<string, unknown>,
          },
        };

      case 'reaction_removed':
        return {
          ...baseEvent,
          type: 'reaction',
          employeeId: event.user || '',
          data: {
            channel: event.item?.channel,
            reaction: event.reaction,
            messageTs: event.item?.ts,
            userId: event.user,
            raw: event as Record<string, unknown>,
          },
        };

      case 'member_joined_channel':
        return {
          ...baseEvent,
          type: 'channel_join',
          employeeId: event.user || '',
          data: {
            channel: event.channel,
            userId: event.user,
            raw: event as Record<string, unknown>,
          },
        };

      case 'member_left_channel':
        return {
          ...baseEvent,
          type: 'channel_leave',
          employeeId: event.user || '',
          data: {
            channel: event.channel,
            userId: event.user,
            raw: event as Record<string, unknown>,
          },
        };

      case 'user_presence_changed':
        return {
          ...baseEvent,
          type: 'status_change',
          employeeId: event.user || '',
          data: {
            userId: event.user,
            raw: event as Record<string, unknown>,
          },
        };

      case 'app_mention':
        return {
          ...baseEvent,
          type: 'mention',
          employeeId: event.user || '',
          data: {
            channel: event.channel,
            text: event.text,
            messageTs: event.ts,
            userId: event.user,
            raw: event as Record<string, unknown>,
          },
        };

      default:
        // Return generic event for unhandled types
        return {
          ...baseEvent,
          type: 'message',
          data: {
            raw: event as Record<string, unknown>,
          },
        };
    }
  }

  /**
   * Parse Slack message text and extract entities
   */
  parseMessageText(text: string): {
    mentions: string[];
    channels: string[];
    emojis: string[];
    urls: string[];
  } {
    const mentionRegex = /<@([A-Z0-9]+)>/g;
    const channelRegex = /<#([A-Z0-9]+)\|([^>]+)>/g;
    const emojiRegex = /:([a-z0-9_]+):/g;
    const urlRegex = /<([^|>]+)\|([^>]+)>/g;

    const mentions: string[] = [];
    const channels: string[] = [];
    const emojis: string[] = [];
    const urls: string[] = [];

    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    while ((match = channelRegex.exec(text)) !== null) {
      channels.push(match[1]);
    }

    while ((match = emojiRegex.exec(text)) !== null) {
      emojis.push(match[1]);
    }

    while ((match = urlRegex.exec(text)) !== null) {
      urls.push(match[2]);
    }

    return { mentions, channels, emojis, urls };
  }
}

/**
 * Create a webhook handler with config from environment
 */
export function createWebhookHandler(
  onEvent?: (event: ObserverEvent) => Promise<void>
): SlackWebhookHandler {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    throw new Error('SLACK_SIGNING_SECRET environment variable is required');
  }

  return new SlackWebhookHandler({
    signingSecret,
    onEvent,
  });
}

export default SlackWebhookHandler;