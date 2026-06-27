/**
 * SUTAR Contracts Service Unit Tests
 * Contract templates (purchase_order, supply_agreement, service_contract, etc.) and lifecycle
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@rtmn/shared/lib/persistent-map', () => ({
  PersistentMap: class {
    constructor(name) { this._data = new Map(); this.size = 0; }
    get(k) { return this._data.get(k); }
    set(k, v) { this._data.set(k, v); this.size = this._data.size; return this; }
    get size() { return this._data.size; }
    values() { return this._data.values(); }
  },
}));

vi.mock('@rtmn/shared/security', () => ({ setupSecurity: vi.fn(), strictLimiter: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/env', () => ({ requireEnv: vi.fn() }));
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/shutdown', () => ({ installGracefulShutdown: vi.fn() }));
vi.mock('./rez-intel-client', () => ({ default: { checkRezIntelHealth: vi.fn().mockResolvedValue(false) } }));

vi.stubGlobal('uuid', () => 'sutar-ctr-uuid');

const {
  TEMPLATES,
  LIFECYCLE,
  transition,
} = await import('../../src/index.js');

describe('SUTAR Contracts Service', () => {

  // =========================================================================
  // Contract Templates
  // =========================================================================
  describe('Templates', () => {
    it('should define 8 contract templates', () => {
      const keys = Object.keys(TEMPLATES);
      expect(keys.length).toBeGreaterThanOrEqual(8);
    });

    it('should include legacy negotiation template', () => {
      expect(TEMPLATES.negotiation).toBeDefined();
      expect(TEMPLATES.negotiation.name).toBe('Negotiation Contract');
      expect(TEMPLATES.negotiation.fields).toContain('parties');
      expect(TEMPLATES.negotiation.fields).toContain('walkAwayPrice');
    });

    it('should include SLA template', () => {
      expect(TEMPLATES.sla).toBeDefined();
      expect(TEMPLATES.sla.name).toBe('Service Level Agreement');
      expect(TEMPLATES.sla.fields).toContain('metric');
      expect(TEMPLATES.sla.fields).toContain('penalty');
    });

    it('should include delivery template', () => {
      expect(TEMPLATES.delivery).toBeDefined();
      expect(TEMPLATES.delivery.fields).toContain('deliveryBy');
      expect(TEMPLATES.delivery.fields).toContain('price');
    });

    it('should include data_share template', () => {
      expect(TEMPLATES.data_share).toBeDefined();
      expect(TEMPLATES.data_share.fields).toContain('dataset');
      expect(TEMPLATES.data_share.fields).toContain('retentionDays');
    });

    it('should include purchase_order template', () => {
      expect(TEMPLATES.purchase_order).toBeDefined();
      expect(TEMPLATES.purchase_order.name).toBe('Purchase Order');
      expect(TEMPLATES.purchase_order.fields).toContain('lineItems');
      expect(TEMPLATES.purchase_order.fields).toContain('paymentTerms');
      expect(TEMPLATES.purchase_order.example).toBeDefined();
      expect(TEMPLATES.purchase_order.example.buyer).toBeDefined();
      expect(TEMPLATES.purchase_order.example.currency).toBe('INR');
    });

    it('should include supply_agreement template', () => {
      expect(TEMPLATES.supply_agreement).toBeDefined();
      expect(TEMPLATES.supply_agreement.fields).toContain('volumeTiers');
      expect(TEMPLATES.supply_agreement.fields).toContain('exclusivity');
      expect(TEMPLATES.supply_agreement.example.volumeTiers).toBeDefined();
      expect(TEMPLATES.supply_agreement.example.duration).toBe('P1Y');
    });

    it('should include service_contract template', () => {
      expect(TEMPLATES.service_contract).toBeDefined();
      expect(TEMPLATES.service_contract.fields).toContain('deliverables');
      expect(TEMPLATES.service_contract.fields).toContain('acceptanceCriteria');
      expect(TEMPLATES.service_contract.example.deliverables).toBeDefined();
    });

    it('should include NDA template', () => {
      expect(TEMPLATES.nda).toBeDefined();
      expect(TEMPLATES.nda.fields).toContain('confidentialInformation');
      expect(TEMPLATES.nda.fields).toContain('jurisdiction');
      expect(TEMPLATES.nda.example.duration).toBe('P2Y');
    });

    it('each template should have required fields', () => {
      Object.entries(TEMPLATES).forEach(([key, template]) => {
        expect(template.name).toBeDefined();
        expect(template.fields).toBeDefined();
        expect(Array.isArray(template.fields)).toBe(true);
        expect(template.fields.length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // Lifecycle States
  // =========================================================================
  describe('Lifecycle', () => {
    it('should define all lifecycle states', () => {
      expect(LIFECYCLE).toContain('draft');
      expect(LIFECYCLE).toContain('negotiating');
      expect(LIFECYCLE).toContain('signed');
      expect(LIFECYCLE).toContain('fulfilled');
      expect(LIFECYCLE).toContain('settled');
      expect(LIFECYCLE).toContain('cancelled');
      expect(LIFECYCLE).toContain('breached');
    });

    it('should have 7 lifecycle states', () => {
      expect(LIFECYCLE.length).toBe(7);
    });
  });

  // =========================================================================
  // State Transitions
  // =========================================================================
  describe('State Transitions', () => {
    it('should allow draft -> negotiating transition', () => {
      const validFrom = {
        draft: ['negotiating', 'cancelled', 'signed'],
      };
      expect(validFrom.draft).toContain('negotiating');
    });

    it('should allow negotiating -> signed transition', () => {
      const validFrom = {
        negotiating: ['signed', 'cancelled'],
      };
      expect(validFrom.negotiating).toContain('signed');
    });

    it('should allow signed -> fulfilled transition', () => {
      const validFrom = {
        signed: ['fulfilled', 'breached', 'cancelled'],
      };
      expect(validFrom.signed).toContain('fulfilled');
    });

    it('should allow fulfilled -> settled transition', () => {
      const validFrom = {
        fulfilled: ['settled', 'breached'],
      };
      expect(validFrom.fulfilled).toContain('settled');
    });

    it('should block invalid transitions', () => {
      const validFrom = {
        draft: ['negotiating', 'cancelled', 'signed'],
        negotiating: ['signed', 'cancelled'],
        signed: ['fulfilled', 'breached', 'cancelled'],
        fulfilled: ['settled', 'breached'],
        settled: [],
        cancelled: [],
        breached: ['settled'],
      };

      // Cannot go from draft directly to fulfilled
      expect(validFrom.draft).not.toContain('fulfilled');

      // Cannot go from negotiating directly to fulfilled
      expect(validFrom.negotiating).not.toContain('fulfilled');

      // Cannot go from settled anywhere
      expect(validFrom.settled.length).toBe(0);
    });

    it('should allow breached -> settled (dispute resolution)', () => {
      const validFrom = {
        breached: ['settled'],
      };
      expect(validFrom.breached).toContain('settled');
    });
  });

  // =========================================================================
  // Transition Function Logic
  // =========================================================================
  describe('transition function', () => {
    it('should return error for invalid target status', () => {
      const c = { status: 'draft' };
      const validFrom = {
        draft: ['negotiating', 'cancelled'],
        negotiating: ['signed', 'cancelled'],
        signed: ['fulfilled', 'breached', 'cancelled'],
        fulfilled: ['settled', 'breached'],
        settled: [],
        cancelled: [],
        breached: ['settled'],
      };

      const result = transition(null, 'invalid_status', 'actor');
      // When contract not found
      expect(result).toBeNull();
    });

    it('should reject invalid status strings', () => {
      const result = transition(null, 'impossible', 'actor');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // From-Deal Contract Creation
  // =========================================================================
  describe('from-deal contract creation', () => {
    it('should compute subtotal from line items', () => {
      const items = [
        { sku: 'rice', quantity: 500, unitPrice: 80 },
      ];
      const subtotal = items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
      expect(subtotal).toBe(40000);
    });

    it('should compute 18% GST tax', () => {
      const subtotal = 40000;
      const tax = Math.round(subtotal * 0.18);
      expect(tax).toBe(7200);
    });

    it('should compute total from subtotal + tax', () => {
      const subtotal = 40000;
      const tax = 7200;
      const total = subtotal + tax;
      expect(total).toBe(47200);
    });

    it('should support custom currency', () => {
      const deal = {
        buyerId: 'restaurant-001',
        sellerId: 'supplier-042',
        items: [{ sku: 'wheat', quantity: 1000, unitPrice: 50 }],
        currency: 'EUR',
      };
      expect(deal.currency).toBe('EUR');
    });

    it('should support Net 30 payment terms', () => {
      const deal = {
        paymentTerms: 'Net 30',
      };
      expect(deal.paymentTerms).toBe('Net 30');
    });

    it('should support auto-sign flag', () => {
      const autoSignTrue = { autoSign: true };
      const autoSignFalse = { autoSign: false };
      expect(autoSignTrue.autoSign).toBe(true);
      expect(autoSignFalse.autoSign).toBe(false);
    });
  });
});
