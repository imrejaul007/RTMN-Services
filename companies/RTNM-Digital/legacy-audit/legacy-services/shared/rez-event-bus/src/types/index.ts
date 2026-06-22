import { z } from 'zod';

/**
 * Core event schema for the REZ Event Bus
 */
export const EventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  source: z.string().min(1),
  company: z.string().min(1),
  userId: z.string().optional(),
  timestamp: z.string().datetime(),
  data: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
});

export type Event = z.infer<typeof EventSchema>;

/**
 * Event message for Redis stream
 */
export interface EventMessage {
  id: string;
  eventType: string;
  data: string;
  timestamp: string;
  source?: string;
}

/**
 * Dead letter queue entry
 */
export interface DLQEntry {
  id: string;
  originalId: string;
  payload: EventMessage;
  failedAt: string;
  retryCount?: number;
}

/**
 * Subscription types
 */
export interface Subscription {
  id: string;
  channel: string;
  callback: string;
  createdAt: Date;
  pattern?: string;
}

/**
 * Webhook subscription
 */
export interface WebhookSubscription {
  id: string;
  patterns: string[];
  callbackUrl: string;
  createdAt: Date;
  failures: number;
  headers?: Record<string, string>;
}

/**
 * SSE client connection
 */
export interface SSEClient {
  id: string;
  patterns: string[];
  response: any;
  createdAt: Date;
}

/**
 * Event handler function type
 */
export type EventHandler = (event: Event) => Promise<void>;

/**
 * Pattern matcher function type
 */
export type PatternMatcher = (pattern: string, eventType: string) => boolean;

/**
 * Consumer group options
 */
export interface ConsumerOptions {
  group: string;
  consumer: string;
  count?: number;
  block?: number;
}

/**
 * Publish options
 */
export interface PublishOptions {
  channel: string;
  eventType: string;
  data: any;
  source?: string;
  correlationId?: string;
}

/**
 * Stats interface for monitoring
 */
export interface EventBusStats {
  published: number;
  consumed: number;
  failed: number;
  pending: number;
  activeSubscriptions: number;
  activeConsumers: number;
  uptime: number;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: string;
  redis: boolean;
  uptime: number;
}

/**
 * API response types
 */
export interface PublishResponse {
  success: boolean;
  messageId: string;
  timestamp: string;
}

export interface SubscribeResponse {
  success: boolean;
  subscriptionId: string;
  channel: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}
