import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5175;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'lead-os-gateway', port: PORT });
});

app.get('/api', (req, res) => {
  res.json({ 
    name: 'LeadOS Gateway',
    version: '1.0.0',
    endpoints: {
      leads: 'GET /api/leads',
      score: 'POST /api/score/lead',
      qualify: 'POST /api/qualify/lead',
      discover: 'GET /api/discover/google',
      analytics: 'GET /api/analytics/overview'
    }
  });
});

// Import routes
import leadsRouter from './routes/leads.js';
import scoringRouter from './routes/scoring.js';
import qualificationRouter from './routes/qualification.js';
import discoveryRouter from './routes/discovery.js';
import analyticsRouter from './routes/analytics.js';
import enrichmentRouter from './routes/enrichment.js';
import outreachRouter from './routes/outreach.js';

app.use('/api/leads', leadsRouter);
app.use('/api/score', scoringRouter);
app.use('/api/qualify', qualificationRouter);
app.use('/api/discover', discoveryRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/enrich', enrichmentRouter);
app.use('/api/outreach', outreachRouter);

app.listen(PORT, () => {
  console.log(`LeadOS Gateway running on port ${PORT}`);
});
