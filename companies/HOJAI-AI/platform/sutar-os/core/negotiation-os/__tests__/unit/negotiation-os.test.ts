import { describe, it, expect, vi } from 'vitest';
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (_req: any, _res: any, next: () => void) => next() }));

interface Party { id: string; name: string; role: 'buyer' | 'seller' | 'partner' | 'mediator'; minAcceptable?: number; maxAcceptable?: number; target?: number; }
interface Offer { id: string; partyId: string; round: number; terms: Record<string, unknown>; totalValue: number; timestamp: string; status: 'pending' | 'accepted' | 'rejected' | 'countered'; }

// Calculate BATNA score
function calculateBATNA(party: Party, bestOutsideOption: number): number {
  const range = (party.maxAcceptable || 100) - (party.minAcceptable || 0);
  const target = party.target || (party.maxAcceptable || 100);
  const z = (target - bestOutsideOption) / (range || 1);
  return Math.max(0, Math.min(100, 50 + z * 25));
}

// Negotiation status
function canAcceptOffer(offer: Offer, party: Party): boolean {
  if (offer.status !== 'pending') return false;
  const value = offer.totalValue;
  if (party.maxAcceptable && value > party.maxAcceptable) return false;
  return true;
}

// Fairness score
function calculateFairness(offers: Offer[]): number {
  if (offers.length === 0) return 100;
  const values = offers.map(o => o.totalValue);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, 100 - stdDev);
}

describe('NegotiationOS — BATNA', () => {
  it('strong BATNA when outside option is worse than target', () => {
    const party: Party = { id: '1', name: 'Buyer', role: 'buyer', minAcceptable: 50, maxAcceptable: 100, target: 80 };
    const score = calculateBATNA(party, 40); // outside is 40, target is 80
    expect(score).toBeGreaterThan(50);
  });

  it('weak BATNA when outside option is better than target', () => {
    const party: Party = { id: '1', name: 'Buyer', role: 'buyer', minAcceptable: 50, maxAcceptable: 100, target: 80 };
    const score = calculateBATNA(party, 95); // outside is 95, target is 80
    expect(score).toBeLessThan(50);
  });

  it('neutral BATNA when equal', () => {
    const party: Party = { id: '1', name: 'Buyer', role: 'buyer', minAcceptable: 0, maxAcceptable: 100, target: 50 };
    const score = calculateBATNA(party, 50);
    expect(score).toBe(50);
  });

  it('clamps to 0-100', () => {
    const party: Party = { id: '1', name: 'Buyer', role: 'buyer', minAcceptable: 80, maxAcceptable: 100, target: 90 };
    const scoreLow = calculateBATNA(party, 0);
    const scoreHigh = calculateBATNA(party, 200);
    expect(scoreLow).toBeGreaterThanOrEqual(0);
    expect(scoreHigh).toBeLessThanOrEqual(100);
  });
});

describe('NegotiationOS — Offer Acceptance', () => {
  const party: Party = { id: 'p1', name: 'Buyer', role: 'buyer', maxAcceptable: 100 };

  it('can accept pending offer within limit', () => {
    const offer: Offer = { id: 'o1', partyId: 'p1', round: 1, terms: {}, totalValue: 80, timestamp: '', status: 'pending' };
    expect(canAcceptOffer(offer, party)).toBe(true);
  });

  it('cannot accept offer exceeding max', () => {
    const offer: Offer = { id: 'o1', partyId: 'p1', round: 1, terms: {}, totalValue: 150, timestamp: '', status: 'pending' };
    expect(canAcceptOffer(offer, party)).toBe(false);
  });

  it('cannot accept non-pending offer', () => {
    const offer: Offer = { id: 'o1', partyId: 'p1', round: 1, terms: {}, totalValue: 80, timestamp: '', status: 'accepted' };
    expect(canAcceptOffer(offer, party)).toBe(false);
  });
});

describe('NegotiationOS — Fairness Score', () => {
  it('high fairness for similar offers', () => {
    const offers: Offer[] = [
      { id: 'o1', partyId: 'p1', round: 1, terms: {}, totalValue: 100, timestamp: '', status: 'pending' },
      { id: 'o2', partyId: 'p2', round: 1, terms: {}, totalValue: 101, timestamp: '', status: 'pending' },
      { id: 'o3', partyId: 'p3', round: 1, terms: {}, totalValue: 99, timestamp: '', status: 'pending' },
    ];
    const score = calculateFairness(offers);
    expect(score).toBeGreaterThan(90);
  });

  it('low fairness for divergent offers', () => {
    const offers: Offer[] = [
      { id: 'o1', partyId: 'p1', round: 1, terms: {}, totalValue: 10, timestamp: '', status: 'pending' },
      { id: 'o2', partyId: 'p2', round: 1, terms: {}, totalValue: 500, timestamp: '', status: 'pending' },
    ];
    const score = calculateFairness(offers);
    expect(score).toBeLessThan(50);
  });

  it('perfect fairness for single offer', () => {
    const offers: Offer[] = [
      { id: 'o1', partyId: 'p1', round: 1, terms: {}, totalValue: 100, timestamp: '', status: 'pending' },
    ];
    expect(calculateFairness(offers)).toBe(100);
  });

  it('neutral for no offers', () => {
    expect(calculateFairness([])).toBe(100);
  });
});