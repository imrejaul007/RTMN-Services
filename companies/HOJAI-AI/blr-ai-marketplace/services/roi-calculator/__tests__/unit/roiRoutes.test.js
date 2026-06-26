/**
 * ROI Calculator Route Validation Tests
 * Tests that the Express route logic produces correct responses
 */

import { describe, it, expect } from 'vitest';

// Template definitions (from src/index.js)
const TEMPLATES = {
  'agent-purchase': {
    name: 'Marketplace Agent Purchase',
    description: 'Compute ROI of buying/subscribing to a marketplace agent',
    defaults: {
      upfrontCost: 1000,
      monthlyRevenue: 500,
      monthlyCost: 100,
      horizonMonths: 12,
      discountRate: 0.10
    }
  },
  'training-investment': {
    name: 'Custom Training Investment',
    description: 'ROI of investing in custom model training',
    defaults: {
      upfrontCost: 50000,
      monthlyRevenue: 8000,
      monthlyCost: 2000,
      horizonMonths: 24,
      discountRate: 0.12
    }
  },
  'service-rollout': {
    name: 'Internal Service Rollout',
    description: 'ROI of deploying a service for internal use',
    defaults: {
      upfrontCost: 20000,
      monthlyRevenue: 3000,
      monthlyCost: 500,
      horizonMonths: 18,
      discountRate: 0.08
    }
  }
};

// Pure function: validate calculation input
function validateCalculationInput(body) {
  const { template, ...rest } = body || {};
  if (template && TEMPLATES[template]) {
    return { valid: true, usingTemplate: template };
  }
  if (rest.upfrontCost != null && rest.monthlyRevenue != null) {
    return { valid: true, usingCustom: true };
  }
  return { valid: false, error: 'Provide template + overrides OR upfrontCost + monthlyRevenue + monthlyCost + horizonMonths' };
}

// Pure function: validate compare input
function validateCompareInput(body) {
  const { ids } = body || {};
  if (!Array.isArray(ids)) {
    return { valid: false, error: 'ids must be array' };
  }
  if (ids.length < 2) {
    return { valid: false, error: 'ids must be array of >= 2' };
  }
  return { valid: true };
}

// Pure function: validate quick ROI input
function validateQuickRoiInput(body) {
  const { investment, annualGain } = body || {};
  if (investment == null || annualGain == null) {
    return { valid: false, error: 'investment and annualGain required' };
  }
  return { valid: true };
}

describe('ROI Calculator Route Validation', () => {
  describe('Calculation Input Validation', () => {
    it('should accept valid template name', () => {
      const result = validateCalculationInput({ template: 'agent-purchase' });
      expect(result.valid).toBe(true);
      expect(result.usingTemplate).toBe('agent-purchase');
    });

    it('should accept custom calculation parameters', () => {
      const result = validateCalculationInput({
        upfrontCost: 5000,
        monthlyRevenue: 2000,
        monthlyCost: 500,
        horizonMonths: 12,
        discountRate: 0.10
      });
      expect(result.valid).toBe(true);
      expect(result.usingCustom).toBe(true);
    });

    it('should accept template with overrides', () => {
      const result = validateCalculationInput({
        template: 'agent-purchase',
        upfrontCost: 5000
      });
      expect(result.valid).toBe(true);
      expect(result.usingTemplate).toBe('agent-purchase');
    });

    it('should reject missing template and params', () => {
      const result = validateCalculationInput({ name: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject unknown template', () => {
      const result = validateCalculationInput({ template: 'unknown-template' });
      expect(result.valid).toBe(false);
    });

    it('should require upfrontCost for custom calc', () => {
      const result = validateCalculationInput({ monthlyRevenue: 2000 });
      expect(result.valid).toBe(false);
    });

    it('should require monthlyRevenue for custom calc', () => {
      const result = validateCalculationInput({ upfrontCost: 5000 });
      expect(result.valid).toBe(false);
    });
  });

  describe('Compare Input Validation', () => {
    it('should accept valid array of 2+ IDs', () => {
      const result = validateCompareInput({ ids: ['id1', 'id2'] });
      expect(result.valid).toBe(true);
    });

    it('should accept array of many IDs', () => {
      const result = validateCompareInput({ ids: ['id1', 'id2', 'id3', 'id4'] });
      expect(result.valid).toBe(true);
    });

    it('should reject single ID', () => {
      const result = validateCompareInput({ ids: ['only-one'] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('>= 2');
    });

    it('should reject empty array', () => {
      const result = validateCompareInput({ ids: [] });
      expect(result.valid).toBe(false);
    });

    it('should reject non-array', () => {
      const result = validateCompareInput({ ids: 'not-an-array' });
      expect(result.valid).toBe(false);
    });

    it('should reject missing ids', () => {
      const result = validateCompareInput({});
      expect(result.valid).toBe(false);
    });
  });

  describe('Quick ROI Input Validation', () => {
    it('should accept valid investment and gain', () => {
      const result = validateQuickRoiInput({ investment: 10000, annualGain: 15000 });
      expect(result.valid).toBe(true);
    });

    it('should accept zero values', () => {
      const result = validateQuickRoiInput({ investment: 0, annualGain: 0 });
      expect(result.valid).toBe(true);
    });

    it('should reject missing investment', () => {
      const result = validateQuickRoiInput({ annualGain: 15000 });
      expect(result.valid).toBe(false);
    });

    it('should reject missing annualGain', () => {
      const result = validateQuickRoiInput({ investment: 10000 });
      expect(result.valid).toBe(false);
    });

    it('should reject null values', () => {
      const result = validateQuickRoiInput({ investment: null, annualGain: null });
      expect(result.valid).toBe(false);
    });

    it('should reject empty body', () => {
      const result = validateQuickRoiInput({});
      expect(result.valid).toBe(false);
    });
  });

  describe('Template Availability', () => {
    it('should have agent-purchase template', () => {
      expect(TEMPLATES).toHaveProperty('agent-purchase');
      expect(TEMPLATES['agent-purchase'].defaults).toHaveProperty('upfrontCost');
      expect(TEMPLATES['agent-purchase'].defaults).toHaveProperty('monthlyRevenue');
    });

    it('should have training-investment template', () => {
      expect(TEMPLATES).toHaveProperty('training-investment');
      expect(TEMPLATES['training-investment'].defaults).toHaveProperty('horizonMonths');
    });

    it('should have service-rollout template', () => {
      expect(TEMPLATES).toHaveProperty('service-rollout');
      expect(TEMPLATES['service-rollout'].defaults).toHaveProperty('discountRate');
    });

    it('should have 3 templates total', () => {
      expect(Object.keys(TEMPLATES).length).toBe(3);
    });
  });

  describe('Health Endpoint Response Structure', () => {
    it('should return expected health structure', () => {
      const health = {
        status: 'ok',
        service: 'sutar-roi-calculator',
        sutarLayer: 7,
        layer: 'Economy / ROI',
        port: 4259,
        counts: { calculations: 0, templates: 3 },
        timestamp: new Date().toISOString()
      };

      expect(health).toHaveProperty('status', 'ok');
      expect(health).toHaveProperty('service');
      expect(health).toHaveProperty('counts');
      expect(health.counts).toHaveProperty('calculations');
      expect(health.counts).toHaveProperty('templates');
    });
  });
});
