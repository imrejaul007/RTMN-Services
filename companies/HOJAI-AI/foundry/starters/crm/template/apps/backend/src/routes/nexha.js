import { Router } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const r = Router();

r.get('/profile', async (_req, res) => {
  let manifest = {}, capability = {};
  try { manifest = JSON.parse(await fs.readFile(path.resolve(__dirname, '..', '..', '..', '..', '.hojai', 'manifest.json'), 'utf8')); } catch {}
  try { capability = JSON.parse(await fs.readFile(path.resolve(__dirname, '..', '..', '..', '..', '.hojai', 'capability.json'), 'utf8')); } catch {}
  res.json({ manifest, capability });
});

export default r;
