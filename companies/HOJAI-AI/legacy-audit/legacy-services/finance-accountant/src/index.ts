/**
 * HOJAI Finance Accountant AI
 * Invoice → Ledger → Tally
 */

import express from 'express';
import mongoose from 'mongoose';

const app = express();
app.use(express.json({ limit: "10kb" }));

const Invoice = mongoose.model('Invoice', new mongoose.Schema({
  invoiceId: String,
  tenantId: String,
  type: String,
  amount: Number,
  party: String,
  ledger: String,
  tallySync: Boolean
}));

const Ledger = mongoose.model('Ledger', new mongoose.Schema({
  entryId: String,
  tenantId: String,
  ledger: String,
  debit: Number,
  credit: Number,
  narration: String
}));

app.post('/invoice', async (req, res) => {
  const invoice = new Invoice({
    invoiceId: `INV-${Date.now()}`,
    ...req.body,
    tallySync: false
  });
  await invoice.save();
  res.json({ invoiceId: invoice.invoiceId });
});

app.get('/invoices/:tenantId', async (req, res) => {
  const invoices = await Invoice.find({ tenantId: req.params.tenantId });
  res.json({ invoices });
});

app.post('/ledger', async (req, res) => {
  const entry = new Ledger({
    entryId: `LED-${Date.now()}`,
    ...req.body
  });
  await entry.save();
  res.json({ entryId: entry.entryId });
});

app.get('/ledger/:tenantId/:name', async (req, res) => {
  const entries = await Ledger.find({
    tenantId: req.params.tenantId,
    ledger: req.params.name
  });
  res.json({ entries });
});

app.get('/tally/export/:tenantId', async (req, res) => {
  const entries = await Ledger.find({ tenantId: req.params.tenantId });
  const xml = entries.map(e =>
    `<LEDGER><NAME>${e.ledger}</NAME><AMOUNT>${e.credit - e.debit}</AMOUNT></LEDGER>`
  ).join('');
  res.json({ tallyXml: `<COLLECTIONS>${xml}</COLLECTIONS>` });
});

mongoose.connect('mongodb://localhost:27017/accountant');


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'finance-accountant',
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
app.listen(4901, () => console.log('Finance Accountant: 4901'));
