import express from 'express';
import helmet from 'helmet';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import journeyRouter from './routes/journey.js';
import analyticsRouter from './routes/analytics.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4954;

// Middleware
app.use(cors());
app.use(express.json());


app.use(helmet());

app.use(requireAuth);// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'journey-intelligence', port: PORT });
});

// Routes
app.use('/journey', journeyRouter);
app.use('/analytics', analyticsRouter);

// Overview endpoint at root level
app.get('/overview', (req, res) => {
  res.json({
    success: true,
    totalLeads: 1247,
    qualifiedLeads: 423,
    openDeals: 89,
    revenue: 2450000,
    conversionRate: 12.5,
    avgTimeToConvert: 14.5,
    activeCampaigns: 12
  });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


export default app;

// Only start server when run directly (skip in test mode)
if (process.env.NODE_ENV !== 'test' && process.env.KG_SKIP_AUTO_LISTEN !== 'true') {
  const server = app.listen(PORT, () => {
    console.log(`Journey Intelligence Service running on port ${PORT}`);
  });
  installGracefulShutdown(server);
}
