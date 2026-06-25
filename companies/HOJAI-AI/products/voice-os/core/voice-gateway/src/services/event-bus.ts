/**
 * Redis Event Bus — Voice Gateway v1.1
 * ======================================
 * Emits training events to Redis streams for async consumption.
 * Falls back to in-memory queue if Redis is unavailable.
 *
 * Event schema: { type, engine, audioHash, transcript, language, confidence, metadata, ts }
 */

import { config } from '../config/index.js';

type RedisClient = import('redis').RedisClientType;
let redis: RedisClient | null = null;
let connected = false;

// ── Redis client ───────────────────────────────────────────────────────────────

async function getClient(): Promise<RedisClient | null> {
  if (redis) return redis;

  try {
    const { createClient } = await import('redis');
    const url = config.training.redisUrl;
    const client: RedisClient = createClient({ url }) as unknown as RedisClient;
    redis = client;

    client.on('error', (err: Error) => {
      if (connected) {
        console.warn('[event-bus] Redis error:', err.message);
        connected = false;
      }
    });
    client.on('connect', () => {
      connected = true;
      console.log('[event-bus] Connected to Redis');
    });

    await client.connect();
    connected = true;
    return client;
  } catch (err) {
    console.warn('[event-bus] Redis not available — using in-memory fallback:', err instanceof Error ? err.message : String(err));
    connected = false;
    return null;
  }
}

// ── In-memory fallback queue ────────────────────────────────────────────────────

interface QueuedEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

const inMemoryQueue: QueuedEvent[] = [];
const MAX_QUEUE_SIZE = 10_000;

// ── Event emission ─────────────────────────────────────────────────────────────

export type TrainingEventType =
  | 'stt_sample' | 'tts_sample' | 'benchmark_run' | 'benchmark_complete'
  | 'hojai_promoted' | 'hojai_demoted' | 'engine_error' | 'cost_alert';

export interface TrainingEvent {
  id: string;
  type: TrainingEventType;
  engine: string;
  timestamp: number;
  audioHash?: string;
  transcript?: string;
  language?: string;
  confidence?: number;
  audioDurationMs?: number;
  costUsd?: number;
  metadata?: Record<string, unknown>;
}

let eventCounter = 0;

export async function emitEvent(event: Omit<TrainingEvent, 'id' | 'timestamp'>): Promise<void> {
  const fullEvent: TrainingEvent = {
    ...event,
    id: `evt-${++eventCounter}-${Date.now()}`,
    timestamp: Date.now(),
  };

  // Always log
  console.log(`[event-bus:${event.type}]`, JSON.stringify(fullEvent));

  // Try Redis, fallback to in-memory
  const client = await getClient();
  if (client && connected) {
    try {
      await client.xAdd(
        'voice-training:events',
        '*',
        Object.fromEntries(
          Object.entries(fullEvent).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')])
        )
      );
    } catch (err) {
      console.warn('[event-bus] Redis xAdd failed, queuing in-memory:', err instanceof Error ? err.message : String(err));
      enqueueInMemory(fullEvent);
    }
  } else {
    enqueueInMemory(fullEvent);
  }
}

function enqueueInMemory(event: TrainingEvent): void {
  if (inMemoryQueue.length >= MAX_QUEUE_SIZE) {
    // Drop oldest 10%
    inMemoryQueue.splice(0, Math.floor(MAX_QUEUE_SIZE * 0.1));
    console.warn('[event-bus] In-memory queue full, dropped oldest 10%');
  }
  inMemoryQueue.push({ type: event.type, data: event as unknown as Record<string, unknown>, timestamp: Date.now(), retries: 0 });
}

// ── Drain in-memory queue to Redis ─────────────────────────────────────────────

export async function drainQueue(): Promise<number> {
  const client = await getClient();
  if (!client || !connected || inMemoryQueue.length === 0) return 0;

  let drained = 0;
  while (inMemoryQueue.length > 0) {
    const event = inMemoryQueue.shift()!;
    try {
      await client.xAdd(
        'voice-training:events',
        '*',
        Object.fromEntries(
          Object.entries(event.data).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')])
        )
      );
      drained++;
    } catch {
      // Put back at front
      inMemoryQueue.unshift(event);
      break;
    }
  }
  if (drained > 0) console.log(`[event-bus] Drained ${drained} events to Redis`);
  return drained;
}

// ── Consumer group support ────────────────────────────────────────────────────

export async function ensureConsumerGroup(): Promise<void> {
  const client = await getClient();
  if (!client || !connected) return;
  try {
    await client.xGroupCreate('voice-training:events', 'training-pipeline', '0', { MKSTREAM: true });
    console.log('[event-bus] Consumer group "training-pipeline" created');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('BUSYGROUP')) {
      console.warn('[event-bus] xGroupCreate:', msg);
    }
  }
}

export async function readEvents(count = 100): Promise<TrainingEvent[]> {
  const client = await getClient();
  if (!client || !connected) return [];

  try {
    const results = await client.xReadGroup(
      'training-pipeline',
      `consumer-${process.pid}`,
      [{ key: 'voice-training:events', id: '>' }],
      { COUNT: count, BLOCK: 2000 }
    );

    if (!results || results.length === 0) return [];
    const events: TrainingEvent[] = [];
    for (const stream of results) {
      for (const message of stream.messages) {
        const obj: Record<string, string> = {};
        for (const [field, value] of Object.entries(message.message)) {
          obj[field] = String(value ?? '');
        }
        events.push({
          id: obj.id ?? message.id,
          type: obj.type as TrainingEventType,
          engine: obj.engine,
          timestamp: parseInt(obj.timestamp),
          audioHash: obj.audioHash,
          transcript: obj.transcript,
          language: obj.language,
          confidence: obj.confidence ? parseFloat(obj.confidence) : undefined,
          audioDurationMs: obj.audioDurationMs ? parseInt(obj.audioDurationMs) : undefined,
          costUsd: obj.costUsd ? parseFloat(obj.costUsd) : undefined,
          metadata: obj.metadata ? JSON.parse(obj.metadata) : undefined,
        });
      }
    }
    return events;
  } catch (err) {
    console.warn('[event-bus] xReadGroup:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function acknowledgeEvents(ids: string[]): Promise<void> {
  const client = await getClient();
  if (!client || !connected || ids.length === 0) return;
  try {
    await client.xAck('voice-training:events', 'training-pipeline', ids);
  } catch (err) {
    console.warn('[event-bus] xAck:', err instanceof Error ? err.message : String(err));
  }
}

export async function close(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    connected = false;
  }
}

// ── Health ─────────────────────────────────────────────────────────────────────

export function isConnected(): boolean {
  return connected;
}

export function getQueueSize(): number {
  return inMemoryQueue.length;
}

export default { emitEvent, drainQueue, ensureConsumerGroup, readEvents, acknowledgeEvents, close, isConnected, getQueueSize };
