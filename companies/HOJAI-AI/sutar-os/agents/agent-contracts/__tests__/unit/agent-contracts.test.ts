/**
 * Agent Contracts Service Unit Tests
 * Smart contracts for AI-to-AI commerce — lifecycle, escrow, milestones, disputes
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@rtmn/shared/lib/persistent-map', () => ({
  PersistentMap: class {
    constructor(name) { this._name = name; this._data = new Map(); }
    get(k) { return this._data.get(k); }
    set(k, v) { this._data.set(k, v); return this; }
    get size() { return this._data.size; }
    values() { return this._data.values(); }
  },
}));

vi.mock('@rtmn/shared/security', () => ({ setupSecurity: vi.fn(), strictLimiter: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/env', () => ({ requireEnv: vi.fn() }));
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/shutdown', () => ({ installGracefulShutdown: vi.fn() }));
vi.mock('./rez-intel-client', () => ({ default: { checkRezIntelHealth: vi.fn().mockResolvedValue(false) } }));

vi.stubGlobal('uuid', { v4: () => 'ctr-test-uuid' });

const {
  CONTRACT_STATES,
  CONTRACT_TYPES,
  createContract,
  signContract,
  activateContract,
  completeMilestone,
  fulfillContract,
  completeContract,
  raiseDispute,
  cancelContract,
  releaseEscrow,
  refundEscrow,
} = await import('../../src/index.js');

describe('Agent Contracts Service', () => {

  beforeEach(() => {
    // Reset stores
  });

  // =========================================================================
  // Constants
  // =========================================================================
  describe('Contract States', () => {
    it('should define all 9 contract states', () => {
      expect(CONTRACT_STATES.DRAFT).toBe('draft');
      expect(CONTRACT_STATES.PENDING_SIGNATURES).toBe('pending_signatures');
      expect(CONTRACT_STATES.ACTIVE).toBe('active');
      expect(CONTRACT_STATES.IN_PROGRESS).toBe('in_progress');
      expect(CONTRACT_STATES.FULFILLED).toBe('fulfilled');
      expect(CONTRACT_STATES.COMPLETED).toBe('completed');
      expect(CONTRACT_STATES.DISPUTED).toBe('disputed');
      expect(CONTRACT_STATES.CANCELLED).toBe('cancelled');
      expect(CONTRACT_STATES.EXPIRED).toBe('expired');
    });
  });

  describe('Contract Types', () => {
    it('should define all 6 contract types', () => {
      expect(CONTRACT_TYPES.PURCHASE).toBe('purchase');
      expect(CONTRACT_TYPES.SERVICE).toBe('service');
      expect(CONTRACT_TYPES.SUBSCRIPTION).toBe('subscription');
      expect(CONTRACT_TYPES.RENTAL).toBe('rental');
      expect(CONTRACT_TYPES.MEMBERSHIP).toBe('membership');
      expect(CONTRACT_TYPES.PARTNERSHIP).toBe('partnership');
    });
  });

  // =========================================================================
  // Contract Creation
  // =========================================================================
  describe('createContract', () => {
    it('should create contract with negotiation data', () => {
      const contract = createContract({
        type: CONTRACT_TYPES.PURCHASE,
        buyerAgent: 'genie-1',
        sellerAgent: 'merchant-1',
        terms: {
          product: 'Laptop',
          price: 999,
          quantity: 1,
          deliveryDate: '2026-07-01',
        },
        negotiationId: 'neg-123',
      });

      expect(contract.id).toMatch(/^CTR-/);
      expect(contract.type).toBe('purchase');
      expect(contract.state).toBe('draft');
      expect(contract.buyer.agentId).toBe('genie-1');
      expect(contract.seller.agentId).toBe('merchant-1');
      expect(contract.terms.product).toBe('Laptop');
      expect(contract.escrow.required).toBe(true);
      expect(contract.history.length).toBe(1);
      expect(contract.history[0].action).toBe('created');
    });

    it('should default to USD currency', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      expect(contract.terms.currency).toBe('USD');
    });

    it('should set default 30-day expiry', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      const expiresAt = new Date(contract.timeline.expiresAt);
      const createdAt = new Date(contract.timeline.createdAt);
      const diffDays = (expiresAt - createdAt) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(30, 0);
    });

    it('should support milestones', () => {
      const milestones = [
        { id: 'm1', name: 'Design', dueDate: '2026-07-01' },
        { id: 'm2', name: 'Development', dueDate: '2026-08-01' },
      ];

      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        milestones,
        terms: { product: 'SaaS', price: 5000 },
      });

      expect(contract.milestones.length).toBe(2);
      expect(contract.milestones[0].name).toBe('Design');
    });
  });

  // =========================================================================
  // Contract Signing
  // =========================================================================
  describe('signContract', () => {
    it('should transition to PENDING_SIGNATURES after first signature', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      const signed = signContract(contract.id, 'buyer');

      expect(signed.buyer.signature).toBeDefined();
      expect(signed.buyer.signedAt).toBeDefined();
      expect(signed.state).toBe(CONTRACT_STATES.PENDING_SIGNATURES);
      expect(signed.seller.signature).toBeNull();
    });

    it('should transition to ACTIVE after both signatures', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      signContract(contract.id, 'buyer');
      const signed = signContract(contract.id, 'seller');

      expect(signed.state).toBe(CONTRACT_STATES.ACTIVE);
      expect(signed.timeline.signedAt).toBeDefined();
      expect(signed.escrow.status).toBe('funded');
    });

    it('should add history entry for each signature', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');

      const signed = contract; // Contract was mutated in place
      expect(signed.history.length).toBeGreaterThanOrEqual(3);
      expect(signed.history.some(h => h.action === 'signed')).toBe(true);
    });

    it('should throw when agent not party to contract', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      expect(() => signContract(contract.id, 'random-agent', null)).toThrow('Agent not party to this contract');
    });

    it('should throw when contract not found', () => {
      expect(() => signContract('nonexistent-id', 'buyer', null)).toThrow('Contract not found');
    });
  });

  // =========================================================================
  // Contract Activation
  // =========================================================================
  describe('activateContract', () => {
    it('should transition to IN_PROGRESS and create fulfillment', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');

      const activated = activateContract(contract.id);

      expect(activated.state).toBe(CONTRACT_STATES.IN_PROGRESS);
      expect(activated.timeline.startedAt).toBeDefined();
    });

    it('should throw when contract not in ACTIVE state', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      expect(() => activateContract(contract.id)).toThrow('Contract not in active state');
    });
  });

  // =========================================================================
  // Milestone Completion
  // =========================================================================
  describe('completeMilestone', () => {
    it('should mark milestone as completed', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
        milestones: [
          { id: 'm1', name: 'Phase 1', dueDate: '2026-07-01' },
          { id: 'm2', name: 'Phase 2', dueDate: '2026-08-01' },
        ],
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');
      activateContract(contract.id);

      const { fulfillment } = completeMilestone(contract.id, 'm1', { proof: 'deliverable-1' });

      const milestone = fulfillment.milestones.find(m => m.id === 'm1');
      expect(milestone.status).toBe('completed');
      expect(milestone.completedAt).toBeDefined();
      expect(milestone.proof).toBe('deliverable-1');
    });

    it('should transition to FULFILLED when all milestones complete', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
        milestones: [
          { id: 'm1', name: 'Phase 1', dueDate: '2026-07-01' },
          { id: 'm2', name: 'Phase 2', dueDate: '2026-08-01' },
        ],
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');
      activateContract(contract.id);
      completeMilestone(contract.id, 'm1', null);
      const { contract: final } = completeMilestone(contract.id, 'm2', null);

      expect(final.state).toBe(CONTRACT_STATES.FULFILLED);
      expect(final.fulfillment.status).toBe('verified');
    });
  });

  // =========================================================================
  // Contract Fulfillment
  // =========================================================================
  describe('fulfillContract', () => {
    it('should transition to FULFILLED and release escrow', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 1000 },
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');

      const fulfilled = fulfillContract(contract.id, { tracking: 'TRACK123' });

      expect(fulfilled.state).toBe(CONTRACT_STATES.FULFILLED);
      expect(fulfilled.fulfillment.proof).toBeDefined();
      expect(fulfilled.escrow.status).toBe('released');
    });
  });

  describe('completeContract', () => {
    it('should transition from FULFILLED to COMPLETED', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');
      fulfillContract(contract.id, null);

      const completed = completeContract(contract.id);

      expect(completed.state).toBe(CONTRACT_STATES.COMPLETED);
      expect(completed.timeline.completedAt).toBeDefined();
    });

    it('should throw when contract not in FULFILLED state', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      expect(() => completeContract(contract.id)).toThrow('Contract not in fulfilled state');
    });
  });

  // =========================================================================
  // Dispute Handling
  // =========================================================================
  describe('raiseDispute', () => {
    it('should transition to DISPUTED and freeze escrow', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');
      fulfillContract(contract.id, null);

      const disputed = raiseDispute(contract.id, {
        raisedBy: 'buyer',
        reason: 'Item not as described',
        evidence: ['photo1.jpg', 'photo2.jpg'],
      });

      expect(disputed.state).toBe('disputed');
      expect(disputed.dispute.reason).toBe('Item not as described');
      expect(disputed.dispute.status).toBe('open');
    });
  });

  // =========================================================================
  // Contract Cancellation
  // =========================================================================
  describe('cancelContract', () => {
    it('should cancel DRAFT contract', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      const cancelled = cancelContract(contract.id, 'buyer', 'Changed my mind');

      expect(cancelled.state).toBe('cancelled');
      expect(cancelled.cancellation.reason).toBe('Changed my mind');
      expect(cancelled.cancellation.cancelledBy).toBe('buyer');
    });

    it('should refund escrow on cancellation if funded', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');

      const cancelled = cancelContract(contract.id, 'buyer', 'Mutual agreement');

      expect(cancelled.state).toBe('cancelled');
      expect(cancelled.escrow.status).toBe('refunded');
    });

    it('should throw when trying to cancel COMPLETED contract', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 100 },
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');
      fulfillContract(contract.id, null);
      completeContract(contract.id);

      expect(() => cancelContract(contract.id, 'buyer', 'Too late')).toThrow('Cannot cancel contract in current state');
    });
  });

  // =========================================================================
  // Escrow Management
  // =========================================================================
  describe('Escrow Operations', () => {
    it('should release escrow', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 1000 },
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');

      releaseEscrow(contract.id, 'contract_fulfilled');

      expect(contract.escrow.status).toBe('released');
      expect(contract.escrow.releasedAt).toBeDefined();
    });

    it('should refund escrow', () => {
      const contract = createContract({
        buyerAgent: 'buyer',
        sellerAgent: 'seller',
        terms: { product: 'Item', price: 1000 },
      });

      signContract(contract.id, 'buyer');
      signContract(contract.id, 'seller');

      refundEscrow(contract.id, 'dispute_won');

      expect(contract.escrow.status).toBe('refunded');
      expect(contract.escrow.refundedAt).toBeDefined();
    });
  });
});
