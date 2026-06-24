/**
 * /api/nexha/* — Nexha federation routes
 *
 * Stub for the federation layer. Real implementation connects to
 * `@hojai/nexha` and the Global Nexha network.
 */

import express from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.get('/capability', async (_req, res) => {
  try {
    const data = await fs.readFile(path.resolve(__dirname, '..', '..', '..', '..', '..', '.hojai', 'capability.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'capability.json not found — run hojai ai-spec generate' } });
  }
});

router.get('/profile', async (_req, res) => {
  try {
    const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
    const [manifest, capability] = await Promise.all([
      fs.readFile(path.join(root, '.hojai', 'manifest.json'), 'utf-8').then(JSON.parse),
      fs.readFile(path.join(root, '.hojai', 'capability.json'), 'utf-8').then(JSON.parse).catch(() => null)
    ]);
    res.json({ manifest, capability });
  } catch (e) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'project profile not found' } });
  }
});

router.get('/peers', (_req, res) => {
  // Stub: in production this returns the federation peer list from @hojai/nexha.
  res.json({
    peers: [
      { id: 'peer-1', name: 'Maya Collective',  capabilities: ['cotton-sourcing', 'logistics-in'], trust: 87 },
      { id: 'peer-2', name: 'Acme Logistics',   capabilities: ['fleet-management'],             trust: 92 },
      { id: 'peer-3', name: 'Delta Manufacturing', capabilities: ['custom-manufacturing'],     trust: 78 }
    ],
    note: 'Stub — connect @hojai/nexha for real federation'
  });
});

router.post('/peers/connect', (req, res) => {
  // Stub: real impl uses @hojai/nexha to publish capabilities + handshake.
  res.json({
    connected: true,
    peerId: req.body?.peerId || 'unknown',
    message: 'Stub — connect @hojai/nexha for real federation handshake.'
  });
});

export default router;
