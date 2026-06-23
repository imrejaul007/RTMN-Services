/**
 * SkillOS — CorpID (Identity) wrapper
 *
 * Wraps the CorpID service (port 4702) for user/agent lookups.
 * In dev / test mode (`SKILLOS_NO_CORPID` or `SKILLOS_REQUIRE_AUTH=false`),
 * falls back to a stub that trusts the ownerId string.
 */

import { httpGet } from './http-client.js';

const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
const SKIP_CORPID = process.env.SKILLOS_NO_CORPID === '1'
  || (process.env.SKILLOS_REQUIRE_AUTH ?? 'true').toLowerCase() === 'false';

// In-memory cache: userId → user record (TTL: 60s)
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return e.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, at: Date.now() });
}

/**
 * Validate a user / agent id. In dev mode, just returns a minimal record.
 * In prod mode, calls CorpID.
 *
 * Returns: { id, type: 'human'|'agent'|'organization', name?, email?, exists: bool }
 */
export async function resolveOwner(id, opts = {}) {
  if (!id || typeof id !== 'string') {
    return { id: null, type: null, exists: false };
  }
  if (SKIP_CORPID) {
    // Dev fallback: trust the id. Type defaults to 'human'.
    return {
      id,
      type: opts.expectedType || 'human',
      name: `dev-user-${id.slice(0, 6)}`,
      exists: true,
      source: 'dev-fallback',
    };
  }
  // Real CorpID lookup
  const cached = cacheGet(`user:${id}`);
  if (cached) return cached;
  try {
    const r = await httpGet(`${CORPID_URL}/api/users/${encodeURIComponent(id)}`, { timeoutMs: 2000 });
    if (r.status === 404) {
      return { id, type: null, exists: false };
    }
    if (!r.ok) {
      return { id, type: null, exists: false, error: r.error || 'corpID-unreachable' };
    }
    const u = r.data?.data || r.data;
    const record = {
      id,
      type: u?.role === 'agent' ? 'agent' : (u?.role === 'organization' ? 'organization' : 'human'),
      name: u?.name || u?.email,
      email: u?.email,
      exists: true,
      source: 'corpID',
    };
    cacheSet(`user:${id}`, record);
    return record;
  } catch (e) {
    return { id, type: null, exists: false, error: e.message };
  }
}

/**
 * Lightweight existence check (no full record fetch).
 */
export async function ownerExists(id) {
  const r = await resolveOwner(id);
  return r.exists;
}

/**
 * Lookup multiple owners in parallel.
 */
export async function resolveOwners(ids) {
  if (!Array.isArray(ids)) return [];
  return Promise.all(ids.map((id) => resolveOwner(id)));
}

export const config = { CORPID_URL, SKIP_CORPID };