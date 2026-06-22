/**
 * WMS service — bins, stock, movements, transfers, picks.
 *
 * Pure functions over in-memory stores. All mutations write a movement row
 * for audit. All inter-warehouse transfers are transactional: if the
 * receiving step fails, the transfer is left in `in_transit` for retry
 * (not silently rolled back).
 */

import { v4 as uuidv4 } from 'uuid';
import * as slotSvc from './warehouse.service.js';
import type {
  Warehouse,
} from './types.js';
import type {
  Bin,
  Movement,
  MovementType,
  PickFromBinRequest,
  PickList,
  ReceiveStockRequest,
  StockItem,
  Transfer,
  CreateTransferRequest,
  AdjustStockRequest,
  CreatePickListRequest,
} from './wms.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory stores
// ─────────────────────────────────────────────────────────────────────────────

const BINS = new Map<string, Bin>();
const STOCK = new Map<string, StockItem>();           // key: `${warehouseId}:${sku}:${binId}:${batchId ?? ''}`
const MOVEMENTS = new Map<string, Movement>();
const TRANSFERS = new Map<string, Transfer>();
const PICKLISTS = new Map<string, PickList>();

// ─────────────────────────────────────────────────────────────────────────────
// Seed: bins per warehouse (proportional to capability footprint)
// ─────────────────────────────────────────────────────────────────────────────

function seedBins(): void {
  if (BINS.size > 0) return;
  const warehouses = slotSvc.searchWarehouses({});
  for (const w of warehouses) {
    const zones: Array<Bin['zone']> = ['ambient', 'cold', 'hazmat', 'bonded', 'returns'];
    // Add zones only if the warehouse supports them
    const activeZones = zones.filter(z => {
      if (z === 'cold' && !w.capabilities.coldChain) return false;
      if (z === 'hazmat' && !w.capabilities.hazardous) return false;
      if (z === 'bonded' && !w.capabilities.bonded) return false;
      return true;
    });
    // Always include ambient and returns
    if (!activeZones.includes('ambient')) activeZones.unshift('ambient');
    if (!activeZones.includes('returns')) activeZones.push('returns');

    let aisle = 0;
    for (const zone of activeZones) {
      for (let rack = 1; rack <= 3; rack++) {
        for (let shelf = 1; shelf <= 4; shelf++) {
          const code = `${String.fromCharCode(65 + aisle)}-${String(rack).padStart(2, '0')}-${String(shelf).padStart(2, '0')}`;
          const id = `bin-${uuidv4()}`;
          BINS.set(id, {
            id,
            warehouseId: w.id,
            code,
            capacityM3: 50,
            capacityKg: 5000,
            zone,
            active: true,
          });
        }
      }
      aisle++;
    }
  }
}

seedBins();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function stockKey(warehouseId: string, sku: string, binId: string, batchId?: string | null): string {
  return `${warehouseId}:${sku}:${binId}:${batchId ?? ''}`;
}

function recordMovement(
  type: MovementType,
  sku: string,
  warehouseId: string,
  binId: string | null,
  quantity: number,
  reason: string,
  transferId?: string | null,
): Movement {
  const id = `mv-${uuidv4()}`;
  const mv: Movement = {
    id, type, sku, warehouseId, binId, quantity, reason,
    transferId: transferId ?? null,
    at: new Date().toISOString(),
  };
  MOVEMENTS.set(id, mv);
  return mv;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bin operations
// ─────────────────────────────────────────────────────────────────────────────

export function listBins(warehouseId?: string): Bin[] {
  const all = Array.from(BINS.values());
  return warehouseId ? all.filter(b => b.warehouseId === warehouseId) : all;
}

export function getBin(id: string): Bin | null {
  return BINS.get(id) || null;
}

export function getBinByCode(warehouseId: string, code: string): Bin | null {
  for (const b of BINS.values()) {
    if (b.warehouseId === warehouseId && b.code === code) return b;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock operations
// ─────────────────────────────────────────────────────────────────────────────

export function getStock(warehouseId: string, sku: string, binId: string, batchId?: string | null): StockItem | null {
  return STOCK.get(stockKey(warehouseId, sku, binId, batchId)) || null;
}

export function findStockBySku(warehouseId: string, sku: string): StockItem[] {
  return Array.from(STOCK.values())
    .filter(s => s.warehouseId === warehouseId && s.sku === sku)
    .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
}

export function listStock(warehouseId?: string): StockItem[] {
  const all = Array.from(STOCK.values());
  return warehouseId ? all.filter(s => s.warehouseId === warehouseId) : all;
}

export function totalQuantity(warehouseId: string, sku: string): number {
  return findStockBySku(warehouseId, sku).reduce((sum, s) => sum + s.quantity, 0);
}

/**
 * Receive stock — adds quantity to a bin. Returns the updated stock item.
 * Errors: warehouse not found, bin not found, bin in wrong warehouse, bin inactive.
 */
export function receiveStock(req: ReceiveStockRequest): StockItem | { error: string } {
  const w = slotSvc.getWarehouse(req.warehouseId);
  if (!w) return { error: 'warehouse_not_found' };
  const bin = BINS.get(req.binId);
  if (!bin) return { error: 'bin_not_found' };
  if (bin.warehouseId !== req.warehouseId) return { error: 'bin_warehouse_mismatch' };
  if (!bin.active) return { error: 'bin_inactive' };

  const key = stockKey(req.warehouseId, req.sku, req.binId, req.batchId);
  const existing = STOCK.get(key);
  const now = new Date().toISOString();

  if (existing) {
    existing.quantity += req.quantity;
    existing.weightKgPerUnit = req.weightKgPerUnit; // refresh on receive
    if (req.expiry !== undefined) existing.expiry = req.expiry;
    recordMovement('receive', req.sku, req.warehouseId, req.binId, req.quantity, req.reason, null);
    return existing;
  }

  const item: StockItem = {
    id: `stk-${uuidv4()}`,
    sku: req.sku,
    warehouseId: req.warehouseId,
    binId: req.binId,
    quantity: req.quantity,
    weightKgPerUnit: req.weightKgPerUnit,
    expiry: req.expiry ?? null,
    batchId: req.batchId ?? null,
    receivedAt: now,
  };
  STOCK.set(key, item);
  recordMovement('receive', req.sku, req.warehouseId, req.binId, req.quantity, req.reason, null);
  return item;
}

/**
 * Manual adjustment — set absolute quantity (for cycle counts).
 */
export function adjustStock(req: AdjustStockRequest): StockItem | { error: string } {
  const key = stockKey(req.warehouseId, req.sku, req.binId, null);
  const existing = STOCK.get(key);
  if (!existing) return { error: 'stock_not_found' };
  const delta = req.newQuantity - existing.quantity;
  if (delta === 0) return existing;
  existing.quantity = req.newQuantity;
  recordMovement('adjust', req.sku, req.warehouseId, req.binId, delta, req.reason, null);
  return existing;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transfers
// ─────────────────────────────────────────────────────────────────────────────

export function createTransfer(req: CreateTransferRequest): Transfer | { error: string } {
  if (req.fromWarehouseId === req.toWarehouseId) {
    return { error: 'same_warehouse' };
  }
  const from = slotSvc.getWarehouse(req.fromWarehouseId);
  const to = slotSvc.getWarehouse(req.toWarehouseId);
  if (!from) return { error: 'from_warehouse_not_found' };
  if (!to) return { error: 'to_warehouse_not_found' };

  const available = totalQuantity(req.fromWarehouseId, req.sku);
  if (available < req.quantity) {
    return { error: 'insufficient_stock', available } as { error: string; available: number };
  }

  const id = `tx-${uuidv4()}`;
  const transfer: Transfer = {
    id,
    fromWarehouseId: req.fromWarehouseId,
    toWarehouseId: req.toWarehouseId,
    sku: req.sku,
    quantity: req.quantity,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  TRANSFERS.set(id, transfer);
  return transfer;
}

/**
 * Pick from origin — move quantity out of origin warehouse. Decrements oldest
 * stock first (FEFO if expiry is set, else FIFO).
 */
export function pickTransfer(transferId: string): Transfer | { error: string } {
  const t = TRANSFERS.get(transferId);
  if (!t) return { error: 'transfer_not_found' };
  if (t.status !== 'pending') return { error: `invalid_status:${t.status}` };

  // Pick oldest stock at origin
  const stock = findStockBySku(t.fromWarehouseId, t.sku)
    .filter(s => s.quantity > 0)
    .sort((a, b) => {
      // FEFO: items with earlier expiry first
      if (a.expiry && b.expiry) return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
      if (a.expiry) return -1;
      if (b.expiry) return 1;
      // FIFO: oldest received first
      return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
    });

  let remaining = t.quantity;
  for (const s of stock) {
    if (remaining <= 0) break;
    const take = Math.min(s.quantity, remaining);
    s.quantity -= take;
    remaining -= take;
    recordMovement('transfer_out', t.sku, t.fromWarehouseId, s.binId, -take, `transfer ${transferId}`, transferId);
  }

  if (remaining > 0) {
    return { error: 'insufficient_stock_at_pick', shortfall: remaining } as { error: string; shortfall: number };
  }

  t.status = 'in_transit';
  t.pickedAt = new Date().toISOString();
  return t;
}

/**
 * Receive at destination — adds the quantity to a destination bin.
 * Bin must be active and in destination warehouse.
 */
export function receiveTransfer(
  transferId: string,
  destBinId: string,
  weightKgPerUnit: number,
): Transfer | { error: string } {
  const t = TRANSFERS.get(transferId);
  if (!t) return { error: 'transfer_not_found' };
  if (t.status !== 'in_transit') return { error: `invalid_status:${t.status}` };

  const bin = BINS.get(destBinId);
  if (!bin) return { error: 'bin_not_found' };
  if (bin.warehouseId !== t.toWarehouseId) return { error: 'bin_warehouse_mismatch' };

  // Add stock to destination bin
  const key = stockKey(t.toWarehouseId, t.sku, destBinId, null);
  const existing = STOCK.get(key);
  if (existing) {
    existing.quantity += t.quantity;
    existing.weightKgPerUnit = weightKgPerUnit;
  } else {
    STOCK.set(key, {
      id: `stk-${uuidv4()}`,
      sku: t.sku,
      warehouseId: t.toWarehouseId,
      binId: destBinId,
      quantity: t.quantity,
      weightKgPerUnit,
      expiry: null,
      batchId: null,
      receivedAt: new Date().toISOString(),
    });
  }
  recordMovement('transfer_in', t.sku, t.toWarehouseId, destBinId, t.quantity, `transfer ${transferId}`, transferId);

  t.status = 'received';
  t.receivedAt = new Date().toISOString();
  return t;
}

export function cancelTransfer(transferId: string): Transfer | { error: string } {
  const t = TRANSFERS.get(transferId);
  if (!t) return { error: 'transfer_not_found' };
  if (t.status !== 'pending') return { error: `invalid_status:${t.status}` };
  t.status = 'cancelled';
  return t;
}

export function getTransfer(id: string): Transfer | null {
  return TRANSFERS.get(id) || null;
}

export function listTransfers(warehouseId?: string, status?: Transfer['status']): Transfer[] {
  let all = Array.from(TRANSFERS.values());
  if (warehouseId) {
    all = all.filter(t => t.fromWarehouseId === warehouseId || t.toWarehouseId === warehouseId);
  }
  if (status) all = all.filter(t => t.status === status);
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// Pick lists
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a pick list for an order. Reserves the qty (does not decrement yet).
 * Each line is assigned a source bin (FEFO/FIFO, same logic as transfers).
 */
export function createPickList(req: CreatePickListRequest): PickList | { error: string } {
  const w = slotSvc.getWarehouse(req.warehouseId);
  if (!w) return { error: 'warehouse_not_found' };

  const lines: PickList['lines'] = req.lines.map(line => {
    const candidates = findStockBySku(req.warehouseId, line.sku)
      .filter(s => s.quantity > 0)
      .sort((a, b) => {
        if (a.expiry && b.expiry) return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
        if (a.expiry) return -1;
        if (b.expiry) return 1;
        return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
      });
    const first = candidates[0];
    return {
      sku: line.sku,
      quantity: line.quantity,
      binId: first ? first.binId : null,
      picked: false,
    };
  });

  const id = `pl-${uuidv4()}`;
  const pickList: PickList = {
    id,
    warehouseId: req.warehouseId,
    orderId: req.orderId,
    lines,
    status: lines.every(l => l.binId !== null) ? 'open' : 'open',
    createdAt: new Date().toISOString(),
  };
  PICKLISTS.set(id, pickList);
  return pickList;
}

export function pickFromBin(req: PickFromBinRequest): PickList | { error: string } {
  const pl = PICKLISTS.get(req.pickListId);
  if (!pl) return { error: 'picklist_not_found' };
  if (pl.status === 'completed' || pl.status === 'cancelled') {
    return { error: `invalid_status:${pl.status}` };
  }

  const line = pl.lines.find(l => l.sku === req.sku && !l.picked);
  if (!line) return { error: 'line_not_found_or_already_picked' };
  if (line.binId !== req.binId) return { error: 'bin_mismatch' };

  const stock = getStock(pl.warehouseId, req.sku, req.binId, null);
  if (!stock) return { error: 'stock_not_found' };
  if (stock.quantity < req.quantity) return { error: 'insufficient_stock' };

  stock.quantity -= req.quantity;
  line.picked = true;
  recordMovement('pick', req.sku, pl.warehouseId, req.binId, -req.quantity, `picklist ${req.pickListId} order ${pl.orderId}`, null);

  if (pl.status === 'open') pl.status = 'in_progress';
  if (pl.lines.every(l => l.picked)) {
    pl.status = 'completed';
    pl.completedAt = new Date().toISOString();
  }
  return pl;
}

export function getPickList(id: string): PickList | null {
  return PICKLISTS.get(id) || null;
}

export function listPickLists(warehouseId?: string): PickList[] {
  const all = Array.from(PICKLISTS.values());
  return warehouseId ? all.filter(p => p.warehouseId === warehouseId) : all;
}

// ─────────────────────────────────────────────────────────────────────────────
// Movements — audit log query
// ─────────────────────────────────────────────────────────────────────────────

export function listMovements(filter: {
  warehouseId?: string;
  sku?: string;
  type?: MovementType;
  limit?: number;
} = {}): Movement[] {
  let all = Array.from(MOVEMENTS.values());
  if (filter.warehouseId) all = all.filter(m => m.warehouseId === filter.warehouseId);
  if (filter.sku) all = all.filter(m => m.sku === filter.sku);
  if (filter.type) all = all.filter(m => m.type === filter.type);
  all.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return filter.limit ? all.slice(0, filter.limit) : all;
}

// ─────────────────────────────────────────────────────────────────────────────
// WMS stats
// ─────────────────────────────────────────────────────────────────────────────

export function wmsStats(): {
  bins: number;
  stockLines: number;
  totalUnits: number;
  movements: number;
  transfers: { pending: number; in_transit: number; received: number; cancelled: number };
  pickLists: { open: number; in_progress: number; completed: number; cancelled: number };
} {
  const transfers = { pending: 0, in_transit: 0, received: 0, cancelled: 0 };
  for (const t of TRANSFERS.values()) transfers[t.status]++;

  const pickLists = { open: 0, in_progress: 0, completed: 0, cancelled: 0 };
  for (const p of PICKLISTS.values()) pickLists[p.status]++;

  return {
    bins: BINS.size,
    stockLines: STOCK.size,
    totalUnits: Array.from(STOCK.values()).reduce((sum, s) => sum + s.quantity, 0),
    movements: MOVEMENTS.size,
    transfers,
    pickLists,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test reset
// ─────────────────────────────────────────────────────────────────────────────

export function _resetWmsForTests(): void {
  BINS.clear();
  STOCK.clear();
  MOVEMENTS.clear();
  TRANSFERS.clear();
  PICKLISTS.clear();
  seedBins();
}
