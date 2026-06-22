/**
 * HOJAI Finance Compliance AI
 * GST, TDS, Payroll compliance
 */
import express from 'express';
import mongoose from 'mongoose';

const app = express();
app.use(express.json({ limit: "10kb" }));

const ComplianceTask = mongoose.model('ComplianceTask', new mongoose.Schema({
  taskId: String,
  tenantId: String,
  type: String,
  dueDate: Date,
  status: String
}));

app.post('/gst/calculate', async (req, res) => {
  const { tenantId, invoices } = req.body;
  const gstPayable = invoices.reduce((s: number, i: any) => s + (i.gst || 0), 0);
  res.json({ gstPayable });
});

app.get('/tasks/:tenantId', async (req, res) => {
  const tasks = await ComplianceTask.find({ tenantId: req.params.tenantId });
  res.json({ tasks });
});

mongoose.connect('mongodb://localhost:27017/compliance');


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'finance-compliance',
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
app.listen(4902, () => console.log('Finance Compliance: 4902'));
