/**
 * Procurement service — supplier discovery, RFP routing, contract award.
 *
 * Independent from sutar-supplier-registry. Where the registry answers
 * "given a capability, who supplies it?", this service answers the
 * procurement workflow questions: "given an RFQ, which suppliers should
 * we invite?", "which response wins?", and "what does the awarded contract
 * look like?".
 */

import { randomUUID } from "node:crypto";

export type RfqStatus = "draft" | "open" | "evaluating" | "awarded" | "cancelled";
export type ResponseStatus = "submitted" | "shortlisted" | "rejected" | "winning";

export interface SupplierProfile {
  id: string;
  name: string;
  country: string;
  categories: string[];
  rating: number;          // 0..5
  reliability: number;     // 0..100
  trustScore: number;      // 0..100
  totalOrders: number;
  /** Average lead time in days for this supplier. */
  leadTimeDays: number;
  /** Whether the supplier accepts credit (vs. cash upfront). */
  acceptsCredit: boolean;
  /** Indicative unit cost (relative, in supplier's primary category). */
  baselineUnitPrice: number;
}

export interface RfqRequest {
  id: string;
  buyerId: string;
  category: string;
  item: string;
  quantity: number;
  unit: string;
  maxUnitPrice: number;
  currency: string;
  /** Buyer's preferred delivery location (used to score distance). */
  destinationCity: string;
  /** Acceptable lead time in days. */
  maxLeadTimeDays: number;
  /** Allow credit terms? */
  creditOk: boolean;
  createdAt: string;
  status: RfqStatus;
  awardedTo?: string; // winning response id
}

export interface RfqResponse {
  id: string;
  rfqId: string;
  supplierId: string;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  leadTimeDays: number;
  creditTermsDays?: number; // 0 if cash upfront
  validUntil: string;
  notes?: string;
  status: ResponseStatus;
  score?: number; // computed on shortlist
  submittedAt: string;
}

class ProcurementService {
  private suppliers = new Map<string, SupplierProfile>();
  private rfqs = new Map<string, RfqRequest>();
  private responses = new Map<string, RfqResponse>();

  // ── Seed (idempotent) ──────────────────────────────────────────────
  seedDemoSuppliers(): number {
    if (this.suppliers.size > 0) return 0;

    const baseSuppliers: SupplierProfile[] = [
      { id: "SUP-AUR-001", name: "Auria Grains Pvt Ltd", country: "IN", categories: ["groceries"], rating: 4.7, reliability: 94, trustScore: 90, totalOrders: 1820, leadTimeDays: 4, acceptsCredit: true, baselineUnitPrice: 96 },
      { id: "SUP-BNR-001", name: "Bharat Rice Mills", country: "IN", categories: ["groceries"], rating: 4.4, reliability: 88, trustScore: 82, totalOrders: 940, leadTimeDays: 6, acceptsCredit: false, baselineUnitPrice: 88 },
      { id: "SUP-CMD-001", name: "CommodityFirst Wholesale", country: "IN", categories: ["groceries", "manufactured_goods"], rating: 4.1, reliability: 79, trustScore: 70, totalOrders: 410, leadTimeDays: 9, acceptsCredit: true, baselineUnitPrice: 82 },
      { id: "SUP-MDC-001", name: "MedCore Pharmaceuticals", country: "IN", categories: ["medicine"], rating: 4.9, reliability: 97, trustScore: 95, totalOrders: 3210, leadTimeDays: 3, acceptsCredit: true, baselineUnitPrice: 12 },
      { id: "SUP-GEN-001", name: "GenServ Industrial", country: "IN", categories: ["manufactured_goods", "services"], rating: 4.0, reliability: 75, trustScore: 68, totalOrders: 220, leadTimeDays: 12, acceptsCredit: false, baselineUnitPrice: 320 },
    ];
    for (const s of baseSuppliers) this.suppliers.set(s.id, s);

    // Seed a demo RFQ + 3 responses so the demo flow is non-empty
    const rfq: RfqRequest = {
      id: "RFQ-DEMO-001",
      buyerId: "BUY-DEMO-001",
      category: "groceries",
      item: "basmati_rice",
      quantity: 500,
      unit: "kg",
      maxUnitPrice: 110,
      currency: "INR",
      destinationCity: "Bangalore",
      maxLeadTimeDays: 7,
      creditOk: true,
      createdAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
      status: "evaluating",
    };
    this.rfqs.set(rfq.id, rfq);

    const responses: Omit<RfqResponse, "submittedAt">[] = [
      { id: "RFP-1", rfqId: rfq.id, supplierId: "SUP-AUR-001", unitPrice: 95, totalPrice: 47500, currency: "INR", leadTimeDays: 4, creditTermsDays: 30, validUntil: futureIso(7), notes: "Premium aged stock", status: "shortlisted" },
      { id: "RFP-2", rfqId: rfq.id, supplierId: "SUP-BNR-001", unitPrice: 88, totalPrice: 44000, currency: "INR", leadTimeDays: 6, creditTermsDays: 0, validUntil: futureIso(5), notes: "Best price, no credit", status: "shortlisted" },
      { id: "RFP-3", rfqId: rfq.id, supplierId: "SUP-CMD-001", unitPrice: 84, totalPrice: 42000, currency: "INR", leadTimeDays: 9, validUntil: futureIso(3), notes: "Cheapest but longest lead", status: "shortlisted" },
    ];
    for (const r of responses) {
      this.responses.set(r.id, { ...r, submittedAt: new Date(Date.now() - 1 * 86400_000).toISOString() });
    }
    return this.suppliers.size;
  }

  resetAll(): void {
    this.suppliers.clear();
    this.rfqs.clear();
    this.responses.clear();
  }

  // ── Suppliers ──────────────────────────────────────────────────────
  listSuppliers(filter?: { category?: string; country?: string }): SupplierProfile[] {
    return Array.from(this.suppliers.values()).filter((s) => {
      if (filter?.category && !s.categories.includes(filter.category)) return false;
      if (filter?.country && s.country !== filter.country) return false;
      return true;
    });
  }

  getSupplier(id: string): SupplierProfile | undefined {
    return this.suppliers.get(id);
  }

  /**
   * Rank suppliers for a procurement query — used by /api/suppliers
   * (the demo endpoint) and by the RFQ workflow.
   */
  rankSuppliers(query: {
    category?: string;
    item?: string;
    destinationCity?: string;
    maxUnitPrice?: number;
    maxLeadTimeDays?: number;
    creditOk?: boolean;
    limit?: number;
  }): Array<{ supplier: SupplierProfile; score: number; eligible: boolean; reasons?: string[] }> {
    const limit = query.limit ?? 10;
    const out: Array<{ supplier: SupplierProfile; score: number; eligible: boolean; reasons?: string[] }> = [];

    for (const s of this.suppliers.values()) {
      // If a category is specified, hard-filter the candidate set.
      if (query.category && !s.categories.includes(query.category)) {
        continue;
      }

      const reasons: string[] = [];
      let eligible = true;
      if (query.maxUnitPrice !== undefined && s.baselineUnitPrice > query.maxUnitPrice) {
        eligible = false;
        reasons.push(`baseline price ${s.baselineUnitPrice} exceeds max ${query.maxUnitPrice}`);
      }
      if (query.maxLeadTimeDays !== undefined && s.leadTimeDays > query.maxLeadTimeDays) {
        eligible = false;
        reasons.push(`lead time ${s.leadTimeDays}d exceeds max ${query.maxLeadTimeDays}d`);
      }
      if (query.creditOk && !s.acceptsCredit) {
        eligible = false;
        reasons.push("does not accept credit");
      }

      // Score on price vs. baseline + reliability + lead time
      const priceScore = Math.max(0, 100 - s.baselineUnitPrice); // cheaper-ish suppliers score higher
      const score = s.reliability * 0.4 + priceScore * 0.3 + (100 - s.leadTimeDays * 5) * 0.2 + s.trustScore * 0.1;
      out.push({ supplier: s, score: Math.round(score * 10) / 10, eligible, reasons: reasons.length ? reasons : undefined });
    }

    out.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
    return out.slice(0, limit);
  }

  // ── RFQs ───────────────────────────────────────────────────────────
  createRfq(input: Omit<RfqRequest, "id" | "createdAt" | "status">): RfqRequest {
    const id = `RFQ-${randomUUID().slice(0, 8)}`;
    const rfq: RfqRequest = {
      ...input,
      id,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    this.rfqs.set(id, rfq);
    return rfq;
  }

  getRfq(id: string): RfqRequest | undefined {
    return this.rfqs.get(id);
  }

  listRfqs(filter?: { status?: RfqStatus; buyerId?: string }): RfqRequest[] {
    return Array.from(this.rfqs.values()).filter((r) => {
      if (filter?.status && r.status !== filter.status) return false;
      if (filter?.buyerId && r.buyerId !== filter.buyerId) return false;
      return true;
    });
  }

  setRfqStatus(id: string, status: RfqStatus): RfqRequest | { error: string } {
    const r = this.rfqs.get(id);
    if (!r) return { error: `RFQ ${id} not found` };
    r.status = status;
    return r;
  }

  /** Suggest which suppliers should be invited to bid on this RFQ. */
  suggestInvitees(rfqId: string, topN = 5): SupplierProfile[] | { error: string } {
    const rfq = this.rfqs.get(rfqId);
    if (!rfq) return { error: `RFQ ${rfqId} not found` };
    return this.rankSuppliers({
      category: rfq.category,
      maxUnitPrice: rfq.maxUnitPrice,
      maxLeadTimeDays: rfq.maxLeadTimeDays,
      creditOk: rfq.creditOk,
      limit: topN,
    }).filter((r) => r.eligible).map((r) => r.supplier);
  }

  // ── Responses ──────────────────────────────────────────────────────
  submitResponse(input: Omit<RfqResponse, "id" | "status" | "submittedAt">): RfqResponse | { error: string } {
    const rfq = this.rfqs.get(input.rfqId);
    if (!rfq) return { error: `RFQ ${input.rfqId} not found` };
    if (rfq.status === "cancelled" || rfq.status === "awarded") {
      return { error: `RFQ is ${rfq.status}, cannot accept new responses` };
    }
    const supplier = this.suppliers.get(input.supplierId);
    if (!supplier) return { error: `supplier ${input.supplierId} not found` };
    const id = `RFP-${randomUUID().slice(0, 8)}`;
    const resp: RfqResponse = {
      ...input,
      id,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    };
    this.responses.set(id, resp);
    return resp;
  }

  listResponses(rfqId: string): RfqResponse[] {
    return Array.from(this.responses.values()).filter((r) => r.rfqId === rfqId);
  }

  /**
   * Shortlist responses for an RFQ. Scores on price + lead time + reliability.
   * Moves top N to "shortlisted", drops the rest to "rejected".
   */
  shortlistResponses(rfqId: string, topN = 3): { shortlisted: RfqResponse[]; rejected: RfqResponse[] } | { error: string } {
    const rfq = this.rfqs.get(rfqId);
    if (!rfq) return { error: `RFQ ${rfqId} not found` };
    const responses = this.listResponses(rfqId);
    if (responses.length === 0) return { shortlisted: [], rejected: [] };

    const minPrice = Math.min(...responses.map((r) => r.unitPrice));
    const minLead = Math.min(...responses.map((r) => r.leadTimeDays));

    for (const r of responses) {
      const supplier = this.suppliers.get(r.supplierId)!;
      // Score: 40 price, 25 lead, 25 reliability, 10 trust
      const priceNorm = (minPrice / r.unitPrice) * 100;
      const leadNorm = (minLead / r.leadTimeDays) * 100;
      r.score = Math.round((priceNorm * 0.4 + leadNorm * 0.25 + supplier.reliability * 0.25 + supplier.trustScore * 0.1) * 10) / 10;
    }

    responses.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const shortlisted = responses.slice(0, topN);
    const rejected = responses.slice(topN);

    for (const r of shortlisted) {
      r.status = "shortlisted";
      this.responses.set(r.id, r);
    }
    for (const r of rejected) {
      r.status = "rejected";
      this.responses.set(r.id, r);
    }

    rfq.status = "evaluating";
    return { shortlisted, rejected };
  }

  /** Award an RFQ to a shortlisted response. Marks the winning response, all others rejected. */
  award(rfqId: string, responseId: string): RfqRequest | { error: string } {
    const rfq = this.rfqs.get(rfqId);
    if (!rfq) return { error: `RFQ ${rfqId} not found` };
    const response = this.responses.get(responseId);
    if (!response || response.rfqId !== rfqId) return { error: `response ${responseId} not found for RFQ ${rfqId}` };
    if (response.status !== "shortlisted") return { error: "response must be shortlisted first" };

    for (const r of this.listResponses(rfqId)) {
      if (r.id === responseId) {
        r.status = "winning";
        this.responses.set(r.id, r);
      } else if (r.status === "shortlisted" || r.status === "submitted") {
        r.status = "rejected";
        this.responses.set(r.id, r);
      }
    }
    rfq.status = "awarded";
    rfq.awardedTo = responseId;
    return rfq;
  }

  /** Network stats for /api/stats. */
  networkStats() {
    return {
      suppliers: this.suppliers.size,
      rfqs: this.rfqs.size,
      rfqsOpen: this.listRfqs({ status: "open" }).length,
      rfqsAwarded: this.listRfqs({ status: "awarded" }).length,
      responses: this.responses.size,
    };
  }
}

function futureIso(days: number) {
  return new Date(Date.now() + days * 86400_000).toISOString();
}

const procurementService = new ProcurementService();
export default procurementService;