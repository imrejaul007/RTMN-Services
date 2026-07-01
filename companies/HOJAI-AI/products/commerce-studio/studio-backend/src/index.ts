/**
 * Commerce Studio Backend
 * Port: 5750
 *
 * API backend for Commerce Studio UI. Handles:
 * - Template selection
 * - Commerce configuration
 * - Worker selection
 * - Trust setup
 * - Finance setup
 * - Deployment orchestration
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { requireInternalAuth } from './middleware/internalAuth.js';
import axios from 'axios';

import templatesRouter from './routes/templates.js';
import builderRouter from './routes/builder.js';
import deployRouter from './routes/deploy.js';
import dashboardRouter from './routes/dashboard.js';
import wizardsRouter from './routes/wizards.js';

const PORT = parseInt(process.env.PORT || '5750', 10);
const SERVICE_NAME = 'commerce-studio-backend';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(requireInternalAuth);

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/studio/templates', templatesRouter);
app.use('/api/studio/builder', builderRouter);
app.use('/api/studio/deploy', deployRouter);
app.use('/api/studio/dashboard', dashboardRouter);
app.use('/api/studio/wizards', wizardsRouter);

// API Index
app.get('/api/studio', (req, res) => {
  res.json({
    service: 'Commerce Studio API',
    version: '1.0.0',
    endpoints: {
      templates: '/api/studio/templates',
      builder: '/api/studio/builder',
      deploy: '/api/studio/deploy',
      dashboard: '/api/studio/dashboard',
      wizards: '/api/studio/wizards',
    },
    timestamp: new Date().toISOString(),
  });
});

// 404
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
  console.log(`✅ Commerce Studio API running on port ${PORT}`);
  console.log('   Routes: /templates, /builder, /deploy, /dashboard, /wizards');
});

export default app;
