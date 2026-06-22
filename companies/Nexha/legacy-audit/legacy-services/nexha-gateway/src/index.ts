/**
 * Nexha Gateway - Unified API for Commerce Network
 * Port: 5002
 *
 * This gateway provides a unified API entry point for all Nexha services,
 * routing requests to the appropriate OS service based on the endpoint.
 *
 * Connected Services:
 * - DistributionOS (4300) - Distributor management
 * - FranchiseOS (4310) - Franchise operations
 * - ProcurementOS (4320) - Supplier & RFQ
 * - ManufacturingOS (4330) - Production & BOM
 * - TradeFinance (4340) - BNPL, credit lines
 * - Intelligence (4350) - AI predictions
 * - Connector (4399) - Event bus
 *
 * @version 1.0.0
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import axios, { AxiosError } from 'axios';
import promClient from 'prom-client';
import { randomUUID } from 'crypto';
import { createLogger } from '../../shared/logger.js';

// Logger
const logger = createLogger('nexha-gateway');

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const requestsCounter = new promClient.Counter({
  name: 'nexha_gateway_requests_total',
  help: 'Total gateway requests',
  labelNames: ['service', 'method', 'status']
});
register.registerMetric(requestsCounter);

const latencyHistogram = new promClient.Histogram({
  name: 'nexha_gateway_latency_ms',
  help: 'Gateway request latency',
  labelNames: ['service'],
  buckets: [10, 50, 100, 200, 500, 1000, 5000]
});
register.registerMetric(latencyHistogram);

dotenv.config();

// Service URLs configuration
const SERVICE_URLS = {
  distribution: process.env.DISTRIBUTION_OS_URL || 'http://localhost:4300',
  franchise: process.env.FRANCHISE_OS_URL || 'http://localhost:4310',
  procurement: process.env.PROCUREMENT_OS_URL || 'http://localhost:4320',
  manufacturing: process.env.MANUFACTURING_OS_URL || 'http://localhost:4330',
  finance: process.env.TRADE_FINANCE_URL || 'http://localhost:4340',
  intelligence: process.env.INTELLIGENCE_URL || 'http://localhost:4350',
  connector: process.env.CONNECTOR_URL || 'http://localhost:4399',
  hojai: process.env.HOJAI_BRIDGE_URL || 'http://localhost:5140',
};

// Express app
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(helmet());
app.use(compression());

// Request logging + distributed tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  const traceId = (req.headers['x-trace-id'] as string) || randomUUID();
  req.headers['x-trace-id'] = traceId;
  res.setHeader('x-trace-id', traceId);
  logger.info(`[Gateway] ${req.method} ${req.path}`, { traceId });
  next();
});

// ============================================================================
// Proxy Helper — forwards Authorization + trace headers to backend services
// ============================================================================

interface ProxyOptions {
  timeout?: number;
  requireAuth?: boolean;
}

async function proxyRequest(
  req: Request,
  res: Response,
  targetUrl: string,
  options: ProxyOptions = {}
): Promise<void> {
  const { timeout = 10000, requireAuth = true } = options;
  const start = Date.now();
  const traceId = req.headers['x-trace-id'] as string;

  // Build headers — always forward trace ID, forward auth if present
  const headers: Record<string, string> = {
    'x-trace-id': traceId,
    'Content-Type': 'application/json',
  };

  if (requireAuth && req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }

  try {
    const response = await axios({
      method: req.method as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers,
      timeout,
    });

    const latency = Date.now() - start;
    logger.info(`[Gateway] ${req.method} ${req.path} → ${targetUrl} [${response.status}] ${latency}ms`, { traceId });
    res.status(response.status).json(response.data);
  } catch (error) {
    const latency = Date.now() - start;
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      // Backend returned an error — pass it through
      const { status, data } = axiosError.response;
      logger.warn(`[Gateway] ${req.method} ${req.path} → ${targetUrl} [${status}] ${latency}ms`, { traceId });
      res.status(status).json(data);
    } else if (axiosError.code === 'ECONNABORTED') {
      logger.error(`[Gateway] ${req.method} ${req.path} → ${targetUrl} [TIMEOUT] ${latency}ms`, { traceId });
      res.status(504).json({ error: 'Gateway timeout', code: 'GATEWAY_TIMEOUT', traceId });
    } else {
      logger.error(`[Gateway] ${req.method} ${req.path} → ${targetUrl} [ERROR] ${latency}ms`, { traceId, error: axiosError.message });
      res.status(502).json({ error: 'Bad gateway', code: 'BAD_GATEWAY', traceId });
    }
  }
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'nexha-gateway',
    version: '1.0.0',
    status: 'healthy',
    port: 5002,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      distribution: SERVICE_URLS.distribution,
      franchise: SERVICE_URLS.franchise,
      procurement: SERVICE_URLS.procurement,
      manufacturing: SERVICE_URLS.manufacturing,
      finance: SERVICE_URLS.finance,
      intelligence: SERVICE_URLS.intelligence,
      connector: SERVICE_URLS.connector
    }
  });
});

// Metrics
app.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// ============================================
// SERVICE STATUS
// ============================================

app.get('/api/status/services', async (req: Request, res: Response) => {
  const services = [
    { id: 'distribution', name: 'DistributionOS', port: 4300 },
    { id: 'franchise', name: 'FranchiseOS', port: 4310 },
    { id: 'procurement', name: 'ProcurementOS', port: 4320 },
    { id: 'manufacturing', name: 'ManufacturingOS', port: 4330 },
    { id: 'finance', name: 'TradeFinance', port: 4340 },
    { id: 'intelligence', name: 'Intelligence', port: 4350 },
    { id: 'connector', name: 'Connector', port: 4399 }
  ];

  const results = await Promise.all(
    services.map(async (service) => {
      const start = Date.now();
      try {
        await axios.get(`${SERVICE_URLS[service.id as keyof typeof SERVICE_URLS]}/health`, { timeout: 3000 });
        return { ...service, status: 'online', responseTime: Date.now() - start };
      } catch {
        return { ...service, status: 'offline', responseTime: null };
      }
    })
  );

  const online = results.filter(r => r.status === 'online').length;
  res.json({
    gateway: 'nexha-gateway',
    port: 5002,
    services: results,
    summary: { total: results.length, online, offline: results.length - online },
    timestamp: new Date().toISOString()
  });
});

// ============================================
// DISTRIBUTION OS (4300)
// ============================================

app.get('/api/distributors', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/distributors`));
app.post('/api/distributors', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/distributors`));
app.get('/api/distributors/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/distributors/${req.params.id}`));
app.post('/api/distributors/:id/activate', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/distributors/${req.params.id}/activate`));
app.post('/api/distributors/:id/suspend', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/distributors/${req.params.id}/suspend`));
app.get('/api/distributors/:id/performance', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/distributors/${req.params.id}/performance`));

// Routes
app.get('/api/routes', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/routes`));
app.post('/api/routes', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/routes`));
app.get('/api/routes/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/routes/${req.params.id}`));
app.post('/api/routes/:id/stops/:seq', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/routes/${req.params.id}/stops/${req.params.seq}`));

// Van Sales
app.get('/api/van-sales', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/van-sales`));
app.post('/api/van-sales', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/van-sales`));
app.get('/api/van-sales/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/van-sales/${req.params.id}`));
app.post('/api/van-sales/:id/start', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/van-sales/${req.params.id}/start`));
app.post('/api/van-sales/:id/complete', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/van-sales/${req.params.id}/complete`));

// Collections
app.post('/api/collections', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/collections`));
app.get('/api/collections', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/collections`));

// Returns
app.post('/api/returns', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/returns`));
app.get('/api/returns', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/returns`));
app.get('/api/returns/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/returns/${req.params.id}`));
app.post('/api/returns/:id/approve', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/returns/${req.params.id}/approve`));
app.post('/api/returns/:id/reject', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.distribution}/api/returns/${req.params.id}/reject`));

// Van Sales
app.post('/api/van-sales', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICE_URLS.distribution}/api/van-sales`, req.body, { timeout: 10000 });
    res.status(201).json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create van sale' });
  }
});

// ============================================
// FRANCHISE OS (4310)
// ============================================

app.get('/api/franchises', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises`));
app.post('/api/franchises', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises`));
app.get('/api/franchises/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}`));
app.patch('/api/franchises/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}`));
app.post('/api/franchises/:id/activate', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/activate`));
app.post('/api/franchises/:id/suspend', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/suspend`));
app.get('/api/franchises/:id/performance', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/performance`));
app.patch('/api/franchises/:id/performance', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/performance`));

// Brands
app.get('/api/brands', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/brands`));
app.post('/api/brands', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/brands`));
app.get('/api/brands/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/brands/${req.params.id}`));

// Compliance
app.get('/api/franchises/:id/compliance', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/compliance`));
app.post('/api/franchises/:id/compliance/audit', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/compliance/audit`));
app.get('/api/franchises/:id/compliance/violations', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/compliance/violations`));
app.post('/api/franchises/:id/compliance/violations', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/compliance/violations`));

// Royalty
app.get('/api/franchises/:id/royalty', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/royalty`));
app.post('/api/franchises/:id/royalty/calculate', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/royalty/calculate`));

app.post('/api/brands', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICE_URLS.franchise}/api/brands`, req.body, { timeout: 10000 });
    res.status(201).json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// Royalty
app.post('/api/franchises/:id/royalty/calculate', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.franchise}/api/franchises/${req.params.id}/royalty/calculate`));

// ============================================
// PROCUREMENT OS (4320)
// ============================================

app.get('/api/suppliers', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/suppliers`));
app.post('/api/suppliers/register', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/suppliers/register`));
app.get('/api/suppliers/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/suppliers/${req.params.id}`));
app.patch('/api/suppliers/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/suppliers/${req.params.id}`));

// Capability matching
app.get('/api/suppliers/:id/capabilities', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/suppliers/${req.params.id}/capabilities`));
app.post('/api/suppliers/:id/capabilities', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/suppliers/${req.params.id}/capabilities`));
app.get('/api/suppliers/match', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/suppliers/match`));

// Marketplace
app.get('/api/marketplace/products', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/marketplace/products`));
app.get('/api/marketplace/products/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/marketplace/products/${req.params.id}`));

// RFQs
app.get('/api/rfqs', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/rfqs`));
app.post('/api/rfqs', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/rfqs`));
app.get('/api/rfqs/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/rfqs/${req.params.id}`));
app.post('/api/rfqs/:id/quotes', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/rfqs/${req.params.id}/quotes`));
app.get('/api/rfqs/:id/quotes/compare', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/rfqs/${req.params.id}/quotes/compare`));
app.post('/api/rfqs/:id/award', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/rfqs/${req.params.id}/award`));

// Purchase Orders
app.get('/api/orders', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/orders`));
app.get('/api/orders/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/orders/${req.params.id}`));
app.patch('/api/orders/:id/status', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.procurement}/api/orders/${req.params.id}/status`));

// ============================================
// MANUFACTURING OS (4330)
// ============================================

app.get('/api/boms', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/boms`));
app.post('/api/boms', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/boms`));
app.get('/api/boms/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/boms/${req.params.id}`));
app.patch('/api/boms/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/boms/${req.params.id}`));

// Production Orders
app.get('/api/production/orders', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/production/orders`));
app.post('/api/production/orders', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/production/orders`));
app.get('/api/production/orders/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/production/orders/${req.params.id}`));
app.post('/api/production/orders/:id/start', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/production/orders/${req.params.id}/start`));
app.post('/api/production/orders/:id/complete', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/production/orders/${req.params.id}/complete`));

// Quality Checks
app.get('/api/batches/:id/quality', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/batches/${req.params.id}/quality`));
app.post('/api/batches/:id/quality', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/batches/${req.params.id}/quality`));

// MRP
app.get('/api/mrp/:productId', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.manufacturing}/api/mrp/${req.params.productId}`));

// ============================================
// TRADE FINANCE (4340)
// ============================================

app.post('/api/credits/apply', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/credits/apply`));
app.get('/api/credits', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/credits`));
app.get('/api/credits/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/credits/${req.params.id}`));
app.post('/api/credits/:id/approve', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/credits/${req.params.id}/approve`));
app.post('/api/credits/:id/reject', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/credits/${req.params.id}/reject`));
app.post('/api/credits/:id/use', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/credits/${req.params.id}/use`));

// BNPL
app.post('/api/bnpl/create', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/bnpl/create`));
app.get('/api/bnpl/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/bnpl/${req.params.id}`));
app.post('/api/bnpl/:id/pay', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/bnpl/${req.params.id}/pay`));

// Loans
app.post('/api/loans/apply', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/loans/apply`));
app.get('/api/loans/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/loans/${req.params.id}`));

// FX / Currency Conversion
app.get('/api/fx/rates', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/fx/rates`));
app.post('/api/fx/convert', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/fx/convert`));

// Disputes
app.post('/api/disputes', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/disputes`));
app.get('/api/disputes/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/disputes/${req.params.id}`));
app.post('/api/disputes/:id/resolve', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.finance}/api/disputes/${req.params.id}/resolve`));

// ============================================
// INTELLIGENCE (4350)
// ============================================

app.post('/api/predict/demand', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.intelligence}/api/predict/demand`, { timeout: 15000 }));
app.post('/api/predict/reorder', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.intelligence}/api/predict/reorder`, { timeout: 15000 }));
app.post('/api/score/supplier', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.intelligence}/api/score/supplier`, { timeout: 15000 }));
app.get('/api/intelligence/territory/:id', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.intelligence}/api/intelligence/territory/${req.params.id}`));
app.post('/api/intelligence/fraud', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.intelligence}/api/intelligence/fraud`, { timeout: 15000 }));
app.get('/api/intelligence/churn/:entityType/:entityId', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.intelligence}/api/intelligence/churn/${req.params.entityType}/${req.params.entityId}`));
  const start = Date.now();
  try {
    const response = await axios.post(`${SERVICE_URLS.intelligence}/api/predict/demand`, req.body, { timeout: 15000 });
    latencyHistogram.labels('intelligence').observe(Date.now() - start);
    requestsCounter.inc({ service: 'intelligence', method: 'post', status: 'success' });
    res.json(response.data);
  } catch (error) {
    requestsCounter.inc({ service: 'intelligence', method: 'post', status: 'error' });
    res.status(500).json({ error: 'Failed to get demand prediction' });
  }
});

app.post('/api/predict/reorder', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICE_URLS.intelligence}/api/predict/reorder`, req.body, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get reorder recommendation' });
  }
});

app.post('/api/score/supplier', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${SERVICE_URLS.intelligence}/api/score/supplier`, req.body, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to score supplier' });
  }
});

// ============================================
// CONNECTOR / EVENTS (4399)
// ============================================

app.post('/api/events/demand', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.connector}/api/events/demand`));
app.post('/api/events/order', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.connector}/api/events/order`));
app.post('/api/events/inventory', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.connector}/api/events/inventory`));
app.get('/api/events/history', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.connector}/api/events/history`));

// ============================================
// HOJAI INTEGRATION
// ============================================

app.get('/api/hojai/products', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.hojai}/api/products`));
app.get('/api/hojai/status', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.hojai}/api/services/status`));
app.get('/api/insights/cross-product', (req, res) => proxyRequest(req, res, `${SERVICE_URLS.hojai}/api/insights/cross-product`, { timeout: 15000 }));

// ============================================
// COMPANY-SPECIFIC ENDPOINTS
// ============================================

app.get('/api/company/:companyId/overview', (req, res) => {
  const { companyId } = req.params;
  const start = Date.now();
  const traceId = req.headers['x-trace-id'] as string;
  const headers: Record<string, string> = {
    'x-trace-id': traceId,
    'Content-Type': 'application/json',
  };
  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }

  Promise.allSettled([
    axios.get(`${SERVICE_URLS.franchise}/api/franchises`, { params: { companyId }, headers, timeout: 5000 }),
    axios.get(`${SERVICE_URLS.distribution}/api/distributors`, { params: { companyId }, headers, timeout: 5000 }),
    axios.get(`${SERVICE_URLS.procurement}/api/suppliers`, { params: { companyId }, headers, timeout: 5000 }),
    axios.get(`${SERVICE_URLS.finance}/api/credits`, { params: { companyId }, headers, timeout: 5000 }),
  ]).then(([franchise, distribution, procurement, finance]) => {
    res.json({
      companyId,
      franchise: franchise.status === 'fulfilled' ? franchise.value.data : null,
      distribution: distribution.status === 'fulfilled' ? distribution.value.data : null,
      procurement: procurement.status === 'fulfilled' ? procurement.value.data : null,
      finance: finance.status === 'fulfilled' ? finance.value.data : null,
      fetchTime: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  }).catch((err: Error) => {
    logger.error('[Gateway] Company overview error:', err);
    res.status(500).json({ error: 'Failed to get company overview' });
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('[Gateway Error]', err);
  requestsCounter.inc({ service: 'gateway', method: req.method as string, status: 'error' });
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '5002');
const HOST = process.env.HOST || '0.0.0.0';

app.listen(Number(PORT), HOST, () => {
  logger.info(`Nexha Gateway running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
});

export default app;