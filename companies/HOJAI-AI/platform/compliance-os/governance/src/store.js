// Shared file-based JSON storage
import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export function readJson(name) {
  const path = join(DATA_DIR, name);
  if (!fs.existsSync(path)) return null;
  try { return JSON.parse(fs.readFileSync(path, 'utf-8')); }
  catch { return null; }
}

export function writeJson(name, data) {
  const path = join(DATA_DIR, name);
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}