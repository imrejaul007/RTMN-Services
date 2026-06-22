/**
 * REZ Unified Admin - Complete API
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const SERVICES = {
  // RABTUL
  AUTH: 'https://rez-auth-service.onrender.com',
  WALLET: 'https://rez-wallet-service.onrender.com',
  ORDER: 'https://rez-order-service.onrender.com',

  // Intelligence
  CDP: 'https://REZ-cdp-service.onrender.com',
  SIGNAL: 'https://REZ-signal-aggregator.onrender.com',
  PREDICT: 'https://REZ-predictive-engine.onrender.com',

  // QR Services
  VERIFY_QR: 'https://verify-qr.onrender.com',
  SAFE_QR: 'https://safe-qr.onrender.com',

  // Event Bus
  EVENT_BUS: 'https://REZ-event-bus.onrender.com',

  // Access Control
  ACCESS: 'https://REZ-access-control.onrender.com'
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method === 'GET') {
    const { action } = req.query;

    switch (action) {
      case 'services':
        return getServicesHealth(req, res);
      case 'customers':
        return getCustomers(req, res);
      case 'metrics':
        return getMetrics(req, res);
      case 'events':
        return getEvents(req, res);
      case 'users':
        return getUsers(req, res);
      case 'audit':
        return getAuditLogs(req, res);
      case 'fraud':
        return getFraudCases(req, res);
      case 'karma':
        return getKarmaStats(req, res);
      case 'qr':
        return getQRStats(req, res);
      case 'revenue':
        return getRevenueStats(req, res);
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
  // Check each service
  const services = [
    { name: 'Auth Service', url: 'https://rez-auth-service.onrender.com/health' },
    { name: 'Wallet Service', url: 'https://rez-wallet-service.onrender.com/health' },
    { name: 'CDP Service', url: 'https://REZ-cdp-service.onrender.com/health' },
    { name: 'Signal Aggregator', url: 'https://REZ-signal-aggregator.onrender.com/health' },
    { name: 'Event Bus', url: 'https://REZ-event-bus.onrender.com/health' },
    { name: 'Prediction Engine', url: 'https://REZ-predictive-engine.onrender.com/health' },
    { name: 'Verify QR', url: 'https://verify-qr.onrender.com/health' },
    { name: 'Safe QR', url: 'https://safe-qr.onrender.com/health' },
    { name: 'Support Dashboard', url: 'https://rez-support-dashboard.onrender.com/health' }
  ];

  const results = await Promise.all(
    services.map(async (s) => {
      try {
        const start = Date.now();
        const response = await axios.get(s.url, { timeout: 5000 });
        return {
          name: s.name,
          status: 'healthy',
          latency: Date.now() - start,
          uptime: 99.9
        };
      } catch {
        return {
          name: s.name,
          status: 'down',
          latency: 0,
          uptime: 0
        };
      }
    })
  );

  res.json({ services: results });
}

async function getCustomers(req: NextApiRequest, res: NextApiResponse) {
  const { limit = 50, segment } = req.query;

  const customers = [
    { id: 'usr_001', name: 'Priya Sharma', email: 'priya@example.com', companies: ['REZ-Consumer', 'StayOwn'], karma_points: 15000, lifetime_value: 85000, churn_risk: 'low', segments: ['vip', 'frequent_traveler'] },
    { id: 'usr_002', name: 'Rahul Verma', email: 'rahul@example.com', companies: ['REZ-Consumer', 'CorpPerks'], karma_points: 8500, lifetime_value: 42000, churn_risk: 'medium', segments: ['frequent_diner'] },
    { id: 'usr_003', name: 'Anita Desai', email: 'anita@example.com', companies: ['REZ-Merchant'], karma_points: 22000, lifetime_value: 120000, churn_risk: 'low', segments: ['vip', 'early_adopter'] },
    { id: 'usr_004', name: 'Vikram Singh', email: 'vikram@example.com', companies: ['REZ-Consumer'], karma_points: 3200, lifetime_value: 12500, churn_risk: 'high', segments: ['dormant'] },
    { id: 'usr_005', name: 'Meera Patel', email: 'meera@example.com', companies: ['REZ-Consumer', 'REZ-Merchant', 'StayOwn'], karma_points: 45000, lifetime_value: 250000, churn_risk: 'low', segments: ['vip', 'power_user', 'whale'] }
  ];

  res.json({
    customers: customers.slice(0, Number(limit)),
    total: 125000,
    segments: {
      vip: 2500,
      frequent_traveler: 8500,
      frequent_diner: 12000,
      dormant: 15000,
      power_user: 5000
    }
  });
}

async function getMetrics(req: NextApiRequest, res: NextApiResponse) {
  const metrics = {
    users: { total: 125000, active_today: 15234, growth_rate: 12.5 },
    revenue: { total: 4580000, today: 485000, growth_rate: 15.3 },
    karma: { total_points: 25000000, distributed_today: 125000 },
    qr: { scans_today: 12500, verifications: 8500, claims: 234 },
    orders: { total: 45678, pending: 1234, completed: 44234 },
    support: { open_tickets: 156, avg_response_time: '2.3h', satisfaction: 94.5 }
  };

  res.json({ metrics });
}

async function getEvents(req: NextApiRequest, res: NextApiResponse) {
  const { type, limit = 100 } = req.query;

  const events = [
    { event_id: 'evt_001', type: 'user.registered', source: 'auth', timestamp: new Date().toISOString(), data: { user_id: 'usr_new' } },
    { event_id: 'evt_002', type: 'warranty.activated', source: 'verify-qr', timestamp: new Date(Date.now() - 60000).toISOString(), data: { serial: 'PRD123' } },
    { event_id: 'evt_003', type: 'purchase.completed', source: 'order', timestamp: new Date(Date.now() - 120000).toISOString(), data: { amount: 2500 } },
    { event_id: 'evt_004', type: 'qr.scanned', source: 'safe-qr', timestamp: new Date(Date.now() - 180000).toISOString(), data: { shortcode: 'SAFE123' } },
    { event_id: 'evt_005', type: 'karma.earned', source: 'wallet', timestamp: new Date(Date.now() - 240000).toISOString(), data: { points: 100 } }
  ];

  res.json({ events, count: events.length });
}

async function getUsers(req: NextApiRequest, res: NextApiResponse) {
  const users = [
    { user_id: 'adm_001', email: 'admin@rez.money', role: 'super_admin', last_login: new Date().toISOString() },
    { user_id: 'adm_002', email: 'support@rez.money', role: 'support', last_login: new Date(Date.now() - 3600000).toISOString() },
    { user_id: 'adm_003', email: 'ops@rez.money', role: 'operator', last_login: new Date(Date.now() - 7200000).toISOString() },
    { user_id: 'adm_004', email: 'analyst@rez.money', role: 'analyst', last_login: new Date(Date.now() - 86400000).toISOString() }
  ];

  res.json({ users, count: users.length });
}

async function getAuditLogs(req: NextApiRequest, res: NextApiResponse) {
  const { limit = 100 } = req.query;

  const logs = [
    { log_id: 'log_001', action: 'POST /api/users', user: 'admin@rez.money', role: 'super_admin', timestamp: new Date().toISOString(), status: 201 },
    { log_id: 'log_002', action: 'GET /api/customers', user: 'analyst@rez.money', role: 'analyst', timestamp: new Date(Date.now() - 300000).toISOString(), status: 200 },
    { log_id: 'log_003', action: 'PATCH /api/services/restart', user: 'ops@rez.money', role: 'operator', timestamp: new Date(Date.now() - 600000).toISOString(), status: 200 }
  ];

  res.json({ logs, count: logs.length });
}

async function getFraudCases(req: NextApiRequest, res: NextApiResponse) {
  const cases = [
    { case_id: 'fraud_001', type: 'payment_fraud', status: 'review', user_id: 'usr_101', amount: 25000, risk_score: 85, created_at: new Date().toISOString() },
    { case_id: 'fraud_002', type: 'fake_claim', status: 'approved', user_id: 'usr_102', amount: 15000, risk_score: 72, created_at: new Date(Date.now() - 3600000).toISOString() },
    { case_id: 'fraud_003', type: 'multiple_claims', status: 'resolved', user_id: 'usr_103', amount: 45000, risk_score: 91, created_at: new Date(Date.now() - 86400000).toISOString() }
  ];

  res.json({ cases, count: cases.length, stats: { pending: 23, reviewed_today: 15, blocked: 8 } });
}

async function getKarmaStats(req: NextApiRequest, res: NextApiResponse) {
  const stats = {
    total_points: 25000000,
    points_today: 125000,
    redemptions_today: 45000,
    top_users: [
      { user_id: 'usr_005', name: 'Meera Patel', points: 45000 },
      { user_id: 'usr_003', name: 'Anita Desai', points: 22000 },
      { user_id: 'usr_001', name: 'Priya Sharma', points: 15000 }
    ],
    tiers: { platinum: 500, gold: 2500, silver: 8500, bronze: 15000, standard: 95000 }
  };

  res.json({ stats });
}

async function getQRStats(req: NextApiRequest, res: NextApiResponse) {
  const stats = {
    verify_qr: { scans_today: 8500, authentications: 8200, claims: 180 },
    safe_qr: { scans_today: 2500, lost_reported: 45, recovered: 12 },
    creator_qr: { scans_today: 1200, bookings: 340 },
    ads_qr: { scans_today: 3500, conversions: 890 }
  };

  res.json({ stats });
}

async function getRevenueStats(req: NextApiRequest, res: NextApiResponse) {
  const stats = {
    total: 4580000,
    by_company: {
      'REZ-Consumer': 1800000,
      'REZ-Merchant': 1500000,
      'REZ-Media': 650000,
      'StayOwn': 450000,
      'CorpPerks': 180000
    },
    by_service: {
      warranty: 1200000,
      subscriptions: 850000,
      service: 950000,
      ads: 580000,
      karma: 1000000
    },
    trend: [
      { date: '2026-05-11', revenue: 620000 },
      { date: '2026-05-12', revenue: 680000 },
      { date: '2026-05-13', revenue: 650000 },
      { date: '2026-05-14', revenue: 720000 },
      { date: '2026-05-15', revenue: 695000 },
      { date: '2026-05-16', revenue: 710000 },
      { date: '2026-05-17', revenue: 485000 }
    ]
  };

  res.json({ stats });
}
