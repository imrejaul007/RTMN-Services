/**
 * RTMN Finance OS - Industry Integration Module
 *
 * Connects Finance OS to all 24 Industry Operating Systems
 *
 * Port: 4801
 */

import express from 'express';
const router = express.Router();

// ============================================================
// INDUSTRY CONNECTIONS MAP
// ============================================================

const INDUSTRY_OS = {
  // Core Industries
  hospitality: { name: 'Restaurant OS', port: 5010, type: 'food_beverage' },
  healthcare: { name: 'Healthcare OS', port: 5020, type: 'healthcare' },
  hotel: { name: 'Hotel OS', port: 5025, type: 'hospitality' },
  retail: { name: 'Retail OS', port: 5030, type: 'retail' },
  legal: { name: 'Legal OS', port: 5035, type: 'legal' },
  education: { name: 'Education OS', port: 5060, type: 'education' },
  sales: { name: 'Sales OS', port: 5055, type: 'sales' },
  automotive: { name: 'Automotive OS', port: 5080, type: 'automotive' },
  beauty: { name: 'Beauty OS', port: 5090, type: 'beauty_wellness' },
  fitness: { name: 'Fitness OS', port: 5110, type: 'fitness' },
  gaming: { name: 'Gaming OS', port: 5120, type: 'gaming' },
  government: { name: 'Government OS', port: 5130, type: 'government' },
  homeservices: { name: 'HomeServices OS', port: 5140, type: 'home_services' },
  manufacturing: { name: 'Manufacturing OS', port: 5150, type: 'manufacturing' },
  nonprofit: { name: 'NonProfit OS', port: 5160, type: 'nonprofit' },
  professional: { name: 'Professional OS', port: 5170, type: 'professional_services' },
  sports: { name: 'Sports OS', port: 5180, type: 'sports' },
  travel: { name: 'Travel OS', port: 5190, type: 'travel' },
  entertainment: { name: 'Entertainment OS', port: 5200, type: 'entertainment' },
  construction: { name: 'Construction OS', port: 5210, type: 'construction' },
  financial: { name: 'Financial OS', port: 5220, type: 'financial' },
  realestate: { name: 'RealEstate OS', port: 5230, type: 'real_estate' },
  transport: { name: 'Transport OS', port: 5240, type: 'transportation' },
  media: { name: 'Media OS', port: 5600, type: 'media_production' },
  energy: { name: 'Energy OS', port: 5100, type: 'energy' },
  exhibition: { name: 'Exhibition OS', port: 5040, type: 'exhibition' },
};

// ============================================================
// HEALTH CHECK ALL INDUSTRIES
// ============================================================

router.get('/industries/health', async (req, res) => {
  const results = {};

  for (const [key, config] of Object.entries(INDUSTRY_OS)) {
    try {
      const response = await fetch(`http://localhost:${config.port}/health`);
      if (response.ok) {
        const data = await response.json();
        results[key] = {
          name: config.name,
          port: config.port,
          status: 'healthy',
          service: data.service || data.name || 'running'
        };
      } else {
        results[key] = { name: config.name, port: config.port, status: 'down' };
      }
    } catch (e) {
      results[key] = { name: config.name, port: config.port, status: 'not_running' };
    }
  }

  const connected = Object.values(results).filter(r => r.status === 'healthy').length;
  const total = Object.keys(results).length;

  res.json({
    summary: { connected, total, disconnected: total - connected },
    industries: results
  });
});

// ============================================================
// GET ALL INDUSTRIES
// ============================================================

router.get('/industries', (req, res) => {
  const industries = Object.entries(INDUSTRY_OS).map(([key, config]) => ({
    code: key,
    ...config,
    connected: false
  }));

  res.json({ industries });
});

// ============================================================
// SYNC FROM INDUSTRY
// ============================================================

// Sync revenue from industry
router.post('/sync/:industry/revenue', async (req, res) => {
  const { industry } = req.params;
  const config = INDUSTRY_OS[industry];

  if (!config) {
    return res.status(404).json({ error: 'Industry not found' });
  }

  try {
    // Try to fetch revenue from industry OS
    const endpoints = ['/api/analytics/overview', '/api/revenue', '/api/sales'];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:${config.port}${endpoint}`);
        if (response.ok) {
          const data = await response.json();
          return res.json({
            industry,
            name: config.name,
            revenue: data.revenue || data.totalRevenue || data.total || 0,
            synced: true,
            timestamp: new Date().toISOString()
          });
        }
      } catch (e) {
        continue;
      }
    }

    // Return mock data if industry OS not available
    res.json({
      industry,
      name: config.name,
      revenue: 0,
      message: 'Industry OS not connected - using estimates',
      synced: false
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sync expenses from industry
router.post('/sync/:industry/expenses', async (req, res) => {
  const { industry } = req.params;
  const config = INDUSTRY_OS[industry];

  if (!config) {
    return res.status(404).json({ error: 'Industry not found' });
  }

  res.json({
    industry,
    name: config.name,
    expenses: 0,
    synced: false,
    message: 'Industry OS integration pending'
  });
});

// ============================================================
// UNIFIED DASHBOARD - ALL INDUSTRIES
// ============================================================

router.get('/dashboard/all-industries', async (req, res) => {
  const { date } = req.query;
  const results = {
    industries: [],
    summary: {
      totalRevenue: 0,
      totalExpenses: 0,
      totalProfit: 0,
      connectedIndustries: 0
    }
  };

  // Check each industry
  for (const [code, config] of Object.entries(INDUSTRY_OS)) {
    const industryResult = {
      code,
      name: config.name,
      type: config.type,
      port: config.port,
      status: 'unknown',
      revenue: 0,
      expenses: 0,
      profit: 0,
      connected: false
    };

    try {
      const health = await fetch(`http://localhost:${config.port}/health`);
      if (health.ok) {
        industryResult.status = 'healthy';
        industryResult.connected = true;
        results.summary.connectedIndustries++;

        // Get data from industry
        try {
          const overview = await fetch(`http://localhost:${config.port}/api/analytics/overview`);
          const data = await overview.json();
          industryResult.revenue = data.revenue || data.totalRevenue || 0;
          industryResult.expenses = data.expenses || 0;
          industryResult.profit = data.revenue - data.expenses || 0;
          results.summary.totalRevenue += industryResult.revenue;
          results.summary.totalExpenses += industryResult.expenses;
        } catch (e) {
          // Use estimates
        }
      } else {
        industryResult.status = 'down';
      }
    } catch (e) {
      industryResult.status = 'not_running';
    }

    results.industries.push(industryResult);
  }

  results.summary.profit = results.summary.totalRevenue - results.summary.totalExpenses;

  res.json(results);
});

// ============================================================
// SINGLE INDUSTRY DETAIL
// ============================================================

router.get('/:industry', async (req, res) => {
  const { industry } = req.params;
  const config = INDUSTRY_OS[industry];

  if (!config) {
    return res.status(404).json({ error: 'Industry not found' });
  }

  // Try to get health and data from industry OS
  let healthStatus = 'unknown';
  let data = null;

  try {
    const health = await fetch(`http://localhost:${config.port}/health`);
    healthStatus = health.ok ? 'healthy' : 'down';

    if (health.ok) {
      const overview = await fetch(`http://localhost:${config.port}/api/analytics/overview`);
      data = await overview.json();
    }
  } catch (e) {
    healthStatus = 'not_running';
  }

  res.json({
    code: industry,
    ...config,
    healthStatus,
    data: data || { message: 'Industry OS not connected' },
    integration: {
      revenue: `http://localhost:${config.port}/api/analytics/overview`,
      employees: `http://localhost:${config.port}/api/staff`,
      orders: `http://localhost:${config.port}/api/orders`,
      customers: `http://localhost:${config.port}/api/customers`
    }
  });
});

// ============================================================
// EXPORT
// ============================================================

export default router;
