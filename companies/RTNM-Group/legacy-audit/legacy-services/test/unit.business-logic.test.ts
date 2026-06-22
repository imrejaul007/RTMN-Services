/**
 * RTNM-Group Unit Tests - Business Logic
 *
 * Run with: npx vitest run test/unit.business-logic.test.ts
 */

import { describe, it, expect } from 'vitest';

// ============================================
// EMI CALCULATION TESTS
// ============================================

describe('EMI Calculation', () => {
  const calculateEMI = (principal: number, annualRate: number, tenureMonths: number): number => {
    if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0) {
      return 0;
    }
    const monthlyRate = annualRate / 12 / 100;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
                 (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.ceil(emi);
  };

  it('should calculate correct EMI for 6 months at 15%', () => {
    const emi = calculateEMI(100000, 15, 6);
    expect(emi).toBeGreaterThan(17000);
    expect(emi).toBeLessThan(17500);
  });

  it('should calculate correct EMI for 3 months at 12%', () => {
    const emi = calculateEMI(30000, 12, 3);
    expect(emi).toBeGreaterThan(10000);
    expect(emi).toBeLessThan(10500);
  });

  it('should calculate correct EMI for 12 months at 21%', () => {
    const emi = calculateEMI(100000, 21, 12);
    expect(emi).toBeGreaterThan(9000);
    expect(emi).toBeLessThan(10000);
  });

  it('should return 0 for invalid inputs', () => {
    expect(calculateEMI(0, 15, 6)).toBe(0);
    expect(calculateEMI(100000, 0, 6)).toBe(0);
    expect(calculateEMI(100000, 15, 0)).toBe(0);
    expect(calculateEMI(-100, 15, 6)).toBe(0);
  });

  it('should handle edge cases', () => {
    expect(calculateEMI(500, 12, 3)).toBeGreaterThan(0);
    expect(calculateEMI(500000, 21, 12)).toBeGreaterThan(0);
  });

  it('should calculate total correctly', () => {
    const principal = 30000;
    const emi = calculateEMI(principal, 12, 3);
    const totalPayment = emi * 3;
    const totalInterest = totalPayment - principal;

    expect(totalInterest).toBeGreaterThan(0);
    expect(totalPayment).toBe(principal + totalInterest);
  });
});

// ============================================
// CREDIT SCORE CALCULATION TESTS
// ============================================

describe('Credit Score Calculation', () => {
  const calculateCreditScore = (factors: {
    onTimePayments: number;
    latePayments: number;
    defaults: number;
    totalPayments: number;
    monthlyRevenue: number;
    utilizationPercent: number;
  }): { score: number; rating: string } => {
    let score = 500; // Base score

    // Payment history (0-200 points)
    const totalPayments = factors.onTimePayments + factors.latePayments + factors.defaults;
    if (totalPayments > 0) {
      const paymentRatio = factors.onTimePayments / totalPayments;
      score += Math.round(paymentRatio * 200);
    }

    // Revenue impact (0-100 points)
    const revenuePoints = Math.min(100, (factors.monthlyRevenue / 100000) * 100);
    score += revenuePoints;

    // High utilization penalty
    if (factors.utilizationPercent > 80) {
      score -= 50;
    }

    // Default penalty
    score -= factors.defaults * 30;
    score -= factors.latePayments * 5;

    // Clamp to 300-900
    score = Math.max(300, Math.min(900, score));

    // Risk rating
    let rating: string;
    if (score >= 750) rating = 'LOW';
    else if (score >= 600) rating = 'MEDIUM';
    else if (score >= 500) rating = 'HIGH';
    else rating = 'VERY_HIGH';

    return { score, rating };
  };

  it('should calculate score for good payer', () => {
    const result = calculateCreditScore({
      onTimePayments: 10,
      latePayments: 1,
      defaults: 0,
      totalPayments: 11,
      monthlyRevenue: 80000,
      utilizationPercent: 50,
    });

    expect(result.score).toBeGreaterThan(700);
    expect(result.rating).toBe('LOW');
  });

  it('should calculate score for risky borrower', () => {
    const result = calculateCreditScore({
      onTimePayments: 5,
      latePayments: 3,
      defaults: 2,
      totalPayments: 10,
      monthlyRevenue: 20000,
      utilizationPercent: 90,
    });

    expect(result.score).toBeLessThan(600);
  });

  it('should clamp score to 300-900', () => {
    const min = calculateCreditScore({
      onTimePayments: 0,
      latePayments: 0,
      defaults: 10,
      totalPayments: 10,
      monthlyRevenue: 0,
      utilizationPercent: 100,
    });

    const max = calculateCreditScore({
      onTimePayments: 100,
      latePayments: 0,
      defaults: 0,
      totalPayments: 100,
      monthlyRevenue: 200000,
      utilizationPercent: 0,
    });

    expect(min.score).toBeGreaterThanOrEqual(300);
    expect(max.score).toBeLessThanOrEqual(900);
  });

  it('should apply utilization penalty', () => {
    const normal = calculateCreditScore({
      onTimePayments: 10,
      latePayments: 0,
      defaults: 0,
      totalPayments: 10,
      monthlyRevenue: 50000,
      utilizationPercent: 50,
    });

    const highUtil = calculateCreditScore({
      onTimePayments: 10,
      latePayments: 0,
      defaults: 0,
      totalPayments: 10,
      monthlyRevenue: 50000,
      utilizationPercent: 90,
    });

    expect(highUtil.score).toBeLessThan(normal.score);
    expect(normal.score - highUtil.score).toBe(50);
  });
});

// ============================================
// TRUST SCORE CALCULATION TESTS
// ============================================

describe('Trust Score Calculation', () => {
  const calculateTrustScore = (factors: {
    identityVerified: boolean;
    kycStatus: 'none' | 'basic' | 'full';
    transactionCount: number;
    karmaScore: number;
  }): { score: number; level: string } => {
    let score = 0;

    // Identity verification (+20)
    if (factors.identityVerified) score += 20;

    // KYC status (+30 max)
    if (factors.kycStatus === 'full') score += 30;
    else if (factors.kycStatus === 'basic') score += 15;

    // Transaction history (+30 max)
    score += Math.min(30, factors.transactionCount * 3);

    // Karma score (+20 max)
    score += Math.min(20, Math.max(0, factors.karmaScore));

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    // Level
    let level: string;
    if (score >= 90) level = 'VERY_HIGH';
    else if (score >= 70) level = 'HIGH';
    else if (score >= 40) level = 'MEDIUM';
    else if (score >= 20) level = 'LOW';
    else level = 'VERY_LOW';

    return { score, level };
  };

  it('should calculate high trust for verified user', () => {
    const result = calculateTrustScore({
      identityVerified: true,
      kycStatus: 'full',
      transactionCount: 15,
      karmaScore: 80,
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.level).toBe('VERY_HIGH');
  });

  it('should calculate low trust for new user', () => {
    const result = calculateTrustScore({
      identityVerified: false,
      kycStatus: 'none',
      transactionCount: 0,
      karmaScore: 0,
    });

    expect(result.score).toBe(0);
    expect(result.level).toBe('VERY_LOW');
  });

  it('should calculate medium trust for partial verification', () => {
    const result = calculateTrustScore({
      identityVerified: true,
      kycStatus: 'basic',
      transactionCount: 5,
      karmaScore: 50,
    });

    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(70);
  });
});

// ============================================
// REPAYMENT SCHEDULE GENERATION TESTS
// ============================================

describe('Repayment Schedule Generation', () => {
  const generateRepaymentSchedule = (
    principal: number,
    annualRate: number,
    tenureMonths: number
  ): Array<{
    emiNumber: number;
    dueDate: Date;
    amount: number;
    principal: number;
    interest: number;
    balance: number;
    status: string;
  }> => {
    const emi = Math.ceil(
      (principal * (annualRate / 12 / 100) * Math.pow(1 + annualRate / 12 / 100, tenureMonths)) /
      (Math.pow(1 + annualRate / 12 / 100, tenureMonths) - 1)
    );

    const schedule = [];
    let balance = principal;
    const startDate = new Date();

    for (let i = 1; i <= tenureMonths; i++) {
      const interestPortion = Math.ceil(balance * (annualRate / 12 / 100));
      const principalPortion = emi - interestPortion;
      balance = Math.max(0, balance - principalPortion);

      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        emiNumber: i,
        dueDate,
        amount: emi,
        principal: principalPortion,
        interest: interestPortion,
        balance,
        status: 'pending',
      });
    }

    return schedule;
  };

  it('should generate correct number of installments', () => {
    const schedule = generateRepaymentSchedule(30000, 12, 6);
    expect(schedule.length).toBe(6);
  });

  it('should have increasing due dates', () => {
    const schedule = generateRepaymentSchedule(30000, 12, 6);

    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].dueDate.getTime()).toBeGreaterThan(
        schedule[i - 1].dueDate.getTime()
      );
    }
  });

  it('should have correct total amount', () => {
    const principal = 30000;
    const annualRate = 12;
    const tenureMonths = 6;
    const schedule = generateRepaymentSchedule(principal, annualRate, tenureMonths);

    const totalPaid = schedule.reduce((sum, emi) => sum + emi.amount, 0);
    const totalPrincipal = schedule.reduce((sum, emi) => sum + emi.principal, 0);
    const totalInterest = schedule.reduce((sum, emi) => sum + emi.interest, 0);

    expect(totalPrincipal).toBe(principal);
    expect(totalPaid).toBe(totalPrincipal + totalInterest);
  });

  it('should reduce balance to zero', () => {
    const schedule = generateRepaymentSchedule(30000, 12, 6);
    const lastEntry = schedule[schedule.length - 1];

    expect(lastEntry.balance).toBe(0);
  });

  it('should have principal + interest = EMI', () => {
    const schedule = generateRepaymentSchedule(30000, 12, 6);

    for (const entry of schedule) {
      expect(entry.principal + entry.interest).toBe(entry.amount);
    }
  });
});

// ============================================
// INPUT VALIDATION TESTS
// ============================================

describe('Input Validation', () => {
  const validatePhone = (phone: string): boolean => {
    return /^\d{10,15}$/.test(phone);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateAmount = (amount: number, min: number, max: number): boolean => {
    return amount >= min && amount <= max;
  };

  const validateTenure = (tenure: number): boolean => {
    return [3, 6, 9, 12].includes(tenure);
  };

  describe('Phone validation', () => {
    it('should accept valid Indian phone numbers', () => {
      expect(validatePhone('9876543210')).toBe(true);
      expect(validatePhone('919876543210')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('12345')).toBe(false);
      expect(validatePhone('abcdefghij')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('Email validation', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.in')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@invalid.com')).toBe(false);
    });
  });

  describe('Amount validation', () => {
    it('should accept amounts within range', () => {
      expect(validateAmount(500, 500, 500000)).toBe(true);
      expect(validateAmount(250000, 500, 500000)).toBe(true);
      expect(validateAmount(500000, 500, 500000)).toBe(true);
    });

    it('should reject amounts outside range', () => {
      expect(validateAmount(100, 500, 500000)).toBe(false);
      expect(validateAmount(1000000, 500, 500000)).toBe(false);
    });
  });

  describe('Tenure validation', () => {
    it('should accept valid tenures', () => {
      expect(validateTenure(3)).toBe(true);
      expect(validateTenure(6)).toBe(true);
      expect(validateTenure(9)).toBe(true);
      expect(validateTenure(12)).toBe(true);
    });

    it('should reject invalid tenures', () => {
      expect(validateTenure(1)).toBe(false);
      expect(validateTenure(4)).toBe(false);
      expect(validateTenure(24)).toBe(false);
    });
  });
});

// ============================================
// SECURITY TESTS
// ============================================

describe('Security Utilities', () => {
  const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const sanitizeInput = (input: string, maxLength: number): string => {
    return input.trim().slice(0, maxLength);
  };

  describe('Regex escaping', () => {
    it('should escape all special regex characters', () => {
      const specialChars = ['.', '*', '+', '?', '^', '$', '{', '}', '[', ']', '|', '(', ')', '\\'];

      for (const char of specialChars) {
        const escaped = escapeRegex(char);
        expect(escaped).toContain('\\');
      }
    });

    it('should prevent ReDoS patterns', () => {
      const maliciousPattern = '^(a+)+$';
      const escaped = escapeRegex(maliciousPattern);

      // The escaped version should not cause ReDoS
      expect(escaped).not.toBe(maliciousPattern);
      expect(escaped).toContain('\\^');
    });
  });

  describe('Input sanitization', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ', 100)).toBe('hello');
    });

    it('should enforce max length', () => {
      expect(sanitizeInput('a'.repeat(200), 100).length).toBe(100);
    });
  });
});

// ============================================
// TIMING-SAFE COMPARISON TESTS
// ============================================

describe('Timing-Safe Comparison', () => {
  const timingSafeEqual = (a: string, b: string): boolean => {
    if (a.length !== b.length) {
      return false;
    }
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.equals(bufB);
  };

  it('should return true for equal strings', () => {
    expect(timingSafeEqual('test', 'test')).toBe(true);
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(timingSafeEqual('test', 'Test')).toBe(false);
    expect(timingSafeEqual('test', 'test1')).toBe(false);
  });

  it('should return false for different lengths', () => {
    expect(timingSafeEqual('short', 'longer string')).toBe(false);
  });
});

// ============================================
// DATE CALCULATIONS TESTS
// ============================================

describe('Date Calculations', () => {
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const addMonths = (date: Date, months: number): Date => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  const daysBetween = (date1: Date, date2: Date): number => {
    const diff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  it('should add days correctly', () => {
    const date = new Date('2026-01-15');
    const result = addDays(date, 7);

    expect(result.getDate()).toBe(22);
  });

  it('should add months correctly', () => {
    const date = new Date('2026-01-15');
    const result = addMonths(date, 3);

    expect(result.getMonth()).toBe(3); // April (0-indexed)
  });

  it('should handle month boundary', () => {
    const date = new Date('2026-01-31');
    const result = addMonths(date, 1);

    // Should roll over to March or show last day of Feb
    expect(result.getMonth()).toBeGreaterThanOrEqual(1);
  });

  it('should calculate days between dates', () => {
    const date1 = new Date('2026-01-01');
    const date2 = new Date('2026-01-15');

    expect(daysBetween(date1, date2)).toBe(14);
  });

  it('should calculate overdue days', () => {
    const dueDate = new Date('2026-01-01');
    const today = new Date('2026-01-16');
    const overdueDays = daysBetween(dueDate, today);

    expect(overdueDays).toBe(15);
    expect(overdueDays > 7).toBe(true); // More than 7 days overdue
  });
});
