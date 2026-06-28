import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const PORT = process.env.PORT || 4890;
const APP = express();

APP.use(express.json());

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const readJson = (name) => {
  const p = join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
};
const writeJson = (name, data) => {
  const p = join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
};
const upsert = (name, item) => {
  const all = readJson(name);
  const idx = all.findIndex(x => x.id === item.id);
  if (idx >= 0) all[idx] = item; else all.push(item);
  writeJson(name, all);
  return item;
};

APP.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ai-studio', port: PORT, timestamp: new Date().toISOString() }));
APP.get('/ready', (_req, res) => res.json({ ready: true }));

// Export helpers for routes
export { readJson, writeJson, upsert, DATA_DIR };

// Routes
import workflowsRouter from './routes/workflows.js';
import executeRouter from './routes/execute.js';
import validateRouter from './routes/validate.js';
import historyRouter from './routes/history.js';
import exportRouter from './routes/export.js';

APP.use('/api', workflowsRouter);
APP.use('/api', executeRouter);
APP.use('/api', validateRouter);
APP.use('/api', historyRouter);
APP.use('/api', exportRouter);

APP.use((_req, res) => res.status(404).json({ error: 'not found' }));
APP.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: err.message }); });

APP.listen(PORT, () => console.log(`ai-studio listening on :${PORT}`));
export { APP };
