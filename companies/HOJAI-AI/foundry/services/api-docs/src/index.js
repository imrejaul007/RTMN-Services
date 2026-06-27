/**
 * HOJAI Studio - API Docs Service
 * Auto-generate beautiful API documentation
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

const PORT = 4766;
app.use(express.json());

const docs = new Map(); // projectId -> API docs

// REST API - Generate Docs
app.post('/api/generate', requireInternal, (req, res) => {
  const { projectId, name, routes } = req.body;
  const projectDocs = {
    id: uuidv4(),
    projectId,
    name,
    version: '1.0.0',
    baseUrl: `https://api.${projectId}.com`,
    routes: routes || [],
    schemas: generateSchemas(routes || []),
    generatedAt: new Date().toISOString()
  };
  docs.set(projectId, projectDocs);
  res.json(projectDocs);
});

// REST API - Get Docs
app.get('/api/docs/:projectId', (req, res) => {
  const doc = docs.get(req.params.projectId);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// REST API - Export
app.get('/api/docs/:projectId/export', (req, res) => {
  const { format = 'json' } = req.query;
  const doc = docs.get(req.params.projectId);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  if (format === 'openapi') {
    res.json(generateOpenAPI(doc));
  } else if (format === 'html') {
    res.set('Content-Type', 'text/html');
    res.send(generateHTML(doc));
  } else {
    res.json(doc);
  }
});

// REST API - Add Endpoint
app.post('/api/docs/:projectId/endpoints', requireInternal, (req, res) => {
  const doc = docs.get(req.params.projectId);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const endpoint = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  doc.routes.push(endpoint);
  res.json(endpoint);
});

function generateSchemas(routes) {
  const schemas = {};
  routes.forEach(r => {
    if (r.requestBody) {
      schemas[r.requestBody.name || r.path] = r.requestBody.schema || {};
    }
  });
  return schemas;
}

function generateOpenAPI(doc) {
  return {
    openapi: '3.0.0',
    info: { title: doc.name, version: doc.version },
    servers: [{ url: doc.baseUrl }],
    paths: doc.routes.reduce((acc, route) => {
      acc[route.path] = { [route.method.toLowerCase()]: { summary: route.summary, responses: route.responses } };
      return acc;
    }, {})
  };
}

function generateHTML(doc) {
  return `<!DOCTYPE html><html><head><title>${doc.name}</title>
  <style>body{font-family:Arial;max-width:900px;margin:0 auto;padding:20px}
  .endpoint{margin:20px 0;padding:15px;border:1px solid #ddd;border-radius:8px}
  .method{${doc.version==='1.0.0'?'background:#61affe':'background:#49cc90'};color:white;padding:3px 8px;border-radius:3px}</style>
  </head><body><h1>${doc.name}</h1>
  ${doc.routes.map(r => `<div class="endpoint">
  <span class="method">${r.method}</span> <strong>${r.path}</strong>
  <p>${r.summary || ''}</p></div>`).join('')}
  </body></html>`;
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'api-docs', docs: docs.size }));
app.listen(PORT, () => console.log(`API Docs running on port ${PORT}`));
