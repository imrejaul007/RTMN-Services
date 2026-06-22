/**
 * SUTAR Negotiation Engine - Negotiation Service
 *
 * In-memory store + orchestration around the ZOPA algorithm. Handles:
 *  - Creating, querying, updating negotiations
 *  - Adding offers and counter-offers
 *  - Auto-generating counter-offers (ZOPA-based)
 *  - Accept / reject / cancel flows
 *  - Audit trail
 *
 * Note: This uses an in-memory store for Phase B. Phase C (or later)
 * will swap this for a persistent backing store (SQLite/Postgres).
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Negotiation,
  NegotiationStatus,
  NegotiationQuery,
  CreateNegotiationDto,
  CounterOfferDto,
  Offer,
  Term,
  Party,
  AuditEntry,
  PaginatedResponse,
  AXPResponseDto,
  AXPSession,
  AXPMessage,
} from '../types/index.js';
import {
  computeZOPA,
  generateBuyerCounter,
  generateSellerCounter,
  buildConcessionSchedule,
  type Strategy,
} from './zopa.service.js';

// ============================================================================
// In-Memory Store
// ============================================================================

const negotiations = new Map<string, Negotiation>();
const axpSessions = new Map<string, AXPSession>();

// ============================================================================
// Service Class
// ============================================================================

export class NegotiationService {
  // --------------------------------------------------------------------------
  // Create
  // --------------------------------------------------------------------------

  create(dto: CreateNegotiationDto): Negotiation {
    const id = uuidv4();
    const now = new Date();
    const buyer: Party = {
      id: uuidv4(),
      name: dto.buyer.name,
      email: dto.buyer.email,
      role: 'buyer',
      organization: dto.buyer.organization,
      metadata: dto.buyer.metadata,
    };

    const seller: Party | undefined = dto.seller
      ? {
          id: uuidv4(),
          name: dto.seller.name,
          email: dto.seller.email,
          role: 'seller',
          organization: dto.seller.organization,
          metadata: dto.seller.metadata,
        }
      : undefined;

    const terms: Term[] = (dto.terms ?? []).map((t, i) => ({
      ...t,
      id: `term-${id}-${i}`,
    }));

    const negotiation: Negotiation = {
      id,
      negotiationId: id,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      status: 'draft',
      buyer,
      seller,
      product: dto.product,
      targetPrice: dto.targetPrice,
      currency: dto.currency ?? 'INR',
      terms,
      acceptedTerms: [],
      counterOffers: [],
      offerHistory: [],
      deadline: dto.deadline,
      startedAt: now,
      createdBy: dto.createdBy,
      tenantId: dto.tenantId,
      metadata: {
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
      auditTrail: [
        {
          action: 'created',
          performedBy: dto.createdBy,
          performedAt: now,
          details: `Negotiation "${dto.title}" created`,
        },
      ],
    };

    negotiations.set(id, negotiation);
    return negotiation;
  }

  // --------------------------------------------------------------------------
  // Query
  // --------------------------------------------------------------------------

  get(id: string): Negotiation | undefined {
    return negotiations.get(id);
  }

  query(q: NegotiationQuery): PaginatedResponse<Negotiation> {
    let list = Array.from(negotiations.values()).filter(n => n.tenantId === q.tenantId);
    if (q.status) list = list.filter(n => n.status === q.status);
    if (q.type) list = list.filter(n => n.type === q.type);
    if (q.buyerId) list = list.filter(n => n.buyer.id === q.buyerId);
    if (q.sellerId) list = list.filter(n => n.seller?.id === q.sellerId);
    if (q.search) {
      const s = q.search.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(s) || n.product.name.toLowerCase().includes(s));
    }

    const total = list.length;
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const start = (page - 1) * limit;
    const data = list.slice(start, start + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data,
      pagination: { total, page, limit, totalPages },
      timestamp: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // Status transitions
  // --------------------------------------------------------------------------

  updateStatus(id: string, status: NegotiationStatus, performedBy: string): Negotiation {
    const n = this.requireNegotiation(id);
    const prev = n.status;
    n.status = status;
    n.metadata.updatedAt = new Date();
    n.metadata.version += 1;
    n.auditTrail.push({
      action: 'status_changed',
      performedBy,
      performedAt: new Date(),
      details: `Status changed from ${prev} to ${status}`,
      previousValue: prev,
      newValue: status,
    });
    if (status === 'accepted' || status === 'rejected' || status === 'cancelled' || status === 'expired') {
      n.completedAt = new Date();
    }
    return n;
  }

  cancel(id: string, performedBy: string, reason?: string): Negotiation {
    const n = this.updateStatus(id, 'cancelled', performedBy);
    if (reason) {
      n.auditTrail.push({
        action: 'cancel_reason',
        performedBy,
        performedAt: new Date(),
        details: reason,
      });
    }
    return n;
  }

  // --------------------------------------------------------------------------
  // Offers & Counter-offers
  // --------------------------------------------------------------------------

  addOffer(
    id: string,
    partyId: string,
    offer: {
      amount: number;
      currency: Offer['currency'];
      terms: Omit<Term, 'id'>[];
      validUntil: Date;
      message?: string;
    },
  ): Negotiation {
    const n = this.requireNegotiation(id);
    const party = n.buyer.id === partyId ? n.buyer : n.seller;
    if (!party) throw new Error(`Party ${partyId} not in negotiation`);

    const now = new Date();
    const fullTerms: Term[] = offer.terms.map((t, i) => ({ ...t, id: `term-${now.getTime()}-${i}` }));
    const fullOffer: Offer = {
      id: uuidv4(),
      negotiationId: id,
      partyId: party.id,
      partyName: party.name,
      amount: offer.amount,
      currency: offer.currency,
      terms: fullTerms,
      validUntil: offer.validUntil,
      status: 'pending',
      message: offer.message,
      createdAt: now,
      updatedAt: now,
    };

    n.currentOffer = fullOffer;
    n.currentPrice = offer.amount;
    n.offerHistory.push(fullOffer);
    n.metadata.updatedAt = now;
    n.metadata.version += 1;
    n.auditTrail.push({
      action: 'offer_added',
      performedBy: party.id,
      performedAt: now,
      details: `${party.name} offered ${offer.amount} ${offer.currency}`,
      newValue: { amount: offer.amount, currency: offer.currency },
    });

    if (n.status === 'draft') n.status = 'negotiating';
    return n;
  }

  /**
   * Generate a ZOPA-based counter-offer on behalf of a party.
   * Returns the negotiation with the new counter-offer added.
   */
  generateCounter(args: {
    negotiationId: string;
    partyId: string;
    buyerMax: number;
    sellerMin: number;
    strategy?: Strategy;
    customConcession?: number;
  }): Negotiation {
    const n = this.requireNegotiation(args.negotiationId);
    if (!n.currentOffer) throw new Error('No current offer to counter');

    const isBuyer = n.buyer.id === args.partyId;
    const round = n.counterOffers.length + 1;
    const result = isBuyer
      ? generateBuyerCounter({
          currentOffer: n.currentOffer.amount,
          buyerMax: args.buyerMax,
          sellerMin: args.sellerMin,
          strategy: args.strategy,
          round,
        })
      : generateSellerCounter({
          currentOffer: n.currentOffer.amount,
          buyerMax: args.buyerMax,
          sellerMin: args.sellerMin,
          strategy: args.strategy,
          round,
        });

    const party = isBuyer ? n.buyer : n.seller;
    if (!party) throw new Error('Counterparty not present');

    const now = new Date();
    const counterId = uuidv4();
    const counter: Negotiation['counterOffers'][number] = {
      id: counterId,
      negotiationId: n.id,
      partyId: party.id,
      partyName: party.name,
      previousOfferId: n.currentOffer.id,
      amount: result.amount,
      currency: n.currentOffer.currency,
      terms: n.currentOffer.terms,
      message: result.reasoning,
      status: result.shouldWalkAway ? 'rejected' : 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    n.counterOffers.push(counter);
    n.currentOffer.status = 'countered';
    n.metadata.updatedAt = now;
    n.metadata.version += 1;
    n.auditTrail.push({
      action: 'counter_generated',
      performedBy: party.id,
      performedAt: now,
      details: result.reasoning,
      newValue: { counterAmount: result.amount, isWithinZOPA: result.isWithinZOPA, confidence: result.confidence },
    });

    if (result.shouldWalkAway) {
      n.status = 'rejected';
      n.completedAt = now;
    } else {
      n.status = 'awaiting_response';
    }

    return n;
  }

  /**
   * Manually add a counter-offer (caller computes the amount).
   */
  addCounterOffer(partyId: string, dto: CounterOfferDto): Negotiation {
    const n = this.requireNegotiation(dto.negotiationId);
    if (!n.currentOffer) throw new Error('No current offer to counter');

    const party = n.buyer.id === partyId ? n.buyer : n.seller;
    if (!party) throw new Error(`Party ${partyId} not in negotiation`);

    const now = new Date();
    const counter: Negotiation['counterOffers'][number] = {
      id: uuidv4(),
      negotiationId: n.id,
      partyId: party.id,
      partyName: party.name,
      previousOfferId: n.currentOffer.id,
      amount: dto.amount,
      currency: dto.currency,
      terms: dto.terms.map((t, i) => ({ ...t, id: `term-${n.id}-${i}-${Date.now()}` })),
      message: dto.message,
      status: 'pending',
      createdAt: now,
      expiresAt: dto.validUntil,
    };

    n.currentOffer.status = 'countered';
    n.counterOffers.push(counter);
    n.metadata.updatedAt = now;
    n.metadata.version += 1;
    n.auditTrail.push({
      action: 'counter_added',
      performedBy: party.id,
      performedAt: now,
      details: `${party.name} countered at ${dto.amount} ${dto.currency}: ${dto.message}`,
      newValue: { counterAmount: dto.amount, currency: dto.currency },
    });
    n.status = 'awaiting_response';

    return n;
  }

  acceptOffer(id: string, partyId: string): Negotiation {
    const n = this.requireNegotiation(id);
    if (!n.currentOffer) throw new Error('No offer to accept');

    n.currentOffer.status = 'accepted';
    const party = n.buyer.id === partyId ? n.buyer : n.seller;
    n.auditTrail.push({
      action: 'offer_accepted',
      performedBy: party?.id ?? partyId,
      performedAt: new Date(),
      details: `${party?.name ?? partyId} accepted offer of ${n.currentOffer.amount} ${n.currentOffer.currency}`,
    });
    n.status = 'accepted';
    n.completedAt = new Date();
    n.currentPrice = n.currentOffer.amount;
    return n;
  }

  rejectOffer(id: string, partyId: string, reason?: string): Negotiation {
    const n = this.requireNegotiation(id);
    if (!n.currentOffer) throw new Error('No offer to reject');

    n.currentOffer.status = 'rejected';
    const party = n.buyer.id === partyId ? n.buyer : n.seller;
    n.auditTrail.push({
      action: 'offer_rejected',
      performedBy: party?.id ?? partyId,
      performedAt: new Date(),
      details: reason ?? `${party?.name ?? partyId} rejected offer`,
    });
    n.status = 'rejected';
    n.completedAt = new Date();
    return n;
  }

  // --------------------------------------------------------------------------
  // ZOPA helpers (read-through to zopa.service)
  // --------------------------------------------------------------------------

  analyzeZOPA(id: string, buyerMax: number, sellerMin: number) {
    const n = this.requireNegotiation(id);
    const zopa = computeZOPA({ buyerMax, sellerMin });
    const strategy: Strategy = 'collaborative';
    const schedule = n.currentOffer
      ? buildConcessionSchedule({
          openingOffer: n.currentOffer.amount,
          buyerMax,
          sellerMin,
          side: 'buyer',
          strategy,
        })
      : { schedule: [], favorableRounds: 0 };
    return { negotiationId: id, zopa, schedule };
  }

  // --------------------------------------------------------------------------
  // AXP Protocol (Agent Exchange Protocol)
  // --------------------------------------------------------------------------

  startAXP(id: string, partyIds: string[]): AXPSession {
    const n = this.requireNegotiation(id);
    if (!n.currentOffer) throw new Error('Need a current offer to start AXP session');

    const parties: Party[] = [];
    if (partyIds.includes(n.buyer.id)) parties.push(n.buyer);
    if (n.seller && partyIds.includes(n.seller.id)) parties.push(n.seller);
    if (parties.length === 0) throw new Error('No valid parties for AXP session');

    const now = new Date();
    const session: AXPSession = {
      id: uuidv4(),
      negotiationId: id,
      parties,
      currentOffer: n.currentOffer,
      history: [],
      status: 'active',
      startedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24h
    };
    axpSessions.set(session.id, session);
    return session;
  }

  respondAXP(sessionId: string, dto: AXPResponseDto): AXPSession {
    const session = axpSessions.get(sessionId);
    if (!session) throw new Error(`AXP session ${sessionId} not found`);
    if (session.status !== 'active') throw new Error(`AXP session is ${session.status}`);

    const party = session.parties.find(p => p.id === dto.partyId);
    if (!party) throw new Error(`Party ${dto.partyId} not in AXP session`);

    const message: AXPMessage = {
      id: uuidv4(),
      type: dto.response,
      negotiationId: session.negotiationId,
      partyId: dto.partyId,
      partyName: party.name,
      offerId: session.currentOffer.id,
      responseOffer: dto.offer as Partial<Offer> | undefined,
      message: dto.message,
      timestamp: new Date(),
    };
    session.history.push(message);

    if (dto.response === 'accept') session.status = 'completed';
    if (dto.response === 'reject') session.status = 'completed';
    if (dto.response === 'expire') session.status = 'expired';

    return session;
  }

  getAXPSession(id: string): AXPSession | undefined {
    return axpSessions.get(id);
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  stats(tenantId: string) {
    const list = Array.from(negotiations.values()).filter(n => n.tenantId === tenantId);
    const byStatus: Record<NegotiationStatus, number> = {
      draft: 0, rfq_sent: 0, quote_received: 0, negotiating: 0,
      awaiting_response: 0, accepted: 0, rejected: 0, expired: 0, cancelled: 0,
    };
    for (const n of list) byStatus[n.status] += 1;

    const completed = list.filter(n => n.status === 'accepted');
    const totalValue = completed.reduce((sum, n) => sum + (n.currentPrice ?? 0), 0);
    const avgDealSize = completed.length > 0 ? totalValue / completed.length : 0;
    const avgRounds = completed.length > 0
      ? completed.reduce((sum, n) => sum + n.counterOffers.length, 0) / completed.length
      : 0;

    return {
      total: list.length,
      byStatus,
      completed: completed.length,
      completionRate: list.length > 0 ? completed.length / list.length : 0,
      totalValue,
      avgDealSize: Math.round(avgDealSize * 100) / 100,
      avgRounds: Math.round(avgRounds * 10) / 10,
    };
  }

  // --------------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------------

  private requireNegotiation(id: string): Negotiation {
    const n = negotiations.get(id);
    if (!n) throw new Error(`Negotiation ${id} not found`);
    return n;
  }
}

// Singleton
export const negotiationService = new NegotiationService();
