import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { eventBus } from './utils/eventBus';
import breachRoutes from './routes/breach';
import detectionRoutes from './routes/detection';
import incidentRoutes from './routes/incidents';
import remediationRoutes from './routes/remediation';

const app = express();
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: config.serviceName, version: config.version, environment: config.environment, uptime: Math.floor((Date.now() - START_TIME) / 1000), timestamp: new Date().toISOString() });
});

app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json({
    success: true, data: {
      name: config.serviceName, description: 'RABTUL Breach Detector - Real-time SLA breach detection and remediation', version: config.version,
      features: ['Threshold-based detection', 'Anomaly detection (z-score)', 'Spike detection (3x baseline)', 'Pattern recognition', 'Sustained degradation detection', 'Auto-remediation by severity', 'Multi-channel notifications (email, Slack, PagerDuty, webhook, SMS)', 'Incident management', 'Root cause analysis', 'Event stream (SSE)', 'Event-driven architecture'],
      endpoints: { breach: '/api/v1/breach', detection: '/api/v1/detection', incident: '/api/v1/incident', remediation: '/api/v1/remediation' },
    }, timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/breach', breachRoutes);
app.use('/api/v1/detection', detectionRoutes);
app.use('/api/v1/incident', incidentRoutes);
app.use('/api/v1/remediation', remediationRoutes);

app.post('/api/v1/event', async (req: Request, res: Response, next: NextFunction) => {
  try { const { type, data } = req.body; logger.info(`[EVENT] ${type}`); res.json({ success: true, data: { eventId: uuidv4(), type, status: 'processed' }, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(`REZ-BREACH-DETECTOR running on port ${config.port}`);
    eventBus.publish('breach-detector.ready', { service: 'rez-breach-detector', port: config.port, version: config.version });
  });
}

export default app;
