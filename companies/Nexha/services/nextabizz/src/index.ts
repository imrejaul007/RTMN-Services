import express from 'express';
import { randomUUID } from 'crypto';
import logger from './utils/logger';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();
const PORT = process.env.PORT || 4006;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextabizz';

// Webhook from ReStopapa
interface InventoryWebhook {
  event: 'inventory.low_stock' | 'inventory.out_of_stock' | 'inventory.stock_updated';
  restaurantId: string;
  items: Array<{
    itemId: string;
    name: string;
    currentStock: number;
    minStock: number;
    unit: string;
  }>;
  timestamp: string;
}

// Vendor Schema
const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  contact: {
    email: String,
    phone: String,
    address: String,
  },
  rating: { type: Number, default: 0 },
  products: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// RFQ Schema
const rfqSchema = new mongoose.Schema({
  rfqId: { type: String, required: true, unique: true },
  restaurantId: { type: String, required: true },
  restaurantName: String,
  items: [{
    itemId: String,
    name: String,
    quantity: Number,
    unit: String,
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
  }],
  status: { type: String, enum: ['open', 'quoted', 'approved', 'completed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Purchase Order Schema
const purchaseOrderSchema = new mongoose.Schema({
  poId: { type: String, required: true, unique: true },
  rfqId: String,
  vendorId: mongoose.Schema.Types.ObjectId,
  vendorName: String,
  restaurantId: String,
  items: [{
    itemId: String,
    name: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
  }],
  totalAmount: Number,
  status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  deliveryDate: Date,
  createdAt: { type: Date, default: Date.now },
});

const Vendor = mongoose.model('Vendor', vendorSchema);
const RFQ = mongoose.model('RFQ', rfqSchema);
const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

// Webhook endpoint from ReStopapa
app.post('/api/v1/webhooks/inventory', async (req, res) => {
  try {
    const webhook: InventoryWebhook = req.body;

    logger.info(`[nextaBizz] Received webhook: ${webhook.event} from ${webhook.restaurantId}`);

    // Process based on event type
    switch (webhook.event) {
      case 'inventory.low_stock':
        await createRFQ(webhook, 'normal');
        break;
      case 'inventory.out_of_stock':
        await createRFQ(webhook, 'urgent');
        break;
      case 'inventory.stock_updated':
        logger.info('[nextaBizz] Inventory updated - logging for analytics');
        break;
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('[nextaBizz] Webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

async function createRFQ(webhook: InventoryWebhook, priority: 'normal' | 'urgent') {
  const rfqId = `RFQ-${Date.now()}-${randomUUID().replace(/-/g, '').substring(0, 4).toUpperCase()}`;

  const rfqItems = webhook.items
    .filter(item => item.currentStock < item.minStock)
    .map(item => ({
      itemId: item.itemId,
      name: item.name,
      quantity: Math.ceil((item.minStock - item.currentStock) * 1.5),
      unit: item.unit,
      priority,
    }));

  if (rfqItems.length === 0) {
    logger.info('[nextaBizz] No items below minimum stock');
    return;
  }

  const rfq = new RFQ({
    rfqId,
    restaurantId: webhook.restaurantId,
    restaurantName: `Restaurant ${webhook.restaurantId}`,
    items: rfqItems,
    status: 'open',
  });

  await rfq.save();
  logger.info(`[nextaBizz] Created RFQ: ${rfqId} with ${rfqItems.length} items (${priority})`);
}

// REST API Routes

// Vendors
app.get('/api/v1/vendors', async (req, res) => {
  const vendors = await Vendor.find({ isActive: true }).sort({ rating: -1 });
  res.json({ success: true, data: vendors });
});

app.post('/api/v1/vendors', async (req, res) => {
  const vendor = new Vendor(req.body);
  await vendor.save();
  res.status(201).json({ success: true, data: vendor });
});

// RFQs
app.get('/api/v1/rfq', async (req, res) => {
  const { restaurantId, status } = req.query;
  const filter: any = {};
  if (restaurantId) filter.restaurantId = restaurantId;
  if (status) filter.status = status;

  const rfqs = await RFQ.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: rfqs });
});

app.get('/api/v1/rfq/:id', async (req, res) => {
  const rfq = await RFQ.findOne({ rfqId: req.params.id });
  if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' });
  res.json({ success: true, data: rfq });
});

// Purchase Orders
app.get('/api/v1/orders', async (req, res) => {
  const { restaurantId, status } = req.query;
  const filter: any = {};
  if (restaurantId) filter.restaurantId = restaurantId;
  if (status) filter.status = status;

  const orders = await PurchaseOrder.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: orders });
});

app.post('/api/v1/orders', async (req, res) => {
  const poId = `PO-${Date.now()}-${randomUUID().replace(/-/g, '').substring(0, 4).toUpperCase()}`;
  const order = new PurchaseOrder({ ...req.body, poId });
  await order.save();
  res.status(201).json({ success: true, data: order });
});

app.put('/api/v1/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const order = await PurchaseOrder.findOneAndUpdate(
    { poId: req.params.id },
    { status, updatedAt: new Date() },
    { new: true }
  );
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
  res.json({ success: true, data: order });
});

// Inventory Status
app.get('/api/v1/inventory', async (req, res) => {
  const rfqs = await RFQ.find({ status: 'open' })
    .populate('items.itemId')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: rfqs });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'nextaBizz', timestamp: new Date().toISOString() });
});

// Start server
mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('✅ nextaBizz MongoDB connected');
    app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════╗
║  nextaBizz - B2B Procurement Platform      ║
║  Part of CorpPerks                         ║
║  Running on port ${PORT}                        ║
╚═══════════════════════════════════════════════╝
      `);
    });
  })
  .catch(err => {
    logger.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });
