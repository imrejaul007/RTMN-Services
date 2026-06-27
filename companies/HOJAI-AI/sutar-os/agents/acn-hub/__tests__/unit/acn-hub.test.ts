/**
 * ACN Hub Gateway Unit Tests
 * Unified gateway routing for all ACN services
 */

import { describe, it, expect } from 'vitest';

// Mock dependencies
vi.mock('@rtmn/shared/lib/env', () => ({ requireEnv: vi.fn() }));
vi.mock('@rtmn/shared/security', () => ({ setupSecurity: vi.fn(), strictLimiter: (r, h, n) => n }));
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (r, h, n) => n }));
vi.mock('@rtmn/shared/lib/shutdown', () => ({ installGracefulShutdown: vi.fn() }));
vi.mock('./rez-intel-client', () => ({ default: { checkRezIntelHealth: vi.fn().mockResolvedValue(false) } }));

const {
  SERVICES,
  ROUTES,
} = await import('../../src/index.js');

describe('ACN Hub Gateway', () => {

  // =========================================================================
  // Service Registry
  // =========================================================================
  describe('Service Registry', () => {
    it('should define all ACN services', () => {
      expect(SERVICES.ACP_PROTOCOL).toBeDefined();
      expect(SERVICES.ACN_NETWORK).toBeDefined();
      expect(SERVICES.GENIE_SHOPPING).toBeDefined();
      expect(SERVICES.MERCHANT_AGENTS).toBeDefined();
    });

    it('should define foundation services', () => {
      expect(SERVICES.AGENT_REPUTATION).toBeDefined();
      expect(SERVICES.AGENT_CONTRACTS).toBeDefined();
      expect(SERVICES.AGENT_WALLETS).toBeDefined();
    });

    it('should define Phase 2 services', () => {
      expect(SERVICES.AGENT_MARKETPLACE).toBeDefined();
      expect(SERVICES.AGENT_LEARNING).toBeDefined();
      expect(SERVICES.DISPUTE_RESOLUTION).toBeDefined();
      expect(SERVICES.AGENT_ANALYTICS).toBeDefined();
      expect(SERVICES.ACN_INTEGRATION).toBeDefined();
    });

    it('should define Phase 3 services', () => {
      expect(SERVICES.NEGOTIATION_AI).toBeDefined();
      expect(SERVICES.AGENT_ORCHESTRATION).toBeDefined();
    });

    it('should define RTMN integration services', () => {
      expect(SERVICES.RTMN_HUB).toBeDefined();
      expect(SERVICES.TWINOS_HUB).toBeDefined();
      expect(SERVICES.REZ_WALLET).toBeDefined();
    });
  });

  // =========================================================================
  // Route Mapping
  // =========================================================================
  describe('Route Mapping', () => {
    it('should route ACP protocol endpoints', () => {
      expect(ROUTES['/api/acp/negotiations']).toBe(SERVICES.ACP_PROTOCOL);
      expect(ROUTES['/api/acp/messages']).toBe(SERVICES.ACP_PROTOCOL);
    });

    it('should route ACN network endpoints', () => {
      expect(ROUTES['/api/network/agents']).toBe(SERVICES.ACN_NETWORK);
      expect(ROUTES['/api/network/discover']).toBe(SERVICES.ACN_NETWORK);
      expect(ROUTES['/api/network/recommend']).toBe(SERVICES.ACN_NETWORK);
    });

    it('should route Genie shopping endpoints', () => {
      expect(ROUTES['/api/genie/shop']).toBe(SERVICES.GENIE_SHOPPING);
      expect(ROUTES['/api/genie/negotiate']).toBe(SERVICES.GENIE_SHOPPING);
      expect(ROUTES['/api/genie/order']).toBe(SERVICES.GENIE_SHOPPING);
      expect(ROUTES['/api/genie/track']).toBe(SERVICES.GENIE_SHOPPING);
      expect(ROUTES['/api/genie/wishlist']).toBe(SERVICES.GENIE_SHOPPING);
      expect(ROUTES['/api/genie/recommendations']).toBe(SERVICES.GENIE_SHOPPING);
    });

    it('should route merchant endpoints', () => {
      expect(ROUTES['/api/merchant']).toBe(SERVICES.MERCHANT_AGENTS);
    });

    it('should route reputation endpoints', () => {
      expect(ROUTES['/api/reputation']).toBe(SERVICES.AGENT_REPUTATION);
      expect(ROUTES['/api/trust']).toBe(SERVICES.AGENT_REPUTATION);
      expect(ROUTES['/api/leaderboard']).toBe(SERVICES.AGENT_REPUTATION);
    });

    it('should route contract endpoints', () => {
      expect(ROUTES['/api/contracts']).toBe(SERVICES.AGENT_CONTRACTS);
      expect(ROUTES['/api/escrow']).toBe(SERVICES.AGENT_CONTRACTS);
    });

    it('should route wallet endpoints', () => {
      expect(ROUTES['/api/wallets']).toBe(SERVICES.AGENT_WALLETS);
    });

    it('should route marketplace endpoints', () => {
      expect(ROUTES['/api/listings']).toBe(SERVICES.AGENT_MARKETPLACE);
      expect(ROUTES['/api/reviews']).toBe(SERVICES.AGENT_MARKETPLACE);
      expect(ROUTES['/api/promotions']).toBe(SERVICES.AGENT_MARKETPLACE);
      expect(ROUTES['/api/search']).toBe(SERVICES.AGENT_MARKETPLACE);
    });

    it('should route learning endpoints', () => {
      expect(ROUTES['/api/learning']).toBe(SERVICES.AGENT_LEARNING);
      expect(ROUTES['/api/strategy']).toBe(SERVICES.AGENT_LEARNING);
      expect(ROUTES['/api/behavior']).toBe(SERVICES.AGENT_LEARNING);
      expect(ROUTES['/api/profile']).toBe(SERVICES.AGENT_LEARNING);
    });

    it('should route dispute endpoints', () => {
      expect(ROUTES['/api/disputes']).toBe(SERVICES.DISPUTE_RESOLUTION);
      expect(ROUTES['/api/mediations']).toBe(SERVICES.DISPUTE_RESOLUTION);
      expect(ROUTES['/api/arbitrations']).toBe(SERVICES.DISPUTE_RESOLUTION);
    });

    it('should route analytics endpoints', () => {
      expect(ROUTES['/api/events']).toBe(SERVICES.AGENT_ANALYTICS);
      expect(ROUTES['/api/metrics']).toBe(SERVICES.AGENT_ANALYTICS);
      expect(ROUTES['/api/dashboards']).toBe(SERVICES.AGENT_ANALYTICS);
      expect(ROUTES['/api/compare']).toBe(SERVICES.AGENT_ANALYTICS);
    });

    it('should route integration endpoints', () => {
      expect(ROUTES['/api/workflows']).toBe(SERVICES.ACN_INTEGRATION);
      expect(ROUTES['/api/integrate']).toBe(SERVICES.ACN_INTEGRATION);
    });

    it('should route negotiation AI endpoints', () => {
      expect(ROUTES['/api/negotiate']).toBe(SERVICES.NEGOTIATION_AI);
      expect(ROUTES['/api/counter']).toBe(SERVICES.NEGOTIATION_AI);
      expect(ROUTES['/api/decide']).toBe(SERVICES.NEGOTIATION_AI);
      expect(ROUTES['/api/predict']).toBe(SERVICES.NEGOTIATION_AI);
      expect(ROUTES['/api/persona']).toBe(SERVICES.NEGOTIATION_AI);
      expect(ROUTES['/api/simulate']).toBe(SERVICES.NEGOTIATION_AI);
    });

    it('should route orchestration endpoints', () => {
      expect(ROUTES['/api/graphs']).toBe(SERVICES.AGENT_ORCHESTRATION);
      expect(ROUTES['/api/orchestrations']).toBe(SERVICES.AGENT_ORCHESTRATION);
    });
  });

  // =========================================================================
  // Route Count
  // =========================================================================
  describe('Route Coverage', () => {
    it('should have all ACP protocol routes', () => {
      expect(ROUTES['/api/acp/negotiations']).toBeTruthy();
      expect(ROUTES['/api/acp/messages']).toBeTruthy();
    });

    it('should cover all phases', () => {
      const phase1Routes = ['/api/acp', '/api/network', '/api/genie', '/api/merchant', '/api/reputation'];
      const phase2Routes = ['/api/listings', '/api/learning', '/api/disputes', '/api/events', '/api/workflows'];
      const phase3Routes = ['/api/negotiate', '/api/graphs'];

      phase1Routes.forEach(route => {
        const hasRoute = Object.keys(ROUTES).some(r => r.startsWith(route));
        expect(hasRoute).toBe(true);
      });

      phase2Routes.forEach(route => {
        const hasRoute = Object.keys(ROUTES).some(r => r.startsWith(route));
        expect(hasRoute).toBe(true);
      });

      phase3Routes.forEach(route => {
        const hasRoute = Object.keys(ROUTES).some(r => r.startsWith(route));
        expect(hasRoute).toBe(true);
      });
    });
  });
});
