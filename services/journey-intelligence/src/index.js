import express from 'express';
import cors from 'cors';
import journeyRouter from './routes/journey.js';
import analyticsRouter from './routes/analytics.js';

const app = express();
const PORT = process.env.PORT || 4954;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
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
app.listen(PORT, () => {
  console.log(`Journey Intelligence Service running on port ${PORT}`);
});

export default app;
