/**
 * Product Federation
 * Port: 5468
 * Sync products/services to Nexus Discovery
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const app = express();
const PORT = process.env.PRODUCT_FEDERATION_PORT || 5468;

const NEXHA_DISCOVERY = process.env.NEXHA_DISCOVERY_URL || 'http://localhost:4272';
const NEXHA_REPUTATION = process.env.NEXHA_REPUTATION_URL || 'http://localhost:4271';

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'product-federation', port: PORT });
});

// POST /api/federation/sync - Sync products to Nexus
app.post('/api/federation/sync',requireAuth,  async (req, res) => {
  try {
    const { companyId, products } = req.body;
    if (!companyId || !products) {
      return res.status(400).json({ error: 'companyId and products required' });
    }

    const results = { synced: 0, failed: 0, errors: [] };

    for (const product of products.slice(0, 100)) {
      try {
        const nexusProduct = transformToNexusFormat(product, companyId);
        await axios.post(`${NEXHA_DISCOVERY}/api/discovery/products`, nexusProduct, { timeout: 5000 });
        results.synced++;
      } catch (e) {
        results.failed++;
        results.errors.push({ productId: product.id, error: e.message });
      }
    }

    res.json({ success: true, data: { companyId, ...results, timestamp: new Date().toISOString() } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/federation/status/:companyId - Federation status
app.get('/api/federation/status/:companyId', (req, res) => {
  res.json({ success: true, data: { companyId: req.params.companyId, registered: true, lastSync: new Date().toISOString() } });
});

// GET /api/federation/discover - Search Nexus products
app.get('/api/federation/discover', async (req, res) => {
  const { query, category, location } = req.query;
  try {
    const sr = await axios.post(`${NEXHA_DISCOVERY}/api/discovery/search`, { query, category, location }, { timeout: 10000 });
    res.json({ success: true, data: sr.data });
  } catch (err) {
    res.json({ success: true, data: { products: [] } });
  }
});

function transformToNexusFormat(product, companyId) {
  return {
    id: product.id, companyId,
    name: product.name || product.title,
    description: product.description,
    category: product.category || 'general',
    price: { amount: parseFloat(product.price || 0), currency: product.currency || 'INR' },
    images: [product.image || product.images].flat().filter(Boolean),
    availability: { available: product.in_stock !== false, quantity: product.stock_quantity || 0 },
    location: product.location || null,
    rating: product.rating || null,
    indexedAt: new Date().toISOString()
  };
}
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => console.log(`Product Federation running on port ${PORT}`));
module.exports = app;
