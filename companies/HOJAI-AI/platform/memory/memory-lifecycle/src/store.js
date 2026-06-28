import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
export function readJson(name) { const p = join(DATA_DIR, name); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p)) : null; }
export function writeJson(name, data) { fs.writeFileSync(join(DATA_DIR, name), JSON.stringify(data, null, 2)); }
export function upsert(name, item, idField = 'id') {
  const list = readJson(name) || [];
  const idx = list.findIndex(i => i[idField] === item[idField]);
  if (idx >= 0) list[idx] = item; else list.push(item);
  writeJson(name, list); return item;
}
