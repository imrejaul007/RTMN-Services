/**
 * HOJAI ProcurementOS
 * Port: 5275
 * Purchase requests, quotes, purchase orders
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import winston from 'winston';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const PORT = process.env.PORT || 5275;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/procurement';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'error.log' })]
});

mongoose.connect(MONGO_URI).then(() => logger.info('MongoDB Connected')).catch(e => logger.error(e));

// Purchase Request Schema
const PurchaseRequestSchema = new mongoose.Schema({
  prId: String,
  companyId: String,
  requestedBy: String,
  department: String,
  items: [{
    name: String,
    quantity: Number,
    unit: String,
    estimatedCost: Number
  }],
  totalAmount: Number,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected', 'po_created'], default: 'draft' }
}, { timestamps: true });

// Quote Schema
const QuoteSchema = new mongoose.Schema({
  quoteId: String,
  prId: String,
  vendorId: String,
  vendorName: String,
  companyId: String,
  items: [{ name: String, quantity: Number, unitPrice: Number, total: Number }],
  subtotal: Number,
  tax: Number,
  total: Number,
  deliveryTime: String,
  status: { type: String, enum: ['submitted', 'accepted', 'rejected'], default: 'submitted' }
}, { timestamps: true });

// Purchase Order Schema
const PurchaseOrderSchema = new mongoose.Schema({
  poId: String,
  prId: String,
  companyId: String,
  vendorId: String,
  vendorName: String,
  items: [{ name: String, quantity: Number, unitPrice: Number, total: Number }],
  subtotal: Number,
  tax: Number,
  total: Number,
  status: { type: String, enum: ['created', 'sent', 'delivered', 'completed', 'cancelled'], default: 'created' },
  deliveryDate: Date
}, { timestamps: true });

const PurchaseRequest = mongoose.model('PurchaseRequest', PurchaseRequestSchema);
const Quote = mongoose.model('Quote', QuoteSchema);
const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'procurement-os', port: PORT });
});

// Purchase Requests
app.post('/api/purchase-requests', async (req, res) => {
  try {
    const prId = 'PR-' + Date.now();
    const pr = new PurchaseRequest({ prId, ...req.body });
    await pr.save();
    res.status(201).json({ success: true, data: pr });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/purchase-requests', async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = req.query.companyId;
    if (req.query.status) query.status = req.query.status;
    const requests = await PurchaseRequest.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.patch('/api/purchase-requests/:id/approve', async (req, res) => {
  try {
    const pr = await PurchaseRequest.findOneAndUpdate({ prId: req.params.id }, { status: 'approved' }, { new: true });
    res.json({ success: true, data: pr });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Quotes
app.post('/api/quotes', async (req, res) => {
  try {
    const quoteId = 'QT-' + Date.now();
    const quote = new Quote({ quoteId, ...req.body });
    await quote.save();
    res.status(201).json({ success: true, data: quote });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/quotes/pr/:prId', async (req, res) => {
  try {
    const quotes = await Quote.find({ prId: req.params.prId }).sort({ total: 1 });
    res.json({ success: true, data: quotes });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Purchase Orders
app.post('/api/purchase-orders', async (req, res) => {
  try {
    const poId = 'PO-' + Date.now();
    const po = new PurchaseOrder({ poId, ...req.body });
    await po.save();
    res.status(201).json({ success: true, data: po });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/purchase-orders', async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = req.query.companyId;
    if (req.query.status) query.status = req.query.status;
    const orders = await PurchaseOrder.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const { companyId } = req.query;
    const query = companyId ? { companyId } : {};
    const prCount = await PurchaseRequest.countDocuments(query);
    const poCount = await PurchaseOrder.countDocuments(query);
    res.json({ success: true, data: { prCount, poCount } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.listen(PORT, () => logger.info('HOJAI ProcurementOS running on port ' + PORT));

export default app;