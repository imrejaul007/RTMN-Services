/**
 * AI HR Manager
 * Recruitment, onboarding, performance
 */
import express from 'express';
import mongoose from 'mongoose';
const app = express();
app.use(express.json({ limit: "10kb" }));

const Candidate = mongoose.model('Candidate', new mongoose.Schema({
  candidateId: String,
  tenantId: String,
  name: String,
  role: String,
  status: String
}));

app.post('/recruit', async (req, res) => {
  const c = new Candidate({ candidateId: `CAND-${Date.now()}`, ...req.body, status: 'new' });
  await c.save();
  res.json({ candidateId: c.candidateId });
});

mongoose.connect('mongodb://localhost:27017/hr-manager');


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hr-manager',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe (for Kubernetes)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe (for Kubernetes)
app.get('/health/ready', async (req, res) => {
  try {
    // Add readiness checks here (DB connection, etc.)
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
app.listen(4910, () => console.log('AI HR Manager: 4910'));
