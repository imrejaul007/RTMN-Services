import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const PORT = process.env.PORT || 4888;
const APP = express();

APP.use(express.json());

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Storage helpers ──────────────────────────────────────────────────────────
const readJson = (name) => {
  const path = join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(path)) return [];
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
};
const writeJson = (name, data) => {
  const path = join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
};
const findOne = (name, fn) => readJson(name).find(fn);
const upsert = (name, item, key = 'id') => {
  const all = readJson(name);
  const idx = all.findIndex(x => x[key] === item[key]);
  if (idx >= 0) all[idx] = item; else all.push(item);
  writeJson(name, all);
  return item;
};
const remove = (name, key, val) => {
  const all = readJson(name).filter(x => x[key] !== val);
  writeJson(name, all);
};

// ─── Routes ───────────────────────────────────────────────────────────────────
import runsRouter from './routes/runs.js';
import metricsRouter from './routes/metrics.js';
import baselineRouter from './routes/baseline.js';
import gatesRouter from './routes/gates.js';

APP.get('/health', (_req, res) => res.json({ status: 'ok', service: 'eval-continuous', port: PORT, timestamp: new Date().toISOString() }));
APP.get('/ready', (_req, res) => res.json({ ready: true }));

APP.use('/api', runsRouter);
APP.use('/api', metricsRouter);
APP.use('/api', baselineRouter);
APP.use('/api', gatesRouter);

// 404
APP.use((_req, res) => res.status(404).json({ error: 'not found' }));
// Error handler
APP.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

APP.listen(PORT, () => {
  console.log(`eval-continuous listening on :${PORT}`);
});

export { APP };
