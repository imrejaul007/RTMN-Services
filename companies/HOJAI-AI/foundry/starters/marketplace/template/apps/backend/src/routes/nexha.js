/**
 * Nexha federation routes — used when this marketplace joins a
 * Global Nexha federation. v0 returns the local capability
 * declaration; production wires to the real Nexha network.
 */

import { Router } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

let cached = null;
async function load() {
  if (cached) return cached;
  const cap = path.resolve(__dirname, '..', '..', '..', '..', '.hojai', 'capability.json');
  const man = path.resolve(__dirname, '..', '..', '..', '..', '.hojai', 'manifest.json');
  const capability = JSON.parse(await fs.readFile(cap, 'utf8'));
  const manifest = JSON.parse(await fs.readFile(man, 'utf8'));
  cached = { capability, manifest };
  return cached;
}

router.get('/capability', async (_q, r) => {
  const { capability } = await load();
  r.json(capability);
});

router.get('/profile', async (_q, r) => {
  const { manifest, capability } = await load();
  r.json({ manifest, capability, registeredNexhas: 0 });
});

router.get('/peers', async (_q, r) => {
  r.json({ items: [], total: 0, message: 'Nexha federation is opt-in. Run `npx hojai connect-nexha` to join the global network.' });
});

export default router;
