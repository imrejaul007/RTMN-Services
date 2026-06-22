/**
 * Trade Finance service — credit offer engine.
 *
 * Given an entity (e.g. "demo-user") and a request amount, returns a
 * credit offer (or rejection) with risk-adjusted rate, term, and limit.
 * Maintains per-entity ledger history for risk scoring.
 *
 * Pricing model:
 *   - Base rate is anchored on a market reference (e.g. RBI repo + spread).
 *   - Per-entity rate = base + (100 - trustScore)/100 * riskPremium.
 *   - Limit = max(requestedAmount, baselineLimit * trustScore/100).
 */

import { randomUUID } from "node:crypto";

export type DecisionType = "approved" | "reduced" | "rejected";

export interface Entity {
  id: string;
  name: string;
  country: string;
  /** 0..100 trust score, derived from past on-time repayment behaviour. */
  trustScore: number;
  /** Lifetime on-time repayment ratio (0..1). */
  onTimeRatio: number;
  /** Baseline credit limit in INR (before trust-score scaling). */
  baselineLimit: number;
  /** Outstanding credit balance (in INR). */
  outstandingBalance: number;
  /** Number of past loans. */
  loanHistory: number;
  /** Optional sector code — used for sectoral risk adjustments. */
  sector?: "manufacturing" | "retail" | "services" | "agriculture" | "logistics" | "other";
}

export interface LoanRecord {
  id: string;
  entityId: string;
  principal: number;
  outstanding: number;
  rateApr: number;
  termDays: number;
  startDate: string;
  endDate: string;
  status: "active" | "repaid" | "defaulted";
  repayments: Array<{ at: string; amount: number }>;
}

export interface CreditOffer {
  id: string;
  entityId: string;
  decision: DecisionType;
  requestedAmount: number;
  approvedAmount: number;
  rateApr: number;
  /** Term in days from disbursement. */
  termDays: number;
  currency: string;
  /** Monthly payment if approved. */
  monthlyPayment: number;
  /** Total repayable (principal + interest). */
  totalRepayable: number;
  /** Effective annual rate including fees. */
  effectiveApr: number;
  /** Rationale shown to the buyer (e.g. "trust score 87 → rate 11.2%"). */
  rationale: string;
  /** Offer expiry timestamp. */
  validUntil: string;
  createdAt: string;
}

class TradeFinanceService {
  private entities = new Map<string, Entity>();
  private loans = new Map<string, LoanRecord>();
  private offers = new Map<string, CreditOffer>();

  // Market reference (annualised). Real impl would read from a rate API.
  private baseRateApr = 9.5;
  private riskPremiumApr = 9.0; // applied to (100 - trustScore)
  private defaultTermDays = 90;

  // ── Seed (idempotent) ──────────────────────────────────────────────
  seedDemoEntities(): number {
    if (this.entities.size > 0) return 0;
    const demo: Entity[] = [
      { id: "demo-user", name: "Demo User", country: "IN", trustScore: 72, onTimeRatio: 0.93, baselineLimit: 250_000, outstandingBalance: 0, loanHistory: 2, sector: "retail" },
      { id: "ENT-AUR-001", name: "Auria Grains Pvt Ltd", country: "IN", trustScore: 90, onTimeRatio: 0.99, baselineLimit: 5_000_000, outstandingBalance: 800_000, loanHistory: 14, sector: "manufacturing" },
      { id: "ENT-BNR-001", name: "Bharat Rice Mills", country: "IN", trustScore: 78, onTimeRatio: 0.91, baselineLimit: 2_000_000, outstandingBalance: 350_000, loanHistory: 6, sector: "manufacturing" },
      { id: "ENT-MDC-001", name: "MedCore Pharmaceuticals", country: "IN", trustScore: 95, onTimeRatio: 1.0, baselineLimit: 8_000_000, outstandingBalance: 0, loanHistory: 22, sector: "manufacturing" },
      { id: "ENT-NEW-001", name: "NewCo Logistics", country: "IN", trustScore: 40, onTimeRatio: 0.65, baselineLimit: 500_000, outstandingBalance: 200_000, loanHistory: 1, sector: "logistics" },
    ];
    for (const e of demo) this.entities.set(e.id, e);
    return this.entities.size;
  }

  resetAll(): void {
    this.entities.clear();
    this.loans.clear();
    this.offers.clear();
  }

  // ── Entities ───────────────────────────────────────────────────────
  listEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  registerEntity(input: Omit<Entity, "id" | "outstandingBalance" | "loanHistory"> & { id?: string }): Entity {
    const id = input.id ?? `ENT-${randomUUID().slice(0, 8)}`;
    const entity: Entity = {
      ...input,
      id,
      outstandingBalance: 0,
      loanHistory: 0,
    };
    this.entities.set(id, entity);
    return entity;
  }

  // ── Credit offer engine ────────────────────────────────────────────
  /**
   * Evaluate a credit request and return an offer (approved | reduced | rejected).
   * If approved or reduced, persists the offer so it can be accepted later.
   */
  evaluateOffer(req: {
    entityId: string;
    amount: number;
    currency?: string;
    termDays?: number;
  }): CreditOffer | { error: string } {
    const entity = this.entities.get(req.entityId);
    if (!entity) return { error: `entity ${req.entityId} not found` };
    if (req.amount <= 0) return { error: "amount must be positive" };

    const currency = req.currency ?? "INR";
    const termDays = req.termDays ?? this.defaultTermDays;

    // Headroom = baseline scaled by trust - existing outstanding
    const scaledBaseline = entity.baselineLimit * (entity.trustScore / 100);
    const headroom = Math.max(0, scaledBaseline - entity.outstandingBalance);

    // Per-entity risk-adjusted APR
    const rateApr = Math.round((this.baseRateApr + ((100 - entity.trustScore) / 100) * this.riskPremiumApr) * 100) / 100;

    // Sectoral adjustment: agriculture gets -1.5%, services +0.5%
    const sectorAdj = entity.sector === "agriculture" ? -1.5 : entity.sector === "services" ? 0.5 : 0;
    const finalRate = Math.max(4.0, rateApr + sectorAdj);

    // Decision logic
    let decision: DecisionType;
    let approvedAmount: number;
    if (entity.trustScore < 50) {
      decision = "rejected";
      approvedAmount = 0;
    } else if (req.amount <= headroom) {
      decision = "approved";
      approvedAmount = req.amount;
    } else if (headroom > 0) {
      decision = "reduced";
      approvedAmount = Math.round(headroom * 100) / 100;
    } else {
      decision = "rejected";
      approvedAmount = 0;
    }

    const totalRepayable = decision === "rejected" ? 0 : Math.round(approvedAmount * (1 + (finalRate / 100) * (termDays / 365)) * 100) / 100;
    const monthlyPayment = decision === "rejected" ? 0 : Math.round((totalRepayable / Math.max(1, Math.ceil(termDays / 30))) * 100) / 100;

    const rationale =
      decision === "rejected"
        ? entity.trustScore < 50
          ? `trust score ${entity.trustScore} below minimum 50`
          : "no credit headroom available"
        : `trust score ${entity.trustScore} → APR ${finalRate.toFixed(2)}%, headroom INR ${Math.round(headroom)}`;

    const id = `OFF-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const validUntil = new Date(now.getTime() + 7 * 86400_000);
    const offer: CreditOffer = {
      id,
      entityId: entity.id,
      decision,
      requestedAmount: req.amount,
      approvedAmount,
      rateApr: finalRate,
      termDays,
      currency,
      monthlyPayment,
      totalRepayable,
      effectiveApr: finalRate,
      rationale,
      validUntil: validUntil.toISOString(),
      createdAt: now.toISOString(),
    };
    this.offers.set(id, offer);
    return offer;
  }

  getOffer(id: string): CreditOffer | undefined {
    return this.offers.get(id);
  }

  listOffers(filter?: { entityId?: string }): CreditOffer[] {
    return Array.from(this.offers.values()).filter((o) => {
      if (filter?.entityId && o.entityId !== filter.entityId) return false;
      return true;
    });
  }

  // ── Loan lifecycle ─────────────────────────────────────────────────
  /**
   * Accept an offer → disburses the loan. Increments outstanding balance on entity.
   */
  acceptOffer(offerId: string): LoanRecord | { error: string } {
    const offer = this.offers.get(offerId);
    if (!offer) return { error: `offer ${offerId} not found` };
    if (offer.decision === "rejected") return { error: "cannot accept rejected offer" };
    if (new Date(offer.validUntil).getTime() < Date.now()) return { error: "offer expired" };

    const entity = this.entities.get(offer.entityId)!;
    if (entity.outstandingBalance + offer.approvedAmount > entity.baselineLimit * (entity.trustScore / 100) + 1) {
      return { error: "post-disbursement exposure would exceed limit" };
    }

    const id = `LN-${randomUUID().slice(0, 8)}`;
    const start = new Date();
    const end = new Date(start.getTime() + offer.termDays * 86400_000);
    const loan: LoanRecord = {
      id,
      entityId: offer.entityId,
      principal: offer.approvedAmount,
      outstanding: offer.totalRepayable,
      rateApr: offer.rateApr,
      termDays: offer.termDays,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: "active",
      repayments: [],
    };
    entity.outstandingBalance += offer.approvedAmount;
    entity.loanHistory += 1;
    this.loans.set(id, loan);
    return loan;
  }

  repay(loanId: string, amount: number): LoanRecord | { error: string } {
    const loan = this.loans.get(loanId);
    if (!loan) return { error: `loan ${loanId} not found` };
    if (loan.status !== "active") return { error: `loan is ${loan.status}` };
    if (amount <= 0) return { error: "amount must be positive" };

    loan.outstanding = Math.max(0, Math.round((loan.outstanding - amount) * 100) / 100);
    loan.repayments.push({ at: new Date().toISOString(), amount });

    if (loan.outstanding <= 0) {
      loan.status = "repaid";
      const entity = this.entities.get(loan.entityId);
      if (entity) {
        entity.outstandingBalance = Math.max(0, entity.outstandingBalance - loan.principal);
        // Boost trust on full repay
        entity.trustScore = Math.min(100, entity.trustScore + 1);
      }
    }
    return loan;
  }

  listLoans(filter?: { entityId?: string; status?: LoanRecord["status"] }): LoanRecord[] {
    return Array.from(this.loans.values()).filter((l) => {
      if (filter?.entityId && l.entityId !== filter.entityId) return false;
      if (filter?.status && l.status !== filter.status) return false;
      return true;
    });
  }

  getLoan(id: string): LoanRecord | undefined {
    return this.loans.get(id);
  }

  networkStats() {
    return {
      entities: this.entities.size,
      offers: this.offers.size,
      offersApproved: this.listOffers().filter((o) => o.decision === "approved").length,
      offersRejected: this.listOffers().filter((o) => o.decision === "rejected").length,
      loansActive: this.listLoans({ status: "active" }).length,
      loansRepaid: this.listLoans({ status: "repaid" }).length,
      totalDisbursed: this.listLoans().reduce((s, l) => s + l.principal, 0),
    };
  }
}

const tradeFinanceService = new TradeFinanceService();
export default tradeFinanceService;