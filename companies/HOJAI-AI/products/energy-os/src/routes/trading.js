/**
 * Energy Trading Routes - Markets, Exchanges, P2P Trading
 */

import { Router } from 'express';

export const tradingRoutes = Router();

// Market Overview
tradingRoutes.get('/market', (req, res) => {
  res.json({
    exchanges: [
      { name: 'IEX', volume: '45 GWh', avgPrice: '₹4.2/kWh', change: 2.5 },
      { name: 'PXIL', volume: '32 GWh', avgPrice: '₹4.5/kWh', change: -1.2 },
      { name: 'HPX', volume: '18 GWh', avgPrice: '₹4.3/kWh', change: 0.8 }
    ],
    currentPrice: { value: 4.2, currency: '₹/kWh', trend: 'up' },
    volatility: 'low',
    liquidity: 'high',
    forecast: {
      nextHour: { price: 4.3, confidence: 92 },
      nextDay: { price: 4.5, confidence: 85 }
    }
  });
});

// Order Book
tradingRoutes.get('/orderbook', (req, res) => {
  res.json({
    bids: [
      { price: 4.5, quantity: 500, type: 'buy', timestamp: Date.now() - 1000 },
      { price: 4.4, quantity: 1200, type: 'buy', timestamp: Date.now() - 2000 },
      { price: 4.3, quantity: 800, type: 'buy', timestamp: Date.now() - 3000 },
      { price: 4.2, quantity: 2000, type: 'buy', timestamp: Date.now() - 4000 },
      { price: 4.1, quantity: 1500, type: 'buy', timestamp: Date.now() - 5000 }
    ],
    asks: [
      { price: 4.6, quantity: 800, type: 'sell', timestamp: Date.now() - 1000 },
      { price: 4.7, quantity: 1100, type: 'sell', timestamp: Date.now() - 2000 },
      { price: 4.8, quantity: 600, type: 'sell', timestamp: Date.now() - 3000 },
      { price: 4.9, quantity: 1400, type: 'sell', timestamp: Date.now() - 4000 },
      { price: 5.0, quantity: 900, type: 'sell', timestamp: Date.now() - 5000 }
    ],
    spread: 0.1,
    depth: { bids: 6000, asks: 4800 }
  });
});

// Place Order
tradingRoutes.post('/order', (req, res) => {
  const { type, side, quantity, price, deliveryDate } = req.body;
  res.json({
    orderId: `ORD-${Date.now()}`,
    type: type || 'day',
    side,
    quantity: quantity || '100 MWh',
    price: price || 4.5,
    deliveryDate: deliveryDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    status: 'pending',
    filledQuantity: 0,
    avgPrice: 0,
    createdAt: new Date().toISOString()
  });
});

// Positions
tradingRoutes.get('/positions', (req, res) => {
  res.json({
    openPositions: 5,
    positions: [
      {
        id: 'POS-001',
        commodity: 'Solar RTC',
        quantity: 500,
        avgPrice: 4.2,
        currentPrice: 4.5,
        pnl: { unrealized: 15000, realized: 0 },
        margin: 25000,
        marginUtilization: 35
      },
      {
        id: 'POS-002',
        commodity: 'Wind Non-RTC',
        quantity: 300,
        avgPrice: 4.0,
        currentPrice: 3.8,
        pnl: { unrealized: -6000, realized: 12000 },
        margin: 15000,
        marginUtilization: 28
      },
      {
        id: 'POS-003',
        commodity: 'Hydro RTC',
        quantity: 200,
        avgPrice: 3.5,
        currentPrice: 3.6,
        pnl: { unrealized: 2000, realized: 0 },
        margin: 10000,
        marginUtilization: 22
      }
    ],
    totalPnl: { unrealized: 11000, realized: 12000 },
    totalMargin: 50000,
    marginUtilization: 30
  });
});

// P2P Trading
tradingRoutes.get('/p2p', (req, res) => {
  res.json({
    activeListings: 45,
    listings: [
      {
        id: 'P2P-001',
        seller: 'Solar Farm Alpha',
        commodity: 'Solar 100kW',
        quantity: '100 kWh/hour',
        price: 3.8,
        duration: '6 months',
        certification: 'GOLD-VER',
        rating: 4.8
      },
      {
        id: 'P2P-002',
        seller: 'WindCo Beta',
        commodity: 'Wind 50kW',
        quantity: '50 kWh/hour',
        price: 3.5,
        duration: '12 months',
        certification: 'SILVER-VER',
        rating: 4.5
      },
      {
        id: 'P2P-003',
        seller: 'GreenFactory Inc',
        commodity: 'Offsite Solar PPA',
        quantity: '1 MW/month',
        price: 4.0,
        duration: '24 months',
        certification: 'GOLD-VER',
        rating: 4.9
      }
    ]
  });
});

// Create P2P Listing
tradingRoutes.post('/p2p/list', (req, res) => {
  const { commodity, quantity, price, duration, certification } = req.body;
  res.json({
    listingId: `P2P-${Date.now()}`,
    status: 'active',
    commodity,
    quantity: quantity || '100 kWh/hour',
    price: price || 4.0,
    duration: duration || '12 months',
    certification: certification || 'VERIFIED',
    views: 0,
    inquiries: 0,
    createdAt: new Date().toISOString()
  });
});

// Portfolio
tradingRoutes.get('/portfolio', (req, res) => {
  res.json({
    totalValue: '₹45 lakhs',
    dayPnl: { value: 12500, percentage: 2.8 },
    monthPnl: { value: 45000, percentage: 10.2 },
    yearPnl: { value: 180000, percentage: 40.0 },
    holdings: {
      solar: { value: '₹18 lakhs', percentage: 40 },
      wind: { value: '₹12 lakhs', percentage: 27 },
      hydro: { value: '₹8 lakhs', percentage: 18 },
      battery: { value: '₹7 lakhs', percentage: 15 }
    },
    allocation: {
      spot: { value: '₹22 lakhs', percentage: 49 },
      forward: { value: '₹15 lakhs', percentage: 33 },
      options: { value: '₹8 lakhs', percentage: 18 }
    }
  });
});

// Settlement
tradingRoutes.get('/settlement', (req, res) => {
  res.json({
    pendingSettlements: 3,
    settlements: [
      {
        id: 'SET-001',
        type: 'sell',
        quantity: 500,
        price: 4.5,
        value: 225000,
        counterparty: 'IEX',
        status: 'pending',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString()
      },
      {
        id: 'SET-002',
        type: 'buy',
        quantity: 300,
        price: 4.2,
        value: 126000,
        counterparty: 'Industrial Corp',
        status: 'confirmed',
        dueDate: new Date(Date.now() + 86400000).toISOString()
      }
    ],
    recentSettled: [
      { id: 'SET-450', value: 85000, date: '2024-01-20', status: 'settled' },
      { id: 'SET-449', value: 120000, date: '2024-01-19', status: 'settled' }
    ]
  });
});

// Price Forecasting
tradingRoutes.get('/forecast', (req, res) => {
  res.json({
    model: 'ML-Ensemble-v3',
    accuracy: 89,
    predictions: [
      { hour: '00:00', price: 3.8, confidence: 95 },
      { hour: '06:00', price: 4.0, confidence: 93 },
      { hour: '12:00', price: 4.8, confidence: 88 },
      { hour: '18:00', price: 5.2, confidence: 85 },
      { hour: '23:00', price: 4.2, confidence: 90 }
    ],
    factors: [
      { name: 'Demand', impact: 'high', direction: 'up' },
      { name: 'Renewable Generation', impact: 'high', direction: 'down' },
      { name: 'Grid Congestion', impact: 'medium', direction: 'up' },
      { name: 'Weather', impact: 'medium', direction: 'neutral' }
    ],
    signals: {
      buy: ['Low demand period 00:00-06:00'],
      sell: ['Peak demand 18:00-21:00'],
      hold: ['Stable prices expected 12:00-15:00']
    }
  });
});

// Arbitrage Opportunities
tradingRoutes.get('/arbitrage', (req, res) => {
  res.json({
    opportunities: [
      {
        id: 'ARB-001',
        type: 'location',
        buyAt: 'IEX Mumbai',
        sellAt: 'PXIL Delhi',
        spread: 0.8,
        volume: 500,
        profit: 40000,
        risk: 'low'
      },
      {
        id: 'ARB-002',
        type: 'time',
        buyAt: 'Off-peak (00:00)',
        sellAt: 'Peak (18:00)',
        spread: 1.4,
        volume: 200,
        profit: 28000,
        risk: 'medium'
      },
      {
        id: 'ARB-003',
        type: 'renewable',
        buyAt: 'Solar surplus (12:00)',
        sellAt: 'Evening peak (19:00)',
        spread: 1.2,
        volume: 300,
        profit: 36000,
        risk: 'low'
      }
    ],
    totalPotential: '₹1.04 lakhs/day',
    recommendedVolume: '1000 MWh',
    estimatedProfit: '₹52,000'
  });
});
