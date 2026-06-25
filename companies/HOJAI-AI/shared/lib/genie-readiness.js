/**
 * @rtmn/shared/lib/genie-readiness
 *
 * One-call production-readiness pass for Genie specialists.
 * Adds:
 *   - /api/llm-health  (verifies LLM helper is reachable)
 *   - /api/db-health   (verifies MongoDB connection state)
 *   - /api/readiness   (combined ready check, used by orchestrator)
 *   - autoSeed()       (idempotent seed function that fills PersistentMap with demo data)
 *
 * Usage in any specialist:
 *   import { installReadinessRoutes, autoSeed } from '@rtmn/shared/lib/genie-readiness';
 *
 *   // After all routes are registered:
 *   installReadinessRoutes(app, { serviceName: 'genie-wellness-os' });
 *
 *   // At startup, after PersistentMaps are created:
 *   const seeded = await autoSeed(stores, seedData, { serviceName: 'genie-wellness-os' });
 *   if (seeded) console.log('[seed] Initialized demo data');
 */

import { isLLMAvailable } from './llm.js';
import { isConnectedDB } from './database.js';

/**
 * Install /api/llm-health, /api/db-health, /api/readiness routes.
 * Call this AFTER all specialist routes are registered so the catch-all
 * doesn't intercept these.
 */
export function installReadinessRoutes(app, opts = {}) {
  const { serviceName = 'genie-service' } = opts;

  app.get('/api/llm-health', async (_req, res) => {
    const available = await isLLMAvailable();
    res.json({
      success: true,
      data: {
        service: serviceName,
        llm_available: available,
        stub_mode: process.env.INFERENCE_STUB_MODE === 'true',
        gateway_url: process.env.INFERENCE_GATEWAY_URL || 'http://localhost:4746',
        default_model: process.env.LLM_DEFAULT_MODEL || 'claude-3-haiku',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.get('/api/db-health', async (_req, res) => {
    const connected = isConnectedDB();
    res.json({
      success: true,
      data: {
        service: serviceName,
        mongo_connected: connected,
        mongo_uri_set: !!process.env.MONGODB_URI,
        mode: connected ? 'mongodb' : 'in-memory',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.get('/api/readiness', async (_req, res) => {
    const llmAvailable = await isLLMAvailable();
    const mongoConnected = isConnectedDB();
    const ready = true; // Service is up; degraded modes are fine.
    res.json({
      success: true,
      data: {
        service: serviceName,
        ready,
        llm_available: llmAvailable,
        mongo_connected: mongoConnected,
        degraded: !llmAvailable || !mongoConnected,
        timestamp: new Date().toISOString(),
      },
    });
  });
}

/**
 * Idempotent seed function. Fills PersistentMap stores with demo data
 * ONLY if the store is empty. Returns true if seeding happened, false if
 * the store was already populated.
 *
 * @param {Array<{store: object, items: Array, key?: string}>} plans
 * @param {object} opts
 * @param {string} opts.serviceName - for logging
 * @returns {boolean} true if seeding happened
 */
export function autoSeed(plans, opts = {}) {
  const { serviceName = 'genie-service' } = opts;
  let seeded = 0;
  let skipped = 0;
  for (const plan of plans) {
    const { store, items, key = 'id' } = plan;
    if (!store || !Array.isArray(items)) continue;
    if (store.size > 0) {
      skipped += items.length;
      continue;
    }
    for (const item of items) {
      const k = item[key];
      if (k != null) store.set(k, item);
    }
    seeded += items.length;
  }
  if (seeded > 0) {
    console.log(`[${serviceName}] seed: inserted ${seeded} items (skipped ${skipped} already-present)`);
    return true;
  }
  return false;
}

/**
 * Build a seed dataset from an array of plain objects, ensuring each has
 * an `id`, `createdAt`, and `updatedAt` if missing. Useful for quickly
 * converting user-provided demo data into seed-ready form.
 */
export function normalizeSeedData(items) {
  const now = new Date().toISOString();
  return items.map((item, i) => ({
    id: item.id || `seed-${i + 1}`,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
    ...item,
  }));
}