import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
export function readJson(name) { const p = join(DATA_DIR, name); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null; }
export function writeJson(name, data) { fs.writeFileSync(join(DATA_DIR, name), JSON.stringify(data, null, 2)); }
