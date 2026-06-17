import crypto from 'crypto';

export interface WebhookHeader {
  key: string;
  value: string;
}

export interface WebhookFilter {
  eventTypes?: string[];
  conditions?: Record<string, string | number | boolean>;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  filters?: WebhookFilter;
  headers?: WebhookHeader[];
  enabled: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
  successCount: number;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  filters?: WebhookFilter;
  headers?: WebhookHeader[];
  metadata?: Record<string, unknown>;
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  filters?: WebhookFilter;
  headers?: WebhookHeader[];
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export class Webhook implements WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  filters?: WebhookFilter;
  headers?: WebhookHeader[];
  enabled: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
  successCount: number;

  constructor(config: Partial<WebhookConfig> & { name: string; url: string; events: string[] }) {
    this.id = config.id || Webhook.generateId();
    this.name = config.name;
    this.url = config.url;
    this.secret = config.secret || Webhook.generateSecret();
    this.events = config.events;
    this.filters = config.filters;
    this.headers = config.headers || [];
    this.enabled = config.enabled !== undefined ? config.enabled : true;
    this.metadata = config.metadata;
    this.createdAt = config.createdAt || new Date();
    this.updatedAt = config.updatedAt || new Date();
    this.lastTriggeredAt = config.lastTriggeredAt;
    this.failureCount = config.failureCount || 0;
    this.successCount = config.successCount || 0;
  }

  static generateId(): string {
    return `wh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  static generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  update(data: UpdateWebhookRequest): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.url !== undefined) this.url = data.url;
    if (data.secret !== undefined) this.secret = data.secret;
    if (data.events !== undefined) this.events = data.events;
    if (data.filters !== undefined) this.filters = data.filters;
    if (data.headers !== undefined) this.headers = data.headers;
    if (data.enabled !== undefined) this.enabled = data.enabled;
    if (data.metadata !== undefined) this.metadata = data.metadata;
    this.updatedAt = new Date();
  }

  recordSuccess(): void {
    this.successCount++;
    this.lastTriggeredAt = new Date();
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastTriggeredAt = new Date();
  }

  matchesEvent(eventType: string): boolean {
    return this.enabled && this.events.includes(eventType);
  }

  matchesFilters?(payload: Record<string, unknown>): boolean {
    if (!this.filters?.conditions) return true;

    for (const [key, expectedValue] of Object.entries(this.filters.conditions)) {
      const actualValue = payload[key];
      if (actualValue !== expectedValue) return false;
    }
    return true;
  }

  toJSON(): WebhookConfig {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      secret: this.secret,
      events: this.events,
      filters: this.filters,
      headers: this.headers,
      enabled: this.enabled,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastTriggeredAt: this.lastTriggeredAt,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }
}

// In-memory storage for webhooks
export const webhookStore = new Map<string, Webhook>();

export function getWebhookById(id: string): Webhook | undefined {
  return webhookStore.get(id);
}

export function getAllWebhooks(): Webhook[] {
  return Array.from(webhookStore.values());
}

export function getWebhooksByEvent(eventType: string): Webhook[] {
  return getAllWebhooks().filter(webhook => webhook.matchesEvent(eventType));
}

export function createWebhook(data: CreateWebhookRequest): Webhook {
  const webhook = new Webhook({
    name: data.name,
    url: data.url,
    secret: data.secret,
    events: data.events,
    filters: data.filters,
    headers: data.headers,
    metadata: data.metadata,
  });
  webhookStore.set(webhook.id, webhook);
  return webhook;
}

export function updateWebhook(id: string, data: UpdateWebhookRequest): Webhook | null {
  const webhook = webhookStore.get(id);
  if (!webhook) return null;
  webhook.update(data);
  return webhook;
}

export function deleteWebhook(id: string): boolean {
  return webhookStore.delete(id);
}
