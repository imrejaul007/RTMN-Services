import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = fileURLToPath(import.meta.url);
const DATA_DIR = join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export { DATA_DIR };

export function readJson(name) {
  const p = join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export function writeJson(name, data) {
  const p = join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}
