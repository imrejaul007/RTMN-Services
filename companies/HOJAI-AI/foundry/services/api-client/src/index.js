/**
 * HOJAI Studio - API Client Service
 * Built-in API debugger - test APIs without leaving the studio
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

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
const PORT = 4740;
app.use(express.json());

const collections = new Map(); // collectionId -> { name, requests, folders }
const histories = []; // recent requests
const environments = new Map(); // envId -> { name, variables }

// REST API - Collections
app.post('/api/collections', requireInternal, (req, res) => {
  const { name, description } = req.body;
  const id = uuidv4();
  collections.set(id, { id, name, description, requests: [], folders: [], createdAt: new Date().toISOString() });
  res.json(collections.get(id));
});

app.get('/api/collections', (req, res) => res.json(Array.from(collections.values())));

app.get('/api/collections/:id', (req, res) => {
  const col = collections.get(req.params.id);
  if (!col) return res.status(404).json({ error: 'Not found' });
  res.json(col);
});

app.post('/api/collections/:id/requests', requireInternal, (req, res) => {
  const col = collections.get(req.params.id);
  if (!col) return res.status(404).json({ error: 'Not found' });
  const { name, method, url, headers, body, params } = req.body;
  const request = { id: uuidv4(), name, method: method || 'GET', url, headers: headers || {}, body, params: params || {} };
  col.requests.push(request);
  res.json(request);
});

// REST API - Request Execution
app.post('/api/execute', requireInternal, async (req, res) => {
  const { method = 'GET', url, headers = {}, body, params = {} } = req.body;

  // Build URL with params
  let fullUrl = url;
  if (Object.keys(params).length) {
    const qs = new URLSearchParams(params).toString();
    fullUrl += (url.includes('?') ? '&' : '?') + qs;
  }

  // Build headers
  const reqHeaders = {};
  headers && Object.entries(headers).forEach(([k, v]) => { if (v) reqHeaders[k] = v; });

  const result = {
    id: uuidv4(),
    request: { method, url: fullUrl, headers: reqHeaders, body },
    response: null,
    timing: { total: 0 },
    status: 'pending',
    executedAt: new Date().toISOString()
  };

  // Simulate request (in production, use node-fetch or similar)
  const start = Date.now();
  await new Promise(r => setTimeout(r, 50 + Math.random() * 200));
  result.timing.total = Date.now() - start;
  result.status = Math.random() > 0.1 ? 'success' : 'error';
  result.response = {
    status: result.status === 'success' ? 200 : 500,
    statusText: result.status === 'success' ? 'OK' : 'Internal Server Error',
    headers: { 'content-type': 'application/json' },
    body: result.status === 'success' ? { success: true, data: { message: 'API response' } } : { error: 'Server error' }
  };

  histories.push(result);
  if (histories.length > 100) histories.shift();
  res.json(result);
});

// REST API - History
app.get('/api/history', (req, res) => {
  const { limit = 50 } = req.query;
  res.json(histories.slice(-parseInt(limit)));
});

// REST API - Environments
app.post('/api/environments', requireInternal, (req, res) => {
  const { name, variables = {} } = req.body;
  const id = uuidv4();
  environments.set(id, { id, name, variables, createdAt: new Date().toISOString() });
  res.json(environments.get(id));
});

app.get('/api/environments', (req, res) => res.json(Array.from(environments.values())));

app.get('/api/environments/:id', (req, res) => {
  const env = environments.get(req.params.id);
  if (!env) return res.status(404).json({ error: 'Not found' });
  res.json(env);
});

app.patch('/api/environments/:id', requireInternal, (req, res) => {
  const env = environments.get(req.params.id);
  if (!env) return res.status(404).json({ error: 'Not found' });
  Object.assign(env, req.body);
  res.json(env);
});

// REST API - Code Generation
app.post('/api/code', requireInternal, (req, res) => {
  const { language = 'javascript', request } = req.body;
  const { method, url, headers, body } = request || {};

  const code = {
    javascript: `const response = await fetch('${url}', {
  method: '${method || 'GET'}',
  headers: ${JSON.stringify(headers || {}, null, 2)},
  body: ${body ? JSON.stringify(body, null, 2) : 'undefined'}
});
const data = await response.json();`,
    python: `import requests
response = requests.${(method || 'GET').toLowerCase()}(
  '${url}',
  headers=${JSON.stringify(headers || {}, null, 2)}${body ? `,\n  json=${JSON.stringify(body, null, 2)}` : ''}
)
data = response.json()`,
    curl: `curl -X ${method || 'GET'} '${url}'${Object.entries(headers || {}).map(([k,v]) => ` \\\n  -H '${k}: ${v}'`).join('')}${body ? ` \\\n  -d '${JSON.stringify(body)}'` : ''}`
  };

  res.json({ language, code: code[language] || code.javascript });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'api-client', collections: collections.size }));
app.listen(PORT, () => console.log(`API Client running on port ${PORT}`));
