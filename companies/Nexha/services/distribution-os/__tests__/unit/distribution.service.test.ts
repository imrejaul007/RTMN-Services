import { describe, it, expect, beforeEach } from "vitest";
import distributionService from "../../src/services/distribution.service.js";

describe("distributionService", () => {
  beforeEach(() => {
    distributionService.resetAll();
    distributionService.seedDemoLanes();
  });

  describe("seedDemoLanes", () => {
    it("seeds >100 lanes (8 cities × 7 routes × 4 carriers × 4 levels)", () => {
      const lanes = distributionService.listLanes();
      // 8 * 7 = 56 routes × 4 carriers × 4 levels = 896
      expect(lanes.length).toBe(896);
    });
  });

  describe("quote", () => {
    it("returns ranked quotes for a valid city pair", () => {
      const q = distributionService.quote({
        origin: "Mumbai",
        destination: "Delhi",
        weightKg: 5,
        limit: 5,
      });
      expect(q.length).toBe(5);
      // Sorted cheapest first
      for (let i = 1; i < q.length; i++) {
        expect(q[i].total).toBeGreaterThanOrEqual(q[i - 1].total);
      }
    });

    it("returns empty for same origin and destination", () => {
      const q = distributionService.quote({ origin: "Mumbai", destination: "Mumbai", weightKg: 5 });
      expect(q.length).toBe(0);
    });

    it("returns empty for unknown city pair", () => {
      // norm() uppercases but unknown city pair has no lanes
      const q = distributionService.quote({ origin: "Mumbai", destination: "NowhereCity", weightKg: 5 });
      expect(q.length).toBe(0);
    });

    it("adds special handling surcharge for cold_chain", () => {
      const standard = distributionService.quote({ origin: "Mumbai", destination: "Delhi", weightKg: 10, preferredLevel: "standard", limit: 1 });
      const cold = distributionService.quote({ origin: "Mumbai", destination: "Delhi", weightKg: 10, specialHandling: ["cold_chain"], preferredLevel: "standard", limit: 1 });
      expect(standard[0].total).toBeLessThan(cold[0].total);
      expect(cold[0].specialHandlingCharge).toBeGreaterThan(0);
    });

    it("filters by preferredLevel", () => {
      const q = distributionService.quote({ origin: "Mumbai", destination: "Delhi", weightKg: 5, preferredLevel: "express", limit: 10 });
      q.forEach((x) => expect(x.serviceLevel).toBe("express"));
    });

    it("includes estimatedDelivery ISO timestamp", () => {
      const q = distributionService.quote({ origin: "Mumbai", destination: "Delhi", weightKg: 5, limit: 1 });
      expect(() => new Date(q[0].estimatedDelivery).toISOString()).not.toThrow();
      expect(new Date(q[0].estimatedDelivery).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("book + lifecycle", () => {
    it("books a shipment using a quote id", () => {
      const q = distributionService.quote({ origin: "Mumbai", destination: "Delhi", weightKg: 5, limit: 1 });
      const s = distributionService.book({ quoteId: q[0].laneId, origin: "Mumbai", destination: "Delhi", weightKg: 5 });
      if ("error" in s) throw new Error(s.error);
      expect(s.status).toBe("created");
      expect(s.totalCost).toBe(q[0].total);
    });

    it("rejects mismatched origin/destination for a quote", () => {
      const q = distributionService.quote({ origin: "Mumbai", destination: "Delhi", weightKg: 5, limit: 1 });
      const s = distributionService.book({ quoteId: q[0].laneId, origin: "Chennai", destination: "Delhi", weightKg: 5 });
      expect("error" in s).toBe(true);
    });

    it("rejects unknown quoteId", () => {
      const s = distributionService.book({ quoteId: "LN-FAKE", origin: "Mumbai", destination: "Delhi", weightKg: 5 });
      expect("error" in s).toBe(true);
    });

    it("advances through created → picked_up → in_transit → out_for_delivery → delivered", () => {
      const q = distributionService.quote({ origin: "Mumbai", destination: "Delhi", weightKg: 5, limit: 1 });
      const s0 = distributionService.book({ quoteId: q[0].laneId, origin: "Mumbai", destination: "Delhi", weightKg: 5 }) as any;
      const s1 = distributionService.advance(s0.id) as any;
      expect(s1.status).toBe("picked_up");
      const s2 = distributionService.advance(s0.id) as any;
      expect(s2.status).toBe("in_transit");
      const s3 = distributionService.advance(s0.id) as any;
      expect(s3.status).toBe("out_for_delivery");
      const s4 = distributionService.advance(s0.id) as any;
      expect(s4.status).toBe("delivered");
      expect(s4.deliveredAt).toBeDefined();
      expect(s4.tracking.length).toBe(5);
    });

    it("rejects advance on delivered shipment", () => {
      const q = distributionService.quote({ origin: "Mumbai", destination: "Delhi", weightKg: 5, limit: 1 });
      const s0 = distributionService.book({ quoteId: q[0].laneId, origin: "Mumbai", destination: "Delhi", weightKg: 5 }) as any;
      for (let i = 0; i < 4; i++) distributionService.advance(s0.id);
      const r = distributionService.advance(s0.id);
      expect("error" in r).toBe(true);
    });

    it("cancels a shipment in any non-terminal state", () => {
      const q = distributionService.quote({ origin: "Mumbai", destination: "Delhi", weightKg: 5, limit: 1 });
      const s0 = distributionService.book({ quoteId: q[0].laneId, origin: "Mumbai", destination: "Delhi", weightKg: 5 }) as any;
      const c = distributionService.cancel(s0.id, "buyer changed mind") as any;
      expect(c.status).toBe("cancelled");
      expect(c.cancelledAt).toBeDefined();
    });

    it("refuses to cancel a delivered shipment", () => {
      const q = distributionService.quote({ origin: "Mumbai", destination: "Delhi", weightKg: 5, limit: 1 });
      const s0 = distributionService.book({ quoteId: q[0].laneId, origin: "Mumbai", destination: "Delhi", weightKg: 5 }) as any;
      for (let i = 0; i < 4; i++) distributionService.advance(s0.id);
      const r = distributionService.cancel(s0.id, "too late");
      expect("error" in r).toBe(true);
    });
  });

  describe("networkStats", () => {
    it("returns lane + shipment counts", () => {
      const stats = distributionService.networkStats();
      expect(stats.lanes).toBeGreaterThan(100);
      expect(stats.shipments).toBe(0);
    });
  });
});