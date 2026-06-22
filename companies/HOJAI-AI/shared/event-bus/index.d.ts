/**
 * TypeScript definitions for @rtmn/shared/event-bus
 */

export interface EventEnvelope {
  eventId: string;
  type: string;
  source: string;
  schemaVersion: string;
  emittedAt: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  streamId?: string;
}

export interface EventBusOptions {
  serviceName: string;
  url?: string;
  streamPrefix?: string;
  maxLen?: number;
  schemaVersion?: string;
  blockMs?: number;
  batchSize?: number;
  consumerName?: string;
}

export interface PublishOptions {
  tenantId?: string | null;
  source?: string;
  schemaVersion?: string;
  headers?: Record<string, string>;
}

export interface PublishResult {
  eventId: string | null;
  streamId: string | null;
}

export interface EventBusStats {
  connected: boolean;
  mode: 'redis-streams' | 'offline';
  stream?: string;
  streamLen?: number;
  group?: string;
  consumer?: string;
  groups?: unknown[];
  error?: string;
}

export type EventHandler = (event: EventEnvelope) => Promise<void> | void;

export class EventBus {
  constructor(options: EventBusOptions);

  serviceName: string;
  url: string | null;
  streamName: string;
  maxLen: number;
  schemaVersion: string;
  groupName: string;
  consumerName: string;

  connect(): Promise<boolean>;
  publishAsync(
    type: string,
    payload?: Record<string, unknown>,
    opts?: PublishOptions
  ): Promise<PublishResult>;
  publish(
    type: string,
    payload?: Record<string, unknown>,
    opts?: PublishOptions
  ): void;
  subscribe(patterns: string[], handler: EventHandler): Promise<void>;
  stats(): Promise<EventBusStats>;
  quit(): Promise<void>;
}

export default EventBus;