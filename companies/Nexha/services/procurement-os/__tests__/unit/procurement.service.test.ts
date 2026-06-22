import { describe, it, expect, beforeEach } from "vitest";
import procurementService from "../../src/services/procurement.service.js";

describe("procurementService", () => {
  beforeEach(() => {
    procurementService.resetAll();
    procurementService.seedDemoSuppliers();
  });

  describe("seedDemoSuppliers", () => {
    it("seeds 5 suppliers across groceries, medicine, manufacturing", () => {
      const list = procurementService.listSuppliers();
      expect(list.length).toBe(5);
      const cats = new Set(list.flatMap((s) => s.categories));
      expect(cats.has("groceries")).toBe(true);
      expect(cats.has("medicine")).toBe(true);
      expect(cats.has("manufactured_goods")).toBe(true);
    });
  });

  describe("rankSuppliers", () => {
    it("returns ranked suppliers for a category", () => {
      const ranked = procurementService.rankSuppliers({ category: "groceries" });
      expect(ranked.length).toBe(3);
      ranked.forEach((r) => expect(r.supplier.categories.includes("groceries")).toBe(true));
    });

    it("marks non-credit suppliers ineligible when creditOk=true", () => {
      const ranked = procurementService.rankSuppliers({ category: "groceries", creditOk: true });
      const ineligible = ranked.filter((r) => !r.eligible);
      expect(ineligible.length).toBeGreaterThan(0);
      ineligible.forEach((r) => expect(r.supplier.acceptsCredit).toBe(false));
    });

    it("filters out by maxLeadTimeDays", () => {
      const ranked = procurementService.rankSuppliers({ category: "groceries", maxLeadTimeDays: 5 });
      ranked.forEach((r) => {
        if (!r.eligible) {
          expect(r.supplier.leadTimeDays).toBeGreaterThan(5);
        }
      });
    });

    it("filters out by maxUnitPrice", () => {
      const ranked = procurementService.rankSuppliers({ category: "groceries", maxUnitPrice: 85 });
      const ineligible = ranked.filter((r) => !r.eligible);
      expect(ineligible.length).toBeGreaterThan(0);
    });

    it("respects limit", () => {
      const ranked = procurementService.rankSuppliers({ category: "groceries", limit: 2 });
      expect(ranked.length).toBe(2);
    });

    it("puts eligible suppliers above ineligible ones", () => {
      const ranked = procurementService.rankSuppliers({ category: "groceries", creditOk: true });
      const firstIneligibleIdx = ranked.findIndex((r) => !r.eligible);
      if (firstIneligibleIdx >= 0) {
        for (let i = 0; i < firstIneligibleIdx; i++) {
          expect(ranked[i].eligible).toBe(true);
        }
      }
    });
  });

  describe("RFQ workflow", () => {
    let rfqId: string;

    beforeEach(() => {
      const rfq = procurementService.createRfq({
        buyerId: "BUY-TEST",
        category: "groceries",
        item: "basmati_rice",
        quantity: 200,
        unit: "kg",
        maxUnitPrice: 100,
        currency: "INR",
        destinationCity: "Bangalore",
        maxLeadTimeDays: 7,
        creditOk: true,
      });
      rfqId = rfq.id;
    });

    it("creates RFQ in open status", () => {
      const r = procurementService.getRfq(rfqId);
      expect(r).toBeDefined();
      expect(r!.status).toBe("open");
    });

    it("suggestInvitees returns eligible suppliers only", () => {
      const invitees = procurementService.suggestInvitees(rfqId, 5) as any[];
      expect(invitees.length).toBeGreaterThan(0);
      invitees.forEach((s) => {
        expect(s.acceptsCredit).toBe(true);
        expect(s.leadTimeDays).toBeLessThanOrEqual(7);
        expect(s.baselineUnitPrice).toBeLessThanOrEqual(100);
      });
    });

    it("submitResponse adds a response", () => {
      const r = procurementService.submitResponse({
        rfqId,
        supplierId: "SUP-AUR-001",
        unitPrice: 95,
        totalPrice: 19000,
        currency: "INR",
        leadTimeDays: 4,
        creditTermsDays: 30,
        validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(),
      });
      if ("error" in r) throw new Error(r.error);
      expect(r.status).toBe("submitted");
      expect(procurementService.listResponses(rfqId).length).toBe(1);
    });

    it("submitResponse rejects unknown supplier", () => {
      const r = procurementService.submitResponse({
        rfqId,
        supplierId: "SUP-FAKE",
        unitPrice: 90,
        totalPrice: 18000,
        currency: "INR",
        leadTimeDays: 5,
        validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(),
      });
      expect("error" in r).toBe(true);
    });

    it("submitResponse rejects responses to non-open RFQs", () => {
      procurementService.setRfqStatus(rfqId, "cancelled");
      const r = procurementService.submitResponse({
        rfqId,
        supplierId: "SUP-AUR-001",
        unitPrice: 95,
        totalPrice: 19000,
        currency: "INR",
        leadTimeDays: 4,
        validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(),
      });
      expect("error" in r).toBe(true);
    });

    it("shortlistResponses scores and marks top N", () => {
      // seed 3 responses
      procurementService.submitResponse({
        rfqId, supplierId: "SUP-AUR-001", unitPrice: 95, totalPrice: 19000, currency: "INR",
        leadTimeDays: 4, validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(),
      });
      procurementService.submitResponse({
        rfqId, supplierId: "SUP-BNR-001", unitPrice: 88, totalPrice: 17600, currency: "INR",
        leadTimeDays: 6, validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(),
      });
      procurementService.submitResponse({
        rfqId, supplierId: "SUP-CMD-001", unitPrice: 84, totalPrice: 16800, currency: "INR",
        leadTimeDays: 9, validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(),
      });

      const result = procurementService.shortlistResponses(rfqId, 2) as any;
      expect(result.shortlisted.length).toBe(2);
      expect(result.rejected.length).toBe(1);
      const rfq = procurementService.getRfq(rfqId);
      expect(rfq!.status).toBe("evaluating");
    });

    it("award marks winner and rejects others", () => {
      const r1 = procurementService.submitResponse({
        rfqId, supplierId: "SUP-AUR-001", unitPrice: 95, totalPrice: 19000, currency: "INR",
        leadTimeDays: 4, validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(),
      }) as any;
      const r2 = procurementService.submitResponse({
        rfqId, supplierId: "SUP-BNR-001", unitPrice: 88, totalPrice: 17600, currency: "INR",
        leadTimeDays: 6, validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(),
      }) as any;

      procurementService.shortlistResponses(rfqId, 2);
      const awarded = procurementService.award(rfqId, r1.id) as any;
      expect(awarded.status).toBe("awarded");
      expect(awarded.awardedTo).toBe(r1.id);

      const responses = procurementService.listResponses(rfqId);
      const winner = responses.find((r) => r.id === r1.id);
      const loser = responses.find((r) => r.id === r2.id);
      expect(winner!.status).toBe("winning");
      expect(loser!.status).toBe("rejected");
    });

    it("award rejects a response that was never shortlisted", () => {
      const r1 = procurementService.submitResponse({
        rfqId, supplierId: "SUP-AUR-001", unitPrice: 95, totalPrice: 19000, currency: "INR",
        leadTimeDays: 4, validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(),
      }) as any;
      const r = procurementService.award(rfqId, r1.id);
      expect("error" in r).toBe(true);
    });

    it("networkStats returns non-zero counts after seed", () => {
      const stats = procurementService.networkStats();
      expect(stats.suppliers).toBe(5);
      expect(stats.rfqs).toBeGreaterThanOrEqual(1); // demo RFQ + our test RFQ
    });
  });
});