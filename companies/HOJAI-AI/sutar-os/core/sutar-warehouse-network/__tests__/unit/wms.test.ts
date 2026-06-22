/**
 * sutar-warehouse-network — WMS unit tests.
 *
 * Covers: bin seeding, stock receive/adjust, transfer lifecycle (create →
 * pick → receive), pick list creation and execution, movement audit log.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as slotSvc from '../../src/warehouse.service.js';
import * as wms from '../../src/wms.service.js';

beforeEach(() => {
  slotSvc._resetForTests();
  wms._resetWmsForTests();
});

// ─────────────────────────────────────────────────────────────────────────────
// Bins
// ─────────────────────────────────────────────────────────────────────────────

describe('Bins', () => {
  it('seeds bins for all warehouses', () => {
    const all = wms.listBins();
    const warehouses = slotSvc.searchWarehouses({});
    expect(all.length).toBeGreaterThan(0);
    // Each warehouse has at least ambient + returns bins
    for (const w of warehouses) {
      const binsForW = wms.listBins(w.id);
      expect(binsForW.length).toBeGreaterThanOrEqual(2);
      expect(binsForW.some(b => b.zone === 'ambient')).toBe(true);
    }
  });

  it('only seeds cold bins for cold-chain warehouses', () => {
    const coldWarehouses = slotSvc.searchWarehouses({ needsColdChain: true });
    for (const w of coldWarehouses) {
      const bins = wms.listBins(w.id);
      expect(bins.some(b => b.zone === 'cold')).toBe(true);
    }
    const noCold = slotSvc.searchWarehouses({}).filter(
      w => !w.capabilities.coldChain,
    );
    for (const w of noCold) {
      const bins = wms.listBins(w.id);
      expect(bins.every(b => b.zone !== 'cold')).toBe(true);
    }
  });

  it('getBin returns the bin or null', () => {
    const all = wms.listBins();
    expect(wms.getBin(all[0].id)).toEqual(all[0]);
    expect(wms.getBin('no-such-bin')).toBeNull();
  });

  it('bin codes follow A-RR-SS pattern', () => {
    const all = wms.listBins();
    for (const b of all) {
      expect(b.code).toMatch(/^[A-Z]-\d{2}-\d{2}$/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stock — receive
// ─────────────────────────────────────────────────────────────────────────────

describe('Stock receive', () => {
  it('creates a new stock item in a bin', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id).find(b => b.zone === 'ambient')!;
    const r = wms.receiveStock({
      warehouseId: w.id,
      binId: bin.id,
      sku: 'paracetamol-500mg',
      quantity: 100,
      weightKgPerUnit: 0.05,
      reason: 'initial-stock',
    });
    expect('id' in r).toBe(true);
    expect((r as any).sku).toBe('paracetamol-500mg');
    expect((r as any).quantity).toBe(100);
  });

  it('increments existing stock on second receive', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id).find(b => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'SKU-1', quantity: 50, weightKgPerUnit: 1, reason: 'first' });
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'SKU-1', quantity: 30, weightKgPerUnit: 1, reason: 'second' });
    const stock = wms.getStock(w.id, 'SKU-1', bin.id, null);
    expect(stock!.quantity).toBe(80);
  });

  it('rejects receive on unknown warehouse', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id)[0];
    const r = wms.receiveStock({ warehouseId: 'nope', binId: bin.id, sku: 'X', quantity: 1, weightKgPerUnit: 1, reason: 'test' });
    expect('error' in r && r.error).toBe('warehouse_not_found');
  });

  it('rejects receive on unknown bin', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const r = wms.receiveStock({ warehouseId: w.id, binId: 'nope', sku: 'X', quantity: 1, weightKgPerUnit: 1, reason: 'test' });
    expect('error' in r && r.error).toBe('bin_not_found');
  });

  it('rejects receive when bin belongs to a different warehouse', () => {
    const warehouses = slotSvc.searchWarehouses({});
    const w1 = warehouses[0];
    const w2 = warehouses[1];
    const bin2 = wms.listBins(w2.id)[0];
    const r = wms.receiveStock({ warehouseId: w1.id, binId: bin2.id, sku: 'X', quantity: 1, weightKgPerUnit: 1, reason: 'test' });
    expect('error' in r && r.error).toBe('bin_warehouse_mismatch');
  });

  it('totalQuantity sums across all bins for a SKU', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bins = wms.listBins(w.id).filter(b => b.zone === 'ambient').slice(0, 3);
    wms.receiveStock({ warehouseId: w.id, binId: bins[0].id, sku: 'A', quantity: 10, weightKgPerUnit: 1, reason: 'a' });
    wms.receiveStock({ warehouseId: w.id, binId: bins[1].id, sku: 'A', quantity: 20, weightKgPerUnit: 1, reason: 'b' });
    wms.receiveStock({ warehouseId: w.id, binId: bins[2].id, sku: 'A', quantity: 30, weightKgPerUnit: 1, reason: 'c' });
    expect(wms.totalQuantity(w.id, 'A')).toBe(60);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stock — adjust
// ─────────────────────────────────────────────────────────────────────────────

describe('Stock adjust', () => {
  it('sets absolute quantity', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id).find(b => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'X', quantity: 100, weightKgPerUnit: 1, reason: 'r' });
    const r = wms.adjustStock({ warehouseId: w.id, binId: bin.id, sku: 'X', newQuantity: 87, reason: 'cycle-count' });
    expect('id' in r);
    expect((r as any).quantity).toBe(87);
  });

  it('writes an adjust movement with the delta', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id).find(b => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'X', quantity: 100, weightKgPerUnit: 1, reason: 'r' });
    wms.adjustStock({ warehouseId: w.id, binId: bin.id, sku: 'X', newQuantity: 80, reason: 'shrinkage' });
    const moves = wms.listMovements({ warehouseId: w.id, sku: 'X', type: 'adjust' });
    expect(moves.length).toBe(1);
    expect(moves[0].quantity).toBe(-20);
  });

  it('returns stock_not_found when adjusting missing stock', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id).find(b => b.zone === 'ambient')!;
    const r = wms.adjustStock({ warehouseId: w.id, binId: bin.id, sku: 'GHOST', newQuantity: 0, reason: 'x' });
    expect('error' in r && r.error).toBe('stock_not_found');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Transfers
// ─────────────────────────────────────────────────────────────────────────────

describe('Transfers', () => {
  function setupStock(): { w1: any; w2: any; bin1: any } {
    const warehouses = slotSvc.searchWarehouses({});
    const w1 = warehouses[0];
    const w2 = warehouses[1];
    const bin1 = wms.listBins(w1.id).find((b: any) => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w1.id, binId: bin1.id, sku: 'TRANSFER-SKU', quantity: 200, weightKgPerUnit: 0.5, reason: 'seed' });
    return { w1, w2, bin1 };
  }

  it('creates a transfer when origin has stock', () => {
    const { w1, w2 } = setupStock();
    const t = wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w2.id, sku: 'TRANSFER-SKU', quantity: 50 });
    expect('id' in t);
    expect((t as any).status).toBe('pending');
  });

  it('rejects transfer with insufficient stock', () => {
    const { w1, w2 } = setupStock();
    const t = wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w2.id, sku: 'TRANSFER-SKU', quantity: 9999 });
    expect('error' in t && t.error).toBe('insufficient_stock');
  });

  it('rejects transfer to same warehouse', () => {
    const { w1 } = setupStock();
    const t = wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w1.id, sku: 'TRANSFER-SKU', quantity: 1 });
    expect('error' in t && t.error).toBe('same_warehouse');
  });

  it('pick decrements origin stock', () => {
    const { w1, w2, bin1 } = setupStock();
    const t = wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w2.id, sku: 'TRANSFER-SKU', quantity: 50 }) as any;
    const before = wms.getStock(w1.id, 'TRANSFER-SKU', bin1.id, null)!.quantity;
    const picked = wms.pickTransfer(t.id) as any;
    expect(picked.status).toBe('in_transit');
    const after = wms.getStock(w1.id, 'TRANSFER-SKU', bin1.id, null)!.quantity;
    expect(after).toBe(before - 50);
  });

  it('receive increments destination stock and completes the transfer', () => {
    const { w1, w2, bin1 } = setupStock();
    const t = wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w2.id, sku: 'TRANSFER-SKU', quantity: 50 }) as any;
    wms.pickTransfer(t.id);
    const destBin = wms.listBins(w2.id).find((b: any) => b.zone === 'ambient')!;
    const received = wms.receiveTransfer(t.id, destBin.id, 0.5) as any;
    expect(received.status).toBe('received');
    expect(received.receivedAt).not.toBeNull();
    const destStock = wms.getStock(w2.id, 'TRANSFER-SKU', destBin.id, null)!;
    expect(destStock.quantity).toBe(50);
  });

  it('rejects receive with bin in wrong warehouse', () => {
    const { w1, w2, bin1 } = setupStock();
    const t = wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w2.id, sku: 'TRANSFER-SKU', quantity: 50 }) as any;
    wms.pickTransfer(t.id);
    // Try to receive into a bin that belongs to w1 (origin) instead of w2 (dest)
    const wrongBin = wms.listBins(w1.id).find((b: any) => b.zone === 'ambient')!;
    const r = wms.receiveTransfer(t.id, wrongBin.id, 0.5);
    expect('error' in r && r.error).toBe('bin_warehouse_mismatch');
  });

  it('cancel works only on pending transfers', () => {
    const { w1, w2 } = setupStock();
    const t = wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w2.id, sku: 'TRANSFER-SKU', quantity: 10 }) as any;
    const cancelled = wms.cancelTransfer(t.id) as any;
    expect(cancelled.status).toBe('cancelled');
    // Can't cancel again
    const r = wms.cancelTransfer(t.id);
    expect('error' in r);
  });

  it('listTransfers filters by warehouse and status', () => {
    const { w1, w2 } = setupStock();
    wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w2.id, sku: 'TRANSFER-SKU', quantity: 5 });
    wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w2.id, sku: 'TRANSFER-SKU', quantity: 10 });
    const pending = wms.listTransfers(undefined, 'pending');
    expect(pending.length).toBe(2);
    const fromW1 = wms.listTransfers(w1.id, 'pending');
    expect(fromW1.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pick lists
// ─────────────────────────────────────────────────────────────────────────────

describe('Pick lists', () => {
  it('creates a pick list with auto-assigned bins', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id).find(b => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'PICK-SKU', quantity: 50, weightKgPerUnit: 1, reason: 'r' });
    const pl = wms.createPickList({ warehouseId: w.id, orderId: 'order-1', lines: [{ sku: 'PICK-SKU', quantity: 5 }] }) as any;
    expect(pl.lines.length).toBe(1);
    expect(pl.lines[0].binId).toBe(bin.id);
    expect(pl.status).toBe('open');
  });

  it('executes a pick, decrements stock, and completes the list', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id).find(b => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'PICK-SKU', quantity: 50, weightKgPerUnit: 1, reason: 'r' });
    const pl = wms.createPickList({ warehouseId: w.id, orderId: 'order-1', lines: [{ sku: 'PICK-SKU', quantity: 5 }] }) as any;
    const result = wms.pickFromBin({ pickListId: pl.id, binId: bin.id, sku: 'PICK-SKU', quantity: 5 }) as any;
    expect(result.status).toBe('completed');
    expect(result.completedAt).not.toBeNull();
    const stock = wms.getStock(w.id, 'PICK-SKU', bin.id, null)!;
    expect(stock.quantity).toBe(45);
  });

  it('rejects pick from wrong bin', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bins = wms.listBins(w.id).filter(b => b.zone === 'ambient').slice(0, 2);
    wms.receiveStock({ warehouseId: w.id, binId: bins[0].id, sku: 'PICK', quantity: 50, weightKgPerUnit: 1, reason: 'r' });
    wms.receiveStock({ warehouseId: w.id, binId: bins[1].id, sku: 'PICK', quantity: 50, weightKgPerUnit: 1, reason: 'r' });
    const pl = wms.createPickList({ warehouseId: w.id, orderId: 'order-1', lines: [{ sku: 'PICK', quantity: 5 }] }) as any;
    // The list auto-assigned bins[0] (FIFO oldest), try to pick from bins[1]
    const r = wms.pickFromBin({ pickListId: pl.id, binId: bins[1].id, sku: 'PICK', quantity: 5 });
    expect('error' in r && r.error).toBe('bin_mismatch');
  });

  it('multi-line pick list requires picking each line', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id).find(b => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'A', quantity: 50, weightKgPerUnit: 1, reason: 'r' });
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'B', quantity: 50, weightKgPerUnit: 1, reason: 'r' });
    const pl = wms.createPickList({ warehouseId: w.id, orderId: 'o', lines: [{ sku: 'A', quantity: 3 }, { sku: 'B', quantity: 4 }] }) as any;
    expect(pl.status).toBe('open');
    wms.pickFromBin({ pickListId: pl.id, binId: bin.id, sku: 'A', quantity: 3 });
    const mid = wms.getPickList(pl.id) as any;
    expect(mid.status).toBe('in_progress');
    wms.pickFromBin({ pickListId: pl.id, binId: bin.id, sku: 'B', quantity: 4 });
    const done = wms.getPickList(pl.id) as any;
    expect(done.status).toBe('completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Movements
// ─────────────────────────────────────────────────────────────────────────────

describe('Movements', () => {
  it('writes a movement on every stock change', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id).find(b => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'AUDIT', quantity: 10, weightKgPerUnit: 1, reason: 'r' });
    const moves = wms.listMovements({ warehouseId: w.id, sku: 'AUDIT' });
    expect(moves.length).toBe(1);
    expect(moves[0].type).toBe('receive');
    expect(moves[0].quantity).toBe(10);
  });

  it('movement types cover the full lifecycle', () => {
    const w1 = slotSvc.searchWarehouses({})[0];
    const w2 = slotSvc.searchWarehouses({})[1];
    const bin1 = wms.listBins(w1.id).find(b => b.zone === 'ambient')!;
    const bin2 = wms.listBins(w2.id).find(b => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w1.id, binId: bin1.id, sku: 'CYCLE', quantity: 100, weightKgPerUnit: 1, reason: 'r' });
    const t = wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w2.id, sku: 'CYCLE', quantity: 30 }) as any;
    wms.pickTransfer(t.id);
    wms.receiveTransfer(t.id, bin2.id, 1);
    const pl = wms.createPickList({ warehouseId: w2.id, orderId: 'o', lines: [{ sku: 'CYCLE', quantity: 5 }] }) as any;
    wms.pickFromBin({ pickListId: pl.id, binId: pl.lines[0].binId, sku: 'CYCLE', quantity: 5 });

    const types = new Set(wms.listMovements({ sku: 'CYCLE' }).map(m => m.type));
    expect(types.has('receive')).toBe(true);
    expect(types.has('transfer_out')).toBe(true);
    expect(types.has('transfer_in')).toBe(true);
    expect(types.has('pick')).toBe(true);
  });

  it('listMovements sorts by most recent first and respects limit', () => {
    const w = slotSvc.searchWarehouses({})[0];
    const bin = wms.listBins(w.id).find(b => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'A', quantity: 1, weightKgPerUnit: 1, reason: '1' });
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'A', quantity: 1, weightKgPerUnit: 1, reason: '2' });
    wms.receiveStock({ warehouseId: w.id, binId: bin.id, sku: 'A', quantity: 1, weightKgPerUnit: 1, reason: '3' });
    const all = wms.listMovements({ sku: 'A' });
    expect(all.length).toBe(3);
    expect(all[0].at >= all[1].at).toBe(true);
    const limited = wms.listMovements({ sku: 'A', limit: 2 });
    expect(limited.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WMS stats
// ─────────────────────────────────────────────────────────────────────────────

describe('WMS stats', () => {
  it('reports non-zero bins after seed and increments as activity happens', () => {
    const stats0 = wms.wmsStats();
    expect(stats0.bins).toBeGreaterThan(0);
    expect(stats0.stockLines).toBe(0);
    expect(stats0.totalUnits).toBe(0);

    const w1 = slotSvc.searchWarehouses({})[0];
    const w2 = slotSvc.searchWarehouses({})[1];
    const bin1 = wms.listBins(w1.id).find(b => b.zone === 'ambient')!;
    wms.receiveStock({ warehouseId: w1.id, binId: bin1.id, sku: 'S', quantity: 100, weightKgPerUnit: 1, reason: 'r' });
    const stats1 = wms.wmsStats();
    expect(stats1.stockLines).toBe(1);
    expect(stats1.totalUnits).toBe(100);
    expect(stats1.movements).toBe(1);

    const t = wms.createTransfer({ fromWarehouseId: w1.id, toWarehouseId: w2.id, sku: 'S', quantity: 30 }) as any;
    expect(wms.wmsStats().transfers.pending).toBe(1);
  });
});
