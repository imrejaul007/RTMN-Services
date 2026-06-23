/**
 * SkillOS — Embeddings / Vector Search wrapper
 *
 * Wraps the `vector-db` service (port default 4321, override with
 * VECTOR_DB_URL) for embedding-based skill discovery.
 *
 * API surface (all gracefully degrade — return null on failure, never throw
 * to the caller except in `query()` where the caller explicitly asks for
 * results):
 *
 *   - embed(text)               → number[] | null
 *   - indexAsset(asset)         → { id } | null   (computes + upserts)
 *   - removeAsset(id)           → boolean
 *   - query(text, k=10)         → [{ id, score }] | null   (top-k similar)
 *   - ensureCollection()        → boolean   (creates the collection if missing)
 *
 * If VECTOR_DB_URL is unreachable, embed/index/query return null and the
 * caller falls back to keyword search.
 */

import { httpGet, httpPost, httpDelete } from './http-client.js';

const VECTOR_DB_URL = process.env.VECTOR_DB_URL || 'http://localhost:4321';
const COLLECTION_NAME = process.env.VECTOR_DB_COLLECTION || 'skill-os-assets';
const EMBED_DIM = 128; // matches vector-db default

let _collectionEnsured = false;

/**
 * Compute an embedding for a piece of text.
 * Returns null if vector-db is unreachable or errors.
 */
export async function embed(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    const r = await httpPost(`${VECTOR_DB_URL}/api/embed`, { text, dim: EMBED_DIM }, { timeoutMs: 3000 });
    if (!r.ok) return null;
    return r.data?.embedding || r.data?.vector || null;
  } catch {
    return null;
  }
}

/**
 * Make sure our collection exists in vector-db. Idempotent.
 * Returns true on success, false on failure.
 */
export async function ensureCollection() {
  if (_collectionEnsured) return true;
  try {
    // Try to create (will 409 if exists — that's fine)
    await httpPost(`${VECTOR_DB_URL}/api/collections`, { name: COLLECTION_NAME, dimension: EMBED_DIM, metric: 'cosine' }, { timeoutMs: 3000 });
    _collectionEnsured = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a searchable text representation of an asset.
 * Combines name + description + tags + category + publisher for best recall.
 */
function assetToText(asset) {
  const parts = [
    asset.name,
    asset.description,
    Array.isArray(asset.tags) ? asset.tags.join(' ') : '',
    asset.category,
    asset.publisher,
  ].filter(Boolean);
  return parts.join(' ').slice(0, 2000);
}

/**
 * Index an asset for semantic search.
 * Computes the embedding and upserts into the collection.
 * Returns { id } on success, null on failure.
 */
export async function indexAsset(asset) {
  if (!asset || !asset.id) return null;
  const text = assetToText(asset);
  const vector = await embed(text);
  if (!vector) return null;
  await ensureCollection();
  try {
    const r = await httpPost(`${VECTOR_DB_URL}/api/collections/${COLLECTION_NAME}/vectors`, {
      id: asset.id,
      values: vector,
      metadata: { name: asset.name, type: asset.assetType, category: asset.category, publisher: asset.publisher },
    }, { timeoutMs: 3000 });
    if (!r.ok) return null;
    return { id: asset.id };
  } catch {
    return null;
  }
}

/**
 * Remove an asset from the vector index.
 * Best-effort — does not throw.
 */
export async function removeAsset(id) {
  if (!id) return false;
  try {
    const r = await httpDelete(`${VECTOR_DB_URL}/api/collections/${COLLECTION_NAME}/vectors/${encodeURIComponent(id)}`, { timeoutMs: 2000 });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Query for the top-k most similar assets to the given text.
 * Returns [{ id, score }] on success, null on failure (caller falls back to keyword).
 */
export async function query(text, k = 10) {
  if (!text || typeof text !== 'string') return null;
  const vector = await embed(text);
  if (!vector) return null;
  await ensureCollection();
  try {
    const r = await httpPost(`${VECTOR_DB_URL}/api/collections/${COLLECTION_NAME}/vectors/query`, {
      values: vector, topK: k,
    }, { timeoutMs: 3000 });
    if (!r.ok) return null;
    // vector-db returns { results: [{ id, score, metadata }] } or similar
    const results = r.data?.results || r.data?.matches || r.data?.vectors || [];
    return results.map((m) => ({ id: m.id, score: m.score }));
  } catch {
    return null;
  }
}

/**
 * Health probe — true if vector-db is reachable.
 */
export async function healthy() {
  try {
    const r = await httpGet(`${VECTOR_DB_URL}/health`, { timeoutMs: 1500 });
    return r.ok;
  } catch {
    return false;
  }
}

export const config = {
  VECTOR_DB_URL,
  COLLECTION_NAME,
  EMBED_DIM,
};
