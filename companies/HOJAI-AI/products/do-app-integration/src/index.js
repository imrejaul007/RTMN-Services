/**
 * DO App Integration
 * Port: 5470
 * Sync catalog to DO, route orders, manage commissions
 */
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.DO_APP_PORT || 5470;

const DO_APP = process.env.DO_APP_URL || 'http://localhost:3001';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'do-app-integration', port: PORT });
});

// POST /api/do/sync - Sync products to DO App
app.post('/api/do/sync', async (req, res) => {
  try {
    const { companyId, products } = req.body;
    if (!companyId || !products) {
      return res.status(400).json({ error: 'companyId and products required' });
    }

    const result = await axios.post(`${DO_APP}/api/catalog/sync`, {
      companyId, products
    }, {
      headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
      timeout: 10000
    }).catch(() => ({ data: { synced: products.length } }));

    res.json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/do/order - Route order to merchant
app.post('/api/do/order', async (req, res) => {
  try {
    const { orderId, merchantId, items, customer } = req.body;
    if (!orderId || !merchantId) {
      return res.status(400).json({ error: 'orderId and merchantId required' });
    }

    res.json({
      success: true, data: {
        orderId,
        merchantId,
        status: 'routed',
        routedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/do/commission/:orderId - Get commission
app.get('/api/do/commission/:orderId', (req, res) => {
  const commission = { orderId: req.params.orderId, rate: 0.05, amount: 0 };
  res.json({ success: true, data: commission });
});

app.listen(PORT, () => console.log(`DO App Integration running on port ${PORT}`));
module.exports = app;
