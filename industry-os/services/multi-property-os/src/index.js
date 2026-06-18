/**
 * Multi-Property Intelligence OS (5300)
 * Enterprise Dashboard for managing multiple properties
 */

const express = require('express');
const axios = require('axios');
const app = express();

const PORT = 5300;
const SERVICE_NAME = 'multi-property-os';

// Middleware
app.use(express.json());

// In-memory store
const store = {
  portfolios: new Map(),
  regions: new Map(),
  properties: new Map(),
  benchmarks: new Map(),
  managers: new Map(),
  alerts: new Map()
};

// Initialize sample data
function initializeSampleData() {
  // Regions
  const regions = [
    { id: 'reg_001', name: 'North America', code: 'NA', properties: 5 },
    { id: 'reg_002', name: 'Europe', code: 'EU', properties: 4 },
    { id: 'reg_003', name: 'Asia Pacific', code: 'APAC', properties: 6 },
    { id: 'reg_004', name: 'Middle East', code: 'ME', properties: 3 }
  ];
  regions.forEach(r => store.regions.set(r.id, r));

  // Sample properties
  const properties = [
    {
      id: 'prop_001', regionId: 'reg_001', name: 'Grand Plaza NYC',
      city: 'New York', country: 'USA', type: 'luxury',
      rooms: 500, occupancy: 85, adr: 350, revpar: 297.5,
      revenue: { today: 147500, week: 892000, month: 3850000 },
      expenses: { today: 45000, week: 280000, month: 1200000 },
      satisfaction: 4.6, status: 'operational'
    },
    {
      id: 'prop_002', regionId: 'reg_001', name: 'Seaside Resort LA',
      city: 'Los Angeles', country: 'USA', type: 'resort',
      rooms: 300, occupancy: 78, adr: 280, revpar: 218.4,
      revenue: { today: 65520, week: 420000, month: 1800000 },
      expenses: { today: 22000, week: 145000, month: 620000 },
      satisfaction: 4.4, status: 'operational'
    },
    {
      id: 'prop_003', regionId: 'reg_002', name: 'Royal Palace London',
      city: 'London', country: 'UK', type: 'luxury',
      rooms: 400, occupancy: 82, adr: 380, revpar: 311.6,
      revenue: { today: 124640, week: 768000, month: 3200000 },
      expenses: { today: 38000, week: 245000, month: 1050000 },
      satisfaction: 4.7, status: 'operational'
    },
    {
      id: 'prop_004', regionId: 'reg_002', name: 'Alpine Lodge Zurich',
      city: 'Zurich', country: 'Switzerland', type: 'boutique',
      rooms: 120, occupancy: 91, adr: 420, revpar: 382.2,
      revenue: { today: 45864, week: 285000, month: 1200000 },
      expenses: { today: 15000, week: 95000, month: 410000 },
      satisfaction: 4.8, status: 'operational'
    },
    {
      id: 'prop_005', regionId: 'reg_003', name: 'Marina Bay Singapore',
      city: 'Singapore', country: 'Singapore', type: 'luxury',
      rooms: 600, occupancy: 88, adr: 320, revpar: 281.6,
      revenue: { today: 168960, week: 1050000, month: 4500000 },
      expenses: { today: 52000, week: 335000, month: 1450000 },
      satisfaction: 4.9, status: 'operational'
    },
    {
      id: 'prop_006', regionId: 'reg_003', name: 'Tokyo Tower Hotel',
      city: 'Tokyo', country: 'Japan', type: 'business',
      rooms: 350, occupancy: 79, adr: 240, revpar: 189.6,
      revenue: { today: 66360, week: 410000, month: 1750000 },
      expenses: { today: 21000, week: 135000, month: 580000 },
      satisfaction: 4.5, status: 'operational'
    },
    {
      id: 'prop_007', regionId: 'reg_004', name: 'Desert Oasis Dubai',
      city: 'Dubai', country: 'UAE', type: 'luxury',
      rooms: 450, occupancy: 92, adr: 480, revpar: 441.6,
      revenue: { today: 198720, week: 1250000, month: 5400000 },
      expenses: { today: 65000, week: 410000, month: 1750000 },
      satisfaction: 4.8, status: 'operational'
    }
  ];
  properties.forEach(p => store.properties.set(p.id, p));

  // Sample managers
  const managers = [
    { id: 'mgr_001', name: 'Sarah Johnson', role: 'Regional Director', regionId: 'reg_001', properties: ['prop_001', 'prop_002'], performance: 4.6 },
    { id: 'mgr_002', name: 'James Wilson', role: 'Regional Director', regionId: 'reg_002', properties: ['prop_003', 'prop_004'], performance: 4.7 },
    { id: 'mgr_003', name: 'Wei Chen', role: 'Regional Director', regionId: 'reg_003', properties: ['prop_005', 'prop_006'], performance: 4.8 }
  ];
  managers.forEach(m => store.managers.set(m.id, m));

  // Benchmarks
  const benchmarks = [
    { id: 'bench_001', metric: 'Occupancy', industry: 72, luxury: 82, resort: 78 },
    { id: 'bench_002', metric: 'ADR', industry: 180, luxury: 320, resort: 250 },
    { id: 'bench_003', metric: 'RevPAR', industry: 130, luxury: 262, resort: 195 },
    { id: 'bench_004', metric: 'Satisfaction', industry: 4.2, luxury: 4.6, resort: 4.4 }
  ];
  benchmarks.forEach(b => store.benchmarks.set(b.id, b));

  console.log(`✅ Multi-Property initialized with ${properties.length} properties across ${regions.length} regions`);
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    port: PORT,
    capabilities: ['Portfolio Analytics', 'Region Management', 'Property Benchmarking', 'Manager Performance', 'Cross-Property Insights'],
    stats: {
      totalPortfolios: store.portfolios.size,
      totalRegions: store.regions.size,
      totalProperties: store.properties.size,
      totalManagers: store.managers.size
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== PORTFOLIO ====================

// Get portfolio overview
app.get('/api/portfolio/overview', (req, res) => {
  const properties = Array.from(store.properties.values());
  const regions = Array.from(store.regions.values());

  const totalRooms = properties.reduce((sum, p) => sum + p.rooms, 0);
  const avgOccupancy = properties.reduce((sum, p) => sum + p.occupancy, 0) / properties.length;
  const avgADR = properties.reduce((sum, p) => sum + p.adr, 0) / properties.length;
  const avgRevPAR = avgOccupancy * avgADR / 100;
  const avgSatisfaction = properties.reduce((sum, p) => sum + p.satisfaction, 0) / properties.length;
  const totalRevenue = properties.reduce((sum, p) => sum + p.revenue.month, 0);
  const totalExpenses = properties.reduce((sum, p) => sum + p.expenses.month, 0);

  res.json({
    success: true,
    portfolio: {
      totalProperties: properties.length,
      totalRooms,
      regions: regions.length,
      metrics: {
        occupancy: Math.round(avgOccupancy * 10) / 10,
        adr: Math.round(avgADR),
        revpar: Math.round(avgRevPAR),
        satisfaction: Math.round(avgSatisfaction * 10) / 10
      },
      financials: {
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        profitMargin: Math.round((totalRevenue - totalExpenses) / totalRevenue * 100)
      }
    }
  });
});

// ==================== REGIONS ====================

// Get all regions
app.get('/api/regions', (req, res) => {
  const regions = Array.from(store.regions.values()).map(r => {
    const props = Array.from(store.properties.values()).filter(p => p.regionId === r.id);
    return {
      ...r,
      properties: props.length,
      totalRooms: props.reduce((sum, p) => sum + p.rooms, 0),
      avgOccupancy: props.length ? Math.round(props.reduce((sum, p) => sum + p.occupancy, 0) / props.length * 10) / 10 : 0,
      avgRevPAR: props.length ? Math.round(props.reduce((sum, p) => sum + p.revpar, 0) / props.length) : 0
    };
  });

  res.json({ success: true, regions });
});

// Get region by ID
app.get('/api/regions/:id', (req, res) => {
  const region = store.regions.get(req.params.id);
  if (!region) {
    return res.status(404).json({ success: false, error: 'Region not found' });
  }

  const properties = Array.from(store.properties.values()).filter(p => p.regionId === req.params.id);
  const managers = Array.from(store.managers.values()).filter(m => m.regionId === req.params.id);

  res.json({ success: true, region, properties, managers });
});

// ==================== PROPERTIES ====================

// Get all properties
app.get('/api/properties', (req, res) => {
  const { region, type, minOccupancy, sort } = req.query;

  let properties = Array.from(store.properties.values());

  if (region) properties = properties.filter(p => p.regionId === region);
  if (type) properties = properties.filter(p => p.type === type);
  if (minOccupancy) properties = properties.filter(p => p.occupancy >= parseFloat(minOccupancy));

  if (sort === 'occupancy') properties.sort((a, b) => b.occupancy - a.occupancy);
  else if (sort === 'revpar') properties.sort((a, b) => b.revpar - a.revpar);
  else if (sort === 'satisfaction') properties.sort((a, b) => b.satisfaction - a.satisfaction);
  else if (sort === 'revenue') properties.sort((a, b) => b.revenue.month - a.revenue.month);

  res.json({ success: true, properties, total: properties.length });
});

// Get property by ID
app.get('/api/properties/:id', (req, res) => {
  const property = store.properties.get(req.params.id);
  if (!property) {
    return res.status(404).json({ success: false, error: 'Property not found' });
  }

  const region = store.regions.get(property.regionId);
  const managers = Array.from(store.managers.values()).filter(m => m.properties.includes(req.params.id));

  res.json({ success: true, property, region, managers });
});

// Update property
app.put('/api/properties/:id', (req, res) => {
  const property = store.properties.get(req.params.id);
  if (!property) {
    return res.status(404).json({ success: false, error: 'Property not found' });
  }

  Object.assign(property, req.body);
  store.properties.set(req.params.id, property);

  res.json({ success: true, property });
});

// ==================== BENCHMARKS ====================

// Get all benchmarks
app.get('/api/benchmarks', (req, res) => {
  const benchmarks = Array.from(store.benchmarks.values());
  res.json({ success: true, benchmarks });
});

// Get property vs benchmark
app.get('/api/properties/:id/benchmark', (req, res) => {
  const property = store.properties.get(req.params.id);
  if (!property) {
    return res.status(404).json({ success: false, error: 'Property not found' });
  }

  const benchmarks = Array.from(store.benchmarks.values()).map(b => {
    let value;
    switch (b.metric) {
      case 'Occupancy': value = property.occupancy; break;
      case 'ADR': value = property.adr; break;
      case 'RevPAR': value = property.revpar; break;
      case 'Satisfaction': value = property.satisfaction; break;
      default: value = 0;
    }

    const type = property.type;
    const benchmark = type === 'luxury' ? b.luxury : type === 'resort' ? b.resort : b.industry;

    return {
      metric: b.metric,
      value,
      benchmark,
      variance: Math.round((value - benchmark) / benchmark * 100 * 10) / 10,
      status: value >= benchmark ? 'above' : 'below'
    };
  });

  res.json({ success: true, property: property.name, type: property.type, benchmarks });
});

// ==================== MANAGERS ====================

// Get all managers
app.get('/api/managers', (req, res) => {
  const managers = Array.from(store.managers.values()).map(m => {
    const props = m.properties.map(id => store.properties.get(id)).filter(Boolean);
    return {
      ...m,
      properties: props.length,
      avgOccupancy: props.length ? Math.round(props.reduce((sum, p) => sum + p.occupancy, 0) / props.length * 10) / 10 : 0,
      totalRevenue: props.reduce((sum, p) => sum + p.revenue.month, 0)
    };
  });

  res.json({ success: true, managers });
});

// Get manager by ID
app.get('/api/managers/:id', (req, res) => {
  const manager = store.managers.get(req.params.id);
  if (!manager) {
    return res.status(404).json({ success: false, error: 'Manager not found' });
  }

  const properties = manager.properties.map(id => store.properties.get(id)).filter(Boolean);
  const region = store.regions.get(manager.regionId);

  res.json({ success: true, manager, properties, region });
});

// ==================== ANALYTICS ====================

// Cross-property comparison
app.get('/api/analytics/compare', (req, res) => {
  const { propertyIds } = req.query;
  const ids = propertyIds ? propertyIds.split(',') : Array.from(store.properties.keys());

  const properties = ids.map(id => store.properties.get(id)).filter(Boolean);

  if (!properties.length) {
    return res.status(400).json({ success: false, error: 'No valid properties found' });
  }

  const comparison = {
    occupancy: properties.map(p => ({ name: p.name, value: p.occupancy })),
    adr: properties.map(p => ({ name: p.name, value: p.adr })),
    revpar: properties.map(p => ({ name: p.name, value: p.revpar })),
    satisfaction: properties.map(p => ({ name: p.name, value: p.satisfaction })),
    revenue: properties.map(p => ({ name: p.name, value: p.revenue.month })),
    averages: {
      occupancy: Math.round(properties.reduce((sum, p) => sum + p.occupancy, 0) / properties.length * 10) / 10,
      adr: Math.round(properties.reduce((sum, p) => sum + p.adr, 0) / properties.length),
      revpar: Math.round(properties.reduce((sum, p) => sum + p.revpar, 0) / properties.length),
      satisfaction: Math.round(properties.reduce((sum, p) => sum + p.satisfaction, 0) / properties.length * 10) / 10
    }
  };

  res.json({ success: true, comparison });
});

// Revenue analytics
app.get('/api/analytics/revenue', (req, res) => {
  const properties = Array.from(store.properties.values());

  const byRegion = Array.from(store.regions.values()).map(r => {
    const props = properties.filter(p => p.regionId === r.id);
    return {
      region: r.name,
      revenue: props.reduce((sum, p) => sum + p.revenue.month, 0),
      expenses: props.reduce((sum, p) => sum + p.expenses.month, 0),
      properties: props.length
    };
  });

  const byType = ['luxury', 'resort', 'boutique', 'business'].map(type => {
    const props = properties.filter(p => p.type === type);
    return {
      type,
      revenue: props.reduce((sum, p) => sum + p.revenue.month, 0),
      expenses: props.reduce((sum, p) => sum + p.expenses.month, 0),
      properties: props.length
    };
  });

  res.json({
    success: true,
    revenue: {
      total: properties.reduce((sum, p) => sum + p.revenue.month, 0),
      byRegion,
      byType
    }
  });
});

// Performance trends
app.get('/api/analytics/trends', (req, res) => {
  const properties = Array.from(store.properties.values());

  // Generate sample trend data
  const days = 30;
  const trends = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));

    trends.push({
      date: date.toISOString().split('T')[0],
      occupancy: 75 + Math.random() * 15,
      adr: 280 + Math.random() * 50,
      revpar: 210 + Math.random() * 40,
      satisfaction: 4.3 + Math.random() * 0.5
    });
  }

  res.json({ success: true, trends });
});

// ==================== ALERTS ====================

// Get alerts
app.get('/api/alerts', (req, res) => {
  const { severity, status } = req.query;

  let alerts = Array.from(store.alerts.values());

  if (severity) alerts = alerts.filter(a => a.severity === severity);
  if (status) alerts = alerts.filter(a => a.status === status);

  res.json({ success: true, alerts });
});

// Create alert
app.post('/api/alerts', (req, res) => {
  const { propertyId, type, severity, message } = req.body;

  const alert = {
    id: `alert_${Date.now()}`,
    propertyId,
    type: type || 'info',
    severity: severity || 'low',
    message,
    status: 'open',
    createdAt: new Date().toISOString()
  };

  store.alerts.set(alert.id, alert);
  res.status(201).json({ success: true, alert });
});

// Update alert
app.put('/api/alerts/:id', (req, res) => {
  const alert = store.alerts.get(req.params.id);
  if (!alert) {
    return res.status(404).json({ success: false, error: 'Alert not found' });
  }

  Object.assign(alert, req.body);
  store.alerts.set(req.params.id, alert);

  res.json({ success: true, alert });
});

// ==================== DASHBOARD ====================

// Executive dashboard
app.get('/api/dashboard', (req, res) => {
  const properties = Array.from(store.properties.values());
  const regions = Array.from(store.regions.values());
  const managers = Array.from(store.managers.values());

  const totalRooms = properties.reduce((sum, p) => sum + p.rooms, 0);
  const avgOccupancy = properties.reduce((sum, p) => sum + p.occupancy, 0) / properties.length;
  const totalRevenue = properties.reduce((sum, p) => sum + p.revenue.month, 0);
  const totalExpenses = properties.reduce((sum, p) => sum + p.expenses.month, 0);

  // Top performing properties
  const topProperties = [...properties]
    .sort((a, b) => b.revpar - a.revpar)
    .slice(0, 5)
    .map(p => ({ id: p.id, name: p.name, revpar: p.revpar, occupancy: p.occupancy }));

  // Properties needing attention
  const attention = properties
    .filter(p => p.occupancy < 70 || p.satisfaction < 4.0)
    .map(p => ({ id: p.id, name: p.name, issue: p.occupancy < 70 ? 'Low Occupancy' : 'Low Satisfaction', value: p.occupancy < 70 ? p.occupancy : p.satisfaction }));

  // Region performance
  const regionPerf = regions.map(r => {
    const props = properties.filter(p => p.regionId === r.id);
    return {
      name: r.name,
      properties: props.length,
      avgOccupancy: props.length ? Math.round(props.reduce((sum, p) => sum + p.occupancy, 0) / props.length * 10) / 10 : 0,
      revenue: props.reduce((sum, p) => sum + p.revenue.month, 0)
    };
  });

  res.json({
    success: true,
    dashboard: {
      summary: {
        totalProperties: properties.length,
        totalRooms,
        avgOccupancy: Math.round(avgOccupancy * 10) / 10,
        totalRevenue,
        netIncome: totalRevenue - totalExpenses,
        profitMargin: Math.round((totalRevenue - totalExpenses) / totalRevenue * 100)
      },
      topProperties,
      attention,
      regionPerformance: regionPerf,
      benchmarks: Array.from(store.benchmarks.values())
    }
  });
});

// ==================== RTMN INTEGRATIONS ====================

async function connectToFoundation() {
  try {
    await axios.get('http://localhost:4705/health', { timeout: 2000 });
    console.log('✅ Connected to TwinOS (4705)');
    return true;
  } catch {
    console.log('⚠️ TwinOS not available');
    return false;
  }
}

async function connectToCXOOS() {
  try {
    await axios.get('http://localhost:5100/health', { timeout: 2000 });
    console.log('✅ Connected to CXO OS (5100)');
    return true;
  } catch {
    console.log('⚠️ CXO OS not available');
    return false;
  }
}

// Start server
initializeSampleData();

app.listen(PORT, async () => {
  console.log(`\n🏢 Multi-Property Intelligence OS started on port ${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await connectToFoundation();
  await connectToCXOOS();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏨 ${store.properties.size} properties | ${store.regions.size} regions`);
  console.log('🎯 Available endpoints:');
  console.log('   GET  /health');
  console.log('   GET  /api/portfolio/overview');
  console.log('   GET  /api/regions');
  console.log('   GET  /api/properties');
  console.log('   GET  /api/managers');
  console.log('   GET  /api/benchmarks');
  console.log('   GET  /api/dashboard');
  console.log('   GET  /api/analytics/*');
});
