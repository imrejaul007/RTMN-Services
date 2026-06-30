/**
 * BAM Gateway — AI Workers Platform
 * Port: 5550
 * Single entry point for all BAM workers
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import workersRouter from './routes/workers.js';
import skillsRouter from './routes/skills.js';
import billingRouter from './routes/billing.js';
import catalogRouter from './routes/catalog.js';

const PORT = parseInt(process.env.PORT || '5550', 10);
const SERVICE_NAME = 'bam-gateway';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Health endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    service: 'BAM Gateway',
    version: '1.0.0',
    description: 'AI Workers Platform',
    endpoints: {
      workers: '/api/workers',
      skills: '/api/skills',
      billing: '/api/billing',
      catalog: '/api/catalog',
    },
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/workers', workersRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/catalog', catalogRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` },
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[Error] ${err.message}`);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message },
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`✅ BAM Gateway running on port ${PORT}`);
  console.log('   Workers: vendor-acquisition, catalog-normalization, recommendation, growth');
  console.log('   AI workers ready to power commerce operations');
});

export default app;
