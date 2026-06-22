import { describe, it, expect, beforeEach } from "vitest";
import tradeFinanceService from "../../src/services/trade-finance.service.js";

describe("tradeFinanceService", () => {
  beforeEach(() => {
    tradeFinanceService.resetAll();
    tradeFinanceService.seedDemoEntities();
  });

  describe("seedDemoEntities", () => {
    it("seeds 5 demo entities", () => {
      expect(tradeFinanceService.listEntities().length).toBe(5);
    });
  });

  describe("evaluateOffer — approval matrix", () => {
    it("approves a small request for a high-trust entity", () => {
      const r = tradeFinanceService.evaluateOffer({ entityId: "ENT-MDC-001", amount: 100_000 });
      if ("error" in r) throw new Error(r.error);
      expect(r.decision).toBe("approved");
      expect(r.approvedAmount).toBe(100_000);
      expect(r.rateApr).toBeLessThan(11); // trust 95 → low premium
      expect(r.totalRepayable).toBeGreaterThan(r.approvedAmount);
    });

    it("reduces a request that exceeds headroom", () => {
      // ENT-AUR-001 has trust 90, baseline 5M, outstanding 800k
      // headroom = 5M * 0.9 - 800k = 3.7M
      const r = tradeFinanceService.evaluateOffer({ entityId: "ENT-AUR-001", amount: 5_000_000 });
      if ("error" in r) throw new Error(r.error);
      expect(r.decision).toBe("reduced");
      expect(r.approvedAmount).toBeLessThan(5_000_000);
      expect(r.approvedAmount).toBeGreaterThan(0);
    });

    it("rejects a request from low-trust entity", () => {
      const r = tradeFinanceService.evaluateOffer({ entityId: "ENT-NEW-001", amount: 50_000 });
      if ("error" in r) throw new Error(r.error);
      expect(r.decision).toBe("rejected");
      expect(r.approvedAmount).toBe(0);
    });

    it("rejects when entity has no headroom", () => {
      // ENT-NEW-001: baseline 500k, trust 40, outstanding 200k → scaled=200k, headroom=0
      const r = tradeFinanceService.evaluateOffer({ entityId: "ENT-NEW-001", amount: 10_000 });
      if ("error" in r) throw new Error(r.error);
      expect(r.decision).toBe("rejected");
    });

    it("rejects unknown entity", () => {
      const r = tradeFinanceService.evaluateOffer({ entityId: "FAKE", amount: 1000 });
      expect("error" in r).toBe(true);
    });

    it("rejects non-positive amount", () => {
      const r = tradeFinanceService.evaluateOffer({ entityId: "demo-user", amount: 0 });
      expect("error" in r).toBe(true);
    });

    it("uses custom currency and term when provided", () => {
      const r = tradeFinanceService.evaluateOffer({ entityId: "ENT-MDC-001", amount: 50_000, currency: "USD", termDays: 30 });
      if ("error" in r) throw new Error(r.error);
      expect(r.currency).toBe("USD");
      expect(r.termDays).toBe(30);
    });

    it("applies agriculture sector discount", () => {
      // Create an agri entity
      tradeFinanceService.registerEntity({
        id: "ENT-AGRI-TEST",
        name: "AgriTest",
        country: "IN",
        trustScore: 80,
        onTimeRatio: 0.9,
        baselineLimit: 500_000,
        sector: "agriculture",
      });
      const r = tradeFinanceService.evaluateOffer({ entityId: "ENT-AGRI-TEST", amount: 50_000 });
      if ("error" in r) throw new Error(r.error);
      // Base + risk premium for trust 80: 9.5 + (20/100)*9 = 11.3; minus 1.5 sector = 9.8
      expect(r.rateApr).toBeCloseTo(9.8, 1);
    });
  });

  describe("acceptOffer + loan lifecycle", () => {
    it("accepts an approved offer and creates an active loan", () => {
      const o = tradeFinanceService.evaluateOffer({ entityId: "ENT-MDC-001", amount: 100_000 });
      if ("error" in o) throw new Error(o.error);
      const loan = tradeFinanceService.acceptOffer(o.id);
      if ("error" in loan) throw new Error(loan.error);
      expect(loan.status).toBe("active");
      expect(loan.principal).toBe(100_000);
      const entity = tradeFinanceService.getEntity("ENT-MDC-001");
      expect(entity!.outstandingBalance).toBe(100_000);
    });

    it("cannot accept a rejected offer", () => {
      const o = tradeFinanceService.evaluateOffer({ entityId: "ENT-NEW-001", amount: 50_000 });
      if ("error" in o) throw new Error(o.error);
      expect(o.decision).toBe("rejected");
      const r = tradeFinanceService.acceptOffer(o.id);
      expect("error" in r).toBe(true);
    });

    it("rejects acceptance of unknown offer", () => {
      const r = tradeFinanceService.acceptOffer("OFF-FAKE");
      expect("error" in r).toBe(true);
    });

    it("repay reduces outstanding and marks repaid at zero", () => {
      const o = tradeFinanceService.evaluateOffer({ entityId: "ENT-MDC-001", amount: 100_000 });
      if ("error" in o) throw new Error(o.error);
      const loan = tradeFinanceService.acceptOffer(o.id);
      if ("error" in loan) throw new Error(loan.error);

      const repayRes = tradeFinanceService.repay(loan.id, loan.outstanding);
      if ("error" in repayRes) throw new Error(repayRes.error);
      expect(repayRes.status).toBe("repaid");

      const entity = tradeFinanceService.getEntity("ENT-MDC-001");
      expect(entity!.outstandingBalance).toBe(0);
      // Trust should have ticked up by 1
      expect(entity!.trustScore).toBeGreaterThan(95);
    });

    it("partial repay keeps loan active", () => {
      const o = tradeFinanceService.evaluateOffer({ entityId: "ENT-MDC-001", amount: 100_000 });
      if ("error" in o) throw new Error(o.error);
      const loan = tradeFinanceService.acceptOffer(o.id);
      if ("error" in loan) throw new Error(loan.error);
      const initialOutstanding = loan.outstanding;

      const r = tradeFinanceService.repay(loan.id, 1000);
      if ("error" in r) throw new Error(r.error);
      expect(r.status).toBe("active");
      expect(r.outstanding).toBeLessThan(initialOutstanding);
      expect(r.outstanding).toBe(Math.round((initialOutstanding - 1000) * 100) / 100);
      expect(r.repayments.length).toBe(1);
    });

    it("rejects negative or zero repay amount", () => {
      const o = tradeFinanceService.evaluateOffer({ entityId: "ENT-MDC-001", amount: 100_000 });
      if ("error" in o) throw new Error(o.error);
      const loan = tradeFinanceService.acceptOffer(o.id);
      if ("error" in loan) throw new Error(loan.error);

      const r = tradeFinanceService.repay(loan.id, -100);
      expect("error" in r).toBe(true);
    });

    it("refuses repay on non-active loan", () => {
      const r = tradeFinanceService.repay("LN-FAKE", 100);
      expect("error" in r).toBe(true);
    });
  });

  describe("networkStats", () => {
    it("returns expected counters after seed + one offer", () => {
      const stats = tradeFinanceService.networkStats();
      expect(stats.entities).toBe(5);
      expect(stats.offers).toBe(0);
      expect(stats.offersApproved).toBe(0);
      tradeFinanceService.evaluateOffer({ entityId: "ENT-MDC-001", amount: 1000 });
      const stats2 = tradeFinanceService.networkStats();
      expect(stats2.offers).toBe(1);
      expect(stats2.offersApproved).toBe(1);
    });
  });
});