/**
 * AI Collections Manager - Receivables, follow-ups
 */
import express from 'express';
import mongoose from 'mongoose';
const app = express();
app.use(express.json({ limit: "10kb" }));

const Receivable = mongoose.model('Receivable', new mongoose.Schema({
  receivableId: String,
  tenantId: String,
  customer: String,
  amount: Number,
  dueDate: Date,
  status: String,
  followUps: Number
}));

const FollowUp = mongoose.model('FollowUp', new mongoose.Schema({
  followUpId: String,
  receivableId: String,
  tenantId: String,
  channel: String,
  message: String,
  date: Date
}));

// Get aging report
app.get('/aging/:tenantId', async (req, res) => {
  const receivables = await Receivable.find({ tenantId: req.params.tenantId });
  const aging = {
    current: receivables.filter(r => r.dueDate > new Date()).reduce((s, r) => s + r.amount, 0),
    overdue30: receivables.filter(r => {
      const days = (new Date() - r.dueDate) / (1000 * 60 * 60 * 24);
      return days > 0 && days <= 30;
    }).reduce((s, r) => s + r.amount, 0),
    overdue60: receivables.filter(r => {
      const days = (new Date() - r.dueDate) / (1000 * 60 * 60 * 24);
      return days > 30 && days <= 60;
    }).reduce((s, r) => s + r.amount, 0),
    overdue90: receivables.filter(r => {
      const days = (new Date() - r.dueDate) / (1000 * 60 * 60 * 24);
      return days > 60;
    }).reduce((s, r) => s + r.amount, 0)
  };
  res.json({ aging });
});

// Send follow-up
app.post('/follow-up', async (req, res) => {
  const { receivableId, channel, message } = req.body;
  const followUp = new FollowUp({
    followUpId: `FU-${Date.now()}`,
    receivableId,
    channel,
    message,
    date: new Date()
  });
  await followUp.save();
  res.json({ followUpId: followUp.followUpId });
});

mongoose.connect('mongodb://localhost:27017/finance-collections');


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'finance-collections',
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
app.listen(4904, () => console.log('AI Collections: 4904'));
