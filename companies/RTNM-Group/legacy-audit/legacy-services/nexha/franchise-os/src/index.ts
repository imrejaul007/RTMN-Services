/**
 * NeXha FranchiseOS - Production Entry Point
 * Port: 4310
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { franchiseService, brandService, royaltyService } from './services/franchise.service.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4310', 10);
const SERVICE_NAME = 'nexha-franchise-os';

// Middleware
app.use(helmet(), cors(), compression(), express.json());

// Logging
app.use((req, _res, next) => {
  logger.info([${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health
app.get('/health', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# FranchiseOS metrics placeholder');
});

// Franchise Endpoints
app.post('/api/franchises', async (req, res) => {
  try {
    const franchise = await franchiseService.createFranchise(req.body);
    res.status(201).json({ success: true, data: franchise });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/franchises', async (req, res) => {
  try {
    const { brandId, status, city, limit, offset } = req.query;
    const result = await franchiseService.listFranchises({
      brandId: brandId as string,
      status: status as any,
      city: city as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/franchises/:id', async (req, res) => {
  try {
    const franchise = await franchiseService.getFranchise(req.params.id);
    if (!franchise) {
      return res.status(404).json({ success: false, error: 'Franchise not found' });
    }
    res.json({ success: true, data: franchise });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.patch('/api/franchises/:id', async (req, res) => {
  try {
    const franchise = await franchiseService.updateFranchise(req.params.id, req.body);
    if (!franchise) {
      return res.status(404).json({ success: false, error: 'Franchise not found' });
    }
    res.json({ success: true, data: franchise });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/franchises/:id/activate', async (req, res) => {
  try {
    const franchise = await franchiseService.activateFranchise(req.params.id);
    if (!franchise) {
      return res.status(404).json({ success: false, error: 'Franchise not found' });
    }
    res.json({ success: true, data: franchise });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/franchises/:id/suspend', async (req, res) => {
  try {
    const franchise = await franchiseService.suspendFranchise(req.params.id, req.body.reason);
    if (!franchise) {
      return res.status(404).json({ success: false, error: 'Franchise not found' });
    }
    res.json({ success: true, data: franchise });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/franchises/:id/performance', async (req, res) => {
  try {
    const franchise = await franchiseService.updatePerformance(req.params.id, req.body);
    if (!franchise) {
      return res.status(404).json({ success: false, error: 'Franchise not found' });
    }
    res.json({ success: true, data: franchise });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Brand Endpoints
app.post('/api/brands', async (req, res) => {
  try {
    const brand = await brandService.createBrand(req.body);
    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/brands', async (_req, res) => {
  try {
    const brands = await brandService.listBrands();
    res.json({ success: true, data: brands });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/brands/:id', async (req, res) => {
  try {
    const brand = await brandService.getBrand(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }
    res.json({ success: true, data: brand });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/brands/:id/stats', async (req, res) => {
  try {
    const stats = await brandService.getBrandStats(req.params.id);
    if (!stats) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Royalty Endpoints
app.post('/api/franchises/:id/royalty/calculate', async (req, res) => {
  try {
    const period = {
      start: req.body.start ? new Date(req.body.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: req.body.end ? new Date(req.body.end) : new Date(),
    };
    const calculation = await royaltyService.calculateRoyalty(req.params.id, period);
    if (!calculation) {
      return res.status(404).json({ success: false, error: 'Franchise not found or no royalty config' });
    }
    res.json({ success: true, data: calculation });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/royalty', async (req, res) => {
  try {
    const { franchiseId, status } = req.query;
    const calculations = await royaltyService.getCalculations({
      franchiseId: franchiseId as string,
      status: status as any,
    });
    res.json({ success: true, data: calculations });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/royalty/:id/pay', async (req, res) => {
  try {
    const calculation = await royaltyService.markPaid(req.params.id);
    if (!calculation) {
      return res.status(404).json({ success: false, error: 'Calculation not found' });
    }
    res.json({ success: true, data: calculation });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Webhook
app.post('/webhooks/:partner', async (req, res) => {
  logger.info([FranchiseOS] Webhook from ${req.params.partner}:`, req.body);
  res.json({ success: true, action: 'acknowledged' });
});

// Start
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(JSON.stringify({ type: 'error', error: err.message, requestId: (req as any).requestId }));
  res.status(500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message, timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(\nNeXha FranchiseOS - Port ${PORT}\n`);
});

export default app;
