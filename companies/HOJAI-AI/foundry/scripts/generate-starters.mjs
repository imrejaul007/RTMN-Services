#!/usr/bin/env node
/**
 * HOJAI Foundry — bulk starter generator.
 *
 * Generates the 8 remaining starters (b2b, hotel, restaurant, logistics,
 * crm, erp, pos, company) from a small config table. Each starter is a
 * self-contained directory at `foundry/starters/<key>/template/` that
 * the CLI's `renderTemplate()` consumes.
 *
 * Run: node scripts/generate-starters.mjs
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STARTERS_DIR = path.join(ROOT, 'starters');

// ── Starter definitions ──────────────────────────────────────────────────────
//
// Each starter has:
//   - key         matches prompts.js TEMPLATES value
//   - title       human-readable name (used in README + backend logs)
//   - description one-line summary
//   - emoji       icon for CLI prompt
//   - endpoints   list of /api/* routes the frontend will have tabs for
//   - entities    map of in-memory store keys → seed arrays
//   - services    list of { name, file, body } — written under services/
//   - agents      list of { name, description, run(body) → {agent, ...body, ...} }
//   - routes      list of { mount, file, body } — written under routes/
//   - tabs        frontend tabs (label + endpoint to render)

const STARTERS = [
  // ── b2b ─────────────────────────────────────────────────────────────────
  {
    key: 'b2b',
    title: 'B2B',
    description: 'Wholesale B2B platform with RFQ + quote + trade finance + escrow.',
    emoji: '🤝',
    color: '#7c3aed',
    endpoints: ['/api/rfq', '/api/quote', '/api/order', '/api/admin', '/api/agents', '/api/nexha'],
    entities: {
      products: [
        { id: 'p1', title: 'Industrial Bearing 6205', unit: 'piece', price: 450, moq: 100, stock: 5000, category: 'industrial' },
        { id: 'p2', title: 'HDPE Granules — Virgin',   unit: 'kg',    price: 180, moq: 1000, stock: 50000, category: 'chemicals' },
        { id: 'p3', title: 'SS 304 Sheet 2mm',         unit: 'kg',    price: 320, moq: 500, stock: 8000, category: 'metals' },
        { id: 'p4', title: 'Cardboard Boxes (bulk)',   unit: 'piece', price: 28,  moq: 1000, stock: 100000, category: 'packaging' }
      ],
      rfqs: [], quotes: [], orders: [], invoices: []
    },
    services: [
      { name: 'catalog', file: 'catalog.service.js', body: catalogService({
        list: () => 'products',
        getById: (id) => `products.find(p => p.id === '${id}')`,
        create: 'products.unshift({ id: crypto.randomUUID(), ...p, createdAt: new Date().toISOString() })'
      }) },
      { name: 'order', file: 'order.service.js', body: orderServiceB2B() }
    ],
    agents: [
      { name: 'CEO', description: 'Orchestrator. Routes work across sales, procurement, finance, logistics.' },
      { name: 'Sales', description: 'RFQ → quote conversion, deal tracking.' },
      { name: 'Procurement', description: 'Supplier discovery, RFQ broadcast, price negotiation.' },
      { name: 'Finance', description: 'Trade finance, escrow, BNPL, payment reconciliation.' },
      { name: 'Logistics', description: 'Shipping quotes, customs, dispatch.' },
      { name: 'Support', description: 'Buyer/seller tickets, dispute mediation.' }
    ],
    routes: [
      { mount: '/api/rfq', file: 'rfq.js', body: rfqRoute('rfqs') },
      { mount: '/api/quote', file: 'quote.js', body: quoteRoute() },
      { mount: '/api/order', file: 'order.js', body: orderRoute() }
    ],
    adminBody: adminBody(),
    nexhaBody: nexhaBody(),
    webhooksBody: webhooksBody()
  },

  // ── company ─────────────────────────────────────────────────────────────
  {
    key: 'company',
    title: 'Company',
    description: 'Single-tenant business OS: departments, employees, payroll, KPIs.',
    emoji: '🏢',
    color: '#2563eb',
    endpoints: ['/api/employee', '/api/department', '/api/payroll', '/api/admin', '/api/agents', '/api/nexha'],
    entities: {
      employees: [
        { id: 'e1', name: 'Asha Patel',     role: 'Sales Manager',    dept: 'Sales',     salary: 1200000, joinedAt: '2024-03-15' },
        { id: 'e2', name: 'Vikram Singh',   role: 'Engineer',         dept: 'Engineering', salary: 1800000, joinedAt: '2023-07-01' },
        { id: 'e3', name: 'Priya Iyer',     role: 'Marketing Lead',   dept: 'Marketing', salary: 1100000, joinedAt: '2025-01-10' },
        { id: 'e4', name: 'Rejaul Karim',   role: 'Founder / CEO',    dept: 'Exec',      salary: 2400000, joinedAt: '2022-01-01' }
      ],
      departments: [
        { id: 'd1', name: 'Sales',       headcount: 8,  budget: 8000000 },
        { id: 'd2', name: 'Engineering', headcount: 14, budget: 22000000 },
        { id: 'd3', name: 'Marketing',   headcount: 5,  budget: 6000000 },
        { id: 'd4', name: 'Finance',     headcount: 3,  budget: 4500000 },
        { id: 'd5', name: 'HR',          headcount: 2,  budget: 2000000 }
      ],
      payrolls: []
    },
    services: [
      { name: 'workforce', file: 'workforce.service.js', body: workforceService() }
    ],
    agents: [
      { name: 'CEO', description: 'Orchestrator. Strategic decision support, KPI tracking.' },
      { name: 'Sales', description: 'Sales coaching, deal inspection, forecast.' },
      { name: 'Marketing', description: 'Campaign planning, audience insights.' },
      { name: 'HR', description: 'Hiring screen, leave approval, performance reviews.' },
      { name: 'Finance', description: 'Budget alerts, expense policy, financial summaries.' },
      { name: 'Operations', description: 'Process bottlenecks, resource allocation.' }
    ],
    routes: [
      { mount: '/api/employee', file: 'employee.js', body: simpleCrudRoute('employees', 'employee') },
      { mount: '/api/department', file: 'department.js', body: simpleCrudRoute('departments', 'department') },
      { mount: '/api/payroll', file: 'payroll.js', body: payrollRoute() }
    ],
    adminBody: adminBody(),
    nexhaBody: nexhaBody(),
    webhooksBody: webhooksBody()
  },

  // ── hotel ───────────────────────────────────────────────────────────────
  {
    key: 'hotel',
    title: 'Hotel',
    description: 'Hotel OS: rooms, bookings, guests, housekeeping.',
    emoji: '🏨',
    color: '#0ea5e9',
    endpoints: ['/api/room', '/api/booking', '/api/guest', '/api/admin', '/api/agents', '/api/nexha'],
    entities: {
      rooms: [
        { id: 'r101', number: '101', type: 'Deluxe',     rate: 7500,  status: 'available' },
        { id: 'r102', number: '102', type: 'Deluxe',     rate: 7500,  status: 'available' },
        { id: 'r201', number: '201', type: 'Suite',      rate: 14500, status: 'available' },
        { id: 'r202', number: '202', type: 'Suite',      rate: 14500, status: 'occupied'  },
        { id: 'r301', number: '301', type: 'Presidential', rate: 38000, status: 'available' }
      ],
      bookings: [], guests: []
    },
    services: [
      { name: 'rooms', file: 'rooms.service.js', body: catalogService({
        list: () => 'rooms',
        getById: (id) => `rooms.find(r => r.id === '${id}')`,
        create: 'rooms.unshift({ id: crypto.randomUUID(), ...r, createdAt: new Date().toISOString() })'
      }) },
      { name: 'bookings', file: 'bookings.service.js', body: bookingService() }
    ],
    agents: [
      { name: 'CEO', description: 'Orchestrator. Revenue + occupancy KPIs.' },
      { name: 'Reception', description: 'Check-in / check-out, room assignment, upsell.' },
      { name: 'Housekeeping', description: 'Room status, cleaning schedule, maintenance tickets.' },
      { name: 'Revenue', description: 'Dynamic pricing, occupancy forecast, channel mix.' },
      { name: 'Support', description: 'Guest requests, complaints, concierge.' }
    ],
    routes: [
      { mount: '/api/room', file: 'room.js', body: simpleCrudRoute('rooms', 'room') },
      { mount: '/api/booking', file: 'booking.js', body: bookingRoute() },
      { mount: '/api/guest', file: 'guest.js', body: simpleCrudRoute('guests', 'guest') }
    ],
    adminBody: adminBody(),
    nexhaBody: nexhaBody(),
    webhooksBody: webhooksBody()
  },

  // ── restaurant ──────────────────────────────────────────────────────────
  {
    key: 'restaurant',
    title: 'Restaurant',
    description: 'Restaurant OS: menu, tables, KOT, billing, delivery.',
    emoji: '🍽️',
    color: '#ea580c',
    endpoints: ['/api/menu', '/api/table', '/api/order', '/api/admin', '/api/agents', '/api/nexha'],
    entities: {
      menu: [
        { id: 'm1', name: 'Butter Chicken',    price: 380, category: 'mains',   veg: false, available: true },
        { id: 'm2', name: 'Paneer Tikka',      price: 320, category: 'mains',   veg: true,  available: true },
        { id: 'm3', name: 'Garlic Naan',       price: 80,  category: 'breads',  veg: true,  available: true },
        { id: 'm4', name: 'Dal Makhani',       price: 280, category: 'mains',   veg: true,  available: true },
        { id: 'm5', name: 'Gulab Jamun',       price: 120, category: 'dessert', veg: true,  available: true }
      ],
      tables: [
        { id: 't1', number: 1, seats: 2, status: 'free' },
        { id: 't2', number: 2, seats: 4, status: 'free' },
        { id: 't3', number: 3, seats: 4, status: 'occupied' },
        { id: 't4', number: 4, seats: 6, status: 'free' },
        { id: 't5', number: 5, seats: 8, status: 'reserved' }
      ],
      orders: []
    },
    services: [
      { name: 'menu', file: 'menu.service.js', body: catalogService({
        list: () => 'menu',
        getById: (id) => `menu.find(m => m.id === '${id}')`,
        create: 'menu.unshift({ id: crypto.randomUUID(), ...m, createdAt: new Date().toISOString() })'
      }) },
      { name: 'kitchen', file: 'kitchen.service.js', body: kitchenService() }
    ],
    agents: [
      { name: 'CEO', description: 'Orchestrator. Daily revenue + covers.' },
      { name: 'Front-of-house', description: 'Reservations, seating, table turnover.' },
      { name: 'Kitchen', description: 'KOT routing, prep-time, inventory checks.' },
      { name: 'Procurement', description: 'Ingredient ordering, supplier pricing, wastage tracking.' },
      { name: 'Finance', description: 'Daily reconciliation, GST, payout to delivery partners.' }
    ],
    routes: [
      { mount: '/api/menu', file: 'menu.js', body: simpleCrudRoute('menu', 'menu item') },
      { mount: '/api/table', file: 'table.js', body: simpleCrudRoute('tables', 'table') },
      { mount: '/api/order', file: 'order.js', body: kotRoute() }
    ],
    adminBody: adminBody(),
    nexhaBody: nexhaBody(),
    webhooksBody: webhooksBody()
  },

  // ── logistics ───────────────────────────────────────────────────────────
  {
    key: 'logistics',
    title: 'Logistics',
    description: 'Logistics OS: fleet, dispatch, last-mile delivery, tracking.',
    emoji: '🚚',
    color: '#059669',
    endpoints: ['/api/vehicle', '/api/dispatch', '/api/shipment', '/api/admin', '/api/agents', '/api/nexha'],
    entities: {
      vehicles: [
        { id: 'v1', plate: 'MH12AB1234', type: 'mini-truck', capacityKg: 500,  driver: 'Suresh Yadav',  status: 'idle'    },
        { id: 'v2', plate: 'KA03CD5678', type: 'truck',      capacityKg: 5000, driver: 'Mohammed Ali',  status: 'enroute' },
        { id: 'v3', plate: 'DL05EF9012', type: 'van',        capacityKg: 1500, driver: 'Ramesh Kumar',  status: 'idle'    },
        { id: 'v4', plate: 'TN09GH3456', type: 'bike',       capacityKg: 50,   driver: 'Lakshmi Devi',  status: 'idle'    }
      ],
      dispatches: [], shipments: []
    },
    services: [
      { name: 'fleet', file: 'fleet.service.js', body: catalogService({
        list: () => 'vehicles',
        getById: (id) => `vehicles.find(v => v.id === '${id}')`,
        create: 'vehicles.unshift({ id: crypto.randomUUID(), ...v, createdAt: new Date().toISOString() })'
      }) },
      { name: 'dispatch', file: 'dispatch.service.js', body: dispatchService() }
    ],
    agents: [
      { name: 'CEO', description: 'Orchestrator. Fleet utilisation, on-time delivery rate.' },
      { name: 'Dispatch', description: 'Shipment assignment, route planning, capacity matching.' },
      { name: 'Fleet', description: 'Vehicle health, maintenance schedule, driver hours.' },
      { name: 'Customer', description: 'Shipment status, ETA notifications, POD.' },
      { name: 'Finance', description: 'COD reconciliation, fuel costs, driver payouts.' }
    ],
    routes: [
      { mount: '/api/vehicle', file: 'vehicle.js', body: simpleCrudRoute('vehicles', 'vehicle') },
      { mount: '/api/dispatch', file: 'dispatch.js', body: dispatchRoute() },
      { mount: '/api/shipment', file: 'shipment.js', body: simpleCrudRoute('shipments', 'shipment') }
    ],
    adminBody: adminBody(),
    nexhaBody: nexhaBody(),
    webhooksBody: webhooksBody()
  },

  // ── crm ─────────────────────────────────────────────────────────────────
  {
    key: 'crm',
    title: 'CRM',
    description: 'CRM: leads, pipeline, customers, 360 view.',
    emoji: '👥',
    color: '#db2777',
    endpoints: ['/api/lead', '/api/deal', '/api/customer', '/api/admin', '/api/agents', '/api/nexha'],
    entities: {
      leads: [
        { id: 'l1', name: 'Anita Sharma',  company: 'BrightMart',    email: 'anita@brightmart.in',   stage: 'new',     value: 250000 },
        { id: 'l2', name: 'Rohan Mehta',   company: 'MehtaFoods',    email: 'rohan@mehtafoods.com',   stage: 'qualified', value: 480000 },
        { id: 'l3', name: 'Sara Khan',     company: 'NorthWindTech', email: 'sara@northwind.io',     stage: 'demo',    value: 1200000 },
        { id: 'l4', name: 'David Chen',    company: 'BlueWave Labs', email: 'david@bluewave.co',     stage: 'negotiation', value: 3200000 }
      ],
      deals: [], customers: []
    },
    services: [
      { name: 'pipeline', file: 'pipeline.service.js', body: catalogService({
        list: () => 'leads',
        getById: (id) => `leads.find(l => l.id === '${id}')`,
        create: 'leads.unshift({ id: crypto.randomUUID(), ...l, stage: l.stage || "new", createdAt: new Date().toISOString() })'
      }) },
      { name: 'deals', file: 'deals.service.js', body: dealsService() }
    ],
    agents: [
      { name: 'CEO', description: 'Orchestrator. Pipeline coverage, win rate.' },
      { name: 'Sales', description: 'Lead scoring, next-best-action, follow-up drafting.' },
      { name: 'Support', description: 'Customer health, ticket triage, renewal alerts.' },
      { name: 'Marketing', description: 'Lead source attribution, campaign → revenue.' }
    ],
    routes: [
      { mount: '/api/lead', file: 'lead.js', body: simpleCrudRoute('leads', 'lead') },
      { mount: '/api/deal', file: 'deal.js', body: dealRoute() },
      { mount: '/api/customer', file: 'customer.js', body: simpleCrudRoute('customers', 'customer') }
    ],
    adminBody: adminBody(),
    nexhaBody: nexhaBody(),
    webhooksBody: webhooksBody()
  },

  // ── erp ─────────────────────────────────────────────────────────────────
  {
    key: 'erp',
    title: 'ERP',
    description: 'ERP: inventory, procurement, GL, AP/AR.',
    emoji: '📦',
    color: '#475569',
    endpoints: ['/api/item', '/api/po', '/api/ledger', '/api/admin', '/api/agents', '/api/nexha'],
    entities: {
      items: [
        { id: 'i1', sku: 'WIDGET-001', name: 'Standard Widget',  unit: 'piece', cost: 80,  price: 150, stock: 500,  reorderLevel: 100 },
        { id: 'i2', sku: 'GADGET-002', name: 'Premium Gadget',   unit: 'piece', cost: 400, price: 850, stock: 80,   reorderLevel: 50 },
        { id: 'i3', sku: 'BOLT-M8-50', name: 'Bolt M8 × 50mm',   unit: 'piece', cost: 3,   price: 8,   stock: 8000, reorderLevel: 2000 }
      ],
      pos: [], ledger: []
    },
    services: [
      { name: 'inventory', file: 'inventory.service.js', body: catalogService({
        list: () => 'items',
        getById: (id) => `items.find(i => i.id === '${id}')`,
        create: 'items.unshift({ id: crypto.randomUUID(), ...i, createdAt: new Date().toISOString() })'
      }) },
      { name: 'procurement', file: 'procurement.service.js', body: procurementService() }
    ],
    agents: [
      { name: 'CEO', description: 'Orchestrator. Working capital, EBITDA, runway.' },
      { name: 'Procurement', description: 'Reorder suggestions, supplier scoring, RFQ drafting.' },
      { name: 'Finance', description: 'GL postings, AR/AP ageing, cashflow forecast.' },
      { name: 'Operations', description: 'Production schedule, capacity, wastage.' },
      { name: 'HR', description: 'Headcount planning, payroll, leave policy.' }
    ],
    routes: [
      { mount: '/api/item', file: 'item.js', body: simpleCrudRoute('items', 'item') },
      { mount: '/api/po', file: 'po.js', body: poRoute() },
      { mount: '/api/ledger', file: 'ledger.js', body: simpleCrudRoute('ledger', 'ledger entry') }
    ],
    adminBody: adminBody(),
    nexhaBody: nexhaBody(),
    webhooksBody: webhooksBody()
  },

  // ── pos ─────────────────────────────────────────────────────────────────
  {
    key: 'pos',
    title: 'POS',
    description: 'Point-of-Sale: counter, barcode, receipts, daily reconciliation.',
    emoji: '🧾',
    color: '#9333ea',
    endpoints: ['/api/product', '/api/sale', '/api/receipt', '/api/admin', '/api/agents', '/api/nexha'],
    entities: {
      products: [
        { id: 'sku1', barcode: '8901234500011', name: 'Tata Salt 1kg',   price: 28,  stock: 200,  category: 'grocery' },
        { id: 'sku2', barcode: '8901234500028', name: 'Amul Butter 500g', price: 270, stock: 50,   category: 'dairy' },
        { id: 'sku3', barcode: '8901234500035', name: 'Maggi Noodles 4pk', price: 56, stock: 300,  category: 'instant' },
        { id: 'sku4', barcode: '8901234500042', name: 'Coca-Cola 750ml',  price: 40,  stock: 120,  category: 'beverage' }
      ],
      sales: [], receipts: []
    },
    services: [
      { name: 'till', file: 'till.service.js', body: catalogService({
        list: () => 'products',
        getById: (id) => `products.find(p => p.id === '${id}' || p.barcode === '${id}')`,
        create: 'products.unshift({ id: crypto.randomUUID(), ...p, createdAt: new Date().toISOString() })'
      }) },
      { name: 'sales', file: 'sales.service.js', body: salesService() }
    ],
    agents: [
      { name: 'CEO', description: 'Orchestrator. Daily takings, basket size.' },
      { name: 'Cashier', description: 'Barcode scan, totals, change, receipt.' },
      { name: 'Inventory', description: 'Reorder alerts, shrinkage, expiry tracking.' },
      { name: 'Finance', description: 'Daily reconciliation, GST split, payouts.' }
    ],
    routes: [
      { mount: '/api/product', file: 'product.js', body: simpleCrudRoute('products', 'product') },
      { mount: '/api/sale', file: 'sale.js', body: saleRoute() },
      { mount: '/api/receipt', file: 'receipt.js', body: simpleCrudRoute('receipts', 'receipt') }
    ],
    adminBody: adminBody(),
    nexhaBody: nexhaBody(),
    webhooksBody: webhooksBody()
  }
];

// ── Helper: catalog service template ────────────────────────────────────────
function catalogService({ list, getById, create }) {
  return `
import { store } from './store.js';

export function list${capitalize(list().slice(0, -1)) || 'Items'}(opts = {}) {
  const items = store.${list}();
  return items;
}

export function get${capitalize(list().slice(0, -1)) || 'Item'}(id) {
  return ${getById('id')} || null;
}

export function create${capitalize(list().slice(0, -1)) || 'Item'}(p) {
  ${create};
  return p;
}
`.trim() + '\n';
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// ── Helper: industry-specific service bodies (simple stubs) ─────────────────
function orderServiceB2B() {
  return `
import { store } from './store.js';

export function createRfq({ buyerId, productId, quantity, message }) {
  if (!buyerId || !productId) throw new Error('buyerId and productId required');
  const rfq = { id: crypto.randomUUID(), buyerId, productId, quantity: Number(quantity) || 1, message: message || '', status: 'open', createdAt: new Date().toISOString() };
  store.rfqs.unshift(rfq);
  return rfq;
}

export function listRfqs(filter = {}) {
  return store.rfqs.filter(r =>
    (!filter.buyerId || r.buyerId === filter.buyerId) &&
    (!filter.status || r.status === filter.status)
  );
}

export function createQuote({ rfqId, sellerId, priceInr, validUntil }) {
  const rfq = store.rfqs.find(r => r.id === rfqId);
  if (!rfq) throw new Error('rfq not found');
  const quote = { id: crypto.randomUUID(), rfqId, sellerId, priceInr: Number(priceInr) || 0, validUntil: validUntil || null, status: 'pending', createdAt: new Date().toISOString() };
  store.quotes.unshift(quote);
  if (rfq) rfq.status = 'quoted';
  return quote;
}

export function createOrder({ quoteId, buyerId }) {
  const quote = store.quotes.find(q => q.id === quoteId);
  if (!quote) throw new Error('quote not found');
  const order = { id: crypto.randomUUID(), quoteId, buyerId, amountInr: quote.priceInr, status: 'created', createdAt: new Date().toISOString() };
  store.orders.unshift(order);
  return order;
}

export function listOrders(filter = {}) {
  return store.orders.filter(o => !filter.buyerId || o.buyerId === filter.buyerId);
}

export function listQuotes(rfqId) {
  return store.quotes.filter(q => q.rfqId === rfqId);
}
`.trim() + '\n';
}

function workforceService() {
  return `
import { store } from './store.js';

export function listEmployees() { return store.employees; }
export function listDepartments() { return store.departments; }

export function createEmployee({ name, role, dept, salary }) {
  if (!name || !role) throw new Error('name and role required');
  const e = { id: crypto.randomUUID(), name, role, dept: dept || 'Unassigned', salary: Number(salary) || 0, joinedAt: new Date().toISOString().slice(0, 10) };
  store.employees.unshift(e);
  return e;
}

export function runPayroll({ month }) {
  const total = store.employees.reduce((sum, e) => sum + (e.salary || 0), 0);
  const entry = { id: crypto.randomUUID(), month: month || new Date().toISOString().slice(0, 7), employees: store.employees.length, total, createdAt: new Date().toISOString() };
  store.payrolls.unshift(entry);
  return entry;
}

export function listPayrolls() { return store.payrolls; }
`.trim() + '\n';
}

function bookingService() {
  return `
import { store } from './store.js';

export function listRooms() { return store.rooms; }
export function getRoom(id) { return store.rooms.find(r => r.id === id) || null; }

export function createBooking({ roomId, guestId, checkIn, checkOut }) {
  const room = store.rooms.find(r => r.id === roomId);
  if (!room) throw new Error('room not found');
  if (room.status === 'occupied') throw new Error('room is occupied');
  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000));
  const booking = { id: crypto.randomUUID(), roomId, guestId, checkIn, checkOut, nights, totalInr: nights * room.rate, status: 'confirmed', createdAt: new Date().toISOString() };
  store.bookings.unshift(booking);
  room.status = 'occupied';
  return booking;
}

export function listBookings() { return store.bookings; }

export function checkout(bookingId) {
  const booking = store.bookings.find(b => b.id === bookingId);
  if (!booking) throw new Error('booking not found');
  const room = store.rooms.find(r => r.id === booking.roomId);
  if (room) room.status = 'available';
  booking.status = 'checked-out';
  return booking;
}
`.trim() + '\n';
}

function kitchenService() {
  return `
import { store } from './store.js';

export function listMenu() { return store.menu; }
export function listTables() { return store.tables; }

export function createOrder({ tableId, items, customerName }) {
  const table = store.tables.find(t => t.id === tableId);
  if (!table) throw new Error('table not found');
  const ids = (items || []).map(i => i.menuItemId);
  const menuItems = store.menu.filter(m => ids.includes(m.id));
  const totalInr = menuItems.reduce((sum, m, idx) => sum + m.price * (items[idx].qty || 1), 0);
  const order = { id: crypto.randomUUID(), tableId, customerName: customerName || null, items: items || [], menuItems, totalInr, status: 'kot', createdAt: new Date().toISOString() };
  store.orders.unshift(order);
  if (table) table.status = 'occupied';
  return order;
}

export function listOrders() { return store.orders; }

export function closeOrder(orderId) {
  const order = store.orders.find(o => o.id === orderId);
  if (!order) throw new Error('order not found');
  const table = store.tables.find(t => t.id === order.tableId);
  if (table) table.status = 'free';
  order.status = 'paid';
  return order;
}
`.trim() + '\n';
}

function dispatchService() {
  return `
import { store } from './store.js';

export function listVehicles() { return store.vehicles; }

export function createShipment({ origin, destination, weightKg, customerId }) {
  if (!origin || !destination) throw new Error('origin and destination required');
  const shipment = { id: crypto.randomUUID(), origin, destination, weightKg: Number(weightKg) || 0, customerId: customerId || null, status: 'pending', createdAt: new Date().toISOString() };
  store.shipments.unshift(shipment);
  return shipment;
}

export function listShipments() { return store.shipments; }

export function dispatch(shipmentId, vehicleId) {
  const shipment = store.shipments.find(s => s.id === shipmentId);
  const vehicle = store.vehicles.find(v => v.id === vehicleId);
  if (!shipment || !vehicle) throw new Error('shipment or vehicle not found');
  shipment.vehicleId = vehicleId;
  shipment.status = 'in-transit';
  vehicle.status = 'enroute';
  const entry = { id: crypto.randomUUID(), shipmentId, vehicleId, dispatchedAt: new Date().toISOString() };
  store.dispatches.unshift(entry);
  return entry;
}

export function listDispatches() { return store.dispatches; }
`.trim() + '\n';
}

function dealsService() {
  return `
import { store } from './store.js';

export function listLeads() { return store.leads; }
export function getLead(id) { return store.leads.find(l => l.id === id) || null; }

export function createLead({ name, company, email, stage, value }) {
  if (!name || !email) throw new Error('name and email required');
  const lead = { id: crypto.randomUUID(), name, company: company || '', email, stage: stage || 'new', value: Number(value) || 0, createdAt: new Date().toISOString() };
  store.leads.unshift(lead);
  return lead;
}

export function advanceStage(leadId, newStage) {
  const lead = store.leads.find(l => l.id === leadId);
  if (!lead) throw new Error('lead not found');
  lead.stage = newStage;
  return lead;
}

export function createDeal({ leadId, amountInr, closeDate }) {
  const lead = store.leads.find(l => l.id === leadId);
  if (!lead) throw new Error('lead not found');
  const deal = { id: crypto.randomUUID(), leadId, customerId: lead.id, amountInr: Number(amountInr) || lead.value, closeDate: closeDate || null, status: 'open', createdAt: new Date().toISOString() };
  store.deals.unshift(deal);
  lead.stage = 'won';
  return deal;
}

export function listDeals() { return store.deals; }
`.trim() + '\n';
}

function procurementService() {
  return `
import { store } from './store.js';

export function listItems() { return store.items; }
export function getItem(id) { return store.items.find(i => i.id === id) || null; }

export function createPO({ supplierId, items, expectedAt }) {
  const ids = (items || []).map(i => i.itemId);
  const itemsFull = store.items.filter(i => ids.includes(i.id));
  const totalInr = itemsFull.reduce((sum, it, idx) => sum + it.cost * (items[idx].qty || 1), 0);
  const po = { id: crypto.randomUUID(), supplierId, items: items || [], totalInr, expectedAt: expectedAt || null, status: 'sent', createdAt: new Date().toISOString() };
  store.pos.unshift(po);
  return po;
}

export function listPOs() { return store.pos; }

export function createLedgerEntry({ account, debit, credit, memo }) {
  const entry = { id: crypto.randomUUID(), account: account || 'general', debit: Number(debit) || 0, credit: Number(credit) || 0, memo: memo || '', createdAt: new Date().toISOString() };
  store.ledger.unshift(entry);
  return entry;
}

export function listLedger() { return store.ledger; }
`.trim() + '\n';
}

function salesService() {
  return `
import { store } from './store.js';

export function listProducts() { return store.products; }
export function getProduct(id) { return store.products.find(p => p.id === id || p.barcode === id) || null; }

export function createSale({ lines, paymentMethod, totalInr }) {
  if (!lines || !lines.length) throw new Error('lines required');
  const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const sale = { id: crypto.randomUUID(), lines, totalInr: totalInr || total, paymentMethod: paymentMethod || 'cash', createdAt: new Date().toISOString() };
  store.sales.unshift(sale);
  const receipt = { id: crypto.randomUUID(), saleId: sale.id, totalInr: sale.totalInr, printedAt: sale.createdAt };
  store.receipts.unshift(receipt);
  return { sale, receipt };
}

export function listSales() { return store.sales; }
export function listReceipts() { return store.receipts; }
`.trim() + '\n';
}

// ── Helper: route templates ────────────────────────────────────────────────
function rfqRoute(entity) {
  return `
import { Router } from 'express';
import { createRfq, listRfqs, createQuote, createOrder, listQuotes, listOrders } from '../services/order.service.js';

const r = Router();

r.get('/', (req, res) => res.json({ items: listRfqs({ buyerId: req.query.buyerId, status: req.query.status }) }));
r.post('/', (req, res) => {
  try { res.status(201).json(createRfq(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
`.trim() + '\n';
}

function quoteRoute() {
  return `
import { Router } from 'express';
import { createQuote, listQuotes } from '../services/order.service.js';

const r = Router();

r.post('/', (req, res) => {
  try { res.status(201).json(createQuote(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.get('/:rfqId', (req, res) => res.json({ items: listQuotes(req.params.rfqId) }));

export default r;
`.trim() + '\n';
}

function orderRoute() {
  return `
import { Router } from 'express';
import { createOrder, listOrders } from '../services/order.service.js';

const r = Router();

r.post('/', (req, res) => {
  try { res.status(201).json(createOrder(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.get('/', (req, res) => res.json({ items: listOrders({ buyerId: req.query.buyerId }) }));

export default r;
`.trim() + '\n';
}

function simpleCrudRoute(entityKey, entityLabel) {
  return `
import { Router } from 'express';

const r = Router();

r.get('/', (_req, res) => res.json({ items: global.store.${entityKey} || [] }));
r.get('/:id', (req, res) => {
  const item = (global.store.${entityKey} || []).find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: '${entityLabel} not found' });
  res.json(item);
});
r.post('/', (req, res) => {
  const body = req.body || {};
  const item = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() };
  if (!global.store.${entityKey}) global.store.${entityKey} = [];
  global.store.${entityKey}.unshift(item);
  res.status(201).json(item);
});

export default r;
`.trim() + '\n';
}

function payrollRoute() {
  return `
import { Router } from 'express';
import { runPayroll, listPayrolls } from '../services/workforce.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listPayrolls() }));
r.post('/', (req, res) => {
  try { res.status(201).json(runPayroll(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
`.trim() + '\n';
}

function bookingRoute() {
  return `
import { Router } from 'express';
import { createBooking, listBookings, checkout } from '../services/bookings.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listBookings() }));
r.post('/', (req, res) => {
  try { res.status(201).json(createBooking(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.post('/:id/checkout', (req, res) => {
  try { res.json(checkout(req.params.id)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
`.trim() + '\n';
}

function kotRoute() {
  return `
import { Router } from 'express';
import { createOrder, listOrders, closeOrder } from '../services/kitchen.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listOrders() }));
r.post('/', (req, res) => {
  try { res.status(201).json(createOrder(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.post('/:id/close', (req, res) => {
  try { res.json(closeOrder(req.params.id)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
`.trim() + '\n';
}

function dispatchRoute() {
  return `
import { Router } from 'express';
import { dispatch, listDispatches } from '../services/dispatch.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listDispatches() }));
r.post('/', (req, res) => {
  try { res.status(201).json(dispatch(req.body.shipmentId, req.body.vehicleId)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
`.trim() + '\n';
}

function dealRoute() {
  return `
import { Router } from 'express';
import { createDeal, listDeals, advanceStage } from '../services/deals.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listDeals() }));
r.post('/', (req, res) => {
  try { res.status(201).json(createDeal(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.post('/:id/advance', (req, res) => {
  try { res.json(advanceStage(req.params.id, req.body.stage)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
`.trim() + '\n';
}

function poRoute() {
  return `
import { Router } from 'express';
import { createPO, listPOs, createLedgerEntry } from '../services/procurement.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listPOs() }));
r.post('/', (req, res) => {
  try { res.status(201).json(createPO(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
r.post('/ledger', (req, res) => {
  try { res.status(201).json(createLedgerEntry(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
`.trim() + '\n';
}

function saleRoute() {
  return `
import { Router } from 'express';
import { createSale, listSales } from '../services/sales.service.js';

const r = Router();

r.get('/', (_req, res) => res.json({ items: listSales() }));
r.post('/', (req, res) => {
  try { res.status(201).json(createSale(req.body || {})); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default r;
`.trim() + '\n';
}

function adminBody() {
  return `import { Router } from 'express';
import { store } from '../services/store.js';

const r = Router();

r.get('/overview', (_req, res) => {
  res.json({
    counts: Object.fromEntries(Object.keys(store).map(k => [k, store[k]().length]))
  });
});

r.post('/reset', (_req, res) => {
  store.reset();
  res.json({ ok: true });
});

export default r;
`;
}

function nexhaBody() {
  return `import { Router } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const r = Router();

r.get('/profile', async (_req, res) => {
  let manifest = {}, capability = {};
  try { manifest = JSON.parse(await fs.readFile(path.resolve(__dirname, '..', '..', '..', '..', '.hojai', 'manifest.json'), 'utf8')); } catch {}
  try { capability = JSON.parse(await fs.readFile(path.resolve(__dirname, '..', '..', '..', '..', '.hojai', 'capability.json'), 'utf8')); } catch {}
  res.json({ manifest, capability });
});

export default r;
`;
}

function webhooksBody() {
  return `import { Router } from 'express';

const r = Router();

r.post('/nexha', (req, res) => {
  console.log('[nexha webhook]', JSON.stringify(req.body || {}).slice(0, 200));
  res.json({ ok: true });
});
r.post('/payment', (req, res) => {
  console.log('[payment webhook]', JSON.stringify(req.body || {}).slice(0, 200));
  res.json({ ok: true });
});

export default r;
`;
}

// ── Generators for non-domain files ────────────────────────────────────────
function generateStore(entities, title) {
  const lines = [];
  const keys = Object.keys(entities);
  for (const key of keys) {
    const seed = JSON.stringify(entities[key], null, 2);
    lines.push(`  ${key}: ${seed},`);
  }
  return `/**
 * ${title} — in-memory store (v0).
 *
 * Replace with Mongo/Postgres when you're ready. Public API:
 *   - store.<entity> is the live array (mutate with .unshift, .find, .length)
 *   - store.reset() restores all entities to their seed values
 *
 * Example:
 *   import { store } from './store.js';
 *   store.products.unshift({ id: 'x', ... });
 *   const all = store.products.filter(p => p.stock > 0);
 */

export const store = {
${lines.join('\n')}

  reset() {
    const SEEDS = ${JSON.stringify(Object.fromEntries(Object.entries(entities).map(([k, v]) => [k, v])), null, 2)};
    for (const k of Object.keys(SEEDS)) {
      store[k].length = 0;
      store[k].push(...JSON.parse(JSON.stringify(SEEDS[k])));
    }
  }
};

// Make store available on globalThis for routes that use globalThis.store.<key>.
globalThis.store = store;
`;
}

function generateAgents(agents) {
  // Strategy: a thin closure that echoes back the body so the dev sees
  // what came in. Replace with a real LLM-backed strategy by editing
  // the `strategy` function on each BaseAgent registration.
  return `/**
 * SUTAR agent registry for {{PROJECT_TITLE}}.
 *
 * Each agent is a \`BaseAgent\` instance from our local runtime
 * (\`../runtime/BaseAgent.js\`). The runtime runs in two modes:
 *
 *   • **local mode** — runs the deterministic \`strategy\` function.
 *     This is the default and lets the app boot end-to-end without any
 *     external service. It is what you see right now.
 *
 *   • **remote mode** — when \`HOJAI_SUTAR_URL\` and \`HOJAI_API_KEY\`
 *     are set in the environment, every \`run()\` call is forwarded
 *     to the SUTAR merchant-agents service. No code change needed.
 *
 * The shape returned is normalized:
 *
 *   { agent: 'Sales', output: {...}, success: true, latencyMs: 4, source: 'local' }
 *
 * To upgrade an agent to use the real \`@hojai/sutar\` SDK or an LLM,
 * replace its \`strategy\` function. The registry and HTTP routes stay
 * the same.
 */

import { BaseAgent, createAgentRegistry } from '../runtime/BaseAgent.js';

${agents.map(a => `function ${a.name.replace(/[^a-zA-Z]/g, '')}Strategy(body = {}) {
  return { agent: ${JSON.stringify(a.name)}, received: body, message: 'Stub response (no LLM in v0). Replace the strategy with a real @hojai/sutar BaseAgent or LLM call.' };
}
`).join('\n')}

const registry = createAgentRegistry();

${agents.map(a => `registry.register(new BaseAgent({
  name: ${JSON.stringify(a.name)},
  type: 'merchant',
  industry: '${agents[0]?.industry || 'unknown'}',
  description: ${JSON.stringify(a.description)},
  capabilities: ${JSON.stringify((a.capabilities || []))},
  strategy: ${a.name.replace(/[^a-zA-Z]/g, '')}Strategy
}));
`).join('\n')}

export function listAgents() {
  return registry.list().map(({ name, description }) => ({ name, description }));
}

export async function runAgent(name, body) {
  return registry.run(name, body || {});
}
`;
}

function generateBackendIndex(title, templateKey, endpoints, agents) {
  return `/**
 * ${title} — backend entry point.
 *
 * v0 runs in-memory (no DB) so the 30-min journey boots instantly.
 * Replace the in-memory stores with Mongo/Postgres when you're ready.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

${generateRouteImports(templateKey)}
import { errorHandler } from './middleware/error.js';
import { listAgents, runAgent } from './agents/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4001);
const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

app.get('/health', (_q, r) => r.json({ status: 'ok', service: '{{PROJECT_NAME}}-backend', port: PORT, agents: listAgents().length }));
app.get('/', async (_q, r) => {
  let manifest = {};
  try { manifest = JSON.parse(await fs.readFile(path.resolve(__dirname, '..', '..', '..', '..', '.hojai', 'manifest.json'), 'utf8')); } catch {}
  r.json({
    service: '{{PROJECT_NAME}}-backend',
    project: '{{PROJECT_TITLE}}',
    template: '${templateKey}',
    region: manifest.region || 'unknown',
    languages: manifest.languages || ['en'],
    agents: listAgents().map(a => a.name),
    endpoints: ['/health', ${endpoints.map(e => `'${e}'`).join(', ')}]
  });
});

${generateRouteMounts(templateKey)}

app.get('/api/agents', (_q, r) => r.json({ agents: listAgents() }));
app.post('/api/agents/:name', express.json(), async (req, r) => {
  try { r.json(await runAgent(req.params.name, req.body || {})); }
  catch (e) { r.status(400).json({ error: e.message }); }
});

app.use(errorHandler);

app.listen(PORT, () => console.log(\`[{{PROJECT_NAME}}-backend] listening on http://localhost:\${PORT}\`));
`;
}

function generateRouteImports(templateKey) {
  const imports = [];
  switch (templateKey) {
    case 'b2b':
      imports.push("import rfqRoutes from './routes/rfq.js';");
      imports.push("import quoteRoutes from './routes/quote.js';");
      imports.push("import orderRoutes from './routes/order.js';");
      break;
    case 'company':
      imports.push("import employeeRoutes from './routes/employee.js';");
      imports.push("import departmentRoutes from './routes/department.js';");
      imports.push("import payrollRoutes from './routes/payroll.js';");
      break;
    case 'hotel':
      imports.push("import roomRoutes from './routes/room.js';");
      imports.push("import bookingRoutes from './routes/booking.js';");
      imports.push("import guestRoutes from './routes/guest.js';");
      break;
    case 'restaurant':
      imports.push("import menuRoutes from './routes/menu.js';");
      imports.push("import tableRoutes from './routes/table.js';");
      imports.push("import orderRoutes from './routes/order.js';");
      break;
    case 'logistics':
      imports.push("import vehicleRoutes from './routes/vehicle.js';");
      imports.push("import dispatchRoutes from './routes/dispatch.js';");
      imports.push("import shipmentRoutes from './routes/shipment.js';");
      break;
    case 'crm':
      imports.push("import leadRoutes from './routes/lead.js';");
      imports.push("import dealRoutes from './routes/deal.js';");
      imports.push("import customerRoutes from './routes/customer.js';");
      break;
    case 'erp':
      imports.push("import itemRoutes from './routes/item.js';");
      imports.push("import poRoutes from './routes/po.js';");
      imports.push("import ledgerRoutes from './routes/ledger.js';");
      break;
    case 'pos':
      imports.push("import productRoutes from './routes/product.js';");
      imports.push("import saleRoutes from './routes/sale.js';");
      imports.push("import receiptRoutes from './routes/receipt.js';");
      break;
  }
  imports.push("import adminRoutes from './routes/admin.js';");
  imports.push("import webhooksRoutes from './routes/webhooks.js';");
  imports.push("import nexhaRoutes from './routes/nexha.js';");
  return imports.join('\n');
}

function generateRouteMounts(templateKey) {
  const mounts = [];
  switch (templateKey) {
    case 'b2b':
      mounts.push("app.use('/api/rfq', rfqRoutes);");
      mounts.push("app.use('/api/quote', quoteRoutes);");
      mounts.push("app.use('/api/order', orderRoutes);");
      break;
    case 'company':
      mounts.push("app.use('/api/employee', employeeRoutes);");
      mounts.push("app.use('/api/department', departmentRoutes);");
      mounts.push("app.use('/api/payroll', payrollRoutes);");
      break;
    case 'hotel':
      mounts.push("app.use('/api/room', roomRoutes);");
      mounts.push("app.use('/api/booking', bookingRoutes);");
      mounts.push("app.use('/api/guest', guestRoutes);");
      break;
    case 'restaurant':
      mounts.push("app.use('/api/menu', menuRoutes);");
      mounts.push("app.use('/api/table', tableRoutes);");
      mounts.push("app.use('/api/order', orderRoutes);");
      break;
    case 'logistics':
      mounts.push("app.use('/api/vehicle', vehicleRoutes);");
      mounts.push("app.use('/api/dispatch', dispatchRoutes);");
      mounts.push("app.use('/api/shipment', shipmentRoutes);");
      break;
    case 'crm':
      mounts.push("app.use('/api/lead', leadRoutes);");
      mounts.push("app.use('/api/deal', dealRoutes);");
      mounts.push("app.use('/api/customer', customerRoutes);");
      break;
    case 'erp':
      mounts.push("app.use('/api/item', itemRoutes);");
      mounts.push("app.use('/api/po', poRoutes);");
      mounts.push("app.use('/api/ledger', ledgerRoutes);");
      break;
    case 'pos':
      mounts.push("app.use('/api/product', productRoutes);");
      mounts.push("app.use('/api/sale', saleRoutes);");
      mounts.push("app.use('/api/receipt', receiptRoutes);");
      break;
  }
  mounts.push("app.use('/api/admin', adminRoutes);");
  mounts.push("app.use('/api/webhooks', webhooksRoutes);");
  mounts.push("app.use('/api/nexha', nexhaRoutes);");
  return mounts.join('\n');
}

function generateFrontend(opts) {
  return { publicDir: opts.publicDir, server: opts.server };
}

function generateFrontendHtml(title, color) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{{PROJECT_TITLE}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <header>
    <h1>{{PROJECT_TITLE}}</h1>
    <span class="tag">HOJAI Foundry · {{TEMPLATE}}</span>
  </header>
  <nav id="tabs"></nav>
  <main id="content">
    <p class="muted">Loading…</p>
  </main>
  <footer>
    <small>Region: <b>{{REGION}}</b> · Languages: <b>{{LANGUAGES_COMMA}}</b> · Agents: <b>{{AGENTS_COMMA}}</b></small>
  </footer>
  <script src="/app.js"></script>
</body>
</html>
`;
}

function generateFrontendCss(color) {
  return `:root { --accent: ${color}; }
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.5 system-ui, sans-serif; background: #0b1020; color: #e5e7eb; }
header { padding: 16px 24px; background: #111827; display: flex; align-items: baseline; gap: 16px; border-bottom: 1px solid #1f2937; }
header h1 { margin: 0; font-size: 18px; }
header .tag { font-size: 12px; color: #9ca3af; }
nav { display: flex; gap: 4px; padding: 8px 16px; background: #0f172a; border-bottom: 1px solid #1f2937; overflow-x: auto; }
nav button { background: transparent; color: #9ca3af; border: 0; padding: 8px 14px; cursor: pointer; font-size: 13px; border-radius: 6px; }
nav button.active { color: #fff; background: var(--accent); }
main { padding: 24px; max-width: 1100px; margin: 0 auto; }
footer { padding: 12px 24px; background: #0f172a; color: #6b7280; text-align: center; border-top: 1px solid #1f2937; }
.muted { color: #9ca3af; }
.card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
.card h3 { margin: 0 0 6px; font-size: 15px; }
.card small { color: #9ca3af; }
button.primary { background: var(--accent); color: #fff; border: 0; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
button.primary:hover { filter: brightness(1.1); }
input, select, textarea { background: #0f172a; color: #e5e7eb; border: 1px solid #334155; padding: 6px 8px; border-radius: 4px; font: inherit; }
label { display: block; margin: 8px 0 4px; font-size: 12px; color: #9ca3af; }
.grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 8px 10px; border-bottom: 1px solid #1f2937; text-align: left; font-size: 13px; }
th { color: #9ca3af; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.tag-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #334155; color: #e5e7eb; font-size: 11px; }
`;
}

function generateFrontendJs(tabs) {
  // tabs is [{ key, label, renderSource }] where renderSource is JS code
  // for an async function body. We construct the final app.js with the
  // render functions inlined as real arrow functions, using Function()
  // only at the generator level — never at runtime.
  const cardHelpers = 'const CARD_FNS = ' + JSON.stringify(
    Object.fromEntries(Object.entries(CARD_FNS).map(([k, v]) => [k, v])), null, 2
  ) + ';';

  const tabsLiteral = JSON.stringify(tabs.map(t => ({ key: t.key, label: t.label })), null, 2);

  const tabSources = tabs.map(t => {
    return '  ' + JSON.stringify(t.key) + ': ' + t.renderSource;
  }).join(',\n');

  return [
    '// Auto-generated by HOJAI Foundry. Do not edit directly.',
    'const TABS = ' + tabsLiteral + ';',
    '',
    cardHelpers,
    '',
    'const tabBar = document.getElementById("tabs");',
    'const content = document.getElementById("content");',
    'let active = TABS[0].key;',
    '',
    'TABS.forEach(t => {',
    '  const b = document.createElement("button");',
    '  b.textContent = t.label;',
    '  b.onclick = () => { active = t.key; render(); };',
    '  tabBar.appendChild(b);',
    '});',
    '',
    'const RENDERERS = {',
    tabSources,
    '};',
    '',
    'function render() {',
    '  [...tabBar.children].forEach((b, i) => b.classList.toggle("active", TABS[i].key === active));',
    '  const tab = TABS.find(t => t.key === active);',
    '  content.innerHTML = "<p class=\\"muted\\">Loading…</p>";',
    '  RENDERERS[tab.key]().then(html => content.innerHTML = html).catch(e => content.innerHTML = "<p>Error: " + e.message + "</p>");',
    '}',
    '',
    'async function api(path, opts) {',
    '  const r = await fetch("/api" + path, opts);',
    '  if (!r.ok) throw new Error(await r.text());',
    '  return r.json();',
    '}',
    '',
    'window.invokeAgent = async (name) => {',
    '  const r = await api("/agents/" + encodeURIComponent(name), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: { example: "data" } }) });',
    '  alert("Agent " + name + " returned:\\n\\n" + JSON.stringify(r, null, 2));',
    '};',
    '',
    'function listView(items, fn) {',
    '  if (!items.length) return "<p class=\\"muted\\">No items yet.</p>";',
    '  return "<div class=\\"grid\\">" + items.map(fn).join("") + "</div>";',
    '}',
    '',
    'function card(title, subtitle) {',
    '  return "<div class=\\"card\\"><h3>" + title + "</h3><small>" + subtitle + "</small></div>";',
    '}',
    '',
    'render();',
    ''
  ].join('\n');
}

function generateHojaiMd(starter) {
  const endpointRows = starter.endpoints.map(e => `| \`${e}\` | ${e.replace('/api/', '')} endpoints |`).join('\n');
  const agentRows = starter.agents.map(a => `| \`${a.name}\` | ${a.description} |`).join('\n');
  return `# HOJAI Project: {{PROJECT_TITLE}}

> This file is auto-generated by HOJAI Foundry. Do not edit manually unless you know what you're doing.
> AI coding assistants (Claude Code, Cursor, Codex, GitHub Copilot) should read this file first to understand the project.

## What this app does

{{PROJECT_TITLE}} is a **${starter.title}** built with the HOJAI Foundry \`${starter.key}\` starter.
${starter.description}

Region: **{{REGION}}** · Languages: **{{LANGUAGES_COMMA}}** · Template: **${starter.key}**

## Architecture

- **Backend:** Node.js (v18+) + Express + ESM (in-memory store for v0)
- **Frontend:** Static HTML + vanilla JS (zero build step) served on :3000
- **Mobile:** (optional) — see \`apps/mobile/README.md\` when you scaffold it
- **AI Runtime:** HOJAI SUTAR OS v1 (agent stubs in \`apps/backend/src/agents/\`)
- **Identity:** HOJAI CorpID (via \`@hojai/foundation\`)
- **Memory:** HOJAI MemoryOS (via \`@hojai/foundation\`)

## Endpoints

| Endpoint | Purpose |
|---|---|
${endpointRows}

## Agents

| Agent | Purpose |
|---|---|
${agentRows}

## Extension guide

1. Replace the in-memory store at \`apps/backend/src/services/store.js\` with Mongo/Postgres.
2. Replace each agent stub in \`apps/backend/src/agents/index.js\` with a real \`@hojai/sutar\` BaseAgent.
3. Add new endpoints by extending \`apps/backend/src/routes/\` and registering them in \`apps/backend/src/index.js\`.
4. Add new tabs in \`apps/frontend/public/app.js\` by adding to the TABS array.
`;
}

function generateArchitectureMd(starter) {
  return `# {{PROJECT_TITLE}} — Architecture

> ${starter.description}

## Layers

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│  Frontend  (apps/frontend — :3000)  Static HTML + vanilla JS │
└────────────────────────────┬────────────────────────────────┘
                             │ /api/*
┌────────────────────────────▼────────────────────────────────┐
│  Backend   (apps/backend — :4001)   Express + ESM            │
│  ├── routes/      REST endpoints                             │
│  ├── services/    domain logic (catalog, order, …)           │
│  ├── agents/      SUTAR agent registry                       │
│  └── middleware/  error handling                             │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  Foundation  (HOJAI SDKs)                                    │
│  ├── @hojai/foundation  CorpID + MemoryOS                    │
│  ├── @hojai/sutar       Agent runtime                        │
│  ├── @hojai/nexha       Federation                           │
│  ├── @hojai/commerce    Payments + cart                      │
│  ├── @hojai/payment     RABTUL payment rails                 │
│  ├── @hojai/logistics   KHAIRMOVE fleet                      │
│  ├── @hojai/reputation  Trust + scoring                      │
│  └── @hojai/discovery   Nexha directory                      │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Data flow

1. Frontend renders from in-memory store via REST.
2. SUTAR agents are invoked at \`POST /api/agents/<name>\` with a JSON body.
3. The backend reads/writes the in-memory store synchronously (v0).
4. Nexha federation profile is exposed at \`GET /api/nexha/profile\`.

## What to replace first

1. **Store** — swap in-memory Maps for Mongo/Postgres at \`services/store.js\`.
2. **Agents** — replace stub returns in \`agents/index.js\` with \`@hojai/sutar\` BaseAgent calls.
3. **Auth** — wire \`@hojai/foundation\` CorpID into the \`requireAuth\` middleware.
4. **Webhooks** — connect \`/api/webhooks/*\` to payment + logistics providers.
`;
}

function generatePackageJson(starter) {
  return `{
  "name": "{{PROJECT_NAME}}",
  "version": "0.1.0",
  "private": true,
  "description": "{{PROJECT_TITLE}} — ${starter.title.toLowerCase()} starter generated by HOJAI Foundry.",
  "type": "module",
  "main": "apps/backend/src/index.js",
  "scripts": {
    "dev": "node scripts/dev.js",
    "dev:backend": "node apps/backend/src/index.js",
    "dev:frontend": "node apps/frontend/server.js",
    "build": "echo 'No build step required for v0 — apps run directly.'",
    "start": "node apps/backend/src/index.js",
    "test": "node --test apps/backend/src/__tests__/*.test.js",
    "deploy": "echo 'Run: npx hojai deploy'"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  },
  "optionalDependencies": {
    "@hojai/foundation": "^1.0.0",
    "@hojai/sutar": "^1.0.0",
    "@hojai/nexha": "^1.0.0",
    "@hojai/commerce": "^1.0.0",
    "@hojai/payment": "^1.0.0",
    "@hojai/logistics": "^1.0.0",
    "@hojai/reputation": "^1.0.0",
    "@hojai/discovery": "^1.0.0"
  },
  "engines": {
    "node": ">=18"
  }
}
`;
}

function generateDevScript() {
  return `#!/usr/bin/env node
/**
 * {{PROJECT_TITLE}} — dev orchestrator.
 *
 * Spawns the backend (4001) and frontend (3000) in one process.
 * Hit Ctrl-C to stop both.
 */

const { spawn } = require('node:child_process');

const CYAN = (s) => '\\x1b[36m' + s + '\\x1b[0m';
const GRAY = (s) => '\\x1b[90m' + s + '\\x1b[0m';
const GREEN = (s) => '\\x1b[32m' + s + '\\x1b[0m';

const procs = [];
function start(label, script) {
  console.log(CYAN('[start]') + ' ' + label);
  const p = spawn(process.execPath, [script], { stdio: 'inherit' });
  procs.push(p);
  p.on('exit', (code) => console.log(GRAY('[exit]') + ' ' + label + ' code=' + code));
}

start('backend  :4001', 'apps/backend/src/index.js');
start('frontend :3000', 'apps/frontend/server.js');

console.log(GREEN('\\nDev stack running. Ctrl-C to stop.\\n'));
console.log('  → http://localhost:3000  (frontend)');
console.log('  → http://localhost:4001  (backend)\\n');

process.on('SIGINT', () => { procs.forEach(p => p.kill('SIGINT')); process.exit(0); });
process.on('SIGTERM', () => { procs.forEach(p => p.kill('SIGTERM')); process.exit(0); });
`;
}

function generateFrontendServer() {
  return `/**
 * {{PROJECT_TITLE}} — zero-build static frontend server.
 *
 * Serves apps/frontend/public/ on :3000 and proxies /api/* to the
 * backend on :4001.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const PORT = Number(process.env.PORT || 3000);
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4001';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon'
};

async function serveStatic(req, res) {
  let rel = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  if (rel.startsWith('/api/')) return proxyApi(req, res);
  const file = path.join(PUBLIC_DIR, rel);
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
  }
}

async function proxyApi(req, res) {
  const url = BACKEND + req.url;
  const headers = { 'content-type': req.headers['content-type'] || 'application/json' };
  const opts = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    opts.body = await new Promise((resolve) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  try {
    const upstream = await fetch(url, opts);
    const body = await upstream.text();
    res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') || 'application/json' });
    res.end(body);
  } catch (e) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'upstream error: ' + e.message }));
  }
}

http.createServer(serveStatic).listen(PORT, () => {
  console.log('[{{PROJECT_NAME}}-frontend] http://localhost:' + PORT);
});
`;
}

function generateFrontendAppJs(starter) {
  // Build tab renderers per starter. We use array-join (not nested backticks)
  // to keep this function cleanly parseable as a template-literal producer.
  const tabs = [];
  switch (starter.key) {
    case 'b2b':
      tabs.push({ key: 'rfqs', label: 'RFQs', render: rfqsTabRender() });
      tabs.push({ key: 'quotes', label: 'Quotes', render: quotesTabRender() });
      tabs.push({ key: 'agents', label: 'AI Agents', render: agentsTabRender(starter.agents) });
      tabs.push({ key: 'nexha', label: 'Nexha', render: nexhaTabRender() });
      break;
    case 'company':
      tabs.push({ key: 'employees', label: 'Employees', render: simpleTabRender('/employee', 'employeeCard') });
      tabs.push({ key: 'departments', label: 'Departments', render: simpleTabRender('/department', 'departmentCard') });
      tabs.push({ key: 'agents', label: 'AI Agents', render: agentsTabRender(starter.agents) });
      tabs.push({ key: 'nexha', label: 'Nexha', render: nexhaTabRender() });
      break;
    case 'hotel':
      tabs.push({ key: 'rooms', label: 'Rooms', render: simpleTabRender('/room', 'roomCard') });
      tabs.push({ key: 'bookings', label: 'Bookings', render: simpleTabRender('/booking', 'bookingCard') });
      tabs.push({ key: 'agents', label: 'AI Agents', render: agentsTabRender(starter.agents) });
      tabs.push({ key: 'nexha', label: 'Nexha', render: nexhaTabRender() });
      break;
    case 'restaurant':
      tabs.push({ key: 'menu', label: 'Menu', render: simpleTabRender('/menu', 'menuCard') });
      tabs.push({ key: 'tables', label: 'Tables', render: simpleTabRender('/table', 'tableCard') });
      tabs.push({ key: 'agents', label: 'AI Agents', render: agentsTabRender(starter.agents) });
      tabs.push({ key: 'nexha', label: 'Nexha', render: nexhaTabRender() });
      break;
    case 'logistics':
      tabs.push({ key: 'vehicles', label: 'Fleet', render: simpleTabRender('/vehicle', 'vehicleCard') });
      tabs.push({ key: 'shipments', label: 'Shipments', render: simpleTabRender('/shipment', 'shipmentCard') });
      tabs.push({ key: 'agents', label: 'AI Agents', render: agentsTabRender(starter.agents) });
      tabs.push({ key: 'nexha', label: 'Nexha', render: nexhaTabRender() });
      break;
    case 'crm':
      tabs.push({ key: 'leads', label: 'Leads', render: simpleTabRender('/lead', 'leadCard') });
      tabs.push({ key: 'deals', label: 'Deals', render: simpleTabRender('/deal', 'dealCard') });
      tabs.push({ key: 'agents', label: 'AI Agents', render: agentsTabRender(starter.agents) });
      tabs.push({ key: 'nexha', label: 'Nexha', render: nexhaTabRender() });
      break;
    case 'erp':
      tabs.push({ key: 'items', label: 'Inventory', render: simpleTabRender('/item', 'itemCard') });
      tabs.push({ key: 'pos', label: 'POs', render: simpleTabRender('/po', 'poCard') });
      tabs.push({ key: 'agents', label: 'AI Agents', render: agentsTabRender(starter.agents) });
      tabs.push({ key: 'nexha', label: 'Nexha', render: nexhaTabRender() });
      break;
    case 'pos':
      tabs.push({ key: 'products', label: 'Products', render: simpleTabRender('/product', 'productCard') });
      tabs.push({ key: 'sales', label: 'Sales', render: simpleTabRender('/sale', 'saleCard') });
      tabs.push({ key: 'agents', label: 'AI Agents', render: agentsTabRender(starter.agents) });
      tabs.push({ key: 'nexha', label: 'Nexha', render: nexhaTabRender() });
      break;
  }

  return generateFrontendJs(tabs.map(t => ({ key: t.key, label: t.label, renderSource: t.render })));
}

// Each card renderer is a function (item) → string, expressed as plain JS
// so the generator's outer template literal can hold them as strings.
function rfqsTabRender() {
  return [
    "async () => {",
    "  const d = await api('/rfq');",
    "  return listView(d.items || [], (i) => card('RFQ ' + i.id.slice(0,8), 'product: ' + i.productId + ' · qty ' + i.quantity + ' · ' + i.status));",
    "}"
  ].join('\n');
}

function quotesTabRender() {
  return [
    "async () => {",
    "  const d = await api('/rfq');",
    "  const all = await Promise.all((d.items||[]).map(r => api('/quote/' + r.id).then(q => q.items || [])));",
    "  return listView(all.flat(), (i) => card('Quote ' + i.id.slice(0,8), '₹' + i.priceInr + ' · ' + i.status));",
    "}"
  ].join('\n');
}

function agentsTabRender(agents) {
  return [
    "async () => {",
    "  const cards = " + JSON.stringify(agents) + ".map(a =>",
    "    '<div class=\"card\"><h3>' + a.name + '</h3><small>' + a.description + '</small><br/><br/><button class=\"primary\" onclick=\"invokeAgent(\\'' + a.name + '\\')\">Invoke</button></div>'",
    "  ).join('');",
    "  return '<div class=\"grid\">' + cards + '</div>';",
    "}"
  ].join('\n');
}

function nexhaTabRender() {
  return [
    "async () => {",
    "  const d = await api('/nexha/profile');",
    "  const m = d.manifest || {};",
    "  const c = d.capability || {};",
    "  return '<div class=\"card\"><h3>Nexha Federation Profile</h3><pre style=\"font-size:11px;color:#9ca3af;overflow:auto\">' + JSON.stringify({ manifest: m, capability: c }, null, 2) + '</pre></div>';",
    "}"
  ].join('\n');
}

function simpleTabRender(endpoint, cardFnName) {
  return [
    "async () => {",
    "  const d = await api('" + endpoint + "');",
    "  return listView(d.items || [], CARD_FNS." + cardFnName + ");",
    "}"
  ].join('\n');
}

function card(title, subtitle) {
  return '<div class="card"><h3>' + title + '</h3><small>' + subtitle + '</small></div>';
}

// Card renderer functions (injected into the generated app.js)
const CARD_FNS = {
  employeeCard:   "(i) => card(i.name, i.role + ' · ' + i.dept + ' · ₹' + (i.salary||0).toLocaleString())",
  departmentCard: "(i) => card(i.name, i.headcount + ' people · ₹' + (i.budget||0).toLocaleString() + ' budget')",
  roomCard:       "(i) => card('Room ' + i.number + ' · ' + i.type, '₹' + i.rate + '/night · ' + i.status)",
  bookingCard:    "(i) => card('Booking ' + i.id.slice(0,8), 'room ' + i.roomId + ' · ' + i.checkIn + ' → ' + i.checkOut + ' · ₹' + i.totalInr)",
  menuCard:       "(i) => card(i.name, '₹' + i.price + ' · ' + (i.veg ? '🟢 veg' : '🔴 non-veg') + ' · ' + i.category)",
  tableCard:      "(i) => card('Table ' + i.number, i.seats + ' seats · ' + i.status)",
  vehicleCard:    "(i) => card(i.plate, i.type + ' · ' + i.capacityKg + 'kg · driver: ' + i.driver + ' · ' + i.status)",
  shipmentCard:   "(i) => card(i.origin + ' → ' + i.destination, i.weightKg + 'kg · ' + i.status)",
  leadCard:       "(i) => card(i.name, (i.company||'') + ' · ' + i.email + ' · ' + i.stage + ' · ₹' + (i.value||0).toLocaleString())",
  dealCard:       "(i) => card('Deal ' + i.id.slice(0,8), '₹' + (i.amountInr||0).toLocaleString() + ' · ' + i.status)",
  itemCard:       "(i) => card(i.name, 'SKU ' + i.sku + ' · stock ' + i.stock + ' · cost ₹' + i.cost + ' · price ₹' + i.price)",
  poCard:         "(i) => card('PO ' + i.id.slice(0,8), '₹' + (i.totalInr||0).toLocaleString() + ' · ' + i.status)",
  productCard:    "(i) => card(i.name, i.barcode + ' · ₹' + i.price + ' · stock ' + i.stock)",
  saleCard:       "(i) => card('Sale ' + i.id.slice(0,8), '₹' + (i.totalInr||0).toLocaleString() + ' · ' + i.paymentMethod)"
};

function generateTests(starter) {
  // Pick the first non-empty entity as the "primary" entity for tests.
  const primaryEntry = Object.entries(starter.entities).find(([_, v]) => v.length > 0) || [Object.keys(starter.entities)[0], []];
  const primaryKey = primaryEntry[0];
  const primaryLen = primaryEntry[1].length;

  // Assertions for the seed test: at least the primary entity must have seeds.
  const seedAssertions = Object.entries(starter.entities).map(([k, v]) => {
    if (v.length > 0) return `  assert.ok(store.${k}.length >= ${v.length}, 'expected ${k} to have ${v.length}+ seeded');`;
    return `  assert.ok(Array.isArray(store.${k}), 'expected ${k} to be an array (possibly empty)');`;
  }).join('\n');

  return `/**
 * ${starter.title} starter — sanity tests.
 *
 * Verifies that the in-memory store seeds correctly and that the
 * core create/list flow returns a valid ID.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../services/store.js';

test('${starter.title}: seed data is present', () => {
${seedAssertions}
});

test('${starter.title}: store reset wipes writes but keeps seeds', () => {
  store.${primaryKey}.unshift({ id: 'test-write', foo: 'bar' });
  assert.equal(store.${primaryKey}.length, ${primaryLen} + 1, 'expected the unshift to land');
  store.reset();
  assert.equal(store.${primaryKey}.length, ${primaryLen}, 'expected reset to restore ${primaryKey} seed');
});

test('${starter.title}: list returns the seeded items', () => {
  const items = store.${primaryKey};
  assert.ok(items.length === ${primaryLen}, 'expected ${primaryLen} seeded items, got ' + items.length);
  assert.ok(items.every(i => typeof i.id === 'string'), 'every item must have an id');
});
`;
}

function generateErrorMiddleware() {
  return `export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err.message);
  res.status(500).json({ error: err.message });
}
`;
}

function generateReadme(starter) {
  return `# {{PROJECT_TITLE}}

> ${starter.description}
>
> Auto-generated by HOJAI Foundry using the \`${starter.key}\` starter.

## Quick start

\`\`\`bash
npm install
npm run dev
# → http://localhost:3000  (frontend)
# → http://localhost:4001  (backend)
\`\`\`

## What's inside

- **Backend** (\`apps/backend\`) — Express on :4001
- **Frontend** (\`apps/frontend\`) — Static HTML + vanilla JS on :3000
- **Agents** (\`apps/backend/src/agents/\`) — ${starter.agents.length} SUTAR agent stubs
- **Nexha** (\`/api/nexha/profile\`) — Federation profile
- **hojai.ai.md** — AI-native spec for Claude Code / Cursor / Codex

## Endpoints

${starter.endpoints.map(e => `- \`${e}\``).join('\n')}

## Agents

${starter.agents.map(a => `- **${a.name}** — ${a.description}`).join('\n')}
`;
}

function generateGitignore() {
  return `node_modules/
dist/
.DS_Store
.env
.env.local
*.log
`;
}

function generateNpmrc() {
  return `package-lock=false
save-exact=false
`;
}

function generateMobileReadme() {
  return `# Mobile app

Scaffolded later via:

\`\`\`bash
npx hojai add mobile
\`\`\`

In v0, the web app on :3000 is mobile-friendly via responsive CSS.
`;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const existing = await fs.readdir(STARTERS_DIR).catch(() => []);
  const keys = STARTERS.map(s => s.key);
  for (const key of keys) {
    if (existing.includes(key) && !process.env.FORCE) {
      console.log('skip: ' + key + ' (already exists; set FORCE=1 to overwrite)');
      continue;
    }
    const starter = STARTERS.find(s => s.key === key);
    const dir = path.join(STARTERS_DIR, key, 'template');
    console.log('write: ' + dir);
    await fs.mkdir(dir, { recursive: true });

    // Backend
    const backendDir = path.join(dir, 'apps/backend/src');
    await fs.mkdir(backendDir, { recursive: true });
    await fs.writeFile(path.join(backendDir, 'index.js'), generateBackendIndex(starter.title, starter.key, starter.endpoints));
    await fs.mkdir(path.join(backendDir, 'middleware'), { recursive: true });
    await fs.writeFile(path.join(backendDir, 'middleware/error.js'), generateErrorMiddleware());
    await fs.mkdir(path.join(backendDir, 'agents'), { recursive: true });
    await fs.writeFile(path.join(backendDir, 'agents/index.js'), generateAgents(starter.agents));

    // The shared BaseAgent runtime. Copied verbatim from
    // packages/create-hojai/src/runtime/BaseAgent.js so every starter
    // ships with the same agent abstraction (local mode + remote mode).
    const runtimeDir = path.join(backendDir, 'runtime');
    await fs.mkdir(runtimeDir, { recursive: true });
    const baseAgentSource = await fs.readFile(
      path.join(ROOT, 'packages', 'create-hojai', 'src', 'runtime', 'BaseAgent.js'),
      'utf8'
    );
    await fs.writeFile(path.join(runtimeDir, 'BaseAgent.js'), baseAgentSource);
    await fs.mkdir(path.join(backendDir, 'services'), { recursive: true });
    await fs.writeFile(path.join(backendDir, 'services/store.js'), generateStore(starter.entities, starter.title));
    for (const svc of starter.services) {
      await fs.mkdir(path.join(backendDir, 'services'), { recursive: true });
      await fs.writeFile(path.join(backendDir, 'services/' + svc.file), svc.body);
    }

    // Routes
    const routesDir = path.join(backendDir, 'routes');
    await fs.mkdir(routesDir, { recursive: true });
    await fs.writeFile(path.join(routesDir, 'admin.js'), starter.adminBody);
    await fs.writeFile(path.join(routesDir, 'nexha.js'), starter.nexhaBody);
    await fs.writeFile(path.join(routesDir, 'webhooks.js'), starter.webhooksBody);
    for (const route of starter.routes) {
      await fs.writeFile(path.join(routesDir, route.file), route.body);
    }

    // Frontend
    const publicDir = path.join(dir, 'apps/frontend/public');
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(path.join(publicDir, 'index.html'), generateFrontendHtml(starter.title, starter.color));
    await fs.writeFile(path.join(publicDir, 'style.css'), generateFrontendCss(starter.color));
    await fs.writeFile(path.join(publicDir, 'app.js'), generateFrontendAppJs(starter));
    await fs.writeFile(path.join(dir, 'apps/frontend/server.js'), generateFrontendServer());

    // Tests
    const testsDir = path.join(backendDir, '__tests__');
    await fs.mkdir(testsDir, { recursive: true });
    await fs.writeFile(path.join(testsDir, 'services.test.js'), generateTests(starter));

    // Scripts + docs
    await fs.mkdir(path.join(dir, 'scripts'), { recursive: true });
    await fs.writeFile(path.join(dir, 'scripts/dev.js'), generateDevScript());
    await fs.mkdir(path.join(dir, 'docs'), { recursive: true });
    await fs.writeFile(path.join(dir, 'docs/architecture.md'), generateArchitectureMd(starter));
    await fs.mkdir(path.join(dir, 'apps/mobile'), { recursive: true });
    await fs.writeFile(path.join(dir, 'apps/mobile/README.md'), generateMobileReadme());

    // Top-level
    await fs.writeFile(path.join(dir, 'package.json'), generatePackageJson(starter));
    await fs.writeFile(path.join(dir, 'hojai.ai.md'), generateHojaiMd(starter));
    await fs.writeFile(path.join(dir, 'README.md'), generateReadme(starter));
    await fs.writeFile(path.join(dir, '_gitignore'), generateGitignore());
    await fs.writeFile(path.join(dir, '_npmrc'), generateNpmrc());
  }
  console.log('done.');
}

main().catch(e => { console.error(e); process.exit(1); });
