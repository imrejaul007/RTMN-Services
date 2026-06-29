/**
 * Restaurant Industry Extension
 *
 * Vertical services for restaurant industry.
 * Port: 5010
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { menuService } from './menu/service';
import { kitchenService } from './kitchen/service';
import { posService } from './pos/service';
import { reservationsService } from './reservations/service';
import compatibilityRouter from './adapters/compatibility';

const PORT = process.env.PORT || 5010;
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'restaurant-extension',
    version: '1.0.0',
    port: PORT,
    modules: ['menu', 'kitchen', 'pos', 'reservations', 'orders'],
  });
});

// Migration endpoints
app.use('/', compatibilityRouter);

// ============================================
// MENU ROUTES
// ============================================

app.get('/api/menu', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const menus = menuService.listMenus(tenantId);
  res.json({ menus });
});

app.post('/api/menu', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const menu = menuService.createMenu(tenantId, req.body);
  res.status(201).json(menu);
});

// ============================================
// KITCHEN ROUTES
// ============================================

app.get('/api/kitchen', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const tickets = kitchenService.getActiveTickets(tenantId);
  res.json({ tickets });
});

app.get('/api/kitchen/stats', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const stats = kitchenService.getStats(tenantId);
  res.json(stats);
});

app.patch('/api/kitchen/:orderId', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const ticket = kitchenService.updateTicket(tenantId, req.params.orderId, req.body);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(ticket);
});

// ============================================
// POS ROUTES
// ============================================

app.get('/api/pos/tables', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const tables = posService.listTables(tenantId);
  res.json({ tables });
});

app.post('/api/pos/tables/:id/order', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const order = posService.createOrder(tenantId, {
    tableId: req.params.id,
    items: req.body.items || [],
  });
  res.status(201).json(order);
});

// ============================================
// ORDERS ROUTES
// ============================================

app.get('/api/orders', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const orders = posService.listOrders(tenantId);
  res.json({ orders });
});

app.post('/api/orders', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const order = posService.createOrder(tenantId, req.body);
  res.status(201).json(order);
});

// ============================================
// RESERVATIONS ROUTES
// ============================================

app.get('/api/reservations', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const { date, status } = req.query;
  const reservations = reservationsService.listReservations(tenantId, {
    date: date as string,
    status: status as any,
  });
  res.json({ reservations });
});

app.post('/api/reservations', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const reservation = reservationsService.createReservation(tenantId, req.body);
  res.status(201).json(reservation);
});

app.get('/api/reservations/availability', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(401).json({ error: 'Missing X-Tenant-ID' });
    return;
  }
  const { date, partySize } = req.query;
  const slots = reservationsService.checkAvailability(
    tenantId,
    date as string,
    parseInt(partySize as string) || 2
  );
  res.json({ slots });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║       Restaurant Industry Extension                    ║
║                                                       ║
║  Port: ${PORT}                                              ║
║                                                       ║
║  VERTICAL MODULES:                                   ║
║    POST /api/menu              - Create menu          ║
║    GET  /api/menu             - List menus            ║
║    GET  /api/kitchen          - Active tickets        ║
║    GET  /api/kitchen/stats    - Kitchen stats         ║
║    GET  /api/pos/tables      - List tables            ║
║    POST /api/pos/tables/:id/order - Create order     ║
║    GET  /api/orders           - List orders           ║
║    GET  /api/reservations     - List reservations     ║
║    GET  /api/reservations/availability - Check slots ║
║                                                       ║
║  UNIVERSAL ROUTES (Delegated):                      ║
║    /api/customers → Sales Dept                       ║
║    /api/crm/* → Sales Dept                          ║
║    /api/finance/* → Finance Dept                    ║
║    /api/ads/* → Marketing Dept                      ║
║    /api/loyalty/* → Sales Dept                      ║
║                                                       ║
║  MIGRATION:                                          ║
║    GET /__migration/status     - Migration status    ║
║    GET /__migration/deprecations - Deprecated routes  ║
║    GET /__migration/guide      - Migration guide      ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
