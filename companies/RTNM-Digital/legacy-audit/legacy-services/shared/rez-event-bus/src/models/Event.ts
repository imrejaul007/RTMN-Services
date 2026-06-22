import { v4 as uuidv4 } from 'uuid';
import { EventSchema, Event } from '../types';

/**
 * Event model factory and validation utilities
 */
export class EventModel {
  /**
   * Create a new event with generated ID and timestamp
   */
  static create(params: {
    type: string;
    source: string;
    company: string;
    data: Record<string, any>;
    userId?: string;
    metadata?: Record<string, any>;
  }): Event {
    return EventSchema.parse({
      id: uuidv4(),
      type: params.type,
      source: params.source,
      company: params.company,
      userId: params.userId,
      timestamp: new Date().toISOString(),
      data: params.data,
      metadata: params.metadata,
    });
  }

  /**
   * Validate an event object
   */
  static validate(event: unknown): Event {
    return EventSchema.parse(event);
  }

  /**
   * Parse event from Redis stream message
   */
  static fromStreamMessage(message: Record<string, string>): Event {
    return EventSchema.parse({
      id: message.id || uuidv4(),
      type: message.eventType,
      source: message.source || 'unknown',
      company: message.company || 'unknown',
      userId: message.userId,
      timestamp: message.timestamp || new Date().toISOString(),
      data: typeof message.data === 'string' ? JSON.parse(message.data) : message.data,
      metadata: message.metadata
        ? typeof message.metadata === 'string'
          ? JSON.parse(message.metadata)
          : message.metadata
        : undefined,
    });
  }

  /**
   * Serialize event for Redis stream
   */
  static toStreamMessage(event: Event): Record<string, string> {
    return {
      id: event.id,
      eventType: event.type,
      source: event.source,
      company: event.company,
      timestamp: event.timestamp,
      data: JSON.stringify(event.data),
      ...(event.userId && { userId: event.userId }),
      ...(event.metadata && { metadata: JSON.stringify(event.metadata) }),
    };
  }

  /**
   * Extract field-value pairs for XADD
   */
  static toFieldPairs(
    eventType: string,
    data: any,
    options?: { source?: string; correlationId?: string }
  ): string[] {
    const pairs: string[] = [];

    pairs.push('eventType', eventType);
    pairs.push('data', JSON.stringify(data));
    pairs.push('timestamp', new Date().toISOString());

    if (options?.source) {
      pairs.push('source', options.source);
    }

    if (options?.correlationId) {
      pairs.push('correlationId', options.correlationId);
    }

    return pairs;
  }
}

/**
 * Event type constants for common RTNM ecosystem events
 */
export const EventTypes = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Auth events
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_FAILED: 'auth.failed',

  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',

  // Payment events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',

  // Notification events
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_READ: 'notification.read',

  // System events
  SYSTEM_HEALTHY: 'system.healthy',
  SYSTEM_DEGRADED: 'system.degraded',
  SYSTEM_ERROR: 'system.error',
} as const;

/**
 * Channel constants for different event categories
 */
export const Channels = {
  DEFAULT: 'rez:events',
  AUTH: 'rez:auth',
  ORDERS: 'rez:orders',
  PAYMENTS: 'rez:payments',
  NOTIFICATIONS: 'rez:notifications',
  SYSTEM: 'rez:system',
  DLQ: 'rez:events:dlq',
} as const;
