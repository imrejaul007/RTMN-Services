/**
 * HOJAI Secrets Manager API
 * Port: 4420
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import {
  createSecret, getSecret, listSecrets, updateSecret, deleteSecret,
  rotateSecret, getAccessLog, getStats
} from './store.js';

const PORT = process.env.PORT || 4420;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Auth middleware
const requireAuth = (req, res, next) => {
  if (process.env.REQUIRE_AUTH !== 'true') {
    return next();
  }
  const token = req.headers['x-internal-service-token'];
  if (!token || token !== process.env.INTERNAL_SERVICE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Apply auth middleware to API routes
app.use('/api', requireAuth);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'secrets-manager', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    service: 'HOJAI Secrets Manager API',
    version: '1.0.0',
    description: 'Encrypted credential storage',
    endpoints: {
      secrets: {
        'POST /api/v1/secrets': 'Create secret',
        'GET /api/v1/secrets': 'List secrets',
        'GET /api/v1/secrets/:id': 'Get secret (decrypted)',
        'PATCH /api/v1/secrets/:id': 'Update secret',
        'DELETE /api/v1/secrets/:id': 'Delete secret',
        'POST /api/v1/secrets/:id/rotate': 'Rotate secret',
        'GET /api/v1/secrets/:id/logs': 'Access logs'
      },
      stats: {
        'GET /api/v1/stats': 'Platform stats'
      }
    },
    secretTypes: ['api-key', 'password', 'certificate', 'token', 'credential']
  });
});

// Create secret
app.post('/api/v1/secrets', requireInternal, (req, res) => {
  try {
    const { name, value, userId, projectId, type, metadata } = req.body;
    if (!name || !value || !userId) {
      return res.status(400).json({ error: 'name, value, and userId are required' });
    }
    const secret = createSecret({ name, value, userId, projectId, type, metadata });
    res.status(201).json({ success: true, secret });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List secrets (no values)
app.get('/api/v1/secrets', (req, res) => {
  try {
    const { userId, projectId, type } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const secrets = listSecrets({ userId, projectId, type });
    res.json({ success: true, count: secrets.length, secrets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get secret (decrypted)
app.get('/api/v1/secrets/:id', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const secret = getSecret(req.params.id, userId);
    if (!secret) {
      return res.status(404).json({ error: 'Secret not found or access denied' });
    }
    res.json({ success: true, secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update secret
app.patch('/api/v1/secrets/:id', requireInternal, (req, res) => {
  try {
    const { userId, name, value, metadata } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const secret = updateSecret(req.params.id, { userId, name, value, metadata });
    if (!secret) {
      return res.status(404).json({ error: 'Secret not found or access denied' });
    }
    res.json({ success: true, secret });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete secret
app.delete('/api/v1/secrets/:id', requireInternal, (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const deleted = deleteSecret(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Secret not found or access denied' });
    }
    res.json({ success: true, message: 'Secret deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rotate secret
app.post('/api/v1/secrets/:id/rotate', requireInternal, (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const result = rotateSecret(req.params.id, userId);
    if (!result) {
      return res.status(404).json({ error: 'Secret not found or access denied' });
    }
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Access logs
app.get('/api/v1/secrets/:id/logs', (req, res) => {
  try {
    const logs = getAccessLog(req.params.id);
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats
app.get('/api/v1/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'HOJAI Secrets Manager',
    tagline: 'Encrypted credential storage',
    version: '1.0.0',
    port: PORT
  });
});

// Only start the server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, HOST, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     🔐 HOJAI SECRETS MANAGER — PORT ${PORT}                       ║
║                                                                  ║
║     Encrypted credential storage                                 ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║     POST /api/v1/secrets      — Create secret                ║
║     GET  /api/v1/secrets      — List secrets                 ║
║     GET  /api/v1/secrets/:id  — Get secret (decrypted)       ║
║     PATCH /api/v1/secrets/:id — Update secret                 ║
║     DELETE /api/v1/secrets/:id — Delete secret               ║
║     POST /api/v1/secrets/:id/rotate — Rotate secret          ║
║     GET  /api/v1/secrets/:id/logs — Access logs                ║
╚══════════════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => process.exit(0));
  });
}

export default app;
