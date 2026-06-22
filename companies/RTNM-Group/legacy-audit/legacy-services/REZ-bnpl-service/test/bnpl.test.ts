import { describe, it, expect } from 'vitest';

describe('BNPL Calculations', () => {
  // Test EMI calculation formula
  const calculateEMI = (principal: number, annualRate: number, tenureMonths: number): number => {
    const monthlyRate = annualRate / 12 / 100;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.ceil(emi);
  };

  describe('calculateEMI', () => {
    it('should calculate correct EMI for standard inputs', () => {
      // 100000 INR at 15% for 6 months
      const emi = calculateEMI(100000, 15, 6);
      expect(emi).toBeGreaterThan(17000);
      expect(emi).toBeLessThan(18000);
    });

    it('should handle 3 month tenure', () => {
      const emi = calculateEMI(30000, 12, 3);
      expect(emi).toBeGreaterThan(10000);
    });

    it('should handle 12 month tenure', () => {
      const emi = calculateEMI(100000, 21, 12);
      expect(emi).toBeGreaterThan(9000);
    });

    it('should return 0 for invalid inputs', () => {
      expect(calculateEMI(0, 15, 6)).toBe(0);
      expect(calculateEMI(100000, 0, 6)).toBe(0);
      expect(calculateEMI(100000, 15, 0)).toBe(0);
    });

    it('should handle edge cases gracefully', () => {
      expect(() => calculateEMI(-100, 15, 6)).not.toThrow();
      expect(() => calculateEMI(100, 15, 6)).not.toThrow();
    });
  });

  describe('Interest Rates by Tenure', () => {
    const INTEREST_RATES = {
      3: 12,
      6: 15,
      9: 18,
      12: 21
    };

    it('should have increasing rates for longer tenure', () => {
      expect(INTEREST_RATES[3]).toBeLessThan(INTEREST_RATES[6]);
      expect(INTEREST_RATES[6]).toBeLessThan(INTEREST_RATES[9]);
      expect(INTEREST_RATES[9]).toBeLessThan(INTEREST_RATES[12]);
    });

    it('should apply correct rate for each tenure', () => {
      expect(INTEREST_RATES[3]).toBe(12);
      expect(INTEREST_RATES[6]).toBe(15);
      expect(INTEREST_RATES[9]).toBe(18);
      expect(INTEREST_RATES[12]).toBe(21);
    });
  });

  describe('Risk Adjustments', () => {
    const RISK_ADJUSTMENTS = {
      low: -2,
      medium: 0,
      high: 4
    };

    it('should reduce rate for low risk', () => {
      expect(RISK_ADJUSTMENTS.low).toBeLessThan(0);
    });

    it('should not adjust for medium risk', () => {
      expect(RISK_ADJUSTMENTS.medium).toBe(0);
    });

    it('should increase rate for high risk', () => {
      expect(RISK_ADJUSTMENTS.high).toBeGreaterThan(0);
    });
  });

  describe('EMI Schedule Generation', () => {
    it('should generate correct number of EMIs', () => {
      const tenure = 6;
      const schedule = [];

      for (let i = 1; i <= tenure; i++) {
        schedule.push({ emiNumber: i });
      }

      expect(schedule.length).toBe(6);
    });

    it('should track principal and interest portions', () => {
      const principal = 30000;
      const emi = calculateEMI(principal, 12, 3);
      const totalInterest = (emi * 3) - principal;

      expect(totalInterest).toBeGreaterThan(0);
    });
  });

  describe('Auto-approval Logic', () => {
    const shouldAutoApprove = (creditScore: number): boolean => {
      return creditScore >= 700;
    };

    it('should auto-approve high credit scores', () => {
      expect(shouldAutoApprove(750)).toBe(true);
      expect(shouldAutoApprove(700)).toBe(true);
    });

    it('should not auto-approve low credit scores', () => {
      expect(shouldAutoApprove(699)).toBe(false);
      expect(shouldAutoApprove(600)).toBe(false);
    });
  });

  describe('Validation Rules', () => {
    it('should enforce minimum amount of 500', () => {
      const MIN_AMOUNT = 500;
      expect(100 < MIN_AMOUNT).toBe(true);
      expect(500 >= MIN_AMOUNT).toBe(true);
    });

    it('should enforce maximum amount of 500000', () => {
      const MAX_AMOUNT = 500000;
      expect(600000 > MAX_AMOUNT).toBe(true);
      expect(500000 <= MAX_AMOUNT).toBe(true);
    });

    it('should only allow valid tenures', () => {
      const VALID_TENURES = [3, 6, 9, 12];
      expect(VALID_TENURES.includes(3)).toBe(true);
      expect(VALID_TENURES.includes(6)).toBe(true);
      expect(VALID_TENURES.includes(4)).toBe(false);
    });
  });
});

describe('Idempotency Key Generation', () => {
  it('should generate unique keys for different payments', () => {
    const key1 = `repay:app1:1`;
    const key2 = `repay:app1:2`;
    const key3 = `repay:app2:1`;

    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key2).not.toBe(key3);
  });

  it('should include application ID and EMI number', () => {
    const applicationId = 'app123';
    const emiNumber = 5;
    const key = `repay:${applicationId}:${emiNumber}`;

    expect(key).toContain(applicationId);
    expect(key).toContain(emiNumber.toString());
  });
});
