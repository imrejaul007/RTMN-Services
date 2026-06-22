/**
 * Smart Grid Routes - Grid Management & Distribution
 */

import { Router } from 'express';

export const smartGridRoutes = Router();

// Grid Status
smartGridRoutes.get('/status', (req, res) => {
  res.json({
    gridId: 'GRID-INDIA-NATIONAL-01',
    status: 'operational',
    region: 'India National Grid',
    metrics: {
      totalCapacity: '450 GW',
      currentLoad: '320 GW',
      availableCapacity: '130 GW',
      peakDemand: '380 GW',
      peakTime: '18:30 IST',
      frequency: 50.02,
      frequencyRange: { min: 49.9, max: 50.1 },
      voltage: { avg: 415, min: 380, max: 440 }
    },
    zones: [
      { id: 'NORTH', load: 85, status: 'normal', capacity: '120 GW' },
      { id: 'SOUTH', load: 72, status: 'normal', capacity: '100 GW' },
      { id: 'EAST', load: 65, status: 'normal', capacity: '80 GW' },
      { id: 'WEST', load: 78, status: 'normal', capacity: '90 GW' },
      { id: 'CENTRAL', load: 91, status: 'high', capacity: '60 GW' }
    ],
    substations: 2450,
    transformers: 12400,
    transmissionLines: '450,000 km',
    lastUpdated: new Date().toISOString()
  });
});

// Grid Load Analysis
smartGridRoutes.get('/load', (req, res) => {
  const { period = '24h' } = req.query;
  res.json({
    period,
    currentLoad: '320 GW',
    historical: {
      hourly: [
        { hour: '00:00', load: 180, renewable: 45 },
        { hour: '06:00', load: 220, renewable: 35 },
        { hour: '12:00', load: 280, renewable: 85 },
        { hour: '18:00', load: 320, renewable: 55 },
        { hour: '23:00', load: 240, renewable: 40 }
      ]
    },
    predictions: {
      nextHour: { load: '325 GW', confidence: 94 },
      nextDay: { load: '340 GW', confidence: 88 },
      peakExpected: '380 GW at 18:30'
    }
  });
});

// Distribution Control
smartGridRoutes.post('/distribute', (req, res) => {
  const { source, target, amount, priority } = req.body;
  res.json({
    transactionId: `DIST-${Date.now()}`,
    status: 'scheduled',
    source,
    target,
    amount: amount || '100 MW',
    priority: priority || 'normal',
    estimatedArrival: '15 minutes',
    losses: '2.3%',
    cost: '₹45,000'
  });
});

// Grid Balancing
smartGridRoutes.post('/balance', (req, res) => {
  const { zone, action = 'auto' } = req.body;
  res.json({
    balanceId: `BAL-${Date.now()}`,
    zone: zone || 'all',
    action,
    adjustments: [
      { type: 'frequency', current: 50.02, target: 50.0, adjustment: -0.02 },
      { type: 'voltage', current: 415, target: 415, adjustment: 0 },
      { type: 'reactive', current: '250 MVAR', target: '245 MVAR', adjustment: -5 }
    ],
    status: 'optimized',
    efficiency: 98.7
  });
});

// Outage Management
smartGridRoutes.get('/outages', (req, res) => {
  res.json({
    activeOutages: 3,
    outages: [
      {
        id: 'OUT-001',
        location: 'Mumbai Sector 5',
        cause: 'Equipment Failure',
        affectedCustomers: 12500,
        estimatedRestoration: '2 hours',
        status: 'in-progress'
      },
      {
        id: 'OUT-002',
        location: 'Delhi NCR Zone A',
        cause: 'Scheduled Maintenance',
        affectedCustomers: 8500,
        estimatedRestoration: '4 hours',
        status: 'scheduled'
      },
      {
        id: 'OUT-003',
        location: 'Chennai Industrial',
        cause: 'Weather',
        affectedCustomers: 3200,
        estimatedRestoration: '6 hours',
        status: 'pending'
      }
    ],
    restored: 24,
    avgDuration: '1.2 hours',
    saifi: 0.42,
    saidi: 2.8
  });
});

// Smart Metering
smartGridRoutes.get('/meters/:region?', (req, res) => {
  const { region } = req.params;
  res.json({
    region: region || 'all',
    totalMeters: 45000000,
    smartMeters: 38000000,
    activeMeters: 35200000,
    readings: {
      today: {
        total: '850 GWh',
        peak: '42 GW at 19:00',
        average: '35.4 GW'
      },
      smartReadings: 2450000,
      remoteDisconnections: 1200,
      theftDetected: 45
    }
  });
});

// Demand Response
smartGridRoutes.post('/demand-response', (req, res) => {
  const { type = 'curtailment', target = 'industrial', duration = 60 } = req.body;
  res.json({
    eventId: `DR-${Date.now()}`,
    type,
    target,
    duration: `${duration} minutes`,
    loadReduction: '250 MW',
    participants: 1250,
    incentives: '₹15/unit saved',
    status: 'active',
    startedAt: new Date().toISOString()
  });
});
