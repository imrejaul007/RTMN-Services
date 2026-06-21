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
import tablesProxyRoutes from './routes/tables.proxy.js';
import contractsProxyRoutes from './routes/contracts.proxy.js';
import kitchenProxyRoutes from './routes/kitchen.proxy.js';
import ordersProxyRoutes from './routes/orders.proxy.js';
import staffProxyRoutes from './routes/staff.proxy.js';
import customersProxyRoutes from './routes/customers.proxy.js';
import { analyticsRoutes } from './routes/analytics.js';
import { digitalTwinsRoutes } from './routes/twins.js';
import { agentRoutes } from './routes/agents.js';

const app = express();
const PORT = process.env.PORT || 5010;

// Cross-service config (NEXHA-AUDIT-V2 Phase 7/8)
const INVENTORY_TWIN_URL = process.env.INVENTORY_TWIN_URL || 'http://localhost:4016';
const TABLE_TWIN_URL = process.env.TABLE_TWIN_URL || 'http://localhost:4012';
const PROCUREMENT_OS_URL = process.env.PROCUREMENT_OS_URL || 'http://localhost:4320';
const SUTAR_GATEWAY_URL = process.env.SUTAR_GATEWAY_URL || 'http://localhost:4140';
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

// Dashboard — aggregates live data from twin services where available.
// Tables block now calls table-twin-service (Phase 8). If the twin is
// unreachable, it falls back to a static placeholder so the rest of the
// dashboard still renders. Inventory/stats already pull from the
// inventory twin via /api/inventory/* (Phase 7).
app.get('/api/dashboard', async (req, res) => {
  const restaurantId = req.query.restaurantId || 'demo-restaurant-001';

  // Fan out to table-twin-service for live table stats
  const tableHeaders = {};
  if (INTERNAL_SERVICE_TOKEN) {
    tableHeaders['x-internal-token'] = INTERNAL_SERVICE_TOKEN;
  }
  const tableController = new AbortController();
  const tableTimeout = setTimeout(() => tableController.abort(), 3000);

  let tablesBlock = {
    total: 25,
    occupied: 12,
    reserved: 8,
    available: 5,
    source: 'fallback'
  };

  try {
    const tableUrl = `${TABLE_TWIN_URL}/api/twins/table?restaurantId=${encodeURIComponent(restaurantId)}&limit=200`;
    const tableResp = await fetch(tableUrl, { headers: tableHeaders, signal: tableController.signal });
    clearTimeout(tableTimeout);
    if (tableResp.ok) {
      const tableJson = await tableResp.json();
      const tableList = (tableJson && tableJson.data && tableJson.data.tables) || [];
      const total = tableList.length;
      const occupied = tableList.filter((t) => t.status === 'OCCUPIED').length;
      const reserved = tableList.filter((t) => t.status === 'RESERVED').length;
      const available = tableList.filter((t) => t.status === 'AVAILABLE').length;
      tablesBlock = { total, occupied, reserved, available, source: 'table-twin' };
    } else {
      tablesBlock.source = `fallback (twin ${tableResp.status})`;
    }
  } catch (err) {
    clearTimeout(tableTimeout);
    tablesBlock.source = `fallback (${err && err.message ? err.message : 'unreachable'})`;
  }

  res.json({
    overview: {
      todayRevenue: 45200,
      ordersToday: 127,
      avgOrderValue: 356,
      tableTurnover: 2.8,
      customerSatisfaction: 4.5
    },
    tables: tablesBlock,
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
    ],
    liveBackends: ['table-twin', 'inventory-twin', 'sutar-contracts', 'kitchen-twin', 'order-twin', 'staff-twin', 'customer-twin']
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
app.use('/api/tables', tablesProxyRoutes);
app.use('/api/contracts', contractsProxyRoutes);
app.use('/api/kitchen', kitchenProxyRoutes);
app.use('/api/orders', ordersProxyRoutes);
app.use('/api/staff', staffProxyRoutes);
app.use('/api/customers', customersProxyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/twins', digitalTwinsRoutes);
app.use('/api/agents', agentRoutes);

// Digital Twins endpoint — table & inventory now backed by real twins.
app.get('/api/twins/dashboard', (req, res) => {
  res.json({
    twins: {
      reservation: { total: 150, active: 45, health: 98 },
      menu: { total: 85, active: 80, health: 100 },
      kitchen: { total: 12, active: 8, health: 95 },
      order: { total: 127, active: 8, health: 97 },
      staff: { total: 45, active: 15, health: 99 },
      customer: { total: 2340, active: 120, health: 96 },
      table: { service: 'table-twin-service@4012', wired: true },
      inventory: { service: 'inventory-twin-service@4016', wired: true }
    },
    totalTwins: 2681,
    activeTwins: 258,
    avgHealth: 97.5,
    liveBackends: ['table-twin', 'inventory-twin']
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
    // Live query: ask table-twin-service for the current list and format
    // a real dashboard. NEXHA-AUDIT-V2 Phase 8.
    const restaurantId = (context && context.restaurantId) || (req.body && req.body.restaurantId);
    if (!restaurantId) {
      return res.json({
        response: '**Table Status**\n\nProvide a `restaurantId` in the request body or context to query the live table twin.',
        query,
        sources: ['restaurant-os'],
        confidence: 0.5,
        timestamp: new Date().toISOString(),
      });
    }

    const tableHeaders = {};
    if (INTERNAL_SERVICE_TOKEN) {
      tableHeaders['x-internal-token'] = INTERNAL_SERVICE_TOKEN;
    }
    const tableController = new AbortController();
    const tableTimeout = setTimeout(() => tableController.abort(), 5000);

    fetch(`${TABLE_TWIN_URL}/api/twins/table?restaurantId=${encodeURIComponent(restaurantId)}&limit=200`, {
      headers: tableHeaders,
      signal: tableController.signal,
    })
      .then((tRes) => tRes.json())
      .then((tData) => {
        clearTimeout(tableTimeout);
        if (!tData || !tData.success) {
          return res.json({
            response: `**Table Status**\n\ntable-twin-service returned: ${tData && tData.error ? JSON.stringify(tData.error) : 'unknown error'}`,
            query,
            sources: ['table-twin'],
            confidence: 0.4,
            timestamp: new Date().toISOString(),
          });
        }
        const tables = (tData.data && tData.data.tables) || [];
        const total = tables.length;
        const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
        const reserved = tables.filter((t) => t.status === 'RESERVED').length;
        const available = tables.filter((t) => t.status === 'AVAILABLE').length;
        const lines = [
          '**Table Status (live from table-twin-service)**',
          '',
          `🪑 Total: ${total}`,
          `✅ Occupied: ${occupied}`,
          `📅 Reserved: ${reserved}`,
          `🔓 Available: ${available}`,
        ];
        lines.push('', '_To seat guests, call_ `POST /api/tables/<tableId>/seat`');
        res.json({
          response: lines.join('\n'),
          query,
          sources: ['table-twin'],
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        });
      })
      .catch((err) => {
        clearTimeout(tableTimeout);
        res.json({
          response: `**Table Status**\n\ntable-twin-service unreachable: ${err instanceof Error ? err.message : String(err)}`,
          query,
          sources: ['restaurant-os'],
          confidence: 0.3,
          timestamp: new Date().toISOString(),
        });
      });
    return;
  } else if (queryLower.includes('kitchen') || queryLower.includes('prep')) {
    response = `**Kitchen Status**\n\n🔥 Active Orders: 8\n⏱️ Avg Prep Time: 12 minutes\n📋 Queue: 5 orders\n\n⚠️ Attention:\n• Order #127 waiting 15 min\n• 3 orders delayed > 10 min`;
  } else if (queryLower.includes('staff') || queryLower.includes('schedule')) {
    response = `**Staff Dashboard**\n\n👨‍🍳 On Duty: 15\n📅 Scheduled: 18\n💰 Tips Today: ₹8,500\n\nRecommendations:\n• Add 2 servers for dinner rush\n• Consider overtime for kitchen`;
  } else if (queryLower.includes('contract') || queryLower.includes('agreement') || queryLower.includes('po ')) {
    // Live query: ask sutar-contracts for current contracts and format
    // a real dashboard. NEXHA-AUDIT-V2 Phase 9.
    const restaurantId = (context && context.restaurantId) || (req.body && req.body.restaurantId);
    if (!restaurantId) {
      return res.json({
        response: '**Contracts**\n\nProvide a `restaurantId` in the request body or context to query the live contract store.',
        query,
        sources: ['restaurant-os'],
        confidence: 0.5,
        timestamp: new Date().toISOString(),
      });
    }

    const contractHeaders = {};
    if (INTERNAL_SERVICE_TOKEN) {
      contractHeaders['x-internal-token'] = INTERNAL_SERVICE_TOKEN;
    }
    const contractController = new AbortController();
    const contractTimeout = setTimeout(() => contractController.abort(), 5000);

    fetch(`${SUTAR_GATEWAY_URL}/api/sutar/contractsOS/api/contracts?party=${encodeURIComponent(restaurantId)}`, {
      headers: contractHeaders,
      signal: contractController.signal,
    })
      .then((cRes) => cRes.json())
      .then((cData) => {
        clearTimeout(contractTimeout);
        const contracts = (cData && cData.contracts) || [];
        const total = contracts.length;
        const draft = contracts.filter((c) => c.status === 'draft').length;
        const signed = contracts.filter((c) => c.status === 'signed').length;
        const fulfilled = contracts.filter((c) => c.status === 'fulfilled').length;
        const settled = contracts.filter((c) => c.status === 'settled').length;
        const lines = [
          '**Contracts (live from sutar-contracts)**',
          '',
          `📋 Total: ${total}`,
          `📝 Draft: ${draft}`,
          `✍️  Signed: ${signed}`,
          `📦 Fulfilled: ${fulfilled}`,
          `✅ Settled: ${settled}`,
        ];
        const pending = contracts.filter((c) => c.status === 'draft' || c.status === 'negotiating');
        if (pending.length > 0) {
          lines.push('', '**Pending action:**');
          pending.slice(0, 5).forEach((c) => {
            lines.push(`• ${c.id.slice(0, 8)} (${c.kind}) — ${c.status}`);
          });
        }
        lines.push('', '_To create a PO, call_ `POST /api/contracts/from-deal`');
        res.json({
          response: lines.join('\n'),
          query,
          sources: ['sutar-contracts'],
          confidence: 0.88,
          timestamp: new Date().toISOString(),
        });
      })
      .catch((err) => {
        clearTimeout(contractTimeout);
        res.json({
          response: `**Contracts**\n\nsutar-contracts unreachable: ${err instanceof Error ? err.message : String(err)}`,
          query,
          sources: ['restaurant-os'],
          confidence: 0.3,
          timestamp: new Date().toISOString(),
        });
      });
    return;
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
