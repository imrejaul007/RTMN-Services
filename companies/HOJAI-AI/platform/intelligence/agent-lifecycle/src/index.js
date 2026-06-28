/**
 * Agent Lifecycle Management Service
 * Express server for managing AI agent lifecycle: versioning, deployment, rollback, monitoring
 */

import express from 'express';
import healthRoutes from './routes/health.js';
import agentsRoutes from './routes/agents.js';
import versionsRoutes from './routes/versions.js';
import deployRoutes from './routes/deploy.js';
import rollbackRoutes from './routes/rollback.js';
import agentHealthRoutes from './routes/agentHealth.js';

const app = express();
const PORT = process.env.PORT || 4860; // Default port for Agent Lifecycle

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check routes
app.use('/health', healthRoutes);

// API routes
app.use('/api/agents', agentsRoutes);
app.use('/api/versions', versionsRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/rollback', rollbackRoutes);
app.use('/api/health', agentHealthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`Agent Lifecycle Management Service started on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API base: http://localhost:${PORT}/api`);
});

export default app;