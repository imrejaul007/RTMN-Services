import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import dashboardsRouter from './routes/dashboards';
import widgetsRouter from './routes/widgets';
import analyticsRouter from './routes/analytics';
import { Dashboard } from './models/Dashboard';
import { Widget } from './models/Widget';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4988;

// Logger setup
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Initialize in-memory stores
Dashboard.initialize();
Widget.initialize();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics-dashboard',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/dashboards', dashboardsRouter);
app.use('/api/widgets', widgetsRouter);
app.use('/api/analytics', analyticsRouter);

// Dashboard summary endpoint
app.get('/api/summary', (req, res) => {
  const dashboards = Dashboard.getAll();
  const widgets = Widget.getAll();

  const summary = {
    totalDashboards: dashboards.length,
    totalWidgets: widgets.length,
    widgetsByType: widgets.reduce((acc, w) => {
      acc[w.type] = (acc[w.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentDashboards: dashboards.slice(0, 5).map(d => ({
      id: d.id,
      name: d.name,
      widgetCount: widgets.filter(w => w.dashboardId === d.id).length
    }))
  };

  res.json(summary);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Analytics Dashboard Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API Summary: http://localhost:${PORT}/api/summary`);
});

export default app;
