import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { createAuthMiddleware } from '@rtmn/shared/auth';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const PORT = parseInt(process.env.NEXHA_CLIENT_PORT || '8100', 10);
const NEXHA_URL = process.env.NEXHA_URL || 'http://localhost:8000';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "2mb" }));

// Thin clients only forward to upstream. Auth is enforced by the upstream.
// Use {required:false} so /health, /health/ready, and the e2e test path
// don't get blocked at the proxy layer.
const optionalAuth = createAuthMiddleware({ required: false });
app.use(optionalAuth);
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'nexha-client',
      status: 'healthy',
      proxyTarget: NEXHA_URL,
      version: '1.0.0',
    },
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    const r = await axios.get(`${NEXHA_URL}/health`, { timeout: 3000 });
    res.json({ success: true, data: { upstream: r.data, status: 'ready' } });
  } catch (err) {
    res.status(503).json({ success: false, error: { code: 'UPSTREAM_DOWN', message: `Cannot reach ${NEXHA_URL}` } });
  }
});

app.use('/api/:product', async (req, res) => {
  try {
    const restPath = req.url; const targetUrl = `${NEXHA_URL}/api${restPath}`;
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'content-type': 'application/json',
        ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        ...(req.headers['x-internal-token'] ? { 'x-internal-token': req.headers['x-internal-token'] } : {}),
      },
      timeout: 15000,
      validateStatus: () => true,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: `Failed to reach ${NEXHA_URL}: ${err.message}` },
    });
  }
});

if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


  const server = app.listen(PORT, () => console.log(`[nexha-client] listening on :${PORT}, proxying to ${NEXHA_URL}`));
  installGracefulShutdown(server);
}
export { app };
