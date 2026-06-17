import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import logger from './utils/logger.js';
import transcriptionRoutes from './routes/transcription.js';
import voicemailRoutes from './routes/voicemail.js';
import campaignRoutes from './routes/campaign.js';
import aiRoutes from './routes/ai.js';
import autonomousSDRRoutes from './routes/autonomousSDR.js';
import crmRoutes from './routes/crm.js';

const app = express();
const PORT = process.env.PORT || 4760;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'REZ-SalesMind',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/communication', transcriptionRoutes);
app.use('/api/voicemail', voicemailRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sdr', autonomousSDRRoutes);
app.use('/api/crm', crmRoutes);

// SDR-specific routes (legacy compatibility)
app.get('/api/sdr/dashboard', (req, res) => {
  res.json({
    activeWorkflows: 3,
    prospectsToday: 127,
    emailsSent: 89,
    responses: 12,
    meetingsBooked: 5,
    conversionRate: 8.5
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`REZ-SalesMind started on port ${PORT}`);
  logger.info(`Voice AI: ${PORT}`);
  logger.info(`GraphQL: ${PORT}/graphql`);
  logger.info(`Health: http://localhost:${PORT}/health`);
});

export default app;
