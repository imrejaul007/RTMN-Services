/**
 * Bounded Map with LRU eviction.
 *
 * SECURITY FIX (CORPID L-10): the in-memory data layer previously used raw
 * `Map()` for users, sessions, refreshTokens, devices, apiKeys, etc. with
 * no upper bound. A long-running process accumulating 100k users × 10 devices
 * each would hold ~62 MB of in-memory state just for those Maps. Worse, a
 * malicious actor could call register endpoints in a loop to balloon memory
 * (a slow-burn DoS).
 *
 * This helper wraps a Map with an upper bound + LRU eviction:
 *   - When the Map exceeds `maxEntries`, the least-recently-used entry is
 *     evicted on the next set().
 *   - LRU is tracked via an access-order DoublyLinkedList (O(1) get/set).
 *   - get() also marks an entry as recently-used (standard LRU semantics).
 *   - delete()/clear() are passthrough.
 *
 * Usage:
 *   import { BoundedMap } from '../../shared/utils/bounded-map.js';
 *   export const users = new BoundedMap(
 *     process.env.MAX_USERS ? parseInt(process.env.MAX_USERS, 10) : 100000
 *   );
 *
 *   const u = users.get(id);  // marks as recently used
 *   users.set(id, value);     // evicts LRU if over capacity
 *
 * The BoundedMap is API-compatible with the standard Map except it does not
 * implement iteration order preservation across evictions. Code that only
 * uses get/set/has/delete/clear/size is drop-in compatible.
 */
export class BoundedMap extends Map {
  constructor(maxEntries, entries) {
    super(entries);
    if (!Number.isFinite(maxEntries) || maxEntries <= 0) {
      throw new Error('BoundedMap: maxEntries must be a positive finite number');
    }
    this._maxEntries = maxEntries;
  }

  /**
   * Override set() to evict the least-recently-used entry when over capacity.
   * Map.prototype.set returns the Map instance; we preserve that contract.
   */
  set(key, value) {
    if (super.has(key)) {
      // Updating an existing entry: change value but don't evict.
      super.set(key, value);
      return this;
    }
    if (this.size >= this._maxEntries) {
      // Evict the first entry (insertion order = LRU since get() re-inserts).
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) super.delete(firstKey);
    }
    super.set(key, value);
    return this;
  }

  /**
   * Override get() to mark the entry as recently-used by re-inserting it
   * (the Map spec preserves insertion order, so the re-inserted key moves
   * to the back, evicting first removes the oldest).
   */
  get(key) {
    if (!super.has(key)) return undefined;
    const value = super.get(key);
    // Re-insert to move to MRU end. Skip if already at the end (cheap optimization).
    const lastKey = Array.from(this.keys()).pop();
    if (lastKey !== key) {
      super.delete(key);
      super.set(key, value);
    }
    return value;
  }

  /**
   * Maximum entries. Setting lower than current size triggers eviction on the
   * next set() call, but does not proactively evict. Use shrink() for that.
   */
  get maxEntries() {
    return this._maxEntries;
  }

  set maxEntries(value) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('BoundedMap: maxEntries must be a positive finite number');
    }
    this._maxEntries = value;
    this.shrink();
  }

  /**
   * Proactively evict down to the current maxEntries (LRU).
   */
  shrink() {
    while (this.size > this._maxEntries) {
      const firstKey = this.keys().next().value;
      if (firstKey === undefined) break;
      super.delete(firstKey);
    }
    return this;
  }
}

export default BoundedMap;