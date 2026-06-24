// ai-studio-api (4900) — Gateway for AI Studio Platform
// - Service catalog (10 sub-services)
// - Health probes across all 9 backend services
// - HTTP proxy to /projects, /playground, /workflow, /agent, /twin, /rag, /eval, /deployment, /collab
// - Marketplace endpoints (templates, install, publish)

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');

// ---------- Service registry ----------
const SUB_SERVICES = {
  projects:   { name: 'studio-projects',   port: 4901, prefix: '/projects' },
  playground: { name: 'studio-playground', port: 4902, prefix: '/playground' },
  workflow:   { name: 'studio-workflow',   port: 4903, prefix: '/workflow' },
  agent:      { name: 'studio-agent',      port: 4904, prefix: '/agent' },
  twin:       { name: 'studio-twin',       port: 4905, prefix: '/twin' },
  rag:        { name: 'studio-rag',        port: 4906, prefix: '/rag' },
  eval:       { name: 'studio-eval',       port: 4907, prefix: '/eval' },
  deployment: { name: 'studio-deployment', port: 4908, prefix: '/deployment' },
  collab:     { name: 'studio-collab',     port: 4909, prefix: '/collab' },
};

// ---------- Storage (marketplace) ----------
function readData(dataDir) {
  const file = path.join(dataDir, 'studio.json');
  if (!fs.existsSync(file)) {
    const seed = {
      templates: {},          // id -> template
      installed: {},          // id -> install record
    };
    fs.writeFileSync(file, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeData(dataDir, data) {
  const file = path.join(dataDir, 'studio.json');
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// Seed marketplace templates
function seedTemplates(data) {
  if (Object.keys(data.templates).length > 0) return data;
  const seeds = [
    {
      id: 'tpl_chatbot_support',
      name: 'Customer Support Chatbot',
      description: 'RAG-powered support agent with escalation',
      category: 'agent',
      tags: ['support', 'rag', 'chat'],
      author: 'hojai',
      installs: 1240,
      rating: 4.7,
    },
    {
      id: 'tpl_workflow_content',
      name: 'Content Generation Workflow',
      description: 'Multi-step content pipeline with review',
      category: 'workflow',
      tags: ['content', 'review'],
      author: 'hojai',
      installs: 870,
      rating: 4.5,
    },
    {
      id: 'tpl_eval_suite',
      name: 'Standard Eval Suite',
      description: 'Accuracy, latency, and toxicity metrics',
      category: 'eval',
      tags: ['eval', 'metrics'],
      author: 'hojai',
      installs: 530,
      rating: 4.6,
    },
    {
      id: 'tpl_twin_customer',
      name: 'Customer Twin Schema',
      description: 'Profile, LTV, churn segments',
      category: 'twin',
      tags: ['customer', 'ltv'],
      author: 'hojai',
      installs: 410,
      rating: 4.4,
    },
    {
      id: 'tpl_rag_kb',
      name: 'Knowledge Base RAG',
      description: 'Document chunking + BM25 retrieval',
      category: 'rag',
      tags: ['kb', 'documents'],
      author: 'hojai',
      installs: 690,
      rating: 4.5,
    },
  ];
  for (const t of seeds) data.templates[t.id] = { ...t, created_at: new Date().toISOString() };
  return data;
}

// ---------- HTTP proxy ----------
function proxyRequest(targetPort, sourceReq, sourceRes) {
  // Build clean headers for upstream (drop hop-by-hop)
  const fwdHeaders = {};
  for (const [k, v] of Object.entries(sourceReq.headers)) {
    if (v === undefined) continue;
    const lk = k.toLowerCase();
    if (['host', 'connection', 'content-length'].includes(lk)) continue;
    fwdHeaders[k] = v;
  }
  fwdHeaders.host = `127.0.0.1:${targetPort}`;
  // Force Connection: close so upstream doesn't keep connection open after this request
  fwdHeaders.connection = 'close';

  const opts = {
    hostname: '127.0.0.1',
    port: targetPort,
    method: sourceReq.method,
    path: sourceReq.originalUrl,
    headers: fwdHeaders,
  };
  const upstreamReq = http.request(opts, (upstreamRes) => {
    if (sourceRes.headersSent) {
      upstreamRes.resume();
      return;
    }
    sourceRes.status(upstreamRes.statusCode);
    for (const [k, v] of Object.entries(upstreamRes.headers)) {
      if (v === undefined) continue;
      const lk = k.toLowerCase();
      if (['transfer-encoding', 'connection'].includes(lk)) continue;
      sourceRes.setHeader(k, v);
    }
    upstreamRes.pipe(sourceRes);
  });
  upstreamReq.on('error', (err) => {
    if (!sourceRes.headersSent) {
      sourceRes.status(502).json({
        error: 'upstream_unavailable',
        message: `upstream service on :${targetPort} is unreachable`,
        target_port: targetPort,
        detail: err.message,
      });
    }
  });
  // Determine if request has a body to forward.
  // For methods that typically carry a body (POST/PUT/PATCH/DELETE), forward req.body
  // if it's present and non-empty. For GET/HEAD, never write a body even if express
  // populated req.body to {} as a default.
  const method = sourceReq.method.toUpperCase();
  const hasBodyMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const bodyIsPresent = sourceReq.body !== undefined && sourceReq.body !== null
    && !(typeof sourceReq.body === 'object' && Object.keys(sourceReq.body).length === 0);

  if (hasBodyMethod && bodyIsPresent) {
    const bodyStr = typeof sourceReq.body === 'string' ? sourceReq.body : JSON.stringify(sourceReq.body);
    upstreamReq.write(bodyStr);
    upstreamReq.end();
  } else {
    upstreamReq.end();
  }
}

// ---------- Health probe ----------
function probeService(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request({ hostname: host, port, path: '/health', method: 'GET', timeout: timeoutMs }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        resolve({
          ok: res.statusCode === 200,
          status: res.statusCode,
          latency_ms: Date.now() - start,
          body: buf ? safeParse(buf) : null,
        });
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0, latency_ms: Date.now() - start, error: 'timeout' });
    });
    req.on('error', (err) => {
      resolve({ ok: false, status: 0, latency_ms: Date.now() - start, error: err.code || err.message });
    });
    req.end();
  });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return s; } }

// ---------- Service factory ----------
function createService({ dataDir, internalToken }) {
  let data = readData(dataDir);
  data = seedTemplates(data);
  writeData(dataDir, data);

  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Request logger (lightweight)
  app.use((req, _res, next) => {
    if (process.env.LOG_REQUESTS === '1') {
      console.log(`[ai-studio-api] ${req.method} ${req.originalUrl}`);
    }
    next();
  });

  // Service catalog
  app.get('/', (_req, res) => {
    res.json({
      service: 'ai-studio-api',
      port: 4900,
      description: 'AI Studio Gateway — proxies to 9 sub-services + marketplace',
      sub_services: Object.entries(SUB_SERVICES).map(([key, v]) => ({
        key,
        name: v.name,
        port: v.port,
        proxy_prefix: v.prefix,
      })),
      marketplace: {
        templates: Object.keys(data.templates).length,
        installed: Object.keys(data.installed).length,
      },
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ai-studio-api' });
  });

  app.get('/ready', async (_req, res) => {
    const probes = await Promise.all(
      Object.entries(SUB_SERVICES).map(async ([key, v]) => {
        const r = await probeService('127.0.0.1', v.port);
        return [key, { ...r, name: v.name, port: v.port }];
      })
    );
    const healthy = probes.filter(([, r]) => r.ok).length;
    res.json({
      ready: healthy > 0,
      healthy,
      total: probes.length,
      probes: Object.fromEntries(probes),
    });
  });

  // ----- Proxy routes -----
  for (const [key, cfg] of Object.entries(SUB_SERVICES)) {
    // Use app.use(prefix) — Express handles the rest of the path correctly
    app.use(cfg.prefix, (req, res, next) => {
      // Inject token header if not present
      if (!req.get('X-Internal-Token')) {
        req.headers['x-internal-token'] = internalToken;
      }
      // Read port dynamically (allows test/runtime overrides of SUB_SERVICES)
      const targetPort = SUB_SERVICES[key]?.port ?? cfg.port;
      proxyRequest(targetPort, req, res);
    });
  }

  // ----- Marketplace -----
  app.get('/marketplace/templates', (req, res) => {
    const { category, tag, q } = req.query;
    let list = Object.values(data.templates);
    if (category) list = list.filter((t) => t.category === category);
    if (tag) list = list.filter((t) => t.tags?.includes(tag));
    if (q) {
      const needle = String(q).toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(needle) || t.description.toLowerCase().includes(needle)
      );
    }
    list.sort((a, b) => b.installs - a.installs);
    res.json({ templates: list, total: list.length });
  });

  app.get('/marketplace/templates/:id', (req, res) => {
    const t = data.templates[req.params.id];
    if (!t) return res.status(404).json({ error: 'not_found' });
    res.json(t);
  });

  app.post('/marketplace/install', (req, res) => {
    const { template_id, project_id, user_id } = req.body || {};
    if (typeof template_id !== 'string' || !template_id) return res.status(400).json({ error: 'validation', message: 'template_id required' });
    if (typeof project_id !== 'string' || !project_id) return res.status(400).json({ error: 'validation', message: 'project_id required' });
    if (typeof user_id !== 'string' || !user_id) return res.status(400).json({ error: 'validation', message: 'user_id required' });

    const tpl = data.templates[template_id];
    if (!tpl) return res.status(404).json({ error: 'not_found', message: 'template does not exist' });

    const id = 'inst_' + crypto.randomBytes(6).toString('hex');
    const install = {
      id,
      template_id,
      project_id,
      user_id,
      installed_at: new Date().toISOString(),
      category: tpl.category,
      snapshot: { name: tpl.name, description: tpl.description, tags: tpl.tags },
    };
    data.installed[id] = install;
    tpl.installs = (tpl.installs || 0) + 1;
    writeData(dataDir, data);
    res.status(201).json(install);
  });

  app.get('/marketplace/installed', (req, res) => {
    const { project_id } = req.query;
    let list = Object.values(data.installed);
    if (project_id) list = list.filter((i) => i.project_id === project_id);
    list.sort((a, b) => new Date(b.installed_at) - new Date(a.installed_at));
    res.json({ installed: list, total: list.length });
  });

  app.post('/marketplace/publish', (req, res) => {
    const { name, description, category, tags, author } = req.body || {};
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'validation', message: 'name required' });
    if (typeof description !== 'string') return res.status(400).json({ error: 'validation', message: 'description required' });
    if (!['agent', 'workflow', 'twin', 'rag', 'eval', 'playground'].includes(category)) {
      return res.status(400).json({ error: 'validation', message: 'category must be one of agent, workflow, twin, rag, eval, playground' });
    }

    const id = 'tpl_' + crypto.randomBytes(6).toString('hex');
    const tpl = {
      id,
      name: name.trim(),
      description: description.trim(),
      category,
      tags: Array.isArray(tags) ? tags : [],
      author: author || 'community',
      installs: 0,
      rating: 0,
      created_at: new Date().toISOString(),
    };
    data.templates[id] = tpl;
    writeData(dataDir, data);
    res.status(201).json(tpl);
  });

  // Stats
  app.get('/marketplace/stats', (_req, res) => {
    const templates = Object.values(data.templates);
    const installed = Object.values(data.installed);
    res.json({
      total_templates: templates.length,
      total_installs: installed.length,
      by_category: templates.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      }, {}),
      top_templates: templates
        .slice()
        .sort((a, b) => b.installs - a.installs)
        .slice(0, 5)
        .map((t) => ({ id: t.id, name: t.name, installs: t.installs })),
    });
  });

  return app;
}

function createApp() {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const internalToken = process.env.INTERNAL_TOKEN || 'studio-internal-token';
  return createService({ dataDir, internalToken });
}

if (require.main === module) {
  const app = createApp();
  const port = parseInt(process.env.PORT, 10) || 4900;
  app.listen(port, () => {
    console.log(`[ai-studio-api] listening on :${port}`);
  });
}

module.exports = { createApp, createService, SUB_SERVICES };
