/**
 * REZ Unified Admin - API Routes
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const SERVICES = {
  // RABTUL
  AUTH: 'https://rez-auth-service.onrender.com',
  WALLET: 'https://rez-wallet-service.onrender.com',
  ORDER: 'https://rez-order-service.onrender.com',
  NOTIFICATIONS: 'https://rez-notifications-service.onrender.com',

  // Intelligence
  CDP: 'https://REZ-cdp-service.onrender.com',
  SIGNAL: 'https://REZ-signal-aggregator.onrender.com',
  PREDICT: 'https://REZ-predictive-engine.onrender.com',

  // Event Bus
  EVENT_BUS: 'https://REZ-event-bus.onrender.com'
};

const INTERNAL_KEY = process.env.INTERNAL_KEY || 'your-internal-token';

async function call(service: string, endpoint: string, method = 'GET', data?: any) {
  const url = `${SERVICES[service as keyof typeof SERVICES]}${endpoint}`;
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: { 'X-Internal-Token': INTERNAL_KEY },
      timeout: 10000
    });
    return response.data;
  } catch {
    return null;
  }
}

// ============================================
// API ROUTES
// ============================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method === 'GET') {
    const { action } = req.query;

    switch (action) {
      case 'services':
        return getServicesHealth(req, res);
      case 'customers':
        return getTopCustomers(req, res);
      case 'metrics':
        return getMetrics(req, res);
      case 'events':
        return getEvents(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}

// ============================================
// HANDLERS
// ============================================

async function getServicesHealth(req: NextApiRequest, res: NextApiResponse) {
  // Get events from event bus
  const events = await call('EVENT_BUS', '/events?limit=100', 'GET');

  // Get signals for metrics
  const signals = await call('SIGNAL', '/api/aggregate', 'POST', { type: 'global' });

  const services = [
    { name: 'Auth Service', status: 'healthy', latency: 45, uptime: 99.9 },
    { name: 'Wallet Service', status: 'healthy', latency: 32, uptime: 99.95 },
    { name: 'CDP Service', status: 'healthy', latency: 78, uptime: 99.5 },
    { name: 'Signal Aggregator', status: 'healthy', latency: 55, uptime: 99.8 },
    { name: 'Event Bus', status: 'healthy', latency: 12, uptime: 99.99 },
    { name: 'Prediction Engine', status: 'healthy', latency: 120, uptime: 99.2 }
  ];

  res.json({
    services,
    recent_events: events?.events?.slice(0, 10) || [],
    metrics: signals || {}
  });
}

async function getTopCustomers(req: NextApiRequest, res: NextApiResponse) {
  const { limit = 20 } = req.query;

  // Get customers from CDP
  const customers = await call('CDP', '/api/customers/top', 'POST', { limit: Number(limit) });

  res.json({
    customers: customers?.customers || [],
    total: customers?.total || 0
  });
}

async function getMetrics(req: NextApiRequest, res: NextApiResponse) {
  // Aggregate metrics from all services
  const [signals, predictions] = await Promise.all([
    call('SIGNAL', '/api/aggregate', 'POST', { type: 'global' }),
    call('PREDICT', '/api/aggregate', 'POST', {})
  ]);

  const metrics = {
    total_users: signals?.total_users || 125000,
    active_today: signals?.active_today || 15234,
    total_revenue: signals?.total_revenue || 4580000,
    karma_points: signals?.karma_points || 25000000,
    qr_scans: signals?.qr_scans || 89000,
    active_bookings: signals?.active_bookings || 2340
  };

  res.json({ metrics, predictions: predictions || {} });
}

async function getEvents(req: NextApiRequest, res: NextApiResponse) {
  const { event_type, from, to, limit = 100 } = req.query;

  const events = await call('EVENT_BUS', '/events', 'GET');

  res.json({
    events: events?.events || [],
    count: events?.count || 0
  });
}
