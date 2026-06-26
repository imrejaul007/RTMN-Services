/**
 * ROI Calculator Tests
 * Tests for NPV, IRR, payback period calculations
 */

import { describe, it, expect } from 'vitest';

// Pure function implementations for testing (mirroring src/index.js)

function npv(cashFlows, rate) {
  return cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

function irr(cashFlows, guess = 0.1) {
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    let npvVal = 0, dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npvVal += cashFlows[t] / denom;
      if (t > 0) dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(npvVal) < 0.001) return rate;
    if (Math.abs(dnpv) < 0.0001) break;
    const newRate = rate - npvVal / dnpv;
    if (Math.abs(newRate - rate) < 0.0001) return newRate;
    rate = newRate;
    if (rate < -0.99) rate = -0.99;
  }
  return rate;
}

function paybackMonths(cashFlows) {
  let cum = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    cum += cashFlows[i];
    if (cum >= 0) return i;
  }
  return cashFlows.length;
}

function runCalc(input) {
  const { upfrontCost, monthlyRevenue, monthlyCost, horizonMonths, discountRate } = input;
  const cashFlows = [-upfrontCost];
  const monthlyCF = [];
  for (let m = 1; m <= horizonMonths; m++) {
    const cf = monthlyRevenue - monthlyCost;
    monthlyCF.push(cf);
    cashFlows.push(cf);
  }

  const totalRevenue = monthlyRevenue * horizonMonths;
  const totalCost = upfrontCost + monthlyCost * horizonMonths;
  const totalProfit = totalRevenue - totalCost;
  const roi = totalProfit / upfrontCost;
  const payback = paybackMonths(cashFlows);
  const calcNpv = npv(cashFlows, discountRate / 12);
  const calcIrr = irr(cashFlows);

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    roi: Number(roi.toFixed(4)),
    roiPercent: `${(roi * 100).toFixed(1)}%`,
    paybackMonths: payback,
    paybackLabel: payback < horizonMonths ? `${payback} months` : 'beyond horizon',
    npv: Number(calcNpv.toFixed(2)),
    irr: Number((calcIrr * 12 * 100).toFixed(2)),
    irrLabel: `${(calcIrr * 12 * 100).toFixed(1)}% annual`,
    breakEven: payback <= horizonMonths
  };
}

describe('ROI Calculator - Financial Functions', () => {
  describe('NPV Calculation', () => {
    it('should calculate NPV correctly for positive cash flows', () => {
      const cashFlows = [-1000, 500, 500];
      const rate = 0.10;

      const result = npv(cashFlows, rate);

      expect(result).toBeCloseTo(-132.23, 0);
    });

    it('should calculate NPV correctly for zero discount rate', () => {
      const cashFlows = [-1000, 500, 600];
      const rate = 0;

      const result = npv(cashFlows, rate);

      expect(result).toBe(100);
    });

    it('should handle single period investment', () => {
      const cashFlows = [-1000, 1100];
      const rate = 0.10;

      const result = npv(cashFlows, rate);

      expect(result).toBeCloseTo(0, 1);
    });

    it('should handle high discount rate', () => {
      const cashFlows = [-1000, 2000];
      const rate = 0.50;

      const result = npv(cashFlows, rate);

      expect(result).toBeCloseTo(333.33, 1);
    });
  });

  describe('IRR Calculation', () => {
    it('should calculate IRR for profitable investment', () => {
      const cashFlows = [-1000, 500, 600];

      const result = irr(cashFlows);

      expect(result).toBeCloseTo(0.10, 1);
    });

    it('should calculate IRR for even cash flows', () => {
      const cashFlows = [-1000, 0, 2000];

      const result = irr(cashFlows);

      expect(result).toBeCloseTo(0.414, 1);
    });

    it('should handle negative IRR', () => {
      const cashFlows = [-1000, 400, 400];

      const result = irr(cashFlows);

      expect(result).toBeLessThan(0);
    });

    it('should converge to solution within 100 iterations', () => {
      const cashFlows = [-1000, 100, 100, 100, 100, 100, 100, 100, 100, 1100];

      const result = irr(cashFlows);

      expect(result).toBeCloseTo(0.10, 1);
    });

    it('should handle edge case with early payback', () => {
      const cashFlows = [-1000, 2000, 0];

      const result = irr(cashFlows);

      expect(result).toBeCloseTo(1.0, 1);
    });
  });

  describe('Payback Period Calculation', () => {
    it('should calculate payback in months correctly', () => {
      const cashFlows = [-1000, 500, 500, 0, 0];

      const result = paybackMonths(cashFlows);

      expect(result).toBe(2);
    });

    it('should return horizon length if never pays back', () => {
      const cashFlows = [-1000, 100, 100, 100];

      const result = paybackMonths(cashFlows);

      expect(result).toBe(4);
    });

    it('should calculate payback on first month', () => {
      const cashFlows = [-1000, 1500, 0];

      const result = paybackMonths(cashFlows);

      expect(result).toBe(1);
    });

    it('should handle negative cash flows', () => {
      const cashFlows = [-1000, -100, 1100, 0];

      const result = paybackMonths(cashFlows);

      expect(result).toBe(2);
    });
  });

  describe('Full ROI Calculation', () => {
    it('should calculate complete ROI for profitable investment', () => {
      const input = {
        upfrontCost: 10000,
        monthlyRevenue: 2000,
        monthlyCost: 500,
        horizonMonths: 12,
        discountRate: 0.10
      };

      const results = runCalc(input);

      expect(results.totalRevenue).toBe(24000);
      expect(results.totalCost).toBe(16000);
      expect(results.totalProfit).toBe(8000);
      expect(results.roi).toBe(0.8);
      expect(results.roiPercent).toBe('80.0%');
      // monthly profit = 2000 - 500 = 1500; payback = 10000/1500 = 6.67 -> 7 months
      expect(results.paybackMonths).toBe(7);
      expect(results.breakEven).toBe(true);
    });

    it('should indicate break-even for unprofitable investment', () => {
      const input = {
        upfrontCost: 10000,
        monthlyRevenue: 100,
        monthlyCost: 500,
        horizonMonths: 12,
        discountRate: 0.10
      };

      const results = runCalc(input);

      expect(results.totalProfit).toBeLessThan(0);
      expect(results.breakEven).toBe(false);
    });

    it('should handle zero monthly cost', () => {
      const input = {
        upfrontCost: 5000,
        monthlyRevenue: 1000,
        monthlyCost: 0,
        horizonMonths: 6,
        discountRate: 0.05
      };

      const results = runCalc(input);

      expect(results.totalRevenue).toBe(6000);
      expect(results.totalCost).toBe(5000);
      expect(results.totalProfit).toBe(1000);
      expect(results.paybackMonths).toBe(5);
      expect(results.breakEven).toBe(true);
    });

    it('should calculate NPV and IRR correctly for agent purchase scenario', () => {
      const input = {
        upfrontCost: 1000,
        monthlyRevenue: 500,
        monthlyCost: 100,
        horizonMonths: 12,
        discountRate: 0.10
      };

      const results = runCalc(input);

      expect(results.totalRevenue).toBe(6000);
      expect(results.totalCost).toBe(2200);
      expect(results.totalProfit).toBe(3800);
      expect(results.roi).toBe(3.8);
      expect(results.paybackMonths).toBe(2);
      expect(results.npv).toBeGreaterThan(0);
      expect(results.irr).toBeGreaterThan(0);
    });

    it('should format payback label correctly', () => {
      const input1 = {
        upfrontCost: 10000,
        monthlyRevenue: 2000,
        monthlyCost: 500,
        horizonMonths: 12,
        discountRate: 0.10
      };
      const results1 = runCalc(input1);
      expect(results1.paybackLabel).toBe('7 months');

      const input2 = {
        upfrontCost: 10000,
        monthlyRevenue: 500,
        monthlyCost: 200,
        horizonMonths: 12,
        discountRate: 0.10
      };
      const results2 = runCalc(input2);
      expect(results2.paybackLabel).toBe('beyond horizon');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero discount rate', () => {
      const input = {
        upfrontCost: 1000,
        monthlyRevenue: 500,
        monthlyCost: 200,
        horizonMonths: 3,
        discountRate: 0
      };

      const results = runCalc(input);

      // Just verify the calculation runs without error
      expect(results).toHaveProperty('npv');
      expect(results).toHaveProperty('irr');
      expect(results).toHaveProperty('totalProfit');
      expect(results).toHaveProperty('breakEven');
      expect(results).toHaveProperty('roi');
    });

    it('should handle 1 month horizon', () => {
      const input = {
        upfrontCost: 1000,
        monthlyRevenue: 1500,
        monthlyCost: 0,
        horizonMonths: 1,
        discountRate: 0.10
      };

      const results = runCalc(input);

      expect(results.totalRevenue).toBe(1500);
      expect(results.totalProfit).toBe(500);
      expect(results.paybackMonths).toBe(1);
      expect(results.breakEven).toBe(true);
    });
  });
});

describe('ROI Calculator - Templates', () => {
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

  it('should have all three required templates', () => {
    expect(TEMPLATES).toHaveProperty('agent-purchase');
    expect(TEMPLATES).toHaveProperty('training-investment');
    expect(TEMPLATES).toHaveProperty('service-rollout');
  });

  it('should have valid defaults for agent-purchase template', () => {
    const template = TEMPLATES['agent-purchase'];
    expect(template.defaults.upfrontCost).toBeGreaterThan(0);
    expect(template.defaults.monthlyRevenue).toBeGreaterThan(0);
    expect(template.defaults.horizonMonths).toBeGreaterThan(0);
    expect(template.defaults.discountRate).toBeGreaterThan(0);
    expect(template.defaults.discountRate).toBeLessThan(1);
  });

  it('should calculate ROI correctly for agent-purchase template', () => {
    const template = TEMPLATES['agent-purchase'];
    const results = runCalc(template.defaults);

    expect(results.totalRevenue).toBe(6000);
    expect(results.totalCost).toBe(2200);
    expect(results.totalProfit).toBe(3800);
    expect(results.breakEven).toBe(true);
  });

  it('should calculate ROI correctly for training-investment template', () => {
    const template = TEMPLATES['training-investment'];
    const results = runCalc(template.defaults);

    expect(results.totalRevenue).toBe(192000);
    expect(results.totalCost).toBe(98000);
    expect(results.totalProfit).toBe(94000);
    expect(results.breakEven).toBe(true);
  });

  it('should calculate ROI correctly for service-rollout template', () => {
    const template = TEMPLATES['service-rollout'];
    const results = runCalc(template.defaults);

    expect(results.totalRevenue).toBe(54000);
    expect(results.totalCost).toBe(29000);
    expect(results.totalProfit).toBe(25000);
    expect(results.breakEven).toBe(true);
  });
});

describe('ROI Calculator - Quick ROI', () => {
  function quickRoi(investment, annualGain) {
    const roi = (annualGain - investment) / investment;
    const paybackYears = annualGain > 0 ? investment / annualGain : null;
    return {
      investment,
      annualGain,
      netProfit: annualGain - investment,
      roi: Number(roi.toFixed(4)),
      roiPercent: `${(roi * 100).toFixed(1)}%`,
      paybackYears: paybackYears ? Number(paybackYears.toFixed(2)) : null
    };
  }

  it('should calculate ROI correctly for profitable investment', () => {
    const result = quickRoi(10000, 15000);

    expect(result.netProfit).toBe(5000);
    expect(result.roi).toBe(0.5);
    expect(result.roiPercent).toBe('50.0%');
    expect(result.paybackYears).toBeCloseTo(0.67, 1);
  });

  it('should handle zero gain', () => {
    const result = quickRoi(10000, 0);

    expect(result.netProfit).toBe(-10000);
    expect(result.roi).toBe(-1);
    expect(result.paybackYears).toBeNull();
  });

  it('should handle equal investment and gain', () => {
    const result = quickRoi(10000, 10000);

    expect(result.netProfit).toBe(0);
    expect(result.roi).toBe(0);
    expect(result.paybackYears).toBe(1);
  });

  it('should handle negative investment', () => {
    const result = quickRoi(-10000, 5000);

    expect(result.roi).toBe(-1.5);
  });
});
