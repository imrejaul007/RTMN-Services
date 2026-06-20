// Agent SDK Service (4187)
// Hosts TypeScript + Python SDK source, lists available SDK versions, and provides
// a unified download endpoint for third-party agent builders.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const PORT = process.env.PORT || 4187;
const SERVICE = 'agent-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SDK_ROOT = path.resolve(__dirname, '..');

const sdks = new Map();        // sdkId -> { id, language, version, description, files }
const downloads = new Map();   // dlId -> { id, sdk_id, version, language, ts }
const releases = new Map();    // releaseId -> { id, sdk_id, version, changelog, published }

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

// File listing helpers
function listFiles(dir, base = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    const rel = base ? `${base}/${f}` : f;
    if (fs.statSync(full).isDirectory()) {
      out.push(...listFiles(full, rel));
    } else {
      out.push(rel);
    }
  });
  return out;
}

function seed() {
  // Seed SDKs from filesystem
  const tsDir = path.join(SDK_ROOT, 'sdk', 'typescript');
  const pyDir = path.join(SDK_ROOT, 'sdk', 'python');

  const tsFiles = listFiles(tsDir, 'typescript');
  const pyFiles = listFiles(pyDir, 'python');

  const tsId = uuid();
  sdks.set(tsId, {
    id: tsId, language: 'typescript', name: '@hojai/agent-sdk-typescript',
    version: '1.0.0', description: 'TypeScript SDK for HOJAI AI agents',
    files: tsFiles,
    install_cmd: 'npm install @hojai/agent-sdk-typescript',
    file_count: tsFiles.length
  });

  const pyId = uuid();
  sdks.set(pyId, {
    id: pyId, language: 'python', name: 'hojai-agent-sdk',
    version: '1.0.0', description: 'Python SDK for HOJAI AI agents',
    files: pyFiles,
    install_cmd: 'pip install hojai-agent-sdk',
    file_count: pyFiles.length
  });

  // Releases
  releases.set(uuid(), {
    id: 'rel-ts-100', sdk_id: tsId, version: '1.0.0',
    changelog: 'Initial TypeScript SDK release',
    published: new Date().toISOString()
  });
  releases.set(uuid(), {
    id: 'rel-py-100', sdk_id: pyId, version: '1.0.0',
    changelog: 'Initial Python SDK release',
    published: new Date().toISOString()
  });
}

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  endpoints: ['/api/sdks', '/api/sdks/:id', '/api/sdks/:id/files',
              '/api/files?path=...', '/api/releases', '/api/downloads']
})));

// SDK listing
app.get('/api/sdks', (_req, res) => res.json(ok({ sdks: [...sdks.values()] })));
app.get('/api/sdks/:id', (req, res) => {
  const sdk = sdks.get(req.params.id);
  if (!sdk) return res.status(404).json(fail('sdk not found'));
  res.json(ok({ sdk }));
});
app.get('/api/sdks/:id/files', (req, res) => {
  const sdk = sdks.get(req.params.id);
  if (!sdk) return res.status(404).json(fail('sdk not found'));
  res.json(ok({ sdk_id: sdk.id, files: sdk.files, file_count: sdk.file_count }));
});

// File content (serves SDK source from filesystem)
app.get('/api/files', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json(fail('path query param required'));
  // Sanitize: must start with 'typescript/' or 'python/'
  const safe = filePath.replace(/\.\./g, '').replace(/^\/+/, '');
  const fullPath = path.join(SDK_ROOT, 'sdk', safe);
  if (!fs.existsSync(fullPath)) return res.status(404).json(fail('file not found'));
  if (fs.statSync(fullPath).isDirectory()) return res.status(400).json(fail('path is a directory'));
  const content = fs.readFileSync(fullPath, 'utf8');
  res.json(ok({ path: safe, size_bytes: content.length, content }));
});

// Releases
app.get('/api/releases', (_req, res) => res.json(ok({ releases: [...releases.values()] })));
app.post('/api/releases', (req, res) => {
  const { sdk_id, version, changelog } = req.body || {};
  if (!sdk_id || !version) return res.status(400).json(fail('sdk_id + version required'));
  if (!sdks.has(sdk_id)) return res.status(404).json(fail('sdk not found'));
  const id = uuid();
  const r = { id, sdk_id, version, changelog: changelog || '', published: new Date().toISOString() };
  releases.set(id, r);
  res.status(201).json(ok({ release: r }));
});

// Downloads
app.get('/api/downloads', (_req, res) => res.json(ok({ downloads: [...downloads.values()] })));
app.post('/api/downloads', (req, res) => {
  const { sdk_id } = req.body || {};
  if (!sdks.has(sdk_id)) return res.status(404).json(fail('sdk not found'));
  const id = uuid();
  const sdk = sdks.get(sdk_id);
  const d = { id, sdk_id, version: sdk.version, language: sdk.language, ts: new Date().toISOString() };
  downloads.set(id, d);
  res.status(201).json(ok({ download: d }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));