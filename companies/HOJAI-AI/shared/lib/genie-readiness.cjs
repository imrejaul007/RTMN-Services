/**
 * RTMN Genie Readiness - CJS mirror
 *
 * CJS mirror of lib/genie-readiness.js. Auto-loaded by Node when a CJS file
 * does `require('@rtmn/shared/lib/genie-readiness')` thanks to the package.json
 * `exports` condition map.
 *
 * Keep this file in sync with lib/genie-readiness.js.
 */

const STUB_MODE = process.env.INFERENCE_STUB_MODE === 'true';
const INFERENCE_GATEWAY_URL =
  process.env.INFERENCE_GATEWAY_URL || 'http://localhost:4746';

async function isLLMAvailable() {
  if (STUB_MODE) return false;
  try {
    const r = await fetch(`${INFERENCE_GATEWAY_URL}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Lightweight check — avoid pulling Mongoose here so this module is safe
// to load before the service chooses its DB backend.
function isConnectedDB() {
  // If the service has explicitly set MONGODB_URI and connected, mongoose
  // would expose it; we don't introspect here, so we report `false` (i.e.
  // "in-memory mode"). This is intentional — readiness is about *reachability*
  // of the LLM and DB; in-memory mode is still a valid degraded mode.
  if (!process.env.MONGODB_URI) return false;
  // If MONGODB_URI is set, assume connected (caller may have validated already)
  return process.env.MONGODB_CONNECTED === 'true';
}

function installReadinessRoutes(app, opts = {}) {
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

function autoSeed(plans, opts = {}) {
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

function normalizeSeedData(items) {
  const now = new Date().toISOString();
  return items.map((item, i) => ({
    id: item.id || `seed-${i + 1}`,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
    ...item,
  }));
}

module.exports = {
  installReadinessRoutes,
  autoSeed,
  normalizeSeedData,
  isLLMAvailable,
  isConnectedDB,
};