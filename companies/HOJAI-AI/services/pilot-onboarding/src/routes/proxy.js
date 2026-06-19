// Forward requests to the chosen industry OS.
// In dev, this is a no-op stub. In prod, uses http-proxy-middleware.
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { findService } from '../utils/catalog.js';

const router = express.Router();
router.use(authMiddleware);

// All requests to /v1/proxy/:industry/*
router.all('/:industry/*', async (req, res) => {
  const { industry } = req.params;
  const svc = findService(industry);
  if (!svc) return res.status(404).json({ error: 'Unknown industry service' });

  // Confirm this client is provisioned
  const isProvisioned = req.client.services.some(s => s.serviceId === industry && s.status === 'active');
  if (!isProvisioned) {
    return res.status(403).json({ error: 'Service not provisioned for this client' });
  }

  // In real prod, use http-proxy-middleware to forward to the target URL.
  // For pilot, return a stub describing what would happen.
  const base = process.env[industryToEnv(svc.id)] || `http://localhost:${svc.port}`;
  const subPath = req.params[0] || '';
  const targetUrl = `${base}/${subPath}`;

  res.json({
    ok: true,
    mode: 'proxy-stub',
    target: targetUrl,
    method: req.method,
    note: 'In production this forwards to the industry OS. Configure http-proxy-middleware for full proxying.'
  });
});

function industryToEnv(id) {
  return id.toUpperCase().replace(/-/g, '_') + '_URL';
}

export default router;
