import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { eventBus } from './utils/eventBus';
import slaRoutes from './routes/sla';
import monitoringRoutes from './routes/monitoring';
import reportsRoutes from './routes/reports';
import metricsRoutes from './routes/metrics';

const app = express();
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: config.serviceName, version: config.version, environment: config.environment, uptime: Math.floor((Date.now() - START_TIME) / 1000), timestamp: new Date().toISOString() });
});

app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json({
    success: true, data: {
      name: config.serviceName, description: 'RABTUL SLA Monitor - Tracks Service Level Agreements', version: config.version,
      features: ['SLA definition with multiple targets', 'Metric collection (uptime, latency, throughput, error rate)', 'Uptime calculation', 'Latency percentiles (p50, p95, p99)', 'Threshold checking', 'Real-time alerting', 'SLA reports (daily, weekly, monthly)', 'Breach detection integration', 'Event-driven architecture'],
      endpoints: { sla: '/api/v1/sla', monitoring: '/api/v1/monitoring', reports: '/api/v1/reports', metrics: '/api/v1/metrics' },
    }, timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/sla', slaRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/metrics', metricsRoutes);

app.post('/api/v1/event', async (req: Request, res: Response, next: NextFunction) => {
  try { const { type, data } = req.body; logger.info(`[EVENT] ${type}`); res.json({ success: true, data: { eventId: uuidv4(), type, status: 'processed' }, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(`REZ-SLA-MONITOR running on port ${config.port}`);
    eventBus.publish('sla-monitor.ready', { service: 'rez-sla-monitor', port: config.port, version: config.version });
  });
}

export default app;
