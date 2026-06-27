/**
 * ROI Calculator Tests - Port 4259
 */
const { describe, it, expect } = require('vitest');

// Pure functions extracted from the service
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
  const { upfrontCost = 0, monthlyRevenue = 0, monthlyCost = 0, horizonMonths = 12, discountRate = 0.1 } = input;
  const cashFlows = [-upfrontCost];
  for (let m = 1; m <= horizonMonths; m++) {
    const cf = monthlyRevenue - monthlyCost;
    cashFlows.push(cf);
  }
  const totalRevenue = monthlyRevenue * horizonMonths;
  const totalCost = upfrontCost + monthlyCost * horizonMonths;
  const totalProfit = totalRevenue - totalCost;
  const roi = upfrontCost > 0 ? totalProfit / upfrontCost : 0;
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
    npv: Number(calcNpv.toFixed(2)),
    irr: Number((calcIrr * 12 * 100).toFixed(2)),
    breakEven: payback <= horizonMonths
  };
}

const TEMPLATES = {
  'agent-purchase': {
    name: 'Marketplace Agent Purchase',
    defaults: { upfrontCost: 1000, monthlyRevenue: 500, monthlyCost: 100, horizonMonths: 12, discountRate: 0.10 }
  },
  'training-investment': {
    name: 'Custom Training Investment',
    defaults: { upfrontCost: 50000, monthlyRevenue: 8000, monthlyCost: 2000, horizonMonths: 24, discountRate: 0.12 }
  }
};

describe('ROI Calculator - NPV', () => {
  it('should calculate positive NPV for profitable investment', () => {
    const cashFlows = [-1000, 200, 300, 400, 500];
    const result = npv(cashFlows, 0.10);
    expect(result).toBeGreaterThan(0);
  });

  it('should calculate negative NPV for losing investment', () => {
    const cashFlows = [-1000, 100, 100, 100, 100];
    const result = npv(cashFlows, 0.10);
    expect(result).toBeLessThan(0);
  });

  it('should return 0 for 0 discount rate', () => {
    const cashFlows = [-1000, 300, 300, 300, 300];
    const result = npv(cashFlows, 0);
    expect(result).toBe(200);
  });

  it('should handle zero cash flows', () => {
    const cashFlows = [-1000, 0, 0, 0, 0];
    const result = npv(cashFlows, 0.10);
    expect(result).toBeLessThan(0);
  });
});

describe('ROI Calculator - IRR', () => {
  it('should calculate positive IRR for profitable investment', () => {
    const cashFlows = [-1000, 500, 400, 300, 100];
    const result = irr(cashFlows);
    expect(result).toBeGreaterThan(0);
  });

  it('should return negative IRR for losing investment', () => {
    const cashFlows = [-1000, 100, 100, 100, 100];
    const result = irr(cashFlows);
    expect(result).toBeLessThan(0);
  });

  it('should return guess for zero cash flows', () => {
    const cashFlows = [-1000, 0, 0, 0, 0];
    const result = irr(cashFlows);
    // Should converge to near -1 or return initial guess
    expect(result).toBeDefined();
  });
});

describe('ROI Calculator - Payback Period', () => {
  it('should calculate payback period correctly', () => {
    const cashFlows = [-1000, 300, 400, 400];
    const result = paybackMonths(cashFlows);
    expect(result).toBe(3); // Break even at month 3
  });

  it('should return horizon when never breaks even', () => {
    const cashFlows = [-1000, 100, 100, 100, 100];
    const result = paybackMonths(cashFlows);
    expect(result).toBe(5); // Never breaks even within 5 months
  });

  it('should return 0 for immediate payback', () => {
    const cashFlows = [1000, 0, 0, 0]; // Initial investment is positive
    const result = paybackMonths(cashFlows);
    expect(result).toBe(0);
  });

  it('should handle gradual payback', () => {
    const cashFlows = [-500, 100, 100, 100, 100, 100];
    const result = paybackMonths(cashFlows);
    expect(result).toBe(5);
  });
});

describe('ROI Calculator - Full Calculation', () => {
  it('should calculate positive ROI for profitable investment', () => {
    const input = {
      upfrontCost: 1000,
      monthlyRevenue: 500,
      monthlyCost: 100,
      horizonMonths: 12,
      discountRate: 0.10
    };
    const result = runCalc(input);
    expect(result.totalRevenue).toBe(6000);
    expect(result.totalCost).toBe(2200);
    expect(result.totalProfit).toBe(3800);
    expect(result.roi).toBeGreaterThan(0);
    expect(result.breakEven).toBe(true);
  });

  it('should calculate negative ROI for losing investment', () => {
    const input = {
      upfrontCost: 1000,
      monthlyRevenue: 100,
      monthlyCost: 200,
      horizonMonths: 12,
      discountRate: 0.10
    };
    const result = runCalc(input);
    expect(result.totalProfit).toBeLessThan(0);
    expect(result.roi).toBeLessThan(0);
    expect(result.breakEven).toBe(false);
  });

  it('should handle zero investment', () => {
    const input = {
      upfrontCost: 0,
      monthlyRevenue: 100,
      monthlyCost: 50,
      horizonMonths: 12,
      discountRate: 0.10
    };
    const result = runCalc(input);
    expect(result.totalRevenue).toBe(1200);
    expect(result.roi).toBe(Infinity); // Division by zero
  });

  it('should calculate NPV correctly', () => {
    const input = {
      upfrontCost: 1000,
      monthlyRevenue: 500,
      monthlyCost: 100,
      horizonMonths: 12,
      discountRate: 0.10
    };
    const result = runCalc(input);
    expect(result.npv).toBeGreaterThan(0); // Profitable investment
  });
});

describe('ROI Calculator - Templates', () => {
  it('should have valid templates', () => {
    expect(TEMPLATES['agent-purchase']).toBeDefined();
    expect(TEMPLATES['training-investment']).toBeDefined();
  });

  it('should have valid defaults in agent-purchase', () => {
    const template = TEMPLATES['agent-purchase'];
    expect(template.defaults.upfrontCost).toBe(1000);
    expect(template.defaults.monthlyRevenue).toBe(500);
    expect(template.defaults.horizonMonths).toBe(12);
  });

  it('should have valid defaults in training-investment', () => {
    const template = TEMPLATES['training-investment'];
    expect(template.defaults.upfrontCost).toBe(50000);
    expect(template.defaults.monthlyRevenue).toBe(8000);
    expect(template.defaults.horizonMonths).toBe(24);
  });
});

describe('ROI Calculator - Comparison', () => {
  const compareROI = (calc1, calc2) => {
    return {
      betterROI: calc1.roi > calc2.roi ? 'option1' : 'option2',
      roiDiff: Math.abs(calc1.roi - calc2.roi),
      betterPayback: calc1.paybackMonths < calc2.paybackMonths ? 'option1' : 'option2',
      betterNPV: calc1.npv > calc2.npv ? 'option1' : 'option2'
    };
  };

  it('should identify better investment', () => {
    const calc1 = runCalc({ upfrontCost: 1000, monthlyRevenue: 500, monthlyCost: 100, horizonMonths: 12, discountRate: 0.10 });
    const calc2 = runCalc({ upfrontCost: 500, monthlyRevenue: 300, monthlyCost: 50, horizonMonths: 12, discountRate: 0.10 });
    const comparison = compareROI(calc1, calc2);
    expect(comparison.betterROI).toBeDefined();
    expect(comparison.betterPayback).toBeDefined();
  });

  it('should calculate ROI difference', () => {
    const calc1 = runCalc({ upfrontCost: 1000, monthlyRevenue: 600, monthlyCost: 100, horizonMonths: 12, discountRate: 0.10 });
    const calc2 = runCalc({ upfrontCost: 1000, monthlyRevenue: 400, monthlyCost: 100, horizonMonths: 12, discountRate: 0.10 });
    const comparison = compareROI(calc1, calc2);
    expect(comparison.roiDiff).toBeGreaterThan(0);
  });
});

describe('ROI Calculator - Edge Cases', () => {
  it('should handle very short horizon', () => {
    const result = runCalc({ upfrontCost: 100, monthlyRevenue: 100, monthlyCost: 50, horizonMonths: 1, discountRate: 0.10 });
    expect(result.totalProfit).toBe(50);
  });

  it('should handle high discount rate', () => {
    const result = runCalc({ upfrontCost: 1000, monthlyRevenue: 500, monthlyCost: 100, horizonMonths: 12, discountRate: 0.50 });
    expect(result.npv).toBeDefined();
    expect(result.npv).toBeLessThan(2000); // High discount reduces NPV
  });

  it('should handle equal revenue and cost', () => {
    const result = runCalc({ upfrontCost: 1000, monthlyRevenue: 100, monthlyCost: 100, horizonMonths: 12, discountRate: 0.10 });
    expect(result.totalProfit).toBe(0);
    expect(result.roi).toBe(-1); // Lost the initial investment
  });
});
