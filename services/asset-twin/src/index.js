const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 4890;
app.use(helmet());
app.use(cors());
app.use(express.json());

const assets = new Map();
const categories = new Map();
const maintenance = new Map();

// Initialize sample assets
const sampleAssets = [
  { id: 'asset-1', name: 'Office Building A', type: 'property', category: 'real_estate', value: 5000000, status: 'active', location: { address: '123 Main St', city: 'San Francisco' }, owner: 'org-1', depreciation: 2.5 },
  { id: 'asset-2', name: 'Dell Server Cluster', type: 'equipment', category: 'it', value: 250000, status: 'active', location: { address: 'Data Center 1' }, owner: 'org-1', depreciation: 20, nextMaintenance: '2025-07-01' },
  { id: 'asset-3', name: 'Fleet Vehicle #15', type: 'vehicle', category: 'transport', value: 45000, status: 'active', location: { address: 'Warehouse' }, owner: 'org-1', depreciation: 15, mileage: 45000 },
  { id: 'asset-4', name: 'Customer Database', type: 'digital', category: 'software', value: 100000, status: 'active', owner: 'org-1', depreciation: 0, licenseKey: 'XXXX-XXXX-XXXX' }
];
sampleAssets.forEach(a => assets.set(a.id, a));

const sampleCategories = [
  { id: 'cat-1', name: 'Real Estate', types: ['property', 'land'] },
  { id: 'cat-2', name: 'IT Equipment', types: ['servers', 'computers', 'network'] },
  { id: 'cat-3', name: 'Vehicles', types: ['cars', 'trucks', 'vans'] },
  { id: 'cat-4', name: 'Digital Assets', types: ['software', 'domains', 'patents'] }
];
sampleCategories.forEach(c => categories.set(c.id, c));

// Get all assets
app.get('/api/assets', (req, res) => {
  const { type, category, status, search } = req.query;
  let result = Array.from(assets.values());
  if (type) result = result.filter(a => a.type === type);
  if (category) result = result.filter(a => a.category === category);
  if (status) result = result.filter(a => a.status === status);
  if (search) result = result.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  res.json({ assets: result, total: result.length });
});

// Get asset
app.get('/api/assets/:id', (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json(asset);
});

// Create asset
app.post('/api/assets', (req, res) => {
  const { name, type, category, value, location, owner } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const asset = { id: `asset-${uuidv4().slice(0, 8)}`, name, type: type || 'equipment', category: category || 'general', value: value || 0, status: 'active', location: location || {}, owner: owner || '', depreciation: 0, createdAt: new Date().toISOString() };
  assets.set(asset.id, asset);
  res.status(201).json(asset);
});

// Update asset
app.put('/api/assets/:id', (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  Object.assign(asset, req.body);
  res.json(asset);
});

// Get asset value
app.get('/api/assets/:id/value', (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  const currentValue = asset.value * (1 - (asset.depreciation || 0) / 100);
  res.json({ assetId: asset.id, originalValue: asset.value, currentValue: Math.round(currentValue), depreciation: asset.depreciation });
});

// Get categories
app.get('/api/categories', (req, res) => res.json({ categories: Array.from(categories.values()) }));

// Get statistics
app.get('/api/statistics', (req, res) => {
  const all = Array.from(assets.values());
  const totalValue = all.reduce((sum, a) => sum + a.value, 0);
  res.json({ totalAssets: all.length, totalValue, byType: Object.fromEntries(Object.entries({}).map() || []), activeAssets: all.filter(a => a.status === 'active').length });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'asset-twin', port: PORT, assets: assets.size }));
app.listen(PORT, () => console.log('Asset Twin running on port ' + PORT));
