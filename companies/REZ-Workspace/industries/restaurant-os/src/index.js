/**
 * Restaurant OS - Full Industry Operating System
 * Part of RTMN Ecosystem
 *
 * Features:
 * - Digital Twins (Reservation, Menu, Kitchen, Staff, Customer)
 * - AI Agents (Order, Kitchen, Scheduling, Inventory)
 * - Business Copilot (6 interfaces)
 * - BOA Executive Intelligence
 */

import express from 'express';
import cors from 'cors';
import { reservationRoutes } from './routes/reservations.js';
import { menuRoutes } from './routes/menu.js';
import { kitchenRoutes } from './routes/kitchen.js';
import { orderRoutes } from './routes/orders.js';
import { staffRoutes } from './routes/staff.js';
import { customerRoutes } from './routes/customers.js';
import inventoryProxyRoutes from './routes/inventory.proxy.js';
import { analyticsRoutes } from './routes/analytics.js';
import { digitalTwinsRoutes } from './routes/twins.js';
import { agentRoutes } from './routes/agents.js';

const app = express();
const PORT = process.env.PORT || 5010;

// Cross-service config (NEXHA-AUDIT-V2 Phase 7)
const INVENTORY_TWIN_URL = process.env.INVENTORY_TWIN_URL || 'http://localhost:4016';
const PROCUREMENT_OS_URL = process.env.PROCUREMENT_OS_URL || 'http://localhost:4320';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[Restaurant OS] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'restaurant-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      openTables: 12,
      pendingOrders: 8,
      activeStaff: 15,
      todayRevenue: 45200
    }
  });
});

// Dashboard
app.get('/api/dashboard', (req, res) => {
  res.json({
    overview: {
      todayRevenue: 45200,
      ordersToday: 127,
      avgOrderValue: 356,
      tableTurnover: 2.8,
      customerSatisfaction: 4.5
    },
    tables: {
      total: 25,
      occupied: 12,
      reserved: 8,
      available: 5
    },
    kitchen: {
      activeOrders: 8,
      avgPrepTime: '12 min',
      queue: 5
    },
    staff: {
      onDuty: 15,
      scheduled: 18,
      tipsToday: 8500
    },
    popularItems: [
      { name: 'Butter Chicken', orders: 45 },
      { name: 'Biryani', orders: 38 },
      { name: 'Naan', orders: 62 }
    ]
  });
});

// Routes
app.use('/api/reservations', reservationRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryProxyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/twins', digitalTwinsRoutes);
app.use('/api/agents', agentRoutes);

// Digital Twins endpoint
app.get('/api/twins/dashboard', (req, res) => {
  res.json({
    twins: {
      reservation: { total: 150, active: 45, health: 98 },
      menu: { total: 85, active: 80, health: 100 },
      kitchen: { total: 12, active: 8, health: 95 },
      order: { total: 127, active: 8, health: 97 },
      staff: { total: 45, active: 15, health: 99 },
      customer: { total: 2340, active: 120, health: 96 }
    },
    totalTwins: 2679,
    activeTwins: 256,
    avgHealth: 97.5
  });
});

// AI Copilot endpoints
app.post('/api/copilot/query', (req, res) => {
  const { query, context } = req.body;

  // Smart response based on query.
  // The "inventory" / "stock" intent queries the real inventory-twin-service
  // for low-stock alerts (NEXHA-AUDIT-V2 Phase 7). Other intents still
  // return canned responses — wiring them to real backends is P0 in the
  // v2 roadmap.
  const queryLower = (query || '').toLowerCase();

  if (queryLower.includes('inventory') || queryLower.includes('stock')) {
    const restaurantId = (context && context.restaurantId) || (req.body && req.body.restaurantId);
    if (!restaurantId) {
      return res.json({
        response: '**Inventory**\n\nProvide a `restaurantId` in the request body or context to query the live inventory twin.',
        query,
        sources: ['restaurant-os'],
        confidence: 0.5,
        timestamp: new Date().toISOString(),
      });
    }

    const inventoryUrl = `${INVENTORY_TWIN_URL || 'http://localhost:4016'}/${encodeURIComponent(restaurantId)}/analytics`;
    const invHeaders = {};
    if (INTERNAL_SERVICE_TOKEN) {
      invHeaders['x-internal-token'] = INTERNAL_SERVICE_TOKEN;
    }

    const invController = new AbortController();
    const invTimeout = setTimeout(() => invController.abort(), 5000);

    fetch(inventoryUrl, { headers: invHeaders, signal: invController.signal })
      .then((res2) => res2.json())
      .then((data) => {
        clearTimeout(invTimeout);
        if (!data || !data.success) {
          return res.json({
            response: `**Inventory**\n\ninventory-twin-service returned: ${data && data.error ? JSON.stringify(data.error) : 'unknown error'}`,
            query,
            sources: ['inventory-twin'],
            confidence: 0.4,
            timestamp: new Date().toISOString(),
          });
        }
        const a = data.data || {};
        const lines = [
          '**Inventory Alert (live from inventory-twin-service)**',
          '',
          `📦 Total items: ${a.totalItems ?? '?'}`,
          `💰 Total value: ₹${a.totalValue ?? '?'}`,
          `🚨 Low stock: ${a.lowStockCount ?? '?'}`,
          `⏰ Expiring: ${a.expiringCount ?? '?'}`,
          `🗑️ Waste this month: ₹${a.wasteThisMonth ?? '?'}`,
        ];
        if (Array.isArray(a.topConsumedItems) && a.topConsumedItems.length > 0) {
          lines.push('', '**Top consumed:**');
          a.topConsumedItems.forEach((it, i) => {
            lines.push(`${i + 1}. ${it.name} — ${it.consumption}`);
          });
        }
        lines.push('', '_To auto-create a reorder RFQ via procurement-os, call_ `POST /api/inventory/<inventoryId>/purchase-orders`');
        res.json({
          response: lines.join('\n'),
          query,
          sources: ['inventory-twin', 'procurement-os'],
          confidence: 0.92,
          timestamp: new Date().toISOString(),
        });
      })
      .catch((err) => {
        clearTimeout(invTimeout);
        res.json({
          response: `**Inventory**\n\ninventory-twin-service unreachable: ${err instanceof Error ? err.message : String(err)}`,
          query,
          sources: ['restaurant-os'],
          confidence: 0.3,
          timestamp: new Date().toISOString(),
        });
      });
    return;
  }

  // Other intents — return canned text. Wire to real backends in
  // follow-up commits (P0 of the v2 roadmap).
  let response = 'Processing your query...';
  if (queryLower.includes('order') || queryLower.includes('sale')) {
    response = `**Order Analysis**\n\n📊 Today: 127 orders\n💰 Revenue: ₹45,200\n📈 Avg Order: ₹356\n\nTop Items:\n1. Butter Chicken - 45 orders\n2. Biryani - 38 orders\n\nRecommendations:\n• Stock up on chicken and rice\n• Consider combo offers for slow periods`;
  } else if (queryLower.includes('table') || queryLower.includes('reservation')) {
    response = `**Table Status**\n\n🪑 Total: 25 tables\n✅ Occupied: 12\n📅 Reserved: 8\n🔓 Available: 5\n\nNext Reservation: 7:30 PM (Party of 4)`;
  } else if (queryLower.includes('kitchen') || queryLower.includes('prep')) {
    response = `**Kitchen Status**\n\n🔥 Active Orders: 8\n⏱️ Avg Prep Time: 12 minutes\n📋 Queue: 5 orders\n\n⚠️ Attention:\n• Order #127 waiting 15 min\n• 3 orders delayed > 10 min`;
  } else if (queryLower.includes('staff') || queryLower.includes('schedule')) {
    response = `**Staff Dashboard**\n\n👨‍🍳 On Duty: 15\n📅 Scheduled: 18\n💰 Tips Today: ₹8,500\n\nRecommendations:\n• Add 2 servers for dinner rush\n• Consider overtime for kitchen`;
  } else {
    response = `**Restaurant Dashboard**\n\n📊 Today's Performance:\n• Revenue: ₹45,200\n• Orders: 127\n• Covers: 380\n• Satisfaction: 4.5/5\n\nWhat would you like to analyze?`;
  }

  res.json({
    response,
    query,
    sources: ['restaurant-os', 'twins', 'inventory'],
    confidence: 0.92,
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Restaurant OS Error]', err);
  res.status(500).json({ error: 'Internal server error', service: 'restaurant-os' });
});

app.listen(PORT, () => {
  console.log(`🍽️ Restaurant OS running on port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`   Twins: http://localhost:${PORT}/api/twins/dashboard`);
  console.log(`   Copilot: http://localhost:${PORT}/api/copilot/query`);
});

export default app;
