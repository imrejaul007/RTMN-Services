/**
 * HOJAI Developer Portal API
 * Port: 4450
 *
 * Serves interactive API documentation and SDK examples.
 * The actual docs are served as static HTML from /docs/*
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateOpenAPISpec, getAllEndpoints, QUICKSTARTS, SDK_EXAMPLES } from './openapi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4450;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve static docs
app.use('/static', express.static(path.join(__dirname, 'static')));

// API Explorer state
const apiExplorerState = new Map();

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'developer-portal', version: '1.0.0', timestamp: new Date().toISOString() });
});

// API Info
app.get('/api/v1', (req, res) => {
  const endpoints = getAllEndpoints();
  res.json({
    service: 'HOJAI Developer Portal API',
    version: '1.0.0',
    description: 'Docs, API explorer, and SDK examples for HOJAI Cloud',
    endpoints: {
      'GET /api/v1/services': 'List all services',
      'GET /api/v1/services/:service/openapi': 'Get OpenAPI spec',
      'GET /api/v1/quickstarts': 'Get quickstart guides',
      'GET /api/v1/sdks': 'Get SDK examples',
      'POST /api/v1/explorer/request': 'Make test request',
      'GET /api/v1/explorer/:id': 'Get explorer state'
    }
  });
});

// List all services
app.get('/api/v1/services', (req, res) => {
  const endpoints = getAllEndpoints();
  res.json({ success: true, count: endpoints.length, services: endpoints });
});

// Get OpenAPI spec for a service
app.get('/api/v1/services/:service/openapi', (req, res) => {
  const { service } = req.params;
  const spec = generateOpenAPISpec(service);
  if (!spec) {
    return res.status(404).json({ error: 'Service not found', available: ['hojai-cloud', 'app-store-api', 'cost-tracker', 'secrets-manager', 'voice-studio-api', 'workflow-builder-api'] });
  }
  res.json(spec);
});

// Get quickstarts
app.get('/api/v1/quickstarts', (req, res) => {
  res.json({ success: true, count: QUICKSTARTS.length, quickstarts: QUICKSTARTS });
});

// Get SDK examples
app.get('/api/v1/sdks', (req, res) => {
  res.json({ success: true, sdks: SDK_EXAMPLES });
});

// API Explorer - make test request
app.post('/api/v1/explorer/request', async (req, res) => {
  const { service, method, path, body, headers } = req.body;

  if (!service || !method || !path) {
    return res.status(400).json({ error: 'service, method, and path are required' });
  }

  // Map service to port
  const portMap = {
    'hojai-cloud': 4380,
    'app-store-api': 4400,
    'cost-tracker': 4410,
    'secrets-manager': 4420,
    'voice-studio-api': 4430,
    'workflow-builder-api': 4440
  };

  const port = portMap[service];
  if (!port) {
    return res.status(404).json({ error: 'Unknown service' });
  }

  try {
    const url = `http://localhost:${port}${path}`;
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();
    res.json({
      success: true,
      status: response.status,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get explorer state
app.get('/api/v1/explorer/:id', (req, res) => {
  const state = apiExplorerState.get(req.params.id);
  if (!state) {
    return res.status(404).json({ error: 'Explorer state not found' });
  }
  res.json({ success: true, state });
});

// Save explorer state
app.post('/api/v1/explorer', (req, res) => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  apiExplorerState.set(id, req.body);
  res.status(201).json({ success: true, id });
});

// HTML Documentation Page
app.get('/docs', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HOJAI Cloud - Developer Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header { padding: 2rem 0; border-bottom: 1px solid #1e293b; margin-bottom: 2rem; }
    h1 { font-size: 2.5rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; color: #f8fafc; }
    h3 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; color: #e2e8f0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }
    .card h3 { margin-top: 0; }
    .card .port { font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.5rem; }
    .card .desc { color: #94a3b8; font-size: 0.9rem; }
    .badge { display: inline-block; background: #3b82f6; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; margin-right: 0.5rem; }
    code { background: #1e293b; padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.875em; color: #a5f3fc; }
    pre { background: #1e293b; padding: 1.5rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; border: 1px solid #334155; }
    pre code { background: none; padding: 0; }
    .endpoints { margin-top: 2rem; }
    .endpoint { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; }
    .method { display: inline-block; font-weight: bold; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-right: 0.75rem; }
    .method.get { background: #22c55e; color: #052e16; }
    .method.post { background: #3b82f6; color: #1e3a5f; }
    .method.patch { background: #f59e0b; color: #451a03; }
    .method.delete { background: #ef4444; color: #450a0a; }
    footer { margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #1e293b; text-align: center; color: #64748b; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>HOJAI Cloud Developer Docs</h1>
      <p style="color: #94a3b8; margin-top: 0.5rem;">The complete API reference for building on HOJAI Cloud</p>
    </header>

    <section>
      <h2>Services</h2>
      <div class="grid">
        <div class="card">
          <div class="port">Port 4380</div>
          <h3>HOJAI Cloud</h3>
          <p class="desc">Deploy target with auto-respawn, SSL, custom domains, preview environments, and rollbacks</p>
        </div>
        <div class="card">
          <div class="port">Port 4400</div>
          <h3>App Store API</h3>
          <p class="desc">Catalog for skills, agents, workflows, templates, and IndustryOS</p>
        </div>
        <div class="card">
          <div class="port">Port 4410</div>
          <h3>Cost Tracker</h3>
          <p class="desc">AI usage metering and billing with budget alerts</p>
        </div>
        <div class="card">
          <div class="port">Port 4420</div>
          <h3>Secrets Manager</h3>
          <p class="desc">Encrypted credential storage with AES-256-GCM and access logging</p>
        </div>
        <div class="card">
          <div class="port">Port 4430</div>
          <h3>Voice Studio API</h3>
          <p class="desc">Voice agent management with STT/TTS providers</p>
        </div>
        <div class="card">
          <div class="port">Port 4440</div>
          <h3>Workflow Builder API</h3>
          <p class="desc">DAG workflow management with 10 node types</p>
        </div>
      </div>
    </section>

    <section>
      <h2>Authentication</h2>
      <p style="color: #94a3b8; margin-bottom: 1rem;">All API requests require a Bearer token in the Authorization header:</p>
      <pre><code>Authorization: Bearer YOUR_API_KEY</code></pre>
      <p style="color: #94a3b8;">For development, you can disable auth by setting <code>HOJAI_CLOUD_REQUIRE_AUTH=false</code></p>
    </section>

    <section class="endpoints">
      <h2>Quick Reference</h2>

      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/v1/deployments</code>
        <span style="color: #94a3b8; margin-left: 1rem;">List all deployments</span>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/v1/deploy</code>
        <span style="color: #94a3b8; margin-left: 1rem;">Deploy a project</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/v1/apps</code>
        <span style="color: #94a3b8; margin-left: 1rem;">List apps in store</span>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/v1/usage</code>
        <span style="color: #94a3b8; margin-left: 1rem;">Track AI usage</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/v1/agents</code>
        <span style="color: #94a3b8; margin-left: 1rem;">List voice agents</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/v1/workflows</code>
        <span style="color: #94a3b8; margin-left: 1rem;">List workflows</span>
      </div>
    </section>

    <section>
      <h2>SDK Examples</h2>

      <h3>Node.js</h3>
      <pre><code>npm install @hojai/cloud

import { HOJAI } from '@hojai/cloud';

const client = new HOJAI({ apiKey: process.env.HOJAI_API_KEY });

// Deploy app
const deployment = await client.deploy({
  name: 'my-app',
  manifest: { name: 'My App' },
  files: { 'apps/backend/src/index.js': '...' }
});

console.log(deployment.url);</code></pre>

      <h3>cURL</h3>
      <pre><code># Deploy
curl -X POST http://localhost:4380/api/v1/deploy \\
  -H 'Authorization: Bearer YOUR_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"name": "my-app", "manifest": {}}'

# Track usage
curl -X POST http://localhost:4410/api/v1/usage \\
  -d '{"userId": "user1", "model": "gpt-4", "inputTokens": 1000}'</code></pre>
    </section>

    <footer>
      <p>HOJAI Cloud &mdash; Build, Deploy, Operate, Monetize AI-native businesses</p>
      <p style="margin-top: 0.5rem;">RTMN Hub: <code>http://localhost:4399</code></p>
    </footer>
  </div>
</body>
</html>`);
});

// Root redirects to docs
app.get('/', (req, res) => {
  res.redirect('/docs');
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     📚 HOJAI DEVELOPER PORTAL — PORT ${PORT}                       ║
║                                                                  ║
║     Interactive API docs and SDK examples                        ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║     GET  /docs               — HTML Documentation              ║
║     GET  /api/v1/services   — List all services               ║
║     GET  /api/v1/services/:s/openapi — OpenAPI spec              ║
║     GET  /api/v1/quickstarts — Quickstart guides               ║
║     GET  /api/v1/sdks       — SDK examples                    ║
║     POST /api/v1/explorer/request — API Explorer (test)       ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
