/**
 * Energy Digital Twins - Grid, Solar, Wind, Battery Twins
 */

import { Router } from 'express';

export const energyTwinRoutes = Router();

// All Energy Twins
energyTwinRoutes.get('/', (req, res) => {
  res.json({
    twins: [
      // Grid Twins
      { id: 'grid-national-01', type: 'grid-twin', name: 'National Grid Twin', status: 'active' },
      { id: 'grid-zone-north-01', type: 'grid-twin', name: 'North Zone Grid Twin', status: 'active' },
      { id: 'grid-zone-south-01', type: 'grid-twin', name: 'South Zone Grid Twin', status: 'active' },

      // Solar Twins
      { id: 'solar-rajasthan-01', type: 'solar-twin', name: 'Rajasthan Solar Park Twin', status: 'active' },
      { id: 'solar-gujarat-01', type: 'solar-twin', name: 'Gujarat Solar Farm Twin', status: 'active' },
      { id: 'solar-rooftop-network', type: 'solar-twin', name: 'Rooftop Solar Network Twin', status: 'active' },

      // Wind Twins
      { id: 'wind-tamilnadu-01', type: 'wind-twin', name: 'Tamil Nadu Wind Farm Twin', status: 'active' },
      { id: 'wind-gujarat-01', type: 'wind-twin', name: 'Gujarat Wind Corridor Twin', status: 'active' },
      { id: 'wind-offshore-west-01', type: 'wind-twin', name: 'Offshore West Wind Twin', status: 'active' },

      // Battery Twins
      { id: 'battery-mumbai-01', type: 'battery-twin', name: 'Mumbai Grid Storage Twin', status: 'active' },
      { id: 'battery-delhi-01', type: 'battery-twin', name: 'Delhi Storage Twin', status: 'active' },
      { id: 'battery-distributed-01', type: 'battery-twin', name: 'Distributed Storage Twin', status: 'active' },

      // Carbon Twins
      { id: 'carbon-enterprise-01', type: 'carbon-twin', name: 'Enterprise Carbon Twin', status: 'active' },
      { id: 'carbon-supplychain-01', type: 'carbon-twin', name: 'Supply Chain Carbon Twin', status: 'active' },

      // Trading Twins
      { id: 'trading-portfolio-01', type: 'trading-twin', name: 'Trading Portfolio Twin', status: 'active' },
      { id: 'trading-market-01', type: 'trading-twin', name: 'Market Intelligence Twin', status: 'active' }
    ],
    total: 17,
    byType: {
      'grid-twin': 3,
      'solar-twin': 3,
      'wind-twin': 3,
      'battery-twin': 3,
      'carbon-twin': 2,
      'trading-twin': 2
    }
  });
});

// Get Twin by ID
energyTwinRoutes.get('/:twinId', (req, res) => {
  const { twinId } = req.params;
  const twinMap = {
    'grid-national-01': {
      id: 'grid-national-01',
      name: 'National Grid Twin',
      type: 'grid-twin',
      status: 'active',
      metrics: {
        load: '320 GW',
        capacity: '450 GW',
        stability: 99.2,
        frequency: 50.02,
        peakDemand: '380 GW'
      },
      health: 98,
      lastSync: new Date().toISOString()
    },
    'solar-rajasthan-01': {
      id: 'solar-rajasthan-01',
      name: 'Rajasthan Solar Park Twin',
      type: 'solar-twin',
      status: 'active',
      metrics: {
        capacity: '25 GW',
        currentOutput: '18.5 GW',
        efficiency: 74,
        irradiance: '920 W/m²',
        panels: '100 million'
      },
      health: 96,
      lastSync: new Date().toISOString()
    },
    'wind-tamilnadu-01': {
      id: 'wind-tamilnadu-01',
      name: 'Tamil Nadu Wind Farm Twin',
      type: 'wind-twin',
      status: 'active',
      metrics: {
        capacity: '8 GW',
        currentOutput: '5.6 GW',
        efficiency: 70,
        windSpeed: '9.2 m/s',
        turbines: 3200
      },
      health: 94,
      lastSync: new Date().toISOString()
    },
    'battery-mumbai-01': {
      id: 'battery-mumbai-01',
      name: 'Mumbai Grid Storage Twin',
      type: 'battery-twin',
      status: 'active',
      metrics: {
        capacity: '2 GWh',
        currentCharge: '1.56 GWh',
        chargeLevel: 78,
        cycles: 2500,
        soh: 94,
        status: 'discharging'
      },
      health: 97,
      lastSync: new Date().toISOString()
    }
  };

  const twin = twinMap[twinId] || twinMap['grid-national-01'];
  res.json(twin);
});

// Query Energy Twins
energyTwinRoutes.post('/query', (req, res) => {
  const { query, type, industry = 'energy' } = req.body;
  const queryLower = (query || '').toLowerCase();

  const allTwins = [
    { id: 'grid-national-01', name: 'National Grid Twin', type: 'grid-twin', match: ['grid', 'load', 'national', 'capacity'] },
    { id: 'grid-zone-north-01', name: 'North Zone Grid Twin', type: 'grid-twin', match: ['grid', 'north', 'zone'] },
    { id: 'solar-rajasthan-01', name: 'Rajasthan Solar Park Twin', type: 'solar-twin', match: ['solar', 'rajasthan', 'sun', 'park'] },
    { id: 'solar-gujarat-01', name: 'Gujarat Solar Farm Twin', type: 'solar-twin', match: ['solar', 'gujarat', 'farm'] },
    { id: 'wind-tamilnadu-01', name: 'Tamil Nadu Wind Farm Twin', type: 'wind-twin', match: ['wind', 'tamil', 'turbine'] },
    { id: 'wind-offshore-west-01', name: 'Offshore West Wind Twin', type: 'wind-twin', match: ['wind', 'offshore', 'sea'] },
    { id: 'battery-mumbai-01', name: 'Mumbai Grid Storage Twin', type: 'battery-twin', match: ['battery', 'storage', 'charge', 'mumbai'] },
    { id: 'carbon-enterprise-01', name: 'Enterprise Carbon Twin', type: 'carbon-twin', match: ['carbon', 'emissions', 'co2'] },
    { id: 'trading-portfolio-01', name: 'Trading Portfolio Twin', type: 'trading-twin', match: ['trading', 'portfolio', 'trade', 'market'] }
  ];

  const matches = allTwins.filter(t => {
    if (type && t.type !== type) return false;
    if (!query) return true;
    return t.match.some(m => queryLower.includes(m));
  });

  res.json({
    twins: matches.slice(0, 5),
    total: matches.length,
    query
  });
});

// Update Twin Data
energyTwinRoutes.patch('/:twinId', (req, res) => {
  const { twinId } = req.params;
  const updates = req.body;
  res.json({
    success: true,
    twinId,
    updates,
    timestamp: new Date().toISOString()
  });
});

// Twin Sync Status
energyTwinRoutes.get('/sync/status', (req, res) => {
  res.json({
    lastSync: new Date().toISOString(),
    pendingSyncs: 2,
    failedSyncs: 0,
    syncHealth: 99.8,
    dataFreshness: {
      grid: { secondsAgo: 5, status: 'fresh' },
      solar: { secondsAgo: 8, status: 'fresh' },
      wind: { secondsAgo: 12, status: 'fresh' },
      battery: { secondsAgo: 3, status: 'fresh' }
    }
  });
});
