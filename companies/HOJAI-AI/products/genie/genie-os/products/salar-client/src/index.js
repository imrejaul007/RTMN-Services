import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { createAuthMiddleware } from '@rtmn/shared/auth';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const PORT = parseInt(process.env.SALAR_CLIENT_PORT || '8290', 10);
const SALAR_URL = process.env.SALAR_URL || 'http://localhost:8200';

const app = express();

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
      service: 'salar-client',
      status: 'healthy',
      proxyTarget: SALAR_URL,
      version: '1.0.0',
    },
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    const r = await axios.get(`${SALAR_URL}/health`, { timeout: 3000 });
    res.json({ success: true, data: { upstream: r.data, status: 'ready' } });
  } catch (err) {
    res.status(503).json({ success: false, error: { code: 'UPSTREAM_DOWN', message: `Cannot reach ${SALAR_URL}` } });
  }
});

app.use('/api/:product', async (req, res) => {
  try {
    const restPath = req.url; const targetUrl = `${SALAR_URL}/api${restPath}`;
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
      error: { code: 'PROXY_ERROR', message: `Failed to reach ${SALAR_URL}: ${err.message}` },
    });
  }
});

// Only auto-listen if not in test mode (test imports the app and binds its own port)
if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


  const server = app.listen(PORT, () => console.log(`[salar-client] listening on :${PORT}, proxying to ${SALAR_URL}`));
  installGracefulShutdown(server);
}
export { app };
