// API Docs Generator (4171) — generate OpenAPI spec from running services
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4171;
const SERVICE = 'api-docs-generator';

const services = new Map(); // service name -> { name, base_url, endpoints[] }
const generated = new Map(); // docId -> { id, service, openapi, markdown, ts }

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const seeds = [
    { name: 'sales-os', base_url: 'http://localhost:5055', endpoints: ['/health', '/api/leads', '/api/deals', '/api/contacts'] },
    { name: 'marketing-os', base_url: 'http://localhost:5500', endpoints: ['/health', '/api/campaigns', '/api/audiences'] },
    { name: 'restaurant-os', base_url: 'http://localhost:5010', endpoints: ['/health', '/api/orders', '/api/menu'] },
    { name: 'ai-intelligence', base_url: 'http://localhost:4881', endpoints: ['/health', '/api/agents', '/api/chat'] }
  ];
  seeds.forEach(s => { const id = uuid(); services.set(id, { id, ...s }); });
}

function buildOpenAPI(svc) {
  return {
    openapi: '3.0.0',
    info: { title: svc.name, version: '1.0.0', description: `Auto-generated OpenAPI for ${svc.name}` },
    servers: [{ url: svc.base_url }],
    paths: Object.fromEntries(svc.endpoints.map(e => [
      e,
      {
        get: {
          summary: `${e}`,
          responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } }
        }
      }
    ]))
  };
}

function buildMarkdown(svc) {
  return `# ${svc.name}\n\nBase URL: \`${svc.base_url}\`\n\n## Endpoints\n\n${svc.endpoints.map(e => `- \`GET ${e}\``).join('\n')}\n`;
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', services: services.size, generated: generated.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.get('/api/services', (_q, r) => r.json(ok({ services: [...services.values()], count: services.size })));
app.post('/api/services', (req, res) => {
  const { name, base_url, endpoints } = req.body || {};
  if (!name || !base_url || !Array.isArray(endpoints)) return res.status(400).json(fail('name, base_url, endpoints[] required'));
  const id = uuid();
  const s = { id, name, base_url, endpoints };
  services.set(id, s);
  res.status(201).json(ok({ service: s }));
});

// Generate docs for a service
app.post('/api/services/:id/generate', (req, res) => {
  const svc = services.get(req.params.id);
  if (!svc) return res.status(404).json(fail('not found'));
  const id = uuid();
  const openapi = buildOpenAPI(svc);
  const markdown = buildMarkdown(svc);
  const doc = { id, service: svc.name, openapi, markdown, ts: new Date().toISOString() };
  generated.set(id, doc);
  res.status(201).json(ok({ doc }));
});

app.get('/api/docs', (_q, r) => r.json(ok({ docs: [...generated.values()].map(d => ({ id: d.id, service: d.service, ts: d.ts })), count: generated.size })));
app.get('/api/docs/:id', (req, res) => {
  const d = generated.get(req.params.id);
  if (!d) return res.status(404).json(fail('not found'));
  res.json(ok({ doc: d }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));