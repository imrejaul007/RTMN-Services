/**
 * RTMN Finance OS - Asset Module
 */

import express from 'express';
const router = express.Router();

// Depreciation Methods
const DEPRECIATION_METHODS = [
  { id: 'straight_line', name: 'Straight Line', description: 'Equal annual depreciation' },
  { id: 'declining_balance', name: 'Declining Balance', description: 'Higher depreciation in early years' },
  { id: 'sum_of_years', name: 'Sum of Years Digits', description: 'Accelerated depreciation' },
  { id: 'units_of_production', name: 'Units of Production', description: 'Based on usage' },
];

// Asset Categories
const ASSET_CATEGORIES = [
  { id: 'land', name: 'Land', life: 0, rate: 0, method: 'none' },
  { id: 'building', name: 'Building', life: 30, rate: 3.33, method: 'straight_line' },
  { id: 'furniture', name: 'Furniture & Fixtures', life: 10, rate: 10, method: 'straight_line' },
  { id: 'computer', name: 'Computers & IT', life: 3, rate: 33.33, method: 'straight_line' },
  { id: 'vehicle', name: 'Vehicles', life: 5, rate: 20, method: 'straight_line' },
  { id: 'plant', name: 'Plant & Machinery', life: 15, rate: 6.67, method: 'straight_line' },
  { id: 'office', name: 'Office Equipment', life: 5, rate: 20, method: 'straight_line' },
  { id: 'software', name: 'Software', life: 3, rate: 33.33, method: 'straight_line' },
  { id: 'patent', name: 'Patents & IP', life: 10, rate: 10, method: 'straight_line' },
];

// Initialize assets DB
db.assets = db.assets || new Map();
db.assetDepreciation = db.assetDepreciation || new Map();

// Get methods and categories
router.get('/reference-data', (req, res) => {
  res.json({
    depreciationMethods: DEPRECIATION_METHODS,
    categories: ASSET_CATEGORIES,
  });
});

// Add asset
router.post('/', (req, res) => {
  const { name, category, purchaseDate, purchaseCost, vendor, location, usefulLife, depreciationMethod, salvageValue } = req.body;

  if (!name || !category || !purchaseCost || !purchaseDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const categoryInfo = ASSET_CATEGORIES.find(c => c.id === category) || ASSET_CATEGORIES[4];
  const method = depreciationMethod || categoryInfo.method;
  const life = usefulLife || categoryInfo.life;
  const rate = life > 0 ? (1 / life) * 100 : 0;
  const salvage = salvageValue || 0;

  const id = `AST${String(db.assets.size + 1).padStart(4, '0')}`;

  const asset = {
    id,
    name,
    category,
    categoryName: categoryInfo.name,
    purchaseDate,
    purchaseCost,
    vendor: vendor || '',
    location: location || '',
    usefulLife: life,
    depreciationMethod: method,
    depreciationRate: rate,
    salvageValue: salvage,
    currentValue: purchaseCost - salvage,
    accumulatedDepreciation: 0,
    status: 'active',
    depreciationSchedule: generateDepreciationSchedule(purchaseCost, salvage, rate, life),
    insurance: {
      policyNumber: '',
      provider: '',
      premium: 0,
      expiryDate: null,
    },
    maintenance: [],
    createdAt: new Date().toISOString(),
  };

  db.assets.set(id, asset);

  // Create GL entry
  const jeId = `JE${db.journalEntries.size + 1}`;
  const journalEntry = {
    id: jeId,
    date: purchaseDate,
    description: `Asset Purchase: ${name}`,
    reference: id,
    entries: [
      { account: 'FIXED_ASSETS', debit: purchaseCost, credit: 0 },
      { account: 'BANK', debit: 0, credit: purchaseCost },
    ],
    status: 'posted',
    source: 'asset',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  };
  db.journalEntries.set(jeId, journalEntry);

  // Update GL
  const fixedAssets = db.accounts.get('FIXED_ASSETS');
  if (fixedAssets) {
    fixedAssets.balance += purchaseCost;
    db.accounts.set('FIXED_ASSETS', fixedAssets);
  }

  res.status(201).json(asset);
});

// Get all assets
router.get('/', (req, res) => {
  const { status, category, search } = req.query;
  let assets = Array.from(db.assets.values());

  if (status) assets = assets.filter(a => a.status === status);
  if (category) assets = assets.filter(a => a.category === category);
  if (search) {
    const term = search.toLowerCase();
    assets = assets.filter(a =>
      a.name.toLowerCase().includes(term) ||
      a.id.toLowerCase().includes(term)
    );
  }

  const summary = {
    total: assets.length,
    totalCost: assets.reduce((sum, a) => sum + a.purchaseCost, 0),
    totalCurrentValue: assets.reduce((sum, a) => sum + a.currentValue, 0),
    totalDepreciation: assets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0),
  };

  res.json({ assets, summary });
});

// Get single asset
router.get('/:id', (req, res) => {
  const asset = db.assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  // Get depreciation records
  const depreciation = Array.from(db.assetDepreciation.values() || [])
    .filter(d => d.assetId === req.params.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({ asset, depreciation });
});

// Update asset
router.patch('/:id', (req, res) => {
  const asset = db.assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const updated = { ...asset, ...req.body, updatedAt: new Date().toISOString() };
  db.assets.set(req.params.id, updated);

  res.json(updated);
});

// Calculate depreciation
router.post('/:id/depreciate', (req, res) => {
  const asset = db.assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const { date } = req.body;
  const deprecationDate = date || new Date().toISOString().split('T')[0];

  let depreciationAmount = 0;

  if (asset.depreciationMethod === 'straight_line') {
    depreciationAmount = (asset.purchaseCost - asset.salvageValue) * (asset.depreciationRate / 100);
  } else if (asset.depreciationMethod === 'declining_balance') {
    depreciationAmount = asset.currentValue * (asset.depreciationRate / 100);
  }

  depreciationAmount = Math.round(depreciationAmount);

  // Check if already depreciated this period
  const existing = Array.from(db.assetDepreciation.values() || [])
    .find(d => d.assetId === req.params.id && d.date.startsWith(deprecationDate.slice(0, 7)));

  if (existing) {
    return res.status(400).json({ error: 'Depreciation already calculated for this period' });
  }

  // Record depreciation
  const record = {
    id: `DEP-${req.params.id}-${Date.now()}`,
    assetId: req.params.id,
    assetName: asset.name,
    date: deprecationDate,
    depreciationAmount,
    accumulatedDepreciation: asset.accumulatedDepreciation + depreciationAmount,
    currentValue: asset.currentValue - depreciationAmount,
  };

  db.assetDepreciation.set(record.id, record);

  // Update asset
  asset.accumulatedDepreciation += depreciationAmount;
  asset.currentValue -= depreciationAmount;
  db.assets.set(req.params.id, asset);

  // Create GL entry
  const jeId = `JE${db.journalEntries.size + 1}`;
  const journalEntry = {
    id: jeId,
    date: deprecationDate,
    description: `Depreciation: ${asset.name}`,
    reference: record.id,
    entries: [
      { account: 'DEPRECIATION', debit: depreciationAmount, credit: 0 },
      { account: 'ACCUM_DEP', debit: 0, credit: depreciationAmount },
    ],
    status: 'posted',
    source: 'asset',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  };
  db.journalEntries.set(jeId, journalEntry);

  // Update GL
  const depreciationAcc = db.accounts.get('ACCUM_DEP');
  if (depreciationAcc) {
    depreciationAcc.balance += depreciationAmount;
    db.accounts.set('ACCUM_DEP', depreciationAcc);
  }

  res.json(record);
});

// Disposal
router.post('/:id/dispose', (req, res) => {
  const asset = db.assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const { salePrice, date, buyer } = req.body;
  const disposalDate = date || new Date().toISOString().split('T')[0];

  const gainLoss = salePrice - asset.currentValue;

  // Record disposal
  const disposal = {
    id: `DSP-${req.params.id}`,
    assetId: req.params.id,
    assetName: asset.name,
    date: disposalDate,
    originalCost: asset.purchaseCost,
    accumulatedDepreciation: asset.accumulatedDepreciation,
    bookValue: asset.currentValue,
    salePrice,
    gainLoss,
    buyer: buyer || '',
    status: gainLoss >= 0 ? 'profit' : 'loss',
  };

  // Create GL entries
  const jeId = `JE${db.journalEntries.size + 1}`;
  const journalEntry = {
    id: jeId,
    date: disposalDate,
    description: `Asset Disposal: ${asset.name}`,
    reference: disposal.id,
    entries: [
      { account: 'BANK', debit: salePrice, credit: 0 },
      { account: 'ACCUM_DEP', debit: asset.accumulatedDepreciation, credit: 0 },
      { account: 'FIXED_ASSETS', debit: 0, credit: asset.purchaseCost },
      { account: gainLoss >= 0 ? 'PROFIT_ON_SALE' : 'LOSS_ON_SALE', debit: gainLoss < 0 ? Math.abs(gainLoss) : 0, credit: gainLoss >= 0 ? gainLoss : 0 },
    ],
    status: 'posted',
    source: 'asset-disposal',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  };
  db.journalEntries.set(jeId, journalEntry);

  // Update asset status
  asset.status = 'disposed';
  asset.disposalDate = disposalDate;
  asset.salePrice = salePrice;
  asset.gainLoss = gainLoss;
  db.assets.set(req.params.id, asset);

  // Update GL
  const fixedAssets = db.accounts.get('FIXED_ASSETS');
  if (fixedAssets) {
    fixedAssets.balance -= asset.purchaseCost;
    db.accounts.set('FIXED_ASSETS', fixedAssets);
  }

  res.json(disposal);
});

// Transfer asset
router.post('/:id/transfer', (req, res) => {
  const asset = db.assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const { toLocation, toEmployee, date, notes } = req.body;

  const transfer = {
    id: `TRF-${req.params.id}-${Date.now()}`,
    assetId: req.params.id,
    assetName: asset.name,
    fromLocation: asset.location,
    toLocation: toLocation || '',
    toEmployee: toEmployee || '',
    date: date || new Date().toISOString(),
    notes: notes || '',
  };

  asset.location = toLocation || asset.location;
  asset.currentHolder = toEmployee || asset.currentHolder;
  asset.transfers = asset.transfers || [];
  asset.transfers.push(transfer);
  db.assets.set(req.params.id, asset);

  res.json(transfer);
});

// Maintenance record
router.post('/:id/maintenance', (req, res) => {
  const asset = db.assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const { type, date, cost, vendor, notes } = req.body;

  const maintenance = {
    id: `MNT-${req.params.id}-${Date.now()}`,
    assetId: req.params.id,
    type,
    date: date || new Date().toISOString(),
    cost: cost || 0,
    vendor: vendor || '',
    notes: notes || '',
  };

  asset.maintenance = asset.maintenance || [];
  asset.maintenance.push(maintenance);
  asset.totalMaintenanceCost = (asset.totalMaintenanceCost || 0) + (cost || 0);
  db.assets.set(req.params.id, asset);

  res.status(201).json(maintenance);
});

// Depreciation schedule
function generateDepreciationSchedule(cost, salvage, rate, life) {
  const schedule = [];
  let remainingValue = cost - salvage;
  let year = 1;

  while (remainingValue > salvage && year <= life) {
    const depreciation = rate > 0 ? remainingValue * (rate / 100) : 0;
    remainingValue -= depreciation;
    schedule.push({
      year,
      depreciation: Math.round(depreciation),
      accumulatedDepreciation: cost - remainingValue - salvage + depreciation,
      bookValue: Math.max(salvage, remainingValue),
    });
    year++;
  }

  return schedule;
}

// Asset report
router.get('/reports/summary', (req, res) => {
  const assets = Array.from(db.assets.values());
  const byCategory = {};

  ASSET_CATEGORIES.forEach(cat => {
    const categoryAssets = assets.filter(a => a.category === cat.id);
    if (categoryAssets.length > 0) {
      byCategory[cat.name] = {
        count: categoryAssets.length,
        cost: categoryAssets.reduce((sum, a) => sum + a.purchaseCost, 0),
        value: categoryAssets.reduce((sum, a) => sum + a.currentValue, 0),
        depreciation: categoryAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0),
      };
    }
  });

  res.json({
    total: {
      count: assets.length,
      cost: assets.reduce((sum, a) => sum + a.purchaseCost, 0),
      value: assets.reduce((sum, a) => sum + a.currentValue, 0),
      depreciation: assets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0),
    },
    byCategory,
  });
});

export default router;
