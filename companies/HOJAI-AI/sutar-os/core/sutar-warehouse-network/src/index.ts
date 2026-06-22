/**
 * sutar-warehouse-network — Express server (port 4288).
 *
 * Two layers:
 *   1) Slot booking (warehouse discovery, slot lookup, slot booking)
 *   2) WMS (bins, stock, stock movements, transfers, pick lists)
 *
 * REST surface:
 *   ── Discovery & Slots ──
 *   GET  /health
 *   GET  /ready
 *   GET  /api/v1/info
 *   GET  /api/v1/stats
 *   GET  /api/v1/warehouses?state=MH&needsColdChain=true&minRating=4
 *   GET  /api/v1/warehouses/:id
 *   GET  /api/v1/warehouses/:id/slots?direction=inbound&fromIso=...&toIso=...
 *   POST /api/v1/bookings         { slotId, customerId, pallets, weightKg }
 *   DELETE /api/v1/bookings/:id
 *   GET  /api/v1/bookings?customerId=...
 *
 *   ── WMS: Bins ──
 *   GET  /api/v1/bins?warehouseId=...
 *   GET  /api/v1/bins/:id
 *
 *   ── WMS: Stock ──
 *   GET  /api/v1/stock?warehouseId=&sku=
 *   POST /api/v1/stock/receive    { warehouseId, binId, sku, quantity, ... }
 *   POST /api/v1/stock/adjust     { warehouseId, binId, sku, newQuantity, reason }
 *
 *   ── WMS: Transfers ──
 *   POST /api/v1/transfers                    { fromWarehouseId, toWarehouseId, sku, quantity }
 *   POST /api/v1/transfers/:id/pick
 *   POST /api/v1/transfers/:id/receive        { destBinId, weightKgPerUnit }
 *   POST /api/v1/transfers/:id/cancel
 *   GET  /api/v1/transfers?warehouseId=&status=
 *   GET  /api/v1/transfers/:id
 *
 *   ── WMS: Pick Lists ──
 *   POST /api/v1/picklists          { warehouseId, orderId, lines: [{sku, quantity}] }
 *   POST /api/v1/picklists/:id/pick { binId, sku, quantity }
 *   GET  /api/v1/picklists?warehouseId=
 *   GET  /api/v1/picklists/:id
 *
 *   ── WMS: Movements (audit log) ──
 *   GET  /api/v1/movements?warehouseId=&sku=&type=&limit=
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  AddressSchema,
  BookingRequestSchema,
  SlotQuerySchema,
  WarehouseQuerySchema,
} from './types.js';
import {
  AdjustStockSchema,
  CreatePickListSchema,
  CreateTransferSchema,
  PickFromBinSchema,
  ReceiveStockSchema,
} from './wms.types.js';
import * as slotSvc from './warehouse.service.js';
import * as wms from './wms.service.js';

const PORT = parseInt(process.env.PORT || '4288', 10);
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'sutar-warehouse-network', port: PORT });
});
app.get('/ready', (_req, res) => {
  res.json({ ready: true, stats: { ...slotSvc.networkStats(), ...wms.wmsStats() } });
});
app.get('/api/v1/info', (_req, res) => {
  res.json({
    service: 'sutar-warehouse-network',
    version: '1.0.0',
    description: 'Warehouse & Inventory Network — Phase C.5 (multi-warehouse WMS)',
    endpoints: [
      'GET  /api/v1/stats',
      'GET  /api/v1/warehouses',
      'GET  /api/v1/warehouses/:id',
      'GET  /api/v1/warehouses/:id/slots',
      'POST /api/v1/bookings',
      'DELETE /api/v1/bookings/:id',
      'GET  /api/v1/bookings',
      'GET  /api/v1/bins?warehouseId=...',
      'GET  /api/v1/bins/:id',
      'GET  /api/v1/stock?warehouseId=&sku=',
      'POST /api/v1/stock/receive',
      'POST /api/v1/stock/adjust',
      'POST /api/v1/transfers',
      'POST /api/v1/transfers/:id/pick',
      'POST /api/v1/transfers/:id/receive',
      'POST /api/v1/transfers/:id/cancel',
      'GET  /api/v1/transfers',
      'GET  /api/v1/transfers/:id',
      'POST /api/v1/picklists',
      'POST /api/v1/picklists/:id/pick',
      'GET  /api/v1/picklists',
      'GET  /api/v1/picklists/:id',
      'GET  /api/v1/movements',
    ],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/v1/stats', (_req, res) => {
  res.json({ success: true, data: { ...slotSvc.networkStats(), ...wms.wmsStats() } });
});

// ─────────────────────────────────────────────────────────────────────────────
// Slot-booking routes (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/v1/warehouses', (req, res) => {
  const parsed = WarehouseQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const results = slotSvc.searchWarehouses(parsed.data);
  res.json({ success: true, count: results.length, warehouses: results });
});

app.get('/api/v1/warehouses/:id', (req, res) => {
  const w = slotSvc.getWarehouse(req.params.id);
  if (!w) return res.status(404).json({ error: 'not_found' });
  res.json({ success: true, warehouse: w });
});

app.get('/api/v1/warehouses/:id/slots', (req, res) => {
  const merged = { ...req.query, warehouseId: req.params.id };
  const parsed = SlotQuerySchema.safeParse(merged);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const slots = slotSvc.findSlots(parsed.data);
  res.json({ success: true, count: slots.length, slots });
});

app.post('/api/v1/bookings', (req, res) => {
  const parsed = BookingRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = slotSvc.bookSlot(parsed.data);
  if ('error' in result) return res.status(409).json(result);
  res.status(201).json({ success: true, booking: result });
});

app.delete('/api/v1/bookings/:id', (req, res) => {
  const result = slotSvc.cancelBooking(req.params.id);
  if (!result) return res.status(404).json({ error: 'not_found_or_already_cancelled' });
  res.json({ success: true, booking: result });
});

app.get('/api/v1/bookings', (req, res) => {
  const customerId = req.query.customerId as string | undefined;
  const list = slotSvc.listBookings(customerId);
  res.json({ success: true, count: list.length, bookings: list });
});

// ─────────────────────────────────────────────────────────────────────────────
// WMS: Bins
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/v1/bins', (req, res) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const list = wms.listBins(warehouseId);
  res.json({ success: true, count: list.length, bins: list });
});

app.get('/api/v1/bins/:id', (req, res) => {
  const b = wms.getBin(req.params.id);
  if (!b) return res.status(404).json({ error: 'not_found' });
  res.json({ success: true, bin: b });
});

// ─────────────────────────────────────────────────────────────────────────────
// WMS: Stock
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/v1/stock', (req, res) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const sku = req.query.sku as string | undefined;
  let list = wms.listStock(warehouseId);
  if (sku) list = list.filter(s => s.sku === sku);
  res.json({ success: true, count: list.length, stock: list });
});

app.post('/api/v1/stock/receive', (req, res) => {
  const parsed = ReceiveStockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = wms.receiveStock(parsed.data);
  if ('error' in result) return res.status(409).json(result);
  res.status(201).json({ success: true, stock: result });
});

app.post('/api/v1/stock/adjust', (req, res) => {
  const parsed = AdjustStockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = wms.adjustStock(parsed.data);
  if ('error' in result) return res.status(404).json(result);
  res.json({ success: true, stock: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// WMS: Transfers
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/v1/transfers', (req, res) => {
  const parsed = CreateTransferSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = wms.createTransfer(parsed.data);
  if ('error' in result) return res.status(409).json(result);
  res.status(201).json({ success: true, transfer: result });
});

app.post('/api/v1/transfers/:id/pick', (req, res) => {
  const result = wms.pickTransfer(req.params.id);
  if ('error' in result) return res.status(409).json(result);
  res.json({ success: true, transfer: result });
});

app.post('/api/v1/transfers/:id/receive', (req, res) => {
  const { destBinId, weightKgPerUnit } = req.body || {};
  if (!destBinId || typeof weightKgPerUnit !== 'number') {
    return res.status(400).json({ error: 'destBinId and weightKgPerUnit required' });
  }
  const result = wms.receiveTransfer(req.params.id, destBinId, weightKgPerUnit);
  if ('error' in result) return res.status(409).json(result);
  res.json({ success: true, transfer: result });
});

app.post('/api/v1/transfers/:id/cancel', (req, res) => {
  const result = wms.cancelTransfer(req.params.id);
  if ('error' in result) return res.status(409).json(result);
  res.json({ success: true, transfer: result });
});

app.get('/api/v1/transfers', (req, res) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const status = req.query.status as any;
  const list = wms.listTransfers(warehouseId, status);
  res.json({ success: true, count: list.length, transfers: list });
});

app.get('/api/v1/transfers/:id', (req, res) => {
  const t = wms.getTransfer(req.params.id);
  if (!t) return res.status(404).json({ error: 'not_found' });
  res.json({ success: true, transfer: t });
});

// ─────────────────────────────────────────────────────────────────────────────
// WMS: Pick Lists
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/v1/picklists', (req, res) => {
  const parsed = CreatePickListSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = wms.createPickList(parsed.data);
  if ('error' in result) return res.status(409).json(result);
  res.status(201).json({ success: true, pickList: result });
});

app.post('/api/v1/picklists/:id/pick', (req, res) => {
  const parsed = PickFromBinSchema.safeParse({ ...req.body, pickListId: req.params.id });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = wms.pickFromBin(parsed.data);
  if ('error' in result) return res.status(409).json(result);
  res.json({ success: true, pickList: result });
});

app.get('/api/v1/picklists', (req, res) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const list = wms.listPickLists(warehouseId);
  res.json({ success: true, count: list.length, pickLists: list });
});

app.get('/api/v1/picklists/:id', (req, res) => {
  const p = wms.getPickList(req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  res.json({ success: true, pickList: p });
});

// ─────────────────────────────────────────────────────────────────────────────
// WMS: Movements
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/v1/movements', (req, res) => {
  const filter: Parameters<typeof wms.listMovements>[0] = {};
  if (req.query.warehouseId) filter.warehouseId = req.query.warehouseId as string;
  if (req.query.sku) filter.sku = req.query.sku as string;
  if (req.query.type) filter.type = req.query.type as any;
  if (req.query.limit) filter.limit = parseInt(req.query.limit as string, 10);
  const list = wms.listMovements(filter);
  res.json({ success: true, count: list.length, movements: list });
});

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

const server = app.listen(PORT, () => {
  console.log(`sutar-warehouse-network running on port ${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/api/v1/warehouses?state=MH`);
  console.log(`  GET  http://localhost:${PORT}/api/v1/bins?warehouseId=...`);
  console.log(`  POST http://localhost:${PORT}/api/v1/stock/receive`);
  console.log(`  POST http://localhost:${PORT}/api/v1/transfers`);
});

export { AddressSchema };
export default app;
