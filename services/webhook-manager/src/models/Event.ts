import crypto from 'crypto';

export type EventStatus = 'pending' | 'processing' | 'delivered' | 'failed' | 'retrying';

export interface EventPayload {
  [key: string]: unknown;
}

export interface EventSubscription {
  id: string;
  webhookId: string;
  eventTypes: string[];
  filters?: {
    conditions?: Record<string, unknown>;
    payloadPaths?: string[];
  };
  createdAt: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  payload: EventPayload;
  source: string;
  timestamp: Date;
  status: EventStatus;
  webhookId?: string;
  deliveryAttempts: number;
  nextRetryAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateEventRequest {
  type: string;
  payload: EventPayload;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSubscriptionRequest {
  webhookId: string;
  eventTypes: string[];
  filters?: EventSubscription['filters'];
}

export class EventSubscriptionModel implements EventSubscription {
  id: string;
  webhookId: string;
  eventTypes: string[];
  filters?: EventSubscription['filters'];
  createdAt: Date;

  constructor(data: CreateSubscriptionRequest) {
    this.id = EventSubscriptionModel.generateId();
    this.webhookId = data.webhookId;
    this.eventTypes = data.eventTypes;
    this.filters = data.filters;
    this.createdAt = new Date();
  }

  static generateId(): string {
    return `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  matchesEvent(eventType: string, payload: EventPayload): boolean {
    if (!this.eventTypes.includes(eventType)) return false;

    if (this.filters?.conditions) {
      for (const [key, expectedValue] of Object.entries(this.filters.conditions)) {
        const actualValue = payload[key];
        if (actualValue !== expectedValue) return false;
      }
    }

    return true;
  }

  toJSON(): EventSubscription {
    return {
      id: this.id,
      webhookId: this.webhookId,
      eventTypes: this.eventTypes,
      filters: this.filters,
      createdAt: this.createdAt,
    };
  }
}

export class WebhookEventModel implements WebhookEvent {
  id: string;
  type: string;
  payload: EventPayload;
  source: string;
  timestamp: Date;
  status: EventStatus;
  webhookId?: string;
  deliveryAttempts: number;
  nextRetryAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;

  constructor(data: CreateEventRequest & { id?: string; webhookId?: string }) {
    this.id = data.id || WebhookEventModel.generateId();
    this.type = data.type;
    this.payload = data.payload;
    this.source = data.source || 'system';
    this.timestamp = new Date();
    this.status = 'pending';
    this.webhookId = data.webhookId;
    this.deliveryAttempts = 0;
    this.metadata = data.metadata;
  }

  static generateId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  markProcessing(): void {
    this.status = 'processing';
  }

  markDelivered(): void {
    this.status = 'delivered';
    this.error = undefined;
  }

  markFailed(error: string): void {
    this.status = 'failed';
    this.error = error;
  }

  markRetrying(nextRetryAt: Date): void {
    this.status = 'retrying';
    this.nextRetryAt = nextRetryAt;
  }

  incrementAttempts(): void {
    this.deliveryAttempts++;
  }

  toJSON(): WebhookEvent {
    return {
      id: this.id,
      type: this.type,
      payload: this.payload,
      source: this.source,
      timestamp: this.timestamp,
      status: this.status,
      webhookId: this.webhookId,
      deliveryAttempts: this.deliveryAttempts,
      nextRetryAt: this.nextRetryAt,
      error: this.error,
      metadata: this.metadata,
    };
  }
}

// In-memory storage for events and subscriptions
export const eventStore = new Map<string, WebhookEventModel>();
export const subscriptionStore = new Map<string, EventSubscriptionModel>();

// Event types registry
export const registeredEventTypes = new Set<string>([
  'order.created',
  'order.updated',
  'order.cancelled',
  'order.completed',
  'payment.processed',
  'payment.failed',
  'customer.created',
  'customer.updated',
  'inventory.low',
  'inventory.updated',
  'user.registered',
  'user.updated',
  'system.alert',
  'delivery.started',
  'delivery.completed',
  'delivery.failed',
]);

export function registerEventType(eventType: string): void {
  registeredEventTypes.add(eventType);
}

export function getAllEventTypes(): string[] {
  return Array.from(registeredEventTypes);
}

// Event query helpers
export function getEventById(id: string): WebhookEventModel | undefined {
  return eventStore.get(id);
}

export function getAllEvents(filters?: {
  type?: string;
  status?: EventStatus;
  limit?: number;
  offset?: number;
}): WebhookEventModel[] {
  let events = Array.from(eventStore.values());

  if (filters?.type) {
    events = events.filter(e => e.type === filters.type);
  }
  if (filters?.status) {
    events = events.filter(e => e.status === filters.status);
  }

  // Sort by timestamp descending (newest first)
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const offset = filters?.offset || 0;
  const limit = filters?.limit || 100;

  return events.slice(offset, offset + limit);
}

export function createEvent(data: CreateEventRequest, webhookId?: string): WebhookEventModel {
  const event = new WebhookEventModel({ ...data, webhookId });
  eventStore.set(event.id, event);
  return event;
}

// Subscription helpers
export function getSubscriptionById(id: string): EventSubscriptionModel | undefined {
  return subscriptionStore.get(id);
}

export function getSubscriptionsByWebhook(webhookId: string): EventSubscriptionModel[] {
  return Array.from(subscriptionStore.values()).filter(s => s.webhookId === webhookId);
}

export function getSubscriptionsByEventType(eventType: string): EventSubscriptionModel[] {
  return Array.from(subscriptionStore.values()).filter(s => s.eventTypes.includes(eventType));
}

export function createSubscription(data: CreateSubscriptionRequest): EventSubscriptionModel {
  const subscription = new EventSubscriptionModel(data);
  subscriptionStore.set(subscription.id, subscription);
  return subscription;
}

export function deleteSubscription(id: string): boolean {
  return subscriptionStore.delete(id);
}
