// SDK TypeScript (4168) — package source server
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4168;
const SERVICE = 'sdk-typescript';

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

const SDK_FILES = {
  'package.json': {
    "name": "@hojai/sdk",
    "version": "1.0.0",
    "description": "TypeScript SDK for HOJAI AI",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": { "build": "tsc" },
    "dependencies": { "axios": "^1.7.0" }
  },
  'tsconfig.json': {
    "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler", "declaration": true, "outDir": "./dist" }
  },
  'src/index.ts': `export * from './client';
export * from './types';
`,
  'src/client.ts': `import axios, { AxiosInstance } from 'axios';
import { HojaiConfig } from './types';

export class HojaiClient {
  private http: AxiosInstance;
  constructor(config: HojaiConfig) {
    this.http = axios.create({ baseURL: config.baseUrl, timeout: config.timeout || 30000 });
  }
  async twins() { return (await this.http.get('/api/twins')).data; }
  async aiChat(prompt: string) { return (await this.http.post('/api/ai/chat', { prompt })).data; }
  async customer360(id: string) { return (await this.http.get(\`/api/customer360/\${id}\`)).data; }
}
`,
  'src/types.ts': `export interface HojaiConfig { baseUrl: string; apiKey?: string; timeout?: number; }
export interface Twin { id: string; type: string; subject_id: string; state: Record<string, any>; }
export interface ChatResponse { message: string; usage?: { tokens: number }; }
`,
  'README.md': `# @hojai/sdk

TypeScript SDK for HOJAI AI.

## Install
\`\`\`
npm install @hojai/sdk
\`\`\`

## Usage
\`\`\`typescript
import { HojaiClient } from '@hojai/sdk';
const client = new HojaiClient({ baseUrl: 'http://localhost:4399' });
const twins = await client.twins();
\`\`\`
`
};

async function seed() {
  for (const [rel, content] of Object.entries(SDK_FILES)) {
    const full = path.join(__dirname, '..', rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', files: Object.keys(SDK_FILES).length })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.get('/api/files', (req, res) => {
  const name = req.query.name;
  if (!name) return res.json(ok({ files: Object.keys(SDK_FILES), count: Object.keys(SDK_FILES).length }));
  const content = SDK_FILES[name];
  if (!content) return res.status(404).json(fail('not found: ' + name));
  res.json(ok({ file: name, content: typeof content === 'string' ? content : JSON.stringify(content, null, 2) }));
});
app.post('/api/files', (req, res) => {
  const name = req.query.name;
  const { content } = req.body || {};
  if (!name || !content) return res.status(400).json(fail('name query + content body required'));
  SDK_FILES[name] = content;
  res.json(ok({ file: name }));
});
app.get('/api/package.json', (_q, r) => r.json(ok({ package: SDK_FILES['package.json'] })));

await seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));