import express from 'express';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireEnv } from '@rtmn/shared/lib/env';
import { createAuthMiddleware } from '@rtmn/shared/auth';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = parseInt(process.env.WEB_PORT || '3000', 10);

// genie-os Genie (this repo's runtime/genie)
const GENIE_URL = process.env.GENIE_URL || 'http://localhost:7100';

// Thin client proxies (this repo forwards to external repos)
const DO_CLIENT_URL = process.env.DO_CLIENT_URL || 'http://localhost:8090';
const NEXHA_CLIENT_URL = process.env.NEXHA_CLIENT_URL || 'http://localhost:8190';
const SALAR_CLIENT_URL = process.env.SALAR_CLIENT_URL || 'http://localhost:8290';

// 23 specialized Genie services (siblings in the parent folder).
// When running, these power the Genie runtime's intent delegation.
// Web exposes them under /api/specialists/<name>/* so the UI can talk to them
// directly. If they're not running, the request returns 502 from the proxy.
const SPECIALISTS = {
  gateway:              process.env.GENIE_GATEWAY_URL        || 'http://localhost:4701',
  briefing:             process.env.GENIE_BRIEFING_URL       || 'http://localhost:4712',
  calendar:             process.env.GENIE_CALENDAR_URL       || 'http://localhost:4709',
  companion:            process.env.GENIE_COMPANION_URL      || 'http://localhost:4716',
  consultant:           process.env.GENIE_CONSULTANT_URL     || 'http://localhost:4820',
  creation:             process.env.GENIE_CREATION_URL       || 'http://localhost:4725',
  device:               process.env.GENIE_DEVICE_URL         || 'http://localhost:4769',
  execution:            process.env.GENIE_EXECUTION_URL      || 'http://localhost:4726',
  learning:             process.env.GENIE_LEARNING_URL       || 'http://localhost:4722',
  lifegps:              process.env.GENIE_LIFEGPS_URL        || 'http://localhost:4721',
  lifeuni:              process.env.GENIE_LIFEUNI_URL        || 'http://localhost:4727',
  listening:            process.env.GENIE_LISTENING_URL      || 'http://localhost:4768',
  memorygraph:          process.env.GENIE_MEMORYGRAPH_URL    || 'http://localhost:4717',
  memoryinbox:          process.env.GENIE_MEMORYINBOX_URL    || 'http://localhost:4810',
  money:                process.env.GENIE_MONEY_URL          || 'http://localhost:4724',
  relationship:         process.env.GENIE_RELATIONSHIP_URL   || 'http://localhost:4718',
  serendipity:          process.env.GENIE_SERENDIPITY_URL    || 'http://localhost:4714',
  shopping:             process.env.GENIE_SHOPPING_URL       || 'http://localhost:4728',
  forgetting:           process.env.GENIE_FORGETTING_URL     || 'http://localhost:4715',
  thinking:             process.env.GENIE_THINKING_URL       || 'http://localhost:4719',
  search:               process.env.GENIE_SEARCH_URL         || 'http://localhost:4713',
  wakeword:             process.env.GENIE_WAKEWORD_URL       || 'http://localhost:4767',
  wellness:             process.env.GENIE_WELLNESS_URL       || 'http://localhost:4723',
};

const app = express();
app.use(express.json());

// The web super-app is a PUBLIC entry point — anyone can browse without a
// token. Specific routes can still require auth if needed (e.g. /api/ask
// inside the genie runtime enforces Bearer auth). We use
// {required:false} so this middleware just attaches req.auth if a valid
// token/header is present, but never blocks.
const optionalAuth = createAuthMiddleware({ required: false });
app.use(optionalAuth);
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Single proxy handler. Routes based on the path prefix:
 *   /api/do/*       → do-client       (which forwards to companies/do-app)
 *   /api/nexha/*    → nexha-client    (which forwards to companies/Nexha)
 *   /api/salar/*    → salar-client    (which forwards to HOJAI-AI/salar)
 *   /api/*          → genie-os Genie  (this repo's runtime/genie)
 *
 * We use req.originalUrl (not req.url) so the full path is forwarded
 * without Express's mount-point prefix-stripping.
 */
async function proxy(req, res, target, label) {
  try {
    const r = await axios({
      method: req.method,
      url: `${target}${req.originalUrl}`,
      data: req.body,
      headers: { ...req.headers, host: undefined },
      validateStatus: () => true,
      timeout: 30000,
    });
    res.status(r.status).json(r.data);
  } catch (e) {
    res.status(502).json({
      success: false,
      error: {
        code: 'PROXY_ERROR',
        message: `Cannot reach ${label}: ${e.message}`,
      },
    });
  }
}

function route(pathPrefix, target, label) {
  return (req, res, next) => {
    if (req.originalUrl.startsWith(pathPrefix)) {
      return proxy(req, res, target, label);
    }
    next();
  };
}

// Health of the whole connected ecosystem — must be registered BEFORE the
// catch-all /api/ proxy, otherwise the catch-all intercepts /api/health.
app.get('/api/health', async (req, res) => {
  const targets = [
    { name: 'genie-os (runtime)', url: GENIE_URL },
    { name: 'do-client', url: DO_CLIENT_URL },
    { name: 'nexha-client', url: NEXHA_CLIENT_URL },
    { name: 'salar-client', url: SALAR_CLIENT_URL },
    ...Object.entries(SPECIALISTS).map(([k, v]) => ({ name: `genie-${k}`, url: v })),
  ];
  const services = {};
  for (const t of targets) {
    try {
      const r = await axios.get(`${t.url}/health`, { timeout: 1500 });
      services[t.name] = r.data;
    } catch {
      services[t.name] = { status: 'down' };
    }
  }
  const up = Object.values(services).filter(s => s && s.status !== 'down').length;
  res.json({ success: true, data: { services, summary: { up, total: targets.length }, timestamp: new Date().toISOString() } });
});

// Order matters: most specific first
// Specialist routes — /api/specialists/<key>/<rest> → http://localhost:<port>/<rest>
for (const [key, url] of Object.entries(SPECIALISTS)) {
  app.use(`/api/specialists/${key}/`, async (req, res) => {
    // Strip the /api/specialists/<key> prefix so the upstream sees the rest of the path.
    // We pass req directly — proxy() uses req.originalUrl, so we mutate it.
    const prefix = `/api/specialists/${key}`;
    const restPath = req.originalUrl.slice(prefix.length) || '/';
    const newReq = Object.create(req);
    newReq.originalUrl = restPath;
    newReq.url = restPath;
    return proxy(newReq, res, url, `genie-${key}`);
  });
}

app.use(route('/api/do/', DO_CLIENT_URL, 'do-client → companies/do-app'));
app.use(route('/api/nexha/', NEXHA_CLIENT_URL, 'nexha-client → companies/Nexha'));
app.use(route('/api/salar/', SALAR_CLIENT_URL, 'salar-client → HOJAI-AI/salar'));
app.use('/api/', (req, res) => proxy(req, res, GENIE_URL, 'genie-os genie'));

// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => console.log(`[web] listening on :${PORT}`));
installGracefulShutdown(server);
