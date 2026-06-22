import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { createAuthMiddleware } from '@rtmn/shared/auth';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const PORT = parseInt(process.env.DO_CLIENT_PORT || '8000', 10);
const DO_BACKEND_URL = process.env.DO_BACKEND_URL || 'http://localhost:3001';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// Thin clients only forward to upstream. Auth is enforced by the upstream
// (e.g. DO app). We use {required:false} so /health, /health/ready, and
// the e2e test path don't get blocked at the proxy layer.
const optionalAuth = createAuthMiddleware({ required: false });
app.use(optionalAuth);
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Health endpoint for the client itself
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'do-client',
      status: 'healthy',
      proxyTarget: DO_BACKEND_URL,
      version: '1.0.0',
    },
  });
});

// Verify the upstream DO app is reachable
app.get('/health/ready', async (req, res) => {
  try {
    const r = await axios.get(`${DO_BACKEND_URL}/health`, { timeout: 3000 });
    res.json({ success: true, data: { upstream: r.data, status: 'ready' } });
  } catch (err) {
    res.status(503).json({ success: false, error: { code: 'UPSTREAM_DOWN', message: `Cannot reach ${DO_BACKEND_URL}` } });
  }
});

// Proxy all /api/* requests to the real DO backend.
// We need to add /api back since Express stripped it from req.url,
// and also strip the first path segment (the product key like /do).
app.use('/api/:product', async (req, res) => {
  try {
    // Forward everything after /api/<product>/ as /api/* to upstream
    const restPath = req.url; // e.g. "/auth/signup"
    const targetUrl = `${DO_BACKEND_URL}/api${restPath}`;
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
      error: { code: 'PROXY_ERROR', message: `Failed to reach ${DO_BACKEND_URL}: ${err.message}` },
    });
  }
});

if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


  const server = app.listen(PORT, () => console.log(`[do-client] listening on :${PORT}, proxying to ${DO_BACKEND_URL}`));
  installGracefulShutdown(server);
}
export { app };
