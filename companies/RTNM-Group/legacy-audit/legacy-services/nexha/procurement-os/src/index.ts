/**
 * NeXha ProcurementOS - Production Entry Point
 * Port: 4320
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { supplierService, marketplaceService, rfqService, orderService } from './services/procurement.service.js';

dotenv.config();
const app = express();
const PORT = parseInt(process.env.PORT || '4320', 10);
const SERVICE_NAME = 'nexha-procurement-os';

app.use(helmet(), cors(), compression(), express.json());

app.get('/health', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# ProcurementOS metrics placeholder');
});

// Suppliers
app.post('/api/suppliers', async (req, res) => {
  try {
    const supplier = await supplierService.registerSupplier(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await supplierService.searchSuppliers({
      category: req.query.category as string,
      verified: req.query.verified === 'true',
      minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
    });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const supplier = await supplierService.getSupplier(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Marketplace
app.get('/api/marketplace/products', async (req, res) => {
  try {
    const products = await marketplaceService.listProducts({
      category: req.query.category as string,
      inStock: req.query.inStock === 'true',
    });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// RFQ
app.post('/api/rfqs', async (req, res) => {
  try {
    const rfq = await rfqService.createRFQ(req.body.buyerId, req.body.buyerName, req.body);
    res.status(201).json({ success: true, data: rfq });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/rfqs/:id', async (req, res) => {
  try {
    const rfq = await rfqService.getRFQ(req.params.id);
    if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' });
    res.json({ success: true, data: rfq });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/rfqs/:id/open', async (req, res) => {
  try {
    const rfq = await rfqService.openRFQ(req.params.id);
    if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' });
    res.json({ success: true, data: rfq });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/rfqs/:id/quotes', async (req, res) => {
  try {
    const quote = await rfqService.submitQuote(
      req.params.id,
      req.body.supplierId,
      req.body.supplierName,
      req.body
    );
    if (!quote) return res.status(404).json({ success: false, error: 'RFQ not found' });
    res.status(201).json({ success: true, data: quote });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/rfqs/:id/award/:quoteId', async (req, res) => {
  try {
    const rfq = await rfqService.awardQuote(req.params.id, req.params.quoteId);
    if (!rfq) return res.status(404).json({ success: false, error: 'RFQ not found' });
    res.json({ success: true, data: rfq });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Orders
app.post('/api/orders/from-quote/:quoteId', async (req, res) => {
  try {
    const order = await orderService.createFromQuote(req.params.quoteId);
    if (!order) return res.status(404).json({ success: false, error: 'Quote not found' });
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/orders/:id/confirm', async (req, res) => {
  try {
    const order = await orderService.confirmOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const order = await orderService.updateStatus(req.params.id, req.body.status);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Webhook
app.post('/webhooks/:partner', async (req, res) => {
  logger.info([ProcurementOS] Webhook from ${req.params.partner}:`, req.body);
  res.json({ success: true, action: 'acknowledged' });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(JSON.stringify({ type: 'error', error: err.message, requestId: (req as any).requestId }));
  res.status(500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message, timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(\nNeXha ProcurementOS - Port ${PORT}\n`);
});

export default app;
