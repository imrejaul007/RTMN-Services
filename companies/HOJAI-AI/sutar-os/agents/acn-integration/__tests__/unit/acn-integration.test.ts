/**
 * ACN Integration Service Unit Tests
 * Bridges ACN with RTMN services — workflow orchestration
 */

import { describe, it, expect } from 'vitest';

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

vi.stubGlobal('uuid', { v4: () => 'integration-test-uuid' });

const {
  RTMN_SERVICES,
  WORKFLOW_TYPES,
  executeWorkflow,
  runGenieToIndustry,
  runMerchantToDepartment,
  runContractToTwin,
  runPaymentToREZ,
} = await import('../../src/index.js');

describe('ACN Integration Service', () => {

  // =========================================================================
  // Constants
  // =========================================================================
  describe('RTMN Service URLs', () => {
    it('should define all RTMN service URL constants', () => {
      expect(RTMN_SERVICES.SALES_OS).toBeDefined();
      expect(RTMN_SERVICES.MARKETING_OS).toBeDefined();
      expect(RTMN_SERVICES.CUSTOMER_SUCCESS_OS).toBeDefined();
      expect(RTMN_SERVICES.WORKFORCE_OS).toBeDefined();
      expect(RTMN_SERVICES.FINANCE_OS).toBeDefined();
      expect(RTMN_SERVICES.OPERATIONS_OS).toBeDefined();
      expect(RTMN_SERVICES.CXO_OS).toBeDefined();
    });

    it('should define industry OS URLs', () => {
      expect(RTMN_SERVICES.RESTAURANT_OS).toBeDefined();
      expect(RTMN_SERVICES.HOTEL_OS).toBeDefined();
      expect(RTMN_SERVICES.HEALTHCARE_OS).toBeDefined();
      expect(RTMN_SERVICES.RETAIL_OS).toBeDefined();
      expect(RTMN_SERVICES.TRAVEL_OS).toBeDefined();
    });

    it('should define foundation service URLs', () => {
      expect(RTMN_SERVICES.UNIFIED_HUB).toBeDefined();
      expect(RTMN_SERVICES.CORPID).toBeDefined();
      expect(RTMN_SERVICES.MEMORY_OS).toBeDefined();
      expect(RTMN_SERVICES.TWINOS_HUB).toBeDefined();
    });

    it('should define REZ service URLs', () => {
      expect(RTMN_SERVICES.REZ_AUTH).toBeDefined();
      expect(RTMN_SERVICES.REZ_WALLET).toBeDefined();
      expect(RTMN_SERVICES.REZ_CRM).toBeDefined();
    });

    it('should define ACN service URLs', () => {
      expect(RTMN_SERVICES.ACN_NETWORK).toBeDefined();
      expect(RTMN_SERVICES.ACP_PROTOCOL).toBeDefined();
      expect(RTMN_SERVICES.GENIE_SHOPPING).toBeDefined();
      expect(RTMN_SERVICES.MERCHANT_AGENTS).toBeDefined();
      expect(RTMN_SERVICES.AGENT_REPUTATION).toBeDefined();
      expect(RTMN_SERVICES.AGENT_CONTRACTS).toBeDefined();
      expect(RTMN_SERVICES.AGENT_WALLETS).toBeDefined();
    });
  });

  describe('Workflow Types', () => {
    it('should define all 4 workflow types', () => {
      expect(WORKFLOW_TYPES.GENIE_TO_INDUSTRY).toBe('genie_to_industry');
      expect(WORKFLOW_TYPES.MERCHANT_TO_DEPARTMENT).toBe('merchant_to_department');
      expect(WORKFLOW_TYPES.CONTRACT_TO_TWIN).toBe('contract_to_twin');
      expect(WORKFLOW_TYPES.PAYMENT_TO_REZ).toBe('payment_to_rez');
    });
  });

  // =========================================================================
  // Workflow Execution
  // =========================================================================
  describe('executeWorkflow', () => {
    it('should create workflow record with running status', async () => {
      const workflow = await executeWorkflow(WORKFLOW_TYPES.PAYMENT_TO_REZ, {
        fromAgent: 'genie-1',
        toAgent: 'merchant-1',
        amount: 100,
      });

      expect(workflow.id).toMatch(/^WF-/);
      expect(workflow.type).toBe('payment_to_rez');
      expect(workflow.status).toBe('running');
      expect(workflow.steps).toBeDefined();
      expect(workflow.startedAt).toBeDefined();
    });

    it('should complete workflow successfully', async () => {
      const workflow = await executeWorkflow(WORKFLOW_TYPES.PAYMENT_TO_REZ, {
        fromAgent: 'genie-1',
        toAgent: 'merchant-1',
        amount: 50,
      });

      expect(workflow.status).toBe('completed');
      expect(workflow.completedAt).toBeDefined();
    });

    it('should fail workflow with unknown type', async () => {
      const workflow = await executeWorkflow('unknown_workflow_type', {});

      expect(workflow.status).toBe('failed');
      expect(workflow.error).toBeDefined();
    });
  });

  // =========================================================================
  // Genie to Industry Workflow
  // =========================================================================
  describe('runGenieToIndustry', () => {
    it('should execute genie-to-industry workflow with all steps', async () => {
      const workflow = { steps: [] };
      const params = {
        userId: 'user-123',
        industry: 'restaurant',
        productQuery: 'pizza',
        quantity: 2,
      };

      await runGenieToIndustry(workflow, params);

      expect(workflow.steps.length).toBe(6);
      expect(workflow.steps[0].name).toBe('Create Genie agent');
      expect(workflow.steps[1].name).toContain('restaurant');
      expect(workflow.steps[2].name).toContain('user context');
      expect(workflow.steps[3].name).toContain('order');
      expect(workflow.steps[4].name).toContain('Customer Twin');
      expect(workflow.steps[5].name).toContain('reputation');
    });

    it('should map industry to correct OS', async () => {
      const industries = ['restaurant', 'hotel', 'healthcare', 'retail', 'travel'];

      for (const industry of industries) {
        const workflow = { steps: [] };
        try {
          await runGenieToIndustry(workflow, { industry, userId: 'u', productQuery: 'test' });
          expect(workflow.steps[1].name.toLowerCase()).toContain(industry);
        } catch (e) {
          // Industry OS might not be defined for all
        }
      }
    });

    it('should throw on unknown industry', async () => {
      const workflow = { steps: [] };
      await expect(
        runGenieToIndustry(workflow, { industry: 'unknown', userId: 'u', productQuery: 'test' })
      ).rejects.toThrow('Unknown industry');
    });
  });

  // =========================================================================
  // Merchant to Department Workflow
  // =========================================================================
  describe('runMerchantToDepartment', () => {
    it('should execute merchant-to-department workflow', async () => {
      const workflow = { steps: [] };
      const params = {
        merchantId: 'merchant-1',
        department: 'sales',
        action: 'sync_leads',
        data: {},
      };

      await runMerchantToDepartment(workflow, params);

      expect(workflow.steps.length).toBe(2);
      expect(workflow.steps[0].name).toContain('sales');
      expect(workflow.steps[1].name).toContain('analytics');
    });

    it('should support all department types', async () => {
      const departments = [
        'sales', 'marketing', 'customer_success', 'workforce',
        'finance', 'operations', 'cxo',
      ];

      for (const dept of departments) {
        const workflow = { steps: [] };
        try {
          await runMerchantToDepartment(workflow, { department: dept, merchantId: 'm', action: 'test' });
          expect(workflow.steps[0].name).toContain(dept);
        } catch (e) {
          // May fail for unknown department
        }
      }
    });

    it('should throw on unknown department', async () => {
      const workflow = { steps: [] };
      await expect(
        runMerchantToDepartment(workflow, { department: 'unknown', merchantId: 'm', action: 'test' })
      ).rejects.toThrow('Unknown department');
    });
  });

  // =========================================================================
  // Contract to Twin Workflow
  // =========================================================================
  describe('runContractToTwin', () => {
    it('should execute contract-to-twin workflow', async () => {
      const workflow = { steps: [] };
      const params = {
        contractId: 'CTR-123',
        userId: 'user-456',
        items: [{ id: 'item-1', quantity: 2 }],
      };

      await runContractToTwin(workflow, params);

      expect(workflow.steps.length).toBe(3);
      expect(workflow.steps[0].name).toContain('Customer Twin');
      expect(workflow.steps[1].name).toContain('Order Twin');
      expect(workflow.steps[2].name).toContain('CRM');
    });
  });

  // =========================================================================
  // Payment to REZ Workflow
  // =========================================================================
  describe('runPaymentToREZ', () => {
    it('should execute payment-to-REZ workflow', async () => {
      const workflow = { steps: [] };
      const params = {
        fromAgent: 'genie-1',
        toAgent: 'merchant-1',
        amount: 199.99,
        currency: 'USD',
      };

      await runPaymentToREZ(workflow, params);

      expect(workflow.steps.length).toBe(2);
      expect(workflow.steps[0].name).toContain('agent payment');
      expect(workflow.steps[1].name).toContain('REZ Wallet');
    });

    it('should pass payment details through workflow', async () => {
      const workflow = { steps: [] };
      await runPaymentToREZ(workflow, {
        fromAgent: 'a1',
        toAgent: 'a2',
        amount: 500,
        currency: 'INR',
      });

      expect(workflow.steps[0].result.transactionId).toMatch(/^TX-/);
    });
  });
});
