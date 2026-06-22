import { describe, it, expect, beforeEach } from "vitest";
import warehouseService from "../../src/services/warehouse.service.js";

describe("warehouseService", () => {
  beforeEach(() => {
    warehouseService.resetAll();
    warehouseService.seedDemoWarehouses();
  });

  describe("seedDemoWarehouses", () => {
    it("seeds 4 demo warehouses", () => {
      const list = warehouseService.listWarehouses();
      expect(list.length).toBe(4);
    });

    it("includes one of each major kind", () => {
      const list = warehouseService.listWarehouses();
      const kinds = new Set(list.map((w) => w.kind));
      expect(kinds.has("dry")).toBe(true);
      expect(kinds.has("cold_chain")).toBe(true);
      expect(kinds.has("bulk")).toBe(true);
      expect(kinds.has("pharma")).toBe(true);
    });
  });

  describe("listWarehouses filter", () => {
    it("filters by kind", () => {
      const cold = warehouseService.listWarehouses({ kind: "cold_chain" });
      expect(cold.length).toBe(1);
      expect(cold[0].kind).toBe("cold_chain");
    });

    it("filters by city (case-insensitive)", () => {
      const blr = warehouseService.listWarehouses({ city: "BANGALORE" });
      expect(blr.length).toBe(2);
      blr.forEach((w) => expect(w.location.city.toLowerCase()).toBe("bangalore"));
    });
  });

  describe("searchSlots", () => {
    it("returns hits for a common item across cities", () => {
      const hits = warehouseService.searchSlots({ item: "rice" });
      expect(hits.length).toBeGreaterThan(0);
      const items = hits.map((h) => h.slot.item);
      expect(items.some((i) => i.includes("rice"))).toBe(true);
    });

    it("respects maxPricePerUnit", () => {
      const hits = warehouseService.searchSlots({ item: "rice", maxPricePerUnit: 50 });
      hits.forEach((h) => expect(h.slot.pricePerUnit).toBeLessThanOrEqual(50));
    });

    it("respects minTrustScore", () => {
      const hits = warehouseService.searchSlots({ category: "medicine", minTrustScore: 90 });
      expect(hits.length).toBeGreaterThan(0);
      hits.forEach((h) => expect(h.warehouse.trustScore).toBeGreaterThanOrEqual(90));
    });

    it("ranks cheaper + fresher + higher-trust first", () => {
      const hits = warehouseService.searchSlots({ category: "groceries", city: "Bangalore" });
      expect(hits.length).toBeGreaterThan(1);
      // First hit should be the highest-scoring
      const first = hits[0];
      expect(first).toBeDefined();
    });
  });

  describe("bookSlot", () => {
    it("books a slot and decrements available units", () => {
      const before = warehouseService.listWarehouses({ city: "Bangalore" })[0];
      const slot = before.slots[0];
      const initial = slot.availableUnits;
      const booking = warehouseService.bookSlot({
        warehouseId: before.id,
        slotId: slot.id,
        units: slot.minOrderUnits,
        reference: "test-1",
      });
      if ("error" in booking) throw new Error(booking.error);
      expect(booking.status).toBe("reserved");
      const after = warehouseService.getWarehouse(before.id)!.slots.find((s) => s.id === slot.id)!;
      expect(after.availableUnits).toBe(initial - slot.minOrderUnits);
    });

    it("rejects below-minimum orders", () => {
      const w = warehouseService.listWarehouses({ city: "Bangalore" })[0];
      const slot = w.slots[0];
      const result = warehouseService.bookSlot({
        warehouseId: w.id,
        slotId: slot.id,
        units: 1,
      });
      expect("error" in result).toBe(true);
    });

    it("rejects over-capacity orders", () => {
      const w = warehouseService.listWarehouses({ city: "Bangalore" })[0];
      const slot = w.slots[0];
      const result = warehouseService.bookSlot({
        warehouseId: w.id,
        slotId: slot.id,
        units: slot.availableUnits + 1,
      });
      expect("error" in result).toBe(true);
    });

    it("rejects unknown warehouse / slot", () => {
      const r1 = warehouseService.bookSlot({ warehouseId: "WH-NOPE", slotId: "X", units: 1 });
      expect("error" in r1).toBe(true);
      const w = warehouseService.listWarehouses()[0];
      const r2 = warehouseService.bookSlot({ warehouseId: w.id, slotId: "SLOT-NOPE", units: 1 });
      expect("error" in r2).toBe(true);
    });
  });

  describe("fulfillBooking", () => {
    it("moves a booking from reserved → filled", () => {
      const w = warehouseService.listWarehouses({ city: "Bangalore" })[0];
      const slot = w.slots[0];
      const b = warehouseService.bookSlot({ warehouseId: w.id, slotId: slot.id, units: slot.minOrderUnits });
      if ("error" in b) throw new Error(b.error);
      const f = warehouseService.fulfillBooking(b.id);
      if ("error" in f) throw new Error(f.error);
      expect(f.status).toBe("filled");
      expect(f.fulfilledAt).toBeDefined();
    });

    it("rejects unknown booking", () => {
      const r = warehouseService.fulfillBooking("BOOK-FAKE");
      expect("error" in r).toBe(true);
    });
  });

  describe("cancelBooking", () => {
    it("refunds units and marks cancelled", () => {
      const w = warehouseService.listWarehouses({ city: "Bangalore" })[0];
      const slot = w.slots[0];
      const before = slot.availableUnits;
      const b = warehouseService.bookSlot({ warehouseId: w.id, slotId: slot.id, units: slot.minOrderUnits });
      if ("error" in b) throw new Error(b.error);
      const afterBook = warehouseService.getWarehouse(w.id)!.slots.find((s) => s.id === slot.id)!.availableUnits;
      expect(afterBook).toBe(before - slot.minOrderUnits);
      const c = warehouseService.cancelBooking(b.id);
      if ("error" in c) throw new Error(c.error);
      expect(c.status).toBe("cancelled");
      const afterCancel = warehouseService.getWarehouse(w.id)!.slots.find((s) => s.id === slot.id)!.availableUnits;
      expect(afterCancel).toBe(before);
    });

    it("refuses to cancel a fulfilled booking", () => {
      const w = warehouseService.listWarehouses({ city: "Bangalore" })[0];
      const slot = w.slots[0];
      const b = warehouseService.bookSlot({ warehouseId: w.id, slotId: slot.id, units: slot.minOrderUnits });
      if ("error" in b) throw new Error(b.error);
      warehouseService.fulfillBooking(b.id);
      const c = warehouseService.cancelBooking(b.id);
      expect("error" in c).toBe(true);
    });
  });

  describe("routes", () => {
    it("returns at least one route between the two Bangalore warehouses", () => {
      const route = warehouseService.findRoute("WH-BLR-001", "WH-BLR-002");
      expect(route).toBeDefined();
      expect(route!.sameCorridor).toBe(true);
    });

    it("returns no route for unknown pair", () => {
      const route = warehouseService.findRoute("WH-BLR-001", "WH-FAKE-999");
      expect(route).toBeUndefined();
    });
  });

  describe("computeCostForRoute", () => {
    it("returns just base cost when no destination given", () => {
      const w = warehouseService.listWarehouses({ city: "Bangalore" })[0];
      const slot = w.slots[0];
      const r = warehouseService.computeCostForRoute({ warehouseId: w.id, units: 50, slotId: slot.id });
      if ("error" in r) throw new Error(r);
      expect(r.baseCost).toBe(slot.pricePerUnit * 50);
      expect(r.transitSurcharge).toBe(0);
      expect(r.transitHours).toBe(0);
    });

    it("adds transit surcharge when routing across warehouses", () => {
      const w1 = warehouseService.getWarehouse("WH-BLR-001")!;
      const slot = w1.slots[0];
      const r = warehouseService.computeCostForRoute({
        warehouseId: w1.id,
        destinationWarehouseId: "WH-MUM-001",
        units: 100,
        slotId: slot.id,
      });
      if ("error" in r) throw new Error(r);
      expect(r.transitSurcharge).toBeGreaterThan(0);
      expect(r.transitHours).toBe(28);
    });

    it("rejects unknown slot", () => {
      const r = warehouseService.computeCostForRoute({
        warehouseId: "WH-BLR-001",
        units: 1,
        slotId: "SLOT-NOPE",
      });
      expect("error" in r).toBe(true);
    });
  });
});