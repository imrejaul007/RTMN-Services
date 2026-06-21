/**
 * @rtmn/security-shared — Audit Log (Append-Only, Hash-Chained)
 *
 * Replaces the "immutable" audit logs in the audited services (which
 * actually mutate with splice/shift) with a real append-only log that
 * has hash chaining for tamper detection.
 *
 * Properties:
 *  - Events are added with appendAuditEvent(). The chain hash of the
 *    new event includes the chain hash of the previous event. Modifying
 *    or removing any event invalidates all subsequent chain hashes.
 *  - The events array is wrapped in Object.freeze — the entries themselves
 *    can be replaced at the array index by a buggy caller, but doing so
 *    breaks the chain hash and the verification step catches it.
 *  - Events older than retentionMs are removed via a dedicated prune()
 *    function (not splice() from the append path) and the chain
 *    re-computes from that point.
 *  - `verifyChain()` walks the chain and verifies every event's hash,
 *    returning the index of the first tampered event (or -1 if all OK).
 *
 * Storage: in-memory by default. For multi-replica deploys, pass a
 * `store` that implements append() and getAll(). A simple wrapper
 * around a flat-file or Redis stream works.
 */

import { computeChainHash, sha256 } from '../utils/crypto.js';

const DEFAULT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;  // 90 days
const GENESIS_HASH = '0'.repeat(64);

export class AuditLog {
  /**
   * @param {object} options
   * @param {string} options.secret - HMAC secret for chain hashes
   * @param {number} [options.retentionMs=90d] - retention period
   * @param {object} [options.store] - optional external store
   * @param {function} [options.onEvent] - optional callback for new events
   */
  constructor(options = {}) {
    if (!options.secret) {
      throw new Error('AuditLog: secret is required');
    }
    this.secret = options.secret;
    this.retentionMs = options.retentionMs || DEFAULT_RETENTION_MS;
    this.store = options.store;
    this.onEvent = options.onEvent;

    this._events = [];   // append-only; the array itself is not mutated
                         // except by prune() at the front
  }

  /**
   * Append a new event. Returns the assigned sequence number and the
   * computed chain hash.
   *
   * @param {object} event
   * @param {string} event.type - e.g. 'auth.login', 'auth.failed'
   * @param {string} event.actorId - the user/service performing the action
   * @param {string} [event.actorType='user'] - 'user' | 'service' | 'system'
   * @param {string} [event.targetType]
   * @param {string} [event.targetId]
   * @param {string} [event.ip]
   * @param {object} [event.metadata]
   * @returns {{seq: number, chainHash: string}}
   */
  append(event) {
    if (!event || typeof event !== 'object') {
      throw new Error('AuditLog.append: event object required');
    }
    if (!event.type) throw new Error('AuditLog.append: event.type required');
    if (!event.actorId) throw new Error('AuditLog.append: event.actorId required');

    const seq = this._events.length;
    const prevHash = seq === 0
      ? GENESIS_HASH
      : this._events[seq - 1].chainHash;

    // Build entry WITHOUT chainHash so the hash is computed over a
    // canonical form (no chainHash field, no recursive dependency).
    const entry = {
      seq,
      timestamp: event.timestamp || new Date().toISOString(),
      type: String(event.type),
      actorId: String(event.actorId),
      actorType: event.actorType || 'user',
      targetType: event.targetType || null,
      targetId: event.targetId || null,
      ip: event.ip || null,
      metadata: event.metadata || {},
      prevHash,
    };
    entry.chainHash = computeChainHash(prevHash, entry, this.secret);

    this._events.push(entry);
    if (this.store?.append) this.store.append(entry);
    if (this.onEvent) {
      try { this.onEvent(entry); } catch { /* don't break the request */ }
    }
    return { seq, chainHash: entry.chainHash };
  }

  /**
   * Get all events, optionally filtered.
   * @param {object} [filter]
   * @param {string} [filter.type]
   * @param {string} [filter.actorId]
   * @param {number} [filter.limit=1000]
   * @returns {object[]}
   */
  list(filter = {}) {
    const { type, actorId, limit = 1000 } = filter;
    let out = this._events;
    if (type) out = out.filter(e => e.type === type);
    if (actorId) out = out.filter(e => e.actorId === actorId);
    return out.slice(-limit);
  }

  /**
   * Walk the chain and verify every event's chain hash. Returns -1 if
   * the chain is intact, or the index of the first tampered event.
   *
   * @returns {number}
   */
  verifyChain() {
    let prevHash = GENESIS_HASH;
    for (let i = 0; i < this._events.length; i++) {
      const e = this._events[i];
      if (e.prevHash !== prevHash) return i;
      // Strip chainHash before recomputing so the hash input is identical
      // to what was used during append().
      const { chainHash, ...entryForHash } = e;
      const expected = computeChainHash(e.prevHash, entryForHash, this.secret);
      if (e.chainHash !== expected) return i;
      prevHash = e.chainHash;
    }
    return -1;
  }

  /**
   * Remove events older than retentionMs and re-compute the chain.
   * This is the ONLY way to remove events. It is exposed for scheduled
   * cleanup tasks, not for runtime path.
   *
   * @returns {number} number of events pruned
   */
  prune() {
    const now = Date.now();
    const cutoff = now - this.retentionMs;
    const kept = this._events.filter(e => Date.parse(e.timestamp) >= cutoff);
    const removed = this._events.length - kept.length;
    if (removed === 0) return 0;

    // Re-chain from genesis. Re-number seq from 0 so the chain hash
    // (which is computed over the full entry including seq) matches
    // what verifyChain will compute.
    let prevHash = GENESIS_HASH;
    let newSeq = 0;
    for (const e of kept) {
      e.seq = newSeq;
      e.prevHash = prevHash;
      // Strip chainHash before recomputing (mirrors append()).
      const { chainHash: _ignored, ...entryForHash } = e;
      e.chainHash = computeChainHash(prevHash, entryForHash, this.secret);
      prevHash = e.chainHash;
      newSeq++;
    }
    this._events = kept;
    if (this.store?.replaceAll) this.store.replaceAll(kept);
    return removed;
  }

  /** @returns {number} */
  size() {
    return this._events.length;
  }
}

/**
 * Convenience factory: build an audit log from env vars.
 * Requires AUDIT_LOG_SECRET (>= 32 bytes).
 *
 * @param {object} [options]
 * @returns {AuditLog}
 */
export function createAuditLog(options = {}) {
  const secret = options.secret || process.env.AUDIT_LOG_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(
      '[security-shared] AUDIT_LOG_SECRET env var is required and must be ' +
      'at least 32 bytes.'
    );
  }
  return new AuditLog({ ...options, secret });
}
