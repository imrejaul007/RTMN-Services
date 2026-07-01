/**
 * Documentation OS - Auto-Generated Documentation
 * Port: 5276
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5276;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// In-memory stores
const documents = new Map();
const apis = new Map();
const changelogs = new Map();

// Health
app.get('/health', (_, res) => res.json({
  status: 'healthy',
  service: 'documentation-os',
  version: '1.0.0',
  port: PORT,
  capabilities: ['auto_documentation', 'api_docs', 'changelog_generation', 'doc_sync']
}));

// Document Routes
app.post('/api/documents', (req, res) => {
  const { title, content, type, service, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const doc = {
    id: `doc-${uuidv4().slice(0, 8)}`,
    title,
    content: content || '',
    type: type || 'general',
    service: service || null,
    tags: tags || [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  documents.set(doc.id, doc);
  res.status(201).json(doc);
});

app.get('/api/documents', (req, res) => {
  let list = Array.from(documents.values());
  if (req.query.type) list = list.filter(d => d.type === req.query.type);
  if (req.query.service) list = list.filter(d => d.service === req.query.service);
  if (req.query.tag) list = list.filter(d => d.tags.includes(req.query.tag));
  res.json({ count: list.length, documents: list });
});

app.get('/api/documents/:id', (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

app.put('/api/documents/:id', (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  if (req.body.content && req.body.content !== doc.content) {
    doc.version++;
  }

  Object.assign(doc, req.body);
  doc.updatedAt = new Date().toISOString();
  documents.set(doc.id, doc);
  res.json(doc);
});

// API Documentation Routes
app.post('/api/apis', (req, res) => {
  const { name, version, endpoints, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const api = {
    id: `api-${uuidv4().slice(0, 8)}`,
    name,
    version: version || '1.0.0',
    description: description || '',
    endpoints: endpoints || [],
    schemas: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  apis.set(api.id, api);
  res.status(201).json(api);
});

app.get('/api/apis', (req, res) => {
  res.json({ count: apis.size, apis: Array.from(apis.values()) });
});

app.get('/api/apis/:id', (req, res) => {
  const api = apis.get(req.params.id);
  if (!api) return res.status(404).json({ error: 'Not found' });
  res.json(api);
});

app.post('/api/apis/:id/endpoints', (req, res) => {
  const api = apis.get(req.params.id);
  if (!api) return res.status(404).json({ error: 'API not found' });

  const { method, path, summary, description, parameters, responses } = req.body;
  if (!method || !path) {
    return res.status(400).json({ error: 'method and path required' });
  }

  const endpoint = {
    id: `ep-${uuidv4().slice(0, 8)}`,
    method: method.toUpperCase(),
    path,
    summary: summary || '',
    description: description || '',
    parameters: parameters || [],
    responses: responses || {}
  };

  api.endpoints.push(endpoint);
  api.updatedAt = new Date().toISOString();
  apis.set(api.id, api);
  res.json(endpoint);
});

// Generate OpenAPI from endpoints
app.get('/api/apis/:id/openapi', (req, res) => {
  const api = apis.get(req.params.id);
  if (!api) return res.status(404).json({ error: 'Not found' });

  const openapi = {
    openapi: '3.0.0',
    info: {
      title: api.name,
      version: api.version,
      description: api.description
    },
    paths: {}
  };

  api.endpoints.forEach(ep => {
    if (!openapi.paths[ep.path]) {
      openapi.paths[ep.path] = {};
    }
    openapi.paths[ep.path][ep.method.toLowerCase()] = {
      summary: ep.summary,
      description: ep.description,
      parameters: ep.parameters,
      responses: ep.responses
    };
  });

  res.json(openapi);
});

// Changelog Routes
app.post('/api/changelogs', (req, res) => {
  const { service, version, changes, author } = req.body;
  if (!service || !version) {
    return res.status(400).json({ error: 'service and version required' });
  }

  const changelog = {
    id: `cl-${uuidv4().slice(0, 8)}`,
    service,
    version,
    changes: changes || [],
    author: author || null,
    createdAt: new Date().toISOString()
  };

  changelogs.set(changelog.id, changelog);
  res.status(201).json(changelog);
});

app.get('/api/changelogs', (req, res) => {
  let list = Array.from(changelogs.values());
  if (req.query.service) list = list.filter(c => c.service === req.query.service);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ count: list.length, changelogs: list });
});

app.post('/api/changelogs/:id/entries', (req, res) => {
  const changelog = changelogs.get(req.params.id);
  if (!changelog) return res.status(404).json({ error: 'Not found' });

  const { type, description, breaking } = req.body;
  if (!type || !description) {
    return res.status(400).json({ error: 'type and description required' });
  }

  const entry = {
    id: `entry-${uuidv4().slice(0, 8)}`,
    type,
    description,
    breaking: breaking || false,
    createdAt: new Date().toISOString()
  };

  changelog.changes.push(entry);
  changelogs.set(changelog.id, changelog);
  res.json(entry);
});

// Auto-generate documentation from code
app.post('/api/generate', (req, res) => {
  const { code, language, type } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  // Simple doc generation
  const docs = {
    functions: [],
    classes: [],
    exports: []
  };

  // Extract function definitions
  const funcRegex = /(?:function|const|let|var)\s+(\w+)\s*[=\(]/g;
  let match;
  while ((match = funcRegex.exec(code)) !== null) {
    docs.functions.push({
      name: match[1],
      description: `Auto-generated description for ${match[1]}`
    });
  }

  // Extract class definitions
  const classRegex = /class\s+(\w+)/g;
  while ((match = classRegex.exec(code)) !== null) {
    docs.classes.push({
      name: match[1],
      description: `Auto-generated description for class ${match[1]}`
    });
  }

  res.json({
    generated: true,
    language: language || 'javascript',
    type: type || 'general',
    documentation: docs,
    createdAt: new Date().toISOString()
  });
});

// Statistics
app.get('/api/stats', (_, res) => {
  res.json({
    documents: documents.size,
    apis: apis.size,
    changelogs: changelogs.size
  });
});

app.listen(PORT, () => {
  console.log(`[DocumentationOS] Documentation OS running on port ${PORT}`);
  console.log('Capabilities: Auto-Documentation, API Docs, Changelog Generation');
});
