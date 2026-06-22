/**
 * Finance Ai Service
 * Industry AI Vertical - Accounting
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// Health endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'finance-ai', version: '1.0.0' });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});

// API endpoints placeholder
app.get('/api/info', (req, res) => {
  res.json({
    name: 'finance-ai',
    category: 'accounting',
    status: 'template',
    features: ["Invoice Management", "Expense Tracking", "Financial Reports", "Tax Preparation"]
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Service finance-ai started on port ${PORT}`);
});

export default app;
