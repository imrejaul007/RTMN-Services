/**
 * NeXha ManufacturingOS - Production Entry Point
 * Port: 4330
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { bomService, productionService, qualityService, mrpService } from './services/manufacturing.service.js';

dotenv.config();
const app = express();
const PORT = parseInt(process.env.PORT || '4330', 10);
const SERVICE_NAME = 'nexha-manufacturing-os';

app.use(helmet(), cors(), express.json());

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
  res.send('# ManufacturingOS metrics placeholder');
});

// BOM
app.post('/api/boms', async (req, res) => {
  try {
    const bom = await bomService.createBOM(req.body);
    res.status(201).json({ success: true, data: bom });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/boms/:id', async (req, res) => {
  try {
    const bom = await bomService.getBOM(req.params.id);
    if (!bom) return res.status(404).json({ success: false, error: 'BOM not found' });
    res.json({ success: true, data: bom });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/boms/product/:productId', async (req, res) => {
  try {
    const bom = await bomService.getBOMByProduct(req.params.productId);
    if (!bom) return res.status(404).json({ success: false, error: 'BOM not found for product' });
    res.json({ success: true, data: bom });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Production
app.post('/api/production/orders', async (req, res) => {
  try {
    const order = await productionService.createOrder(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/production/orders/:id/start', async (req, res) => {
  try {
    const order = await productionService.startProduction(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/production/orders/:id/complete', async (req, res) => {
  try {
    const batch = await productionService.completeProduction(req.params.id, req.body.quantity);
    if (!batch) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/production/orders', async (req, res) => {
  try {
    const orders = await productionService.getOrders({ status: req.query.status as any });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Quality
app.post('/api/batches/:id/quality-check', async (req, res) => {
  try {
    const batch = await qualityService.addQualityCheck(
      req.params.id,
      req.body.check,
      req.body.result,
      req.body.notes
    );
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/batches/:id/approve', async (req, res) => {
  try {
    const batch = await qualityService.approveBatch(req.params.id);
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/batches/:id/release', async (req, res) => {
  try {
    const batch = await qualityService.releaseBatch(req.params.id);
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// MRP
app.get('/api/mrp/requirements/:productId', async (req, res) => {
  try {
    const requirements = await mrpService.calculateRequirements(
      req.params.productId,
      parseInt(req.query.quantity as string) || 1
    );
    res.json({ success: true, data: requirements });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(JSON.stringify({ type: 'error', error: err.message, requestId: (req as any).requestId }));
  res.status(500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message, timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(\nNeXha ManufacturingOS - Port ${PORT}\n`);
});

export default app;
