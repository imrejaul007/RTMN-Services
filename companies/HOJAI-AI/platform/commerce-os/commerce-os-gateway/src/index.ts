/**
 * CommerceOS Gateway — Unified Commerce Platform
 * Port: 5400
 * Single entry point for all commerce services
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const PORT = parseInt(process.env.PORT || '5400', 10);
const SERVICE_NAME = 'commerce-os-gateway';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// === Health endpoints ===
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

// === Module registry endpoints ===
app.get('/api/modules', (req, res) => {
  res.json({
    modules: [
      { id: 'catalog', name: 'Catalog Engine', status: 'active' },
      { id: 'inventory', name: 'Inventory Engine', status: 'active' },
      { id: 'order', name: 'Order Engine', status: 'active' },
      { id: 'checkout', name: 'Checkout Engine', status: 'active' },
      { id: 'pricing', name: 'Pricing Engine', status: 'active' },
      { id: 'promotion', name: 'Promotion Engine', status: 'active' },
      { id: 'loyalty', name: 'Loyalty Engine', status: 'active' },
      { id: 'recommendation', name: 'Recommendation Engine', status: 'active' },
      { id: 'subscription', name: 'Subscription Engine', status: 'active' },
    ],
    timestamp: new Date().toISOString(),
  });
});

// === API Documentation ===
app.get('/api', (req, res) => {
  res.json({
    service: 'CommerceOS Gateway',
    version: '1.0.0',
    description: 'Unified commerce platform gateway',
    endpoints: {
      catalog: '/api/catalog',
      inventory: '/api/inventory',
      order: '/api/order',
      checkout: '/api/checkout',
      pricing: '/api/pricing',
      promotion: '/api/promotion',
      loyalty: '/api/loyalty',
      recommendation: '/api/recommendation',
      subscription: '/api/subscription',
    },
    timestamp: new Date().toISOString(),
  });
});

// === Proxy all commerce routes ===
app.use('/api/catalog', require('./routes/catalog.js'));
app.use('/api/inventory', require('./routes/inventory.js'));
app.use('/api/order', require('./routes/order.js'));
app.use('/api/checkout', require('./routes/checkout.js'));
app.use('/api/pricing', require('./routes/pricing.js'));
app.use('/api/promotion', require('./routes/promotion.js'));
app.use('/api/loyalty', require('./routes/loyalty.js'));
app.use('/api/recommendation', require('./routes/recommendation.js'));
app.use('/api/subscription', require('./routes/subscription.js'));

// === 404 handler ===
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` },
    timestamp: new Date().toISOString(),
  });
});

// === Error handler ===
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[Error] ${err.message}`);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message },
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`✅ CommerceOS Gateway running on port ${PORT}`);
  console.log(`   Modules: catalog, inventory, order, checkout, pricing, promotion, loyalty, recommendation, subscription`);
});

export default app;
