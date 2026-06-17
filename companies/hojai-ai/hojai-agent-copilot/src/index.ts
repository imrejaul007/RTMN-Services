import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import copilotRoutes from './routes/copilot.js';
import type { HealthStatus } from './types.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4895', 10);
const START_TIME = Date.now();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Request-Id']
}));

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  console.log(`[${requestId}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000)
  };
  res.json(health);
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (_req, res) => {
  res.json({
    status: 'ready',
    service: 'hojai-agent-copilot',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/copilot', copilotRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Copilot error:', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              HOJAI AGENT COPILOT                           ║
╠════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                      ║
║  Health:   http://localhost:${PORT}/health                   ║
║  Ready:    http://localhost:${PORT}/health/ready             ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                               ║
║  POST /api/copilot/draft-reply     - Generate replies     ║
║  POST /api/copilot/summarize       - Summarize convos      ║
║  POST /api/copilot/predict-csat    - Predict CSAT          ║
║  POST /api/copilot/suggest-macros  - Suggest macros        ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;