/**
 * MemoryOS Embedding Client
 *
 * Thin HTTP client to the Vector DB (port 4780) for embeddings and
 * vector-similarity search.
 *
 *   - embed(text) -> number[]
 *   - upsert(collection, id, values, metadata, document)
 *   - search(collection, values, topK, filter)
 *   - searchByText(collection, text, topK, filter)
 *   - ensureCollection(name, dimension, metric)
 *
 * If VECTOR_DB_URL is unreachable, every method returns null/undefined
 * and the caller falls back to keyword search.
 */

const VECTOR_DB_URL = process.env.VECTOR_DB_URL || 'http://localhost:4780';
const COLLECTION = process.env.MEMORY_VECTOR_COLLECTION || 'memory-os-embeddings';
const DIM = Number(process.env.MEMORY_VECTOR_DIM || 128);
const METRIC = process.env.MEMORY_VECTOR_METRIC || 'cosine';

const TIMEOUT_MS = 2000;

let collectionReady = false;
let collectionReadyAttempted = false;

async function fetchJson(path, body, method = 'POST') {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${VECTOR_DB_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function ensureCollection() {
  if (collectionReady || collectionReadyAttempted) return collectionReady;
  collectionReadyAttempted = true;
  // Try to create; if exists, that's fine
  const r = await fetchJson('/api/collections', { name: COLLECTION, dimension: DIM, metric: METRIC });
  if (r) {
    collectionReady = true;
    return true;
  }
  // Check if it already exists
  const get = await fetchJson(`/api/collections/${COLLECTION}`, null, 'GET');
  if (get && get.name === COLLECTION) {
    collectionReady = true;
    return true;
  }
  return false;
}

async function embed(text) {
  if (!text) return null;
  const r = await fetchJson('/api/embed', { text, dim: DIM });
  if (!r || !r.vector) return null;
  return r.vector;
}

async function upsert({ id, values, metadata = {}, document = '' }) {
  if (!id || !values) return null;
  await ensureCollection();
  return fetchJson(`/api/collections/${COLLECTION}/vectors`, {
    id,
    values,
    metadata,
    document,
  });
}

async function search({ values, topK = 10, filter = null }) {
  if (!values) return null;
  await ensureCollection();
  const body = { values, topK };
  if (filter) body.filter = filter;
  return fetchJson(`/api/collections/${COLLECTION}/search`, body);
}

async function searchByText({ text, topK = 10, filter = null }) {
  if (!text) return null;
  await ensureCollection();
  const body = { text, topK, dim: DIM };
  if (filter) body.filter = filter;
  return fetchJson(`/api/collections/${COLLECTION}/search-by-text`, body);
}

export default {
  VECTOR_DB_URL,
  COLLECTION,
  DIM,
  embed,
  upsert,
  search,
  searchByText,
  ensureCollection,
};
