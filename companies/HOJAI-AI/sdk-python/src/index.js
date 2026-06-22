// SDK Python (4169) — PyPI package source server
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4169;
const SERVICE = 'sdk-python';

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

const SDK_FILES = {
  'pyproject.toml': `[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "hojai"
version = "1.0.0"
description = "Python SDK for HOJAI AI"
requires-python = ">=3.9"
dependencies = ["requests>=2.31", "pydantic>=2.0"]
`,
  'hojai/__init__.py': `from .client import HojaiClient
__version__ = "1.0.0"
`,
  'hojai/client.py': `import requests
from dataclasses import dataclass

@dataclass
class HojaiConfig:
    base_url: str
    api_key: str = None
    timeout: int = 30

class HojaiClient:
    def __init__(self, config: HojaiConfig):
        self.base_url = config.base_url.rstrip('/')
        self.api_key = config.api_key
        self.timeout = config.timeout
        self.session = requests.Session()
        if self.api_key:
            self.session.headers['Authorization'] = f'Bearer {self.api_key}'

    def twins(self):
        return self.session.get(f'{self.base_url}/api/twins', timeout=self.timeout).json()

    def ai_chat(self, prompt: str):
        return self.session.post(f'{self.base_url}/api/ai/chat', json={'prompt': prompt}, timeout=self.timeout).json()

    def customer360(self, customer_id: str):
        return self.session.get(f'{self.base_url}/api/customer360/{customer_id}', timeout=self.timeout).json()
`,
  'README.md': `# hojai

Python SDK for HOJAI AI.

## Install
\`\`\`
pip install hojai
\`\`\`

## Usage
\`\`\`python
from hojai import HojaiClient, HojaiConfig
client = HojaiClient(HojaiConfig(base_url='http://localhost:4399'))
twins = client.twins()
\`\`\`
`
};

async function seed() {
  for (const [rel, content] of Object.entries(SDK_FILES)) {
    const full = path.join(__dirname, '..', rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
  }
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', files: Object.keys(SDK_FILES).length })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.get('/api/files', (req, res) => {
  const name = req.query.name;
  if (!name) return res.json(ok({ files: Object.keys(SDK_FILES), count: Object.keys(SDK_FILES).length }));
  const content = SDK_FILES[name];
  if (!content) return res.status(404).json(fail('not found: ' + name));
  res.json(ok({ file: name, content }));
});
app.post('/api/files', (req, res) => {
  const name = req.query.name;
  const { content } = req.body || {};
  if (!name || !content) return res.status(400).json(fail('name query + content body required'));
  SDK_FILES[name] = content;
  res.json(ok({ file: name }));
});
app.get('/api/pyproject.toml', (_q, r) => r.json(ok({ content: SDK_FILES['pyproject.toml'] })));

await seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));