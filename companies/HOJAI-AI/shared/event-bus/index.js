/**
 * RTMN Event Bus - Redis Streams publisher/subscriber (ESM)
 *
 * Lightweight wrapper around ioredis that gives every RTMN service:
 *
 *   - `publishAsync(type, payload, opts)` — fire-and-forget. Never blocks the
 *     request handler. Persists to a Redis Stream with bounded MAXLEN.
 *   - `subscribe(patterns, handler)` — subscribes to one or more type
 *     patterns (`*`, `order.*`, `*.created`) and routes matching events
 *     to the handler.
 *   - Lazy connect: the ioredis client is only constructed the first time
 *     you publish or subscribe. This means importing the module is free.
 *   - No-op fallback when REDIS_URL is unset or unreachable: publishAsync
 *     logs a warning and resolves; subscribe quietly disables itself. This
 *     keeps dev / tests / offline demos working.
 *
 * Envelope (what we write to the stream and read back):
 *
 *   {
 *     eventId:      '<uuidv4>',
 *     type:         'order.created',
 *     source:       'commerce-os',
 *     schemaVersion:'1.0',
 *     emittedAt:    '2026-06-22T12:34:56.789Z',
 *     tenantId:     't-1' | null,
 *     payload:      { ... },                // stringified
 *     headers:      { 'X-Correlation': ... } // optional, stringified
 *   }
 *
 * Each service gets its own consumer group `cg:<serviceName>:v1` so
 * concurrent consumers on the same logical stream each see every event
 * exactly once (within their group).
 *
 * Usage:
 *   import { EventBus } from '@rtmn/shared/event-bus';
 *   const bus = new EventBus({ serviceName: 'sutar-decision-engine' });
 *   await bus.connect();
 *   bus.publishAsync('decision.made', { decisionId: 'd-1', outcome: 'approve' }, { tenantId: 't-1' });
 *   await bus.subscribe(['decision.*'], async (event) => {
 *     console.log('got', event.type, event.payload);
 *   });
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_STREAM_PREFIX = 'rtmn:';
const DEFAULT_MAX_LEN = 10000;
const RECONNECT_DELAY_MS = 2000;

/**
 * @typedef {object} EventEnvelope
 * @property {string} eventId
 * @property {string} type
 * @property {string} source
 * @property {string} schemaVersion
 * @property {string} emittedAt
 * @property {string|null} tenantId
 * @property {object} payload
 * @property {object} [headers]
 */

/**
 * @typedef {object} EventBusOptions
 * @property {string} serviceName - Used to derive consumer group and log prefix
 * @property {string} [url] - Redis URL. Defaults to REDIS_URL env var. If unset
 *   the bus operates in offline mode (publishAsync is a no-op, subscribe is a no-op).
 * @property {string} [streamPrefix='rtmn:'] - Prefix for the shared stream name.
 *   The full stream name is `<prefix>events`.
 * @property {number} [maxLen=10000] - MAXLEN ~ bound on the Redis Stream.
 * @property {string} [schemaVersion='1.0'] - Default schema version for emitted events.
 * @property {number} [blockMs=5000] - XREADGROUP block timeout.
 * @property {number} [batchSize=32] - XREADGROUP COUNT.
 * @property {string} [consumerName] - Override the consumer name (defaults to
 *   `<serviceName>-<short-uuid>` so multiple replicas share a group).
 */

class EventBus {
  /** @param {EventBusOptions} options */
  constructor(options = {}) {
    if (!options.serviceName) {
      throw new Error('EventBus requires options.serviceName');
    }
    this.serviceName = options.serviceName;
    this.url = options.url || process.env.REDIS_URL || null;
    this.streamPrefix = options.streamPrefix || DEFAULT_STREAM_PREFIX;
    this.streamName = `${this.streamPrefix.replace(/:$/, '')}:events`;
    this.maxLen = options.maxLen || DEFAULT_MAX_LEN;
    this.schemaVersion = options.schemaVersion || '1.0';
    this.blockMs = options.blockMs || 5000;
    this.batchSize = options.batchSize || 32;
    this.consumerName =
      options.consumerName ||
      `${this.serviceName}-${Math.random().toString(36).slice(2, 8)}`;
    this.groupName = `cg:${this.serviceName}:v1`;

    /** @type {Redis|null} */
    this._redis = null;
    this._connected = false;
    this._connecting = false;
    this._closed = false;
    this._subscribers = []; // [{patterns:Set<string>, handler:Function}]
    this._readerLoop = null;
  }

  _log(level, msg) {
    const tag = `[event-bus:${this.serviceName}]`;
    if (level === 'warn') console.warn(`${tag} ${msg}`);
    else if (level === 'error') console.error(`${tag} ${msg}`);
    else console.log(`${tag} ${msg}`);
  }

  /**
   * Lazily create the ioredis client. Idempotent. Returns true if the
   * client is usable (Redis reachable or assumed reachable), false if
   * the bus is in offline mode (no REDIS_URL).
   */
  async connect() {
    if (this._connected || this._connecting) return this._connected;
    if (this._closed) throw new Error('EventBus is closed');
    if (!this.url) {
      this._log('warn', 'REDIS_URL not set — running in offline mode');
      return false;
    }
    this._connecting = true;
    return new Promise((resolve) => {
      try {
        this._redis = new Redis(this.url, {
          maxRetriesPerRequest: 3,
          enableOfflineQueue: true,
          lazyConnect: false,
          retryStrategy: (times) => Math.min(times * 200, RECONNECT_DELAY_MS),
        });
        this._redis.on('ready', async () => {
          this._connected = true;
          this._connecting = false;
          this._log('log', `connected to ${this._replaceAuth(this.url)}`);
          try {
            await this._ensureGroup();
          } catch (err) {
            this._log('warn', `ensureGroup failed: ${err.message}`);
          }
          if (this._subscribers.length > 0) {
            this._startReader();
          }
          resolve(true);
        });
        this._redis.on('error', (err) => {
          this._log('warn', `redis error: ${err.message}`);
          this._connected = false;
        });
        this._redis.on('end', () => {
          this._connected = false;
        });
      } catch (err) {
        this._connecting = false;
        this._log('warn', `connect failed: ${err.message} — offline mode`);
        resolve(false);
      }
    });
  }

  /**
   * XGROUP CREATE — idempotent. The `MKSTREAM` flag means we don't need
   * to write a dummy entry first.
   *
   * We use `$` so the group only sees new entries published AFTER the
   * group was created. (Using `0` would replay the entire stream
   * history on every restart, which is expensive on long-lived streams
   * and not what most consumers want.)
   */
  async _ensureGroup() {
    if (!this._redis) return;
    try {
      await this._redis.xgroup('CREATE', this.streamName, this.groupName, '$', 'MKSTREAM');
      this._log('log', `group ${this.groupName} ready on ${this.streamName} (start at tail)`);
    } catch (err) {
      // BUSYGROUP means the group already exists — fine.
      if (err && err.message && err.message.includes('BUSYGROUP')) return;
      throw err;
    }
  }

  /**
   * Build an envelope from publish args.
   * @returns {EventEnvelope}
   */
  _envelope(type, payload, opts = {}) {
    return {
      eventId: uuidv4(),
      type: String(type),
      source: opts.source || this.serviceName,
      schemaVersion: opts.schemaVersion || this.schemaVersion,
      emittedAt: new Date().toISOString(),
      tenantId: opts.tenantId != null ? String(opts.tenantId) : null,
      payload: payload && typeof payload === 'object' ? payload : {},
      headers: opts.headers && typeof opts.headers === 'object' ? opts.headers : {},
    };
  }

  /**
   * Publish an event. Fire-and-forget: returns a Promise but callers
   * typically don't await it. If Redis is unreachable the promise still
   * resolves — we just log a warning.
   *
   * @param {string} type
   * @param {object} [payload]
   * @param {object} [opts]
   * @param {string|null} [opts.tenantId]
   * @param {string} [opts.source]
   * @param {string} [opts.schemaVersion]
   * @param {object} [opts.headers]
   * @returns {Promise<{eventId:string, streamId:string|null}>}
   */
  async publishAsync(type, payload = {}, opts = {}) {
    if (this._closed) return { eventId: null, streamId: null };
    if (!this.url) return { eventId: null, streamId: null };
    if (!this._connected) {
      const ok = await this.connect();
      if (!ok) return { eventId: null, streamId: null };
    }
    const env = this._envelope(type, payload, opts);
    const fields = [
      'eventId', env.eventId,
      'type', env.type,
      'source', env.source,
      'schemaVersion', env.schemaVersion,
      'emittedAt', env.emittedAt,
      'tenantId', env.tenantId == null ? '' : env.tenantId,
      'payload', JSON.stringify(env.payload),
      'headers', JSON.stringify(env.headers),
    ];
    try {
      const streamId = await this._redis.xadd(
        this.streamName,
        'MAXLEN', '~', this.maxLen,
        '*',
        ...fields
      );
      return { eventId: env.eventId, streamId };
    } catch (err) {
      this._log('warn', `xadd failed: ${err.message}`);
      return { eventId: env.eventId, streamId: null };
    }
  }

  /**
   * Synchronous wrapper that swallows the promise. Use only when you
   * cannot await (e.g. fire-and-forget from a non-async helper).
   */
  publish(type, payload, opts) {
    this.publishAsync(type, payload, opts).catch((err) => {
      this._log('warn', `publish dropped: ${err.message}`);
    });
  }

  /**
   * Subscribe to one or more type patterns.
   *
   * Patterns:
   *   - '*'        — matches every event type
   *   - 'a.b'      — exact match
   *   - 'a.*'      — matches a.anything (one dot-segment wildcard)
   *   - '*.b'      — matches anything.b
   *
   * @param {string[]} patterns
   * @param {(event: EventEnvelope & {streamId:string}) => Promise<void>|void} handler
   */
  async subscribe(patterns, handler) {
    if (!Array.isArray(patterns) || patterns.length === 0) {
      throw new Error('subscribe requires a non-empty patterns array');
    }
    if (typeof handler !== 'function') {
      throw new Error('subscribe requires a handler function');
    }
    this._subscribers.push({ patterns: new Set(patterns), handler });
    if (this._connected) {
      this._startReader();
    } else {
      // Connect will call _startReader when ready
      await this.connect();
    }
  }

  _startReader() {
    if (this._readerLoop) return;
    this._readerLoop = this._runReader().catch((err) => {
      this._log('error', `reader loop crashed: ${err.message}`);
      this._readerLoop = null;
    });
  }

  async _runReader() {
    // Block forever reading from the stream consumer group. We exit
    // when `quit()` is called.
    let consecutiveEmpty = 0;
    while (!this._closed && this._connected && this._redis) {
      try {
        const result = await this._redis.xreadgroup(
          'GROUP', this.groupName, this.consumerName,
          'COUNT', this.batchSize,
          'BLOCK', this.blockMs,
          'STREAMS', this.streamName, '>'
        );
        if (!result || result.length === 0) {
          consecutiveEmpty++;
          // Health check: every ~30s while idle, do a ping so we
          // surface disconnects quickly
          if (consecutiveEmpty > 6 && this._redis) {
            try { await this._redis.ping(); } catch (_) { /* ignore */ }
          }
          continue;
        }
        consecutiveEmpty = 0;
        for (const [, entries] of result) {
          for (const [streamId, kv] of entries) {
            const event = this._parseStreamEntry(streamId, kv);
            if (!event) continue;
            for (const sub of this._subscribers) {
              if (this._matchesAny(sub.patterns, event.type)) {
                try {
                  await sub.handler(event);
                } catch (err) {
                  this._log('error', `handler error for ${event.type}: ${err.message}`);
                }
              }
            }
            // Ack so we don't redeliver
            try {
              await this._redis.xack(this.streamName, this.groupName, streamId);
            } catch (err) {
              this._log('warn', `xack failed: ${err.message}`);
            }
          }
        }
      } catch (err) {
        if (this._closed) return;
        this._log('warn', `xreadgroup error: ${err.message} — backing off`);
        await sleep(Math.min(this.blockMs, 1500));
      }
    }
  }

  _parseStreamEntry(streamId, kv) {
    const obj = {};
    for (let i = 0; i < kv.length; i += 2) {
      obj[kv[i]] = kv[i + 1];
    }
    if (!obj.type) return null;
    let payload = {};
    let headers = {};
    try {
      if (obj.payload) payload = JSON.parse(obj.payload);
    } catch (_) { /* ignore malformed payload */ }
    try {
      if (obj.headers) headers = JSON.parse(obj.headers);
    } catch (_) { /* ignore malformed headers */ }
    return {
      eventId: obj.eventId || null,
      type: obj.type,
      source: obj.source || 'unknown',
      schemaVersion: obj.schemaVersion || '1.0',
      emittedAt: obj.emittedAt || new Date().toISOString(),
      tenantId: obj.tenantId || null,
      payload,
      headers,
      streamId,
    };
  }

  _matchesAny(patterns, type) {
    for (const p of patterns) {
      if (this._matchPattern(p, type)) return true;
    }
    return false;
  }

  _matchPattern(pattern, type) {
    if (!pattern || pattern === '*') return true;
    if (pattern === type) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return type === prefix || type.startsWith(prefix + '.');
    }
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2);
      const parts = type.split('.');
      return parts[parts.length - 1] === suffix;
    }
    return false;
  }

  /**
   * Returns counts for the consumer group (for diagnostics).
   */
  async stats() {
    if (!this._connected || !this._redis) {
      return { connected: false, mode: 'offline' };
    }
    try {
      const info = await this._redis.xinfo('GROUPS', this.streamName);
      const streamLen = await this._redis.xlen(this.streamName);
      return {
        connected: true,
        mode: 'redis-streams',
        stream: this.streamName,
        streamLen,
        group: this.groupName,
        consumer: this.consumerName,
        groups: Array.isArray(info) ? info : [],
      };
    } catch (err) {
      return { connected: true, mode: 'redis-streams', error: err.message };
    }
  }

  /**
   * Close the bus. Idempotent.
   */
  async quit() {
    if (this._closed) return;
    this._closed = true;
    this._connected = false;
    if (this._readerLoop) {
      try { await this._readerLoop; } catch (_) { /* ignore */ }
      this._readerLoop = null;
    }
    if (this._redis) {
      try { await this._redis.quit(); } catch (_) { /* ignore */ }
      this._redis = null;
    }
  }

  _replaceAuth(url) {
    return url.replace(/\/\/.*@/, '//***@');
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { EventBus };
export default EventBus;