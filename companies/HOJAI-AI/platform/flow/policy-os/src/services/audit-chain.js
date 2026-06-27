/**
 * PolicyOS — Tamper-Evident Audit Chain
 *
 * Provides a cryptographically sealed audit trail where every entry's hash
 * chains to the previous entry's hash (SHA-256). This makes tampering detectable:
 * any modification to a past entry breaks the chain forward from that point.
 *
 * Design:
 *   - Genesis entry has previousHash = 'GENESIS'
 *   - Every subsequent entry: hash = SHA-256(previousHash + JSON(entry))
 *   - Chain metadata stored separately in audit-chain-meta.json
 *   - Entries stored in individual files: audit/<id>.json
 *   - Daily archives: archives/audit-YYYY-MM-DD.jsonl (also sealed)
 *
 * Usage:
 *   import { createAuditChain } from './services/audit-chain.js';
 *   const chain = createAuditChain({ dataDir: './data/policy-os' });
 *   await chain.init();
 *   const entry = await chain.append({ type: 'policy.created', ... });
 *   const report = await chain.verify();
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const GENESIS_HASH = 'GENESIS';
const ALGORITHM = 'sha256';
const STORE_FILE = 'audit-chain-meta.json';

/**
 * @param {object} opts
 * @param {string} [opts.dataDir]         Base data directory (default: ./data/policy-os)
 * @param {string} [opts.auditDir]        Directory for individual audit files
 * @param {string} [opts.archiveDir]       Directory for daily archives
 * @param {string} [opts.serviceName]      For logging
 */
export function createAuditChain(opts = {}) {
  const dataDir = opts.dataDir || process.env.HOJAI_DATA_DIR || './data/policy-os';
  const auditDir = opts.auditDir || path.join(dataDir, 'audit');
  const archiveDir = opts.archiveDir || path.join(dataDir, 'archives');
  const serviceName = opts.serviceName || 'policy-os';

  // In-memory cache of recent entries (last 100) for fast reads
  const entryCache = new Map();
  const CACHE_MAX = 100;

  // =================================================================
  // Helpers
  // =================================================================

  function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  function chainMetaPath() {
    return path.join(dataDir, STORE_FILE);
  }

  function entryPath(id) {
    return path.join(auditDir, `${id}.json`);
  }

  function hashEntry(entry) {
    // Exclude hash/previousHash from computation (they don't exist yet)
    const { hash, previousHash, ...entryWithoutMeta } = entry;
    const json = JSON.stringify(entryWithoutMeta);
    return crypto.createHash(ALGORITHM).update(json).digest('hex');
  }

  // =================================================================
  // Chain Metadata (loaded once, updated on every append)
  // =================================================================

  function loadMeta() {
    try {
      if (fs.existsSync(chainMetaPath())) {
        return JSON.parse(fs.readFileSync(chainMetaPath(), 'utf8'));
      }
    } catch (err) {
      console.warn(`[${serviceName}] audit-chain meta corrupted: ${err.message}, starting fresh`);
    }
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      lastHash: null,
      entryCount: 0,
      firstEntryId: null,
      firstEntryHash: null,
    };
  }

  function saveMeta(meta) {
    ensureDir(dataDir);
    fs.writeFileSync(chainMetaPath(), JSON.stringify(meta, null, 2), 'utf8');
  }

  // =================================================================
  // Public API
  // =================================================================

  /**
   * Initialize the audit chain. Call once at startup.
   * Loads chain metadata; no-op if already initialized.
   */
  async function init() {
    ensureDir(auditDir);
    ensureDir(archiveDir);
    const meta = loadMeta();
    // Rebuild cache from last N entries if cache is cold
    if (meta.entryCount > 0 && entryCache.size === 0) {
      await rebuildCache();
    }
    return meta;
  }

  /**
   * Rebuild the in-memory cache from recent entries on disk.
   */
  async function rebuildCache() {
    try {
      const files = fs.readdirSync(auditDir)
        .filter(f => f.endsWith('.json'))
        .sort()
        .slice(-CACHE_MAX);
      for (const fname of files) {
        try {
          const entry = JSON.parse(fs.readFileSync(path.join(auditDir, fname), 'utf8'));
          entryCache.set(entry.id, entry);
        } catch { /* skip corrupted entries */ }
      }
    } catch { /* dir doesn't exist yet */ }
  }

  /**
   * Append a new entry to the audit chain.
   * Returns the sealed entry with { id, timestamp, previousHash, hash }.
   *
   * Algorithm:
   *   1. Wait for any in-flight writes (via pending chain) to ensure sequential reads
   *   2. Read current metadata synchronously
   *   3. Compute sealed entry (hash chain)
   *   4. Update cache immediately
   *   5. Schedule disk write (non-blocking)
   *
   * This ensures concurrent append() calls always produce a valid chain:
   * each entry's previousHash is locked before the next append() reads metadata.
   *
   * @param {object} entry - The raw audit entry (type, actor, details, etc.)
   * @param {string} [entry.id] - Optional ID; generated if not provided
   * @returns {Promise<object>} The sealed entry
   */
  async function append(entry) {
    // Wait for in-flight writes so we read the latest metadata
    if (_pending) await _pending;

    // Step 1: Read current metadata (must happen after pending resolves)
    const meta = loadMeta();
    const id = entry.id || uuidv4();
    const timestamp = entry.timestamp || new Date().toISOString();
    const prevHash = meta.lastHash || GENESIS_HASH;

    // Step 2: Compute sealed entry
    const sealed = {
      id,
      timestamp,
      previousHash: prevHash,
      entryVersion: 1,
      ...entry,
    };
    const { hash: _h, previousHash: _p, ...entryForHash } = sealed;
    const json = JSON.stringify(entryForHash);
    sealed.hash = crypto.createHash(ALGORITHM).update(prevHash + json).digest('hex');

    // Step 3: Update cache immediately (available before disk write)
    entryCache.set(id, sealed);
    if (entryCache.size > CACHE_MAX) {
      const oldest = entryCache.keys().next().value;
      entryCache.delete(oldest);
    }

    // Step 4: Schedule disk write (non-blocking — sealed entry already returned)
    _pending = (async () => {
      try {
        // Re-read meta to get updated entryCount (handles concurrent archive/reset)
        const m = loadMeta();
        m.lastHash = sealed.hash;
        m.entryCount = (m.entryCount || 0) + 1;
        if (!m.firstEntryId) {
          m.firstEntryId = sealed.id;
          m.firstEntryHash = sealed.hash;
        }
        ensureDir(auditDir);
        fs.writeFileSync(entryPath(id), JSON.stringify(sealed, null, 2), 'utf8');
        saveMeta(m);
      } catch (err) {
        console.error(`[${serviceName}] audit-chain write failed:`, err.message);
      }
    })();

    return sealed;
  }

  /**
   * Retrieve an entry by ID. Checks cache first, then disk.
   *
   * @param {string} id
   * @returns {object|null}
   */
  function get(id) {
    if (entryCache.has(id)) return entryCache.get(id);
    try {
      const fp = entryPath(id);
      if (fs.existsSync(fp)) {
        const entry = JSON.parse(fs.readFileSync(fp, 'utf8'));
        entryCache.set(id, entry);
        return entry;
      }
    } catch { /* not found or corrupted */ }
    return null;
  }

  /**
   * Retrieve entries by filter criteria.
   *
   * @param {object} filter - { type, actor, policyId, from, to, limit }
   * @returns {object[]}
   */
  function query(filter = {}) {
    const { type, actor, policyId, from, to, limit = 100 } = filter;
    const results = [];

    // Scan audit directory (entries are stored individually)
    try {
      const files = fs.readdirSync(auditDir).filter(f => f.endsWith('.json'));
      // Read in reverse order (newest first) for efficiency
      for (let i = files.length - 1; i >= 0 && results.length < limit; i--) {
        try {
          const entry = JSON.parse(fs.readFileSync(path.join(auditDir, files[i]), 'utf8'));
          if (type && entry.type !== type) continue;
          if (actor && entry.actor !== actor) continue;
          if (policyId && entry.policyId !== policyId) continue;
          if (from && entry.timestamp < from) continue;
          if (to && entry.timestamp > to) continue;
          results.push(entry);
        } catch { /* skip */ }
      }
    } catch { /* directory doesn't exist */ }

    return results;
  }

  /**
   * Verify the integrity of the entire audit chain.
   * Returns a report with: valid, brokenAt, checked, duration.
   *
   * Algorithm:
   *   1. Build ID → entry map from disk + in-memory cache (cache covers unflushed entries)
   *   2. Find first entry (check meta, then cache, then scan disk for GENESIS previousHash)
   *   3. Walk the chain forward via previousHash
   *   4. Verify each hash matches SHA-256(previousHash + JSON)
   *
   * The cache is included because append() writes to cache immediately (before disk),
   * so unflushed entries exist only in the cache.
   */
  async function verify() {
    const start = Date.now();

    // Flush pending writes so disk is up-to-date
    if (_pending) await _pending;

    const meta = loadMeta();

    // Build ID → entry map: disk entries + in-memory cache (covers unflushed entries)
    const byId = new Map();
    let entryFiles;
    try {
      entryFiles = fs.readdirSync(auditDir).filter(f => f.endsWith('.json'));
    } catch {
      // No audit dir yet — rely entirely on cache
      entryFiles = [];
    }

    for (const fname of entryFiles) {
      try {
        const entry = JSON.parse(fs.readFileSync(path.join(auditDir, fname), 'utf8'));
        if (entry && entry.id) {
          const cached = entryCache.get(entry.id);
          if (cached && JSON.stringify(cached) !== JSON.stringify(entry)) {
            entryCache.delete(entry.id);
          }
          byId.set(entry.id, entry);
        }
      } catch { /* skip corrupted */ }
    }

    // Also include entries from cache that aren't on disk yet (unflushed)
    for (const [id, entry] of entryCache) {
      if (!byId.has(id)) byId.set(id, entry);
    }

    if (byId.size === 0) {
      return { valid: true, checked: 0, durationMs: Date.now() - start };
    }

    // Find the first entry
    let currentEntry = null;
    if (meta.firstEntryId && byId.has(meta.firstEntryId)) {
      currentEntry = byId.get(meta.firstEntryId);
    }
    if (!currentEntry) {
      // Fallback: scan for entry whose previousHash is GENESIS
      for (const [id, entry] of byId) {
        if (entry.previousHash === GENESIS_HASH) {
          currentEntry = entry;
          break;
        }
      }
    }
    if (!currentEntry) {
      // Last resort: first entry by ID sort
      const sortedIds = [...byId.keys()].sort();
      currentEntry = byId.get(sortedIds[0]);
    }

    if (!currentEntry) {
      return { valid: false, reason: 'could not find first entry to start chain walk', checked: 0, durationMs: Date.now() - start };
    }

    let checked = 0;
    let lastGoodEntry = null;
    const visited = new Set();

    while (currentEntry && !visited.has(currentEntry.id)) {
      visited.add(currentEntry.id);
      checked++;
      lastGoodEntry = { id: currentEntry.id, timestamp: currentEntry.timestamp };
      const { hash, previousHash, ...entryForHash } = currentEntry;
      const json = JSON.stringify(entryForHash);
      const computedHash = crypto
        .createHash(ALGORITHM)
        .update((previousHash || GENESIS_HASH) + json)
        .digest('hex');

      if (hash !== computedHash) {
        return {
          valid: false,
          brokenAt: currentEntry.id,
          brokenAtTimestamp: currentEntry.timestamp,
          reason: `hash mismatch: stored=${hash} computed=${computedHash}`,
          checked,
          lastGoodEntry,
          durationMs: Date.now() - start,
        };
      }

      // Find next entry: one whose previousHash equals this entry's hash
      currentEntry = null;
      for (const [id, entry] of byId) {
        if (!visited.has(id) && entry.previousHash === hash) {
          currentEntry = entry;
          break;
        }
      }
    }

    // Cross-check: did we visit the right number of entries?
    if (checked !== meta.entryCount && meta.entryCount > 0) {
      return {
        valid: false,
        brokenAt: lastGoodEntry?.id || null,
        reason: `entry count mismatch: expected ${meta.entryCount} got ${checked} (chain may have gaps or duplicates)`,
        checked,
        lastGoodEntry,
        durationMs: Date.now() - start,
      };
    }

    return { valid: true, checked, durationMs: Date.now() - start };
  }

  /**
   * Verify only the most recent N entries (fast integrity check).
   * Uses previousHash chain to walk backwards from the last entry.
   * @param {number} [n=10]
   */
  async function verifyRecent(n = 10) {
    const start = Date.now();
    try {
      // Load all entries and sort by timestamp ascending
      // Invalidate stale cache entries when reading from disk
      const byId = new Map();
      let files;
      try {
        files = fs.readdirSync(auditDir).filter(f => f.endsWith('.json'));
      } catch {
        files = [];
      }
      for (const fname of files) {
        try {
          const entry = JSON.parse(fs.readFileSync(path.join(auditDir, fname), 'utf8'));
          if (entry && entry.id) {
            const cached = entryCache.get(entry.id);
            if (cached && JSON.stringify(cached) !== JSON.stringify(entry)) {
              entryCache.delete(entry.id);
            }
            byId.set(entry.id, entry);
          }
        } catch { /* skip */ }
      }
      // Also include unflushed cache entries
      for (const [id, entry] of entryCache) {
        if (!byId.has(id)) byId.set(id, entry);
      }

      if (byId.size === 0) {
        return { valid: true, checked: 0, durationMs: Date.now() - start };
      }

      // Find the last entry (entry whose hash is never referenced as previousHash)
      const previousHashes = new Set();
      for (const [, entry] of byId) {
        if (entry.previousHash) previousHashes.add(entry.previousHash);
      }
      let lastEntry = null;
      for (const [, entry] of byId) {
        if (!previousHashes.has(entry.hash)) {
          lastEntry = entry;
          break;
        }
      }
      if (!lastEntry) lastEntry = [...byId.values()].pop();

      // Walk backwards to find last N entries
      const recent = [];
      let current = lastEntry;
      const visited = new Set();
      while (current && !visited.has(current.id) && recent.length < n) {
        visited.add(current.id);
        recent.unshift(current);
        // Find predecessor: entry whose hash === current.previousHash
        current = null;
        for (const [, entry] of byId) {
          if (!visited.has(entry.id) && entry.hash === recent[0].previousHash) {
            current = entry;
            break;
          }
        }
      }

      // Verify forward from the oldest of the recent entries
      const startEntry = recent[0];
      let currentEntry = startEntry;
      const visitedForward = new Set();

      for (const entry of recent) {
        const { hash, previousHash, ...entryForHash } = entry;
        const json = JSON.stringify(entryForHash);
        const computedHash = crypto
          .createHash(ALGORITHM)
          .update((previousHash || GENESIS_HASH) + json)
          .digest('hex');
        if (hash !== computedHash) {
          return { valid: false, brokenAt: entry.id, reason: 'hash mismatch', checked: recent.indexOf(entry) + 1, durationMs: Date.now() - start };
        }
      }

      return { valid: true, checked: recent.length, durationMs: Date.now() - start };
    } catch (err) {
      return { valid: false, reason: err.message, durationMs: Date.now() - start };
    }
  }

  /**
   * Archive the current audit directory to a daily sealed archive.
   * Creates: archives/audit-YYYY-MM-DD.jsonl with a seal entry at the end.
   */
  async function archive() {
    const meta = loadMeta();
    const stamp = new Date().toISOString().slice(0, 10);
    const archiveFile = path.join(archiveDir, `audit-${stamp}.jsonl`);

    ensureDir(archiveDir);

    // Collect entries synchronously first (they're already on disk)
    const files = fs.readdirSync(auditDir).filter(f => f.endsWith('.json')).sort();
    const lines = files.map(fname => {
      const entry = JSON.parse(fs.readFileSync(path.join(auditDir, fname), 'utf8'));
      return JSON.stringify(entry);
    });

    // Append seal entry
    if (files.length > 0) {
      const lastEntry = JSON.parse(fs.readFileSync(path.join(auditDir, files[files.length - 1]), 'utf8'));
      const seal = crypto
        .createHash(ALGORITHM)
        .update((lastEntry.hash || GENESIS_HASH) + 'ARCHIVED')
        .digest('hex');
      lines.push(JSON.stringify({
        id: `seal-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'chain.sealed',
        previousHash: lastEntry.hash,
        archiveDate: stamp,
        seal,
        entryCount: files.length,
      }));
    }

    // Write all lines at once
    await new Promise((resolve, reject) => {
      const content = lines.map(l => l + '\n').join('');
      fs.writeFile(archiveFile, content, 'utf8', err => {
        if (err) reject(err); else resolve();
      });
    });

    // Clear in-memory entries and reset disk state
    entryCache.clear();
    fs.rmSync(auditDir, { recursive: true, force: true });
    ensureDir(auditDir);

    // Reset chain metadata
    saveMeta({
      version: 1,
      createdAt: meta.createdAt,
      lastHash: null,
      entryCount: 0,
      firstEntryId: null,
      firstEntryHash: null,
      archivedAt: new Date().toISOString(),
      archiveFile,
    });

    return { archived: true, file: archiveFile, entriesArchived: files.length };
  }

  /**
   * Get chain metadata (without exposing internal path).
   */
  function getMeta() {
    return loadMeta();
  }

  /**
   * Flush all pending writes.
   */
  async function flush() {
    if (_pending) await _pending;
  }

  return {
    init,
    append,
    get,
    query,
    verify,
    verifyRecent,
    archive,
    getMeta,
    flush,
  };
}

/** Singleton instance for use across the app */
let _instance = null;

export function getAuditChain(opts) {
  if (!_instance) {
    _instance = createAuditChain(opts);
  }
  return _instance;
}

export function _resetAuditChain() {
  _instance = null;
  _pending = null;
}

/**
 * Module-level pending queue.
 * Reset via _resetPending() between tests or between instances.
 */
let _pending = null;

/**
 * Reset the module-level pending queue.
 * Call this in beforeEach() when creating multiple chain instances in tests.
 */
export function _resetPending() {
  _pending = null;
}

export default { createAuditChain, getAuditChain, _resetAuditChain, _resetPending };
